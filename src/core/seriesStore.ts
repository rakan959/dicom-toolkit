import type { Study } from "@src/types";
import dcmjs from "dcmjs";

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
    // Read only the 4 bytes at offset 128 instead of the entire file
    const slice = f.slice(128, 132);
    const buf = new Uint8Array(await slice.arrayBuffer());
    return (
      buf.length === 4 && buf[0] === 0x44 && buf[1] === 0x49 && buf[2] === 0x43 && buf[3] === 0x4d
    );
  } catch {
    return false;
  }
}

async function filterDicomFiles(files: File[]): Promise<File[]> {
  const out: File[] = [];
  for (const f of files) {
    if (!quickAccept(f)) continue;
    if (await deepDicomCheckIfNeeded(f)) {
      out.push(f);
    } else {
      // Fallback 1: accept files whose names encode UIDs even without extension
      const idsFromName = parseIdsFromName(f.name);
      if (idsFromName) {
        out.push(f);
        continue;
      }
      // Fallback 2: attempt to parse basic identifiers from file bytes
      const ids = await parseIdsFromFile(f);
      if (ids) out.push(f);
    }
  }
  return out;
}

/** Parse IDs encoded in filename: study-<A>_series-<B>_inst-<C>[ _frames-<N>][ _mod-<XX>][.dcm] */
function parseIdsFromName(
  name: string,
): { study: string; series: string; inst: string; frames?: number; mod?: string } | null {
  // Extended heuristic: optional `_frames-<N>` and `_mod-<XX>` suffixes before .dcm
  // Allow files without an extension by making the .dcm suffix optional.
  const re =
    /study-([A-Z0-9._]+)_series-([A-Z0-9._]+)_inst-([A-Z0-9._]+)(?:_frames-(\d+))?(?:_mod-([A-Z0-9]+))?(?:\.dcm)?$/i;
  const m = re.exec(name);
  if (!m) return null;
  const frames = m[4] ? Math.max(1, parseInt(m[4], 10)) : undefined;
  const mod = m[5] ? m[5].toUpperCase() : undefined;
  return { study: m[1], series: m[2], inst: m[3], frames, mod };
}

/** Fallback: parse UIDs and basic tags from the DICOM file itself. */
async function parseIdsFromFile(
  f: File,
): Promise<{ study: string; series: string; inst: string; frames?: number; mod?: string } | null> {
  try {
    const ab = await f.arrayBuffer();
    const dicomData = dcmjs.data.DicomMessage.readFile(ab);
    const ds: any = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomData.dict);
    const study = typeof ds.StudyInstanceUID === "string" ? ds.StudyInstanceUID : undefined;
    const series = typeof ds.SeriesInstanceUID === "string" ? ds.SeriesInstanceUID : undefined;
    const inst = typeof ds.SOPInstanceUID === "string" ? ds.SOPInstanceUID : undefined;
    if (!study || !series || !inst) return null;
    const frames = Number(ds.NumberOfFrames || 0);
    const mod = typeof ds.Modality === "string" ? String(ds.Modality).toUpperCase() : undefined;
    return { study, series, inst, frames: frames > 0 ? frames : undefined, mod };
  } catch {
    return null;
  }
}

// Internal accumulator type reused across builders
type Acc = Map<string, Map<string, Set<string>>>; // study -> series -> instances

function addToAcc(
  acc: Acc,
  ids: { study: string; series: string; inst: string; frames?: number; mod?: string },
) {
  if (!acc.has(ids.study)) acc.set(ids.study, new Map());
  const sMap = acc.get(ids.study)!;
  if (!sMap.has(ids.series)) sMap.set(ids.series, new Set());
  const encoded = `${ids.inst}|${ids.frames ?? 1}|${(ids.mod ?? "OT").toUpperCase()}`;
  sMap.get(ids.series)!.add(encoded);
}

async function extractPatientInfoPerStudy(filesByStudy: Map<string, File[]>) {
  const patientByStudy: Map<string, { id?: string; name?: string }> = new Map();
  for (const [study, files] of filesByStudy.entries()) {
    const first = files[0];
    if (!first) continue;
    try {
      const ab = await first.arrayBuffer();
      const dicomData = dcmjs.data.DicomMessage.readFile(ab);
      const ds = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomData.dict);
      const id = typeof ds.PatientID === "string" ? ds.PatientID : undefined;
      const name = typeof ds.PatientName === "string" ? ds.PatientName : undefined;
      patientByStudy.set(study, { id, name });
    } catch {
      // ignore unreadable first file; leave patient info undefined
      patientByStudy.set(study, {});
    }
  }
  return patientByStudy;
}

