import { describe, it, expect } from "vitest";
// @req: F-101
import { applyTheme, getStoredTheme, storeTheme } from "@src/ui-react/theme/applyTheme";

describe("Theme toggle idempotence", () => {
  it("toggling twice returns to original", () => {
    const orig = "light" as const;
    document.documentElement.classList.remove("dark");
    storeTheme(orig);
    applyTheme(orig);
    applyTheme("dark");
    applyTheme("light");
    expect(getStoredTheme()).toBe(orig);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
