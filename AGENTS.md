# AGENTS.md

## Project

This repository implements a mobile-first SaaS/PWA for Romanian termopane offer generation.

The app helps business users generate customer offers for PVC/aluminium windows, doors, and custom items. The MVP focuses on quote generation, catalog admin, calculation, PDF output, saved offers, authentication, tenant isolation, and user customization.

Do not implement production ERP, CNC export, stock management, full cut optimization, CE/DoP, or invoicing unless a task explicitly asks for it.

## Required context

Before implementing any feature, read the relevant docs:

- `docs/00-product-context.md`
- `docs/01-mvp-scope.md`
- `docs/04-data-model.md`
- `docs/05-calculation-spec.md`
- `docs/06-pdf-output-spec.md`
- `docs/09-non-goals.md`

For calculation work, also read:

- `fixtures/calculation-cases/README.md`
- `packages/calculation/README.md` if it exists

For PDF work, also read:

- `fixtures/reference-offers/README.md`
- `docs/06-pdf-output-spec.md`

## Business rules

- Never invent real production formulas.
- Unknown glass deduction, profile deduction, reinforcement, hardware, or pricing rules must be represented as configurable fields or explicit TODOs.
- Quote versions must be immutable after sending.
- Price list updates must not silently change old quotes.
- Manual price overrides must be audited.
- Dealer users must not see internal material costs unless explicitly permitted.
- Every tenant-owned business record must include `tenantId`.
- Do not expose customer PII in logs.
- Use synthetic demo data unless a task explicitly says to use private fixtures.

## Tech conventions

- Use TypeScript.
- Prefer pure functions for calculation logic.
- Do not let calculation modules read from the database directly.
- Calculation inputs must be frozen snapshots.
- Calculation outputs must include warnings and trace data.
- Prefer small, composable components.
- Keep mobile responsiveness as a default requirement.

## Commands

Use these commands when applicable:

- Install: `pnpm install`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Unit tests: `pnpm test`
- E2E tests: `pnpm test:e2e`
- Prisma generate: `pnpm prisma generate`
- Prisma migrate: `pnpm prisma migrate dev`
- Seed: `pnpm db:seed`

If a command is missing, add it before relying on it.

## Definition of done

A task is done only when:

- implementation matches the issue;
- relevant docs are updated;
- relevant tests are added or updated;
- lint/typecheck/tests pass, or failures are documented with exact reason;
- no unrelated files are changed;
- no production secrets are added;
- PR description explains what changed, what was tested, and what remains out of scope.

## Review guidelines

When reviewing PRs, focus on:

- tenant isolation;
- auth/RBAC bypasses;
- leaked internal costs;
- incorrect quote versioning;
- calculation mutations or hidden database reads;
- fragile PDF generation;
- mobile layout regressions;
- missing tests for business logic;
- invented domain assumptions.