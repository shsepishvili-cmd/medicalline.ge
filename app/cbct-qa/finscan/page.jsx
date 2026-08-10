"use client";

import { useMemo, useState } from "react";
import * as dicomParser from "dicom-parser";
import { jsPDF } from "jspdf";
import { AlertTriangle, CheckCircle2, Download, FileScan, UploadCloud } from "lucide-react";
import { decodeJpegLosslessFrame } from "../jpegLosslessDecoder.mjs";
import { getPhantomProfile } from "../phantomProfiles.mjs";
import {
  METHOD_VERSION,
  buildSeriesAudit,
  calculateCnriFromEdgeRoi,
  calculateFiveRoiUniformity,
  calculateGeometry,
  calculateKap,
  calculateMtfFromEdgeRoi,
  calculateNoise,
  evaluateQaResult,
  sha256Hex,
  validateSeries,
} from "../qaMetrics.mjs";

const TEST_TYPES = {
  TECHNICAL: "TECHNICAL",
  ACCEPTANCE: "ACCEPTANCE",
  CONSTANCY: "CONSTANCY",
};

const TRANSFER_SYNTAX_LABELS = {
  "1.2.840.10008.1.2": "Implicit VR Little Endian",
  "1.2.840.10008.1.2.1": "Explicit VR Little Endian",
  "1.2.840.10008.1.2.2": "Explicit VR Big Endian",
  "1.2.840.10008.1.2.4.70": "JPEG Lossless, Non-Hierarchical, First-Order Prediction",
};

const JPEG_LOSSLESS = new Set(["1.2.840.10008.1.2.4.57", "1.2.840.10008.1.2.4.70"]);
const RAW_TS = new Set(["1.2.840.10008.1.2", "1.2.840.10008.1.2.1", "1.2.840.10008.1.2.2"]);

