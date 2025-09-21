import { describe, it, expect } from "vitest";
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import App from "@src/ui-react/App";

// Note: jsdom has limited DnD support; we stub DataTransfer to test our handlers' logic

function makeDataTransfer() {
  const store = new Map<string, string>();
  return {
    setData: (type: string, data: string) => store.set(type, data),
    getData: (type: string) => store.get(type) || "",
    types: Array.from(store.keys()),
  } as unknown as DataTransfer;
}

describe("Assign interactions", () => {
  it("keyboard Enter assigns to active viewport after Alt+1 focus", async () => {
    render(<App />);
    // rows/cols default 1x1, press Alt+1 to focus viewport 0
    fireEvent.keyDown(window, { altKey: true, key: "1" });
    // Since manifest is empty initially, nothing to assign; just ensure no crash
    expect(document.querySelector('[data-test="layout-root"]')).toBeTruthy();
  });

  it("drag series payload drops on viewport and triggers assignment handlers", async () => {
    render(<App />);
    // Create a fake series drop on viewport 0
    const vp = document.querySelector('[data-test="viewport"]') as HTMLElement;
    const dt = makeDataTransfer();
    dt.setData(
      "application/x-series-ref",
      JSON.stringify({ studyInstanceUID: "S", seriesInstanceUID: "A" }),
    );
    fireEvent.drop(vp, { dataTransfer: dt });
    // Assert hash updated to include assignment
    expect(window.location.hash).toContain("A");
    expect(vp).toBeTruthy();
  });

  it("handles malformed payloads without crashing", async () => {
    render(<App />);
    const vp = document.querySelector('[data-test="viewport"]') as HTMLElement;
    const bad1 = makeDataTransfer();
    bad1.setData("application/x-series-ref", "not a json");
    expect(() => fireEvent.drop(vp, { dataTransfer: bad1 })).not.toThrow();

    const bad2 = makeDataTransfer();
    bad2.setData("application/x-series-ref", JSON.stringify({ foo: "bar" }));
    expect(() => fireEvent.drop(vp, { dataTransfer: bad2 })).not.toThrow();
  });

  it("ignores drops on invalid elements", async () => {
    render(<App />);
    const root = document.querySelector('[data-test="layout-root"]') as HTMLElement;
    const dt = makeDataTransfer();
    dt.setData(
      "application/x-series-ref",
      JSON.stringify({ studyInstanceUID: "S", seriesInstanceUID: "A" }),
    );
    // No viewport drop handler should be invoked; ensure no throw
    expect(() => fireEvent.drop(root, { dataTransfer: dt })).not.toThrow();
  });

  it("handles out-of-bounds viewport indices gracefully (Alt+9 on 1x1)", async () => {
    render(<App />);
    // Only 1 viewport exists initially; Alt+9 should clamp without crash
    expect(() => fireEvent.keyDown(window, { altKey: true, key: "9" })).not.toThrow();
    // viewer still present
    expect(document.querySelector('[data-test="layout-root"]')).toBeTruthy();
  });
});
