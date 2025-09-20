# Contributing

## Tooling

- Language: TypeScript; Build: Vite.
- Tests: Vitest (+ fast-check). E2E-capable structure (Playwright-ready).
- Lint/Format: ESLint + Prettier.
- Pre-commit hooks via `pre-commit` (optional) to run lint/format; CI enforces same.

## Getting started

1. `npm i`
2. `npm test`
3. `npm run dev`

## Adding a requirement

- Edit `REQUIREMENTS.yml`.
- Add/adjust tests referencing the requirement with `// @req: <ID>` in the test body.
- Ensure `tools/check_requirements.ts` passes in CI.

## Commit conventions

- Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`).
- Keep vertical slices small (<150 LOC typical).

## Running checks locally

- `npm run lint` / `npm run typecheck` / `npm run coverage` / `npm run mutation:quick`
- `pre-commit install` then commit to run local hooks.

## Privacy & offline

- Do not add code that performs network requests in runtime paths.
- No telemetry or analytics.
