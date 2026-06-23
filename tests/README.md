# Test conventions

Keep tests close to the behavior they protect and use synthetic data only.

## File names

- Unit and smoke tests use `*.test.ts` or `*.test.tsx`.
- Integration tests use `*.integration.test.ts`.
- E2E tests, when added, should live under `tests/e2e`.

## Placement

- App smoke tests can live next to the Next.js route or component they import.
- Package tests live beside package source under `packages/*/src`.
- Shared cross-package fixtures can live under `tests/fixtures` after the data shape is stable.

## Guardrails

- Do not use real customer/private data.
- Do not encode unvalidated production formulas as expected values.
- Prefer deterministic tests that do not require network access or a running database.
- Calculation tests should assert warnings and trace behavior when calculation work is introduced.
