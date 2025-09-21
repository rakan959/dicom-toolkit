import React from "react";
import { createRoot } from "react-dom/client";
import App from "../src/ui-react/App";
// Expose selected library APIs on window for e2e tests (tree-shaking safe via direct imports)
import { createAdvancedAnonymizerUI } from "../src/ui/AnonymizerAdvanced";
import { exportVideo } from "../src/core/video/exporter";
import { importSEG, exportSEG } from "../src/core/segmentation";
import { meshFromLabelmap } from "../src/core/mesh";
import * as mpr from "../src/core/mpr";

const rootEl = document.getElementById("app");
if (rootEl) {
  const root = createRoot(rootEl);
  // Avoid JSX here to keep site entry simple
  root.render(React.createElement(App));
}

// Attach a testing hook for Playwright. This is harmless in production and helps write e2e
// without building extra UI. Intentionally untyped to avoid affecting app types.
(globalThis as any).__DTK = {
  createAdvancedAnonymizerUI,
  exportVideo,
  importSEG,
  exportSEG,
  meshFromLabelmap,
  mpr,
};
