export function setupThumbObserver(
  renderThumb: (seriesUID: string, canvas: HTMLCanvasElement) => void,
) {
  const IO: typeof IntersectionObserver | undefined =
    typeof IntersectionObserver !== "undefined" ? IntersectionObserver : undefined;
  const io = IO
    ? new IO(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              const el = e.target as HTMLElement;
              const uid = el.getAttribute("data-uid");
              if (!uid) continue;
              const canvas = document.createElement("canvas");
              canvas.width = 64;
              canvas.height = 64;
              ensureCanvas2DAPI(canvas);
              renderThumb(uid, canvas);
              // simple replace
              el.innerHTML = "";
              el.appendChild(canvas);
              io?.unobserve(el);
            }
          }
        },
        { rootMargin: "128px" },
      )
    : null;

  return {
    observe(container: HTMLElement) {
      const nodes = container.querySelectorAll<HTMLElement>(".thumb[data-uid]");
      if (io) {
        nodes.forEach((n) => io.observe(n));
      } else {
        // Fallback: batch rendering to avoid jank in large manifests
        console.warn(
          "IntersectionObserver is unavailable. Rendering thumbnails in batches; large manifests may render slowly.",
        );
        try {
          showNotification(
            "IntersectionObserver unavailable; thumbnails will render in batches and may be slower.",
            "warning",
          );
        } catch {}
        const BATCH_SIZE = 10;
        const BATCH_DELAY = 50; // ms
        const items: HTMLElement[] = Array.from(nodes);
        let idx = 0;
        const renderBatch = () => {
          const end = Math.min(idx + BATCH_SIZE, items.length);
          for (; idx < end; idx++) {
            const el = items[idx];
            const uid = el.getAttribute("data-uid");
            if (!uid) continue;
            const canvas = document.createElement("canvas");
            canvas.width = 64;
            canvas.height = 64;
            ensureCanvas2DAPI(canvas);
            renderThumb(uid, canvas);
            el.innerHTML = "";
            el.appendChild(canvas);
          }
          if (idx < items.length) setTimeout(renderBatch, BATCH_DELAY);
        };
        renderBatch();
      }
    },
    disconnect() {
      io?.disconnect();
    },
  };
}

// Real renderer using dcmjs + representative file registry
import dcmjs from "dcmjs";
import { showNotification } from "@src/ui-react/util/notify";
import { type RepRegistry, getRepresentativeFileForSeriesScoped } from "@core/seriesStore";
import {
  tryDecodePixelData,
  ensureDefaultDecodersRegistered,
} from "@src/ui-react/util/pixelDecoders";

// Minimal dataset adapter to avoid relying on any private dcmjs APIs
type DicomDatasetLite = {
  rows: number;
  cols: number;
  bitsAllocated: number; // 8 or 16 supported
  samplesPerPixel: number; // 1 or 3
  planarConfiguration: 0 | 1; // for RGB/YBR when samplesPerPixel===3
  photometricInterpretation: string; // MONOCHROME1/2, RGB, YBR_FULL
  windowCenter?: number;
  windowWidth?: number;
  rescaleSlope?: number;
  rescaleIntercept?: number;
  // First frame pixel data view
  pixel: Uint8Array | Uint16Array;
};

