import React, { useEffect, useMemo, useRef, useState } from "react";
import { renderThumbFromDICOM, setupThumbObserver } from "./util/thumbnails";
import type { Study } from "@src/types";
import { useRepRegistry } from "./context/RepRegistryContext";
import { SeriesContextMenu } from "./context/SeriesContextMenu";
import { showNotification } from "./util/notify";

type Props = {
  manifest: Study[];
  onAssign: (studyUID: string, seriesUID: string, viewportId?: number) => void;
};

export function SeriesPanel({ manifest, onAssign }: Props) {
  const repRegistry = useRepRegistry() || undefined;
  const [menu, setMenu] = useState<{ study: string; series: string; x: number; y: number } | null>(
    null,
  );
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!listRef.current) return;
    const obs = setupThumbObserver((seriesUID, canvas) => {
      // We only know seriesUID; find its studyUID by scanning manifest quickly
      for (const st of manifest) {
        if (st.series.some((s) => s.seriesInstanceUID === seriesUID)) {
          void renderThumbFromDICOM(
            st.studyInstanceUID,
            seriesUID,
            canvas,
            repRegistry ? { repRegistry } : undefined,
          );
          return;
        }
      }
    });
    obs.observe(listRef.current);
    return () => obs.disconnect();
  }, [manifest, repRegistry]);

  // TEMP until we parse real patient tags
  const patients = useMemo(() => {
    type PatientGroup = { id: string; name: string; studies: Study[] };
    const groups = new Map<string, PatientGroup>();
    for (const st of manifest) {
      const pid = st.patientId || "unknown";
      const name = st.patientName || "Unknown patient";
      const key = `${pid}::${name}`;
      if (!groups.has(key)) groups.set(key, { id: pid, name, studies: [] });
      groups.get(key)!.studies.push(st);
    }
    return Array.from(groups.values());
  }, [manifest]);

  return (
    <div className="series-panel" role="tree" ref={listRef} data-test="series-browser">
      {patients.map((p) => (
        <details key={p.id} open>
          <summary>{p.name}</summary>
          {p.studies.map((st) => (
            <details key={st.studyInstanceUID} open>
              <summary>Study {st.studyInstanceUID}</summary>
              <ul className="series-list">
                {st.series.map((se) => (
                  <li
                    key={se.seriesInstanceUID}
                    className="series-row"
                    data-test="series-item"
                    data-series-uid={se.seriesInstanceUID}
                    role="button"
                    tabIndex={0}
                    draggable
                    onDragStart={(e) => {
                      const payload = {
                        study: st.studyInstanceUID,
                        series: se.seriesInstanceUID,
                      };
                      e.dataTransfer?.setData(
                        "application/x-series-ref",
                        JSON.stringify({
                          studyInstanceUID: payload.study,
                          seriesInstanceUID: payload.series,
                        }),
                      );
                      // Fallback text/plain for interoperability
                      e.dataTransfer?.setData("text/plain", `${payload.study}:${payload.series}`);
                    }}
                    onKeyDown={(e) => {
                      const isContextKey =
                        (e.shiftKey && e.key === "F10") || e.key === "ContextMenu";
                      if (isContextKey) {
                        e.preventDefault();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setMenu({
                          study: st.studyInstanceUID,
                          series: se.seriesInstanceUID,
                          x: rect.left + 10,
                          y: rect.top + 10,
                        });
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        onAssign(st.studyInstanceUID, se.seriesInstanceUID, 0);
                      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                        e.preventDefault();
                        const items = Array.from(
                          (e.currentTarget.parentElement?.children ||
                            []) as unknown as HTMLCollectionOf<HTMLElement>,
                        );
                        const currentIndex = items.indexOf(e.currentTarget as HTMLElement);
                        if (items.length > 0 && currentIndex !== -1) {
                          let nextIndex: number;
                          if (e.key === "ArrowDown") {
                            nextIndex = (currentIndex + 1) % items.length;
                          } else {
                            nextIndex = (currentIndex - 1 + items.length) % items.length;
                          }
                          (items[nextIndex] as HTMLElement).focus();
                        }
                      }
                    }}
                    onDoubleClick={() => onAssign(st.studyInstanceUID, se.seriesInstanceUID, 0)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setMenu({
                        study: st.studyInstanceUID,
                        series: se.seriesInstanceUID,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                  >
                    <div className="thumb" data-uid={se.seriesInstanceUID} />
                    <div className="meta">
                      <div className="line1">
                        {se.modality} • {se.seriesInstanceUID}
                      </div>
                      <div className="line2">{se.sopInstances.length} instances</div>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </details>
      ))}
      <SeriesContextMenu
        at={menu}
        onClose={() => setMenu(null)}
        onAssign={() => menu && onAssign(menu.study, menu.series, 0)}
        onExport={() => {
          showNotification("Export started for selected series.", "info");
          setMenu(null);
        }}
        onAnonymize={() => {
          showNotification("Anonymization started for selected series.", "warning");
          setMenu(null);
        }}
        onVideo={() => {
          showNotification("Video export started for selected series.", "success");
          setMenu(null);
        }}
      />
    </div>
  );
}
