# Architecture

## Modules

- core/ — Pure logic:
  - `seriesStore.ts` — file ingestion, manifest building (CT/MR/US), order normalization.
  - `anonymizer.ts` — PHI mapping, burned-in filter (simple), redaction (advanced).
  - `mpr.ts` — coordinate transforms for slicing.
  - `segmentation.ts` — label editing tools; SEG import/export.
  - `mesh.ts` — marching-cubes wrapper and exporters (STL/GLB).
  - `video/exporter.ts` — frame capture to H.264 MKV (default) using ffmpeg.wasm / WebCodecs.
- adapters/ — Bridging libraries (Cornerstone3D, vtk.js, ffmpeg.wasm). Keep thin and replaceable.
- ui/ — React components: viewer layout, series browser, anonymizer UIs.

## Dependency rules

- `core` depends on nothing else in the repo.
- `adapters` may depend on `core`.
- `ui` may depend on `core` and `adapters`.
- No module in `core` imports UI or browser APIs directly (except typed array utilities and crypto). Use dependency injection for I/O.

## Error handling

- Pure functions throw typed errors with codes (`NotImplemented`, `ValidationError`, `PrivacyViolation`).
- UI catches and displays actionable messages; exports/anonymize show progress and allow cancel.

## Logging

- Use a simple structured logger interface in `core` (level, message, context). In UI, bind to `console` in dev, no remote sinks.

## Keeping the core pure

- WebAssembly-heavy ops (e.g., marching cubes) are called via adapters; `core` exposes pure function interfaces with typed inputs/outputs.
- All randomness goes through `SessionRandom`, enabling deterministic tests via dependency injection if needed.

## Offline enforcement

- No network calls in runtime bundles; CI static analysis forbids `fetch` in `core` and UI runtime paths.
- E2E tests stub any accidental network APIs.
