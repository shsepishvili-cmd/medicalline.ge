export const QA_STATUS = {
  PASS: "PASS",
  FAIL: "FAIL",
  INCOMPLETE: "INCOMPLETE",
  MANUAL_REVIEW: "MANUAL REVIEW REQUIRED",
};

export const INVALID_DICOM_TEXT = "Invalid / unavailable in DICOM";

const PLACEHOLDER_NUMBERS = new Set([-2147483648, 2147483647, -32768, 32767]);

function cleanText(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function finiteNumber(value) {
  const text = cleanText(value).replace(",", ".");
  if (!text || /^inf(inity)?$/i.test(text) || /^nan$/i.test(text)) return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || PLACEHOLDER_NUMBERS.has(parsed)) return null;
  return parsed;
}

export function validateNumericDicom(value, options = {}) {
  const {
    label = "Value",
    min = -Infinity,
    max = Infinity,
    allowZero = false,
    required = false,
    unit = "",
  } = options;
  const raw = cleanText(value);
  const parsed = finiteNumber(raw);

  if (parsed === null) {
    return {
      key: label,
      status: required || raw ? "INVALID" : "MISSING",
      value: null,
      display: INVALID_DICOM_TEXT,
      reason: raw ? `${label} has an invalid DICOM value (${raw}).` : `${label} is missing.`,
    };
  }

  if ((!allowZero && parsed === 0) || parsed < min || parsed > max) {
    return {
      key: label,
      status: "INVALID",
      value: parsed,
      display: INVALID_DICOM_TEXT,
      reason: `${label} value ${raw} is outside the expected range.`,
    };
  }

  return {
    key: label,
    status: "READY",
    value: parsed,
    display: `${raw}${unit ? ` ${unit}` : ""}`,
    reason: "",
  };
}

export function validateTextDicom(value, label, options = {}) {
  const raw = cleanText(value);
  if (!raw) {
    return {
      key: label,
      status: options.required ? "MISSING" : "OPTIONAL",
      value: "",
      display: options.required ? "Missing" : "N/A",
      reason: options.required ? `${label} is missing.` : "",
    };
  }
  if (/^(unknown|undefined|null|n\/a|na)$/i.test(raw)) {
    return {
      key: label,
      status: "INVALID",
      value: raw,
      display: INVALID_DICOM_TEXT,
      reason: `${label} is not a usable value.`,
    };
  }
  return { key: label, status: "READY", value: raw, display: raw, reason: "" };
}

export function validateDateDicom(value, label) {
  const raw = cleanText(value);
  if (!raw) {
    return { key: label, status: "MISSING", value: "", display: "Missing", reason: `${label} is missing.` };
  }
  if (!/^\d{8}$/.test(raw)) {
    return { key: label, status: "INVALID", value: raw, display: INVALID_DICOM_TEXT, reason: `${label} is not a valid DICOM DA value.` };
  }
  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(4, 6));
  const day = Number(raw.slice(6, 8));
  if (year < 1990 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return { key: label, status: "INVALID", value: raw, display: INVALID_DICOM_TEXT, reason: `${label} is outside the expected date range.` };
  }
  return { key: label, status: "READY", value: raw, display: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, reason: "" };
}

export function validatePixelSpacing(value) {
  const raw = cleanText(value);
  const parts = raw.split("\\").map(finiteNumber);
  if (parts.length < 2 || parts.some((part) => part === null || part <= 0 || part > 10)) {
    return {
      key: "Pixel spacing",
      status: raw ? "INVALID" : "MISSING",
      value: null,
      display: INVALID_DICOM_TEXT,
      reason: raw ? `Pixel spacing has an invalid value (${raw}).` : "Pixel spacing is missing.",
    };
  }
  return {
    key: "Pixel spacing",
    status: "READY",
    value: { row: parts[0], col: parts[1], avg: (parts[0] + parts[1]) / 2 },
    display: `${parts[0].toFixed(3)} x ${parts[1].toFixed(3)} mm`,
    reason: "",
  };
}

export function validateFov(value) {
  const raw = cleanText(value);
  if (!raw) {
    return { key: "FOV", status: "MISSING", value: null, display: "Missing", reason: "FOV is missing." };
  }
  const matches = raw.match(/\d+(?:[.,]\d+)?/g) || [];
  const values = matches.map(finiteNumber).filter((item) => item !== null);
  if (!values.length || values.some((item) => item <= 0 || item > 300)) {
    return { key: "FOV", status: "INVALID", value: null, display: INVALID_DICOM_TEXT, reason: `FOV has an invalid value (${raw}).` };
  }
  return { key: "FOV", status: "READY", value: values, display: raw, reason: "" };
}

