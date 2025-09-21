import React, { useState } from "react";

export function LayoutPicker({
  rows,
  cols,
  onChange,
}: {
  rows: number;
  cols: number;
  onChange: (r: number, c: number) => void;
}) {
  const [hover, setHover] = useState<[number, number]>([rows, cols]);
  const max = 5;

  const gridRef = React.useRef<HTMLDivElement>(null);
  return (
    <fieldset className="layout-picker">
      <legend>Layout</legend>
      <div className="grid" ref={gridRef} onMouseLeave={() => setHover([rows, cols])}>
        {Array.from({ length: max }).map((_, r) => (
          <div className="row" key={r}>
            {Array.from({ length: max }).map((__, c) => {
              const active = r < hover[0] && c < hover[1];
              const selected = r < rows && c < cols;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={selected}
                  className={`cell${active ? " active" : ""}${selected ? " selected" : ""}`}
                  onMouseEnter={() => setHover([r + 1, c + 1])}
                  onClick={() => onChange(r + 1, c + 1)}
                  onKeyDown={(e) => {
                    const { key } = e;
                    if (key === "Enter" || key === " ") {
                      e.preventDefault();
                      onChange(r + 1, c + 1);
                      return;
                    }
                    // Arrow navigation within 5x5 grid
                    const move = (nr: number, nc: number) => {
                      const rr = Math.min(max, Math.max(1, nr));
                      const cc = Math.min(max, Math.max(1, nc));
                      setHover([rr, cc]);
                      // Move focus to matching button using a stable ref to the grid
                      const grid = gridRef.current;
                      const target =
                        grid?.querySelectorAll<HTMLButtonElement>("button.cell")[
                          (rr - 1) * max + (cc - 1)
                        ];
                      target?.focus();
                    };
                    if (key === "ArrowRight") {
                      e.preventDefault();
                      move(r + 1, c + 2);
                    } else if (key === "ArrowLeft") {
                      e.preventDefault();
                      move(r + 1, c);
                    } else if (key === "ArrowDown") {
                      e.preventDefault();
                      move(r + 2, c + 1);
                    } else if (key === "ArrowUp") {
                      e.preventDefault();
                      move(r, c + 1);
                    }
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <span className="dims">
        {hover[0]}×{hover[1]}
      </span>
    </fieldset>
  );
}
