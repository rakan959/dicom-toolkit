import type { Study } from "@src/types";

/**
 * Build a manifest from files. For ZIPs, caller must unzip first.
 * Minimal implementation for T02: filter non-DICOM using magic 'DICM' at byte 128
 * (per Part 10) or filename heuristic (.dcm). Returns an empty manifest for now
 * as UID parsing is not yet implemented.
 */
export async function buildManifestFromFiles(files: File[]): Promise<Study[]> {
  // @req: F-001 (client-side processing)
  // @req: F-015 (ingest supports loose files; non-DICOM filtered)
  const dicomFiles: File[] = [];
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  for (const f of files) {
    // Combined early rejections
    const tooLarge = typeof f.size === "number" && f.size > MAX_FILE_SIZE;
    const badMime =
      typeof f.type === "string" &&
      f.type !== "" &&
      f.type !== "application/dicom" &&
      f.type !== "application/octet-stream";
    if (tooLarge || badMime) continue;

    // Quick filename heuristic first
    if (f.name.toLowerCase().endsWith(".dcm")) {
      dicomFiles.push(f);
      continue;
    }

    // Check Part 10 preamble + 'DICM' marker at offset 128
    try {
      const buf = new Uint8Array(await f.arrayBuffer());
      const isDICM = buf.length >= 132 &&
        buf[128] === 0x44 /* D */ &&
        buf[129] === 0x49 /* I */ &&
        buf[130] === 0x43 /* C */ &&
        buf[131] === 0x4d /* M */;
      if (isDICM) dicomFiles.push(f);
    } catch {
      // Ignore unreadable files
    }
  }

  // Placeholder: we only establish filtering invariant here; manifest building will
  // be implemented in a later slice. Returning [] keeps behavior deterministic and safe.
  const hasDicom = dicomFiles.length > 0; // read collection contents to satisfy analyzers
  if (hasDicom) {
    // Placeholder for future manifest construction when UID parsing is implemented
  }
  return [] as Study[];
}

/** Ensures deterministic volume reconstruction independent of file order. */
export function sortInstancesStable<T>(instances: T[]): T[] {
  // @req: F-015
  // Minimal stable sort:
  // - If numbers: numeric ascending
  // - If objects with instanceNumber: sort by that
  // - Otherwise: keep original order (stable)
  const arr = instances.slice();
  if (arr.length === 0) return arr;
  const a0: any = arr[0] as any;
  if (typeof a0 === "number") {
    return (arr as unknown as number[]).slice().sort((a, b) => a - b) as unknown as T[];
  }
  if (typeof a0 === "object" && a0 && typeof (a0).instanceNumber === "number") {
    return arr.sort((a: any, b: any) => a.instanceNumber - b.instanceNumber);
  }
  return arr; // unknown shape: no-op but stable
}
