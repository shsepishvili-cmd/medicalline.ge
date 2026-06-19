"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as dicomParser from "dicom-parser";
import { jsPDF } from "jspdf";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileScan,
  Info,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { buildDicomValidation, buildStrictDecision } from "./qaDecision.mjs";

const MODES = {
  ACCEPTANCE: "acceptance",
  QC: "qc",
  PREVIEW: "preview",
};
const IMAGE_TYPES = {
  PATIENT: "patient",
  PHANTOM: "phantom",
};
const PRESETS = {
  PATIENT: "patient",
  GENERIC: "generic",
  FINSCAN: "finscan",
  FINSCAN_CALIBRATION: "finscan_calibration",
  FINSCAN_GEOMETRIC: "finscan_geometric",
  QUART: "quart",
  CUSTOM: "custom",
};

const ROI_TYPES = {
  REFERENCE: "reference",
  AIR: "air",
  HIGH_DENSITY: "high_density",
  HOMOGENEITY_CENTER: "homogeneity_center",
  HOMOGENEITY_PERIPHERAL: "homogeneity_peripheral",
  GEOMETRY_MARKER: "geometry_marker",
  CUSTOM: "custom",
};

const ROI_TYPE_OPTIONS = [
  { value: ROI_TYPES.REFERENCE, label: "Reference material / PMMA / Soft tissue" },
  { value: ROI_TYPES.AIR, label: "Air" },
  { value: ROI_TYPES.HIGH_DENSITY, label: "High-density / PVC / Bone-equivalent" },
  { value: ROI_TYPES.HOMOGENEITY_CENTER, label: "Homogeneity center" },
  { value: ROI_TYPES.HOMOGENEITY_PERIPHERAL, label: "Homogeneity peripheral" },
  { value: ROI_TYPES.GEOMETRY_MARKER, label: "Geometry marker" },
  { value: ROI_TYPES.CUSTOM, label: "Custom" },
];

const FINSCAN_SUBMODES = {
  GEOMETRIC: "geometric",
  UNIFORMITY: "uniformity",
};

const MODE_DETAILS = {
  [MODES.ACCEPTANCE]: {
    title: "Acceptance Test",
    text: "Initial test after installation, relocation, major repair, tube/generator replacement, or major calibration.",
  },
  [MODES.QC]: {
    title: "Quality Control / Constancy Test",
    text: "Periodic QA check compared against baseline values from acceptance or previous QC.",
  },
  [MODES.PREVIEW]: {
    title: "Technical Preview / Patient DICOM",
    text: "Upload/preview/ROI workflow only. Phantom QA scoring is intentionally disabled.",
  },
};

const DISCLAIMER =
  "This MVP is for internal QA screening and demonstration only. It is not certified acceptance testing software and does not replace validated phantom software or regulatory medical physics evaluation.";

const SUPPORTED_TRANSFER_SYNTAXES = new Set([
  "1.2.840.10008.1.2",
  "1.2.840.10008.1.2.1",
  "1.2.840.10008.1.2.1.99",
  "1.2.840.10008.1.2.2",
]);

const METADATA_FIELDS = [
  { key: "rows", label: "Rows / რიგები" },
  { key: "columns", label: "Columns / სვეტები" },
  { key: "bitsAllocated", label: "Bits Allocated" },
  { key: "bitsStored", label: "Bits Stored" },
  { key: "pixelRepresentation", label: "Pixel Representation" },
  { key: "pixelSpacing", label: "Pixel Spacing" },
  { key: "kvp", label: "KVP" },
  { key: "exposureTime", label: "Exposure Time" },
  { key: "tubeCurrent", label: "XRay Tube Current" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "manufacturerModelName", label: "Model" },
  { key: "deviceSerialNumber", label: "Serial" },
  { key: "protocolName", label: "Protocol" },
  { key: "ctdiVol", label: "Dose index" },
  { key: "modality", label: "Modality" },
  { key: "seriesDescription", label: "Series Description" },
  { key: "softwareVersions", label: "Software Version" },
  { key: "fov", label: "FOV" },
  { key: "voxelSize", label: "Voxel Size" },
];

const AGENCY_METADATA_FIELDS = [
  { key: "institutionName", label: "Institution" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "manufacturerModelName", label: "CBCT model" },
  { key: "deviceSerialNumber", label: "CBCT serial number" },
  { key: "softwareVersions", label: "Software version" },
  { key: "stationName", label: "Station name" },
  { key: "protocolName", label: "CBCT protocol / preset" },
  { key: "seriesDescription", label: "Series description" },
  { key: "studyDate", label: "Study date" },
  { key: "acquisitionDate", label: "Acquisition date" },
  { key: "modality", label: "Modality" },
  { key: "fov", label: "FOV" },
  { key: "voxelSize", label: "Voxel size" },
  { key: "pixelSpacing", label: "Pixel spacing" },
  { key: "rows", label: "Image rows" },
  { key: "columns", label: "Image columns" },
  { key: "kvp", label: "kVp" },
  { key: "tubeCurrent", label: "Tube current mA" },
  { key: "exposureTime", label: "Exposure time ms" },
  { key: "exposure", label: "Exposure mAs" },
  { key: "sliceThickness", label: "Slice thickness" },
];

const AGENCY_MANUAL_FIELDS = [
  { key: "phantom_type_serial", label: "CBCT phantom type and serial number" },
  { key: "baseline_protocol", label: "Baseline scan protocol approved by clinic" },
  { key: "high_contrast_score", label: "High-contrast resolution visual score" },
  { key: "low_contrast_score", label: "Low-contrast visibility visual score" },
  { key: "artefact_review", label: "Artefact visual review" },
  { key: "laser_positioning_accuracy", label: "Laser / patient positioning accuracy" },
  { key: "dose_report", label: "Dose report: DAP, CTDIvol, or DLP if required by agency" },
  { key: "external_dosimeter", label: "External dosimeter reading if required" },
  { key: "final_physicist_conclusion", label: "Final medical physicist conclusion" },
];

const ACCEPTANCE_FIELDS = [
  { key: "clinicName", label: "Clinic name / კლინიკა" },
  { key: "deviceModel", label: "Device model" },
  { key: "serialNumber", label: "Serial number" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "softwareVersion", label: "Software version" },
  { key: "phantomType", label: "Phantom type" },
  { key: "standardProtocol", label: "Standard / protocol" },
  { key: "testDate", label: "Test date" },
  { key: "operator", label: "Engineer / operator" },
  { key: "fov", label: "FOV" },
  { key: "voxelSize", label: "Voxel size" },
  { key: "kv", label: "kV" },
  { key: "ma", label: "mA" },
  { key: "exposureTime", label: "Exposure time" },
  { key: "comments", label: "Comments" },
  { key: "engineerSignature", label: "Engineer signature" },
  { key: "clinicSignature", label: "Clinic signature" },
];

const BASELINE_FIELDS = [
  { key: "noisePercent", label: "Baseline noise %", better: "lower" },
  { key: "uniformityPercent", label: "Baseline uniformity %", better: "lower" },
  { key: "cnrAirPmma", label: "Baseline CNR Air/PMMA", better: "higher" },
  { key: "cnrPvcPmma", label: "Baseline CNR PVC/PMMA", better: "higher" },
  { key: "snr", label: "Baseline SNR", better: "higher" },
];

const PHANTOM_PRESETS = {
  quartDvtap: {
    label: "QUART DVTap",
    parameters: [
      "Nyquist Frequency / NF",
      "Contrast-to-Noise Ratio / CNR",
      "Homogeneity / Image Uniformity",
      "Modulation Transfer Function / MTF at 10%",
      "Modulation Transfer Function / MTF at 50%",
      "Artefacts / Image Flaws",
      "Patient/Phantom Positioning Accuracy",
    ],
  },
};

const PLANNED = "Planned / requires validated phantom-specific algorithm";
const MANUAL = "Manual entry required";
const DEMO_SIZE = 512;
const DEMO_EXPECTED = {
  pmmaMean: 1000,
  airMean: 200,
  pvcMean: 1800,
  uniformityPercent: 4,
  noise: "Low",
  snr: "High",
  cnr: "High",
};
const FINSCAN_DISCLAIMER =
  "FinScan F350 Phantom QC is intended for internal service and quality monitoring. It is not a substitute for a validated regulatory acceptance test unless validated with official protocol and local requirements.";

const DICOM_VALIDATION_LABEL_BY_KEY = {
  kvp: "kVp",
  tubeCurrent: "Tube current",
  exposureTime: "Exposure time",
  exposure: "Exposure mAs",
  pixelSpacing: "Pixel spacing",
  sliceThickness: "Slice thickness",
  fov: "FOV",
  manufacturerModelName: "Manufacturer/model",
  manufacturer: "Manufacturer/model",
  deviceSerialNumber: "Device serial number",
  studyDate: "Study/acquisition date",
  acquisitionDate: "Study/acquisition date",
};

const FINSCAN_F350_PROTOCOLS = {
  CBCT: {
    title: "FinScan F350 CBCT Imaging Performance",
    document: "FQC-F-02-001 A.4 sections 4.1.3.1 / 4.3.3.1",
    method: "CBCT phantom / QUART DVTtec workflow",
    criteria: [
      ["X-ray field vs image receptor", "Excess radiation <= 12 mm in one direction and <= 18 mm in both directions", "RaySafe DXR+ / manual"],
      ["Air kerma reproducibility", "3 scans, each value within +/-5% of mean", "Dose meter / manual"],
      ["Voxel geometric accuracy", "Voxel size error within +/-50%", "DICOM pixel spacing + phantom measurement"],
      ["Spatial resolution", "MTF10% >= 1.0 lp/mm; MTF50% >= 0.5 lp/mm", "QUART DVTtec / manual"],
      ["Contrast-to-noise ratio", "CNR >= 2", "QUART DVTtec / manual"],
      ["Acceptance index", "AI >= 100 (mGy*cm2)^-1", "QUART DVTtec / manual"],
      ["Kerma at rotation center", "<= 50 mGy", "Dose meter / manual"],
      ["Homogeneity", "> 5", "QUART DVTtec / manual"],
      ["Focal spot to skin distance", ">= 20 cm", "Manual measurement"],
      ["Total filtration", ">= 2.8 mm Al", "Quality detector / manual"],
      ["Length measurement", "Error within +/-5%", "Phantom marker measurement"],
      ["Angle measurement", "Error within +/-2%", "Phantom marker measurement"],
      ["Artefacts", "No visible artefacts in air image", "Visual"],
      ["Reconstruction time", "General <= 45 s; Fast <= 30 s", "Timer / manual"],
      ["FOV accuracy", "FOV error within +/-10%", "DICOM/phantom measurement"],
    ],
    doseRows: [
      ["General Adult", "12 s", "90 kV", "8 mA", "6.696 mGy", "2360.9 mGy*cm2"],
      ["General Children", "12 s", "90 kV", "6 mA", "5.107 mGy", "1787.0 mGy*cm2"],
      ["Fast Adult", "9 s", "90 kV", "8 mA", "5.008 mGy", "1768.5 mGy*cm2"],
      ["Fast Children", "9 s", "90 kV", "6 mA", "3.815 mGy", "1341.3 mGy*cm2"],
    ],
  },
  PANORAMIC: {
    title: "FinScan F350 Panoramic Imaging Performance",
    document: "FQC-F-02-001 A.4 sections 4.1.3.2 / 4.3.3.2",
    method: "Panoramic dental arch phantom",
    criteria: [
      ["Total filtration", ">= 2.8 mm Al", "Quality detector / manual"],
      ["Focal spot", "0.5", "Tube label / visual"],
      ["Beam limitation and alignment", "Parallel axis <= 1 mm each side; perpendicular axis must not exceed receptor", "Image/manual"],
      ["Radiation output reproducibility", "5 scans, each value within +/-20% of mean", "Dose meter / manual"],
      ["Line pair resolution", "A-E positions all reach >= 2.5 lp/mm", "Visual phantom reading"],
      ["Low contrast resolution", "A-E positions distinguish 1.0 mm hole", "Visual phantom reading"],
      ["Image homogeneity", "H <= 5%", "ROI calculation / manual"],
      ["Panoramic layer", "No unacceptable curve patterns", "Visual"],
      ["Dose indication", "DAP indicated vs measured deviation within +/-50%", "DAP meter / manual"],
      ["Reconstruction time", "Arch <= 60 s; TMJ <= 10 s", "Timer / manual"],
    ],
    doseRows: [
      ["Arch Adult", "14 s", "90 kV", "8 mA", "7.834 mGy", "153.4 mGy*cm2"],
      ["Arch Children", "14 s", "90 kV", "6 mA", "5.970 mGy", "115.4 mGy*cm2"],
      ["TMJ Adult", "6 s", "90 kV", "8 mA", "3.326 mGy", "66.2 mGy*cm2"],
      ["TMJ Children", "6 s", "90 kV", "6 mA", "2.542 mGy", "48.4 mGy*cm2"],
    ],
  },
  CEPHALOMETRIC: {
    title: "FinScan F350 Cephalometric Imaging Performance",
    document: "FQC-F-02-001 A.4 sections 4.1.3.3 / 4.3.3.3",
    method: "Cephalometric phantom / 3-in-1 devices only",
    criteria: [
      ["Total filtration", ">= 2.8 mm Al", "Quality detector / manual"],
      ["Focal spot", "0.5", "Tube label / visual"],
      ["Beam limitation and alignment", "X-ray field equal to or smaller than receptor; image edges clearly visible", "Image/manual"],
      ["Radiation output reproducibility", "5 scans, each value within +/-20% of mean", "Dose meter / manual"],
      ["Line pair resolution", ">= 2.5 lp/mm", "Visual phantom reading"],
      ["Low contrast resolution", "Distinguish 1.0 mm hole", "Visual phantom reading"],
      ["Length measurement", "24 mm circle measurement error within +/-5%", "Image measurement"],
      ["Angle measurement", "90 degree angle error within +/-2 degrees", "Image measurement"],
      ["Dose indication", "DAP indicated vs measured deviation within +/-50%", "DAP meter / manual"],
      ["Focal spot to skin distance", ">= 15 cm", "Manual measurement"],
      ["Reconstruction time", "Lateral <= 15 s; Frontal <= 15 s; Carpus <= 10 s", "Timer / manual"],
    ],
    doseRows: [
      ["Lateral Adult", "8 s", "90 kV", "8 mA", "0.441 mGy", "47.4 mGy*cm2"],
      ["Lateral Children", "8 s", "90 kV", "6 mA", "0.337 mGy", "36.3 mGy*cm2"],
      ["Frontal Adult", "8 s", "90 kV", "8 mA", "0.441 mGy", "47.4 mGy*cm2"],
      ["Frontal Children", "8 s", "90 kV", "6 mA", "0.337 mGy", "36.3 mGy*cm2"],
      ["Carpus Adult", "6 s", "90 kV", "8 mA", "0.338 mGy", "37.4 mGy*cm2"],
      ["Carpus Children", "6 s", "90 kV", "6 mA", "0.260 mGy", "26.8 mGy*cm2"],
    ],
  },
};

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function fixed(value, digits = 2) {
  if (!Number.isFinite(value)) return "N/A";
  return value.toFixed(digits);
}

