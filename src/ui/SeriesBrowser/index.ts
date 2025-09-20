import type { Study } from "@src/types";

export interface SeriesBrowserCallbacks {
  onRename?: (studyUID: string, seriesUID: string) => void;
  onRemove?: (studyUID: string, seriesUID: string) => void;
  onExport?: (studyUID: string, seriesUID: string) => void;
  onExportAnonymized?: (studyUID: string, seriesUID: string) => void;
  onExportVideo?: (studyUID: string, seriesUID: string) => void;
  onRouteToAdvancedAnonymize?: (studyUID: string, seriesUID: string) => void;
}

function byAsc(a: string, b: string): number {
  return a.localeCompare(b);
}

/**
 * Renders the Series Browser tree into the provided root element.
 * Minimal DOM without framework; deterministic ordering by UID.
 * - Studies sorted by studyInstanceUID
 * - Series sorted by seriesInstanceUID
 */
export function renderSeriesBrowser(
  root: HTMLElement,
  manifest: Study[],
  cb: SeriesBrowserCallbacks = {},
) {
  // Clear root
  root.innerHTML = "";

  const container = document.createElement("div");
  container.setAttribute("data-test", "series-browser");

  // Sort studies deterministically
  const studies = [...manifest].sort((a, b) => byAsc(a.studyInstanceUID, b.studyInstanceUID));
  for (const st of studies) {
    const stEl = document.createElement("section");
    stEl.setAttribute("data-test", "study-item");
    stEl.setAttribute("data-study-uid", st.studyInstanceUID);

    const h = document.createElement("h3");
    h.textContent = `Study ${st.studyInstanceUID}`;
    stEl.appendChild(h);

    const ul = document.createElement("ul");
    const series = [...st.series].sort((a, b) => byAsc(a.seriesInstanceUID, b.seriesInstanceUID));
    for (const se of series) {
      const li = document.createElement("li");
      li.setAttribute("data-test", "series-item");
      li.setAttribute("data-series-uid", se.seriesInstanceUID);
      li.textContent = se.description ?? se.seriesInstanceUID;

      const actions = document.createElement("div");
      actions.setAttribute("data-test", "series-actions");

      const mkBtn = (label: string, testId: string, handler?: () => void) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = label;
        btn.setAttribute("data-test", testId);
        if (handler) btn.addEventListener("click", handler);
        return btn;
      };

      actions.appendChild(
        mkBtn("Rename", "action-rename", () => cb.onRename?.(st.studyInstanceUID, se.seriesInstanceUID)),
      );
      actions.appendChild(
        mkBtn("Remove", "action-remove", () => cb.onRemove?.(st.studyInstanceUID, se.seriesInstanceUID)),
      );
      actions.appendChild(
        mkBtn("Export", "action-export", () => cb.onExport?.(st.studyInstanceUID, se.seriesInstanceUID)),
      );
      actions.appendChild(
        mkBtn(
          "Export Anonymized",
          "action-export-anon",
          () => cb.onExportAnonymized?.(st.studyInstanceUID, se.seriesInstanceUID),
        ),
      );
      actions.appendChild(
        mkBtn(
          "Export Video",
          "action-export-video",
          () => cb.onExportVideo?.(st.studyInstanceUID, se.seriesInstanceUID),
        ),
      );
      actions.appendChild(
        mkBtn(
          "Advanced Anonymize…",
          "action-advanced-anon",
          () => cb.onRouteToAdvancedAnonymize?.(st.studyInstanceUID, se.seriesInstanceUID),
        ),
      );

      li.appendChild(actions);
      ul.appendChild(li);
    }
    stEl.appendChild(ul);
    container.appendChild(stEl);
  }

  root.appendChild(container);
}

export default {
  renderSeriesBrowser,
};
