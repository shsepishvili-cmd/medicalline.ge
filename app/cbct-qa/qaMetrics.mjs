import { getPhantomProfile, PROFILE_VERSION } from "./phantomProfiles.mjs";

export const METHOD_VERSION = "FINSCAN-QA-METHOD-0.1";

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sd(values) {
  if (values.length < 2) return null;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(Math.max(0, variance));
}

function compare(value, criterion) {
  if (!criterion || !Number.isFinite(value)) return "INCOMPLETE";
  if (criterion.operator === ">=") return value >= criterion.threshold ? "PASS" : "ACTION";
  if (criterion.operator === ">") return value > criterion.threshold ? "PASS" : "ACTION";
  if (criterion.operator === "<") return value < criterion.threshold ? "PASS" : "ACTION";
  if (criterion.operator === "<=") return value <= criterion.threshold ? "PASS" : "ACTION";
  return "INCOMPLETE";
}

function criterion(profile, parameter) {
  return (profile.criteria || []).find((item) => item.parameter === parameter);
}

export function calculateNyquist(pixelSpacingMm) {
  const spacing = finite(pixelSpacingMm);
  if (!spacing || spacing <= 0) return null;
  return 1 / (2 * spacing);
}

export function roiPixels(image, roi) {
  if (!image?.values || !image?.columns || !image?.rows || !roi) return [];
  const x0 = Math.max(0, Math.floor(Number(roi.x)));
  const y0 = Math.max(0, Math.floor(Number(roi.y)));
  const x1 = Math.min(image.columns, Math.ceil(Number(roi.x) + Number(roi.width)));
  const y1 = Math.min(image.rows, Math.ceil(Number(roi.y) + Number(roi.height)));
  const values = [];
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) values.push(Number(image.values[y * image.columns + x]));
  }
  return values.filter(Number.isFinite);
}

function dftMagnitude(values, outputCount) {
  const n = values.length;
  const result = [];
  for (let k = 0; k < outputCount; k += 1) {
    let real = 0;
    let imag = 0;
    for (let i = 0; i < n; i += 1) {
      const angle = (-2 * Math.PI * k * i) / n;
      real += values[i] * Math.cos(angle);
      imag += values[i] * Math.sin(angle);
    }
    result.push(Math.sqrt(real * real + imag * imag));
  }
  return result;
}

function interpolateFrequency(curve, target) {
  for (let i = 1; i < curve.length; i += 1) {
    const prev = curve[i - 1];
    const next = curve[i];
    if (prev.mtf >= target && next.mtf <= target) {
      const denom = prev.mtf - next.mtf;
      const fraction = denom ? (prev.mtf - target) / denom : 0;
      return prev.frequency + (next.frequency - prev.frequency) * fraction;
    }
  }
  return null;
}

