import assert from "node:assert/strict";
import {
  buildSeriesAudit,
  calculateCnriFromEdgeRoi,
  calculateFiveRoiUniformity,
  calculateGeometry,
  calculateKap,
  calculateMtfFromEdgeRoi,
  calculateNyquist,
  evaluateQaResult,
  validateSeries,
} from "../app/cbct-qa/qaMetrics.mjs";

function image(columns, rows, valueAt) {
  const values = new Float32Array(columns * rows);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) values[y * columns + x] = valueAt(x, y);
  }
  return { columns, rows, values };
}

function roi(type, x, y, width, height) {
  return { type, x, y, width, height, plane: "AXIAL", sliceIndex: 0, confirmed: true };
}

const edgeImage = image(80, 96, (x, y) => 100 + 900 / (1 + Math.exp(-(y - 48) / 3)) + ((x % 5) - 2));
const mtf = calculateMtfFromEdgeRoi(edgeImage, roi("MTF_XY_EDGE", 18, 8, 44, 80), 0.2);
assert.equal(calculateNyquist(0.2), 2.5);
assert.equal(mtf.valid, true);
assert.ok(mtf.MTF50 > 0 && mtf.MTF50 < mtf.Nyquist);
assert.ok(mtf.MTF10 > mtf.MTF50 && mtf.MTF10 <= mtf.Nyquist);

const cnriImage = image(40, 20, (x, y) => (x < 20 ? 100 + ((x + y) % 7) : 160 + ((x + y) % 9)));
const cnri = calculateCnriFromEdgeRoi(cnriImage, roi("CNRI_EDGE", 0, 0, 40, 20));
assert.equal(cnri.valid, true);
assert.ok(cnri.CNRI > 20);

const uniformImage = image(100, 100, (x, y) => 500 + (x > 50 ? 1 : -1) + (y > 50 ? 1 : -1));
const uniformity = calculateFiveRoiUniformity(uniformImage, [
  roi("UNIFORMITY_CENTER", 45, 45, 10, 10),
  roi("UNIFORMITY_TOP", 45, 10, 10, 10),
  roi("UNIFORMITY_BOTTOM", 45, 80, 10, 10),
  roi("UNIFORMITY_LEFT", 10, 45, 10, 10),
  roi("UNIFORMITY_RIGHT", 80, 45, 10, 10),
], 100);
assert.equal(uniformity.valid, true);
assert.ok(uniformity.H > 5);

const geometry = calculateGeometry({ x: 10, y: 10 }, { x: 60, y: 10 }, 0.2, 0.2, 10);
assert.equal(geometry.valid, true);
assert.equal(Math.round(geometry.errorPercent), 0);

const kap = calculateKap({ meterReading: 10, calibrationFactor: 1.2, temperatureC: 20, pressureKpa: 101.3, fovAreaCm2: 16 });
assert.equal(kap.valid, true);
assert.equal(Math.round(kap.KAP16 * 100) / 100, 12);

const instances = [3, 1, 2].map((instanceNumber) => ({
  filename: `${instanceNumber}.dcm`,
  fileSHA256: `hash-${instanceNumber}`,
  metadata: {
    StudyInstanceUID: "study",
    SeriesInstanceUID: "series",
    SOPInstanceUID: `sop-${instanceNumber}`,
    Manufacturer: "Eighteeth",
    ManufacturerModelName: "FinScan F350",
    Rows: 100,
    Columns: 100,
    PixelSpacing: "0.2\\0.2",
    SliceThickness: "0.2",
    BitsAllocated: 16,
    BitsStored: 12,
    InstanceNumber: instanceNumber,
  },
}));
const validation = validateSeries(instances);
assert.equal(validation.valid, true);
assert.deepEqual(validation.sorted.map((item) => item.metadata.InstanceNumber), [1, 2, 3]);

const mixed = validateSeries([
  instances[0],
  { ...instances[1], metadata: { ...instances[1].metadata, SeriesInstanceUID: "other-series" } },
]);
assert.equal(mixed.valid, false);
assert.ok(mixed.errors.some((error) => error.includes("Mixed SeriesInstanceUID")));

const incomplete = evaluateQaResult({ testType: "ACCEPTANCE", seriesValidation: { valid: false }, artefactReviewPending: true });
assert.equal(incomplete.status, "INCOMPLETE");

const action = evaluateQaResult({
  testType: "ACCEPTANCE",
  profileId: "QUART_DVT_AP",
  seriesValidation: { valid: true },
  phantomConfirmed: true,
  phantomModel: "DVT_AP",
  phantomSerial: "SN-1",
  roisConfirmed: true,
  mtf: { MTF10: 0.3 },
  cnri: { CNRI: 10 },
  uniformity: { H: 7 },
  geometry: { errorPercent: 1 },
  dose: { valid: true },
  artefactReviewPending: false,
});
assert.equal(action.status, "ACTION");

const pass = evaluateQaResult({
  testType: "ACCEPTANCE",
  profileId: "QUART_DVT_AP",
  seriesValidation: { valid: true },
  phantomConfirmed: true,
  phantomModel: "DVT_AP",
  phantomSerial: "SN-1",
  roisConfirmed: true,
  mtf: { MTF10: 1.2 },
  cnri: { CNRI: 10 },
  uniformity: { H: 7 },
  geometry: { errorPercent: 1 },
  dose: { valid: true },
  artefactReviewPending: false,
});
assert.equal(pass.status, "PASS");

const technical = evaluateQaResult({ testType: "TECHNICAL", seriesValidation: { valid: true } });
assert.equal(technical.status, "INCOMPLETE");
assert.ok(technical.reasons[0].includes("does not produce phantom acceptance PASS"));

const auditA = await buildSeriesAudit(instances, "test");
const auditB = await buildSeriesAudit([...instances].reverse(), "test");
assert.equal(auditA.seriesSHA256, auditB.seriesSHA256);
assert.match(auditA.seriesSHA256, /^[a-f0-9]{64}$/);

console.log("cbct-qa metrics tests passed");
