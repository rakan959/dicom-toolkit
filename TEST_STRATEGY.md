# Test Strategy

Tests are the executable specification. Every requirement in `REQUIREMENTS.yml` must be referenced by at least one test with the annotation `@req: <ID>` in a line comment.

## Test types

- Acceptance tests (Vitest + Playwright-ready structure, headless by default):
  - Drive core flows: load files/zip, browse series, MPR, simple/advanced anonymize, SEG IO, mesh export, video export.
- Property-based tests (fast-check):
  - RNG mapping stability within session (S-001), round-trip MPR coordinates (SPEC invariant), overlay guard behavior (S-002), SEG spatial integrity.
- Metamorphic tests:
  - Input transformations that must preserve outputs, e.g., shuffling file order should not change volume reconstruction; resampling resolution changes should not alter segmentation labels location in world coords; layout permutations shouldn’t change exported content when “layout” capture is used.

## Acceptance scenarios (Given/When/Then)

1. Load & browse — @req: F-001, F-003, F-005, F-015
   Given a folder/zip with DICOM and non-DICOM files
   When the user imports them
   Then only DICOM series appear in the browser with thumbnails and a tree; right-click shows the workflows.

2. Simple anonymize — @req: F-006, S-001, S-002
   Given an input containing PHI in headers and some images with burned-in PHI
   When Simple mode is run
   Then non-DICOM are dropped, DICOM headers are overwritten using per-session stable random mapping, images with burned-in PHI are excluded, pixel data preserved, and a ZIP is produced.

3. Advanced anonymize — @req: F-007, S-003
   Given the same input
   When Advanced mode is used with pixel redaction and custom tags
   Then all images can be kept, pixels are redacted irreversibly, and the output ZIP contains modified headers per overrides.

4. US support — @req: F-008
   Given a multi-frame ultrasound
   When loaded
   Then frames play and can be anonymized and exported.

5. MPR — @req: F-004
   Given a CT volume
   When MPR is enabled
   Then orthogonal planes render with proper spacing and orientation.

6. SEG IO + Mesh — @req: F-009, F-010, F-011
   Given a labelmap
   When exporting to DICOM SEG and re-importing
   Then spatial metadata is preserved; mesh export succeeds as STL and GLB.

7. Video export — @req: F-012, F-013
   Given a loaded series and a 2×2 layout
   When exporting video with defaults
   Then H.264 MKV is produced with expected FPS and no overlays/annotations by default.

## Properties & metamorphic relations

- RNG mapping stability (S-001): For any set of PHI strings S within a session, mapping m is injective, stable within the session, and non-reusable across sessions.
- Round-trip MPR: World→slice→world preserves coordinates within ≤ half-voxel tolerance.
- Overlay guard (S-002): With `allowPHIOverlays=false`, any overlay layer containing PHI is excluded from both viewport and exports.
- SEG spatial integrity: FrameOfReferenceUID and spacing preserved across SEG export/import.
- Metamorphic 1: Permuting instance file order does not change reconstructed volume or slice positions.
- Metamorphic 2: Uniform resample of volume resolution keeps segmentation boundaries aligned in world space (tolerance bounded).
- Metamorphic 3: Changing viewport arrangement (layout order) while exporting “layout” preserves the same pixel content per viewport in the resulting video frames.

## Data generation

- Builders generate synthetic DICOM-like metadata objects and pixel arrays (no PHI); ultrasound multi-frame mocks; CT volumes with consistent spacing.

## Traceability index

Each acceptance/property/metamorphic test lists `@req:` tags linking to `REQUIREMENTS.yml`. The CI script `tools/check_requirements.ts` enforces that every requirement is referenced by at least one test.

## Coverage policy (N-002)

- Coverage thresholds are enforced at 80% (lines/funcs/branches/statements) over executable source files only.
- We include `src/**/*.{ts,tsx}` and exclude non-executable or config/scaffold files (site, tools, contracts, d.ts, barrel index.ts) to measure meaningful coverage.
- Mutation quick-run is tracked separately and must remain above the configured break threshold.