export function buildDicomValidation(metadata = {}) {
  const checks = [
    validateNumericDicom(metadata.kvp, { label: "kVp", min: 40, max: 130, required: true }),
    validateNumericDicom(metadata.tubeCurrent, { label: "Tube current", min: 1, max: 30, required: true, unit: "mA" }),
    validateNumericDicom(metadata.exposureTime, { label: "Exposure time", min: 1, max: 120000, required: true, unit: "ms" }),
    validateNumericDicom(metadata.exposure, { label: "Exposure mAs", min: 0.01, max: 1000, required: false, unit: "mAs" }),
    validatePixelSpacing(metadata.pixelSpacing),
    validateNumericDicom(metadata.sliceThickness, { label: "Slice thickness", min: 0.01, max: 10, required: false, unit: "mm" }),
    validateFov(metadata.fov),
    validateTextDicom(metadata.manufacturerModelName || metadata.manufacturer, "Manufacturer/model", { required: true }),
    validateTextDicom(metadata.deviceSerialNumber, "Device serial number", { required: true }),
    validateDateDicom(metadata.studyDate || metadata.acquisitionDate, "Study/acquisition date"),
  ];

  return {
    checks,
    invalid: checks.filter((check) => check.status === "INVALID"),
    missing: checks.filter((check) => check.status === "MISSING"),
  };
}

function parseVoxelValues(value) {
  const raw = cleanText(value);
  const nums = (raw.match(/\d+(?:[.,]\d+)?/g) || []).map(finiteNumber).filter((item) => item !== null);
  return nums;
}

function sameApprox(a, b, tolerance = 0.02) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= tolerance;
}

export function buildConsistencyChecks({ imageType, mode, preset, metadata = {}, acceptanceForm = {} }) {
  const issues = [];
  const modality = cleanText(metadata.modality).toUpperCase();
  const series = cleanText(metadata.seriesDescription || metadata.protocolName).toLowerCase();
  const presetText = cleanText(preset).toLowerCase();

  if ((modality === "DX" || modality === "CR") && imageType === "phantom") {
    issues.push({
      severity: "BLOCKING",
      message: "2D projection DICOM is selected as phantom QA. Use Technical Preview or Cephalometric QA.",
    });
  }

  if ((series.includes("ceph") || series.includes("lateral")) && mode !== "preview" && imageType === "phantom") {
    issues.push({
      severity: "BLOCKING",
      message: "Series/protocol indicates cephalometric imaging but the report is in CBCT phantom QA mode.",
    });
  }

  if (presetText.includes("quart") && (modality === "DX" || series.includes("ceph"))) {
    issues.push({
      severity: "BLOCKING",
      message: "QUART/CBCT phantom preset conflicts with DX or cephalometric DICOM metadata.",
    });
  }

  const dicomVoxel = parseVoxelValues(metadata.voxelSize || metadata.pixelSpacing);
  const formVoxel = parseVoxelValues(acceptanceForm.voxelSize);
  if (dicomVoxel.length && formVoxel.length && !sameApprox(dicomVoxel[0], formVoxel[0])) {
    issues.push({
      severity: "BLOCKING",
      message: `Voxel size conflict: DICOM reports ${metadata.voxelSize || metadata.pixelSpacing}, form reports ${acceptanceForm.voxelSize}.`,
    });
  }

  return {
    issues,
    status: issues.length ? QA_STATUS.INCOMPLETE : QA_STATUS.PASS,
  };
}

function hasPositiveConclusion(value) {
  const text = cleanText(value).toLowerCase();
  return /\b(pass|passed|acceptable|accepted|approved|positive|ok|qualified)\b/.test(text);
}

function hasNegativeConclusion(value) {
  const text = cleanText(value).toLowerCase();
  return /\b(fail|failed|reject|rejected|negative|not acceptable|unqualified)\b/.test(text);
}

