import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { LayoutPicker } from "@src/ui-react/LayoutPicker";

describe("LayoutPicker", () => {
  it("hover updates dims and click applies", () => {
    const onChange = vi.fn();
    render(<LayoutPicker rows={1} cols={1} onChange={onChange} />);
    const cells = screen.getAllByRole("button");
    fireEvent.mouseEnter(cells[0 * 5 + 1]); // hover 1x2 visually
    expect(screen.getByText(/1×2/)).toBeInTheDocument();
    fireEvent.click(cells[2 * 5 + 1]); // click 3x2
    expect(onChange).toHaveBeenCalledWith(3, 2);
  });
});