function csvEscape(value) {
  const text = value === null || value === undefined || value === "" ? "N/A" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function valueText(value) {
  return value === null || value === undefined || value === "" ? "N/A" : String(value);
}

function parsePixelSpacing(value) {
  if (!value) return null;
  const parts = String(value).split("\\").map((item) => Number(item.trim()));
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
  return { row: parts[0], col: parts[1], avg: (parts[0] + parts[1]) / 2 };
}

function statusTone(label) {
  if (label === "OK" || label === "PASS") return "emerald";
  if (label === "WARNING") return "amber";
  if (label === "FAIL") return "rose";
  return "slate";
}

function statusClasses(tone) {
  if (tone === "emerald") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-800";
  if (tone === "rose") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function metricText(value, suffix = "") {
  return Number.isFinite(value) ? `${fixed(value)}${suffix}` : "N/A";
}

function getRoiDefinitions(rows, columns) {
  return [
    { id: "center", name: "Center", label: "Center / ცენტრი", roiType: ROI_TYPES.REFERENCE, material: "PMMA reference", x: columns * 0.5, y: rows * 0.5, enabled: true, diameterPx: 40 },
    { id: "left", name: "Left", label: "Left / მარცხენა", roiType: ROI_TYPES.AIR, material: "Air sample", x: columns * 0.25, y: rows * 0.5, enabled: true, diameterPx: 40 },
    { id: "right", name: "Right", label: "Right / მარჯვენა", roiType: ROI_TYPES.HIGH_DENSITY, material: "PVC/Bone sample", x: columns * 0.75, y: rows * 0.5, enabled: true, diameterPx: 40 },
    { id: "top", name: "Top", label: "Top / ზედა", roiType: ROI_TYPES.HOMOGENEITY_PERIPHERAL, material: "Uniformity sample", x: columns * 0.5, y: rows * 0.25, enabled: true, diameterPx: 40 },
    { id: "bottom", name: "Bottom", label: "Bottom / ქვედა", roiType: ROI_TYPES.HOMOGENEITY_PERIPHERAL, material: "Uniformity sample", x: columns * 0.5, y: rows * 0.75, enabled: true, diameterPx: 40 },
  ];
}

function parseDicomMetadata(dataSet) {
  return {
    rows: numberOrNull(dataSet.uint16("x00280010")),
    columns: numberOrNull(dataSet.uint16("x00280011")),
    bitsAllocated: numberOrNull(dataSet.uint16("x00280100")),
    bitsStored: numberOrNull(dataSet.uint16("x00280101")),
    pixelSpacing: dataSet.string("x00280030") || "",
    kvp: dataSet.string("x00180060") || "",
    exposureTime: dataSet.string("x00181150") || "",
    tubeCurrent: dataSet.string("x00181151") || "",
    exposure: dataSet.string("x00181152") || dataSet.string("x00189332") || "",
    sopClassUid: dataSet.string("x00080016") || "",
    manufacturer: dataSet.string("x00080070") || "",
    manufacturerModelName: dataSet.string("x00081090") || "",
    institutionName: dataSet.string("x00080080") || "",
    stationName: dataSet.string("x00081010") || "",
    deviceSerialNumber: dataSet.string("x00181000") || "",
    protocolName: dataSet.string("x00181030") || "",
    studyDate: dataSet.string("x00080020") || "",
    acquisitionDate: dataSet.string("x00080022") || dataSet.string("x00080023") || "",
    sliceThickness: dataSet.string("x00180050") || "",
    ctdiVol: dataSet.string("x00189345") || "",
    doseLengthProduct: dataSet.string("x00189346") || "",
    modality: dataSet.string("x00080060") || "",
    seriesDescription: dataSet.string("x0008103e") || "",
    softwareVersions: dataSet.string("x00181020") || "",
    fov: dataSet.string("x00180094") || dataSet.string("x00181149") || "",
    voxelSize: dataSet.string("x00189302") || dataSet.string("x00189306") || dataSet.string("x00280030") || "",
    transferSyntax: dataSet.string("x00020010") || "1.2.840.10008.1.2",
    samplesPerPixel: numberOrNull(dataSet.uint16("x00280002")) || 1,
    photometricInterpretation: dataSet.string("x00280004") || "",
    pixelRepresentation: numberOrNull(dataSet.uint16("x00280103")) || 0,
  };
}

function isProjectionDicom(metadata) {
  const modality = String(metadata.modality || "").toUpperCase();
  const description = String(metadata.seriesDescription || "").toLowerCase();
  const sopClassUid = String(metadata.sopClassUid || "");

  return (
    ["CR", "DX", "MG", "SC"].includes(modality) ||
    description.includes("ceph") ||
    sopClassUid === "1.2.840.10008.5.1.4.1.1.1" ||
    sopClassUid === "1.2.840.10008.5.1.4.1.1.1.1"
  );
}

function finScanProtocolKey(image, preset) {
  const metadata = image?.metadata || {};
  const modality = String(metadata.modality || "").toUpperCase();
  const description = String(metadata.seriesDescription || metadata.protocolName || "").toLowerCase();

  if (description.includes("ceph") || description.includes("lateral") || description.includes("frontal") || description.includes("carpus")) {
    return "CEPHALOMETRIC";
  }
  if (description.includes("pano") || description.includes("arch") || description.includes("tmj")) {
    return "PANORAMIC";
  }
  if (modality === "DX" || modality === "CR") {
    return "CEPHALOMETRIC";
  }
  if (preset === PRESETS.FINSCAN_GEOMETRIC || preset === PRESETS.FINSCAN_CALIBRATION || preset === PRESETS.FINSCAN) {
    return "CBCT";
  }
  return "CBCT";
}

function finScanAutoRows(image) {
  const metadata = image?.metadata || {};
  const spacing = parsePixelSpacing(metadata.pixelSpacing);

  return [
    ["Detected model", valueText(metadata.manufacturerModelName || metadata.manufacturer), metadata.manufacturerModelName || metadata.manufacturer ? "DICOM" : "Missing"],
    ["DICOM modality", valueText(metadata.modality), metadata.modality ? "DICOM" : "Missing"],
    ["Series / protocol", valueText(metadata.seriesDescription || metadata.protocolName), metadata.seriesDescription || metadata.protocolName ? "DICOM" : "Missing"],
    ["Image matrix", metadata.rows && metadata.columns ? `${metadata.columns} x ${metadata.rows}` : "N/A", metadata.rows && metadata.columns ? "DICOM" : "Missing"],
    ["Pixel spacing", spacing ? `${fixed(spacing.row, 3)} x ${fixed(spacing.col, 3)} mm` : "N/A", spacing ? "DICOM" : "Missing"],
    ["kV / mA / exposure", [metadata.kvp && `${metadata.kvp} kV`, metadata.tubeCurrent && `${metadata.tubeCurrent} mA`, metadata.exposureTime && `${metadata.exposureTime} ms`].filter(Boolean).join(" / ") || "N/A", metadata.kvp || metadata.tubeCurrent || metadata.exposureTime ? "DICOM" : "Missing"],
    ["Dose tags", [metadata.ctdiVol && `CTDIvol ${metadata.ctdiVol}`, metadata.doseLengthProduct && `DLP ${metadata.doseLengthProduct}`, metadata.exposure && `Exposure ${metadata.exposure}`].filter(Boolean).join(" / ") || "N/A", metadata.ctdiVol || metadata.doseLengthProduct || metadata.exposure ? "DICOM" : "Manual meter required"],
  ];
}

function extractPixelData(dataSet, metadata) {
  const pixelElement = dataSet.elements.x7fe00010;

  if (!pixelElement) {
    throw new Error("No pixel data found in this DICOM file.");
  }

  if (!SUPPORTED_TRANSFER_SYNTAXES.has(metadata.transferSyntax)) {
    throw new Error(
      `DICOM pixel data is compressed or unsupported for this MVP. Transfer Syntax: ${metadata.transferSyntax}`,
    );
  }

  if (!metadata.rows || !metadata.columns) {
    throw new Error("Required image dimensions are missing from metadata.");
  }

  if (metadata.samplesPerPixel !== 1) {
    throw new Error("Only single-channel grayscale DICOM pixel data is supported in this MVP.");
  }

  if (metadata.bitsAllocated !== 8 && metadata.bitsAllocated !== 16) {
    throw new Error(`Unsupported Bits Allocated value: ${metadata.bitsAllocated || "missing"}.`);
  }

  const pixelCount = metadata.rows * metadata.columns;
  const bytesPerPixel = metadata.bitsAllocated / 8;
  const expectedBytes = pixelCount * bytesPerPixel;
  const availableBytes = pixelElement.length || 0;

  if (availableBytes < expectedBytes) {
    throw new Error("Pixel data is shorter than expected for the reported rows and columns.");
  }

  const byteArray = dataSet.byteArray;
  const start = pixelElement.dataOffset;
  const values = new Float32Array(pixelCount);
  let min = Infinity;
  let max = -Infinity;

  // DICOM pixel decode: MVP support for uncompressed 8-bit and 16-bit grayscale images.
  if (metadata.bitsAllocated === 8) {
    for (let index = 0; index < pixelCount; index += 1) {
      const value = byteArray[start + index];
      values[index] = value;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  } else {
    const littleEndian = metadata.transferSyntax !== "1.2.840.10008.1.2.2";
    const view = new DataView(byteArray.buffer, byteArray.byteOffset + start, expectedBytes);

    for (let index = 0; index < pixelCount; index += 1) {
      const offset = index * 2;
      const value =
        metadata.pixelRepresentation === 1
          ? view.getInt16(offset, littleEndian)
          : view.getUint16(offset, littleEndian);
      values[index] = value;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }

  return { values, min, max };
}

function calculateRois(image, diameter, roiCenters) {
  if (!image) return [];

  const defaults = getRoiDefinitions(image.metadata.rows, image.metadata.columns);
  const centersByName = new Map((roiCenters || []).map((roi) => [roi.id || roi.name, roi]));
  const definitions = defaults.map((roi) => {
    const custom = centersByName.get(roi.id || roi.name);
    return custom ? { ...roi, ...custom } : roi;
  });

  // ROI analysis: circular samples shared by Acceptance Test and QC workflows.
  return definitions.map((roi) => {
    if (!roi.enabled) {
      return { ...roi, count: 0, mean: NaN, stdDev: NaN, min: NaN, max: NaN };
    }
    const radius = Math.max(2, (Number(roi.diameterPx) || diameter) / 2);
    const radiusSquared = radius * radius;
    const minX = Math.max(0, Math.floor(roi.x - radius));
    const maxX = Math.min(image.metadata.columns - 1, Math.ceil(roi.x + radius));
    const minY = Math.max(0, Math.floor(roi.y - radius));
    const maxY = Math.min(image.metadata.rows - 1, Math.ceil(roi.y + radius));
    let count = 0;
    let sum = 0;
    let sumSquares = 0;
    let min = Infinity;
    let max = -Infinity;

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = x + 0.5 - roi.x;
        const dy = y + 0.5 - roi.y;
        if (dx * dx + dy * dy <= radiusSquared) {
          const value = image.values[y * image.metadata.columns + x];
          count += 1;
          sum += value;
          sumSquares += value * value;
          if (value < min) min = value;
          if (value > max) max = value;
        }
      }
    }

    const mean = count > 0 ? sum / count : 0;
    const variance = count > 1 ? Math.max(0, sumSquares / count - mean * mean) : 0;

    return {
      ...roi,
      radiusPx: radius,
      count,
      mean,
      stdDev: Math.sqrt(variance),
      min: count > 0 ? min : 0,
      max: count > 0 ? max : 0,
    };
  });
}

function cnrBetween(a, b) {
  if (!a || !b) return null;
  const pooledNoise = Math.sqrt((a.stdDev * a.stdDev + b.stdDev * b.stdDev) / 2);
  if (!pooledNoise) return null;
  return Math.abs(a.mean - b.mean) / pooledNoise;
}

function buildMeasurements(rois) {
  const enabled = rois.filter((roi) => roi.enabled && Number.isFinite(roi.mean));
  const reference = enabled.find((roi) => roi.roiType === ROI_TYPES.REFERENCE) || enabled.find((roi) => roi.name === "Center");
  const air = enabled.find((roi) => roi.roiType === ROI_TYPES.AIR) || enabled.find((roi) => roi.name === "Left");
  const highDensity = enabled.find((roi) => roi.roiType === ROI_TYPES.HIGH_DENSITY) || enabled.find((roi) => roi.name === "Right");
  const homogeneityCenter =
    enabled.find((roi) => roi.roiType === ROI_TYPES.HOMOGENEITY_CENTER) || reference;
  const homogeneityPeripheral = enabled.filter((roi) => roi.roiType === ROI_TYPES.HOMOGENEITY_PERIPHERAL);

  if (!reference || !Number.isFinite(reference.mean) || !Number.isFinite(reference.stdDev) || reference.mean === 0) {
    return { values: null, warnings: ["Reference ROI missing. Assign one ROI as 'Reference material / PMMA / Soft tissue'."] };
  }

  const peripheralMeans = homogeneityPeripheral
    .map((roi) => roi.mean)
    .filter((value) => Number.isFinite(value));
  const maxPeripheral = peripheralMeans.length ? Math.max(...peripheralMeans) : NaN;
  const minPeripheral = peripheralMeans.length ? Math.min(...peripheralMeans) : NaN;

  const warnings = [];
  if (!enabled.find((roi) => roi.roiType === ROI_TYPES.REFERENCE)) {
    warnings.push("Reference ROI type not set. Center ROI used as fallback reference.");
  }

  return {
    values: {
      noise: reference.stdDev,
      noisePercent: (reference.stdDev / reference.mean) * 100,
      uniformityPercent:
        Number.isFinite(homogeneityCenter?.mean) &&
        homogeneityCenter.mean !== 0 &&
        Number.isFinite(maxPeripheral) &&
        Number.isFinite(minPeripheral)
          ? ((maxPeripheral - minPeripheral) / homogeneityCenter.mean) * 100
          : NaN,
      snr: reference.mean / reference.stdDev,
      cnrAirPmma: cnrBetween(air, reference),
      cnrPvcPmma: cnrBetween(highDensity, reference),
      referenceName: reference.name,
    },
    warnings,
  };
}

function randomNormal(mean, stdDev) {
  const u1 = Math.max(Math.random(), 1e-12);
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

function buildDemoPhantomImage() {
  const rows = DEMO_SIZE;
  const columns = DEMO_SIZE;
  const values = new Float32Array(rows * columns);
  const cx = columns / 2;
  const cy = rows / 2;
  const mainRadius = 188;
  const airCx = cx - 112;
  const pvcCx = cx + 112;
  const insertCy = cy;
  const insertRadius = 44;
  let min = Infinity;
  let max = -Infinity;

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const idx = y * columns + x;
      const dx = x - cx;
      const dy = y - cy;
      const r2 = dx * dx + dy * dy;
      let value = 1000;

      if (r2 > mainRadius * mainRadius) {
        value = randomNormal(1000, 18);
      } else {
        value = randomNormal(1000, 12);
      }

      const dxAir = x - airCx;
      const dyAir = y - insertCy;
      if (dxAir * dxAir + dyAir * dyAir <= insertRadius * insertRadius) {
        value = randomNormal(200, 10);
      }

      const dxPvc = x - pvcCx;
      const dyPvc = y - insertCy;
      if (dxPvc * dxPvc + dyPvc * dyPvc <= insertRadius * insertRadius) {
        value = randomNormal(1800, 14);
      }

      const peripheralBias =
        dy < -90 ? 18 : dy > 90 ? -16 : dx < -90 ? -8 : dx > 90 ? 10 : 0;
      value += peripheralBias;

      values[idx] = value;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }

  return {
    values,
    min,
    max,
    metadata: {
      rows,
      columns,
      bitsAllocated: 16,
      bitsStored: 16,
      pixelSpacing: "0.25\\0.25",
      kvp: "90",
      exposureTime: "1000",
      tubeCurrent: "8",
      manufacturer: "Demo Generator",
      modality: "CT",
      seriesDescription: "Synthetic CBCT QA Phantom",
      softwareVersions: "MVP Demo",
      fov: "80x80",
      voxelSize: "0.2",
      transferSyntax: "1.2.840.10008.1.2.1",
      samplesPerPixel: 1,
      photometricInterpretation: "MONOCHROME2",
      pixelRepresentation: 0,
    },
  };
}

function acceptanceStatus(measurements) {
  if (!measurements) return { label: "WAITING", tone: "slate" };
  if (measurements.uniformityPercent <= 10 && measurements.noisePercent <= 10) {
    return { label: "PASS", tone: "emerald" };
  }
  if (measurements.uniformityPercent <= 15 || measurements.noisePercent <= 15) {
    return { label: "WARNING", tone: "amber" };
  }
  return { label: "FAIL", tone: "rose" };
}

function deviationPercent(current, baseline) {
  if (!Number.isFinite(current) || !Number.isFinite(baseline) || baseline === 0) return null;
  return ((current - baseline) / baseline) * 100;
}

function buildQcRows(measurements, baseline) {
  if (!measurements) return [];

  return BASELINE_FIELDS.map((field) => {
    const current = measurements[field.key];
    const base = numberOrNull(baseline[field.key]);
    const deviation = deviationPercent(current, base);
    const absoluteDeviation = Math.abs(deviation ?? Infinity);
    let status = "WAITING";

    if (Number.isFinite(deviation)) {
      if (absoluteDeviation <= 10) status = "OK";
      else if (absoluteDeviation <= 20) status = "WARNING";
      else status = "FAIL";
    }

    const negativeTrend =
      Number.isFinite(deviation) &&
      ((field.better === "lower" && deviation > 0) || (field.better === "higher" && deviation < 0));

    return {
      ...field,
      current,
      baseline: base,
      deviation,
      status,
      trend: Number.isFinite(deviation)
        ? negativeTrend
          ? "Negative trend"
          : "Stable or favorable"
        : "Baseline required",
    };
  });
}

function qcStatus(rows) {
  if (!rows.length || rows.some((row) => row.status === "WAITING")) return { label: "WAITING", tone: "slate" };
  if (rows.some((row) => row.status === "FAIL")) return { label: "FAIL", tone: "rose" };
  if (rows.some((row) => row.status === "WARNING")) return { label: "WARNING", tone: "amber" };
  return { label: "OK", tone: "emerald" };
}

function maxGeometryError(geometryRows) {
  const values = geometryRows
    .map((row) => Math.abs(row.errorPercent))
    .filter((value) => Number.isFinite(value));
  if (!values.length) return null;
  return Math.max(...values);
}

function agencyProtocolRows({ image, rois, measurements, acceptanceForm, status, geometryRows, manualValues, dicomValidation }) {
  const metadata = image?.metadata || {};
  const validationByLabel = new Map((dicomValidation?.checks || []).map((check) => [check.key, check]));
  const center = rois.find((roi) => roi.name === "Center");
  const left = rois.find((roi) => roi.name === "Left");
  const right = rois.find((roi) => roi.name === "Right");
  const doseIndex =
    metadata.ctdiVol || metadata.doseLengthProduct
      ? [metadata.ctdiVol ? `CTDIvol ${metadata.ctdiVol}` : "", metadata.doseLengthProduct ? `DLP ${metadata.doseLengthProduct}` : ""]
          .filter(Boolean)
          .join(" / ")
      : "";
  const rows = AGENCY_METADATA_FIELDS.map((field) => {
    const formValue =
      field.key === "manufacturerModelName"
        ? acceptanceForm.deviceModel
        : field.key === "deviceSerialNumber"
          ? acceptanceForm.serialNumber
          : "";
    const value = metadata[field.key] || formValue || "";
    const validation = validationByLabel.get(DICOM_VALIDATION_LABEL_BY_KEY[field.key]);
    if (validation && validation.status !== "READY" && validation.status !== "OPTIONAL") {
      return {
        label: field.label,
        value: validation.display,
        source: "DICOM validation",
        status: validation.status,
      };
    }
    return {
      label: field.label,
      value: value || "N/A",
      source: value ? "DICOM / form" : "Manual",
      status: value ? "READY" : "MISSING",
    };
  });

  const calculated = [
    { label: "Center ROI mean gray value", value: metricText(center?.mean), source: "CBCT phantom ROI" },
    { label: "Air-equivalent ROI mean", value: metricText(left?.mean), source: "CBCT phantom ROI" },
    { label: "High-density ROI mean", value: metricText(right?.mean), source: "CBCT phantom ROI" },
    { label: "Image noise", value: metricText(measurements?.noise), source: "CBCT phantom ROI" },
    { label: "Noise %", value: metricText(measurements?.noisePercent, "%"), source: "CBCT phantom ROI" },
    { label: "Uniformity / homogeneity %", value: metricText(measurements?.uniformityPercent, "%"), source: "CBCT phantom ROI" },
    { label: "SNR", value: metricText(measurements?.snr), source: "CBCT phantom ROI" },
    { label: "CNR Air/PMMA", value: metricText(measurements?.cnrAirPmma), source: "CBCT phantom ROI" },
    { label: "CNR high-density/PMMA", value: metricText(measurements?.cnrPvcPmma), source: "CBCT phantom ROI" },
    { label: "Geometric error max %", value: metricText(maxGeometryError(geometryRows), "%"), source: "Marker pairs" },
    { label: "Dose index from DICOM, optional", value: doseIndex || "N/A", source: "DICOM dose tags" },
    { label: "Provisional software status", value: status?.label || "WAITING", source: "Calculated" },
  ].map((row) => ({
    ...row,
    status: row.value === "N/A" || row.value === "-Infinity%" ? "MISSING" : "READY",
  }));

  const manual = AGENCY_MANUAL_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    value: manualValues?.[field.key] || "Manual entry required",
    source: "Physicist / test device",
    status: manualValues?.[field.key] ? "READY" : "MANUAL",
  }));

  return [...rows, ...calculated, ...manual];
}

