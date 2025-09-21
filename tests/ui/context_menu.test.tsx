import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SeriesContextMenu } from "@src/ui-react/context/SeriesContextMenu";

describe("SeriesContextMenu", () => {
  it("renders at position and triggers actions", () => {
    const onClose = vi.fn();
    const onAssign = vi.fn();
    const onExport = vi.fn();
    const onAnonymize = vi.fn();
    const onVideo = vi.fn();
    render(
      <SeriesContextMenu
        at={{ x: 10, y: 10 }}
        onClose={onClose}
        onAssign={onAssign}
        onExport={onExport}
        onAnonymize={onAnonymize}
        onVideo={onVideo}
      />,
    );
    fireEvent.click(screen.getByRole("menuitem", { name: /assign/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /export$/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /anonymize/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /export video/i }));
    expect(onAssign).toHaveBeenCalled();
    expect(onExport).toHaveBeenCalled();
    expect(onAnonymize).toHaveBeenCalled();
    expect(onVideo).toHaveBeenCalled();
  });
});