function asNumber(v: unknown): number | undefined {
  let raw: unknown = v;
  if (Array.isArray(v)) raw = v.length ? v[0] : undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function asUpperString(v: unknown): string {
  if (v == null) return "";
  let raw: unknown = v;
  if (Array.isArray(v)) raw = v.length ? v[0] : "";
  try {
    return String(raw).toUpperCase();
  } catch {
    return "";
  }
}

function toUint8ArrayLike(v: any): Uint8Array | undefined {
  if (!v) return undefined;
  if (v instanceof Uint8Array) return v;
  if (v instanceof ArrayBuffer) return new Uint8Array(v);
  if (Array.isArray(v) && v[0] instanceof Uint8Array) return v[0];
  if (
    v.buffer instanceof ArrayBuffer &&
    typeof v.byteOffset === "number" &&
    typeof v.byteLength === "number"
  )
    return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  return undefined;
}

function toUint16ArrayLike(v: any): Uint16Array | undefined {
  if (!v) return undefined;
  if (v instanceof Uint16Array) return v;
  if (v instanceof ArrayBuffer) return new Uint16Array(v);
  if (Array.isArray(v) && v[0] instanceof Uint16Array) return v[0];
  if (
    v.buffer instanceof ArrayBuffer &&
    typeof v.byteOffset === "number" &&
    typeof v.byteLength === "number"
  ) {
    const byteLen = v.byteLength - (v.byteLength % 2);
    return new Uint16Array(v.buffer, v.byteOffset, byteLen / 2);
  }
  return undefined;
}

function buildDicomDatasetLite(natural: any): DicomDatasetLite | null {
  const rows = asNumber(natural?.Rows) ?? 0;
  const cols = asNumber(natural?.Columns) ?? 0;
  const bitsAllocated = asNumber(natural?.BitsAllocated) ?? 0;
  const samplesPerPixel = asNumber(natural?.SamplesPerPixel) ?? 1;
  const planarConfiguration = (asNumber(natural?.PlanarConfiguration) ?? 0) as 0 | 1;
  const photometricInterpretation = asUpperString(natural?.PhotometricInterpretation);
  if (!rows || !cols || (bitsAllocated !== 8 && bitsAllocated !== 16)) return null;

  const pd = natural?.PixelData;
  let pixel: Uint8Array | Uint16Array | undefined;
  if (bitsAllocated === 8) pixel = toUint8ArrayLike(pd);
  else if (bitsAllocated === 16) pixel = toUint16ArrayLike(pd);
  if (!pixel) return null;

  let windowCenter = asNumber(natural?.WindowCenter);
  let windowWidth = asNumber(natural?.WindowWidth);
  // Normalize WC/WW if arrays or invalid
  if (windowWidth != null && windowWidth <= 0) windowWidth = undefined;
  const rescaleSlope = asNumber(natural?.RescaleSlope);
  const rescaleIntercept = asNumber(natural?.RescaleIntercept);

  // Validate pixel buffer length vs expected
  const expectedPixels = rows * cols * samplesPerPixel;
  if (bitsAllocated === 8 && (pixel as Uint8Array).length < expectedPixels) return null;
  if (bitsAllocated === 16 && (pixel as Uint16Array).length < rows * cols) return null;

  return {
    rows,
    cols,
    bitsAllocated,
    samplesPerPixel,
    planarConfiguration,
    photometricInterpretation,
    windowCenter,
    windowWidth,
    rescaleSlope,
    rescaleIntercept,
    pixel,
  };
}

function clamp255(n: number): number {
  if (n < 0) return 0;
  if (n > 255) return 255;
  return n;
}

function ycbcrToRgb(y: number, cb: number, cr: number): [number, number, number] {
  const Cb = cb - 128;
  const Cr = cr - 128;
  const r = clamp255(y + 1.402 * Cr);
  const g = clamp255(y - 0.344136 * Cb - 0.714136 * Cr);
  const b = clamp255(y + 1.772 * Cb);
  return [r | 0, g | 0, b | 0];
}

function renderMono8(ds: DicomDatasetLite, imageData: ImageData) {
  const src = ds.pixel as Uint8Array;
  const total = ds.rows * ds.cols;
  const limit = Math.min(total, src.length);
  const invert = ds.photometricInterpretation === "MONOCHROME1";
  for (let i = 0; i < limit; i++) {
    let v = src[i] ?? 0;
    if (invert) v = 255 - v;
    imageData.data[i * 4 + 0] = v;
    imageData.data[i * 4 + 1] = v;
    imageData.data[i * 4 + 2] = v;
    imageData.data[i * 4 + 3] = 255;
  }
}

function renderMono16Windowed(ds: DicomDatasetLite, imageData: ImageData) {
  const src16 = ds.pixel as Uint16Array;
  const total = ds.rows * ds.cols;
  const lim = Math.min(total, src16.length);
  const slope = ds.rescaleSlope ?? 1;
  const intercept = ds.rescaleIntercept ?? 0;
  const invert = ds.photometricInterpretation === "MONOCHROME1";
  const c = ds.windowCenter as number;
  const w = ds.windowWidth as number;
  const lo = c - w / 2;
  const hi = c + w / 2;
  const denom = Math.max(1e-6, hi - lo);
  for (let i = 0; i < lim; i++) {
    const rescaled = src16[i] * slope + intercept;
    let clamped = rescaled;
    if (clamped < lo) clamped = lo;
    else if (clamped > hi) clamped = hi;
    let v = Math.round(((clamped - lo) / denom) * 255);
    if (invert) v = 255 - v;
    imageData.data[i * 4 + 0] = v;
    imageData.data[i * 4 + 1] = v;
    imageData.data[i * 4 + 2] = v;
    imageData.data[i * 4 + 3] = 255;
  }
}

function renderMono16Normalized(ds: DicomDatasetLite, imageData: ImageData) {
  const src16 = ds.pixel as Uint16Array;
  const total = ds.rows * ds.cols;
  const lim = Math.min(total, src16.length);
  const slope = ds.rescaleSlope ?? 1;
  const intercept = ds.rescaleIntercept ?? 0;
  const invert = ds.photometricInterpretation === "MONOCHROME1";
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < lim; i++) {
    const val = src16[i] * slope + intercept;
    if (val < min) min = val;
    if (val > max) max = val;
  }
  const range = Math.max(1e-6, max - min);
  for (let i = 0; i < lim; i++) {
    const val = src16[i] * slope + intercept;
    let v = Math.round(((val - min) / range) * 255);
    if (invert) v = 255 - v;
    imageData.data[i * 4 + 0] = v;
    imageData.data[i * 4 + 1] = v;
    imageData.data[i * 4 + 2] = v;
    imageData.data[i * 4 + 3] = 255;
  }
}

