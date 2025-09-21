import React, { useEffect, useRef, useState } from "react";
import { applyTheme } from "./theme/applyTheme";
import { buildManifestWithRegistry, type RepRegistry } from "@src/core/seriesStore";
import {
  createLayout,
  assignSeriesToViewport,
  getAssignments,
  enableDragRearrange,
  type LayoutAPI,
} from "@ui/Layout";
import type { Study } from "@src/types";
import { DropBar } from "./DropBar";
import { SeriesPanel } from "./SeriesPanel";
import { LayoutPicker } from "./LayoutPicker";
import { decodeLayoutState, updateHashForLayout } from "@ui/hashState";
import "./app.css";
import { RepRegistryProvider } from "./context/RepRegistryContext";
import { ToastProvider, useToast } from "./components/ToastProvider";
import { showNotification } from "@src/ui-react/util/notify";

const DEMO_MANIFEST: Study[] = [
  {
    studyInstanceUID: "A",
    patientId: "DEMO",
    patientName: "Demo Patient",
    series: [
      {
        seriesInstanceUID: "S1",
        modality: "CT",
        sopInstances: [{ sopInstanceUID: "1", frameCount: 1 }],
      },
      {
        seriesInstanceUID: "S2",
        modality: "MR",
        sopInstances: [{ sopInstanceUID: "2", frameCount: 1 }],
      },
    ],
  },
];

