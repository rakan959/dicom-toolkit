// Minimal 2D canvas context mock for jsdom-based tests.
// Provides only the methods used by our code: createImageData and putImageData.
if (typeof (globalThis as any).HTMLCanvasElement !== "undefined") {
  const proto = (globalThis as any).HTMLCanvasElement.prototype as any;
  if (!proto.__copilot_ctx_patched) {
    const makeCtx = (_canvas: HTMLCanvasElement) => {
      return {
        createImageData: (w: number, h: number) =>
          ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }) as ImageData,
        putImageData: (_img: ImageData, _x: number, _y: number) => void 0,
      } as unknown as CanvasRenderingContext2D;
    };
    const originalGetContext = proto.getContext;
    proto.getContext = function (this: HTMLCanvasElement, type: string, _opts?: any) {
      if (type === "2d") return makeCtx(this);
      return originalGetContext ? originalGetContext.call(this, type, _opts) : null;
    };
    Object.defineProperty(proto, "__copilot_ctx_patched", { value: true, configurable: false });
  }
}
