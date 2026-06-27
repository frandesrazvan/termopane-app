# Pilot deployment smoke tests

`pnpm pilot:smoke` is the repeatable smoke command for pilot deployment verification. It checks the
same runtime safety rules used by the app, then verifies health, document storage, Prisma database
access, tenant/user bootstrap data, and safe quote/PDF basics without using real customer data.

The command prints check names, status, and issue codes only. It does not print database URLs,
storage credentials, auth secrets, cookies, invite tokens, emails, phone numbers, or customer
records.

## When to run it

Run the full smoke test:

- before deploy, against the exact environment values that will be used by the host;
- after deploy, with `BASE_URL` pointing at the deployed web service;
- after rotating database, auth, or document-storage credentials;
- after applying committed Prisma migrations to a pilot database.

Run the narrower storage smoke test, `pnpm storage:smoke`, when you only need to validate bucket
credentials or endpoint behavior. Run `pnpm pilot:smoke` when you need confidence that the deployed
app can boot safely, reach the database, use storage, and render quote/PDF basics.

Run `pnpm pilot:acceptance` against a disposable local/development database before each pilot
release candidate when you need browser-level proof that the current MVP commercial flow still works
end to end. It complements this smoke script rather than replacing it: `pilot:smoke` is deployable
environment health, while `pilot:acceptance` is the synthetic Romanian UI flow.

## Command

```powershell
pnpm pilot:smoke
```

For a deployed host, set `BASE_URL` so the script also calls `/api/health`:

```powershell
$env:BASE_URL="https://your-pilot-host.example"
pnpm pilot:smoke
```

If `BASE_URL` is not configured, the HTTP health check is skipped and the local runtime, storage,
database, and synthetic quote/PDF checks still run.

## Acceptance command

```powershell
pnpm pilot:acceptance
```

The acceptance command runs Prisma generate, committed migration deploy, synthetic seed, and a
Playwright mobile browser test. The suite uses only seeded `@example.test` users and synthetic
records under `seed_tenant_synthetic_termopane`, cleans up prior acceptance records by prefix, and
uses the local email/storage providers. On a fresh machine, install Chromium once with
`pnpm exec playwright install chromium`.

Do not run `pnpm pilot:acceptance` against pilot or production data because it creates and sends a
synthetic quote through the local test workflow.

## Environment values

The full smoke test requires `DATABASE_URL` because it opens a Prisma connection. In production or
pilot-like runs, the existing runtime validator also requires:

- `NODE_ENV=production`;
- `AUTH_SECRET` with at least 32 random characters;
- `AUTH_DEV_LOGIN_ENABLED=false`;
- `DOCUMENT_STORAGE_PROVIDER=s3`;
- `DOCUMENT_STORAGE_S3_ENDPOINT`;
- `DOCUMENT_STORAGE_S3_REGION`;
- `DOCUMENT_STORAGE_S3_BUCKET`;
- `DOCUMENT_STORAGE_S3_ACCESS_KEY_ID`;
- `DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY`;
- `DOCUMENT_STORAGE_S3_FORCE_PATH_STYLE` when the provider needs path-style requests;
- `EMAIL_PROVIDER=resend`;
- `EMAIL_FROM`;
- `RESEND_API_KEY`;
- optional `EMAIL_REPLY_TO`.

Optional smoke values:

- `BASE_URL`: deployed app origin used for `GET /api/health`;
- `PILOT_SMOKE_SYNTHETIC_TENANT_ID`: tenant used for synthetic seed quote metadata lookup;
- `PILOT_SMOKE_SYNTHETIC_QUOTE_NUMBER`: quote number used for synthetic seed quote metadata lookup.

By default, the synthetic metadata check looks for the local seed quote
`seed_tenant_synthetic_termopane` / `SYN-0001`. If that quote is absent, the check is skipped and no
database records are created.

## What it checks

- Runtime config: production safety issue codes from `apps/web/src/lib/env/runtime.ts`, plus
  `DATABASE_URL` presence for the smoke command itself.
- HTTP health: `/api/health` returns service status `ok` when `BASE_URL` is configured.
- Document storage: write, read, and delete a synthetic PDF-like object under
  `smoke-tests/pilot-deployment/...`.
- Database: Prisma can run `SELECT 1`.
- Tenant/user bootstrap: at least one tenant, user, and active tenant membership exists.
- Synthetic PDF: the PDF package renders a synthetic quote in memory.
- Synthetic quote metadata: if the configured synthetic seed quote exists, it has a current version,
  at least one quote item, and quote-PDF document metadata inside the same tenant.

## Failure meanings

- `runtime-config` failure: fix missing or unsafe environment values before testing external
  services.
- `http-health` failure: the deployed service is not reachable, `/api/health` is unhealthy, or the
  app cannot validate runtime/database health from the server process.
- `document-storage` failure: bucket credentials, endpoint, permissions, object lifecycle, or local
  storage path need investigation.
- `database-connection` failure: `DATABASE_URL`, network access, SSL settings, migrations, or the
  managed database status need investigation.
- `tenant-user-presence` failure: the database has not been seeded or bootstrapped with the minimum
  tenant/user/membership records needed for pilot auth.
- `synthetic-pdf-render` failure: the quote PDF rendering package cannot produce basic PDF bytes.
- `synthetic-quote-metadata` failure: the synthetic quote exists but its tenant-scoped version, item,
  or document metadata is incomplete.

Do not fix smoke failures by running `prisma db push` in pilot. Apply committed migrations with
`pnpm db:migrate:deploy`, then rerun `pnpm pilot:smoke`.