function renderMono16(ds: DicomDatasetLite, imageData: ImageData) {
  if (ds.windowCenter != null && ds.windowWidth != null && ds.windowWidth > 0) {
    renderMono16Windowed(ds, imageData);
  } else {
    renderMono16Normalized(ds, imageData);
  }
}

function renderRgbInterleaved(src: Uint8Array, imageData: ImageData, total: number) {
  const lim = Math.min(total, Math.floor(src.length / 3));
  for (let i = 0; i < lim; i++) {
    const r = src[i * 3 + 0] ?? 0;
    const g = src[i * 3 + 1] ?? 0;
    const b = src[i * 3 + 2] ?? 0;
    imageData.data[i * 4 + 0] = r;
    imageData.data[i * 4 + 1] = g;
    imageData.data[i * 4 + 2] = b;
    imageData.data[i * 4 + 3] = 255;
  }
}

function renderYbrInterleaved(src: Uint8Array, imageData: ImageData, total: number) {
  const lim = Math.min(total, Math.floor(src.length / 3));
  for (let i = 0; i < lim; i++) {
    const Y = src[i * 3 + 0] ?? 0;
    const Cb = src[i * 3 + 1] ?? 128;
    const Cr = src[i * 3 + 2] ?? 128;
    const [r, g, b] = ycbcrToRgb(Y, Cb, Cr);
    imageData.data[i * 4 + 0] = r;
    imageData.data[i * 4 + 1] = g;
    imageData.data[i * 4 + 2] = b;
    imageData.data[i * 4 + 3] = 255;
  }
}

function renderRgbPlanar(src: Uint8Array, imageData: ImageData, total: number) {
  const lim = Math.min(total, Math.floor(src.length / 3));
  const planeSize = lim;
  for (let i = 0; i < lim; i++) {
    const r = src[i] ?? 0;
    const g = src[planeSize + i] ?? 0;
    const b = src[planeSize * 2 + i] ?? 0;
    imageData.data[i * 4 + 0] = r;
    imageData.data[i * 4 + 1] = g;
    imageData.data[i * 4 + 2] = b;
    imageData.data[i * 4 + 3] = 255;
  }
}

function renderYbrPlanar(src: Uint8Array, imageData: ImageData, total: number) {
  const lim = Math.min(total, Math.floor(src.length / 3));
  const planeSize = lim;
  for (let i = 0; i < lim; i++) {
    const Y = src[i] ?? 0;
    const Cb = src[planeSize + i] ?? 128;
    const Cr = src[planeSize * 2 + i] ?? 128;
    const [r, g, b] = ycbcrToRgb(Y, Cb, Cr);
    imageData.data[i * 4 + 0] = r;
    imageData.data[i * 4 + 1] = g;
    imageData.data[i * 4 + 2] = b;
    imageData.data[i * 4 + 3] = 255;
  }
}

