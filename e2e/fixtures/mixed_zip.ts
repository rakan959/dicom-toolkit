import JSZip from "jszip";

function mkDicomBytes(): Uint8Array {
  const buf = new Uint8Array(200);
  buf[128] = 0x44; // D
  buf[129] = 0x49; // I
  buf[130] = 0x43; // C
  buf[131] = 0x4d; // M
  return buf;
}

// Create bytes resembling non-Part 10 DICOM by embedding a UID root string near the start
function mkDicomNoPreambleBytes(): Uint8Array {
  const text = "1.2.840.10008.1.2.1"; // UID root substring
  const enc = new TextEncoder();
  const t = enc.encode(text);
  const buf = new Uint8Array(64 + t.length);
  buf.set(t, 8);
  return buf;
}

function mkNonDicomBytes(): Uint8Array {
  const buf = new Uint8Array(64);
  for (let i = 0; i < buf.length; i++) buf[i] = (i * 37) & 0xff;
  return buf;
}

export async function makeMixedZipBase64(opts: {
  studyId?: string;
  dicomSeries: number;
  instPerSeries: number;
  nonDicomCount: number;
  includeNoPreamble?: boolean;
}): Promise<string> {
  const {
    studyId = "A",
    dicomSeries,
    instPerSeries,
    nonDicomCount,
    includeNoPreamble = true,
  } = opts;
  const zip = new JSZip();
  for (let s = 1; s <= dicomSeries; s++) {
    for (let i = 1; i <= instPerSeries; i++) {
      const name = `study-${studyId}_series-S${s}_inst-I${i}_mod-CT.dcm`;
      zip.file(name, mkDicomBytes());
    }
  }
  if (includeNoPreamble) {
    // Add a small set without .dcm extension and without Part 10 preamble
    for (let i = 1; i <= Math.max(1, Math.floor(instPerSeries / 2)); i++) {
      const name = `study-${studyId}_series-NP_inst-N${i}`; // no extension
      zip.file(name, mkDicomNoPreambleBytes());
    }
  }
  for (let n = 1; n <= nonDicomCount; n++) {
    zip.file(`notes_${n}.txt`, mkNonDicomBytes());
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const ab = await blob.arrayBuffer();
  return Buffer.from(new Uint8Array(ab)).toString("base64");
}
