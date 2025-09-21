import React from "react";

type Instance = { sopInstanceUID: string; frameCount: number };
type Series = { seriesInstanceUID: string; modality: string; sopInstances: Instance[] };
type Study = { studyInstanceUID: string; series: Series[] };

export function SeriesBrowser({ manifest }: { manifest: { studies: Study[] } }) {
  // Minimal stub to enable initial tests; fuller UI to be implemented in UI04
  return (
    <div aria-label="Series Browser">
      <input aria-label="Search" role="searchbox" placeholder="Search series" />
      <div aria-live="polite" aria-atomic="true" className="visually-hidden" />
      <ul>
        {manifest.studies.flatMap((s) =>
          (s.series || []).map((ser) => (
            <li
              key={s.studyInstanceUID + ":" + ser.seriesInstanceUID}
              data-testid="series-item"
              aria-label={`${ser.modality} ${s.studyInstanceUID}/${ser.seriesInstanceUID}`}
            >
              {ser.modality} {s.studyInstanceUID}/{ser.seriesInstanceUID}
            </li>
          )),
        )}
      </ul>
    </div>
  );
}
