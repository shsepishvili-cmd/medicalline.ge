// Minimal decoder for JPEG Lossless, Non-Hierarchical (ITU-T.81 Annex H), single-component
// (grayscale) images - the format used by DICOM Transfer Syntaxes 1.2.840.10008.1.2.4.57 and
// 1.2.840.10008.1.2.4.70 ("JPEG Lossless, Non-Hierarchical, First-Order Prediction").
//
// This does not implement the full JPEG standard (no subsampling/interleaving, no arithmetic
// coding, no hierarchical mode) - only what CBCT/CT scanners actually emit for lossless
// single-channel pixel data.

const MARKER = {
  SOI: 0xffd8,
  EOI: 0xffd9,
  SOF3: 0xffc3, // Start of frame, lossless, Huffman
  DHT: 0xffc4,
  SOS: 0xffda,
  DRI: 0xffdd,
};

function isRestartMarker(code) {
  return code >= 0xffd0 && code <= 0xffd7;
}

class ByteReader {
  constructor(data) {
    this.data = data;
    this.pos = 0;
  }
  u8() {
    return this.data[this.pos++];
  }
  u16() {
    const value = (this.data[this.pos] << 8) | this.data[this.pos + 1];
    this.pos += 2;
    return value;
  }
}

function buildHuffmanTree(bits, huffVal) {
  // `bits[l]` = number of codes of length l (1..16). `huffVal` = symbols in code-length order.
  const root = {};
  let code = 0;
  let k = 0;
  for (let length = 1; length <= 16; length += 1) {
    const count = bits[length - 1];
    for (let i = 0; i < count; i += 1) {
      const symbol = huffVal[k];
      k += 1;
      let node = root;
      for (let bitIndex = length - 1; bitIndex >= 0; bitIndex -= 1) {
        const bit = (code >> bitIndex) & 1;
        if (bitIndex === 0) {
          node[bit] = { leaf: true, symbol };
        } else {
          node[bit] = node[bit] || {};
          node = node[bit];
        }
      }
      code += 1;
    }
    code <<= 1;
  }
  return root;
}

class BitReader {
  constructor(data, startPos) {
    this.data = data;
    this.pos = startPos;
    this.buffer = 0;
    this.bitsLeft = 0;
    this.markerHit = null;
  }

  // Refills one byte, honoring 0xFF00 byte-stuffing and stopping at real markers
  // (restart markers are consumed by the caller between MCUs, not silently skipped here).
  fillByte() {
    if (this.markerHit !== null) return false;
    let byte = this.data[this.pos];
    if (byte === 0xff) {
      const next = this.data[this.pos + 1];
      if (next === 0x00) {
        this.pos += 2;
      } else {
        // Real marker (restart or EOI) - stop feeding bits, let the caller handle it.
        this.markerHit = (0xff00) | next;
        return false;
      }
    } else {
      this.pos += 1;
    }
    this.buffer = (this.buffer << 8) | byte;
    this.bitsLeft += 8;
    return true;
  }

  readBit() {
    if (this.bitsLeft === 0 && !this.fillByte()) {
      throw new Error("Unexpected end of JPEG Lossless entropy-coded segment.");
    }
    this.bitsLeft -= 1;
    return (this.buffer >> this.bitsLeft) & 1;
  }

  receive(count) {
    let value = 0;
    for (let i = 0; i < count; i += 1) {
      value = (value << 1) | this.readBit();
    }
    return value;
  }

  decodeHuffman(tree) {
    let node = tree;
    for (let guard = 0; guard < 32; guard += 1) {
      const bit = this.readBit();
      node = node[bit];
      if (!node) throw new Error("Invalid Huffman code in JPEG Lossless stream.");
      if (node.leaf) return node.symbol;
    }
    throw new Error("Huffman code exceeded maximum length.");
  }

  // Called between MCUs at a restart interval boundary. The encoder pads with 1-bits to the
  // next byte boundary before writing a restart marker (FFD0-FFD7), so any bits still sitting
  // in the buffer are exactly that padding and must be discarded, not interpreted as data.
  consumeRestartMarker() {
    this.buffer = 0;
    this.bitsLeft = 0;
    if (this.markerHit === null) {
      const byte = this.data[this.pos];
      if (byte === 0xff) {
        const next = this.data[this.pos + 1];
        if (next !== 0x00) this.markerHit = 0xff00 | next;
      }
    }
    if (this.markerHit === null || !isRestartMarker(this.markerHit)) {
      throw new Error(`Expected a JPEG Lossless restart marker at stream position ${this.pos}.`);
    }
    this.pos += 2;
    this.markerHit = null;
  }
}

// JPEG Annex F.2.2.1 EXTEND: turn a `t`-bit unsigned code into the signed difference it encodes.
function extend(value, t) {
  if (t === 0) return 0;
  const vt = 1 << (t - 1);
  return value < vt ? value - (1 << t) + 1 : value;
}

