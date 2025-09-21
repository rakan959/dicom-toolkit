import { describe, it, expect } from "vitest";
import fc from "fast-check";
// @req: F-101
import {
  applyTheme,
  getStoredTheme,
  storeTheme,
  type ThemeMode,
} from "@src/ui-react/theme/applyTheme";

function resetDOM() {
  document.documentElement.classList.remove("dark");
  // reset storage
  try {
    localStorage.removeItem("ui.theme");
  } catch {}
}

describe("Theme toggle idempotence (property)", () => {
  it("toggling twice returns to original for any start mode", () => {
    fc.assert(
      fc.property(fc.constantFrom<ThemeMode>("light", "dark"), (start) => {
        resetDOM();
        storeTheme(start);
        applyTheme(start);
        // toggle to the other and back
        const other: ThemeMode = start === "dark" ? "light" : "dark";
        applyTheme(other);
        applyTheme(start);
        expect(getStoredTheme()).toBe(start);
        const isDark = document.documentElement.classList.contains("dark");
        expect(isDark).toBe(start === "dark");
      }),
      { numRuns: 20 },
    );
  });
});