export function buildStrictDecision(input = {}) {
  const {
    imageType = "phantom",
    mode = "acceptance",
    preset = "",
    metadata = {},
    measurements = null,
    geometryRows = [],
    acceptanceForm = {},
    manualValues = {},
    markerConfidence = null,
    mtf = {},
    validationFlags = {},
  } = input;

  const failures = [];
  const incomplete = [];
  const warnings = [];
  const dicom = buildDicomValidation(metadata);
  const consistency = buildConsistencyChecks({ imageType, mode, preset, metadata, acceptanceForm });

  dicom.invalid.forEach((check) => incomplete.push(check.reason));
  dicom.missing.forEach((check) => incomplete.push(check.reason));
  consistency.issues.forEach((issue) => incomplete.push(issue.message));

  if (imageType !== "phantom" || mode === "preview") {
    incomplete.push("Technical preview images cannot receive a final phantom QA PASS.");
  }

  const cnr = measurements?.cnrAirPmma ?? measurements?.cnrPvcPmma;
  if (cnr === null || cnr === undefined || !Number.isFinite(cnr)) {
    incomplete.push("CNR is unavailable.");
  } else if (cnr < 2) {
    failures.push(`CNR ${cnr.toFixed(2)} is below the required limit of 2.`);
  }

  if (!Number.isFinite(mtf.mtf10)) incomplete.push("MTF10 is not available - validated phantom software/algorithm required.");
  else if (mtf.mtf10 < 1.0) failures.push(`MTF10 ${mtf.mtf10.toFixed(2)} lp/mm is below 1.0 lp/mm.`);

  if (!Number.isFinite(mtf.mtf50)) incomplete.push("MTF50 is not available - validated phantom software/algorithm required.");
  else if (mtf.mtf50 < 0.5) failures.push(`MTF50 ${mtf.mtf50.toFixed(2)} lp/mm is below 0.5 lp/mm.`);

  const scoredGeometry = geometryRows.filter((row) => Number.isFinite(row.errorPercent));
  if (!scoredGeometry.length) {
    incomplete.push("Geometric marker distance is unavailable or not confirmed.");
  } else {
    scoredGeometry.forEach((row, index) => {
      const error = Math.abs(row.errorPercent);
      if (error > 50) failures.push(`Geometric error for pair ${index + 1} is ${error.toFixed(2)}%, above the +/-50% limit.`);
    });
  }

  if (markerConfidence !== null && Number.isFinite(markerConfidence) && markerConfidence < 0.8) {
    incomplete.push("Marker detection confidence is below threshold; manual review required.");
  }

  const requiredForm = [
    ["clinicName", "Clinic name"],
    ["deviceModel", "Device model"],
    ["serialNumber", "Device serial number"],
    ["phantomType", "Phantom type"],
    ["standardProtocol", "Approved baseline protocol"],
    ["operator", "Operator"],
  ];
  requiredForm.forEach(([key, label]) => {
    if (!cleanText(acceptanceForm[key])) incomplete.push(`${label} is missing.`);
  });

  const requiredManual = [
    ["phantom_type_serial", "Phantom serial"],
    ["baseline_protocol", "Approved baseline protocol"],
    ["high_contrast_score", "High-contrast visual review"],
    ["low_contrast_score", "Low-contrast visual review"],
    ["artefact_review", "Artefact review"],
    ["laser_positioning_accuracy", "Laser positioning accuracy"],
    ["dose_report", "Dose report / DAP / CTDIvol / DLP"],
    ["external_dosimeter", "External dosimeter result"],
    ["final_physicist_conclusion", "Final medical physicist conclusion"],
  ];
  requiredManual.forEach(([key, label]) => {
    if (!cleanText(manualValues[key])) incomplete.push(`${label} is missing or manual review is pending.`);
  });

  if (hasNegativeConclusion(manualValues.final_physicist_conclusion)) {
    failures.push("Final medical physicist conclusion is negative.");
  } else if (!hasPositiveConclusion(manualValues.final_physicist_conclusion)) {
    incomplete.push("Final medical physicist conclusion must be explicitly positive for PASS.");
  }

  if (!validationFlags.acceptanceIndexValidated) {
    incomplete.push("Acceptance Index is manual / validated phantom software required.");
  }
  if (!validationFlags.doseVerified) {
    incomplete.push("Dose compliance requires external dosimeter or medical physicist sign-off.");
  }
  if (!validationFlags.reconstructionTimeChecked) {
    incomplete.push("Reconstruction time must be checked separately.");
  }

  const uniqueFailures = [...new Set(failures)];
  const uniqueIncomplete = [...new Set(incomplete)];
  const status = uniqueFailures.length
    ? QA_STATUS.FAIL
    : uniqueIncomplete.length
      ? QA_STATUS.INCOMPLETE
      : QA_STATUS.PASS;

  return {
    status,
    label: status,
    tone: status === QA_STATUS.PASS ? "emerald" : status === QA_STATUS.FAIL ? "rose" : "amber",
    failures: uniqueFailures,
    incomplete: uniqueIncomplete,
    warnings,
    dicomChecks: dicom.checks,
    consistencyIssues: consistency.issues,
  };
}
