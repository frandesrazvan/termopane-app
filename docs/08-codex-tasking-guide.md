# Codex tasking guide

Use this guide when asking Codex or another implementation agent to work in this repository. The
goal is to keep future work aligned with the MVP and avoid invented business logic.

## Required reading by task type

- Any feature task:
  - `AGENTS.md`;
  - `docs/00-product-context.md`;
  - `docs/01-mvp-scope.md`;
  - `docs/04-data-model.md`;
  - `docs/09-non-goals.md`.
- Calculation task:
  - all feature-task docs;
  - `docs/05-calculation-spec.md`;
  - `fixtures/calculation-cases/README.md` if it exists;
  - `packages/calculation/README.md` if it exists.
- PDF task:
  - all feature-task docs;
  - `docs/06-pdf-output-spec.md`;
  - `fixtures/reference-offers/README.md` if it exists.
- Mobile/UI task:
  - all feature-task docs;
  - `docs/07-mobile-ux-spec.md`;
  - `docs/10-localization.md`;
  - relevant existing UI components before editing.
- Auth, RBAC, or data task:
  - all feature-task docs;
  - `docs/03-user-roles.md`;
  - current schema, server actions, middleware, and API boundaries.

## Implementation rules

- Keep the MVP limited to quote generation, catalog admin, calculation, PDFs, saved offers,
  authentication, tenant isolation, and user/company customization.
- Do not implement ERP, stock management, invoicing, CNC export, full cut optimization, CE/DoP, or
  production scheduling unless a task explicitly asks for it.
- Do not invent production formulas. Unknown glass deduction, profile deduction, reinforcement,
  hardware, labor, waste, and pricing rules must be configurable or marked `requires business
  validation`.
- Use TypeScript for app and package code.
- Prefer pure functions for calculation logic.
- Calculation modules must not read from the database directly.
- Calculation inputs must be frozen snapshots.
- Calculation outputs must include warnings and trace data.
- Quote versions must be immutable after sending/locking.
- Price list updates must not silently change old quote versions.
- Manual price overrides must be audited.
- Dealer/restricted users must not see internal material costs unless explicitly permitted.
- Do not expose customer PII in logs, test output, seed data, screenshots, or examples.
- Use synthetic demo data unless a task explicitly authorizes private fixtures.
- User-facing UI and customer-facing documents are Romanian-first. Use the lightweight helpers in
  `apps/web/src/lib/i18n` for shared labels and formatting, and do not translate enum/database/API
  constants.

## Documentation and tests

- Update relevant docs when behavior, data shape, calculation assumptions, PDF output, or role
  behavior changes.
- Update Romanian translations when user-facing behavior changes.
- Update `README.md` when local setup, storage, authentication, commands, or implemented behavior
  changes.
- Add or update tests for business logic, tenant isolation, authorization, quote versioning,
  calculation warnings, and PDF generation when those areas are touched.
- For documentation-only tasks, do not add runtime scaffolding just to make checks pass.
- Run applicable checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and task-specific commands.
  If a command is unavailable, document the exact reason.

## Review checklist

Reviewers should look for:

- missing `tenantId` on tenant-owned records;
- server-side auth/RBAC bypasses;
- leaked internal costs in dealer/customer-facing views;
- customer PII in logs or fixtures;
- mutable sent quote versions;
- old quotes depending on live price lists;
- calculation code that reads the database or mutates inputs;
- missing warnings/trace data for calculation uncertainty;
- invented glass/profile/hardware/pricing formulas;
- fragile PDF layout or missing quote-version binding;
- mobile layout regressions;
- missing tests for touched business logic.
