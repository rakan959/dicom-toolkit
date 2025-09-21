import React, { useEffect, useRef } from "react";

export function SeriesContextMenu({
  at,
  onClose,
  onAssign,
  onExport,
  onAnonymize,
  onVideo,
}: {
  at: { x: number; y: number } | null;
  onClose: () => void;
  onAssign: () => void;
  onExport: () => void;
  onAnonymize: () => void;
  onVideo: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState<{ left: number; top: number } | null>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);

  React.useLayoutEffect(() => {
    if (!at) return;
    // After first render, we will have ref size; compute constrained position
    const menu = ref.current as HTMLElement | null;
    const { innerWidth, innerHeight, scrollX, scrollY } = window as Window &
      typeof globalThis & { scrollX: number; scrollY: number };
    const pad = 4;
    const w = menu?.offsetWidth ?? 160;
    const h = menu?.offsetHeight ?? 100;
    let left = at.x + scrollX;
    let top = at.y + scrollY;
    if (left + w > scrollX + innerWidth - pad)
      left = Math.max(pad + scrollX, scrollX + innerWidth - w - pad);
    if (top + h > scrollY + innerHeight - pad)
      top = Math.max(pad + scrollY, scrollY + innerHeight - h - pad);
    setPosition({ left, top });
  }, [at]);

  if (!at || !position) return null;
  return (
    <div
      ref={ref}
      className="ctx-menu"
      style={{ left: position.left, top: position.top, position: "absolute" }}
      role="menu"
    >
      <button role="menuitem" onClick={onAssign}>
        Assign to viewport
      </button>
      <button role="menuitem" onClick={onExport}>
        Export
      </button>
      <button role="menuitem" onClick={onAnonymize}>
        Anonymize
      </button>
      <button role="menuitem" onClick={onVideo}>
        Export video
      </button>
    </div>
  );
}