export function calculateMtfFromEdgeRoi(image, roi, pixelSpacingMm) {
  const spacing = finite(pixelSpacingMm);
  if (!image?.values || !spacing || spacing <= 0 || !roi?.confirmed) {
    return { valid: false, reason: "Confirmed edge ROI and valid sampling are required." };
  }

  const x0 = Math.max(0, Math.floor(Number(roi.x)));
  const y0 = Math.max(0, Math.floor(Number(roi.y)));
  const width = Math.max(2, Math.floor(Number(roi.width)));
  const height = Math.max(2, Math.floor(Number(roi.height)));
  const x1 = Math.min(image.columns, x0 + width);
  const y1 = Math.min(image.rows, y0 + height);
  const profile = [];

  for (let y = y0; y < y1; y += 1) {
    let sum = 0;
    let count = 0;
    for (let x = x0; x < x1; x += 1) {
      sum += image.values[y * image.columns + x];
      count += 1;
    }
    if (count) profile.push(sum / count);
  }

  if (profile.length < 8) return { valid: false, reason: "Edge ROI is too small for MTF." };

  const derivative = [];
  for (let i = 1; i < profile.length; i += 1) derivative.push(profile[i] - profile[i - 1]);
  let edgeIndex = 0;
  let maxResponse = -Infinity;
  derivative.forEach((value, index) => {
    const response = Math.abs(value);
    if (response > maxResponse) {
      maxResponse = response;
      edgeIndex = index;
    }
  });

  const halfBand = Math.min(32, edgeIndex, derivative.length - edgeIndex - 1);
  if (halfBand < 3) return { valid: false, reason: "Edge is too close to ROI boundary." };
  const lsf = derivative.slice(edgeIndex - halfBand, edgeIndex + halfBand + 1);
  const windowed = lsf.map((value, index) => {
    const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (lsf.length - 1));
    return value * hann;
  });
  const paddedLength = 256;
  const padded = new Array(paddedLength).fill(0);
  windowed.forEach((value, index) => {
    padded[index] = value;
  });

  const magnitudes = dftMagnitude(padded, paddedLength / 2);
  const zero = magnitudes[0] || 1;
  const nyquist = calculateNyquist(spacing);
  const curve = magnitudes.map((value, index) => ({
    frequency: (index / (magnitudes.length - 1)) * nyquist,
    mtf: Math.max(0, value / zero),
  }));

  return {
    valid: true,
    MTF50: interpolateFrequency(curve, 0.5),
    MTF10: interpolateFrequency(curve, 0.1),
    Nyquist: nyquist,
    curve,
    edgeIndex,
    methodVersion: METHOD_VERSION,
  };
}

export function calculateCnriFromEdgeRoi(image, roi) {
  if (!roi?.confirmed) return { valid: false, reason: "Confirmed CNRI edge ROI is required." };
  const pixels = roiPixels(image, roi);
  if (pixels.length < 8) return { valid: false, reason: "CNRI ROI is too small." };
  const sorted = [...pixels].sort((a, b) => a - b);
  const half = Math.floor(sorted.length / 2);
  const low = sorted.slice(0, half);
  const high = sorted.slice(sorted.length - half);
  const Pmin = mean(low);
  const Pmax = mean(high);
  const SDmin = sd(low);
  const SDmax = sd(high);
  const denominator = Math.sqrt((SDmax ** 2 + SDmin ** 2) / 2);
  const CNRI = denominator ? Math.abs(Pmax - Pmin) / denominator : null;
  return {
    valid: Number.isFinite(CNRI),
    Pmax,
    Pmin,
    SDmax,
    SDmin,
    CNRI,
    roiLocation: { plane: roi.plane, sliceIndex: roi.sliceIndex, x: roi.x, y: roi.y, width: roi.width, height: roi.height },
    methodVersion: METHOD_VERSION,
  };
}

export function calculateFiveRoiUniformity(image, rois, contrastNumerator) {
  const required = ["UNIFORMITY_CENTER", "UNIFORMITY_TOP", "UNIFORMITY_BOTTOM", "UNIFORMITY_LEFT", "UNIFORMITY_RIGHT"];
  const rows = required.map((type) => {
    const roi = (rois || []).find((item) => item.type === type && item.confirmed);
    const values = roiPixels(image, roi);
    return { type, roi, values, mean: mean(values), sd: sd(values), pixelCount: values.length };
  });
  if (rows.some((row) => !row.roi || !Number.isFinite(row.mean))) {
    return { valid: false, reason: "All five confirmed uniformity ROIs are required.", rows };
  }
  const means = rows.map((row) => row.mean);
  const Hm = mean(means);
  const maxDeviation = Math.max(...means.map((value) => Math.abs(value - Hm)));
  const numerator = finite(contrastNumerator);
  const H = numerator && maxDeviation ? Math.abs(numerator) / maxDeviation : null;
  return { valid: Number.isFinite(H), H, Hm, maxDeviation, rows, methodVersion: METHOD_VERSION };
}

