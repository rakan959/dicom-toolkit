import { renderSeriesBrowser } from "../src/ui/SeriesBrowser";
import { createLayout, assignSeriesToViewport } from "../src/ui/Layout";
import type { Study } from "../src/types";
import JSZip from "jszip";
import { buildManifestFromFiles } from "../src/core/seriesStore";

function demoManifest(): Study[] {
  return [
    {
      studyInstanceUID: "A",
      series: [
        {
          seriesInstanceUID: "S1",
          modality: "CT",
          sopInstances: [
            { sopInstanceUID: "1", frameCount: 1 },
            { sopInstanceUID: "2", frameCount: 1 },
          ],
        },
        {
          seriesInstanceUID: "S2",
          modality: "CT",
          sopInstances: [{ sopInstanceUID: "10", frameCount: 1 }],
        },
      ],
    },
  ];
}

const root = document.getElementById("app")!;
root.setAttribute("role", "application");

// Theme toggle UI (idempotent)
const themeBar = document.createElement("div");
themeBar.style.display = "flex";
themeBar.style.justifyContent = "flex-end";
themeBar.style.gap = "8px";
themeBar.style.padding = "8px";
const themeBtn = document.createElement("button");
themeBtn.setAttribute("aria-label", "Toggle theme");
themeBtn.setAttribute("data-test", "theme-toggle");
function getTheme() {
  const doc = document.documentElement;
  return doc.classList.contains("dark") ? "dark" : "light";
}
function setTheme(next: "dark" | "light") {
  const doc = document.documentElement;
  if (next === "dark") doc.classList.add("dark");
  else doc.classList.remove("dark");
  try {
    localStorage.setItem("theme", next);
  } catch {}
}
function toggleTheme() {
  const curr = getTheme();
  const next = curr === "dark" ? "light" : "dark";
  setTheme(next);
  themeBtn.textContent = next === "dark" ? "🌙 Dark" : "☀️ Light";
}
themeBtn.addEventListener("click", toggleTheme);
themeBtn.textContent = getTheme() === "dark" ? "🌙 Dark" : "☀️ Light";
themeBar.appendChild(themeBtn);
root.appendChild(themeBar);

const browserRoot = document.createElement("div");
browserRoot.setAttribute("data-test", "series-browser-root");
renderSeriesBrowser(browserRoot, demoManifest(), {
  onRouteToAdvancedAnonymize: (studyUID: string, seriesUID: string) =>
    console.log("Advanced anonymize clicked", studyUID, seriesUID),
  onExportVideo: (studyUID: string, seriesUID: string) =>
    console.log("Export Video clicked", studyUID, seriesUID),
});
root.appendChild(browserRoot);

// Simple drop zone to demo ZIP loading (client-side only)
const dropZone = document.createElement("div");
dropZone.setAttribute("data-test", "drop-zone");
dropZone.style.border = "1px dashed #888";
dropZone.style.padding = "8px";
dropZone.style.margin = "8px 0";
dropZone.textContent = "Drop DICOM .dcm files or a .zip here";

const prevent = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
};
dropZone.addEventListener("dragover", prevent);
dropZone.addEventListener("dragenter", prevent);
// Helpers to reduce complexity in drop handler
const isZip = (f: File) => f.name.toLowerCase().endsWith(".zip");
async function extractDicomFromZip(f: File): Promise<File[]> {
  const out: File[] = [];
  try {
    const zip = await JSZip.loadAsync(f);
    const entries = Object.values(zip.files);
    for (const entry of entries) {
      if (entry.dir) continue;
      if (!entry.name.toLowerCase().endsWith(".dcm")) continue;
      const bytes = await entry.async("uint8array");
      const base = entry.name.split("/").pop() || entry.name;
      const ab2 = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(ab2).set(bytes);
      out.push(new File([ab2], base, { type: "application/dicom" }));
    }
  } catch (err) {
    console.warn("ZIP load failed", err);
  }
  return out;
}

async function gatherDroppedFiles(dt: DataTransfer): Promise<File[]> {
  const files = Array.from(dt.files || []);
  const collected: File[] = [];
  for (const f of files) {
    if (isZip(f)) {
      const expanded = await extractDicomFromZip(f);
      collected.push(...expanded);
    } else {
      collected.push(f);
    }
  }
  return collected;
}

dropZone.addEventListener("drop", async (e: DragEvent) => {
  prevent(e);
  const dt = e.dataTransfer;
  if (!dt) return;
  const out = await gatherDroppedFiles(dt);
  if (out.length) {
    const manifest = await buildManifestFromFiles(out);
    renderSeriesBrowser(browserRoot, manifest, {});
  }
});
root.appendChild(dropZone);

const layoutRoot = document.createElement("div");
layoutRoot.setAttribute("data-test", "layout-root");
const api = createLayout(layoutRoot, { rows: 1, cols: 2 });
assignSeriesToViewport(api, 0, { studyInstanceUID: "A", seriesInstanceUID: "S1" });
assignSeriesToViewport(api, 1, { studyInstanceUID: "A", seriesInstanceUID: "S2" });
root.appendChild(layoutRoot);
