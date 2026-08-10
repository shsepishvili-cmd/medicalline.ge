// FinScan F350 CBCT QA quantitative calculation engine.
// Methods are implemented from published dental-CBCT QA methodology and MUST be
// validated against reference phantom datasets before regulatory use.

export const QA_METHOD_VERSION = "F350-QA-MATH-0.1.0";

function finite(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

export function mean(values) {
  const clean = values.map(finite).filter((v) => v !== null);
  if (!clean.length) return NaN;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

export function stdDev(values) {
  const clean = values.map(finite).filter((v) => v !== null);
  if (!clean.length) return NaN;
  const m = mean(clean);
  const variance = clean.reduce((sum, value) => sum + (value - m) ** 2, 0) / clean.length;
  return Math.sqrt(Math.max(0, variance));
}

export function nyquistFrequency(pixelSpacingMm) {
  const spacing = finite(pixelSpacingMm);
  if (!spacing || spacing <= 0) return NaN;
  return 1 / (2 * spacing);
}

function dftMagnitude(sequence) {
  const n = sequence.length;
  if (!n) return [];
  const half = Math.floor(n / 2);
  const out = new Array(half + 1).fill(0);
  for (let k = 0; k <= half; k += 1) {
    let re = 0;
    let im = 0;
    for (let t = 0; t < n; t += 1) {
      const angle = (-2 * Math.PI * k * t) / n;
      re += sequence[t] * Math.cos(angle);
      im += sequence[t] * Math.sin(angle);
    }
    out[k] = Math.sqrt(re * re + im * im);
  }
  const max = Math.max(...out, 0);
  return max > 0 ? out.map((value) => value / max) : out;
}

function nextPowerOfTwo(value) {
  let n = 1;
  while (n < value) n *= 2;
  return n;
}

function padWithZeros(values, length) {
  if (values.length >= length) return values.slice(0, length);
  return [...values, ...new Array(length - values.length).fill(0)];
}

function interpolateCrossing(points, target) {
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const cur = points[i];
    const y1 = prev.mtf;
    const y2 = cur.mtf;
    if ((y1 >= target && y2 <= target) || (y1 <= target && y2 >= target)) {
      if (y1 === y2) return cur.frequency;
      const ratio = (target - y1) / (y2 - y1);
      return prev.frequency + ratio * (cur.frequency - prev.frequency);
    }
  }
  return NaN;
}

/**
 * Published edge-MTF workflow for the QUART DVT_AP style PVC/air edge.
 * Input ROI must be a rectangular pixel array whose edge is parallel to the ROI rows.
 * Pixel values are row-major.
 */
export function calculateEdgeMtf({ pixels, width, height, pixelSpacingMm }) {
  if (!pixels || !width || !height || pixels.length < width * height) {
    return { valid: false, reason: "Invalid MTF ROI", curve: [], mtf10: NaN, mtf50: NaN, nyquist: NaN };
  }
  const spacing = finite(pixelSpacingMm);
  if (!spacing || spacing <= 0) {
    return { valid: false, reason: "Pixel spacing is required", curve: [], mtf10: NaN, mtf50: NaN, nyquist: NaN };
  }

  // Step 1: mean value of every row parallel to the PVC/air edge.
  const rowMeans = [];
  for (let y = 0; y < height; y += 1) {
    let sum = 0;
    for (let x = 0; x < width; x += 1) sum += Number(pixels[y * width + x]);
    rowMeans.push(sum / width);
  }

  // Step 2: first-order differential Dm = M(m+1) - Mm.
  const differential = [];
  for (let i = 0; i < rowMeans.length - 1; i += 1) differential.push(rowMeans[i + 1] - rowMeans[i]);
  if (differential.length < 5) {
    return { valid: false, reason: "MTF ROI is too short", curve: [], mtf10: NaN, mtf50: NaN, nyquist: nyquistFrequency(spacing) };
  }

  // Step 3: locate the strongest edge. The published method refers to Dk=max(D).
  // We use absolute magnitude so the same method works for either PVC→air or air→PVC orientation.
  let k = 0;
  let strongest = -Infinity;
  differential.forEach((value, index) => {
    const magnitude = Math.abs(value);
    if (magnitude > strongest) {
      strongest = magnitude;
      k = index;
    }
  });

  // Use the largest symmetric data band available around Dk.
  const l = Math.min(k, differential.length - 1 - k);
  if (l < 1) {
    return { valid: false, reason: "MTF edge is too close to ROI boundary", curve: [], mtf10: NaN, mtf50: NaN, nyquist: nyquistFrequency(spacing) };
  }
  const band = differential.slice(k - l, k + l + 1);

  // Orient positive for stable averaging.
  const sign = band[l] < 0 ? -1 : 1;
  const oriented = band.map((v) => v * sign);

  // Step 4: zero-padding and DFT of original + arithmetically symmetric sequence.
  const paddedLength = nextPowerOfTwo(oriented.length);
  const raw = padWithZeros(oriented, paddedLength);
  const symmetricCore = oriented.map((_, i) => {
    const j = oriented.length - 1 - i;
    return (Math.abs(oriented[i]) + Math.abs(oriented[j])) / 2;
  });
  const symmetric = padWithZeros(symmetricCore, paddedLength);
  const f = dftMagnitude(raw);
  const fe = dftMagnitude(symmetric);

  // Step 5: average spectra and map bins from 0 to Nyquist.
  const nyquist = nyquistFrequency(spacing);
  const bins = Math.min(f.length, fe.length);
  const curve = [];
  for (let p = 0; p < bins; p += 1) {
    const denom = Math.max(1, bins - 1);
    curve.push({
      frequency: (p * nyquist) / denom,
      mtf: (f[p] + fe[p]) / 2,
    });
  }

  return {
    valid: true,
    reason: "",
    method: "Published DVT_AP edge MTF / row differential + symmetric DFT",
    methodVersion: QA_METHOD_VERSION,
    rowMeans,
    differential,
    edgeIndex: k,
    nyquist,
    curve,
    mtf50: interpolateCrossing(curve, 0.5),
    mtf10: interpolateCrossing(curve, 0.1),
  };
}

/** DIN-style contrast-to-noise index from a PVC/PMMA edge ROI. */
export function calculateCnri({ pixels, width, height }) {
  if (!pixels || !width || !height || pixels.length < width * height || height < 13) {
    return { valid: false, reason: "Invalid/too-small CNRI ROI", cnri: NaN };
  }

  const rowMeans = [];
  const rowStd = [];
  for (let y = 0; y < height; y += 1) {
    const row = [];
    for (let x = 0; x < width; x += 1) row.push(Number(pixels[y * width + x]));
    rowMeans.push(mean(row));
    rowStd.push(stdDev(row));
  }

  // Eq. (6): 5-row forward moving mean minus 4-row backward moving mean.
  const first = new Array(height).fill(NaN);
  for (let m = 4; m <= height - 5; m += 1) {
    const forward = mean(rowMeans.slice(m, m + 5));
    const backward = mean(rowMeans.slice(m - 4, m));
    first[m] = forward - backward;
  }

  // Eq. (7): second-order differential.
  const second = new Array(height).fill(NaN);
  for (let m = 4; m < height - 5; m += 1) {
    if (Number.isFinite(first[m]) && Number.isFinite(first[m + 1])) second[m] = first[m + 1] - first[m];
  }

  const validIndexes = second.map((v, i) => [v, i]).filter(([v]) => Number.isFinite(v));
  if (!validIndexes.length) return { valid: false, reason: "CNRI edge could not be resolved", cnri: NaN };

  let mmax = validIndexes[0][1];
  let mmin = validIndexes[0][1];
  validIndexes.forEach(([value, index]) => {
    if (value > second[mmax]) mmax = index;
    if (value < second[mmin]) mmin = index;
  });

  const pMax = rowMeans[mmax];
  const pMin = rowMeans[mmin];
  const sMax = rowStd[mmax];
  const sMin = rowStd[mmin];
  const denominator = Math.sqrt(0.5 * (sMax ** 2 + sMin ** 2));
  const cnri = denominator > 0 ? Math.abs(pMax - pMin) / denominator : NaN;

  return {
    valid: Number.isFinite(cnri),
    reason: Number.isFinite(cnri) ? "" : "CNRI denominator is zero/invalid",
    method: "DIN 6868-161 style CNRI edge method",
    methodVersion: QA_METHOD_VERSION,
    cnri,
    pMax,
    pMin,
    sMax,
    sMin,
    mmax,
    mmin,
    rowMeans,
    rowStd,
  };
}

/**
 * DIN-style uniformity index H from five homogeneous-material ROIs.
 * contrastNumerator should be |Pmmax-Pmmin| from the paired CNRI edge measurement.
 */
export function calculateUniformityIndex({ center, top, left, right, bottom, contrastNumerator }) {
  const values = [center, top, left, right, bottom].map(finite);
  const contrast = finite(contrastNumerator);
  if (values.some((v) => v === null) || contrast === null) {
    return { valid: false, reason: "Five ROI means and contrast numerator are required", index: NaN };
  }
  const hm = mean(values);
  const maxDeviation = Math.max(...values.map((value) => Math.abs(value - hm)));
  const index = maxDeviation > 0 ? Math.abs(contrast) / maxDeviation : Infinity;
  return {
    valid: Number.isFinite(index) || index === Infinity,
    reason: "",
    method: "DIN 6868-161 style five-ROI uniformity index",
    methodVersion: QA_METHOD_VERSION,
    index,
    average: hm,
    maxDeviation,
    roiMeans: { center: values[0], top: values[1], left: values[2], right: values[3], bottom: values[4] },
  };
}

export function correctedKap({ meterReading, calibrationFactor = 1, temperatureC = 20, pressureKpa = 101.3 }) {
  const m = finite(meterReading);
  const nk = finite(calibrationFactor);
  const t = finite(temperatureC);
  const p = finite(pressureKpa);
  if ([m, nk, t, p].some((v) => v === null) || p <= 0) return NaN;
  const ktp = ((273.15 + t) / 293.15) * (101.3 / p);
  return m * nk * ktp;
}

export function normalizeKapTo16Cm2({ correctedKapValue, fovAreaCm2 }) {
  const kap = finite(correctedKapValue);
  const area = finite(fovAreaCm2);
  if (kap === null || area === null || area <= 0) return NaN;
  return (kap * 16) / area;
}

export function evaluateDentalQa({ mtf10, cnri, uniformityIndex, normalizedKap }) {
  const checks = [
    { key: "MTF10", value: mtf10, rule: ">= 1.0 lp/mm", pass: Number.isFinite(mtf10) && mtf10 >= 1.0 },
    { key: "CNRI", value: cnri, rule: "< 20", pass: Number.isFinite(cnri) && cnri < 20 },
    { key: "Uniformity", value: uniformityIndex, rule: "> 5", pass: Number.isFinite(uniformityIndex) && uniformityIndex > 5 },
    { key: "Normalized KAP", value: normalizedKap, rule: "<= 250 mGy·cm²", pass: Number.isFinite(normalizedKap) && normalizedKap <= 250 },
  ];
  return {
    checks,
    status: checks.every((check) => check.pass) ? "PASS" : checks.some((check) => !Number.isFinite(check.value)) ? "INCOMPLETE" : "ACTION",
  };
}

export function percentDeviation(current, baseline) {
  const c = finite(current);
  const b = finite(baseline);
  if (c === null || b === null || b === 0) return NaN;
  return ((c - b) / b) * 100;
}