function AppInner() {
  const [manifest, setManifest] = useState<Study[]>(() => DEMO_MANIFEST);
  const [repRegistry, setRepRegistry] = useState<RepRegistry | null>(null);
  const [rows, setRows] = useState(1);
  const [cols, setCols] = useState(2);
  const [maxEntryBytes, setMaxEntryBytes] = useState<number | undefined>(undefined);
  const layoutRootRef = useRef<HTMLDivElement>(null);
  const layoutApiRef = useRef<LayoutAPI | null>(null);
  const activeViewportRef = useRef<number>(0);

  // Apply theme on mount (idempotent)
  useEffect(() => applyTheme(), []);

  // Note: The demo manifest provides initial content in the static preview.

  // Initialize from hash
  useEffect(() => {
    const parsed = decodeLayoutState(window.location.hash);
    if (parsed) {
      setRows(parsed.r);
      setCols(parsed.c);
      // assignments applied later after layout creation
      // store temporarily on ref
      (layoutApiRef as any)._pendingAssignments = parsed.a;
    }
  }, []);

  // (Re)create layout whenever rows/cols change
  // Note: Layout grid is currently managed by a small imperative helper (createLayout)
  // which renders into layoutRootRef. This avoids a broad refactor across the Hash state,
  // drag-and-drop wiring, and keyboard swap logic. If we migrate the grid to React state,
  // ensure feature parity (hash roundtrip, swaps, DnD, a11y) and update e2e tests.
  useEffect(() => {
    const root = layoutRootRef.current;
    if (!root) return;
    root.innerHTML = "";
    const api = createLayout(root, { rows, cols });
    enableDragRearrange(api);
    layoutApiRef.current = api;

    // Apply any pending assignments parsed from hash
    const pending = (layoutApiRef as any)._pendingAssignments as
      | ReturnType<typeof getAssignments>
      | undefined;
    if (pending?.length) {
      const max = Math.min(pending.length, api.rows * api.cols);
      for (let i = 0; i < max; i++) {
        const ref = pending[i];
        if (ref) assignSeriesToViewport(api, i, ref);
      }
      (layoutApiRef as any)._pendingAssignments = undefined;
    }

    // Sync URL hash when the layout re-renders
    const sync = () => {
      const a = getAssignments(api);
      updateHashForLayout({ r: api.rows, c: api.cols, a }, true);
    };
    // First sync now
    sync();

    // track focus to know active viewport for keyboard assigns
    const cells = root.querySelectorAll<HTMLElement>('[data-test="viewport"]');
    cells.forEach((cell) =>
      cell.addEventListener("focus", () => {
        const id = Number(cell.getAttribute("data-viewport-id") || "0");
        if (!Number.isNaN(id)) activeViewportRef.current = id;
      }),
    );

    // If there are no assignments yet and we have a manifest (seeded demo or loaded),
    // assign first two series deterministically now to make the demo useful without user actions.
    const empty = api._assignments.every((x) => x == null);
    if (empty && manifest.length > 0) {
      const firstStudy = manifest[0];
      const s1 = firstStudy.series[0];
      const s2 = firstStudy.series[1];
      if (s1)
        assignSeriesToViewport(api, 0, {
          studyInstanceUID: firstStudy.studyInstanceUID,
          seriesInstanceUID: s1.seriesInstanceUID,
        });
      if (s2 && api.rows * api.cols > 1)
        assignSeriesToViewport(api, 1, {
          studyInstanceUID: firstStudy.studyInstanceUID,
          seriesInstanceUID: s2.seriesInstanceUID,
        });
      const a2 = getAssignments(api);
      updateHashForLayout({ r: api.rows, c: api.cols, a: a2 }, true);
      // Re-bind DnD listeners after render
      enableDragRearrange(api);
    }
  }, [rows, cols, manifest]);

  // Assign first couple of series as a friendly default when manifest arrives
  useEffect(() => {
    const api = layoutApiRef.current;
    if (!api || manifest.length === 0) return;
    const firstStudy = manifest[0];
    const s1 = firstStudy.series[0];
    const s2 = firstStudy.series[1];
    if (s1)
      assignSeriesToViewport(api, 0, {
        studyInstanceUID: firstStudy.studyInstanceUID,
        seriesInstanceUID: s1.seriesInstanceUID,
      });
    if (s2 && rows * cols > 1)
      assignSeriesToViewport(api, 1, {
        studyInstanceUID: firstStudy.studyInstanceUID,
        seriesInstanceUID: s2.seriesInstanceUID,
      });
    // sync hash after auto-assigns
    const a = getAssignments(api);
    updateHashForLayout({ r: api.rows, c: api.cols, a }, true);
    // Re-bind DnD listeners after render
    enableDragRearrange(api);
  }, [manifest, rows, cols]);

  // Global shortcuts: Alt+1..9 focuses viewport; active viewport index is used for assigns
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey) {
        const k = e.key;
        if (k >= "1" && k <= "9") {
          e.preventDefault();
          const idx = Math.min(Number(k) - 1, rows * cols - 1);
          activeViewportRef.current = idx;
          const el = layoutRootRef.current?.querySelector<HTMLElement>(
            `[data-test="viewport"][data-viewport-id="${idx}"]`,
          );
          el?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows, cols]);

  async function handleFiles(files: File[]) {
    // Prefer scoped registry to avoid cross-session leakage
    const { manifest: m, repRegistry: rep, stats } = await buildManifestWithRegistry(files);
    const title = `Import complete: ${stats.series} series / ${stats.instances} instances from ${stats.acceptedFiles}/${stats.inputFiles} files`;
    console.info(title);
    console.table({
      inputFiles: stats.inputFiles,
      acceptedFiles: stats.acceptedFiles,
      skippedFiles: stats.skippedFiles,
      studies: stats.studies,
      series: stats.series,
      instances: stats.instances,
    });
    try {
      showNotification(
        stats.series > 0
          ? title
          : `No valid DICOM series found in ${stats.inputFiles} selected file(s).`,
        stats.series > 0 ? "success" : "warning",
      );
    } catch {}
    setManifest(m);
    setRepRegistry(rep);
  }

  return (
    <div className="app-grid">
      <header className="dropbar">
        <DropBar onFiles={handleFiles} maxEntryBytes={maxEntryBytes} />
        <div className="layout-controls">
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span>Max ZIP entry bytes:</span>
            <input
              type="number"
              min={0}
              step={1024 * 1024}
              placeholder="unlimited"
              value={typeof maxEntryBytes === "number" ? maxEntryBytes : ""}
              onChange={(e) => {
                const v = Number(e.currentTarget.value);
                setMaxEntryBytes(Number.isFinite(v) && v > 0 ? v : undefined);
              }}
              style={{ width: 160 }}
              aria-label="Max ZIP entry bytes"
            />
          </label>
          <LayoutPicker
            rows={rows}
            cols={cols}
            onChange={(r: number, c: number) => {
              setRows(r);
              setCols(c);
            }}
          />
        </div>
      </header>

      <RepRegistryProvider value={repRegistry}>
        <aside className="left-rail">
          <SeriesPanel
            manifest={manifest}
            onAssign={(studyInstanceUID: string, seriesInstanceUID: string, viewportId = 0) => {
              const api = layoutApiRef.current;
              if (!api) return;
              const target = Number.isFinite(viewportId) ? viewportId : activeViewportRef.current;
              assignSeriesToViewport(api, target, { studyInstanceUID, seriesInstanceUID });
              const a = getAssignments(api);
              updateHashForLayout({ r: api.rows, c: api.cols, a }, true);
            }}
          />
        </aside>
      </RepRegistryProvider>

      <main className="viewer-area">
        <div
          ref={layoutRootRef}
          className="viewer-grid"
          data-test="layout-root"
          data-testid="layout-root"
        />
      </main>
    </div>
  );
}

export default function App() {
  // Provide a global bridge for notify.ts without coupling
  function Bridge() {
    const t = useToast();
    (globalThis as any).__DTK_TOAST__ = t ?? undefined;
    return null;
  }
  return (
    <ToastProvider>
      <Bridge />
      <AppInner />
    </ToastProvider>
  );
}
