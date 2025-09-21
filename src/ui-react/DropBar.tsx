import React, { useCallback, useState } from "react";
import { showNotification } from "@src/ui-react/util/notify";
import JSZip from "jszip";

function isZip(f: File): boolean {
  const n = f.name.toLowerCase();
  return n.endsWith(".zip") || f.type === "application/zip";
}

export function DropBar({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("Drop DICOM or .zip here, or click to browse");

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setBusy(true);
      try {
        const arr = Array.from(files as FileList | File[]);
        const expanded: File[] = [];
        for (const f of arr) {
          if (isZip(f)) {
            const zip = await JSZip.loadAsync(await f.arrayBuffer());
            const entries = Object.values(zip.files).filter((e) => !e.dir);
            for (const e of entries) {
              const bytes = await e.async("uint8array");
              const ab = new ArrayBuffer(bytes.byteLength);
              new Uint8Array(ab).set(bytes);
              const blob = new Blob([ab], { type: "application/dicom" });
              const base = e.name.split("/").pop() || e.name;
              expanded.push(new File([blob], base, { type: "application/dicom" }));
            }
          } else {
            expanded.push(f);
          }
        }
        onFiles(expanded);
        const okMsg = `Imported ${expanded.length} file(s)`;
        setMsg(okMsg);
        try {
          showNotification(okMsg, "success");
        } catch {}
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
    <label
      className="drop-bar"
      role="button"
      aria-label="Import DICOM files or zip"
      data-test="drop-zone"
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer?.files) void handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        type="file"
        multiple
        hidden
        aria-label="Choose DICOM files or zip"
        onChange={(e) => e.currentTarget.files && handleFiles(e.currentTarget.files)}
      />
      <span aria-live="polite">{busy ? "Processing…" : msg}</span>
    </label>
  );
}
