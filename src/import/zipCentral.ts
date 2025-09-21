import { expandZipBytes } from "@src/utils/zipLoader";
import { isDicomQuickProbe } from "@src/dicom/reader";

export type SkipReason = "parse-failed" | "not-dicom" | "zip-error" | "size-cap";
export type Skipped = { name: string; reason: SkipReason; detail?: string };

export async function* iterateZipEntries(
  zipBytes: Uint8Array | Blob,
  opts?: {
    maxEntryBytes?: number;
    onProgress?: (p: { entriesSeen: number; kept: number }) => void;
    onSkip?: (s: Skipped) => void;
  },
): AsyncGenerator<{ name: string; bytes: Uint8Array } | { skip: Skipped }> {
  let entriesSeen = 0;
  let kept = 0;
  try {
    const entries = await expandZipBytes(zipBytes, (cur, _total) => {
      // Normalize to entriesSeen updates; JSZip progress emits (cur,total)
      entriesSeen = cur;
      opts?.onProgress?.({ entriesSeen, kept });
    });
    for (const { name, bytes } of entries) {
      entriesSeen++;
      const cap = opts?.maxEntryBytes;
      if (typeof cap === "number" && cap > 0 && bytes.byteLength > cap) {
        const s = { name, reason: "size-cap" as const, detail: String(bytes.byteLength) };
        opts?.onSkip?.(s);
        yield { skip: s };
        continue;
      }
      // Name heuristic: accept files whose names encode IDs even if bytes don't have a preamble
      const namePattern =
        /study-([A-Z0-9._]+)_series-([A-Z0-9._]+)_inst-([A-Z0-9._]+)(?:_frames-(\d+))?(?:_mod-([A-Z0-9]+))?(?:\.dcm)?$/i;
      const nameLooksDicom = namePattern.test(name);
      // Quick DICOM probe; skip non-DICOMs consistently unless name hints otherwise
      let looksDicom = nameLooksDicom;
      try {
        looksDicom ||= isDicomQuickProbe(bytes);
      } catch (e) {
        const s = { name, reason: "parse-failed" as const, detail: String(e) };
        opts?.onSkip?.(s);
        yield { skip: s };
        continue;
      }
      if (!looksDicom) {
        const s = { name, reason: "not-dicom" as const };
        opts?.onSkip?.(s);
        yield { skip: s };
        continue;
      }
      kept++;
      opts?.onProgress?.({ entriesSeen, kept });
      yield { name, bytes };
    }
  } catch (e) {
    // Treat any expansion error as a zip-error skip on the container
    const s = { name: "<zip>", reason: "zip-error" as const, detail: String(e) };
    opts?.onSkip?.(s);
    yield { skip: s };
  }
}
