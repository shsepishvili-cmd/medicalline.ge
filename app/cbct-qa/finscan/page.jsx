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
  ScanLine,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import {
  QA_METHOD_VERSION,
  calculateCnri,
  calculateEdgeMtf,
  calculateUniformityIndex,
  correctedKap,
  normalizeKapTo16Cm2,
} from "../qaMetrics.mjs";

const SOFTWARE_VERSION = "FinScan-F350-QA-0.2.0";
const SUPPORTED_TRANSFER_SYNTAXES = new Set([
  "1.2.840.10008.1.2",
  "1.2.840.10008.1.2.1",
  "1.2.840.10008.1.2.2",
]);

const ROI_LABELS = {
  mtf: "MTF PVC / Air edge",
  cnri: "CNRI PVC / PMMA edge",
  center: "Uniformity Center",
  top: "Uniformity Top",
  left: "Uniformity Left",
  right: "Uniformity Right",
  bottom: "Uniformity Bottom",
};

const ROI_COLORS = {
  mtf: "#f59e0b",
  cnri: "#2563eb",
  center: "#10b981",
  top: "#10b981",
  left: "#10b981",
  right: "#10b981",
  bottom: "#10b981",
};

function text(ds, tag) {
  try {
    return ds.string(tag) || "";
  } catch {
    return "";
  }
}

