# Roadmap

Deterministic selection rule: Next task = the first task with `status=todo` whose `depends_on` are all `done`, ordered by (status, priority ASC, size ASC, id ASC).

## Slice map (why this order)

1. Bootstrapping & CI gives fast feedback (lint, types, tests, traceability).
2. Core series store & import unlocks viewer and anonymizer paths.
3. Simple anonymizer delivers immediate value and derisks privacy constraints.
4. Viewer layout & series browser enables visual workflows.
5. MPR, US, SEG, Mesh, Video export layered in small increments.

### Task table

| id  | title                                                  | status | priority | size | risk | depends_on | requirements                    | artifacts_to_touch                                                   | acceptance_tests  | properties             |
| --- | ------------------------------------------------------ | ------ | -------- | ---- | ---- | ---------- | ------------------------------- | -------------------------------------------------------------------- | ----------------- | ---------------------- |
| T01 | Init repo, CI, lint, types, coverage, mutation (quick) | done   | 1        | S    | M    | []         | [N-001,N-002,N-003,N-004,F-002] | package.json, tsconfig.json, vitest.config.ts, .github/workflows/\*  | A00-CI-smoke      | P00-traceability       |
| T02 | Series import: file/dir/zip parsing & manifest         | done   | 1        | M    | M    | [T01]      | [F-001,F-015]                   | src/core/seriesStore.ts, CONTRACTS/dicom-series-manifest.schema.json | A01-load-browse   | M01-permute-order      |
| T03 | Simple anonymizer pipeline                             | done   | 1        | M    | M    | [T02]      | [F-006,S-001,S-002]             | src/core/anonymizer.ts                                               | A02-simple-anon   | P01-rng-map            |
| T04 | Series browser UI + context menus                      | done   | 2        | M    | M    | [T02]      | [F-005,F-014]                   | src/ui/SeriesBrowser/\*                                              | A01-load-browse   | —                      |
| T05 | Advanced anonymizer (preview, redaction, overrides)    | done   | 2        | M    | H    | [T03,T04]  | [F-007,S-003]                   | src/core/anonymizer.ts, src/ui/AnonymizerAdvanced/\*                 | A03-advanced-anon | P02-redaction          |
| T06 | Configurable layout + viewport assignment              | done   | 2        | S    | M    | [T04]      | [F-003]                         | src/ui/Layout/\*                                                     | A04-layout        | —                      |
| T07 | MPR engine & adapter                                   | done   | 3        | M    | M    | [T02,T06]  | [F-004]                         | src/core/mpr.ts, adapters/cornerstone/\*                             | A05-mpr           | P03-mpr-roundtrip      |
| T09 | Segmentation tools (brush/threshold/region/lasso)      | done   | 3        | M    | H    | [T06]      | [F-009]                         | src/core/segmentation.ts                                             | A07-seg           | M02-resample           |
| T10 | DICOM SEG import/export                                | done   | 3        | M    | H    | [T09]      | [F-010]                         | src/core/segmentation.ts                                             | A08-seg-io        | P04-seg-spatial        |
| T11 | Mesh generation + STL/GLB export                       | done   | 4        | S    | M    | [T09]      | [F-011]                         | src/core/mesh.ts                                                     | A09-mesh          | —                      |
| T12 | Video export (H.264 MKV default)                       | done   | 4        | M    | M    | [T06]      | [F-012,F-013]                   | src/core/video/exporter.ts                                           | A10-video         | M03-layout-permutation |
| T13 | GH Pages deploy workflow                               | done   | 1        | XS   | L    | [T01]      | [F-002]                         | .github/workflows/gh-pages.yml, vite.config.ts                       | A11-gh-pages      | —                      |
| T14 | Advanced anonymizer UI preview & routing polish        | done   | 2        | S    | M    | [T05,T04]  | [F-007,F-014]                   | src/ui/AnonymizerAdvanced/\*                                         | A03-advanced-anon | —                      |

