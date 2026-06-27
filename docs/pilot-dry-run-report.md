# COD-043 real pilot environment dry-run report

Date prepared: 2026-06-27

This report is the public-safe runbook and evidence ledger for the first real pilot environment dry
run. Do not paste secrets, raw customer data, full recipient emails, database URLs, invite tokens,
cookies, authorization headers, PDF payloads, bucket credentials, or raw storage keys into this
file. Keep any provider consoles, screenshots, raw logs, and private notes in the operator-controlled
private runbook.

## Current status

Status: pending external pilot execution.

Codex prepared this report from the repository state, but did not run the real external dry run
because this workspace does not have the disposable staging `DATABASE_URL`, real `AUTH_SECRET`,
S3-compatible storage credentials, Resend credentials or selected provider credentials, internal
test recipient, or deployed `BASE_URL`. Those values must remain in the host/operator secret store
and must not be committed.

Local public-safe preflight:

| Check                                    | Status  | Evidence                                                                              |
| ---------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| `.env.example` production defaults       | pass    | `pnpm env:check-defaults` returned `Production env defaults are safe.` on 2026-06-27. |
| Real staging migrations                  | pending | Requires disposable staging `DATABASE_URL`.                                           |
| S3-compatible storage smoke              | pending | Requires target bucket credentials.                                                   |
| Pilot smoke with `BASE_URL`              | pending | Requires deployed service URL and production-like env.                                |
| Manual tenant/invite/quote/PDF/send flow | pending | Requires deployed app and internal test inbox.                                        |

## Required environment

Configure these values only in the host secret store and in the operator shell used for the dry run:

```powershell
$env:NODE_ENV = "production"
$env:AUTH_DEV_LOGIN_ENABLED = "false"
$env:AUTH_SECRET = "<real random secret from secret store>"
$env:AUTH_COOKIE_NAME = "termopane_session"
$env:AUTH_SESSION_DAYS = "7"

$env:DATABASE_URL = "<disposable staging postgres url>"

$env:DOCUMENT_STORAGE_PROVIDER = "s3"
$env:DOCUMENT_STORAGE_S3_ENDPOINT = "<s3-compatible endpoint>"
$env:DOCUMENT_STORAGE_S3_REGION = "<region>"
$env:DOCUMENT_STORAGE_S3_BUCKET = "<pilot dry-run bucket>"
$env:DOCUMENT_STORAGE_S3_ACCESS_KEY_ID = "<access key from secret store>"
$env:DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY = "<secret key from secret store>"
$env:DOCUMENT_STORAGE_S3_FORCE_PATH_STYLE = "true"

$env:EMAIL_PROVIDER = "resend"
$env:EMAIL_FROM = "<verified sender>"
$env:EMAIL_REPLY_TO = "<optional reply-to>"
$env:RESEND_API_KEY = "<resend key from secret store>"

$env:BASE_URL = "https://<pilot-host>"
```

Use a disposable staging database. Do not run `pnpm db:seed` against the pilot database, and do not
use `prisma db push`.

## Command run order

Run these commands from a clean checkout of the commit being deployed:

```powershell
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm env:check-defaults
pnpm build
pnpm db:migrate:deploy
pnpm storage:smoke
pnpm pilot:smoke
```

Expected safe output:

- `pnpm env:check-defaults`: `Production env defaults are safe.`
- `pnpm db:migrate:deploy`: committed migrations apply or report no pending migrations.
- `pnpm storage:smoke`: passes for provider `s3` using a synthetic object under `smoke-tests/...`.
- `pnpm pilot:smoke`: reports `ok` for `runtime-config`, `http-health`, `document-storage`,
  `database-connection`, `tenant-user-presence`, and `synthetic-pdf-render`.
- `synthetic-quote-metadata` may be `skip` before a manual synthetic quote exists; after the quote
  flow below it should be verified through the database/document checks.

## Manual pilot flow

Use only synthetic/customer-safe values:

- tenant display name: `Pilot Dry Run Tenant COD-043`;
- invited user: internal test inbox only, recorded here as `pilot-test-recipient [redacted]`;
- customer display name: `Client sintetic dry-run COD-043`;
- project name: `Proiect sintetic dry-run COD-043`;
- quote title: `Oferta sintetica dry-run COD-043`;
- email recipient: internal test inbox only, redacted in this report.

Steps:

1. Create the pilot tenant through the approved manual process or a controlled one-off bootstrap
   outside Git. Record the redacted tenant id prefix in the private runbook.
2. Sign in as the owner user through invite-token authentication. Confirm development login is not
   available because `AUTH_DEV_LOGIN_ENABLED=false` and `NODE_ENV=production`.
3. Open `/dashboard/settings`, create one invite for the internal test inbox, copy the manual invite
   link, and keep the raw token outside Git.
4. Accept the invite from a fresh browser session using the invited email and tokenized login path.
5. Create one synthetic customer and project.
6. Create one quote with a customer-safe synthetic title.
7. Add at least one line that can calculate from explicit snapshots, plus any additional MVP line
   types needed for the release confidence check.
