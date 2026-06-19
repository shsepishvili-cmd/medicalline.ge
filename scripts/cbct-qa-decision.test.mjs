import assert from "node:assert/strict";
import { QA_STATUS, buildStrictDecision } from "../app/cbct-qa/qaDecision.mjs";

const completeMetadata = {
  kvp: "90",
  tubeCurrent: "8",
  exposureTime: "1000",
  exposure: "80",
  pixelSpacing: "0.2\\0.2",
  sliceThickness: "0.2",
  fov: "80x80",
  manufacturer: "Finno",
  manufacturerModelName: "FinScan F350",
  deviceSerialNumber: "SN-001",
  studyDate: "20260124",
  modality: "CT",
  seriesDescription: "CBCT phantom",
  voxelSize: "0.2 x 0.2 x 0.2 mm",
};

const completeAcceptance = {
  clinicName: "Clinic",
  deviceModel: "FinScan F350",
  serialNumber: "SN-001",
  phantomType: "FinScan phantom SN-PH-001",
  standardProtocol: "CBCT phantom protocol",
  operator: "Engineer",
  voxelSize: "0.2 x 0.2 x 0.2 mm",
};

const completeManual = {
  phantom_type_serial: "FinScan phantom SN-PH-001",
  baseline_protocol: "Approved CBCT protocol",
  high_contrast_score: "Pass",
  low_contrast_score: "Pass",
  artefact_review: "No unacceptable artefacts",
  laser_positioning_accuracy: "Pass",
  dose_report: "Within reviewed limits",
  external_dosimeter: "Verified",
  final_physicist_conclusion: "Approved / pass",
};

const completeMeasurements = {
  cnrAirPmma: 2.5,
  cnrPvcPmma: 3.0,
};

function decision(overrides = {}) {
  return buildStrictDecision({
    imageType: "phantom",
    mode: "acceptance",
    preset: "finscan_geometric",
    metadata: completeMetadata,
    measurements: completeMeasurements,
    geometryRows: [{ errorPercent: 10 }],
    acceptanceForm: completeAcceptance,
    manualValues: completeManual,
    mtf: { mtf10: 1.1, mtf50: 0.6 },
    validationFlags: {
      acceptanceIndexValidated: true,
      doseVerified: true,
      reconstructionTimeChecked: true,
    },
    ...overrides,
  });
}

assert.equal(decision().status, QA_STATUS.PASS, "complete valid report can pass");

assert.equal(
  decision({ geometryRows: [{ errorPercent: 100 }] }).status,
  QA_STATUS.FAIL,
  "geometric error 100% fails",
);

assert.equal(
  decision({ metadata: { ...completeMetadata, exposureTime: "-2147483648" } }).status,
  QA_STATUS.INCOMPLETE,
  "overflow exposure time is incomplete",
);

assert.equal(
  decision({ metadata: { ...completeMetadata, exposureTime: "Infinity" } }).status,
  QA_STATUS.INCOMPLETE,
  "Infinity exposure time is incomplete",
);

assert.equal(
  decision({ manualValues: { ...completeManual, phantom_type_serial: "" } }).status,
  QA_STATUS.INCOMPLETE,
  "missing phantom serial is incomplete",
);

assert.equal(
  decision({ manualValues: { ...completeManual, final_physicist_conclusion: "" } }).status,
  QA_STATUS.INCOMPLETE,
  "missing physicist conclusion is incomplete",
);

assert.equal(
  decision({ acceptanceForm: { ...completeAcceptance, voxelSize: "0.087 x 0.087" } }).status,
  QA_STATUS.INCOMPLETE,
  "conflicting voxel values are incomplete",
);

assert.equal(
  decision({ measurements: { cnrAirPmma: 1.5, cnrPvcPmma: 1.8 } }).status,
  QA_STATUS.FAIL,
  "CNR below 2 fails",
);

assert.equal(
  decision({ geometryRows: [] }).status,
  QA_STATUS.INCOMPLETE,
  "marker detection failure is incomplete",
);

assert.equal(
  decision({
    metadata: { ...completeMetadata, modality: "DX", seriesDescription: "Lateral Ceph" },
    imageType: "phantom",
    preset: "quart",
  }).status,
  QA_STATUS.INCOMPLETE,
  "wrong phantom preset for modality is incomplete",
);

assert.equal(
  decision({ mtf: {} }).status,
  QA_STATUS.INCOMPLETE,
  "automatic checks pass but MTF unavailable is incomplete",
);

console.log("CBCT QA decision tests passed");
