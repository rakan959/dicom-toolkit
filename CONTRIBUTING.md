# Contributing

## Tooling

## Getting started

- Stack: React + TypeScript + Vite + Tailwind + shadcn/ui.
- Dev server: `npm run dev` (serves `site/` using `vite.site.config.ts`).
- Component tests: `npm test` (Vitest + jsdom + React Testing Library).
- E2E (optional locally): `npx playwright install && npx playwright test`.

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
