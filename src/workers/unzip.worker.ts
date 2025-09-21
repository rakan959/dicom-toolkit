// Unzip worker: receives { zipBytes: ArrayBuffer } and posts { type: 'entry', name, bytes } for each file.
import JSZip from "jszip";
// NOTE: If streaming or stricter mid-stream caps are required, consider switching
// to `fflate` here. Example skeleton:
// import { unzipSync } from 'fflate';
// const files = unzipSync(new Uint8Array(zipBytes), { filter: (f) => !f.name.endsWith('/') });
// for (const [name, bytes] of Object.entries(files)) postMessage({ type: 'entry', name, bytes });

self.onmessage = async (e: MessageEvent) => {
  const { zipBytes, zipBlob } = e.data as { zipBytes?: ArrayBuffer; zipBlob?: Blob };
  if (!zipBytes && !zipBlob) return;
  try {
    // Prefer loading from Blob when provided to avoid holding a 3GB ArrayBuffer
    const zip = zipBlob
      ? await JSZip.loadAsync(zipBlob)
      : await JSZip.loadAsync(new Uint8Array(zipBytes!));
    const entries = Object.values(zip.files).filter((f) => !f.dir);
    let idx = 0;
    for (const entry of entries) {
      idx++;
      // progress event
      (self as any).postMessage({ type: "progress", current: idx, total: entries.length });
      try {
        const bytes = await entry.async("uint8array");
        (self as any).postMessage({ type: "entry", name: entry.name, bytes }, [bytes.buffer]);
      } catch (err) {
        (self as any).postMessage({ type: "warn", name: entry.name, error: String(err) });
      }
    }
    (self as any).postMessage({ type: "done" });
  } catch (err) {
    (self as any).postMessage({ type: "error", error: String(err) });
  }
};