export function decodeJpegLosslessFrame(byteArray) {
  const reader = new ByteReader(byteArray);
  if (reader.u16() !== MARKER.SOI) {
    throw new Error("Not a valid JPEG stream (missing SOI marker).");
  }

  const huffmanTablesDc = {};
  let precision = null;
  let height = null;
  let width = null;
  let componentCount = null;
  let restartInterval = 0;
  let predictorSelector = null;
  let pointTransform = 0;

  for (;;) {
    let marker = reader.u16();
    while ((marker & 0xff00) !== 0xff00 || marker === 0xffff) {
      // Re-sync if a stray fill byte was picked up; JPEG markers always start with 0xFF.
      reader.pos -= 1;
      marker = (marker << 8) | reader.u8();
    }

    if (marker === MARKER.EOI) break;

    if (marker === MARKER.DHT) {
      const segmentEnd = reader.pos + reader.u16() - 2;
      while (reader.pos < segmentEnd) {
        const tableClassAndId = reader.u8();
        const tableId = tableClassAndId & 0x0f;
        const bits = new Array(16);
        let totalSymbols = 0;
        for (let i = 0; i < 16; i += 1) {
          bits[i] = reader.u8();
          totalSymbols += bits[i];
        }
        const huffVal = new Array(totalSymbols);
        for (let i = 0; i < totalSymbols; i += 1) huffVal[i] = reader.u8();
        huffmanTablesDc[tableId] = buildHuffmanTree(bits, huffVal);
      }
      continue;
    }

    if (marker === MARKER.SOF3) {
      reader.u16(); // segment length
      precision = reader.u8();
      height = reader.u16();
      width = reader.u16();
      componentCount = reader.u8();
      if (componentCount !== 1) {
        throw new Error(`JPEG Lossless decoder only supports single-component frames (found ${componentCount}).`);
      }
      reader.u8(); // component id
      reader.u8(); // sampling factors (unused for lossless single component)
      reader.u8(); // quantization table selector (unused in lossless mode)
      continue;
    }

    if (marker === MARKER.DRI) {
      reader.u16(); // segment length
      restartInterval = reader.u16();
      continue;
    }

    if (marker === MARKER.SOS) {
      reader.u16(); // segment length
      const nsComponents = reader.u8();
      let dcTableSelector = 0;
      for (let i = 0; i < nsComponents; i += 1) {
        reader.u8(); // scan component selector
        const tableSelectors = reader.u8();
        dcTableSelector = (tableSelectors >> 4) & 0x0f;
      }
      predictorSelector = reader.u8(); // "Ss" - selects the lossless predictor (1-7)
      reader.u8(); // "Se" - unused in lossless mode
      const ahAl = reader.u8();
      pointTransform = ahAl & 0x0f; // "Al" - point transform shift

      if (precision === null || width === null || height === null) {
        throw new Error("JPEG Lossless SOS marker encountered before SOF3.");
      }

      const huffmanTree = huffmanTablesDc[dcTableSelector];
      if (!huffmanTree) {
        throw new Error(`Missing Huffman DC table ${dcTableSelector} for JPEG Lossless scan.`);
      }

      const pixelCount = width * height;
      const pixels = new Int32Array(pixelCount);
      const bitReader = new BitReader(byteArray, reader.pos);
      const defaultValue = 1 << (precision - 1 - pointTransform);
      let sinceRestart = 0;
      let index = 0;

      while (index < pixelCount) {
        const x = index % width;
        const y = (index - x) / width;
        // A restart interval resets the prediction context exactly like the start of the scan.
        const isRestartStart = restartInterval > 0 && sinceRestart === 0 && index > 0;

        let predicted;
        if ((x === 0 && y === 0) || isRestartStart) {
          predicted = defaultValue;
        } else if (x === 0) {
          predicted = pixels[index - width]; // "b": pixel directly above
        } else if (y === 0) {
          predicted = pixels[index - 1]; // "a": pixel to the left
        } else {
          const a = pixels[index - 1];
          const b = pixels[index - width];
          const c = pixels[index - width - 1];
          switch (predictorSelector) {
            case 1:
              predicted = a;
              break;
            case 2:
              predicted = b;
              break;
            case 3:
              predicted = c;
              break;
            case 4:
              predicted = a + b - c;
              break;
            case 5:
              predicted = a + ((b - c) >> 1);
              break;
            case 6:
              predicted = b + ((a - c) >> 1);
              break;
            case 7:
              predicted = (a + b) >> 1;
              break;
            default:
              throw new Error(`Unsupported JPEG Lossless predictor selector ${predictorSelector}.`);
          }
        }

        const category = bitReader.decodeHuffman(huffmanTree);
        // Per ITU-T.81 Table H.2: category 16 is a special case for high-precision data - it
        // always means a fixed difference of 32768 and (unlike every other category) appends
        // zero extra bits, so it must not be treated like a normal SSSS-bit-wide code.
        let difference;
        if (category === 16) {
          difference = 32768;
        } else {
          const diffBits = category > 0 ? bitReader.receive(category) : 0;
          difference = extend(diffBits, category);
        }
        const precisionMask = (1 << precision) - 1;
        pixels[index] = (predicted + difference) & precisionMask;
        index += 1;
        sinceRestart += 1;

        if (restartInterval > 0 && sinceRestart === restartInterval && index < pixelCount) {
          bitReader.consumeRestartMarker();
          sinceRestart = 0;
        }
      }

      reader.pos = bitReader.pos;
      return {
        width,
        height,
        precision,
        pixelData: pixels,
      };
    }

    // Any other marker segment (APPn, COM, etc.) - skip over it using its declared length.
    if ((marker & 0xfff0) === 0xffe0 || marker === 0xfffe) {
      const length = reader.u16();
      reader.pos += length - 2;
      continue;
    }

    throw new Error(`Unsupported JPEG marker 0x${marker.toString(16)} in lossless stream.`);
  }

  throw new Error("JPEG Lossless stream ended without a Start of Scan (SOS) segment.");
}
