import React, { useCallback, useRef, useState } from "react";
import { showNotification } from "@src/ui-react/util/notify";
import { normalizeToZipSource } from "@src/utils/zipLoader";
import { iterateZipEntries } from "@src/import/zipCentral";

function isZip(f: File): boolean {
  const n = f.name.toLowerCase();
  return n.endsWith(".zip") || f.type === "application/zip";
}

export function DropBar({
  onFiles,
  maxEntryBytes,
}: Readonly<{ onFiles: (files: File[]) => void; maxEntryBytes?: number }>) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("Drop DICOM or .zip here, or click to browse");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setBusy(true);
      try {
        const arr = Array.from(files);
        const expanded: File[] = [];
        for (const f of arr) {
          if (isZip(f)) {
            // Normalize to a Blob for large zips (avoid NotReadableError), or Uint8Array for small ones
            const bytes = await normalizeToZipSource(f);
            let kept = 0;
            let seen = 0;
            for await (const item of iterateZipEntries(bytes as any, {
              maxEntryBytes,
              onProgress: (p) => {
                seen = p.entriesSeen;
                kept = p.kept;
                setMsg(`Scanning ZIP: ${kept}/${seen} kept…`);
              },
              onSkip: (s) => {
                // Keep UI neutral; optionally log for debugging
                console.debug("ZIP skip", s.name, s.reason, s.detail);
              },
            })) {
              if ("skip" in item) continue;
              const base = item.name.split("/").pop() || item.name;
              const ab = new ArrayBuffer(item.bytes.byteLength);
              new Uint8Array(ab).set(item.bytes);
              expanded.push(new File([ab], base, { type: "application/octet-stream" }));
            }
          } else {
            expanded.push(f);
          }
        }
        onFiles(expanded);
        // App will compute accepted vs total and show a toast; keep local UI neutral.
        setMsg(`Processed ${expanded.length} file(s)`);
      } catch (e) {
        console.warn(e);
        const errMsg = "Failed to import some files. See console.";
        setMsg(errMsg);
        try {
          showNotification(errMsg, "error");
        } catch {}
      } finally {
        setBusy(false);
      }
    },
    [onFiles],
  );

  return (
    <div className="dropbar-wrapper">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        aria-label="Choose DICOM files or zip"
        onChange={(e) => e.currentTarget.files && handleFiles(e.currentTarget.files)}
      />
      <button
        type="button"
        className="drop-bar"
        aria-label="Import DICOM files or zip"
        data-test="drop-zone"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer?.files) void handleFiles(e.dataTransfer.files);
        }}
      >
        {busy ? "Processing…" : msg}
      </button>
    </div>
  );
}