- id: T07
  title: MPR engine & adapter
  status: done
  priority: 3
  size: M
  risk: M
  depends_on: [T02, T06]
  requirements: [F-004]
  artifacts_to_touch: [src/core/mpr.ts, adapters/cornerstone/*]
  acceptance_tests: [A05-mpr]
  properties: [P03-mpr-roundtrip]

### Task YAML (agent-friendly)

- id: T01
  title: Init repo, CI, lint, types, coverage, mutation (quick)
  status: done
  priority: 1
  size: S
  risk: M
  depends_on: []
  requirements: [N-001, N-002, N-003, N-004, F-002]
  artifacts_to_touch: [package.json, tsconfig.json, vitest.config.ts, .github/workflows/ci.yml, .github/workflows/nightly-mutation.yml]
  acceptance_tests: [A00-CI-smoke]
  properties: [P00-traceability]

- id: T02
  title: Series import: file/dir/zip parsing & manifest
  status: done
  priority: 1
  size: M
  risk: M
  depends_on: [T01]
  requirements: [F-001, F-015]
  artifacts_to_touch: [src/core/seriesStore.ts, CONTRACTS/dicom-series-manifest.schema.json]
  acceptance_tests: [A01-load-browse]
  properties: [M01-permute-order]

- id: T03
  title: Simple anonymizer pipeline
  status: done
  priority: 1
  size: M
  risk: M
  depends_on: [T02]
  requirements: [F-006, S-001, S-002]
  artifacts_to_touch: [src/core/anonymizer.ts]
  acceptance_tests: [A02-simple-anon]
  properties: [P01-rng-map]

- id: T04
  title: Series browser UI + context menus
  status: done
  priority: 2
  size: M
  risk: M
  depends_on: [T02]
  requirements: [F-005, F-014]
  artifacts_to_touch: [src/ui/SeriesBrowser/*]
  acceptance_tests: [A01-load-browse]
  properties: []

- id: U01
  title: UI theme toggle tests (property + metamorphic) for idempotence and system-pref fallback
  status: done
  priority: 1
  size: XS
  risk: L
  depends_on: [T01]
  requirements: [F-101]
  artifacts_to_touch: [tests/property/ui_theme_idempotence_property.test.tsx, tests/metamorphic/ui_theme_pref_metamorphic.test.tsx]
  acceptance_tests: [A12-ui-theme]
  properties: []

- id: T22
  title: Traceability inverse check (no unknown @req IDs)
  status: done
  priority: 1
  size: XS
  risk: L
  depends_on: [T01]
  requirements: [N-004]
  artifacts_to_touch: [tests/meta/traceability_unknown_ids.test.ts]
  acceptance_tests: [A00-CI-smoke]
  properties: []

- id: T21
  title: Offline-only guardrail (no network APIs in source)
  status: done
  priority: 1
  size: XS
  risk: L
  depends_on: [T01]
  requirements: [N-005]
  artifacts_to_touch: [tests/meta/offline_guard.test.ts]
  acceptance_tests: [A00-CI-smoke]
  properties: []

- id: T16
  title: Extract deterministic UID generator for tests
  status: done
  priority: 1
  size: XS
  risk: L
  depends_on: [T15]
  requirements: [F-010]
  artifacts_to_touch: [tests/setup/uid.ts, tests/property/seg_io_uids_roundtrip.test.ts]
  acceptance_tests: [A08-seg-io]
  properties: []

- id: T17
  title: SEG IO error-case tests (invalid input & size mismatches)
  status: done
  priority: 1
  size: XS
  risk: L
  depends_on: [T15]
  requirements: [F-010]
  artifacts_to_touch: [tests/property/seg_io_errors.test.ts]
  acceptance_tests: [A08-seg-io]
  properties: []

- id: T18
  title: SEG legacy JSON import (no preamble) test
  status: done
  priority: 1
  size: XS
  risk: L
  depends_on: [T15]
  requirements: [F-010]
  artifacts_to_touch: [tests/acceptance/seg_io_legacy_import.test.ts]
  acceptance_tests: [A08-seg-io]
  properties: []

- id: T19
  title: SPEC note for SEG-MIN-1 transitional container
  status: done
  priority: 2
  size: XS
  risk: L
  depends_on: [T18]
  requirements: [F-010]
  artifacts_to_touch: [SPEC.md]
  acceptance_tests: [A08-seg-io]
  properties: []

- id: T20
  title: Refactor any remaining UID generators to shared utility (noop if none)
  status: done
  priority: 3
  size: XS
  risk: L
  depends_on: [T16]
  requirements: [F-010]
  artifacts_to_touch: [tests/**]
  acceptance_tests: [A08-seg-io]
  properties: []

- id: T05
  title: Advanced anonymizer (preview, redaction, overrides)
  status: done
  priority: 2
  size: M
  risk: H
  depends_on: [T03, T04]
  requirements: [F-007, S-003]
  artifacts_to_touch: [src/core/anonymizer.ts, src/ui/AnonymizerAdvanced/*]
  acceptance_tests: [A03-advanced-anon]
  properties: [P02-redaction]

- id: T06
  title: Configurable layout + viewport assignment
  status: done
  priority: 2
  size: S
  risk: M
  depends_on: [T04]
  requirements: [F-003]
  artifacts_to_touch: [src/ui/Layout/*]
  acceptance_tests: [A04-layout]
  properties: []

id: T07
title: MPR engine & adapter
status: done
priority: 3
size: M
risk: M
depends_on: [T02, T06]
requirements: [F-004]
artifacts_to_touch: [src/core/mpr.ts, adapters/cornerstone/*]
acceptance_tests: [A05-mpr]
properties: [P03-mpr-roundtrip]

- id: T08
  title: Ultrasound support (multi-frame)
  status: done
  priority: 3
  size: M
  risk: M
  depends_on: [T02, T06]
  requirements: [F-008]
  artifacts_to_touch: [src/core/seriesStore.ts, adapters/cornerstone/*]
  acceptance_tests: [A06-us]
  properties: []

- id: T09
  title: Segmentation tools (brush/threshold/region/lasso)
  status: done
  priority: 3
  size: M
  risk: H
  depends_on: [T06]
  requirements: [F-009]
  artifacts_to_touch: [src/core/segmentation.ts]
  acceptance_tests: [A07-seg]
  properties: [M02-resample]

- id: T10
  title: DICOM SEG import/export
  status: done
  priority: 3
  size: M
  risk: H
  depends_on: [T09]
  requirements: [F-010]
  artifacts_to_touch: [src/core/segmentation.ts]
  acceptance_tests: [A08-seg-io]
  properties: [P04-seg-spatial]

- id: T10a
  title: Replace SEG placeholder with real DICOM SEG using dcmjs
  status: done
  priority: 3
  size: S
  risk: M
  depends_on: [T10]
  requirements: [F-010]
  artifacts_to_touch: [src/core/segmentation.ts, CONTRACTS/segmentation.schema.json]
  acceptance_tests: [A08-seg-io]
  properties: [P04-seg-spatial]

- id: T10b
  title: Build full DICOM SEG dataset with dcmjs (uses SeriesInstanceUID/FrameOfReference)
  status: done
  priority: 3
  size: M
  risk: M
  depends_on: [T10a]
  requirements: [F-010]
  artifacts_to_touch: [src/core/segmentation.ts]
  acceptance_tests: [A08-seg-io]
  properties: [P04-seg-spatial]

- id: T11
  title: Mesh generation + STL/GLB export
  status: done
  priority: 4
  size: S
  risk: M
  depends_on: [T09]
  requirements: [F-011]
  artifacts_to_touch: [src/core/mesh.ts]
  acceptance_tests: [A09-mesh]
  properties: []

- id: T12
  title: Video export (H.264 MKV default)
  status: done
  priority: 4
  size: M
  risk: M
  depends_on: [T06]
  requirements: [F-012, F-013]
  artifacts_to_touch: [src/core/video/exporter.ts]
  acceptance_tests: [A10-video]
  properties: [M03-layout-permutation]

- id: T13
  title: GH Pages deploy workflow
  status: done
  priority: 1
  size: XS
  risk: L
  depends_on: [T01]
  requirements: [F-002]
  artifacts_to_touch: [.github/workflows/gh-pages.yml, vite.config.ts]
  acceptance_tests: [A11-gh-pages]
  properties: []

- id: T14
  title: Advanced anonymizer UI preview & routing polish
  status: done
  priority: 2
  size: S
  risk: M
  depends_on: [T05, T04]
  requirements: [F-007, F-014]
  artifacts_to_touch: [src/ui/AnonymizerAdvanced/*]
  acceptance_tests: [A03-advanced-anon]
  properties: []

- id: T15
  title: Stabilize SEG IO UID roundtrip property test (timeout fix)
  status: done
  priority: 1
  size: XS
  risk: L
  depends_on: [T10b]
  requirements: [F-010]
  artifacts_to_touch: [tests/property/seg_io_uids_roundtrip.test.ts]
  acceptance_tests: [A08-seg-io]
  properties: []

- id: T23
  title: Requirements format guard (unique IDs and pattern)
  status: done
  priority: 1
  size: XS
  risk: L
  depends_on: [T01]
  requirements: [N-004]
  artifacts_to_touch: [tests/meta/requirements_format.test.ts]
  acceptance_tests: [A00-CI-smoke]
  properties: []

## Task YAML (agent-friendly) — Unblockers

- id: T24
  title: Enforce vitest coverage "all: true" guard via meta test
  status: done
  priority: 1
  size: XS
  risk: L
  depends_on: [T01]
  requirements: [N-002]
  artifacts_to_touch: [tests/meta/coverage_all_flag.test.ts]
  acceptance_tests: [A00-CI-smoke]
  properties: []