export function calculateNoise(image, roi, baseline = null, thresholdPercent = null) {
  if (!roi?.confirmed) return { valid: false, reason: "Confirmed homogeneous reference ROI is required." };
  const values = roiPixels(image, roi);
  const meanValue = mean(values);
  const noise = sd(values);
  const baselineValue = finite(baseline);
  const deltaPercent = baselineValue ? ((noise - baselineValue) / baselineValue) * 100 : null;
  const threshold = finite(thresholdPercent);
  const status = threshold && Number.isFinite(deltaPercent) && Math.abs(deltaPercent) > threshold ? "ACTION" : "PASS";
  return { valid: Number.isFinite(noise), mean: meanValue, SD: noise, noise, baseline: baselineValue, deltaPercent, status, methodVersion: METHOD_VERSION };
}

export function calculateGeometry(pointA, pointB, spacingX, spacingY, referenceDistanceMm) {
  const sx = finite(spacingX);
  const sy = finite(spacingY);
  const ref = finite(referenceDistanceMm);
  if (!pointA || !pointB || !sx || !sy || !ref) {
    return { valid: false, reason: "Two points, PixelSpacing, and reference distance are required." };
  }
  const measuredDistanceMm = Math.sqrt(((pointB.x - pointA.x) * sx) ** 2 + ((pointB.y - pointA.y) * sy) ** 2);
  const errorMm = measuredDistanceMm - ref;
  const errorPercent = (errorMm / ref) * 100;
  return { valid: true, referenceDistanceMm: ref, measuredDistanceMm, errorMm, errorPercent, methodVersion: METHOD_VERSION };
}

export function calculateKap(input = {}) {
  const meterReading = finite(input.meterReading);
  const calibrationFactor = finite(input.calibrationFactor);
  const temperatureC = finite(input.temperatureC);
  const pressureKpa = finite(input.pressureKpa);
  const fovAreaCm2 = finite(input.fovAreaCm2);
  if (!meterReading || !calibrationFactor || temperatureC === null || !pressureKpa) {
    return { valid: false, reason: "Meter reading, calibration factor, temperature, and pressure are required." };
  }
  const kTP = ((273.15 + temperatureC) / 293.15) * (101.3 / pressureKpa);
  const KAPcorrected = meterReading * calibrationFactor * kTP;
  const KAP16 = fovAreaCm2 ? KAPcorrected * 16 / fovAreaCm2 : null;
  return { valid: true, raw: { ...input }, kTP, KAPcorrected, KAP16, methodVersion: METHOD_VERSION };
}

export function validateSeries(instances = []) {
  const warnings = [];
  const errors = [];
  if (!instances.length) errors.push("No DICOM instances imported.");
  const studyUids = new Set(instances.map((item) => item.metadata?.StudyInstanceUID || item.metadata?.studyInstanceUid || ""));
  const seriesUids = new Set(instances.map((item) => item.metadata?.SeriesInstanceUID || item.metadata?.seriesInstanceUid || ""));
  if (studyUids.size > 1) errors.push("Mixed StudyInstanceUID values are not allowed in one test.");
  if (seriesUids.size > 1) errors.push("Mixed SeriesInstanceUID values are not allowed in one test.");
  const first = instances[0]?.metadata || {};
  const keys = ["Rows", "Columns", "PixelSpacing", "SliceThickness", "BitsAllocated", "BitsStored", "Manufacturer", "ManufacturerModelName", "SeriesInstanceUID"];
  keys.forEach((key) => {
    const values = new Set(instances.map((item) => String(item.metadata?.[key] ?? item.metadata?.[key[0].toLowerCase() + key.slice(1)] ?? "")));
    if (values.size > 1) errors.push(`Inconsistent ${key} across series.`);
  });
  const spacing = String(first.PixelSpacing || first.pixelSpacing || "").split("\\").map(Number);
  const rows = Number(first.Rows || first.rows || 0);
  const columns = Number(first.Columns || first.columns || 0);
  const sorted = [...instances].sort((a, b) => {
    const az = finite(a.metadata?.imagePositionPatientZ) ?? finite(a.metadata?.InstanceNumber) ?? 0;
    const bz = finite(b.metadata?.imagePositionPatientZ) ?? finite(b.metadata?.InstanceNumber) ?? 0;
    return az - bz;
  });
  const zValues = sorted.map((item) => finite(item.metadata?.imagePositionPatientZ)).filter((value) => value !== null);
  const spacingZ = zValues.length > 1 ? Math.abs(zValues[1] - zValues[0]) : finite(first.SliceThickness || first.sliceThickness);
  if (!spacing[0] || !spacing[1]) errors.push("PixelSpacing is missing or invalid.");
  return {
    valid: errors.length === 0,
    warnings,
    errors,
    sliceCount: instances.length,
    sorted,
    spacingX: spacing[1] || null,
    spacingY: spacing[0] || null,
    spacingZ: spacingZ || null,
    matrix: rows && columns ? `${columns} x ${rows}` : "",
    physicalWidthMm: columns && spacing[1] ? columns * spacing[1] : null,
    physicalHeightMm: rows && spacing[0] ? rows * spacing[0] : null,
  };
}

