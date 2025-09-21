import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { SeriesPanel } from "@src/ui-react/SeriesPanel";

function makeManifest() {
  return [
    {
      studyInstanceUID: "STUDY-1",
      patientId: "P1",
      patientName: "Pat One",
      series: [
        {
          seriesInstanceUID: "SER-1",
          modality: "CT",
          sopInstances: [{ sopInstanceUID: "i1", frameCount: 1 }],
        },
        {
          seriesInstanceUID: "SER-2",
          modality: "MR",
          sopInstances: [{ sopInstanceUID: "i2", frameCount: 1 }],
        },
      ],
    },
  ];
}

describe("SeriesPanel accessibility & keyboard interactions", () => {
  it("wraps focus with ArrowUp/ArrowDown within the series list", async () => {
    const onAssign = vi.fn();
    const { container } = render(<SeriesPanel manifest={makeManifest()} onAssign={onAssign} />);
    const rows = Array.from(container.querySelectorAll<HTMLLIElement>("li.series-row"));
    expect(rows.length).toBe(2);

    // Focus the first and ArrowUp should wrap to the last
    rows[0].focus();
    await userEvent.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(rows[1]);

    // From last, ArrowDown should wrap to first
    rows[1].focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(rows[0]);
  });

  it("activates assignment with Enter and opens context menu with Shift+F10", async () => {
    const onAssign = vi.fn();
    const { container, findByRole } = render(
      <SeriesPanel manifest={makeManifest()} onAssign={onAssign} />,
    );
    const rows = Array.from(container.querySelectorAll<HTMLLIElement>("li.series-row"));
    rows[0].focus();

    // Enter triggers assignment to viewport 0
    await userEvent.keyboard("{Enter}");
    expect(onAssign).toHaveBeenCalledWith("STUDY-1", "SER-1", 0);

    // Shift+F10 opens the context menu
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");
    const menu = await findByRole("menu");
    expect(menu).toBeInTheDocument();
    // Choose Assign to viewport from menu
    const btn = await findByRole("menuitem", { name: /assign to viewport/i });
    await userEvent.click(btn);
    expect(onAssign).toHaveBeenCalledWith("STUDY-1", "SER-1", 0);
  });
});
