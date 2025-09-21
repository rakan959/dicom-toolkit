import React, { useEffect, useRef, useState } from "react";
import dcmjs from "dcmjs";

type Props = {
  file: File | ArrayBuffer; // one SOP Instance to render
};

export default function ViewportCanvas({ file }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [wl, setWl] = useState<{ ww: number; wc: number } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const ab = file instanceof File ? await file.arrayBuffer() : file;
      const dicom = dcmjs.data.DicomMessage.readFile(ab);
      const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicom.dict);
      const rows = Number(dataset.Rows);
      const cols = Number(dataset.Columns);
      const bits = Number(dataset.BitsAllocated) as 8 | 16;
      const slope = Number(dataset.RescaleSlope ?? 1);
      const intercept = Number(dataset.RescaleIntercept ?? 0);
      const ww = Number(dataset.WindowWidth ?? 400);
      const wc = Number(dataset.WindowCenter ?? 40);
      if (!alive) return;
      setWl({ ww, wc });

      const canvas = canvasRef.current!;
      canvas.width = cols;
      canvas.height = rows;
      const ctx = canvas.getContext("2d")!;
      const img = ctx.createImageData(cols, rows);

      if (bits === 8) {
        const src = new Uint8Array(dicom._meta.byteArray?.buffer ?? ab);
        const lo = wc - ww / 2,
          hi = wc + ww / 2;
        for (let i = 0, j = 0; i < rows * cols; i++, j += 4) {
          let val = src[i];
          val = Math.max(lo, Math.min(hi, val));
          const out = ((val - lo) / (hi - lo)) * 255;
          img.data[j] = img.data[j + 1] = img.data[j + 2] = out;
          img.data[j + 3] = 255;
        }
      } else {
        const src = new Int16Array(ab);
        const lo = wc - ww / 2,
          hi = wc + ww / 2;
        for (let i = 0, j = 0; i < rows * cols; i++, j += 4) {
          const h = src[i] * slope + intercept;
          const clamped = Math.max(lo, Math.min(hi, h));
          const out = ((clamped - lo) / (hi - lo)) * 255;
          img.data[j] = img.data[j + 1] = img.data[j + 2] = out;
          img.data[j + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false;
      // scale-to-fit without smoothing
      const { clientWidth, clientHeight } = canvas;
      if (clientWidth && clientHeight) {
        ctx.drawImage(canvas, 0, 0, cols, rows, 0, 0, clientWidth, clientHeight);
      }
    })().catch((err) => console.error(err));
    return () => {
      alive = false;
    };
  }, [file]);

  // Minimal WL mouse control: adjust window width/center interactively
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    let down = false;
    let startX = 0,
      startY = 0;
    let ww = wl?.ww ?? 400,
      wc = wl?.wc ?? 40;
    function onDown(e: MouseEvent) {
      down = true;
      startX = e.clientX;
      startY = e.clientY;
    }
    function onMove(e: MouseEvent) {
      if (!down) return;
      ww = Math.max(1, ww + (e.clientX - startX));
      wc += startY - e.clientY;
      setWl({ ww, wc });
    }
    function onUp() {
      down = false;
    }
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [wl]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "black",
        display: "grid",
        placeItems: "center",
      }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