function u16(ds, tag) {
  try {
    const value = ds.uint16(tag);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function numberValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSpacing(value) {
  const parts = String(value || "")
    .split("\\")
    .map(numberValue)
    .filter((v) => Number.isFinite(v) && v > 0);
  if (!parts.length) return null;
  if (parts.length === 1) return { row: parts[0], col: parts[0] };
  return { row: parts[0], col: parts[1] };
}

function formatDicomDate(value) {
  const v = String(value || "");
  if (!/^\d{8}$/.test(v)) return v || "N/A";
  return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
}

async function sha256ArrayBuffer(buffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Text(value) {
  const bytes = new TextEncoder().encode(String(value));
  return sha256ArrayBuffer(bytes.buffer);
}

function decodePixels(ds, metadata) {
  const pixelElement = ds.elements.x7fe00010;
  if (!pixelElement) throw new Error("DICOM Pixel Data (7FE0,0010) is missing.");
  if (!SUPPORTED_TRANSFER_SYNTAXES.has(metadata.transferSyntax)) {
    throw new Error(`Compressed/unsupported Transfer Syntax: ${metadata.transferSyntax || "unknown"}`);
  }
  if (!metadata.rows || !metadata.columns) throw new Error("Rows/Columns are missing.");
  if (metadata.samplesPerPixel !== 1) throw new Error("Only single-channel grayscale DICOM is supported.");
  if (![8, 16].includes(metadata.bitsAllocated)) throw new Error(`Unsupported Bits Allocated: ${metadata.bitsAllocated}`);

  const count = metadata.rows * metadata.columns;
  const bytesPerPixel = metadata.bitsAllocated / 8;
  const expected = count * bytesPerPixel;
  if ((pixelElement.length || 0) < expected) throw new Error("Pixel Data is shorter than expected.");

  const values = new Float32Array(count);
  const start = pixelElement.dataOffset;
  const source = ds.byteArray;
  const slope = numberValue(metadata.rescaleSlope) ?? 1;
  const intercept = numberValue(metadata.rescaleIntercept) ?? 0;
  let min = Infinity;
  let max = -Infinity;

  if (metadata.bitsAllocated === 8) {
    for (let i = 0; i < count; i += 1) {
      const raw = source[start + i];
      const value = raw * slope + intercept;
      values[i] = value;
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  } else {
    const littleEndian = metadata.transferSyntax !== "1.2.840.10008.1.2.2";
    const view = new DataView(source.buffer, source.byteOffset + start, expected);
    for (let i = 0; i < count; i += 1) {
      const offset = i * 2;
      const raw = metadata.pixelRepresentation === 1 ? view.getInt16(offset, littleEndian) : view.getUint16(offset, littleEndian);
      const value = raw * slope + intercept;
      values[i] = value;
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }

  return { values, min, max };
}

async function parseDicomFile(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const ds = dicomParser.parseDicom(bytes);
  const metadata = {
    fileName: file.name,
    fileSize: file.size,
    transferSyntax: text(ds, "x00020010"),
    studyDate: text(ds, "x00080020"),
    acquisitionDate: text(ds, "x00080022"),
    institutionName: text(ds, "x00080080"),
    manufacturer: text(ds, "x00080070"),
    model: text(ds, "x00081090"),
    seriesDescription: text(ds, "x0008103e"),
    protocolName: text(ds, "x00181030"),
    serialNumber: text(ds, "x00181000"),
    softwareVersions: text(ds, "x00181020"),
    studyUid: text(ds, "x0020000d"),
    seriesUid: text(ds, "x0020000e"),
    instanceNumber: numberValue(text(ds, "x00200013")),
    imagePositionPatient: text(ds, "x00200032"),
    rows: u16(ds, "x00280010"),
    columns: u16(ds, "x00280011"),
    samplesPerPixel: u16(ds, "x00280002") || 1,
    bitsAllocated: u16(ds, "x00280100"),
    bitsStored: u16(ds, "x00280101"),
    pixelRepresentation: u16(ds, "x00280103") || 0,
    photometricInterpretation: text(ds, "x00280004") || "MONOCHROME2",
    pixelSpacing: text(ds, "x00280030"),
    sliceThickness: text(ds, "x00180050"),
    kvp: text(ds, "x00180060"),
    exposureTime: text(ds, "x00181150"),
    tubeCurrent: text(ds, "x00181151"),
    exposure: text(ds, "x00181152"),
    rescaleIntercept: text(ds, "x00281052"),
    rescaleSlope: text(ds, "x00281053"),
  };
  const pixels = decodePixels(ds, metadata);
  const hash = await sha256ArrayBuffer(buffer);
  return { file, metadata, ...pixels, hash };
}

function sortSeries(images) {
  return [...images].sort((a, b) => {
    const ai = a.metadata.instanceNumber;
    const bi = b.metadata.instanceNumber;
    if (Number.isFinite(ai) && Number.isFinite(bi)) return ai - bi;
    const az = Number(String(a.metadata.imagePositionPatient || "").split("\\").pop());
    const bz = Number(String(b.metadata.imagePositionPatient || "").split("\\").pop());
    if (Number.isFinite(az) && Number.isFinite(bz)) return az - bz;
    return a.metadata.fileName.localeCompare(b.metadata.fileName);
  });
}

function cropRect(image, roi) {
  if (!image || !roi) return null;
  const x0 = Math.max(0, Math.round(roi.x - roi.w / 2));
  const y0 = Math.max(0, Math.round(roi.y - roi.h / 2));
  const x1 = Math.min(image.metadata.columns, Math.round(roi.x + roi.w / 2));
  const y1 = Math.min(image.metadata.rows, Math.round(roi.y + roi.h / 2));
  const width = Math.max(0, x1 - x0);
  const height = Math.max(0, y1 - y0);
  if (!width || !height) return null;
  const pixels = new Float32Array(width * height);
  let i = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) pixels[i++] = image.values[y * image.metadata.columns + x];
  }
  return { pixels, width, height, x0, y0 };
}

function circleStats(image, roi) {
  if (!image || !roi) return null;
  const radius = roi.r;
  const minX = Math.max(0, Math.floor(roi.x - radius));
  const maxX = Math.min(image.metadata.columns - 1, Math.ceil(roi.x + radius));
  const minY = Math.max(0, Math.floor(roi.y - radius));
  const maxY = Math.min(image.metadata.rows - 1, Math.ceil(roi.y + radius));
  let count = 0;
  let sum = 0;
  let sumSq = 0;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x + 0.5 - roi.x;
      const dy = y + 0.5 - roi.y;
      if (dx * dx + dy * dy <= radius * radius) {
        const v = image.values[y * image.metadata.columns + x];
        count += 1;
        sum += v;
        sumSq += v * v;
      }
    }
  }
  if (!count) return null;
  const mean = sum / count;
  const variance = Math.max(0, sumSq / count - mean * mean);
  return { count, mean, stdDev: Math.sqrt(variance) };
}

function fixed(value, digits = 2) {
  return Number.isFinite(value) ? Number(value).toFixed(digits) : "N/A";
}

function statusTone(status) {
  if (status === "PASS") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (status === "ACTION") return "bg-rose-50 text-rose-800 border-rose-200";
  return "bg-amber-50 text-amber-800 border-amber-200";
}

function safePdfText(value) {
  return String(value ?? "").replace(/[–—]/g, "-").replace(/·/g, "*");
}

export default function FinScanF350QaPage() {
  const canvasRef = useRef(null);
  const [series, setSeries] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [seriesHash, setSeriesHash] = useState("");
  const [activeRoi, setActiveRoi] = useState("mtf");
  const [roiMm, setRoiMm] = useState({ mtfW: 5, mtfH: 8, cnriW: 10, cnriH: 8, uniformityD: 18 });
  const [rois, setRois] = useState({});
  const [report, setReport] = useState({
    facility: "",
    address: "",
    operator: "",
    physicist: "",
    phantomType: "QUART DVT_AP / DVTap",
    phantomSerial: "",
    manufacturerValidationRef: "",
    comments: "",
  });
  const [dose, setDose] = useState({ meterReading: "", calibrationFactor: "1", temperatureC: "20", pressureKpa: "101.3", fovWidthCm: "4", fovHeightCm: "4", meterModel: "", meterSerial: "", calibrationCertificate: "" });

  const image = series[selectedIndex] || null;
  const spacing = useMemo(() => parseSpacing(image?.metadata?.pixelSpacing), [image]);

  const handleFiles = useCallback(async (files) => {
    const list = [...files];
    if (!list.length) return;
    setLoading(true);
    setError("");
    try {
      const parsed = [];
      for (const file of list) parsed.push(await parseDicomFile(file));
      const sorted = sortSeries(parsed);
      const uids = [...new Set(sorted.map((x) => x.metadata.seriesUid).filter(Boolean))];
      if (uids.length > 1) throw new Error("Selected files contain more than one SeriesInstanceUID. Please upload one CBCT series at a time.");
      const digest = await sha256Text(sorted.map((x) => x.hash).join(""));
      setSeries(sorted);
      setSelectedIndex(Math.floor(sorted.length / 2));
      setSeriesHash(digest);
      setRois({});
      const m = sorted[Math.floor(sorted.length / 2)]?.metadata || {};
      setReport((prev) => ({ ...prev, facility: prev.facility || m.institutionName || "" }));
    } catch (e) {
      setError(e?.message || "Unable to read DICOM series.");
      setSeries([]);
      setSeriesHash("");
    } finally {
      setLoading(false);
    }
  }, []);

  const roiTemplates = useMemo(() => {
    if (!image || !spacing) return {};
    const pxW = (mm) => Math.max(4, Math.round(mm / spacing.col));
    const pxH = (mm) => Math.max(4, Math.round(mm / spacing.row));
    return {
      mtf: { type: "rect", w: pxW(roiMm.mtfW), h: pxH(roiMm.mtfH) },
      cnri: { type: "rect", w: pxW(roiMm.cnriW), h: pxH(roiMm.cnriH) },
      center: { type: "circle", r: Math.max(3, Math.round(roiMm.uniformityD / spacing.col / 2)) },
      top: { type: "circle", r: Math.max(3, Math.round(roiMm.uniformityD / spacing.col / 2)) },
      left: { type: "circle", r: Math.max(3, Math.round(roiMm.uniformityD / spacing.col / 2)) },
      right: { type: "circle", r: Math.max(3, Math.round(roiMm.uniformityD / spacing.col / 2)) },
      bottom: { type: "circle", r: Math.max(3, Math.round(roiMm.uniformityD / spacing.col / 2)) },
    };
  }, [image, spacing, roiMm]);

  const placeRoi = useCallback((event) => {
    if (!image || !canvasRef.current || !roiTemplates[activeRoi]) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * image.metadata.columns;
    const y = ((event.clientY - rect.top) / rect.height) * image.metadata.rows;
    setRois((prev) => ({ ...prev, [activeRoi]: { ...roiTemplates[activeRoi], x, y } }));
  }, [image, activeRoi, roiTemplates]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    canvas.width = image.metadata.columns;
    canvas.height = image.metadata.rows;
    const ctx = canvas.getContext("2d");
    const imgData = ctx.createImageData(canvas.width, canvas.height);
    const range = Math.max(1, image.max - image.min);
    const invert = String(image.metadata.photometricInterpretation).toUpperCase() === "MONOCHROME1";
    for (let i = 0; i < image.values.length; i += 1) {
      let g = Math.max(0, Math.min(255, Math.round(((image.values[i] - image.min) / range) * 255)));
      if (invert) g = 255 - g;
      const p = i * 4;
      imgData.data[p] = g;
      imgData.data[p + 1] = g;
      imgData.data[p + 2] = g;
      imgData.data[p + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    ctx.lineWidth = Math.max(1.5, canvas.width / 350);
    ctx.font = `${Math.max(11, canvas.width / 45)}px sans-serif`;
    Object.entries(rois).forEach(([key, roi]) => {
      if (!roi) return;
      ctx.strokeStyle = ROI_COLORS[key] || "#ef4444";
      ctx.fillStyle = ROI_COLORS[key] || "#ef4444";
      if (roi.type === "rect") ctx.strokeRect(roi.x - roi.w / 2, roi.y - roi.h / 2, roi.w, roi.h);
      else {
        ctx.beginPath();
        ctx.arc(roi.x, roi.y, roi.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillText(ROI_LABELS[key] || key, roi.x + 5, Math.max(14, roi.y - 6));
    });
  }, [image, rois]);

  const calculations = useMemo(() => {
    if (!image || !spacing) return null;
    const mtfCrop = cropRect(image, rois.mtf);
    const cnriCrop = cropRect(image, rois.cnri);
    const mtf = mtfCrop ? calculateEdgeMtf({ ...mtfCrop, pixelSpacingMm: spacing.row }) : null;
    const cnri = cnriCrop ? calculateCnri(cnriCrop) : null;
    const uniformityStats = {
      center: circleStats(image, rois.center),
      top: circleStats(image, rois.top),
      left: circleStats(image, rois.left),
      right: circleStats(image, rois.right),
      bottom: circleStats(image, rois.bottom),
    };
    const allUniformity = Object.values(uniformityStats).every(Boolean);
    const uniformity = allUniformity && cnri?.valid
      ? calculateUniformityIndex({
          center: uniformityStats.center.mean,
          top: uniformityStats.top.mean,
          left: uniformityStats.left.mean,
          right: uniformityStats.right.mean,
          bottom: uniformityStats.bottom.mean,
          contrastNumerator: Math.abs(cnri.pMax - cnri.pMin),
        })
      : null;

    const corrected = correctedKap({
      meterReading: numberValue(dose.meterReading),
      calibrationFactor: numberValue(dose.calibrationFactor),
      temperatureC: numberValue(dose.temperatureC),
      pressureKpa: numberValue(dose.pressureKpa),
    });
    const area = (numberValue(dose.fovWidthCm) || 0) * (numberValue(dose.fovHeightCm) || 0);
    const normalizedKap = normalizeKapTo16Cm2({ correctedKapValue: corrected, fovAreaCm2: area });

    const checks = [
      { label: "Spatial resolution MTF10", value: mtf?.mtf10, unit: "lp/mm", rule: ">= 1.00", pass: Number.isFinite(mtf?.mtf10) && mtf.mtf10 >= 1 },
      { label: "CNRI", value: cnri?.cnri, unit: "", rule: "< 20", pass: Number.isFinite(cnri?.cnri) && cnri.cnri < 20 },
      { label: "Uniformity Index H", value: uniformity?.index, unit: "", rule: "> 5", pass: (Number.isFinite(uniformity?.index) || uniformity?.index === Infinity) && uniformity.index > 5 },
    ];
    const imageStatus = checks.some((c) => !Number.isFinite(c.value) && c.value !== Infinity) ? "INCOMPLETE" : checks.every((c) => c.pass) ? "PASS" : "ACTION";
    const doseStatus = Number.isFinite(normalizedKap) ? (normalizedKap <= 250 ? "PASS" : "ACTION") : "INCOMPLETE";
    const overallStatus = imageStatus === "ACTION" || doseStatus === "ACTION" ? "ACTION" : imageStatus === "PASS" && doseStatus === "PASS" ? "PASS" : "INCOMPLETE";
    return { mtf, cnri, uniformity, uniformityStats, correctedKap: corrected, normalizedKap, checks, imageStatus, doseStatus, overallStatus };
  }, [image, spacing, rois, dose]);

  const modelLooksF350 = useMemo(() => {
    const value = `${image?.metadata?.model || ""} ${image?.metadata?.seriesDescription || ""} ${image?.metadata?.protocolName || ""}`;
    return /finscan|f350/i.test(value);
  }, [image]);

  const generatePdf = useCallback(() => {
    if (!image || !calculations) return;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageW = 210;
    const margin = 14;
    let y = 16;
    const addPageIfNeeded = (need = 16) => {
      if (y + need > 282) {
        doc.addPage();
        y = 16;
      }
    };
    const line = (label, value) => {
      addPageIfNeeded(7);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text(safePdfText(label), margin, y);
      doc.setFont("helvetica", "normal");
      const wrapped = doc.splitTextToSize(safePdfText(value || "N/A"), 122);
      doc.text(wrapped, 72, y);
      y += Math.max(6, wrapped.length * 4);
    };
    const section = (title) => {
      addPageIfNeeded(12);
      y += 3;
      doc.setFillColor(236, 248, 255);
      doc.rect(margin, y - 5, pageW - margin * 2, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 74, 110);
      doc.setFontSize(10);
      doc.text(safePdfText(title), margin + 2, y);
      doc.setTextColor(0, 0, 0);
      y += 7;
    };

    const reportId = `F350-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${seriesHash.slice(0, 8).toUpperCase() || "NOHASH"}`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(13, 91, 126);
    doc.text("FINSCAN F350", margin, y);
    y += 7;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("DICOM Image Quality Acceptance / QA Report", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Generated from the imported DICOM series and documented QA measurements", margin, y);
    y += 8;

    const status = calculations.overallStatus;
    const color = status === "PASS" ? [16, 135, 91] : status === "ACTION" ? [190, 24, 93] : [180, 120, 20];
    doc.setFillColor(...color);
    doc.roundedRect(margin, y, 55, 11, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`STATUS: ${status}`, margin + 4, y + 7);
    doc.setTextColor(0, 0, 0);
    y += 17;

    line("Report ID", reportId);
    line("Facility", report.facility || image.metadata.institutionName);
    line("Address", report.address);
    line("Test operator", report.operator);
    line("Medical physicist / reviewer", report.physicist || "Pending authority / physicist review");
    line("Phantom", `${report.phantomType}${report.phantomSerial ? ` / S/N ${report.phantomSerial}` : ""}`);
    line("Software", `${SOFTWARE_VERSION}; calculation engine ${QA_METHOD_VERSION}`);
    line("Manufacturer validation reference", report.manufacturerValidationRef || "Not supplied / pending manufacturer confirmation");

    section("1. DICOM equipment and acquisition data");
    line("Manufacturer", image.metadata.manufacturer);
    line("Model", image.metadata.model);
    line("Device serial number", image.metadata.serialNumber);
    line("Software version", image.metadata.softwareVersions);
    line("Study / acquisition date", `${formatDicomDate(image.metadata.studyDate)} / ${formatDicomDate(image.metadata.acquisitionDate)}`);
    line("Series / protocol", `${image.metadata.seriesDescription || "N/A"} / ${image.metadata.protocolName || "N/A"}`);
    line("Matrix", `${image.metadata.columns} x ${image.metadata.rows}`);
    line("Pixel spacing", image.metadata.pixelSpacing || "N/A");
    line("Slice thickness", image.metadata.sliceThickness || "N/A");
    line("kVp / mA / exposure time", `${image.metadata.kvp || "N/A"} kV / ${image.metadata.tubeCurrent || "N/A"} mA / ${image.metadata.exposureTime || "N/A"} ms`);
    line("StudyInstanceUID", image.metadata.studyUid);
    line("SeriesInstanceUID", image.metadata.seriesUid);
    line("DICOM files in series", String(series.length));
    line("Series SHA-256 digest", seriesHash);

    section("2. Quantitative image-quality results");
    const rows = [
      ["MTF 10%", `${fixed(calculations.mtf?.mtf10, 3)} lp/mm`, ">= 1.00 lp/mm", calculations.checks[0].pass ? "PASS" : "ACTION/INCOMPLETE"],
      ["MTF 50%", `${fixed(calculations.mtf?.mtf50, 3)} lp/mm`, "reported value", Number.isFinite(calculations.mtf?.mtf50) ? "MEASURED" : "INCOMPLETE"],
      ["Nyquist frequency", `${fixed(calculations.mtf?.nyquist, 3)} lp/mm`, "sampling limit", Number.isFinite(calculations.mtf?.nyquist) ? "MEASURED" : "INCOMPLETE"],
      ["CNRI", fixed(calculations.cnri?.cnri, 3), "< 20", calculations.checks[1].pass ? "PASS" : "ACTION/INCOMPLETE"],
      ["Uniformity Index H", calculations.uniformity?.index === Infinity ? "Infinity" : fixed(calculations.uniformity?.index, 3), "> 5", calculations.checks[2].pass ? "PASS" : "ACTION/INCOMPLETE"],
    ];
    doc.setFontSize(8);
    const col = [margin, 66, 112, 153];
    ["Parameter", "Measured", "Criterion", "Result"].forEach((h, i) => {
      doc.setFont("helvetica", "bold");
      doc.text(h, col[i], y);
    });
    y += 5;
    rows.forEach((r) => {
      addPageIfNeeded(6);
      r.forEach((v, i) => {
        doc.setFont("helvetica", i === 3 ? "bold" : "normal");
        doc.text(safePdfText(v), col[i], y);
      });
      y += 5;
    });
    y += 2;
    line("Image quality status", calculations.imageStatus);

    if (canvasRef.current) {
      addPageIfNeeded(92);
      section("3. Selected DICOM slice with QA ROIs");
      try {
        const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.86);
        const maxW = 175;
        const ratio = canvasRef.current.height / canvasRef.current.width;
        const h = Math.min(135, maxW * ratio);
        doc.addImage(dataUrl, "JPEG", margin, y, maxW, h);
        y += h + 6;
      } catch {
        line("Image capture", "Unable to embed canvas image in PDF.");
      }
    }

    section("4. ROI traceability and raw derived values");
    Object.entries(rois).forEach(([key, roi]) => {
      if (!roi) return;
      const geometry = roi.type === "rect" ? `center=(${fixed(roi.x, 1)}, ${fixed(roi.y, 1)}) px; size=${roi.w}x${roi.h} px` : `center=(${fixed(roi.x, 1)}, ${fixed(roi.y, 1)}) px; radius=${roi.r} px`;
      line(ROI_LABELS[key] || key, geometry);
    });
    if (calculations.cnri?.valid) {
      line("CNRI edge values", `Pmax=${fixed(calculations.cnri.pMax, 3)}; Pmin=${fixed(calculations.cnri.pMin, 3)}; SDmax=${fixed(calculations.cnri.sMax, 3)}; SDmin=${fixed(calculations.cnri.sMin, 3)}`);
    }
    Object.entries(calculations.uniformityStats || {}).forEach(([key, value]) => {
      if (value) line(`Uniformity ${key}`, `mean=${fixed(value.mean, 3)}; SD=${fixed(value.stdDev, 3)}; n=${value.count}`);
    });

    if (calculations.mtf?.curve?.length) {
      addPageIfNeeded(75);
      section("5. MTF curve");
      const x0 = margin + 8;
      const y0 = y + 55;
      const w = 155;
      const h = 50;
      doc.setDrawColor(120);
      doc.line(x0, y0, x0 + w, y0);
      doc.line(x0, y0, x0, y0 - h);
      const maxF = calculations.mtf.nyquist || 1;
      doc.setDrawColor(13, 91, 126);
      for (let i = 1; i < calculations.mtf.curve.length; i += 1) {
        const a = calculations.mtf.curve[i - 1];
        const b = calculations.mtf.curve[i];
        doc.line(x0 + (a.frequency / maxF) * w, y0 - a.mtf * h, x0 + (b.frequency / maxF) * w, y0 - b.mtf * h);
      }
      doc.setFontSize(7);
      doc.text("0", x0 - 2, y0 + 4);
      doc.text(fixed(maxF, 2), x0 + w - 5, y0 + 4);
      doc.text("1.0", x0 - 8, y0 - h + 2);
      doc.text("Spatial frequency (lp/mm)", x0 + 55, y0 + 9);
      y = y0 + 14;
    }

    section("6. Radiation output / KAP measurement");
    line("KAP meter", `${dose.meterModel || "N/A"}${dose.meterSerial ? ` / S/N ${dose.meterSerial}` : ""}`);
    line("Calibration certificate", dose.calibrationCertificate || "N/A");
    line("Raw meter reading", dose.meterReading ? `${dose.meterReading} mGy*cm2` : "Not entered");
    line("Calibration factor Nk", dose.calibrationFactor || "N/A");
    line("Temperature / pressure", `${dose.temperatureC || "N/A"} C / ${dose.pressureKpa || "N/A"} kPa`);
    line("Corrected KAP", Number.isFinite(calculations.correctedKap) ? `${fixed(calculations.correctedKap, 3)} mGy*cm2` : "Not calculated");
    line("FOV used for normalization", `${dose.fovWidthCm || "N/A"} x ${dose.fovHeightCm || "N/A"} cm`);
    line("Normalized KAP to 16 cm2", Number.isFinite(calculations.normalizedKap) ? `${fixed(calculations.normalizedKap, 3)} mGy*cm2` : "Not calculated");
    line("Dose status", calculations.doseStatus);

    section("7. Method and interpretation");
    line("MTF method", calculations.mtf?.method || "Not calculated");
    line("CNRI method", calculations.cnri?.method || "Not calculated");
    line("Uniformity method", calculations.uniformity?.method || "Not calculated");
    line("Method basis", "Published dental-CBCT QA methodology using QUART DVT_AP-style phantom analysis; EFOMP-ESTRO-IAEA CBCT QA concepts; DIN 6868-161 concepts. Local authority acceptance criteria must be confirmed independently.");
    line("Comments", report.comments);

    section("8. Regulatory review statement");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const statement = "This document is an automatically generated technical measurement report from imported DICOM pixel data plus explicitly identified user-entered phantom/dosimetry data. It is designed to make the source data, ROI positions, calculation method version, criteria and traceability visible to the reviewing authority. It does not claim manufacturer certification or regulatory approval unless a separate manufacturer/authority validation reference is supplied.";
    const wrapped = doc.splitTextToSize(statement, 178);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 4 + 10;
    addPageIfNeeded(30);
    doc.line(margin, y, 85, y);
    doc.line(115, y, 196, y);
    y += 5;
    doc.setFontSize(8);
    doc.text("Test operator / engineer", margin, y);
    doc.text("Medical physicist / authority reviewer", 115, y);

    doc.save(`${reportId}.pdf`);
  }, [image, calculations, report, dose, rois, series.length, seriesHash]);

  const metadataRows = image ? [
    ["Manufacturer", image.metadata.manufacturer],
    ["Model", image.metadata.model],
    ["Serial", image.metadata.serialNumber],
    ["Study date", formatDicomDate(image.metadata.studyDate)],
    ["Series", image.metadata.seriesDescription || image.metadata.protocolName],
    ["Matrix", `${image.metadata.columns} x ${image.metadata.rows}`],
    ["Pixel spacing", image.metadata.pixelSpacing],
    ["kVp / mA / ms", `${image.metadata.kvp || "N/A"} / ${image.metadata.tubeCurrent || "N/A"} / ${image.metadata.exposureTime || "N/A"}`],
  ] : [];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-cyan-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-cyan-700"><ShieldCheck className="h-6 w-6" /><span className="text-sm font-semibold uppercase tracking-[0.18em]">FinScan F350 QA</span></div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">DICOM Acceptance / QA Report Builder</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Imports the actual reconstructed DICOM series, measures the selected phantom ROIs, calculates MTF/CNRI/uniformity from pixel data, records external KAP-meter data, and exports a traceable PDF for technical/regulatory review.</p>
            </div>
            <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${statusTone(calculations?.overallStatus || "INCOMPLETE")}`}>
              Overall: {calculations?.overallStatus || "INCOMPLETE"}
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            This report can document real measurements for agency review, but it must not be described as manufacturer-developed or officially approved unless Eighteeth / the competent authority provides a separate written validation reference.
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><UploadCloud className="h-5 w-5 text-cyan-700" />1. Import FinScan F350 DICOM series</h2>
          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-cyan-200 bg-cyan-50/50 px-5 py-8 text-center hover:bg-cyan-50">
            <input type="file" accept=".dcm,application/dicom" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            <FileScan className="h-8 w-8 text-cyan-700" />
            <span className="mt-2 font-semibold">Choose one reconstructed CBCT DICOM series</span>
            <span className="mt-1 text-xs text-slate-500">Multiple .dcm files are supported; files must belong to one SeriesInstanceUID.</span>
          </label>
          {loading && <p className="mt-3 text-sm text-cyan-700">Reading DICOM pixel data and calculating SHA-256 traceability hash…</p>}
          {error && <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
          {series.length > 0 && (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3 text-sm"><b>Files:</b> {series.length}</div>
              <div className="rounded-lg bg-slate-50 p-3 text-sm"><b>Selected slice:</b> {selectedIndex + 1}/{series.length}</div>
              <div className="rounded-lg bg-slate-50 p-3 text-sm"><b>Series hash:</b> {seriesHash.slice(0, 16)}…</div>
            </div>
          )}
        </section>

        {image && (
          <>
            <section className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-lg font-semibold"><ScanLine className="h-5 w-5 text-cyan-700" />2. Select analysis slice and ROIs</h2>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${modelLooksF350 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{modelLooksF350 ? "F350 metadata detected" : "Verify model manually"}</span>
                </div>
                {series.length > 1 && (
                  <div className="mt-4">
                    <input type="range" min="0" max={series.length - 1} value={selectedIndex} onChange={(e) => setSelectedIndex(Number(e.target.value))} className="w-full" />
                    <div className="mt-1 flex justify-between text-xs text-slate-500"><span>Slice 1</span><span>Selected {selectedIndex + 1}</span><span>Slice {series.length}</span></div>
                  </div>
                )}
                <div className="mt-4 overflow-auto rounded-xl bg-black p-2">
                  <canvas ref={canvasRef} onClick={placeRoi} className="mx-auto block max-h-[680px] w-full cursor-crosshair object-contain" />
                </div>
                <p className="mt-2 text-xs text-slate-500">Choose a ROI type below, then click its correct position on the phantom image. The report stores the ROI coordinates.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.keys(ROI_LABELS).map((key) => (
                    <button key={key} type="button" onClick={() => setActiveRoi(key)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${activeRoi === key ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-200 bg-white text-slate-700"}`}>{ROI_LABELS[key]}</button>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <label className="text-xs font-semibold text-slate-600">MTF ROI W x H (mm)<div className="mt-1 flex gap-1"><input value={roiMm.mtfW} onChange={(e) => setRoiMm((p) => ({ ...p, mtfW: Number(e.target.value) }))} type="number" step="0.5" className="w-full rounded-md border p-2" /><input value={roiMm.mtfH} onChange={(e) => setRoiMm((p) => ({ ...p, mtfH: Number(e.target.value) }))} type="number" step="0.5" className="w-full rounded-md border p-2" /></div></label>
                  <label className="text-xs font-semibold text-slate-600">CNRI ROI W x H (mm)<div className="mt-1 flex gap-1"><input value={roiMm.cnriW} onChange={(e) => setRoiMm((p) => ({ ...p, cnriW: Number(e.target.value) }))} type="number" step="0.5" className="w-full rounded-md border p-2" /><input value={roiMm.cnriH} onChange={(e) => setRoiMm((p) => ({ ...p, cnriH: Number(e.target.value) }))} type="number" step="0.5" className="w-full rounded-md border p-2" /></div></label>
                  <label className="text-xs font-semibold text-slate-600">Uniformity ROI diameter (mm)<input value={roiMm.uniformityD} onChange={(e) => setRoiMm((p) => ({ ...p, uniformityD: Number(e.target.value) }))} type="number" step="1" className="mt-1 w-full rounded-md border p-2" /></label>
                </div>
              </div>

              <div className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold">DICOM source data</h2>
                  <div className="mt-3 space-y-2 text-sm">
                    {metadataRows.map(([k, v]) => <div key={k} className="grid grid-cols-[125px_1fr] gap-2 border-b border-slate-100 pb-2"><span className="font-semibold text-slate-600">{k}</span><span className="break-all">{v || "N/A"}</span></div>)}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="flex items-center gap-2 text-lg font-semibold"><Activity className="h-5 w-5 text-cyan-700" />Image-quality calculations</h2>
                  <div className="mt-4 space-y-3">
                    {[
                      ["MTF 10%", calculations?.mtf?.mtf10, "lp/mm", ">= 1.00", calculations?.checks?.[0]?.pass],
                      ["MTF 50%", calculations?.mtf?.mtf50, "lp/mm", "report", Number.isFinite(calculations?.mtf?.mtf50)],
                      ["Nyquist", calculations?.mtf?.nyquist, "lp/mm", "sampling", Number.isFinite(calculations?.mtf?.nyquist)],
                      ["CNRI", calculations?.cnri?.cnri, "", "< 20", calculations?.checks?.[1]?.pass],
                      ["Uniformity H", calculations?.uniformity?.index, "", "> 5", calculations?.checks?.[2]?.pass],
                    ].map(([label, value, unit, rule, pass]) => (
                      <div key={label} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-slate-200 p-3">
                        <div><div className="font-semibold">{label}</div><div className="text-xs text-slate-500">Criterion: {rule}</div></div>
                        <div className="text-right"><div className="font-mono text-base font-bold">{value === Infinity ? "Infinity" : fixed(value, 3)} {unit}</div><div className={`text-xs font-semibold ${pass ? "text-emerald-700" : Number.isFinite(value) ? "text-rose-700" : "text-amber-700"}`}>{pass ? "PASS" : Number.isFinite(value) ? "ACTION / REVIEW" : "ROI REQUIRED"}</div></div>
                      </div>
                    ))}
                  </div>
                  <div className={`mt-4 rounded-lg border px-3 py-2 text-sm font-semibold ${statusTone(calculations?.imageStatus || "INCOMPLETE")}`}>Image quality: {calculations?.imageStatus || "INCOMPLETE"}</div>
                </section>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">3. External KAP / dose-meter data</h2>
                <p className="mt-2 text-sm text-slate-600">DICOM alone cannot independently verify radiation output. Enter calibrated meter data here; the raw values and correction inputs are printed in the report.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    ["meterReading", "KAP meter reading (mGy·cm²)"], ["calibrationFactor", "Calibration factor Nk"], ["temperatureC", "Temperature (°C)"], ["pressureKpa", "Pressure (kPa)"], ["fovWidthCm", "FOV width (cm)"], ["fovHeightCm", "FOV height (cm)"], ["meterModel", "Meter model"], ["meterSerial", "Meter serial"], ["calibrationCertificate", "Calibration certificate"],
                  ].map(([key, label]) => <label key={key} className="text-xs font-semibold text-slate-600">{label}<input value={dose[key]} onChange={(e) => setDose((p) => ({ ...p, [key]: e.target.value }))} className="mt-1 w-full rounded-md border border-slate-200 p-2 text-sm font-normal text-slate-900" /></label>)}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs font-semibold text-slate-500">Corrected KAP</div><div className="mt-1 font-mono font-bold">{fixed(calculations?.correctedKap, 3)} mGy·cm²</div></div>
                  <div className={`rounded-lg border p-3 ${statusTone(calculations?.doseStatus || "INCOMPLETE")}`}><div className="text-xs font-semibold">Normalized to 16 cm²</div><div className="mt-1 font-mono font-bold">{fixed(calculations?.normalizedKap, 3)} mGy·cm²</div><div className="text-xs">Criterion ≤ 250</div></div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">4. Report identification</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    ["facility", "Facility / clinic"], ["address", "Address"], ["operator", "Test operator / engineer"], ["physicist", "Medical physicist / reviewer"], ["phantomType", "Phantom type"], ["phantomSerial", "Phantom serial"], ["manufacturerValidationRef", "Manufacturer validation reference"],
                  ].map(([key, label]) => <label key={key} className="text-xs font-semibold text-slate-600">{label}<input value={report[key]} onChange={(e) => setReport((p) => ({ ...p, [key]: e.target.value }))} className="mt-1 w-full rounded-md border border-slate-200 p-2 text-sm font-normal text-slate-900" /></label>)}
                </div>
                <label className="mt-3 block text-xs font-semibold text-slate-600">Comments<textarea rows={4} value={report.comments} onChange={(e) => setReport((p) => ({ ...p, comments: e.target.value }))} className="mt-1 w-full rounded-md border border-slate-200 p-2 text-sm font-normal text-slate-900" /></label>
                <button type="button" onClick={generatePdf} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-3 font-semibold text-white hover:bg-cyan-800"><Download className="h-5 w-5" />Generate agency-review PDF from this DICOM data</button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
              <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><b className="text-slate-900">Report scope:</b> the generated PDF is intentionally transparent: DICOM identifiers, SHA-256 series digest, ROI coordinates, raw derived values, calculation engine version, criteria and external meter inputs are shown so the authority can review the actual basis of the result. A final regulatory acceptance decision remains with the competent authority / qualified medical physicist.</div></div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
