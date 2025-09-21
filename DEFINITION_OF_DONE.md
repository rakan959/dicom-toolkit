# Definition of Done

- All acceptance, property, and metamorphic tests for the task pass locally and in CI.
- Coverage ≥ 80% (branch/line) for touched code.
- Mutation testing quick-run meets configured threshold; nightly run passes on `main`.
- `tools/check_requirements.ts` passes and every changed requirement has at least one `@req:` reference in tests.
- Lint (ESLint), format (Prettier), and type checks (tsc) pass.
- If UI is affected, basic accessibility checks (landmark roles, labels) are added.
- Documentation updated: TEST_STRATEGY/ROADMAP as needed.
- No network calls at runtime (verified by tests/mocks).
- For anonymization changes: PHI guard and redaction properties have tests proving invariants.

## UI-specific gates

- Lighthouse Accessibility ≥ 90 on main views (locally via CI script).
- UI shell JS budget ≤ 250 KiB gz (excluding heavy adapters) with a CI check.
- Playwright smoke suite green on CI (headless), with screenshots on failure.
- Contrast validation script passes for text and interactive tokens (≥ 4.5:1).
- Keyboard navigation verified (tab order, focus visible, escape closes dialogs).
