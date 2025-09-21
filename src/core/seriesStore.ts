import type { Study } from "@src/types";
import { showNotification } from "@src/ui-react/util/notify";
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

/** Parse IDs encoded in filename: study-<A>_series-<B>_inst-<C>[ _frames-<N>][ _mod-<XX>].dcm */
function parseIdsFromName(
  name: string,
): { study: string; series: string; inst: string; frames?: number; mod?: string } | null {
  // Extended heuristic: optional `_frames-<N>` and `_mod-<XX>` suffixes before .dcm
  const re =
    /study-([A-Za-z0-9._]+)_series-([A-Za-z0-9._]+)_inst-([A-Za-z0-9._]+)(?:_frames-(\d+))?(?:_mod-([A-Za-z0-9]+))?\.dcm$/i;
  const m = re.exec(name);
  if (!m) return null;
  const frames = m[4] ? Math.max(1, parseInt(m[4], 10)) : undefined;
  const mod = m[5] ? m[5].toUpperCase() : undefined;
  return { study: m[1], series: m[2], inst: m[3], frames, mod };
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
  const patientByStudy: Map<
    string,
    { id?: string; name?: string; idConflict?: string[]; nameConflict?: string[] }
  > = new Map();
  for (const [study, files] of filesByStudy.entries()) {
    const patientIds = new Set<string>();
    const patientNames = new Set<string>();
    for (const f of files) {
      try {
        const ab = await f.arrayBuffer();
        const dicomData = dcmjs.data.DicomMessage.readFile(ab);
        const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomData.dict);
        if (typeof dataset.PatientID === "string") patientIds.add(dataset.PatientID);
        if (typeof dataset.PatientName === "string") patientNames.add(dataset.PatientName);
      } catch {
        // ignore file
      }
    }
    let id: string | undefined;
    let name: string | undefined;
    let idConflict: string[] | undefined;
    let nameConflict: string[] | undefined;
    if (patientIds.size > 1) {
      idConflict = Array.from(patientIds);
      id = "AMBIGUOUS";
      console.warn(`Conflicting patient IDs for study ${study}:`, idConflict);
      try {
        showNotification(
          `Conflicting patient IDs for study ${study}. Marking as ambiguous.`,
          "warning",
        );
      } catch {}
    } else {
      id = Array.from(patientIds)[0];
    }
    if (patientNames.size > 1) {
      nameConflict = Array.from(patientNames);
      name = "AMBIGUOUS";
      console.warn(`Conflicting patient names for study ${study}:`, nameConflict);
      try {
        showNotification(
          `Conflicting patient names for study ${study}. Marking as ambiguous.`,
          "warning",
        );
      } catch {}
    } else {
      name = Array.from(patientNames)[0];
    }
    patientByStudy.set(study, { id, name, idConflict, nameConflict });
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
    const ids = parseIdsFromName(f.name);
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
  if (opts?.repOut) {
    for (const [st, sMap] of repBySeries) {
      if (!opts.repOut.has(st)) opts.repOut.set(st, new Map());
      const dest = opts.repOut.get(st)!;
      for (const [se, file] of sMap) if (!dest.has(se)) dest.set(se, file);
    }
  }
  return { studies, repBySeries };
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
  const { studies, repBySeries } = await buildManifestCore(files);
  const disableGlobal = (globalThis as any).__DTK_DISABLE_GLOBAL_REP_REGISTRY__ === true;
  if (!disableGlobal) {
    console.warn(
      "[DEPRECATED] Using module-level representative-file registry may cause cross-session leakage. Prefer scoped registries.",
    );
    _repBySeries = repBySeries;
  }
  return studies;
}

/** Build a manifest while filling a provided representative-file registry (scoped). */
export async function buildManifestWithRegistry(
  files: File[],
  opts?: { repRegistry?: RepRegistry },
): Promise<{ manifest: Study[]; repRegistry: RepRegistry }> {
  const rep = opts?.repRegistry ?? createRepRegistry();
  const { studies } = await buildManifestCore(files, { repOut: rep });
  return { manifest: studies, repRegistry: rep };
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

// --- Thumbnail helpers (module-level registry) ---
let _repBySeries: RepRegistry = new Map();

export function getRepresentativeFileForSeries(
  studyInstanceUID: string,
  seriesInstanceUID: string,
): File | undefined {
  return _repBySeries.get(studyInstanceUID)?.get(seriesInstanceUID);
}

export function getRepresentativeFileForSeriesScoped(
  rep: RepRegistry,
  studyInstanceUID: string,
  seriesInstanceUID: string,
): File | undefined {
  return rep.get(studyInstanceUID)?.get(seriesInstanceUID);
}
