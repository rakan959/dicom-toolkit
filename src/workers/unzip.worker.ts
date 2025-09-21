// Streaming unzip worker using @zip.js/zip.js to avoid large in-memory buffers
import { ZipReader, BlobReader, Uint8ArrayWriter } from "@zip.js/zip.js";

type InMsg = { zipBytes?: ArrayBuffer; zipBlob?: Blob };
type OutMsg =
  | { type: "progress"; current: number; total: number }
  | { type: "entry"; name: string; bytes: Uint8Array }
  | { type: "warn"; name: string; error: string }
  | { type: "error"; error: string }
  | { type: "done" };

self.onmessage = (e: MessageEvent<InMsg>) => {
  const msg = e.data;
  if (!msg?.zipBytes && !msg?.zipBlob) return;
  void handle(msg).catch((err) => {
    (self as any).postMessage({ type: "error", error: String(err?.message ?? err) } as OutMsg);
  });
};

async function handle({ zipBytes, zipBlob }: InMsg) {
  // Prefer Blob to avoid creating a giant ArrayBuffer in memory
  const blob: Blob = zipBlob ?? new Blob([zipBytes!]);
  const reader = new ZipReader(new BlobReader(blob));

  // Use generator if available to avoid building a big entries array
  const generator: AsyncIterable<any> | null = (reader as any).getEntriesGenerator
    ? (reader as any).getEntriesGenerator()
    : null;

  let idx = 0;
  if (generator) {
    for await (const entry of generator as AsyncIterable<any>) {
      if (entry?.directory) continue;
      idx++;
      if ((idx & 0b1111) === 0)
        (self as any).postMessage({ type: "progress", current: idx, total: 0 } as OutMsg);
      const name: string = entry?.filename ?? entry?.name ?? `entry-${idx}`;
      try {
        const bytes: Uint8Array = await entry.getData(new Uint8ArrayWriter());
        (self as any).postMessage({ type: "entry", name, bytes } as OutMsg, [bytes.buffer]);
      } catch (err) {
        (self as any).postMessage({ type: "warn", name, error: String(err) } as OutMsg);
      }
    }
  } else {
    // Fallback to getEntries if generator API isn't available
    const entries: any[] = await reader.getEntries();
    for (const entry of entries) {
      if (entry?.directory) continue;
      idx++;
      (self as any).postMessage({
        type: "progress",
        current: idx,
        total: entries.length,
      } as OutMsg);
      const name: string = entry?.filename ?? entry?.name ?? `entry-${idx}`;
      try {
        const bytes: Uint8Array = await entry.getData(new Uint8ArrayWriter());
        (self as any).postMessage({ type: "entry", name, bytes } as OutMsg, [bytes.buffer]);
      } catch (err) {
        (self as any).postMessage({ type: "warn", name, error: String(err) } as OutMsg);
      }
    }
  }

  await reader.close();
  (self as any).postMessage({ type: "done" } as OutMsg);
}
