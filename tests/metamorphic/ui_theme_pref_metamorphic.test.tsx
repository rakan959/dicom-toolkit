import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// @req: F-101
import { applyTheme, getStoredTheme } from "@src/ui-react/theme/applyTheme";

describe("Theme apply respects system preference when no stored value (metamorphic)", () => {
  const originalMatchMedia = window.matchMedia;

  function mockMatchMedia(dark: boolean) {
    // minimal mock covering .matches
     
    (window as any).matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: dark && query.includes("prefers-color-scheme: dark"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }

  beforeEach(() => {
    try {
      localStorage.removeItem("ui.theme");
    } catch {}
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    (window as unknown as { matchMedia: typeof window.matchMedia }).matchMedia = originalMatchMedia;
  });

  it("defaults to dark when system prefers dark", () => {
    mockMatchMedia(true);
    applyTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(getStoredTheme()).toBe("dark");
  });

  it("defaults to light when system prefers light", () => {
    mockMatchMedia(false);
    applyTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(getStoredTheme()).toBe("light");
  });
});
