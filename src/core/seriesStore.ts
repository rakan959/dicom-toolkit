import type { Study } from "@src/types";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/** Quick check using size/mime/name without reading file bytes. */
function quickAccept(f: File): boolean {
  const tooLarge = typeof f.size === "number" && f.size > MAX_FILE_SIZE;
  if (tooLarge) return false;
  const badMime =
    typeof f.type === "string" &&
    f.type !== "" &&
    f.type !== "application/dicom" &&
    f.type !== "application/octet-stream";
  if (badMime) return false;
  if (f.name.toLowerCase().endsWith(".dcm")) return true;
  return true; // defer to deep check
}

/** Check Part 10 'DICM' marker at offset 128 if needed. */
async function deepDicomCheckIfNeeded(f: File): Promise<boolean> {
  if (f.name.toLowerCase().endsWith(".dcm")) return true;
  try {
    const buf = new Uint8Array(await f.arrayBuffer());
    return (
      buf.length >= 132 &&
      buf[128] === 0x44 /* D */ &&
      buf[129] === 0x49 /* I */ &&
      buf[130] === 0x43 /* C */ &&
      buf[131] === 0x4d /* M */
    );
  } catch {
    return false;
  }
}

async function filterDicomFiles(files: File[]): Promise<File[]> {
  const out: File[] = [];
  for (const f of files) {
    if (!quickAccept(f)) continue;
    if (await deepDicomCheckIfNeeded(f)) out.push(f);
  }
  return out;
}

/** Parse IDs encoded in filename: study-<A>_series-<B>_inst-<C>.dcm */
function parseIdsFromName(name: string): { study: string; series: string; inst: string } | null {
  // Allow underscores and periods in UID portions while stopping at the .dcm extension
  const re = /study-([A-Za-z0-9_.]+)_series-([A-Za-z0-9_.]+)_inst-([A-Za-z0-9_.]+)\.dcm$/i;
  const m = re.exec(name);
  if (!m) return null;
  return { study: m[1], series: m[2], inst: m[3] };
}

/**
 * Build a manifest from files. For ZIPs, caller must unzip first.
 * Minimal implementation for T02: filter non-DICOM using magic 'DICM' at byte 128
 * (per Part 10) or filename heuristic (.dcm). Returns an empty manifest for now
 * as UID parsing is not yet implemented.
 */
export async function buildManifestFromFiles(files: File[]): Promise<Study[]> {
  // @req: F-001 (client-side processing)
  // @req: F-015 (ingest supports loose files; non-DICOM filtered)
  const dicomFiles = await filterDicomFiles(files);

  // Minimal manifest creation using filename heuristic:
  // Expect filenames like: study-<SID>_series-<SEID}_inst-<IID>.dcm
  // This is only for testing bootstrap; later we'll parse real DICOM tags.
  type Acc = Map<string, Map<string, Set<string>>>; // study -> series -> instances
  const acc: Acc = new Map();
  for (const f of dicomFiles) {
    const ids = parseIdsFromName(f.name);
    if (!ids) continue; // skip files that don't match heuristic
    if (!acc.has(ids.study)) acc.set(ids.study, new Map());
    const sMap = acc.get(ids.study)!;
    if (!sMap.has(ids.series)) sMap.set(ids.series, new Set());
    sMap.get(ids.series)!.add(ids.inst);
  }
  // Build output deterministically: sort keys and instance IDs
  const studies: Study[] = Array.from(acc.keys())
    .sort((a, b) => a.localeCompare(b))
    .map((st) => ({
      studyInstanceUID: st,
      series: Array.from(acc.get(st)!.keys())
        .sort((a, b) => a.localeCompare(b))
        .map((se) => ({
          seriesInstanceUID: se,
          modality: "OT", // unknown at this stage
          description: undefined,
          sopInstances: Array.from(acc.get(st)!.get(se)!)
            .sort((a, b) => a.localeCompare(b))
            .map((iid) => ({ sopInstanceUID: iid, frameCount: 1 })),
        })),
    }));
  return studies;
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
  if (typeof a0 === "object" && a0 && typeof a0.instanceNumber === "number") {
    return arr.sort((a: any, b: any) => a.instanceNumber - b.instanceNumber);
  }
  return arr; // unknown shape: no-op but stable
}
