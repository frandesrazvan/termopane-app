# Production deployment hardening

This checklist prepares a pilot deployment without relying on undocumented local behavior. It is
written for a Node.js host such as Render, with managed PostgreSQL and S3-compatible object storage
for generated PDFs.

## Production environment checklist

- Set `NODE_ENV=production`.
- Set `DATABASE_URL` to the managed PostgreSQL connection string from the host secret store.
- Set `AUTH_SECRET` to a random value of at least 32 characters. Do not use the development
  placeholder from `.env.example`.
- Set `AUTH_DEV_LOGIN_ENABLED=false`. The runtime disables dev login in production even if the env
  value is accidentally set to `true`.
- Set `AUTH_COOKIE_NAME=termopane_session` or another tenant-safe cookie name.
- Set `AUTH_SESSION_DAYS` to the intended pilot session length.
- Use tenant invite links for pilot authentication and keep invite delivery manual until invite
  email delivery is implemented separately.
- Set `DOCUMENT_STORAGE_PROVIDER=s3` for pilot deployments.
- Configure `DOCUMENT_STORAGE_S3_ENDPOINT`, `DOCUMENT_STORAGE_S3_REGION`,
  `DOCUMENT_STORAGE_S3_BUCKET`, `DOCUMENT_STORAGE_S3_ACCESS_KEY_ID`,
  `DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY`, and `DOCUMENT_STORAGE_S3_FORCE_PATH_STYLE`.
- Set `EMAIL_PROVIDER=resend` for pilot customer offer delivery.
- Configure `EMAIL_FROM`, optional `EMAIL_REPLY_TO`, and `RESEND_API_KEY` from the host secret
  store.
- Keep all credentials in the host secret store, not in Git or browser-exposed `NEXT_PUBLIC_*`
  variables.
- Configure the platform health check to call `/api/health`.
- Run the storage smoke test against the target environment before sending real pilot offers.
- Run the full pilot smoke test before and after deploy.

## Runtime safety checks

The app validates production-only safety settings through `apps/web/src/lib/env/runtime.ts`.
Production health checks fail when:

- `AUTH_SECRET` is missing, too short, or a known placeholder;
- `AUTH_DEV_LOGIN_ENABLED=true`;
- `DATABASE_URL` is missing;
- document storage is missing, unsupported, or left as `local`;
- S3-compatible document storage is selected without all required S3 env values.
- customer offer email delivery is missing, unsupported, left as `local`, or selected as Resend
  without all required Resend env values.

Development login is opt-in for local work and is blocked whenever `NODE_ENV=production`.
Pilot login does not depend on development login; invited users accept single-use tenant invite links
and receive the same HTTP-only, SameSite=Lax session cookie.

## Database migration command

Generate Prisma during build:

```powershell
pnpm prisma generate
```

Run deployment migrations before starting the web process:

```powershell
pnpm db:migrate:deploy
```

Committed migrations live under `prisma/migrations`. Review every new `migration.sql` before pilot
deployment, then deploy the committed migration history to the pilot database with the command above.
Do not use `prisma db push` as an undocumented production path. See
`docs/13-database-migrations.md` for the local workflow, SQL review checklist, seeding rules, and CI
limitation for database-backed migration deploy checks.

## Health check

`GET /api/health` returns JSON with service status, runtime-config status, and database status.

- `200` means runtime config and database ping are healthy.
- `503` means at least one check failed.
- The response includes issue codes only, not secrets, customer data, tenant data, or document
  contents.

Example:

```json
{
  "service": "termopane-web",
  "status": "ok",
  "timestamp": "2026-06-26T12:00:00.000Z",
  "checks": [
    { "name": "runtime-config", "status": "ok" },
    { "name": "database", "status": "ok" }
  ]
}
```

## Logging policy

Use `apps/web/src/lib/logging/safe-logger.ts` for server logs that need structured metadata. The
logger redacts common PII and secret keys, and also redacts email-like or phone-like string values.

Do not log:

- customer names, phone numbers, emails, addresses, tax identifiers, or project addresses;
- full quote snapshots, PDF payloads, document bytes, storage credentials, auth secrets, session
  tokens, cookies, or authorization headers;
- internal material costs in customer/dealer-facing flows.

Customer offer email delivery must log only synthetic/redacted metadata. Full recipient emails may be
used for provider delivery and tenant-owned delivery records, but `QUOTE_SENT` audit metadata and
server logs must use redacted recipient values only.

## Storage provider smoke test

Run this after setting the target storage environment:

```powershell
pnpm storage:smoke
```

The command writes, reads, and deletes a synthetic PDF-like object through the configured
`DOCUMENT_STORAGE_PROVIDER`. It does not use customer data and should be run once for every new
bucket, endpoint, credential rotation, or host environment.

## Pilot deployment smoke test

Run the full smoke test after target env values are configured:

```powershell
pnpm pilot:smoke
```

Set `BASE_URL` when checking a deployed service:

```powershell
$env:BASE_URL="https://your-pilot-host.example"
pnpm pilot:smoke
```

The full smoke command checks runtime safety, `/api/health` when `BASE_URL` exists, document
storage write/read/delete, Prisma database connectivity, tenant/user bootstrap records, and
synthetic quote/PDF basics. It prints check names and issue codes only; do not add logs that print
database URLs, auth secrets, storage credentials, invite tokens, emails, cookies, or customer
records.

Use `pnpm storage:smoke` for bucket-only verification. Use `pnpm pilot:smoke` before/after deploy
or after migrations, credential rotation, or infrastructure changes. See
`docs/14-pilot-smoke-tests.md` for required env values and failure meanings.

## Backup and restore notes

Database backups:

- Enable managed PostgreSQL automated backups before pilot users create real offers.
- Record retention, backup frequency, and restore point objective with the business owner.
- Before risky schema changes, take a manual snapshot.
- Test restore into a separate database before declaring backup coverage ready.

Document storage backups:

- Enable bucket versioning or provider-native object protection where available.
- Configure lifecycle policy intentionally; generated quote PDFs are commercial records and should
  not expire silently during the pilot.
- Keep storage credentials scoped to the pilot bucket only.

Restore workflow:

1. Pause write traffic or put the app in maintenance mode at the host.
2. Restore PostgreSQL into a fresh database.
3. Point `DATABASE_URL` to the restored database.
4. Verify S3-compatible storage still contains the document keys referenced by `Document` rows.
5. Run `pnpm storage:smoke` against the restored environment.
6. Open `/api/health` and a synthetic/test tenant quote before resuming pilot traffic.

## Render pilot deployment

Use a Render Web Service for `apps/web`, a Render PostgreSQL database, and an external
S3-compatible bucket for generated PDFs.

Recommended Render settings:

- Runtime: Node.js 20+.
- Build command:

  ```bash
  corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm install --frozen-lockfile && pnpm prisma generate && pnpm build
  ```

- Start command:

  ```bash
  pnpm db:migrate:deploy && pnpm --filter web start
  ```

- Health check path: `/api/health`.
- Secrets: configure all production env values from the checklist in Render environment variables.
- Smoke verification: run `pnpm pilot:smoke` with `BASE_URL` set to the Render service URL after the
  service is live.

Do not deploy the `.env.example` defaults as production secrets. They are development placeholders
and CI checks keep unsafe production defaults disabled.