function decodeIntoImageData(ds: DicomDatasetLite, imageData: ImageData): boolean {
  const {
    rows,
    cols,
    bitsAllocated,
    samplesPerPixel,
    planarConfiguration,
    photometricInterpretation,
  } = ds;
  const total = rows * cols;
  const pi = photometricInterpretation;
  const mono = pi === "MONOCHROME1" || pi === "MONOCHROME2" || pi === "";
  if (samplesPerPixel === 1 && mono) {
    if (bitsAllocated === 8) {
      renderMono8(ds, imageData);
      return true;
    }
    if (bitsAllocated === 16) {
      renderMono16(ds, imageData);
      return true;
    }
    return false;
  }
  if (samplesPerPixel === 3 && (pi === "RGB" || pi === "YBR_FULL")) {
    if (bitsAllocated !== 8) return false;
    const src = ds.pixel as Uint8Array;
    if (planarConfiguration === 0 && pi === "RGB") {
      renderRgbInterleaved(src, imageData, total);
      return true;
    }
    if (planarConfiguration === 0 && pi === "YBR_FULL") {
      renderYbrInterleaved(src, imageData, total);
      return true;
    }
    if (planarConfiguration === 1 && pi === "RGB") {
      renderRgbPlanar(src, imageData, total);
      return true;
    }
    if (planarConfiguration === 1 && pi === "YBR_FULL") {
      renderYbrPlanar(src, imageData, total);
      return true;
    }
    return false;
  }
  return false;
}

/**
 * In jsdom or minimal test environments, CanvasRenderingContext2D may be missing.
 * Provide a tiny polyfill for the functions used by tests to avoid crashes.
 */
function ensureCanvas2DAPI(canvas: HTMLCanvasElement) {
  // Only shim in tests or when explicitly enabled by a test flag
  const isTest = typeof process !== "undefined" && (process as any).env?.NODE_ENV === "test";
  const enabledFlag = (globalThis as any).__DTK_ENABLE_CANVAS_SHIM__ === true;
  if (!isTest && !enabledFlag) return;
  const anyCanvas = canvas as any;
  const makeStub = () => ({
    // no-op polyfill
    fillStyle: "#000",
    strokeStyle: "#000",
    font: "10px sans-serif",
    imageSmoothingEnabled: false,
    fillRect: () => {},
    clearRect: () => {},
    strokeRect: () => {},
    drawImage: () => {},
    fillText: () => {},
    createImageData: (w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    }),
    putImageData: () => {},
    scale: () => {},
    setTransform: () => {},
  });
  if (typeof anyCanvas.getContext !== "function") {
    anyCanvas.getContext = (_: string) => makeStub();
    return;
  }
  try {
    const orig = anyCanvas.getContext.bind(anyCanvas);
    anyCanvas.getContext = (type: string, ...args: any[]) => {
      const ctx: any = orig(type, ...args);
      if (type !== "2d") return ctx;
      if (!ctx || typeof ctx.fillRect !== "function") {
        // If there's no 2D context or it's too bare, return a stub
        return makeStub();
      }
      // If essential methods are missing, augment in-place so callers keep the same object
      if (typeof ctx.fillRect !== "function") ctx.fillRect = () => {};
      if (typeof ctx.clearRect !== "function") ctx.clearRect = () => {};
      if (typeof ctx.strokeRect !== "function") ctx.strokeRect = () => {};
      if (typeof ctx.drawImage !== "function") ctx.drawImage = () => {};
      if (typeof ctx.fillText !== "function") ctx.fillText = () => {};
      if (typeof ctx.createImageData !== "function")
        ctx.createImageData = (w: number, h: number) => ({
          data: new Uint8ClampedArray(w * h * 4),
          width: w,
          height: h,
        });
      if (typeof ctx.putImageData !== "function") ctx.putImageData = () => {};
      if (typeof ctx.scale !== "function") ctx.scale = () => {};
      if (typeof ctx.setTransform !== "function") ctx.setTransform = () => {};
      if (typeof ctx.fillStyle === "undefined") ctx.fillStyle = "#000";
      if (typeof ctx.strokeStyle === "undefined") ctx.strokeStyle = "#000";
      if (typeof ctx.font === "undefined") ctx.font = "10px sans-serif";
      if (typeof ctx.imageSmoothingEnabled === "undefined") ctx.imageSmoothingEnabled = false;
      return ctx;
    };
  } catch {
    // ignore
  }
}

