import { renderSeriesBrowser } from "../src/ui/SeriesBrowser";
import { createLayout, assignSeriesToViewport } from "../src/ui/Layout";
import type { Study } from "../src/types";

function demoManifest(): Study[] {
  return [
    {
      studyInstanceUID: "A",
      series: [
        {
          seriesInstanceUID: "S1",
          modality: "CT",
          sopInstances: [
            { sopInstanceUID: "1", frameCount: 1 },
            { sopInstanceUID: "2", frameCount: 1 },
          ],
        },
        {
          seriesInstanceUID: "S2",
          modality: "CT",
          sopInstances: [{ sopInstanceUID: "10", frameCount: 1 }],
        },
      ],
    },
  ];
}

const root = document.getElementById("app")!;

const browserRoot = document.createElement("div");
renderSeriesBrowser(browserRoot, demoManifest(), {
  onRouteToAdvancedAnonymize: (studyUID: string, seriesUID: string) =>
    console.log("Advanced anonymize clicked", studyUID, seriesUID),
  onExportVideo: (studyUID: string, seriesUID: string) =>
    console.log("Export Video clicked", studyUID, seriesUID),
});
root.appendChild(browserRoot);

const layoutRoot = document.createElement("div");
const api = createLayout(layoutRoot, { rows: 1, cols: 2 });
assignSeriesToViewport(api, 0, { studyInstanceUID: "A", seriesInstanceUID: "S1" });
assignSeriesToViewport(api, 1, { studyInstanceUID: "A", seriesInstanceUID: "S2" });
root.appendChild(layoutRoot);
