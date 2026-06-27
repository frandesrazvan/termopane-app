# AGENTS.md

## Project

This repository implements a mobile-first SaaS/PWA for Romanian termopane offer generation.

The app helps business users generate customer offers for PVC/aluminium windows, doors, and custom items. The MVP focuses on quote generation, catalog admin, calculation, PDF output, saved offers, authentication, tenant isolation, and user customization.

Do not implement production ERP, CNC export, stock management, full cut optimization, CE/DoP, or invoicing unless a task explicitly asks for it.

## Required context

Before implementing features, read the relevant docs:

- `docs/00-product-context.md`
- `docs/01-mvp-scope.md`
- `docs/02-domain-glossary.md`
- `docs/03-user-roles.md`
- `docs/04-data-model.md`
- `docs/05-calculation-spec.md`
- `docs/06-pdf-output-spec.md`
- `docs/07-mobile-ux-spec.md`
- `docs/08-codex-tasking-guide.md`
- `docs/09-non-goals.md`
- `docs/10-localization.md`
- `docs/11-business-owner-review-pack.md`
- `docs/12-production-deployment-hardening.md`
- `docs/13-database-migrations.md`
- `docs/14-pilot-smoke-tests.md`

## Business rules

- Never invent real production formulas.
- Unknown glass deduction, profile deduction, reinforcement, hardware, or pricing rules must be configurable fields or explicit TODOs.
- Quote versions must be immutable after sending.
- Price list updates must not silently change old quotes.
- Manual price overrides must be audited.
- Dealer users must not see internal material costs unless explicitly permitted.
- Every tenant-owned business record must include `tenantId`.
- Do not expose customer PII in logs.
- Invite tokens, auth secrets, storage credentials, email-provider credentials, cookies, and raw
  generated PDFs must not appear in logs, fixtures, docs, or committed files.
- Use synthetic demo data unless a task explicitly says to use private fixtures.
- Historical/reference-offer data must stay synthetic or redacted; never commit original PDFs,
  supplier-confidential spreadsheets, emails, phone numbers, addresses, CUI/CNP, or identifying
  project data.

## Tech conventions

- Use TypeScript.
- Prefer pure functions for calculation logic.
- Do not let calculation modules read from the database directly.
- Calculation inputs must be frozen snapshots.
- Calculation outputs must include warnings and trace data.
- Keep mobile responsiveness as a default requirement.
- Keep user-facing UI, customer-facing previews, and generated offer documents Romanian-first.
- Keep PRs small and scoped.
- Use committed Prisma migrations for schema changes and deployment; do not use `prisma db push` as
  a pilot or production path.

## Commands

- Install: `pnpm install`
- Dev: `pnpm dev`
- Build: `pnpm build`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Test: `pnpm test`
- Env default check: `pnpm env:check-defaults`
- Reference-offer validation: `pnpm reference:validate`
- Deploy migrations: `pnpm db:migrate:deploy`
- Storage smoke: `pnpm storage:smoke`
- Pilot smoke: `pnpm pilot:smoke`
- Pilot acceptance: `pnpm pilot:acceptance`

If a command is missing, add it before relying on it.

Command notes:

- `pnpm db:migrate:deploy` requires a target `DATABASE_URL` and applies only committed migrations.
- `pnpm storage:smoke` requires the intended document storage env and uses synthetic PDF-like bytes.
- `pnpm pilot:smoke` should use production-like env and `BASE_URL` for deployed health checks.
- `pnpm pilot:acceptance` runs migrations, reseeds synthetic local data, starts the app, and drives
  the mobile Playwright commercial flow; use only disposable local/development databases.
- `pnpm reference:validate` validates the synthetic reference pack and the redacted historical pack;
  `missing-data` is acceptable for an unfinished owner-review pack, but mismatches must be addressed.

## Definition of done

A task is done only when:

- implementation matches the issue;
- relevant docs are updated;
- relevant tests are added or updated;
- lint/typecheck/tests pass, or failures are documented with exact reason;
- relevant operational checks above pass when the task touches deployment, storage, email,
  migrations, reference-offer fixtures, or pilot acceptance;
- no unrelated files are changed;
- no production secrets are added;
- PR description explains what changed, what was tested, and what remains out of scope.

## Review guidelines

When reviewing PRs, focus on:

- tenant isolation;
- auth/RBAC bypasses;
- invite-token auth: raw tokens are shown only once, stored only as hashes, are single-use/expiring,
  and development login remains disabled in pilot/production;
- leaked internal costs;
- incorrect quote versioning;
- calculation mutations or hidden database reads;
- fragile PDF generation;
- document storage providers: local stays dev/test, S3-compatible storage is server-side only,
  storage keys are not exposed, generated PDFs remain tenant-scoped, and failures do not orphan
  metadata or objects silently;
- email providers: local delivery is synthetic/redacted, real providers such as Resend use
  server-side secrets, full recipient emails are not written to logs or audit metadata, and provider
  failures do not mark quotes as sent;
- migrations: schema changes use committed migration directories, migration SQL is reviewed, no real
  data or secrets are inserted, and `prisma db push` is not used for pilot/production;
- reference-offer validation: packs are synthetic or redacted, missing business input remains
  visible, expected totals/warnings/PDF fields match the harness, and no private artifacts are
  committed;
- Romanian labels and `ro-RO` formatting for user-facing UI, previews, generated PDFs, and E2E
  assertions;
- pilot acceptance tests cover the mobile core commercial flow with synthetic data and stay runnable
  through `pnpm pilot:acceptance`;
- mobile layout regressions;
- missing tests for business logic;
- invented domain assumptions.
