import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { showNotification } from "@src/ui-react/util/notify";

describe("notify helper", () => {
  beforeEach(() => {
    // Ensure no leftover global toast from other tests interferes
    (globalThis as any).__DTK_TOAST__ = undefined;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    (globalThis as any).__DTK_TOAST__ = undefined;
  });

  it("prefers global toast bridge when available", () => {
    const spy = vi.fn();
    (globalThis as any).__DTK_TOAST__ = { notify: spy };
    showNotification("via-toast");
    expect(spy).toHaveBeenCalledWith("via-toast", "info");
    (globalThis as any).__DTK_TOAST__ = undefined;
  });

  it("uses window.alert when available", () => {
    (globalThis as any).__DTK_TOAST__ = undefined;
    const spy = vi.spyOn(window, "alert").mockImplementation(() => {});
    showNotification("hello");
    expect(spy).toHaveBeenCalledWith("hello");
  });

  it("falls back to console.log when alert is not available", () => {
    (globalThis as any).__DTK_TOAST__ = undefined;
    const origDesc = Object.getOwnPropertyDescriptor(window, "alert");
    // Simulate missing alert
    Object.defineProperty(window, "alert", { value: undefined, configurable: true });
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    showNotification("fallback");
    expect(spy).toHaveBeenCalledWith("NOTICE:", "fallback");
    // Restore
    if (origDesc) Object.defineProperty(window, "alert", origDesc);
  });
});