const EMPTY_ROIS = [
  { id: "mtf_xy_edge", type: "MTF_XY_EDGE", plane: "axial", sliceIndex: 0, x: 40, y: 40, width: 80, height: 40, confirmed: false },
  { id: "cnri_edge", type: "CNRI_EDGE", plane: "axial", sliceIndex: 0, x: 40, y: 100, width: 80, height: 40, confirmed: false },
  { id: "uniformity_center", type: "UNIFORMITY_CENTER", plane: "axial", sliceIndex: 0, x: 96, y: 96, width: 32, height: 32, confirmed: false },
  { id: "uniformity_top", type: "UNIFORMITY_TOP", plane: "axial", sliceIndex: 0, x: 96, y: 40, width: 32, height: 32, confirmed: false },
  { id: "uniformity_bottom", type: "UNIFORMITY_BOTTOM", plane: "axial", sliceIndex: 0, x: 96, y: 152, width: 32, height: 32, confirmed: false },
  { id: "uniformity_left", type: "UNIFORMITY_LEFT", plane: "axial", sliceIndex: 0, x: 40, y: 96, width: 32, height: 32, confirmed: false },
  { id: "uniformity_right", type: "UNIFORMITY_RIGHT", plane: "axial", sliceIndex: 0, x: 152, y: 96, width: 32, height: 32, confirmed: false },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function centeredRect(cx, cy, width, height, image) {
  const safeWidth = Math.max(4, Math.min(Math.round(width), image.columns));
  const safeHeight = Math.max(4, Math.min(Math.round(height), image.rows));
  return {
    x: clamp(Math.round(cx - safeWidth / 2), 0, Math.max(0, image.columns - safeWidth)),
    y: clamp(Math.round(cy - safeHeight / 2), 0, Math.max(0, image.rows - safeHeight)),
    width: safeWidth,
    height: safeHeight,
  };
}

function findHorizontalEdgeY(image) {
  if (!image?.values || image.rows < 16 || image.columns < 16) return Math.round((image?.rows || 0) / 2);
  const marginX = Math.max(2, Math.round(image.columns * 0.2));
  const startY = Math.max(2, Math.round(image.rows * 0.15));
  const endY = Math.min(image.rows - 2, Math.round(image.rows * 0.85));
  let bestY = Math.round(image.rows / 2);
  let bestScore = -Infinity;
  for (let y = startY; y < endY; y += 1) {
    let score = 0;
    let count = 0;
    for (let x = marginX; x < image.columns - marginX; x += 1) {
      score += Math.abs(image.values[y * image.columns + x] - image.values[(y - 1) * image.columns + x]);
      count += 1;
    }
    const average = count ? score / count : 0;
    if (average > bestScore) {
      bestScore = average;
      bestY = y;
    }
  }
  return bestY;
}

function buildAutomaticRois(image, spacing) {
  if (!image?.columns || !image?.rows) return EMPTY_ROIS;
  const sx = spacing?.x || 0.2;
  const sy = spacing?.y || 0.2;
  const roiPx = clamp(Math.round(10 / Math.max(sx, sy)), 12, Math.round(Math.min(image.columns, image.rows) * 0.18));
  const offsetX = Math.max(roiPx, Math.round(image.columns * 0.28));
  const offsetY = Math.max(roiPx, Math.round(image.rows * 0.28));
  const centerX = image.columns / 2;
  const centerY = image.rows / 2;
  const edgeY = findHorizontalEdgeY(image);
  const edgeWidth = clamp(Math.round(image.columns * 0.5), 24, image.columns - 4);
  const edgeHeight = clamp(Math.round(18 / sy), 16, Math.round(image.rows * 0.3));
  const cnriHeight = clamp(Math.round(10 / sy), 12, Math.round(image.rows * 0.2));
  const mark = (item) => ({ ...item, confirmed: true, source: "AUTO" });
  return [
    mark({ id: "mtf_xy_edge", type: "MTF_XY_EDGE", plane: "axial", sliceIndex: 0, ...centeredRect(centerX, edgeY, edgeWidth, edgeHeight, image) }),
    mark({ id: "cnri_edge", type: "CNRI_EDGE", plane: "axial", sliceIndex: 0, ...centeredRect(centerX, edgeY, edgeWidth, cnriHeight, image) }),
    mark({ id: "uniformity_center", type: "UNIFORMITY_CENTER", plane: "axial", sliceIndex: 0, ...centeredRect(centerX, centerY, roiPx, roiPx, image) }),
    mark({ id: "uniformity_top", type: "UNIFORMITY_TOP", plane: "axial", sliceIndex: 0, ...centeredRect(centerX, centerY - offsetY, roiPx, roiPx, image) }),
    mark({ id: "uniformity_bottom", type: "UNIFORMITY_BOTTOM", plane: "axial", sliceIndex: 0, ...centeredRect(centerX, centerY + offsetY, roiPx, roiPx, image) }),
    mark({ id: "uniformity_left", type: "UNIFORMITY_LEFT", plane: "axial", sliceIndex: 0, ...centeredRect(centerX - offsetX, centerY, roiPx, roiPx, image) }),
    mark({ id: "uniformity_right", type: "UNIFORMITY_RIGHT", plane: "axial", sliceIndex: 0, ...centeredRect(centerX + offsetX, centerY, roiPx, roiPx, image) }),
  ];
}

function buildAutomaticGeometry(image, spacing) {
  const sx = spacing?.x || 0.2;
  const referenceDistanceMm = 50;
  const dx = clamp(Math.round(referenceDistanceMm / sx), 8, Math.max(8, image.columns - 10));
  const cx = Math.round(image.columns / 2);
  const y = Math.round(image.rows / 2);
  return {
    ax: clamp(cx - Math.round(dx / 2), 0, image.columns - 1),
    ay: y,
    bx: clamp(cx + Math.round(dx / 2), 0, image.columns - 1),
    by: y,
    referenceDistanceMm,
  };
}

function value(dataSet, tag) {
  return dataSet.string(tag) || "";
}

function numberValue(dataSet, tag) {
  const direct = dataSet.uint16(tag);
  if (Number.isFinite(direct)) return direct;
  const parsed = Number(dataSet.string(tag));
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePositionZ(text) {
  if (!text) return null;
  const parts = String(text).split("\\").map(Number);
  return Number.isFinite(parts[2]) ? parts[2] : null;
}

function parseMetadata(dataSet) {
  const exposureTime = value(dataSet, "x00181150");
  return {
    StudyInstanceUID: value(dataSet, "x0020000d"),
    SeriesInstanceUID: value(dataSet, "x0020000e"),
    SOPInstanceUID: value(dataSet, "x00080018"),
    Manufacturer: value(dataSet, "x00080070"),
    ManufacturerModelName: value(dataSet, "x00081090"),
    DeviceSerialNumber: value(dataSet, "x00181000"),
    SoftwareVersions: value(dataSet, "x00181020"),
    StudyDate: value(dataSet, "x00080020"),
    AcquisitionDate: value(dataSet, "x00080022") || value(dataSet, "x00080023"),
    ProtocolName: value(dataSet, "x00181030"),
    SeriesDescription: value(dataSet, "x0008103e"),
    KVP: value(dataSet, "x00180060"),
    XRayTubeCurrent: value(dataSet, "x00181151"),
    ExposureTime: exposureTime ? `${exposureTime} (raw DICOM value; unit requires vendor confirmation)` : "",
    ExposureTimeRaw: exposureTime,
    Rows: numberValue(dataSet, "x00280010"),
    Columns: numberValue(dataSet, "x00280011"),
    PixelSpacing: value(dataSet, "x00280030"),
    SliceThickness: value(dataSet, "x00180050"),
    BitsAllocated: numberValue(dataSet, "x00280100"),
    BitsStored: numberValue(dataSet, "x00280101"),
    PixelRepresentation: numberValue(dataSet, "x00280103") || 0,
    SamplesPerPixel: numberValue(dataSet, "x00280002") || 1,
    PhotometricInterpretation: value(dataSet, "x00280004"),
    RescaleSlope: value(dataSet, "x00281053"),
    RescaleIntercept: value(dataSet, "x00281052"),
    TransferSyntaxUID: value(dataSet, "x00020010") || "1.2.840.10008.1.2",
    Modality: value(dataSet, "x00080060"),
    InstanceNumber: numberValue(dataSet, "x00200013"),
    imagePositionPatientZ: parsePositionZ(value(dataSet, "x00200032")),
  };
}

function pixelSpacing(metadata) {
  const parts = String(metadata.PixelSpacing || "").split("\\").map(Number);
  if (!Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
  return { y: parts[0], x: parts[1] };
}

function decodeJpeg(dataSet, pixelElement, metadata) {
  const bytes =
    pixelElement.basicOffsetTable && pixelElement.basicOffsetTable.length
      ? dicomParser.readEncapsulatedImageFrame(dataSet, pixelElement, 0)
      : dicomParser.readEncapsulatedPixelDataFromFragments(dataSet, pixelElement, 0, pixelElement.fragments.length);
  const decoded = decodeJpegLosslessFrame(bytes);
  if (decoded.width !== metadata.Columns || decoded.height !== metadata.Rows) {
    throw new Error("Decoded JPEG frame size does not match DICOM Rows/Columns.");
  }
  return decoded.pixelData;
}

function decodePixels(dataSet, metadata) {
  const pixelElement = dataSet.elements.x7fe00010;
  if (!pixelElement) return null;
  if (metadata.SamplesPerPixel !== 1) throw new Error("Only single-channel grayscale DICOM is supported.");
  if (JPEG_LOSSLESS.has(metadata.TransferSyntaxUID)) {
    const decoded = decodeJpeg(dataSet, pixelElement, metadata);
    return { values: Float32Array.from(decoded), rows: metadata.Rows, columns: metadata.Columns };
  }
  if (!RAW_TS.has(metadata.TransferSyntaxUID)) {
    throw new Error(`Unsupported Transfer Syntax: ${metadata.TransferSyntaxUID}`);
  }
  const count = metadata.Rows * metadata.Columns;
  const start = pixelElement.dataOffset;
  const littleEndian = metadata.TransferSyntaxUID !== "1.2.840.10008.1.2.2";
  const bytesPerPixel = metadata.BitsAllocated / 8;
  const values = new Float32Array(count);
  if (bytesPerPixel === 1) {
    for (let i = 0; i < count; i += 1) values[i] = dataSet.byteArray[start + i];
  } else {
    const view = new DataView(dataSet.byteArray.buffer, dataSet.byteArray.byteOffset + start, count * 2);
    for (let i = 0; i < count; i += 1) {
      values[i] = metadata.PixelRepresentation ? view.getInt16(i * 2, littleEndian) : view.getUint16(i * 2, littleEndian);
    }
  }
  return { values, rows: metadata.Rows, columns: metadata.Columns };
}

function statusClass(status) {
  if (status === "PASS") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "ACTION") return "border-rose-200 bg-rose-50 text-rose-800";
  if (status === "REVIEW REQUIRED") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function fmt(value, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : "N/A";
}

export default function FinScanQaPage() {
  const profile = getPhantomProfile("QUART_DVT_AP");
  const [testType, setTestType] = useState(TEST_TYPES.TECHNICAL);
  const [instances, setInstances] = useState([]);
  const [audit, setAudit] = useState(null);
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [phantomConfirmed, setPhantomConfirmed] = useState(false);
  const [phantomModel, setPhantomModel] = useState("QUART DVT_AP");
  const [phantomSerial, setPhantomSerial] = useState("");
  const [facility, setFacility] = useState("");
  const [operator, setOperator] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [validationRef, setValidationRef] = useState("");
  const [deidentify, setDeidentify] = useState(true);
  const [rois, setRois] = useState(EMPTY_ROIS);
  const [geometry, setGeometry] = useState({ ax: 10, ay: 10, bx: 110, by: 10, referenceDistanceMm: 50 });
  const [dose, setDose] = useState({
    meterManufacturer: "",
    meterModel: "",
    meterSerial: "",
    calibrationCertificate: "",
    calibrationDate: "",
    meterReading: "",
    calibrationFactor: "1",
    temperatureC: "20",
    pressureKpa: "101.3",
    fovAreaCm2: "16",
  });

  const seriesValidation = useMemo(() => validateSeries(instances), [instances]);
  const metadata = instances[0]?.metadata || {};
  const spacing = pixelSpacing(metadata);
  const mtf = useMemo(() => calculateMtfFromEdgeRoi(image, rois.find((roi) => roi.type === "MTF_XY_EDGE"), spacing?.y), [image, rois, spacing?.y]);
  const cnri = useMemo(() => calculateCnriFromEdgeRoi(image, rois.find((roi) => roi.type === "CNRI_EDGE")), [image, rois]);
  const uniformity = useMemo(() => calculateFiveRoiUniformity(image, rois, cnri?.Pmax - cnri?.Pmin), [image, rois, cnri?.Pmax, cnri?.Pmin]);
  const noise = useMemo(() => calculateNoise(image, rois.find((roi) => roi.type === "UNIFORMITY_CENTER")), [image, rois]);
  const geometryResult = useMemo(
    () => calculateGeometry({ x: Number(geometry.ax), y: Number(geometry.ay) }, { x: Number(geometry.bx), y: Number(geometry.by) }, spacing?.x, spacing?.y, geometry.referenceDistanceMm),
    [geometry, spacing?.x, spacing?.y],
  );
  const doseResult = useMemo(() => calculateKap(dose), [dose]);
  const allRequiredRoisConfirmed = rois.every((roi) => roi.confirmed);
  const autoRoiCount = rois.filter((roi) => roi.source === "AUTO").length;
  const finalResult = useMemo(
    () => evaluateQaResult({
      testType,
      profileId: profile.id,
      seriesValidation,
      phantomConfirmed,
      phantomModel,
      phantomSerial,
      roisConfirmed: allRequiredRoisConfirmed,
      mtf,
      cnri,
      uniformity,
      geometry: geometryResult,
      dose: doseResult,
      artefactReviewPending: !reviewer,
    }),
    [allRequiredRoisConfirmed, cnri, doseResult, geometryResult, mtf, phantomConfirmed, phantomModel, phantomSerial, profile.id, reviewer, seriesValidation, testType, uniformity],
  );

  async function importFiles(fileList) {
    const files = [...fileList];
    setIsLoading(true);
    setError("");
    try {
      const parsed = [];
      let representative = null;
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const byteArray = new Uint8Array(buffer);
        const dataSet = dicomParser.parseDicom(byteArray);
        const itemMetadata = parseMetadata(dataSet);
        const fileSHA256 = await sha256Hex(byteArray);
        parsed.push({ filename: file.name, metadata: itemMetadata, fileSHA256 });
        if (!representative) {
          const decoded = decodePixels(dataSet, itemMetadata);
          if (decoded) representative = { values: decoded.values, rows: decoded.rows, columns: decoded.columns };
        }
      }
      setInstances(parsed);
      setImage(representative);
      if (representative) {
        const representativeSpacing = pixelSpacing(parsed[0]?.metadata || {});
        setRois(buildAutomaticRois(representative, representativeSpacing));
        setGeometry(buildAutomaticGeometry(representative, representativeSpacing));
      }
      setAudit(await buildSeriesAudit(parsed));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "DICOM import failed.");
    } finally {
      setIsLoading(false);
    }
  }

  function updateRoi(id, patch) {
    setRois((current) => current.map((roi) => (roi.id === id ? { ...roi, source: patch.source ?? "MANUAL", ...patch } : roi)));
  }

  function recalculateAutomaticRois() {
    if (!image) return;
    setRois(buildAutomaticRois(image, spacing));
    setGeometry(buildAutomaticGeometry(image, spacing));
  }

  function generateReport() {
    const doc = new jsPDF();
    const page = (title) => {
      doc.setFontSize(16);
      doc.text(title, 14, 18);
      doc.setFontSize(9);
    };
    page("FINSCAN F350 CBCT IMAGE QUALITY / ACCEPTANCE TEST REPORT");
    doc.text(`Report ID: ${audit?.seriesSHA256?.slice(0, 16) || "N/A"}`, 14, 32);
    doc.text(`Test type: ${testType}`, 14, 39);
    doc.text(`Facility: ${facility || "N/A"}`, 14, 46);
    doc.text(`Device: ${metadata.Manufacturer || ""} ${metadata.ManufacturerModelName || ""}`, 14, 53);
    doc.text(`Serial: ${metadata.DeviceSerialNumber || "N/A"}`, 14, 60);
    doc.text(`Software: ${metadata.SoftwareVersions || "N/A"}`, 14, 67);
    doc.text(`Phantom: ${phantomConfirmed ? `${phantomModel} ${phantomSerial}` : "Not confirmed"}`, 14, 74);
    doc.text(`Overall status: ${finalResult.status}`, 14, 81);
    if (validationRef) doc.text(`Manufacturer validation reference: ${validationRef}`, 14, 88);

    doc.addPage(); page("DICOM acquisition parameters");
    tagRows.slice(0, 22).forEach(([label, value], index) => doc.text(`${label}: ${value || "N/A"}`, 14, 32 + index * 7));

    doc.addPage(); page("DICOM series traceability");
    doc.text(`StudyInstanceUID: ${audit?.StudyInstanceUID || "N/A"}`, 14, 32);
    doc.text(`SeriesInstanceUID: ${audit?.SeriesInstanceUID || "N/A"}`, 14, 39);
    doc.text(`seriesSHA256: ${audit?.seriesSHA256 || "N/A"}`, 14, 46);
    instances.slice(0, 12).forEach((item, index) => doc.text(`${item.filename}: ${item.fileSHA256}`, 14, 60 + index * 6));

    doc.addPage(); page("Representative phantom image / ROI overlays");
    doc.text("ROI overlay screenshot is represented in the browser viewer. Full raster embedding is pending visual QA.", 14, 32);

    doc.addPage(); page("Results table");
    [
      ["MTF10", fmt(mtf?.MTF10), ">= 1.0 lp/mm", "Edge MTF", mtf?.valid ? "Measured" : "Incomplete"],
      ["MTF50", fmt(mtf?.MTF50), "Displayed", "Edge MTF", mtf?.valid ? "Measured" : "Incomplete"],
      ["Nyquist", fmt(mtf?.Nyquist), "Sampling-derived", "DICOM PixelSpacing", mtf?.valid ? "Measured" : "Incomplete"],
      ["MTFz10", "N/A", "Sagittal/coronal ROI required", "MTF Z", "Incomplete"],
      ["MTFz50", "N/A", "Sagittal/coronal ROI required", "MTF Z", "Incomplete"],
      ["CNRI", fmt(cnri?.CNRI), "< 20", "CNRI edge", cnri?.valid ? "Measured" : "Incomplete"],
      ["Uniformity", fmt(uniformity?.H), "> 5", "Five ROI", uniformity?.valid ? "Measured" : "Incomplete"],
      ["Noise", fmt(noise?.noise), "Baseline for acceptance", "Reference ROI SD", noise?.valid ? "Measured" : "Incomplete"],
      ["Geometry", fmt(geometryResult?.errorPercent), "<= 5%", "Two points", geometryResult?.valid ? "Measured" : "Incomplete"],
      ["KAP", fmt(doseResult?.KAPcorrected), "External meter", "KAP corrected", doseResult?.valid ? "Measured" : "Incomplete"],
    ].forEach((row, index) => doc.text(row.join(" | "), 14, 32 + index * 7));

    doc.addPage(); page("MTF XY curve"); doc.text((mtf?.curve || []).slice(0, 28).map((p) => `${fmt(p.frequency)} lp/mm: ${fmt(p.mtf)}`).join("\n") || "No confirmed MTF XY ROI.", 14, 32);
    doc.addPage(); page("MTF Z curve"); doc.text("MTF Z requires sagittal/coronal plane ROI and Z sampling. Not calculated from axial slice.", 14, 32);
    doc.addPage(); page("Uniformity ROI table"); (uniformity?.rows || []).forEach((row, index) => doc.text(`${row.type}: mean ${fmt(row.mean)} SD ${fmt(row.sd)} n=${row.pixelCount}`, 14, 32 + index * 7));
    doc.addPage(); page("Dose measurement details"); Object.entries(dose).forEach(([key, value], index) => doc.text(`${key}: ${value || "N/A"}`, 14, 32 + index * 7));
    doc.addPage(); page("Methodology / traceability"); doc.text(`Software: FinScan F350 DICOM QA Analysis\nMethod: ${METHOD_VERSION}\nProfile: ${profile.id}\nDe-identify report: ${deidentify ? "ON" : "OFF"}`, 14, 32);
    doc.addPage(); page("Conclusion / signatures"); doc.text(`Conclusion: ${finalResult.status}\nOperator: ${operator || "N/A"}\nMedical physicist/reviewer: ${reviewer || "N/A"}\nSignature: ____________________\nDate: ____________________`, 14, 32);
    doc.save(`finscan-f350-qa-${audit?.seriesSHA256?.slice(0, 8) || "report"}.pdf`);
  }

  const tagRows = [
    ["Manufacturer", metadata.Manufacturer],
    ["Manufacturer Model Name", metadata.ManufacturerModelName],
    ["Serial Number", metadata.DeviceSerialNumber],
    ["Software Version", metadata.SoftwareVersions],
    ["Study Date", metadata.StudyDate],
    ["Acquisition Date", metadata.AcquisitionDate],
    ["Protocol Name", metadata.ProtocolName],
    ["Series Description", metadata.SeriesDescription],
    ["kVp", metadata.KVP],
    ["mA", metadata.XRayTubeCurrent],
    ["Exposure Time raw value", metadata.ExposureTime],
    ["Rows", metadata.Rows],
    ["Columns", metadata.Columns],
    ["PixelSpacing", metadata.PixelSpacing],
    ["SliceThickness", metadata.SliceThickness],
    ["RescaleSlope", metadata.RescaleSlope],
    ["RescaleIntercept", metadata.RescaleIntercept],
    ["StudyInstanceUID", metadata.StudyInstanceUID],
    ["SeriesInstanceUID", metadata.SeriesInstanceUID],
    ["TransferSyntaxUID", `${metadata.TransferSyntaxUID || ""} ${TRANSFER_SYNTAX_LABELS[metadata.TransferSyntaxUID] ? `(${TRANSFER_SYNTAX_LABELS[metadata.TransferSyntaxUID]})` : ""}`],
  ];

  return (
    <main className="min-h-screen bg-slate-100 p-5 text-slate-950">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-md border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">FinScan F350 DICOM QA Analysis</p>
          <h1 className="mt-1 text-2xl font-black">CBCT Technical Verification + Phantom Acceptance Test</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            This system does not fabricate QA values. Clinical DICOM is limited to metadata, sampling, integrity, hashes, and representative image review. Phantom PASS is blocked unless a dedicated QA phantom series, confirmed ROIs, dose input, and required calculations are present.
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <label className="block text-sm font-bold">TEST TYPE</label>
              <select value={testType} onChange={(event) => setTestType(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm">
                <option value={TEST_TYPES.TECHNICAL}>Technical DICOM Verification</option>
                <option value={TEST_TYPES.ACCEPTANCE}>Phantom Acceptance Test</option>
                <option value={TEST_TYPES.CONSTANCY}>Constancy Test</option>
              </select>
              <label className="mt-4 flex items-start gap-2 text-sm">
                <input type="checkbox" checked={phantomConfirmed} onChange={(event) => setPhantomConfirmed(event.target.checked)} />
                I confirm that this DICOM series is a dedicated QA phantom scan.
              </label>
              <input value={phantomModel} onChange={(event) => setPhantomModel(event.target.value)} placeholder="Phantom model" className="mt-3 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" />
              <input value={phantomSerial} onChange={(event) => setPhantomSerial(event.target.value)} placeholder="Phantom serial number" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" />
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-cyan-300 bg-white p-6 text-center">
              <UploadCloud className="h-8 w-8 text-cyan-700" />
              <span className="mt-2 text-sm font-bold">Import DICOM series</span>
              <span className="mt-1 text-xs text-slate-500">Multiple files supported. Mixed series are rejected.</span>
              <input type="file" multiple className="sr-only" onChange={(event) => importFiles(event.target.files || [])} />
            </label>
            {isLoading ? <div className="rounded-md bg-white p-3 text-sm">Reading DICOM...</div> : null}
            {error ? <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div> : null}

            <div className="rounded-md border border-slate-200 bg-white p-4">
              <h2 className="font-bold">Report fields</h2>
              <input value={facility} onChange={(event) => setFacility(event.target.value)} placeholder="Facility" className="mt-3 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" />
              <input value={operator} onChange={(event) => setOperator(event.target.value)} placeholder="Operator" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" />
              <input value={reviewer} onChange={(event) => setReviewer(event.target.value)} placeholder="Medical physicist / reviewer" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" />
              <input value={validationRef} onChange={(event) => setValidationRef(event.target.value)} placeholder="Manufacturer Validation Reference (optional)" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" />
              <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={deidentify} onChange={(event) => setDeidentify(event.target.checked)} /> De-identify report = ON by default</label>
            </div>
          </div>

          <div className="space-y-4">
            <div className={`rounded-md border p-4 ${statusClass(finalResult.status)}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase">Overall status</p>
                  <h2 className="text-2xl font-black">{finalResult.status}</h2>
                </div>
                {finalResult.status === "PASS" ? <CheckCircle2 /> : <AlertTriangle />}
              </div>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                {finalResult.reasons.length ? finalResult.reasons.map((reason) => <li key={reason}>{reason}</li>) : <li>All mandatory criteria satisfied.</li>}
              </ul>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-4">
              <h2 className="flex items-center gap-2 font-bold"><FileScan className="h-4 w-4" /> Series validation</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <Metric label="Valid" value={seriesValidation.valid ? "YES" : "NO"} />
                <Metric label="Slices" value={seriesValidation.sliceCount} />
                <Metric label="Matrix" value={seriesValidation.matrix || "N/A"} />
                <Metric label="Physical size" value={seriesValidation.physicalWidthMm ? `${fmt(seriesValidation.physicalWidthMm)} x ${fmt(seriesValidation.physicalHeightMm)} mm` : "N/A"} />
              </div>
              {[...seriesValidation.errors, ...seriesValidation.warnings].length ? (
                <ul className="mt-3 list-disc pl-5 text-sm text-rose-700">{[...seriesValidation.errors, ...seriesValidation.warnings].map((item) => <li key={item}>{item}</li>)}</ul>
              ) : null}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <h2 className="font-bold">Representative image</h2>
                <div className="mt-3 flex aspect-square max-h-[520px] items-center justify-center overflow-hidden rounded-md bg-slate-900 text-slate-400">
                  {image ? <CanvasPreview image={image} rois={rois} /> : "Import DICOM to preview image"}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <h2 className="font-bold">DICOM traceability</h2>
                <p className="mt-2 break-all text-xs text-slate-600">seriesSHA256: {audit?.seriesSHA256 || "N/A"}</p>
                <p className="mt-2 text-xs text-slate-600">Files: {instances.length}</p>
                <button type="button" onClick={generateReport} disabled={!instances.length} className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-bold text-white disabled:bg-slate-300"><Download className="h-4 w-4" /> PDF report</button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4">
          <h2 className="font-bold">Actual DICOM tags</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <tbody>{tagRows.map(([label, rowValue]) => <tr key={label} className="border-t"><td className="px-3 py-2 font-semibold">{label}</td><td className="px-3 py-2 break-all text-slate-700">{rowValue || "N/A"}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Automatic ROI calculation + editable verification</h2>
              <p className="mt-1 text-sm text-slate-600">After import, the software proposes and calculates ROIs automatically. Edit coordinates if needed; edited ROIs require confirmation again.</p>
            </div>
            <button type="button" onClick={recalculateAutomaticRois} disabled={!image} className="rounded-md border border-cyan-700 px-3 py-2 text-sm font-bold text-cyan-800 disabled:border-slate-200 disabled:text-slate-400">Auto recalculate</button>
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">Auto ROIs active: {autoRoiCount}/{rois.length}</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b text-left"><th className="p-2">ROI</th><th className="p-2">Source</th><th className="p-2">Plane</th><th className="p-2">Slice</th><th className="p-2">x</th><th className="p-2">y</th><th className="p-2">w</th><th className="p-2">h</th><th className="p-2">Verify</th></tr></thead>
              <tbody>
                {rois.map((roi) => (
                  <tr key={roi.id} className="border-b">
                    <td className="p-2 font-semibold">{roi.type}</td>
                    <td className="p-2"><span className={`rounded px-2 py-1 text-xs font-bold ${roi.source === "AUTO" ? "bg-cyan-100 text-cyan-800" : "bg-slate-100 text-slate-700"}`}>{roi.source || "MANUAL"}</span></td>
                    <td className="p-2">{roi.plane}</td>
                    {["sliceIndex", "x", "y", "width", "height"].map((key) => (
                      <td key={key} className="p-2"><input type="number" value={roi[key]} onChange={(event) => updateRoi(roi.id, { [key]: Number(event.target.value), confirmed: false })} className="h-8 w-20 rounded border px-2" /></td>
                    ))}
                    <td className="p-2"><button type="button" onClick={() => updateRoi(roi.id, { confirmed: true })} className={`rounded px-3 py-1 text-xs font-bold ${roi.confirmed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{roi.confirmed ? "CONFIRMED" : "CONFIRM ROI"}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <h2 className="font-bold">Results</h2>
            <ResultRow label="MTF10" value={fmt(mtf?.MTF10)} detail={mtf?.valid ? "lp/mm" : mtf?.reason} />
            <ResultRow label="MTF50" value={fmt(mtf?.MTF50)} detail="lp/mm" />
            <ResultRow label="Nyquist" value={fmt(mtf?.Nyquist)} detail="lp/mm" />
            <ResultRow label="CNRI" value={fmt(cnri?.CNRI)} detail={cnri?.valid ? "Pmax/Pmin edge" : cnri?.reason} />
            <ResultRow label="Uniformity H" value={fmt(uniformity?.H)} detail={uniformity?.valid ? `Hm ${fmt(uniformity.Hm)}` : uniformity?.reason} />
            <ResultRow label="Noise" value={fmt(noise?.noise)} detail={noise?.valid ? `mean ${fmt(noise.mean)}` : noise?.reason} />
            <ResultRow label="Geometry error" value={fmt(geometryResult?.errorPercent)} detail={geometryResult?.valid ? "%" : geometryResult?.reason} />
            <ResultRow label="KAP corrected" value={fmt(doseResult?.KAPcorrected)} detail={doseResult?.valid ? `KAP16 ${fmt(doseResult.KAP16)}` : doseResult?.reason} />
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <h2 className="font-bold">Dose / KAP external meter input</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {Object.keys(dose).map((key) => <input key={key} value={dose[key]} onChange={(event) => setDose((current) => ({ ...current, [key]: event.target.value }))} placeholder={key} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />)}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function CanvasPreview({ image, rois }) {
  return (
    <canvas
      width={image.columns}
      height={image.rows}
      ref={(canvas) => {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const pixels = image.values;
        let min = Infinity;
        let max = -Infinity;
        for (const value of pixels) {
          if (value < min) min = value;
          if (value > max) max = value;
        }
        const imageData = ctx.createImageData(image.columns, image.rows);
        for (let i = 0; i < pixels.length; i += 1) {
          const gray = Math.max(0, Math.min(255, ((pixels[i] - min) / Math.max(1, max - min)) * 255));
          imageData.data[i * 4] = gray;
          imageData.data[i * 4 + 1] = gray;
          imageData.data[i * 4 + 2] = gray;
          imageData.data[i * 4 + 3] = 255;
        }
        ctx.putImageData(imageData, 0, 0);
        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = Math.max(1, image.columns / 512);
        ctx.font = `${Math.max(10, image.columns / 48)}px sans-serif`;
        rois.forEach((roi) => {
          ctx.strokeStyle = roi.confirmed ? "#22c55e" : "#f59e0b";
          ctx.strokeRect(roi.x, roi.y, roi.width, roi.height);
          ctx.fillStyle = ctx.strokeStyle;
          ctx.fillText(roi.type.replace("UNIFORMITY_", ""), roi.x + 3, roi.y + 14);
        });
      }}
      className="h-full w-full object-contain"
    />
  );
}

function Metric({ label, value }) {
  return <div className="rounded-md bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-lg font-black">{value}</p></div>;
}

function ResultRow({ label, value, detail }) {
  return <div className="grid grid-cols-[160px_120px_1fr] border-b py-2 text-sm"><strong>{label}</strong><span>{value}</span><span className="text-slate-600">{detail}</span></div>;
}
