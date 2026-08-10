import assert from "node:assert/strict";
import {
  calculateCnri,
  calculateEdgeMtf,
  calculateUniformityIndex,
  correctedKap,
  evaluateDentalQa,
  normalizeKapTo16Cm2,
  nyquistFrequency,
} from "../app/cbct-qa/qaMetrics.mjs";

function syntheticEdge(width = 20, height = 40, low = 100, high = 900) {
  const pixels = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const base = y < height / 2 ? low : high;
    for (let x = 0; x < width; x += 1) pixels[y * width + x] = base + ((x % 3) - 1) * 2;
  }
  return pixels;
}

assert.equal(nyquistFrequency(0.25), 2);

const edge = syntheticEdge();
const mtf = calculateEdgeMtf({ pixels: edge, width: 20, height: 40, pixelSpacingMm: 0.25 });
assert.equal(mtf.valid, true);
assert.ok(Number.isFinite(mtf.nyquist));
assert.ok(Array.isArray(mtf.curve) && mtf.curve.length > 2);

const cnri = calculateCnri({ pixels: edge, width: 20, height: 40 });
assert.equal(cnri.valid, true);
assert.ok(Number.isFinite(cnri.cnri));
assert.ok(cnri.cnri > 0);

const uniformity = calculateUniformityIndex({
  center: 500,
  top: 503,
  left: 498,
  right: 501,
  bottom: 499,
  contrastNumerator: 800,
});
assert.equal(uniformity.valid, true);
assert.ok(uniformity.index > 5);

const kap = correctedKap({ meterReading: 100, calibrationFactor: 1, temperatureC: 20, pressureKpa: 101.3 });
assert.ok(Math.abs(kap - 100) < 1e-9);
assert.equal(normalizeKapTo16Cm2({ correctedKapValue: 100, fovAreaCm2: 16 }), 100);

const decision = evaluateDentalQa({ mtf10: 1.2, cnri: 8, uniformityIndex: 12, normalizedKap: 120 });
assert.equal(decision.status, "PASS");

console.log("FinScan F350 QA metrics tests passed");