function toUint8Array(bytes) {
  if (bytes instanceof Uint8Array) return bytes;
  if (typeof bytes === "string") return new TextEncoder().encode(bytes);
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
  return new Uint8Array(bytes);
}

export async function sha256Hex(bytes) {
  const data = toUint8Array(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildSeriesAudit(instances = [], softwareVersion = "FinScan F350 DICOM QA Analysis") {
  const canonicalRows = instances
    .map((item) => `${item.filename || ""}|${item.metadata?.SOPInstanceUID || item.metadata?.sopInstanceUid || ""}|${item.fileSHA256 || ""}`)
    .sort();
  return {
    StudyInstanceUID: instances[0]?.metadata?.StudyInstanceUID || instances[0]?.metadata?.studyInstanceUid || "",
    SeriesInstanceUID: instances[0]?.metadata?.SeriesInstanceUID || instances[0]?.metadata?.seriesInstanceUid || "",
    SOPInstanceUIDs: instances.map((item) => item.metadata?.SOPInstanceUID || item.metadata?.sopInstanceUid || ""),
    fileSHA256List: instances.map((item) => item.fileSHA256 || ""),
    seriesSHA256: await sha256Hex(canonicalRows.join("\n")),
    softwareVersion,
    methodVersion: METHOD_VERSION,
    profileVersion: PROFILE_VERSION,
    generatedAt: new Date().toISOString(),
  };
}

export function evaluateQaResult(input = {}) {
  const profile = getPhantomProfile(input.profileId);
  const missing = [];
  const action = [];
  const review = [];
  if (!input.seriesValidation?.valid) missing.push("DICOM series validation failed or is incomplete.");
  if (input.testType === "TECHNICAL") return { status: "INCOMPLETE", reasons: ["Technical verification does not produce phantom acceptance PASS."] };
  if (!input.phantomConfirmed) missing.push("Dedicated QA phantom confirmation is required.");
  if (!input.phantomModel || (profile.serialRequired && !input.phantomSerial)) missing.push("Phantom model and serial number are required.");
  if (!input.roisConfirmed) missing.push("Required ROI positions must be confirmed.");
  if (!input.dose?.valid) missing.push("External KAP/dose measurement is incomplete.");
  if (input.artefactReviewPending) review.push("Manual artefact or medical physicist review pending.");

  [
    ["MTF10", input.mtf?.MTF10],
    ["CNRI", input.cnri?.CNRI],
    ["UNIFORMITY_H", input.uniformity?.H],
    ["GEOMETRY_ERROR_PERCENT", Math.abs(input.geometry?.errorPercent)],
  ].forEach(([parameter, value]) => {
    const c = criterion(profile, parameter);
    const result = compare(value, c);
    if (result === "INCOMPLETE") missing.push(`${parameter} is unavailable.`);
    if (result === "ACTION") action.push(`${parameter} fails criterion ${c.operator} ${c.threshold} ${c.units}.`);
  });

  if (missing.length) return { status: "INCOMPLETE", reasons: [...new Set(missing)] };
  if (action.length) return { status: "ACTION", reasons: [...new Set(action)] };
  if (review.length) return { status: "REVIEW REQUIRED", reasons: review };
  return { status: "PASS", reasons: [] };
}