function buildStudiesFromAcc(
  acc: Acc,
  patientByStudy: Map<
    string,
    | { id?: string; name?: string }
    | { id?: string; name?: string; idConflict?: string[]; nameConflict?: string[] }
  >,
): Study[] {
  return Array.from(acc.keys())
    .sort((a, b) => a.localeCompare(b))
    .map((st) => ({
      studyInstanceUID: st,
      patientId: patientByStudy.get(st)?.id,
      patientName: patientByStudy.get(st)?.name,
      series: Array.from(acc.get(st)!.keys())
        .sort((a, b) => a.localeCompare(b))
        .map((se) => {
          const insts = Array.from(acc.get(st)!.get(se)!)
            .map((s) => {
              const [id, framesStr, modRaw] = s.split("|");
              const framesNum = Math.max(1, Number(framesStr) || 1);
              const mod = (modRaw || "OT").toUpperCase();
              return { id, frames: framesNum, mod } as { id: string; frames: number; mod: string };
            })
            .sort((a, b) => a.id.localeCompare(b.id));
          const modality = insts.some((x) => x.mod === "US") ? "US" : (insts[0]?.mod ?? "OT");
          return {
            seriesInstanceUID: se,
            modality,
            description: undefined,
            sopInstances: insts.map((x) => ({ sopInstanceUID: x.id, frameCount: x.frames })),
          };
        }),
    }));
}

async function buildManifestCore(files: File[], opts?: { repOut?: RepRegistry }) {
  const dicomFiles = await filterDicomFiles(files);
  const acc: Acc = new Map();
  const repBySeries: RepRegistry = new Map();
  const filesByStudy: Map<string, File[]> = new Map();
  for (const f of dicomFiles) {
    let ids = parseIdsFromName(f.name);
    ids ??= await parseIdsFromFile(f);
    if (!ids) continue;
    if (!filesByStudy.has(ids.study)) filesByStudy.set(ids.study, []);
    filesByStudy.get(ids.study)!.push(f);
    addToAcc(acc, ids);
    if (!repBySeries.has(ids.study)) repBySeries.set(ids.study, new Map());
    const sThumb = repBySeries.get(ids.study)!;
    if (!sThumb.has(ids.series)) sThumb.set(ids.series, f);
  }
  const patientInfo = await extractPatientInfoPerStudy(filesByStudy);
  const studies = buildStudiesFromAcc(acc, patientInfo);
  const seriesCount = studies.reduce((s, st) => s + st.series.length, 0);
  const instanceCount = studies.reduce(
    (s, st) => s + st.series.reduce((ss, se) => ss + se.sopInstances.length, 0),
    0,
  );
  if (opts?.repOut) {
    for (const [st, sMap] of repBySeries) {
      if (!opts.repOut.has(st)) opts.repOut.set(st, new Map());
      const dest = opts.repOut.get(st)!;
      for (const [se, file] of sMap) if (!dest.has(se)) dest.set(se, file);
    }
  }
  return {
    studies,
    repBySeries,
    stats: {
      inputFiles: files.length,
      acceptedFiles: dicomFiles.length,
      studies: studies.length,
      series: seriesCount,
      instances: instanceCount,
      skippedFiles: Math.max(0, files.length - dicomFiles.length),
    },
  };
}

/**
 * Build a manifest from files. For ZIPs, caller must unzip first.
 * Minimal implementation for T02: filter non-DICOM using magic 'DICM' at byte 128
 * (per Part 10) or filename heuristic (.dcm). Returns an empty manifest for now
 * as UID parsing is not yet implemented.
 */
export type RepRegistry = Map<string, Map<string, File>>; // study -> (series -> file)

export function createRepRegistry(): RepRegistry {
  return new Map();
}

export async function buildManifestFromFiles(files: File[]): Promise<Study[]> {
  // @req: F-001, F-015
  const { studies } = await buildManifestCore(files);
  // Note: Module-level representative-file registry has been removed to avoid cross-session leakage.
  // If a representative-file registry is needed, use buildManifestWithRegistry instead.
  return studies;
}

/** Build a manifest while filling a provided representative-file registry (scoped). */
export async function buildManifestWithRegistry(
  files: File[],
  opts?: { repRegistry?: RepRegistry },
): Promise<{
  manifest: Study[];
  repRegistry: RepRegistry;
  stats: {
    inputFiles: number;
    acceptedFiles: number;
    studies: number;
    series: number;
    instances: number;
    skippedFiles: number;
  };
}> {
  const rep = opts?.repRegistry ?? createRepRegistry();
  const { studies, stats } = await buildManifestCore(files, { repOut: rep });
  return { manifest: studies, repRegistry: rep, stats };
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

export function getRepresentativeFileForSeriesScoped(
  rep: RepRegistry,
  studyInstanceUID: string,
  seriesInstanceUID: string,
): File | undefined {
  return rep.get(studyInstanceUID)?.get(seriesInstanceUID);
}