8. Recalculate, review warnings, and lock the quote version.
9. Generate Template A PDF and Template B PDF from the locked version.
10. Send one generated PDF to the internal test inbox through the configured provider.
11. Download each generated PDF while authenticated in the same tenant.
12. Attempt the same download route in an anonymous browser session and confirm it does not return
    the PDF bytes.

## Evidence ledger

Fill this table only with redacted, customer-safe evidence.

| Area                   | Expected result                              | Actual result | Evidence to record                                              |
| ---------------------- | -------------------------------------------- | ------------- | --------------------------------------------------------------- |
| `/api/health`          | HTTP 200 and JSON `status = ok`              | pending       | Timestamp, status code, check names only.                       |
| Runtime config         | No issue codes                               | pending       | `pnpm pilot:smoke` `runtime-config` line.                       |
| Migrations             | Committed migrations applied                 | pending       | Migration count/applied names, no DB URL.                       |
| Storage smoke          | Synthetic write/read/delete succeeds         | pending       | Provider kind and synthetic prefix only.                        |
| Pilot smoke            | No `fail` checks                             | pending       | Check names/statuses only.                                      |
| Tenant bootstrap       | Tenant and owner membership exist            | pending       | Redacted tenant id prefix and role only.                        |
| Invite                 | One invite created and accepted              | pending       | Invite status, role, accepted timestamp; no raw token or email. |
| Synthetic quote        | Quote exists and is locked/sent as expected  | pending       | Redacted quote number/id prefix and status.                     |
| Template A PDF         | One `Document` row and one private object    | pending       | Document id prefix, template key, checksum prefix.              |
| Template B PDF         | One `Document` row and one private object    | pending       | Document id prefix, template key, checksum prefix.              |
| Email send             | One `QuoteDelivery` row with provider status | pending       | Provider, status, redacted recipient only.                      |
| Logs                   | No secrets or PII                            | pending       | Log query names and zero-match result.                          |
| Authenticated download | Same-tenant authenticated route returns PDF  | pending       | Status code, content type, checksum prefix.                     |
| Anonymous download     | Anonymous route does not return PDF bytes    | pending       | Status code or redirect target category only.                   |
| Direct object access   | S3 object is not public                      | pending       | Provider/console check, no raw object URL.                      |

## Database verification queries

Run read-only queries and record only counts, statuses, and redacted id prefixes:

```sql
SELECT COUNT(*) AS quote_pdf_documents
FROM "Document"
WHERE "tenantId" = '<pilotTenantId>'
  AND "type" = 'QUOTE_PDF';

SELECT "templateKey", COUNT(*) AS document_count
FROM "Document"
WHERE "tenantId" = '<pilotTenantId>'
  AND "type" = 'QUOTE_PDF'
GROUP BY "templateKey";

SELECT "provider", "status", COUNT(*) AS delivery_count
FROM "QuoteDelivery"
WHERE "tenantId" = '<pilotTenantId>'
GROUP BY "provider", "status";

SELECT COUNT(*) AS accepted_invites
FROM "TenantInvite"
WHERE "tenantId" = '<pilotTenantId>'
  AND "acceptedAt" IS NOT NULL
  AND "revokedAt" IS NULL;
```

Do not export rows containing full `recipientEmail`, customer fields, invite token hashes, storage
keys, or quote snapshots into this report.

## Log and privacy checks

Search host logs and provider logs for these categories. Record zero-match evidence in the private
runbook, then summarize only the result here:

- `DATABASE_URL`, `AUTH_SECRET`, `RESEND_API_KEY`, `DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY`,
  `DOCUMENT_STORAGE_S3_ACCESS_KEY_ID`;
- full internal test recipient email;
- invite token or session cookie values;
- customer phone numbers, emails, addresses, CUI/CNP, or real project names;
- raw PDF bytes, full storage keys, authorization headers, cookies, or provider credentials.

Expected: logs contain only issue codes, redacted recipient values, ids, statuses, and synthetic
labels.

## Download access checks

Use the tenant document route:

```text
/dashboard/quotes/<quoteId>/documents/<documentId>
```

Required confirmations:

- authenticated same-tenant user can download the generated PDF;
- anonymous request returns a login redirect, forbidden/not-found response, or another non-PDF
  response;
- if a second tenant is available, cross-tenant authenticated access returns forbidden/not-found and
  does not read object bytes;
- direct S3-compatible object access is private and does not expose a public PDF URL.

## Completion criteria

The first real pilot dry run is complete only when:

- all command checks above have no `fail` status;
- one real pilot tenant exists in the disposable staging database;
- one invite is accepted through the production invite flow;
- one synthetic quote is generated, locked/sent, and has Template A and Template B `Document` rows;
- one internal test email send creates a `QuoteDelivery` row;
- document objects exist in the configured S3-compatible bucket and are private;
- `/api/health` returns `ok`;
- logs are checked and contain no secrets or private customer data;
- generated PDFs are downloadable only through authenticated tenant routes.

## Follow-up decision

If this dry run remains pending because no controlled tenant bootstrap exists, add a separate task
for an audited pilot bootstrap script. That script should create only the minimum tenant, owner user,
owner membership, company settings, quote numbering, and optional catalog seed needed for pilot
authentication, and it must not commit private data or secrets.