export async function renderThumbFromDICOM(
  studyUID: string,
  seriesUID: string,
  canvas: HTMLCanvasElement,
  opts?: { repRegistry?: RepRegistry; testDataset?: any },
) {
  // Ensure 2D API exists even in jsdom before grabbing context
  ensureCanvas2DAPI(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  try {
    let dataset: any | null = null;
    // Test-only injection: allow passing a naturalized dataset directly, bypassing dcmjs file parsing
    const isTest = typeof process !== "undefined" && (process as any).env?.NODE_ENV === "test";
    if (isTest && opts?.testDataset) {
      dataset = opts.testDataset;
    } else {
      const file = opts?.repRegistry
        ? getRepresentativeFileForSeriesScoped(opts.repRegistry, studyUID, seriesUID)
        : undefined;
      if (!file) {
        drawFallback(seriesUID, canvas);
        return;
      }
      const ab = await fileToArrayBuffer(file as any);
      const dicomData = dcmjs.data.DicomMessage.readFile(ab);
      dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomData.dict);
    }
    // Build a typed, minimal dataset adapter from native PixelData first
    let ds = buildDicomDatasetLite(dataset);
    // If unavailable, try registered decoders
    if (!ds) {
      // Lazy-register default decoders in case none registered by app
      await ensureDefaultDecodersRegistered();
      const decoded = await tryDecodePixelData(new ArrayBuffer(0), dataset);
      if (decoded) {
        // Patch the dataset copy with decoded characteristics for building adapter
        dataset = {
          ...dataset,
          BitsAllocated: decoded.bitsAllocated,
          SamplesPerPixel: decoded.samplesPerPixel,
          PlanarConfiguration: decoded.planarConfiguration ?? 0,
          PixelData: decoded.pixel,
        };
        ds = buildDicomDatasetLite(dataset);
      }
    }
    if (!ds) {
      try {
        showNotification("Failed to decode DICOM pixel data for thumbnail.", "warning");
      } catch {}
      drawFallback(seriesUID, canvas);
      return;
    }
    // Prepare ImageData based on pixel format
    const { rows, cols } = ds;
    const imageData = ctx.createImageData(cols, rows);
    const ok = decodeIntoImageData(ds, imageData);
    if (!ok) {
      drawFallback(seriesUID, canvas);
      return;
    }
    // draw to temp and scale into canvas
    const off = document.createElement("canvas");
    off.width = cols;
    off.height = rows;
    // Ensure 2D API exists even in jsdom
    ensureCanvas2DAPI(off);
    const octx = off.getContext("2d")!;
    octx.putImageData(imageData, 0, 0);
    // Fit into 64x64
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / cols, canvas.height / rows);
    const w = cols * scale;
    const h = rows * scale;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;
    ctx.drawImage(off, x, y, w, h);
    ctx.strokeStyle = "#2a2";
    ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
  } catch (e) {
    // On any error, log and draw fallback
    console.warn("renderThumbFromDICOM failed", e);
    try {
      showNotification("Thumbnail render failed; using placeholder.", "warning");
    } catch {}
    drawFallback(seriesUID, canvas);
  }
}

// Test-only exports (also useful for potential future reuse)
export type { DicomDatasetLite };
export { buildDicomDatasetLite, decodeIntoImageData };

function drawFallback(seriesUID: string, canvas: HTMLCanvasElement) {
  // Ensure 2D API exists even in jsdom before grabbing context
  ensureCanvas2DAPI(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#0af";
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  ctx.fillStyle = "#0af";
  ctx.font = "10px ui-sans-serif, system-ui";
  ctx.fillText(seriesUID.slice(-6), 6, canvas.height - 6);
}

// Robustly read bytes from a File/Blob across environments
async function fileToArrayBuffer(file: any): Promise<ArrayBuffer> {
  // Prefer the Response/Blob path, which is broadly supported in test envs
  if (typeof (globalThis as any).Response === "function") {
    try {
      return await new Response(file).arrayBuffer();
    } catch {
      // ignore
    }
  }
  // Fallback to direct method if available
  try {
    if (file && typeof file.arrayBuffer === "function") {
      return await file.arrayBuffer();
    }
  } catch {
    // ignore
  }
  if (typeof (globalThis as any).FileReader !== "undefined") {
    try {
      const f: Blob = file as Blob;
      return await new Promise<ArrayBuffer>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as ArrayBuffer);
        fr.onerror = () => reject(fr.error ?? new Error("FileReader error"));
        fr.readAsArrayBuffer(f);
      });
    } catch {
      // ignore
    }
  }
  throw new Error("Unable to read file bytes in this environment");
}
