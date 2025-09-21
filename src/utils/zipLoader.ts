// Centralized ZIP loading utilities: normalize input to bytes once and expand via worker.

export async function normalizeToBytes(item: File | Blob | any): Promise<Uint8Array> {
  // FileSystemFileHandle support if present
  if (item && typeof item.getFile === "function") {
    const handle = item as any;
    if (typeof handle.requestPermission === "function") {
      try {
        await handle.requestPermission({ mode: "read" });
      } catch {}
    }
    item = await handle.getFile();
  }
  // Read exactly once
  const ab = await (item as Blob).arrayBuffer();
  return new Uint8Array(ab);
}

/**
 * For large ZIPs, avoid arrayBuffer() to prevent NotReadableError or OOM. Return the Blob/File directly.
 * Small ZIPs can return a Uint8Array for slightly faster worker startup.
 */
export async function normalizeToZipSource(item: File | Blob | any): Promise<Blob | Uint8Array> {
  // FileSystemFileHandle support if present
  if (item && typeof item.getFile === "function") {
    const handle = item as any;
    if (typeof handle.requestPermission === "function") {
      try {
        await handle.requestPermission({ mode: "read" });
      } catch {}
    }
    item = await handle.getFile();
  }
  const blob: Blob = item as Blob;
  const LARGE_ZIP_THRESHOLD = 512 * 1024 * 1024; // 512MB threshold to prefer Blob path
  if (typeof (blob as any).size === "number" && (blob as any).size > LARGE_ZIP_THRESHOLD) {
    return blob; // let worker stream it
  }
  // For smaller zips, a Uint8Array is fine
  const ab = await blob.arrayBuffer();
  return new Uint8Array(ab);
}

function createUnzipWorker(): Worker {
  // Use a relative path so bundlers resolve the worker correctly
   
  // @ts-ignore
  const worker = new Worker(new URL("../workers/unzip.worker.ts", import.meta.url), {
    type: "module",
  });
  return worker as unknown as Worker;
}

export async function expandZipBytesToFiles(
  zipSource: Uint8Array | Blob,
  onProgress?: (cur: number, total: number) => void,
): Promise<File[]> {
  const worker = createUnzipWorker();
  const results: File[] = [];
  let total = 0,
    current = 0;
  const done = new Promise<void>((resolve, reject) => {
    const onMessage = (e: MessageEvent) => {
      const msg: any = e.data;
      if (msg.type === "progress") {
        current = msg.current;
        total = msg.total;
        onProgress?.(current, total);
      } else if (msg.type === "entry") {
        const name: string = msg.name || "entry";
        const bytes: Uint8Array = msg.bytes;
        const base = name.split("/").pop() || name;
        // Create a plain ArrayBuffer to avoid SAB typing issues
        const ab = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(ab).set(bytes);
        const file = new File([ab], base, { type: "application/octet-stream" });
        results.push(file);
      } else if (msg.type === "warn") {
        console.warn(`ZIP entry failed: ${msg.name}`, msg.error);
      } else if (msg.type === "error") {
        worker.removeEventListener("message", onMessage);
        worker.terminate();
        reject(new Error(String(msg.error)));
      } else if (msg.type === "done") {
        worker.removeEventListener("message", onMessage);
        worker.terminate();
        resolve();
      }
    };
    worker.addEventListener("message", onMessage);
  });
  // Post either bytes or the Blob to the worker. Transfer buffer when possible.
  if (zipSource instanceof Uint8Array) {
    worker.postMessage({ zipBytes: zipSource.buffer }, [zipSource.buffer]);
  } else {
    worker.postMessage({ zipBlob: zipSource });
  }
  await done;
  return results;
}

// Return raw entry bytes for pipelines that don’t want File wrappers
export async function expandZipBytes(
  zipSource: Uint8Array | Blob,
  onProgress?: (cur: number, total: number) => void,
): Promise<Array<{ name: string; bytes: Uint8Array }>> {
  const worker = createUnzipWorker();
  const results: Array<{ name: string; bytes: Uint8Array }> = [];
  const done = new Promise<void>((resolve, reject) => {
    const onMessage = (e: MessageEvent) => {
      const msg: any = e.data;
      if (msg.type === "progress") {
        onProgress?.(Number(msg.current) || 0, Number(msg.total) || 0);
      } else if (msg.type === "entry") {
        results.push({ name: String(msg.name || "entry"), bytes: new Uint8Array(msg.bytes) });
      } else if (msg.type === "warn") {
        console.warn(`ZIP entry failed: ${msg.name}`, msg.error);
      } else if (msg.type === "error") {
        worker.removeEventListener("message", onMessage);
        worker.terminate();
        reject(new Error(String(msg.error)));
      } else if (msg.type === "done") {
        worker.removeEventListener("message", onMessage);
        worker.terminate();
        resolve();
      }
    };
    worker.addEventListener("message", onMessage);
  });
  if (zipSource instanceof Uint8Array) {
    worker.postMessage({ zipBytes: zipSource.buffer }, [zipSource.buffer]);
  } else {
    worker.postMessage({ zipBlob: zipSource });
  }
  await done;
  return results;
}
