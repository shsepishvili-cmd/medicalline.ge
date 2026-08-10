import assert from "node:assert";
import { decodeJpegLosslessFrame } from "../app/cbct-qa/jpegLosslessDecoder.mjs";

// Hand-build a minimal single-component 8-bit JPEG Lossless (SOF3) stream, 4x4,
// predictor 1 ("Ra" - pixel to the left), with a restart interval of 4 (one per row)
// to exercise the restart-marker path too.

function categoryOf(diff) {
  if (diff === 0) return 0;
  let magnitude = Math.abs(diff);
  let category = 0;
  while (magnitude > 0) {
    category += 1;
    magnitude >>= 1;
  }
  return category;
}

function diffBitsOf(diff, category) {
  if (category === 0) return 0;
  return diff >= 0 ? diff : diff + (1 << category) - 1;
}

class BitWriter {
  constructor() {
    this.bytes = [];
    this.cur = 0;
    this.n = 0;
  }
  pushBit(bit) {
    this.cur = (this.cur << 1) | bit;
    this.n += 1;
    if (this.n === 8) {
      this.bytes.push(this.cur);
      if (this.cur === 0xff) this.bytes.push(0x00);
      this.cur = 0;
      this.n = 0;
    }
  }
  pushBits(value, count) {
    for (let i = count - 1; i >= 0; i -= 1) this.pushBit((value >> i) & 1);
  }
  padToByteBoundary() {
    while (this.n !== 0) this.pushBit(1);
  }
  finish() {
    this.padToByteBoundary();
    return this.bytes;
  }
}

// Toy DC Huffman table: category X (0..8) -> 4-bit code = X.
const bitsPerLength = new Array(16).fill(0);
bitsPerLength[3] = 9; // nine codes of length 4
const huffVal = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const width = 4;
const height = 4;
const pixels = [
  100, 102, 105, 101,
  99, 140, 90, 200,
  0, 255, 128, 64,
  10, 20, 30, 250,
];

const writer = new BitWriter();
const restartInterval = 4;
let sinceRestart = 0;
const restartByteOffsets = [];
for (let index = 0; index < pixels.length; index += 1) {
  const x = index % width;
  const y = (index - x) / width;
  const isRestartStart = restartInterval > 0 && sinceRestart === 0 && index > 0;
  let predicted;
  if ((x === 0 && y === 0) || isRestartStart) predicted = 128;
  else if (x === 0) predicted = pixels[index - width];
  else predicted = pixels[index - 1]; // predictor 1 = "a" (left); also correct for y===0 row

  const diff = pixels[index] - predicted;
  const category = categoryOf(diff);
  writer.pushBits(category, 4); // toy Huffman code
  if (category > 0) writer.pushBits(diffBitsOf(diff, category), category);

  sinceRestart += 1;
  if (restartInterval > 0 && sinceRestart === restartInterval && index < pixels.length - 1) {
    writer.padToByteBoundary();
    restartByteOffsets.push(writer.bytes.length);
    sinceRestart = 0;
  }
}
const entropyBytes = writer.finish();

// Splice restart markers (FFD0-FFD7, cycling) in at the recorded offsets, back-to-front so
// earlier offsets stay valid as the array grows.
for (let i = restartByteOffsets.length - 1; i >= 0; i -= 1) {
  const marker = 0xd0 + (i % 8);
  entropyBytes.splice(restartByteOffsets[i], 0, 0xff, marker);
}

const bytes = [];
const push = (...vals) => bytes.push(...vals);
push(0xff, 0xd8); // SOI

const dhtPayload = [0x00, ...bitsPerLength, ...huffVal];
push(0xff, 0xc4, (dhtPayload.length + 2) >> 8, (dhtPayload.length + 2) & 0xff, ...dhtPayload);

// SOF3: length, precision=8, height, width, 1 component (id=1, sampling=0x11, qtable=0)
push(0xff, 0xc3, 0x00, 0x08, 0x08, 0x00, height, 0x00, width, 0x01, 0x01, 0x11, 0x00);

// DRI: restart interval
push(0xff, 0xdd, 0x00, 0x04, (restartInterval >> 8) & 0xff, restartInterval & 0xff);

// SOS: 1 component (selector=1, DC table 0), Ss(predictor)=1, Se=0, AhAl=0
push(0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x01, 0x00, 0x00);

push(...entropyBytes);
push(0xff, 0xd9); // EOI

const decoded = decodeJpegLosslessFrame(new Uint8Array(bytes));

assert.equal(decoded.width, width);
assert.equal(decoded.height, height);
assert.equal(decoded.precision, 8);
assert.deepEqual(Array.from(decoded.pixelData), pixels);

console.log("CBCT QA JPEG Lossless decoder test passed");