function createRowsForCsv({
  mode,
  imageType,
  preset,
  finscanSubmode,
  fileName,
  image,
  rois,
  measurements,
  acceptanceForm,
  baseline,
  agencyManualValues,
  qcRows,
  status,
  geometryRows,
  strictDecision,
  dicomValidation,
}) {
  const metadataRows = METADATA_FIELDS.map((field) => [field.label, image?.metadata?.[field.key] || "N/A"]);
  const agencyRows = agencyProtocolRows({
    image,
    rois,
    measurements,
    acceptanceForm,
    status,
    geometryRows,
    manualValues: agencyManualValues,
    dicomValidation,
  });
  const roiRows = rois.map((roi) => [
    roi.label,
    roi.material,
    roi.count,
    fixed(roi.mean),
    fixed(roi.stdDev),
    fixed(roi.min),
    fixed(roi.max),
  ]);

  const baseRows = [
    ["CBCT QA Analyzer"],
    ["Test image type", imageType === IMAGE_TYPES.PHANTOM ? "Phantom DICOM / QA analysis" : "Patient DICOM / technical preview only"],
    [
      "Mode",
      mode === MODES.ACCEPTANCE
        ? "Acceptance Test"
        : mode === MODES.QC
          ? "Quality Control / Constancy Test"
          : "Technical Preview / Patient DICOM",
    ],
    [
      "Preset",
      (preset === PRESETS.FINSCAN || preset === PRESETS.FINSCAN_CALIBRATION || preset === PRESETS.FINSCAN_GEOMETRIC)
        ? "FinScan F350 Phantom QC"
        : preset === PRESETS.QUART
          ? "QUART DVTap / DIN 6868-161"
          : preset === PRESETS.GENERIC
            ? "Generic CBCT Phantom QA"
            : preset === PRESETS.CUSTOM
              ? "Custom Phantom"
            : "Patient DICOM / Technical preview only",
    ],
    ["File", fileName],
    ["Report generation timestamp", new Date().toISOString()],
    ["Final decision", strictDecision?.label || status?.label || "INCOMPLETE"],
    ["Phantom preset", PHANTOM_PRESETS.quartDvtap.label],
    [],
    ["Final decision details"],
    ["Category", "Issue"],
    ...(strictDecision?.failures || []).map((item) => ["FAIL", item]),
    ...(strictDecision?.incomplete || []).map((item) => ["INCOMPLETE", item]),
    ...(strictDecision?.failures?.length || strictDecision?.incomplete?.length ? [] : [["PASS", "All required automated and manual checks completed."]]),
    [],
    ["Data consistency validation"],
    ["Severity", "Message"],
    ...((strictDecision?.consistencyIssues || []).length
      ? strictDecision.consistencyIssues.map((issue) => [issue.severity, issue.message])
      : [["PASS", "No blocking consistency conflicts detected."]]),
    [],
    ["DICOM validation"],
    ["Field", "Status", "Value", "Reason"],
    ...(strictDecision?.dicomChecks || []).map((check) => [check.key, check.status, check.display, check.reason || ""]),
    [],
    ["DICOM metadata"],
    ["Field", "Value"],
    ...metadataRows,
    [],
    ["Agency CBCT protocol checklist"],
    ["Parameter", "Value", "Source", "Status"],
    ...agencyRows.map((row) => [row.label, row.value, row.source, row.status]),
    [],
    ["ROI results"],
    ["ROI", "Material role", "Pixel count", "Mean", "StdDev", "Min", "Max"],
    ...roiRows,
    [],
  ];

  if (preset === PRESETS.FINSCAN || preset === PRESETS.FINSCAN_CALIBRATION || preset === PRESETS.FINSCAN_GEOMETRIC) {
    return [
      ...baseRows,
      [
        "FinScan sub-mode",
        finscanSubmode === FINSCAN_SUBMODES.GEOMETRIC
          ? "FinScan Geometric Calibration Phantom"
          : "FinScan Calibration / Uniformity Phantom",
      ],
      ["Device model", acceptanceForm.deviceModel || "FinScan F350"],
      ["Serial number", acceptanceForm.serialNumber || "N/A"],
      ["Phantom type", acceptanceForm.phantomType || "FinScan phantom"],
      ["FOV", valueText(image?.metadata?.fov)],
      ["Pixel spacing", valueText(image?.metadata?.pixelSpacing)],
      [],
      ["Known and measured distances"],
      ["Pair", "Known mm", "Measured mm", "Geometric error %", "X offset px", "Y offset px", "Status"],
      ...geometryRows.map((row, idx) => [
        `Pair ${idx + 1}`,
        metricText(row.knownMm),
        metricText(row.measuredMm),
        metricText(row.errorPercent, "%"),
        metricText(row.offsetX),
        metricText(row.offsetY),
        row.status,
      ]),
      [],
      ["ROI results"],
      ["Noise %", metricText(measurements?.noisePercent, "%")],
      ["SNR", metricText(measurements?.snr)],
      ["Uniformity %", metricText(measurements?.uniformityPercent, "%")],
      ["Status", status.label],
      [],
      ["Disclaimer", FINSCAN_DISCLAIMER],
    ];
  }

  if (mode === MODES.ACCEPTANCE) {
    return [
      ...baseRows,
      ["Acceptance report fields"],
      ["Field", "Value"],
      ...ACCEPTANCE_FIELDS.map((field) => [field.label, acceptanceForm[field.key] || "N/A"]),
      [],
      ["Calculated parameters"],
      ["Patient/Phantom Positioning Accuracy", MANUAL],
      ["Homogeneity / Image Uniformity", metricText(measurements?.uniformityPercent, "%")],
      ["Contrast-to-Noise Ratio / CNR Air vs PMMA", metricText(measurements?.cnrAirPmma)],
      ["Contrast-to-Noise Ratio / CNR PVC/Bone vs PMMA", metricText(measurements?.cnrPvcPmma)],
      ["Noise", metricText(measurements?.noise)],
      ["Noise %", metricText(measurements?.noisePercent, "%")],
      ["SNR", metricText(measurements?.snr)],
      ["Nyquist Frequency / NF", PLANNED],
      ["MTF at 10%", PLANNED],
      ["MTF at 50%", PLANNED],
      ["Artefacts / Image Flaws", MANUAL],
      [
        "Demo Acceptance Indicator / Figure of Merit",
        imageType === IMAGE_TYPES.PHANTOM ? status.label : "Not applicable for patient DICOM",
      ],
      ["Provisional status", imageType === IMAGE_TYPES.PHANTOM ? status.label : "Not applicable for patient DICOM"],
      [],
      ["Signature fields"],
      ["Engineer / operator", acceptanceForm.engineerSignature || ""],
      ["Clinic representative", acceptanceForm.clinicSignature || ""],
      [],
      ["Disclaimer", DISCLAIMER],
      imageType === IMAGE_TYPES.PATIENT
        ? ["Technical note", "Technical preview only - patient DICOM cannot be used for phantom-based QA scoring."]
        : [],
    ];
  }

  return [
    ...baseRows,
    ["Current measurements"],
    ["Metric", "Value"],
    ["Noise %", metricText(measurements?.noisePercent, "%")],
    ["Uniformity %", metricText(measurements?.uniformityPercent, "%")],
    ["CNR Air/PMMA", metricText(measurements?.cnrAirPmma)],
    ["CNR PVC/PMMA", metricText(measurements?.cnrPvcPmma)],
    ["SNR", metricText(measurements?.snr)],
    [],
    ["Baseline measurements and deviation"],
    ["Metric", "Current", "Baseline", "Deviation %", "QC status", "Trend interpretation"],
    ...qcRows.map((row) => [
      row.label,
      metricText(row.current),
      metricText(row.baseline),
      metricText(row.deviation, "%"),
      row.status,
      row.trend,
    ]),
    ["Overall QC status", imageType === IMAGE_TYPES.PHANTOM ? status.label : "Not applicable for patient DICOM"],
    [],
    ["Disclaimer", DISCLAIMER],
    imageType === IMAGE_TYPES.PATIENT
      ? ["Technical note", "Technical preview only - patient DICOM cannot be used for phantom-based QA scoring."]
      : [],
  ];
}

function TextField({ field, value, onChange }) {
  const isLong = field.key === "comments";
  return (
    <label className={isLong ? "md:col-span-2" : ""}>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{field.label}</span>
      {isLong ? (
        <textarea
          value={value}
          onChange={(event) => onChange(field.key, event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(field.key, event.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
        />
      )}
    </label>
  );
}

export default function CbctQaPage() {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState(MODES.ACCEPTANCE);
  const [image, setImage] = useState(null);
  const [fileName, setFileName] = useState("");
  const [roiDiameter, setRoiDiameter] = useState(40);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isDemoImage, setIsDemoImage] = useState(false);
  const [imageType, setImageType] = useState(IMAGE_TYPES.PHANTOM);
  const [preset, setPreset] = useState(PRESETS.QUART);
  const [finscanSubmode, setFinscanSubmode] = useState(FINSCAN_SUBMODES.GEOMETRIC);
  const [roiCenters, setRoiCenters] = useState([]);
  const [finscanThresholds, setFinscanThresholds] = useState({ ok: 1, warning: 2 });
  const [finscanBaselineError, setFinscanBaselineError] = useState("");
  const [activeMarkerPick, setActiveMarkerPick] = useState(null);
  const [geometryPairs, setGeometryPairs] = useState([
    { knownMm: "50", p1x: "", p1y: "", p2x: "", p2y: "" },
  ]);
  const [acceptanceForm, setAcceptanceForm] = useState({
    clinicName: "",
    deviceModel: "",
    serialNumber: "",
    manufacturer: "",
    softwareVersion: "",
    phantomType: PHANTOM_PRESETS.quartDvtap.label,
    standardProtocol: "",
    testDate: new Date().toISOString().slice(0, 10),
    operator: "",
    fov: "",
    voxelSize: "",
    kv: "",
    ma: "",
    exposureTime: "",
    comments: "",
    engineerSignature: "",
    clinicSignature: "",
  });
  const [baseline, setBaseline] = useState({
    noisePercent: "",
    uniformityPercent: "",
    cnrAirPmma: "",
    cnrPvcPmma: "",
    snr: "",
  });
  const [agencyManualValues, setAgencyManualValues] = useState(
    Object.fromEntries(AGENCY_MANUAL_FIELDS.map((field) => [field.key, ""])),
  );
  const isFinScanCalibration = preset === PRESETS.FINSCAN_CALIBRATION || (preset === PRESETS.FINSCAN && finscanSubmode === FINSCAN_SUBMODES.UNIFORMITY);
  const isFinScanGeometric = preset === PRESETS.FINSCAN_GEOMETRIC || (preset === PRESETS.FINSCAN && finscanSubmode === FINSCAN_SUBMODES.GEOMETRIC);
  const isPatientPreset = preset === PRESETS.PATIENT || mode === MODES.PREVIEW;

  const rois = useMemo(() => calculateRois(image, roiDiameter, roiCenters), [image, roiDiameter, roiCenters]);
  const measurementBundle = useMemo(() => buildMeasurements(rois), [rois]);
  const measurements = measurementBundle.values;
  const measurementWarnings = measurementBundle.warnings || [];
  const dicomValidation = useMemo(() => buildDicomValidation(image?.metadata || {}), [image]);
  const pixelSpacing = useMemo(() => parsePixelSpacing(image?.metadata?.pixelSpacing), [image]);
  const geometryRows = useMemo(() => {
    return geometryPairs.map((pair) => {
      const knownMm = Number(pair.knownMm);
      const p1x = Number(pair.p1x);
      const p1y = Number(pair.p1y);
      const p2x = Number(pair.p2x);
      const p2y = Number(pair.p2y);
      const valid =
        Number.isFinite(knownMm) &&
        knownMm > 0 &&
        Number.isFinite(p1x) &&
        Number.isFinite(p1y) &&
        Number.isFinite(p2x) &&
        Number.isFinite(p2y) &&
        pixelSpacing?.avg;
      if (!valid) {
        return { knownMm, measuredMm: null, errorPercent: null, offsetX: null, offsetY: null, status: "WAITING" };
      }
      const dx = p2x - p1x;
      const dy = p2y - p1y;
      const measuredMm = Math.sqrt(dx * dx + dy * dy) * pixelSpacing.avg;
      const errorPercent = ((measuredMm - knownMm) / knownMm) * 100;
      const midX = (p1x + p2x) / 2;
      const midY = (p1y + p2y) / 2;
      const offsetX = image ? midX - image.metadata.columns / 2 : null;
      const offsetY = image ? midY - image.metadata.rows / 2 : null;
      const absError = Math.abs(errorPercent);
      const okT = Number(finscanThresholds.ok) || 1;
      const warnT = Number(finscanThresholds.warning) || 2;
      const status = absError <= okT ? "OK" : absError <= warnT ? "WARNING" : "FAIL";
      return { knownMm, measuredMm, errorPercent, offsetX, offsetY, status };
    });
  }, [finscanThresholds.ok, finscanThresholds.warning, geometryPairs, image, pixelSpacing]);
  const finscanStatus = useMemo(() => {
    if (!isFinScanGeometric) {
      return acceptanceStatus(measurements);
    }
    const scored = geometryRows.filter((row) => row.status !== "WAITING");
    if (!scored.length) return { label: "WAITING", tone: "slate" };
    if (scored.some((row) => row.status === "FAIL")) return { label: "FAIL", tone: "rose" };
    if (scored.some((row) => row.status === "WARNING")) return { label: "WARNING", tone: "amber" };
    return { label: "OK", tone: "emerald" };
  }, [geometryRows, isFinScanGeometric, measurements]);
  const acceptance = imageType === IMAGE_TYPES.PHANTOM
    ? (isFinScanCalibration || isFinScanGeometric)
      ? finscanStatus
      : acceptanceStatus(measurements)
    : { label: "Not applicable for patient DICOM", tone: "slate" };
  const qcRows = useMemo(() => buildQcRows(measurements, baseline), [baseline, measurements]);
  const qc = imageType === IMAGE_TYPES.PHANTOM ? qcStatus(qcRows) : { label: "Not applicable for patient DICOM", tone: "slate" };
  const strictDecision = useMemo(
    () =>
      buildStrictDecision({
        imageType,
        mode,
        preset,
        metadata: image?.metadata || {},
        measurements,
        geometryRows,
        acceptanceForm,
        manualValues: agencyManualValues,
      }),
    [acceptanceForm, agencyManualValues, geometryRows, image, imageType, measurements, mode, preset],
  );
  const activeStatus =
    image ? strictDecision : mode === MODES.QC ? qc : acceptance;
  const agencyRows = useMemo(
    () =>
      agencyProtocolRows({
        image,
        rois,
        measurements,
        acceptanceForm,
        status: activeStatus,
        geometryRows,
        manualValues: agencyManualValues,
        dicomValidation,
      }),
    [acceptanceForm, activeStatus, agencyManualValues, dicomValidation, geometryRows, image, measurements, rois],
  );
  const finScanProtocolKeyValue = useMemo(() => finScanProtocolKey(image, preset), [image, preset]);
  const finScanProtocol = FINSCAN_F350_PROTOCOLS[finScanProtocolKeyValue];
  const finScanAutoValues = useMemo(() => finScanAutoRows(image), [image]);
  const dicomCheckByLabel = useMemo(
    () => new Map((dicomValidation?.checks || []).map((check) => [check.key, check])),
    [dicomValidation],
  );
  const metadataDisplayRows = useMemo(
    () =>
      METADATA_FIELDS.map((field) => {
        const check = dicomCheckByLabel.get(DICOM_VALIDATION_LABEL_BY_KEY[field.key]);
        if (check && check.status !== "READY" && check.status !== "OPTIONAL") {
          return { ...field, display: check.display, status: check.status };
        }
        return { ...field, display: image?.metadata?.[field.key] || "N/A", status: image?.metadata?.[field.key] ? "READY" : "MISSING" };
      }),
    [dicomCheckByLabel, image],
  );

  const missingMetadata = useMemo(() => {
    if (!image) return [];
    return METADATA_FIELDS.filter((field) => {
      const value = image.metadata[field.key];
      return value === "" || value === null || value === undefined;
    }).map((field) => field.label);
  }, [image]);

  useEffect(() => {
    if (preset === PRESETS.FINSCAN_CALIBRATION) setFinscanSubmode(FINSCAN_SUBMODES.UNIFORMITY);
    if (preset === PRESETS.FINSCAN_GEOMETRIC) setFinscanSubmode(FINSCAN_SUBMODES.GEOMETRIC);
  }, [preset]);

  useEffect(() => {
    if (isPatientPreset) setImageType(IMAGE_TYPES.PATIENT);
  }, [isPatientPreset]);

  useEffect(() => {
    if (mode === MODES.PREVIEW && imageType !== IMAGE_TYPES.PATIENT) {
      setImageType(IMAGE_TYPES.PATIENT);
    }
  }, [imageType, mode]);

  useEffect(() => {
    if (!image) return;
    setRoiCenters(getRoiDefinitions(image.metadata.rows, image.metadata.columns));
    setAcceptanceForm((current) => ({
      ...current,
      manufacturer: current.manufacturer || image.metadata.manufacturer || "",
      deviceModel: current.deviceModel || image.metadata.manufacturerModelName || "",
      serialNumber: current.serialNumber || image.metadata.deviceSerialNumber || "",
      standardProtocol: current.standardProtocol || image.metadata.protocolName || image.metadata.seriesDescription || "",
      softwareVersion: current.softwareVersion || image.metadata.softwareVersions || "",
      fov: current.fov || image.metadata.fov || "",
      voxelSize: current.voxelSize || image.metadata.voxelSize || "",
      kv: current.kv || image.metadata.kvp || "",
      ma: current.ma || image.metadata.tubeCurrent || "",
      exposureTime: current.exposureTime || image.metadata.exposureTime || "",
    }));
  }, [image]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const { rows, columns, photometricInterpretation } = image.metadata;
    const context = canvas.getContext("2d");
    const imageData = context.createImageData(columns, rows);
    const range = image.max - image.min || 1;
    const invert = photometricInterpretation.toUpperCase() === "MONOCHROME1";

    canvas.width = columns;
    canvas.height = rows;

    for (let index = 0; index < image.values.length; index += 1) {
      let normalized = Math.round(((image.values[index] - image.min) / range) * 255);
      if (invert) normalized = 255 - normalized;
      const dataIndex = index * 4;
      imageData.data[dataIndex] = normalized;
      imageData.data[dataIndex + 1] = normalized;
      imageData.data[dataIndex + 2] = normalized;
      imageData.data[dataIndex + 3] = 255;
    }

    context.putImageData(imageData, 0, 0);
    context.lineWidth = Math.max(2, Math.round(Math.min(rows, columns) / 220));
    context.strokeStyle = "#22d3ee";
    context.fillStyle = "#ecfeff";
    context.font = `${Math.max(12, Math.round(Math.min(rows, columns) / 34))}px sans-serif`;
    context.textBaseline = "middle";

    rois.forEach((roi) => {
      if (!roi.enabled) return;
      const diameter = Number(roi.diameterPx) || roiDiameter;
      context.beginPath();
      context.arc(roi.x, roi.y, diameter / 2, 0, Math.PI * 2);
      context.stroke();
      context.fillText(roi.name, roi.x + diameter / 2 + 6, roi.y);
    });
  }, [image, roiDiameter, rois]);

  const updateAcceptanceField = useCallback((key, value) => {
    setAcceptanceForm((current) => ({ ...current, [key]: value }));
  }, []);

  const updateBaselineField = useCallback((key, value) => {
    setBaseline((current) => ({ ...current, [key]: value }));
  }, []);

  const runDemoPhantomTest = useCallback(() => {
    setError("");
    setWarnings([]);
    setIsDemoImage(true);
    setFileName("Demo Phantom Test (synthetic 512x512)");
    setImageType(IMAGE_TYPES.PHANTOM);
    setImage(buildDemoPhantomImage());
  }, []);

  const processFile = useCallback(async (file) => {
    if (!file) return;

    setIsReading(true);
    setError("");
    setWarnings([]);
    setIsDemoImage(false);
    setFileName(file.name || "Extensionless DICOM file");

    try {
      const buffer = await file.arrayBuffer();
      const byteArray = new Uint8Array(buffer);
      const dataSet = dicomParser.parseDicom(byteArray);
      const metadata = parseDicomMetadata(dataSet);
      const spacing = parsePixelSpacing(metadata.pixelSpacing);
      if (spacing?.row && spacing?.col && metadata.sliceThickness) {
        const slice = Number(metadata.sliceThickness);
        if (Number.isFinite(slice)) {
          metadata.voxelSize = `${fixed(spacing.row, 3)} x ${fixed(spacing.col, 3)} x ${fixed(slice, 3)} mm`;
        }
      }
      const pixelData = extractPixelData(dataSet, metadata);
      const nextWarnings = [];
      const validation = buildDicomValidation(metadata);

      if (!metadata.rows || !metadata.columns) nextWarnings.push("Rows or Columns metadata is missing.");
      if (!metadata.bitsAllocated || !metadata.bitsStored) nextWarnings.push("Bit depth metadata is incomplete.");
      if (!metadata.pixelSpacing) nextWarnings.push("Pixel Spacing is missing.");
      if (metadata.pixelSpacing && !metadata.sliceThickness) nextWarnings.push("Voxel size incomplete - slice thickness missing.");
      validation.invalid.forEach((check) => nextWarnings.push(check.reason));
      validation.missing.forEach((check) => nextWarnings.push(check.reason));
      if (
        String(metadata.manufacturer || "").toLowerCase().includes("varian") ||
        String(metadata.seriesDescription || "").toLowerCase().includes("pelvis") ||
        String(metadata.modality || "").toUpperCase() === "CT"
      ) {
        nextWarnings.push(
          "This appears to be a CT or iCBCT-style dataset, not a standard dental CBCT DVTap phantom scan. Use for technical testing only unless the correct CBCT phantom preset and protocol are selected.",
        );
      }
      if (isProjectionDicom(metadata)) {
        setMode(MODES.PREVIEW);
        setImageType(IMAGE_TYPES.PATIENT);
        nextWarnings.push(
          "This file is a 2D projection image (DX / Lateral Ceph), not a CBCT phantom volume. It was loaded in Technical Preview mode; phantom QA scoring is disabled.",
        );
      }

      setWarnings(nextWarnings);
      setImage({ metadata, ...pixelData });
    } catch (readError) {
      setImage(null);
      setError(readError?.message || "File is not readable as a supported DICOM image.");
    } finally {
      setIsReading(false);
    }
  }, []);

  const onFileInputChange = useCallback(
    (event) => {
      processFile(event.target.files?.[0]);
      event.target.value = "";
    },
    [processFile],
  );

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      setIsDragging(false);
      processFile(event.dataTransfer.files?.[0]);
    },
    [processFile],
  );

  const downloadCsv = useCallback(() => {
    if (!image) return;

    const rows = createRowsForCsv({
      mode,
      imageType,
      preset,
      finscanSubmode,
      fileName,
      image,
      rois,
      measurements,
      acceptanceForm,
      baseline,
      agencyManualValues,
      qcRows,
      status: activeStatus,
      geometryRows,
      strictDecision,
      dicomValidation,
    });

    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const modeName =
      mode === MODES.ACCEPTANCE
        ? "acceptance-test"
        : mode === MODES.QC
          ? "quality-control"
          : "technical-preview";
    link.href = url;
    link.download = `cbct-qa-${modeName}-${fileName || "report"}.csv`.replace(/[^\w.-]+/g, "-");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [acceptanceForm, activeStatus, agencyManualValues, baseline, dicomValidation, fileName, finscanSubmode, geometryRows, image, imageType, measurements, mode, preset, qcRows, rois, strictDecision]);

  const downloadPdf = useCallback(() => {
    if (!image) return;

    const rows = createRowsForCsv({
      mode,
      imageType,
      preset,
      finscanSubmode,
      fileName,
      image,
      rois,
      measurements,
      acceptanceForm,
      baseline,
      agencyManualValues,
      qcRows,
      status: activeStatus,
      geometryRows,
      strictDecision,
      dicomValidation,
    });

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 40;
    const top = 48;
    const lineHeight = 14;
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = doc.internal.pageSize.getWidth() - marginX * 2;
    let y = top;

    const ensurePage = (needed = lineHeight) => {
      if (y + needed > pageHeight - 40) {
        doc.addPage();
        y = top;
      }
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("CBCT Internal QA Analyzer Report", marginX, y);
    y += 20;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Pre-Acceptance Screening / Internal QA Use Only", marginX, y);
    y += 16;
    doc.setFont("helvetica", "bold");
    doc.text(`Final status: ${strictDecision.label}`, marginX, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()}`, marginX, y);
    y += 16;
    doc.text("This report is not certified acceptance testing software and does not replace validated phantom software, external dosimetry, or medical physicist evaluation.", marginX, y, { maxWidth });
    y += 34;

    rows.forEach((row) => {
      const filtered = row.filter((cell) => valueText(cell) !== "N/A" || row.length <= 2);
      if (!filtered.length) {
        y += 6;
        return;
      }
      const isSection = filtered.length === 1;
      const line = filtered.map(valueText).join(" | ");
      const wrapped = doc.splitTextToSize(line, maxWidth);
      ensurePage(wrapped.length * lineHeight + 2);
      doc.setFont("helvetica", isSection ? "bold" : "normal");
      wrapped.forEach((part) => {
        doc.text(part, marginX, y);
        y += lineHeight;
      });
      y += 2;
    });

    const modeName =
      mode === MODES.ACCEPTANCE
        ? "acceptance-test"
        : mode === MODES.QC
          ? "quality-control"
          : "technical-preview";
    doc.save(`cbct-qa-${modeName}-${fileName || "report"}.pdf`.replace(/[^\w.-]+/g, "-"));
  }, [acceptanceForm, activeStatus, agencyManualValues, baseline, dicomValidation, fileName, finscanSubmode, geometryRows, image, imageType, measurements, mode, preset, qcRows, rois, strictDecision]);

  const updateRoiCenter = useCallback(
    (name, axis, rawValue) => {
      if (!image) return;
      const numeric = Number(rawValue);
      if (!Number.isFinite(numeric)) return;
      const max = axis === "x" ? image.metadata.columns - 1 : image.metadata.rows - 1;
      const clamped = Math.min(max, Math.max(0, numeric));
      setRoiCenters((current) =>
        current.map((roi) => (roi.name === name ? { ...roi, [axis]: clamped } : roi)),
      );
    },
    [image],
  );

  const updateRoiField = useCallback((name, key, value) => {
    setRoiCenters((current) => current.map((roi) => (roi.name === name ? { ...roi, [key]: value } : roi)));
  }, []);

  const updateRoiDiameterMm = useCallback(
    (name, mm) => {
      const spacing = parsePixelSpacing(image?.metadata?.pixelSpacing);
      if (!spacing?.row) return;
      const diameterPx = Number(mm) / spacing.row;
      if (!Number.isFinite(diameterPx) || diameterPx <= 0) return;
      updateRoiField(name, "diameterPx", diameterPx);
    },
    [image, updateRoiField],
  );

  const updateGeometryPair = useCallback((index, key, value) => {
    setGeometryPairs((current) =>
      current.map((pair, idx) => (idx === index ? { ...pair, [key]: value } : pair)),
    );
  }, []);

  const addGeometryPair = useCallback(() => {
    setGeometryPairs((current) => [...current, { knownMm: "50", p1x: "", p1y: "", p2x: "", p2y: "" }]);
  }, []);

  const removeGeometryPair = useCallback((index) => {
    setGeometryPairs((current) => (current.length <= 1 ? current : current.filter((_, idx) => idx !== index)));
  }, []);

  const onCanvasClick = useCallback(
    (event) => {
      if (!activeMarkerPick || !image || !isFinScanGeometric) {
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = Math.round(((event.clientX - rect.left) / rect.width) * canvas.width);
      const y = Math.round(((event.clientY - rect.top) / rect.height) * canvas.height);
      updateGeometryPair(activeMarkerPick.index, activeMarkerPick.xKey, String(x));
      updateGeometryPair(activeMarkerPick.index, activeMarkerPick.yKey, String(y));
      setActiveMarkerPick(null);
    },
    [activeMarkerPick, image, isFinScanGeometric, updateGeometryPair],
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-cyan-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-800">
                <Activity className="h-4 w-4" />
                Medical Line Georgia QA / ხარისხის კონტროლი
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Medical Line Georgia CBCT QA Analyzer
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Browser-based phantom QA screening, ROI measurement and report generator for CBCT workflows.
              </p>
            </div>

            <button
              type="button"
              onClick={downloadCsv}
              disabled={!image}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={!image}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-cyan-200 bg-white px-4 text-sm font-semibold text-cyan-800 shadow-sm transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          </div>

          <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-2 sm:grid-cols-3">
            {Object.entries(MODE_DETAILS).map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMode(key);
                  setImageType(key === MODES.PREVIEW ? IMAGE_TYPES.PATIENT : IMAGE_TYPES.PHANTOM);
                }}
                className={`rounded-md border p-4 text-left transition ${
                  mode === key
                    ? "border-cyan-500 bg-white shadow-sm ring-2 ring-cyan-100"
                    : "border-transparent bg-transparent hover:bg-white"
                }`}
              >
                <span className="block text-sm font-semibold text-slate-950">{item.title}</span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">{item.text}</span>
              </button>
            ))}
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Test Image Type</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setImageType(IMAGE_TYPES.PATIENT)}
                className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                  imageType === IMAGE_TYPES.PATIENT
                    ? "border-cyan-500 bg-white text-cyan-800 ring-2 ring-cyan-100"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                Patient DICOM / technical preview only
              </button>
              <button
                type="button"
                onClick={() => setImageType(IMAGE_TYPES.PHANTOM)}
                className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                  imageType === IMAGE_TYPES.PHANTOM
                    ? "border-cyan-500 bg-white text-cyan-800 ring-2 ring-cyan-100"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
                  >
                Phantom DICOM / QA analysis
              </button>
            </div>
            {mode === MODES.PREVIEW ? (
              <p className="mt-2 text-xs text-amber-700">
                Technical preview only - patient DICOM cannot be used for phantom-based QA scoring.
              </p>
            ) : null}
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preset Selector</p>
            <select
              value={preset}
              onChange={(event) => {
                const next = event.target.value;
                setPreset(next);
                const previewPreset = next === PRESETS.PATIENT;
                setImageType(previewPreset ? IMAGE_TYPES.PATIENT : IMAGE_TYPES.PHANTOM);
                setMode(previewPreset ? MODES.PREVIEW : mode === MODES.PREVIEW ? MODES.ACCEPTANCE : mode);
              }}
              className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value={PRESETS.GENERIC}>Generic CBCT Phantom QA</option>
              <option value={PRESETS.FINSCAN_CALIBRATION}>FinScan F350 Calibration Phantom</option>
              <option value={PRESETS.FINSCAN_GEOMETRIC}>FinScan F350 Geometric Phantom</option>
              <option value={PRESETS.QUART}>QUART DVTap / DIN 6868-161</option>
              <option value={PRESETS.CUSTOM}>Custom Phantom</option>
              <option value={PRESETS.PATIENT}>Patient DICOM / Technical Preview Only</option>
            </select>
          </div>

          <div className="grid gap-4 rounded-md border border-cyan-100 bg-cyan-50/50 p-4 lg:grid-cols-3">
            <div className="rounded-md border border-white bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">1. CBCT QA Analyzer</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">[ Acceptance Test ] [ Quality Control ]</p>
              <p className="mt-2 text-sm text-slate-600">
                Switch between full acceptance workflow and periodic constancy monitoring.
              </p>
            </div>
            <div className="rounded-md border border-white bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">2. Full Initial Test</p>
              <p className="mt-2 text-sm text-slate-700">QUART DVTap / DIN 6868-161 preset</p>
              <p className="mt-1 text-sm text-slate-700">CNR / Uniformity / Noise / SNR</p>
              <p className="mt-1 text-sm text-slate-700">MTF 10% / MTF 50% / NF placeholders</p>
              <p className="mt-1 text-sm text-slate-700">Acceptance report</p>
            </div>
            <div className="rounded-md border border-white bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">3. Periodic Constancy Check</p>
              <p className="mt-2 text-sm text-slate-700">Current CBCT phantom scan vs baseline</p>
              <p className="mt-1 text-sm text-slate-700">Deviation %</p>
              <p className="mt-1 text-sm text-slate-700">Trend</p>
              <p className="mt-1 text-sm text-slate-700">QC report</p>
            </div>
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            {DISCLAIMER} Files are processed in the browser for this MVP and are not uploaded to a
            server. Patient identifiers are intentionally hidden in this MVP.
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-8">
        <aside className="space-y-6">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`rounded-md border-2 border-dashed bg-white p-5 transition ${
              isDragging ? "border-cyan-500 ring-4 ring-cyan-100" : "border-cyan-200"
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-cyan-50 text-cyan-700">
              <UploadCloud className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-950">Upload DICOM / ატვირთვა</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Drop a .dcm file here, or choose a DICOM file. Extensionless files are supported when
              selected by the browser.
            </p>
            <input
              id="cbct-qa-file-input"
              ref={fileInputRef}
              type="file"
              accept=".dcm,application/dicom,*/*"
              className="sr-only"
              onChange={onFileInputChange}
            />
            <label
              htmlFor="cbct-qa-file-input"
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-cyan-200 bg-white px-4 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50"
            >
              <FileScan className="h-4 w-4" />
              Choose file
            </label>
            <button
              type="button"
              onClick={runDemoPhantomTest}
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800"
            >
              Demo Phantom Test
            </button>
            {fileName ? <p className="mt-3 truncate text-xs text-slate-500">{fileName}</p> : null}
            {isReading ? <p className="mt-3 text-sm font-medium text-cyan-700">Reading DICOM...</p> : null}
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5">
            <label htmlFor="roiDiameter" className="text-sm font-semibold text-slate-950">
              ROI Diameter / დიამეტრი
            </label>
            <div className="mt-3 flex items-center gap-3">
              <input
                id="roiDiameter"
                type="range"
                min="8"
                max="160"
                value={roiDiameter}
                onChange={(event) => setRoiDiameter(Number(event.target.value))}
                className="w-full accent-cyan-700"
              />
              <input
                type="number"
                min="8"
                max="160"
                value={roiDiameter}
                onChange={(event) => setRoiDiameter(Number(event.target.value))}
                className="h-10 w-20 rounded-md border border-slate-200 px-3 text-sm"
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              ROI role mapping for MVP: Center = PMMA, Left = Air, Right = PVC/Bone.
            </p>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-950">DICOM Metadata</h2>
            {image ? (
              <dl className="mt-4 space-y-3">
                {metadataDisplayRows.map((field) => (
                  <div key={field.key} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{field.label}</dt>
                    <dd className={`max-w-40 text-right text-sm font-semibold ${field.status === "INVALID" ? "text-rose-700" : "text-slate-800"}`}>
                      {field.display}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-600">No DICOM metadata loaded yet.</p>
            )}
            <p className="mt-3 text-xs text-slate-500">
              Patient identifiers are intentionally hidden in this MVP.
            </p>
          </div>
        </aside>

        <div className="space-y-6">
          {image ? (
            <FinalDecisionPanel decision={strictDecision} />
          ) : null}

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
              {error}
            </div>
          ) : null}

          {warnings.length > 0 || missingMetadata.length > 0 || measurementWarnings.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Metadata warnings
              </div>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {[...warnings, ...missingMetadata.map((item) => `${item} is missing.`), ...measurementWarnings].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {isDemoImage ? (
            <div className="rounded-md border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
              This demo image is only for software validation and does not represent a real CBCT
              phantom scan.
            </div>
          ) : null}

          {imageType === IMAGE_TYPES.PATIENT ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Technical preview only - patient DICOM cannot be used for phantom-based QA scoring.
            </div>
          ) : null}
          {preset === PRESETS.GENERIC ? (
            <div className="rounded-md border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
              Generic phantom mode is for technical QA screening and software validation only. It is
              not a certified acceptance test and does not replace phantom-specific validated software.
            </div>
          ) : null}
          {preset === PRESETS.QUART ? (
            <div className="rounded-md border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
              QUART DVTap support in this MVP is a simplified workflow. Full DIN 6868-161 acceptance
              testing requires validated methodology and/or certified software.
            </div>
          ) : null}
          {(isFinScanCalibration || isFinScanGeometric) ? (
            <div className="rounded-md border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
              {FINSCAN_DISCLAIMER}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <div
              className={`rounded-md border bg-white p-4 ${
                mode === MODES.ACCEPTANCE ? "border-cyan-300 ring-2 ring-cyan-100" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-950">Acceptance Test Summary</h2>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(acceptance.tone)}`}>
                  {acceptance.label}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <SummaryMetric label="Uniformity" value={metricText(measurements?.uniformityPercent, "%")} />
                <SummaryMetric label="Noise" value={metricText(measurements?.noisePercent, "%")} />
                <SummaryMetric label="SNR" value={metricText(measurements?.snr)} />
                <SummaryMetric label="CNR Air/PMMA" value={metricText(measurements?.cnrAirPmma)} />
              </div>
            </div>

            <div
              className={`rounded-md border bg-white p-4 ${
                mode === MODES.QC ? "border-cyan-300 ring-2 ring-cyan-100" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-950">Quality Control Summary</h2>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(qc.tone)}`}>
                  {qc.label}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <SummaryMetric label="Noise deviation" value={metricText(qcRows[0]?.deviation, "%")} />
                <SummaryMetric label="Uniformity deviation" value={metricText(qcRows[1]?.deviation, "%")} />
                <SummaryMetric label="CNR deviation" value={metricText(qcRows[2]?.deviation, "%")} />
                <SummaryMetric label="SNR deviation" value={metricText(qcRows[4]?.deviation, "%")} />
              </div>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-950">Advanced Parameters</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                ["Nyquist Frequency / NF", PLANNED],
                ["MTF at 10%", PLANNED],
                ["MTF at 50%", PLANNED],
                ["Artefacts / Image Flaws", MANUAL],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="font-semibold text-slate-900">{label}</div>
                  <div className="mt-1 text-slate-700">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">Preview / გამოსახულება</h2>
              <span className="text-sm text-slate-500">
                {image ? `${image.metadata.columns} x ${image.metadata.rows}` : "No image"}
              </span>
            </div>
            <div className="flex min-h-[360px] items-center justify-center rounded-md bg-slate-950 p-3">
              {image ? (
                <canvas
                  ref={canvasRef}
                  onClick={onCanvasClick}
                  className="max-h-[68vh] w-auto max-w-full rounded-sm bg-black object-contain"
                />
              ) : (
                <div className="text-center text-slate-300">
                  <Info className="mx-auto h-8 w-8 text-cyan-300" />
                  <p className="mt-3 text-sm">Upload an uncompressed grayscale DICOM file to preview.</p>
                </div>
              )}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600">
              These ROI positions are meaningful only on a standardized phantom scan. On patient
              anatomy, values vary by anatomy and cannot be interpreted as CBCT image quality
              acceptance results.
            </p>
          </div>

          {image && roiCenters.length > 0 ? (
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-semibold text-slate-950">Manual ROI Adjustment</h2>
              <p className="mt-2 text-sm text-slate-600">
                Automatic 5-ROI placement is default. You can fine-tune each ROI center using X/Y.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Name</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Enabled</th>
                      <th className="px-3 py-3">X</th>
                      <th className="px-3 py-3">Y</th>
                      <th className="px-3 py-3">Diameter px</th>
                      <th className="px-3 py-3">Diameter mm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roiCenters.map((roi) => (
                      <tr key={roi.name}>
                        <td className="px-3 py-3 font-semibold text-slate-900">
                          <input
                            value={roi.name}
                            onChange={(event) => updateRoiField(roi.name, "name", event.target.value)}
                            className="h-9 w-28 rounded-md border border-slate-200 px-2"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={roi.roiType || ROI_TYPES.CUSTOM}
                            onChange={(event) => updateRoiField(roi.name, "roiType", event.target.value)}
                            className="h-9 w-44 rounded-md border border-slate-200 px-2 text-xs"
                          >
                            {ROI_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={roi.enabled !== false}
                            onChange={(event) => updateRoiField(roi.name, "enabled", event.target.checked)}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            max={image.metadata.columns - 1}
                            value={Math.round(roi.x)}
                            onChange={(event) => updateRoiCenter(roi.name, "x", event.target.value)}
                            className="h-9 w-24 rounded-md border border-slate-200 px-2"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            max={image.metadata.rows - 1}
                            value={Math.round(roi.y)}
                            onChange={(event) => updateRoiCenter(roi.name, "y", event.target.value)}
                            className="h-9 w-24 rounded-md border border-slate-200 px-2"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="4"
                            max="300"
                            value={Math.round(Number(roi.diameterPx) || roiDiameter)}
                            onChange={(event) => updateRoiField(roi.name, "diameterPx", Number(event.target.value))}
                            className="h-9 w-24 rounded-md border border-slate-200 px-2"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={
                              pixelSpacing?.row
                                ? fixed(((Number(roi.diameterPx) || roiDiameter) * pixelSpacing.row), 2)
                                : ""
                            }
                            onChange={(event) => updateRoiDiameterMm(roi.name, event.target.value)}
                            disabled={!pixelSpacing?.row}
                            className="h-9 w-24 rounded-md border border-slate-200 px-2 disabled:bg-slate-100"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {isFinScanGeometric ? (
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-semibold text-slate-950">FinScan Geometric Calibration Phantom</h2>
              <p className="mt-2 text-sm text-slate-600">
                Internal technical QC only. This is not a DIN 6868-161 certified acceptance result unless validated with official protocol and phantom documentation.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  OK Threshold %
                  <input
                    type="number"
                    value={finscanThresholds.ok}
                    onChange={(event) => setFinscanThresholds((c) => ({ ...c, ok: event.target.value }))}
                    className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm normal-case"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Warning Threshold %
                  <input
                    type="number"
                    value={finscanThresholds.warning}
                    onChange={(event) => setFinscanThresholds((c) => ({ ...c, warning: event.target.value }))}
                    className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm normal-case"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Baseline Error % (Optional)
                  <input
                    type="number"
                    value={finscanBaselineError}
                    onChange={(event) => setFinscanBaselineError(event.target.value)}
                    className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm normal-case"
                  />
                </label>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Pair</th>
                      <th className="px-3 py-3">Known mm</th>
                      <th className="px-3 py-3">P1 X/Y</th>
                      <th className="px-3 py-3">P2 X/Y</th>
                      <th className="px-3 py-3">Measured mm</th>
                      <th className="px-3 py-3">Error %</th>
                      <th className="px-3 py-3">Offset X/Y px</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {geometryPairs.map((pair, idx) => (
                      <tr key={`pair-${idx}`}>
                        <td className="px-3 py-3 font-semibold">Pair {idx + 1}</td>
                        <td className="px-3 py-3">
                          <input
                            value={pair.knownMm}
                            onChange={(event) => updateGeometryPair(idx, "knownMm", event.target.value)}
                            className="h-8 w-20 rounded border border-slate-200 px-2"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            <input value={pair.p1x} onChange={(event) => updateGeometryPair(idx, "p1x", event.target.value)} className="h-8 w-14 rounded border border-slate-200 px-1" />
                            <input value={pair.p1y} onChange={(event) => updateGeometryPair(idx, "p1y", event.target.value)} className="h-8 w-14 rounded border border-slate-200 px-1" />
                            <button
                              type="button"
                              onClick={() => setActiveMarkerPick({ index: idx, xKey: "p1x", yKey: "p1y" })}
                              className="h-8 rounded border border-cyan-200 px-2 text-xs text-cyan-800"
                            >
                              Pick
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            <input value={pair.p2x} onChange={(event) => updateGeometryPair(idx, "p2x", event.target.value)} className="h-8 w-14 rounded border border-slate-200 px-1" />
                            <input value={pair.p2y} onChange={(event) => updateGeometryPair(idx, "p2y", event.target.value)} className="h-8 w-14 rounded border border-slate-200 px-1" />
                            <button
                              type="button"
                              onClick={() => setActiveMarkerPick({ index: idx, xKey: "p2x", yKey: "p2y" })}
                              className="h-8 rounded border border-cyan-200 px-2 text-xs text-cyan-800"
                            >
                              Pick
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3">{metricText(geometryRows[idx]?.measuredMm)}</td>
                        <td className="px-3 py-3">{metricText(geometryRows[idx]?.errorPercent, "%")}</td>
                        <td className="px-3 py-3">{metricText(geometryRows[idx]?.offsetX)} / {metricText(geometryRows[idx]?.offsetY)}</td>
                        <td className="px-3 py-3">{geometryRows[idx]?.status || "WAITING"}</td>
                        <td className="px-3 py-3">
                          <button type="button" onClick={() => removeGeometryPair(idx)} className="h-8 rounded border border-rose-200 px-2 text-xs text-rose-700">Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <button type="button" onClick={addGeometryPair} className="h-9 rounded-md border border-cyan-200 px-3 text-cyan-800">
                  Add Marker Pair
                </button>
                {activeMarkerPick ? <span className="text-amber-700">Click on the preview to place selected marker point.</span> : null}
                {Number.isFinite(Number(finscanBaselineError)) ? (
                  <span>
                    Baseline delta (Pair 1): {metricText(
                      Number.isFinite(geometryRows[0]?.errorPercent)
                        ? geometryRows[0].errorPercent - Number(finscanBaselineError)
                        : null,
                      "%",
                    )}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          <FinScanF350ProtocolPanel
            protocol={finScanProtocol}
            protocolKey={finScanProtocolKeyValue}
            autoRows={finScanAutoValues}
            image={image}
          />

          <AgencyProtocolPanel
            rows={agencyRows}
            image={image}
            manualValues={agencyManualValues}
            setManualValues={setAgencyManualValues}
          />

          {mode === MODES.ACCEPTANCE ? (
            <AcceptancePanel
              acceptanceForm={acceptanceForm}
              updateAcceptanceField={updateAcceptanceField}
              measurements={measurements}
              status={activeStatus}
              rois={rois}
              isDemoImage={isDemoImage}
              imageType={imageType}
            />
          ) : mode === MODES.QC ? (
            <QcPanel
              baseline={baseline}
              updateBaselineField={updateBaselineField}
              qcRows={qcRows}
              status={qc}
              imageType={imageType}
            />
          ) : (
            <TechnicalPreviewPanel />
          )}

          <RoiTable rois={rois} status={activeStatus} />
        </div>
      </section>
    </main>
  );
}

function AgencyProtocolPanel({ rows, image, manualValues, setManualValues }) {
  const readyCount = rows.filter((row) => row.status === "READY").length;
  const manualCount = rows.filter((row) => row.status === "MANUAL").length;
  const missingCount = rows.filter((row) => row.status === "MISSING").length;

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Agency CBCT Protocol Checklist</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Upload a CBCT phantom DICOM to pre-fill FOV, voxel, exposure, geometric, and image
            quality parameters. Dose report values and final physicist judgement stay manual when
            the DICOM does not contain them.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800">
            Ready {readyCount}
          </span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800">
            Manual {manualCount}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
            Missing {missingCount}
          </span>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Parameter</th>
              <th className="px-3 py-3">Value</th>
              <th className="px-3 py-3">Source</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {image ? (
              rows.map((row) => (
                <tr key={row.label}>
                  <td className="px-3 py-3 font-semibold text-slate-900">{row.label}</td>
                  <td className="px-3 py-3 text-slate-700">
                    {row.status === "MANUAL" || (row.status === "READY" && row.source === "Physicist / test device") ? (
                      <input
                        value={manualValues?.[row.key] || ""}
                        onChange={(event) =>
                          setManualValues((current) => ({
                            ...current,
                            [row.key]: event.target.value,
                          }))
                        }
                        placeholder="Enter value..."
                        className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm"
                      />
                    ) : (
                      row.value
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-600">{row.source}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                      row.status === "READY"
                        ? statusClasses("emerald")
                        : row.status === "MANUAL"
                          ? statusClasses("amber")
                          : statusClasses("slate")
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan="4">
                  Upload a phantom DICOM to build the agency protocol checklist.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FinalDecisionPanel({ decision }) {
  const tone = decision.tone || "amber";
  return (
    <div className={`rounded-md border p-4 ${statusClasses(tone)}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">Final decision</p>
          <h2 className="mt-1 text-2xl font-semibold">{decision.label}</h2>
        </div>
        <span className="rounded-full border border-current px-3 py-1 text-xs font-semibold">
          Internal QA / pre-acceptance only
        </span>
      </div>
      <p className="mt-3 text-sm leading-6">
        PASS is blocked whenever a critical value fails, DICOM data is invalid, manual review is pending,
        MTF/dose validation is unavailable, or final physicist conclusion is not explicitly positive.
      </p>
      {decision.failures?.length ? (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Fail causes</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            {decision.failures.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ) : null}
      {decision.incomplete?.length ? (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Incomplete / manual review causes</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            {decision.incomplete.slice(0, 12).map((item) => <li key={item}>{item}</li>)}
            {decision.incomplete.length > 12 ? <li>{decision.incomplete.length - 12} more items in report output.</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function FinScanF350ProtocolPanel({ protocol, protocolKey, autoRows, image }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">FinScan F350 protocol reader</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">{protocol.title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {protocol.document}. Detected mode: <span className="font-semibold text-slate-900">{protocolKey}</span>.
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(image ? "emerald" : "slate")}`}>
          {image ? "DICOM loaded" : "Waiting for DICOM"}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <h3 className="text-sm font-semibold text-slate-950">Read from DICOM</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <tbody className="divide-y divide-slate-200">
                {autoRows.map(([label, value, source]) => (
                  <tr key={label}>
                    <td className="px-2 py-2 font-semibold text-slate-800">{label}</td>
                    <td className="px-2 py-2 text-slate-700">{value}</td>
                    <td className="px-2 py-2">
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${source === "DICOM" ? statusClasses("emerald") : statusClasses("slate")}`}>
                        {source}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <h3 className="text-sm font-semibold text-slate-950">Typical dose table</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-2">Mode</th>
                  <th className="px-2 py-2">Time</th>
                  <th className="px-2 py-2">kV</th>
                  <th className="px-2 py-2">mA</th>
                  <th className="px-2 py-2">Kerma</th>
                  <th className="px-2 py-2">DAP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {protocol.doseRows.map((row) => (
                  <tr key={row.join("-")}>
                    {row.map((cell) => (
                      <td key={cell} className="px-2 py-2 text-slate-700">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Inspection parameter</th>
              <th className="px-3 py-3">Acceptance criterion</th>
              <th className="px-3 py-3">How it is read</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {protocol.criteria.map(([parameter, criterion, source]) => (
              <tr key={parameter}>
                <td className="px-3 py-3 font-semibold text-slate-900">{parameter}</td>
                <td className="px-3 py-3 text-slate-700">{criterion}</td>
                <td className="px-3 py-3 text-slate-600">{source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        Some parameters require the official phantom software, dose meter, or visual inspection. This panel keeps them visible so the uploaded DICOM can be checked against the correct FinScan F350 procedure.
      </p>
    </div>
  );
}

function SummaryMetric({ label, value }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function AcceptancePanel({ acceptanceForm, updateAcceptanceField, measurements, status, rois, isDemoImage, imageType }) {
  const center = rois.find((roi) => roi.name === "Center");
  const left = rois.find((roi) => roi.name === "Left");
  const right = rois.find((roi) => roi.name === "Right");
  const calculatedRows = [
    ["Patient/Phantom Positioning Accuracy", MANUAL],
    ["Homogeneity / Image Uniformity", metricText(measurements?.uniformityPercent, "%")],
    ["Contrast-to-Noise Ratio / CNR Air vs PMMA", metricText(measurements?.cnrAirPmma)],
    ["Contrast-to-Noise Ratio / CNR PVC/Bone vs PMMA", metricText(measurements?.cnrPvcPmma)],
    ["Noise", metricText(measurements?.noise)],
    ["Noise %", metricText(measurements?.noisePercent, "%")],
    ["SNR", metricText(measurements?.snr)],
    ["Nyquist Frequency / NF", PLANNED],
    ["MTF at 10%", PLANNED],
    ["MTF at 50%", PLANNED],
    ["Artefacts / Image Flaws", MANUAL],
    [
      "Demo Acceptance Indicator / Figure of Merit",
      imageType === IMAGE_TYPES.PHANTOM ? status.label : "Not applicable for patient DICOM",
    ],
  ];

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-950">Acceptance Test Report</h2>
        {imageType === IMAGE_TYPES.PHANTOM ? (
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(status.tone)}`}>
            {status.label}
          </span>
        ) : (
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses("slate")}`}>
            Not applicable for patient DICOM
          </span>
        )}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Phantom preset: {PHANTOM_PRESETS.quartDvtap.label}. NF, MTF, artefacts, and positioning are
        not automatically scored in this MVP without validated phantom-specific algorithms.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {ACCEPTANCE_FIELDS.map((field) => (
          <TextField
            key={field.key}
            field={field}
            value={acceptanceForm[field.key]}
            onChange={updateAcceptanceField}
          />
        ))}
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Acceptance parameter</th>
              <th className="px-3 py-3">MVP value / interpretation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {calculatedRows.map(([label, value]) => (
              <tr key={label}>
                <td className="px-3 py-3 font-semibold text-slate-900">{label}</td>
                <td className="px-3 py-3 text-slate-700">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isDemoImage ? (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">Metric</th>
                <th className="px-3 py-3">Measured</th>
                <th className="px-3 py-3">Expected (approx.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-3 py-3 font-semibold text-slate-900">PMMA mean</td>
                <td className="px-3 py-3 text-slate-700">{metricText(center?.mean)}</td>
                <td className="px-3 py-3 text-slate-700">≈ {DEMO_EXPECTED.pmmaMean}</td>
              </tr>
              <tr>
                <td className="px-3 py-3 font-semibold text-slate-900">Air mean</td>
                <td className="px-3 py-3 text-slate-700">{metricText(left?.mean)}</td>
                <td className="px-3 py-3 text-slate-700">≈ {DEMO_EXPECTED.airMean}</td>
              </tr>
              <tr>
                <td className="px-3 py-3 font-semibold text-slate-900">PVC mean</td>
                <td className="px-3 py-3 text-slate-700">{metricText(right?.mean)}</td>
                <td className="px-3 py-3 text-slate-700">≈ {DEMO_EXPECTED.pvcMean}</td>
              </tr>
              <tr>
                <td className="px-3 py-3 font-semibold text-slate-900">Uniformity %</td>
                <td className="px-3 py-3 text-slate-700">{metricText(measurements?.uniformityPercent, "%")}</td>
                <td className="px-3 py-3 text-slate-700">around {DEMO_EXPECTED.uniformityPercent}%</td>
              </tr>
              <tr>
                <td className="px-3 py-3 font-semibold text-slate-900">Noise %</td>
                <td className="px-3 py-3 text-slate-700">{metricText(measurements?.noisePercent, "%")}</td>
                <td className="px-3 py-3 text-slate-700">{DEMO_EXPECTED.noise}</td>
              </tr>
              <tr>
                <td className="px-3 py-3 font-semibold text-slate-900">SNR</td>
                <td className="px-3 py-3 text-slate-700">{metricText(measurements?.snr)}</td>
                <td className="px-3 py-3 text-slate-700">{DEMO_EXPECTED.snr}</td>
              </tr>
              <tr>
                <td className="px-3 py-3 font-semibold text-slate-900">CNR values</td>
                <td className="px-3 py-3 text-slate-700">
                  Air/PMMA {metricText(measurements?.cnrAirPmma)} | PVC/PMMA {metricText(measurements?.cnrPvcPmma)}
                </td>
                <td className="px-3 py-3 text-slate-700">{DEMO_EXPECTED.cnr}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function QcPanel({ baseline, updateBaselineField, qcRows, status, imageType }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-950">Quality Control / Constancy Test</h2>
        {imageType === IMAGE_TYPES.PHANTOM ? (
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(status.tone)}`}>
            {status.label}
          </span>
        ) : (
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses("slate")}`}>
            Not applicable for patient DICOM
          </span>
        )}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Enter acceptance baseline values manually. Deviation is calculated as current minus baseline,
        divided by baseline. For noise and uniformity, increases are negative trends; for CNR and SNR,
        decreases are negative trends.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-5">
        {BASELINE_FIELDS.map((field) => (
          <label key={field.key}>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{field.label}</span>
            <input
              type="number"
              value={baseline[field.key]}
              onChange={(event) => updateBaselineField(field.key, event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Metric</th>
              <th className="px-3 py-3">Current</th>
              <th className="px-3 py-3">Baseline</th>
              <th className="px-3 py-3">Deviation %</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {qcRows.length > 0 ? (
              qcRows.map((row) => (
                <tr key={row.key}>
                  <td className="px-3 py-3 font-semibold text-slate-900">{row.label}</td>
                  <td className="px-3 py-3 text-slate-700">{metricText(row.current)}</td>
                  <td className="px-3 py-3 text-slate-700">{metricText(row.baseline)}</td>
                  <td className="px-3 py-3 text-slate-700">{metricText(row.deviation, "%")}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClasses(statusTone(row.status))}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{row.trend}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan="6">
                  Upload a DICOM file and enter baseline values to calculate QC deviations.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TechnicalPreviewPanel() {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
      <h2 className="text-lg font-semibold text-amber-900">Technical Preview / Patient DICOM</h2>
      <p className="mt-2 text-sm leading-6 text-amber-900">
        Technical preview only - patient DICOM cannot be used for phantom-based QA scoring.
      </p>
      <p className="mt-2 text-sm leading-6 text-amber-900">
        Use this mode for upload validation, metadata checks, and ROI measurement workflow tests.
      </p>
    </div>
  );
}

function RoiTable({ rois, status }) {
  const isScored = status.label !== "Not applicable for patient DICOM";
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-950">ROI Results / შედეგები</h2>
        <div className="flex items-center gap-2 text-sm font-semibold">
          {isScored && (status.label === "OK" || status.label === "PASS") ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : null}
          {isScored && status.label === "WARNING" ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : null}
          {isScored && status.label === "FAIL" ? <XCircle className="h-4 w-4 text-rose-600" /> : null}
          <span>{status.label}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">ROI</th>
              <th className="px-3 py-3">Material role</th>
              <th className="px-3 py-3">Pixel count</th>
              <th className="px-3 py-3">Mean</th>
              <th className="px-3 py-3">StdDev</th>
              <th className="px-3 py-3">Min</th>
              <th className="px-3 py-3">Max</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rois.length > 0 ? (
              rois.map((roi) => (
                <tr key={roi.name}>
                  <td className="px-3 py-3 font-semibold text-slate-900">{roi.label}</td>
                  <td className="px-3 py-3 text-slate-700">{roi.material}</td>
                  <td className="px-3 py-3 text-slate-700">{roi.count}</td>
                  <td className="px-3 py-3 text-slate-700">{fixed(roi.mean)}</td>
                  <td className="px-3 py-3 text-slate-700">{fixed(roi.stdDev)}</td>
                  <td className="px-3 py-3 text-slate-700">{fixed(roi.min)}</td>
                  <td className="px-3 py-3 text-slate-700">{fixed(roi.max)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan="7">
                  ROI results will appear after upload.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
