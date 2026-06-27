# Termopane App

Romanian-first SaaS/PWA for creating customer offers for termopane businesses.

Future work should follow `AGENTS.md` and the docs in `docs/`. The app intentionally avoids
production ERP, CNC export, stock management, invoicing, supplier integrations, and unvalidated
production formulas.

## Current MVP status

- Authentication, tenant context, role permissions, customer/project records, saved quote shells,
  draft quote items, calculation wiring, quote lifecycle, and Template A/B HTML previews are
  present.
- Production-safe pilot login now uses tenant invite links with hashed single-use tokens. Tenant
  OWNER users can create invite links from settings; real email delivery remains stubbed/manual until
  a future provider task.
- PDF generation, local document storage, immutable `Document` records, selected template keys, and
  audit logging are present for generated quote documents.
- Tenant company logo upload is available from `/dashboard/settings` for OWNER/ADMIN users. Logos
  are stored as private tenant assets through the document storage provider and referenced in
  Template A/B quote snapshots through authenticated tenant routes.
- Locked quote versions with generated PDFs can be marked as sent. The workflow records `QUOTE_SENT`,
  `sentAt`, the intended recipient/document stub metadata, and shows a Romanian customer-safe
  confirmation/download screen. Real email delivery is still stubbed unless a future provider is
  explicitly added.
- Document storage now goes through a provider interface. The local provider remains the default
  for dev/test, and an SDK-backed S3-compatible provider is available for deployable object storage.
- Production deployment hardening now includes runtime env validation, production dev-login blocking,
  `/api/health`, PII-redacting server logging helpers, storage and full pilot smoke test commands,
  and a Render pilot deployment checklist.
- Catalog schema and synthetic seed data are present for suppliers, profile systems, profile items,
  glass packages, hardware kits, colors, accessories, services, tax rates, price lists, price-list
  items, and pricing rules.
- Catalog admin UI is available at `/dashboard/catalog`. OWNER and ADMIN memberships can create,
  edit, and archive catalog records; ESTIMATOR and DEALER memberships have read-only catalog access.
- Catalog archive actions use `deletedAt` soft delete and mark records inactive. Unvalidated
  configuration/rule JSON is surfaced with the Romanian `necesită validare business` badge.
- Catalog sections now support tenant-scoped CSV export and dry-run import for suppliers, profile
  systems/items, glass packages, hardware kits, colors, accessories, services, tax rates, price
  lists, and price-list items. Import shows row-level validation errors and publishes only after all
  rows pass OWNER/ADMIN validation.
- Business-owner validation prep is documented in `docs/11-business-owner-review-pack.md` and
  `fixtures/reference-offers`. OWNER/ADMIN dashboard users see `Validare business necesară` when
  tenant catalog, pricing, or calculation settings still require business confirmation.
- Fixed-window quote items now select tenant catalog systems, frame profiles, glass packages,
  colors, and optional hardware placeholders. The selected catalog names, IDs, units, active
  price-list references, and sale-price snapshots are frozen on `QuoteItem.catalogSnapshot`.
- Quote calculation uses selected fixed-window glass/profile price and deduction snapshots where
  available. Missing prices or deduction values still produce warnings instead of invented formulas.
- Draft quotes can now add fixed-window, door, or custom lines. Door items store dimensions, profile
  system, optional frame/threshold/glass/hardware selections, panel/manual pricing notes, color, and
  an orientative door schematic.
- Door calculation is a rough MVP path only: it uses explicit panel/hardware snapshot prices where
  present and emits warnings for missing door-specific panel, lock, threshold, and reinforcement
  formulas instead of inventing production rules.
- Draft quote builder can add catalog-backed accessory, service, transport, and installation lines.
  These lines store frozen `Accessory` or `ServiceItem` snapshots plus active price-list sale-price
  references, and calculation uses only the explicit snapshot quantity/unit/sale price. Transport and
  installation remain manual catalog lines; no distance API or automatic installation formula is
  implemented.
- Draft quote workflow exposes audited commercial controls: authorized OWNER/ADMIN users and
  explicitly permitted ESTIMATOR users can apply item-level final-total overrides and quote-level
  discounts with a required reason. DEALER users remain blocked from these override actions.
- Quote review screens separate calculated totals, quote discounts, manual adjustments, and final
  overridden totals before locking or generating customer-facing documents.
- Saved-offer workflow filters now persist per user with `SavedFilter`, with Romanian quick filters
  for draft/sent/accepted/rejected offers, expiring offers, generated PDFs, missing calculations,
  and warnings.
- Company settings, user preferences, and configurable quote numbering are available at
  `/dashboard/settings`. OWNER and ADMIN users can edit company/PDF defaults, OWNER users can edit
  quote numbering, and all users can keep personal dashboard shortcuts.
- PWA metadata, install manifest, static app icons, conservative service-worker registration, mobile
  dashboard navigation, Romanian loading/error states, and sticky quote total/actions are present for
  mobile sales workflows.
- Pilot reference-offer fixtures are prepared under `fixtures/reference-offers` with synthetic
  redacted examples, a Romanian business-owner collection checklist, sample-output requirements, and
  a pure calculation comparison harness for recreating 10-20 validated historical quotes later.
  `pnpm reference:validate` reports case count, missing business inputs, warning mismatches, total
  mismatches, and template/PDF field mismatches without committing private PDFs or customer data.
- Calculation calibration now accepts owner-provided glass deduction rule snapshots, explicit
  rectangular profile-meter rule snapshots, and explicit hardware/accessory/service material rules.
  Automatic hardware quantities, door production formulas, supplier formulas, transport distance,
  installation labor, and production cutting remain unvalidated until owner-approved data is
  supplied. The committed pack is still synthetic; a 10-20 case owner-validated historical pack has
  not yet been added.

## Stack

- pnpm workspace pinned to `pnpm@9.15.4`
- Next.js app with TypeScript and Tailwind
- Prisma configured for PostgreSQL
- Pure packages for calculation, drawing, and PDF rendering
- Document storage provider abstraction with local development storage under ignored
  `.local-storage/documents`
- GitHub Actions CI for install, Prisma generate, lint, typecheck, test, and build

## Local Setup

1. Install Node.js 20+ and enable pnpm through Corepack:

   ```powershell
   corepack prepare pnpm@9.15.4 --activate
   corepack enable
   ```

   On Windows, if `corepack enable` fails with `EPERM` while writing into your Node install path,
   use the npm fallback:

   ```powershell
   npm install -g pnpm@9.15.4
   ```

   If PowerShell blocks `pnpm.ps1`, run commands through `pnpm.cmd` or relax the current-user
   execution policy:

   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   ```

2. Install dependencies:

   ```powershell
   pnpm install
   ```

3. Copy environment values:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Provide PostgreSQL. Local Docker works:

   ```powershell
   docker compose up -d postgres
   ```

   A cloud PostgreSQL database is also fine for development. Put its connection string in
   `DATABASE_URL` in `.env`.

5. Apply committed Prisma migrations and seed synthetic demo data:

   ```powershell
   pnpm prisma generate
   pnpm prisma migrate dev
   pnpm db:seed
   ```

   `pnpm prisma migrate dev` applies the committed migrations to your local database and creates a
   new local migration when `prisma/schema.prisma` changes. `pnpm db:seed` is for synthetic
   local/development data only; do not run it against pilot or production databases.

6. Start the web app:

   ```powershell
   pnpm dev
   ```

The web app runs at `http://localhost:3000` by default. Development login requires
`AUTH_DEV_LOGIN_ENABLED="true"` in your local `.env`; `.env.example` keeps it disabled by default so
it is not accidentally copied into production. Production and pilot users should sign in through
tenant invite links, not through development login.

## Seed Users

Synthetic users seeded for local testing:

- `owner@example.test`
- `admin@example.test`
- `estimator@example.test`
- `dealer@example.test`

Use only synthetic data in fixtures, screenshots, and docs.

## Authentication And Invites

Pilot authentication uses a minimal invite-token and passwordless link foundation:

- OWNER users create invites from `/dashboard/settings`;
- each invite stores the invited email, tenant, role, token hash, expiry, accepted timestamp, and
  revoked timestamp;
- the raw token is shown only once as a manual delivery link because real email sending is still
  stubbed;
- invite acceptance asks the user to confirm the invited email and then sets the existing HTTP-only
  session cookie;
- expired, revoked, already accepted, cross-tenant, or disabled-membership invites are rejected.

Keep `AUTH_DEV_LOGIN_ENABLED="false"` for pilot and production. Local development login remains
available only when explicitly enabled outside production and only for synthetic `@example.test`
seed users.

## Database Migrations

Committed Prisma migrations live under `prisma/migrations`. The current schema baseline is committed
there so deployment can use Prisma's reviewed migration flow.

For local schema work:

```powershell
pnpm prisma migrate dev --name short_descriptive_name
pnpm prisma generate
```

Review the generated `migration.sql` before committing it with the schema change. Local seed data is
optional and should stay synthetic:

```powershell
pnpm db:seed
```

For pilot deployment, do not use `prisma migrate dev` or `prisma db push`. Configure the target
`DATABASE_URL`, generate the Prisma client, build the app, then apply committed migrations:

```bash
pnpm prisma generate
pnpm build
pnpm db:migrate:deploy
pnpm --filter web start
```

See `docs/13-database-migrations.md` for SQL review guidance, the exact CI limitation around
database-backed deploy checks, and seed-data rules.

## Documents And Storage

Generated PDFs are stored through the provider selected by `DOCUMENT_STORAGE_PROVIDER`.

The default provider is `local`, which writes to ignored local storage. By default this is
`.local-storage/documents` at the repo root. Override it with:

```powershell
$env:DOCUMENT_STORAGE_PROVIDER="local"
$env:DOCUMENT_STORAGE_ROOT="E:\path\to\storage"
```

The `s3` provider uses the server-side AWS SDK v3 S3 client and supports S3-compatible storage with
custom endpoint, region, bucket, access key, secret key, and force path-style settings:

```powershell
$env:DOCUMENT_STORAGE_PROVIDER="s3"
$env:DOCUMENT_STORAGE_S3_ENDPOINT="https://s3-compatible.example"
$env:DOCUMENT_STORAGE_S3_REGION="eu-central-1"
$env:DOCUMENT_STORAGE_S3_BUCKET="termopane-documents"
$env:DOCUMENT_STORAGE_S3_ACCESS_KEY_ID="replace-in-secret-store"
$env:DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY="replace-in-secret-store"
$env:DOCUMENT_STORAGE_S3_FORCE_PATH_STYLE="true"
```

PDF generation passes a requested storage key to the provider, then persists the key returned by the
provider on the immutable `Document` row. If metadata creation fails after storage succeeds, the app
attempts to delete the returned storage key so failed generations do not leave orphaned files.

Company logo uploads use the same storage provider. Uploaded logos are stored under generated
tenant asset keys, accept PNG/JPEG/WebP only, block SVG, and store metadata in tenant-owned
`TenantAsset` records. The settings UI exposes only an authenticated app route for logo preview, not
the underlying storage key.

No real bucket integration tests run in CI. Validate bucket credentials, endpoint behavior,
path-style settings, lifecycle/retention policy, and object access controls in the target
environment before using `DOCUMENT_STORAGE_PROVIDER="s3"` for live PDF delivery.

Run the storage smoke test after setting target storage env values:

```powershell
pnpm storage:smoke
```

`pnpm storage:smoke` validates only the configured document storage provider. Use the full pilot
smoke command below when you also need runtime, health, database, tenant/user bootstrap, and
quote/PDF basics.

## Pilot Smoke Test

Run the full pilot smoke test after configuring the target environment:

```powershell
pnpm pilot:smoke
```

Set `BASE_URL` when checking a deployed web service so the script also calls `/api/health`:

```powershell
$env:BASE_URL="https://your-pilot-host.example"
pnpm pilot:smoke
```

The command uses existing runtime validators, performs a synthetic storage write/read/delete,
checks the Prisma connection, verifies at least one tenant/user/active membership exists, renders a
synthetic PDF in memory, and inspects seeded synthetic quote metadata when present. It prints issue
codes only and does not print secrets, emails, tokens, cookies, or customer records. See
`docs/14-pilot-smoke-tests.md` for failure meanings and the difference between `storage:smoke` and
`pilot:smoke`.

## Deployment Readiness

See `docs/12-production-deployment-hardening.md` for the full pilot checklist, backup/restore notes,
and Render deployment path. Before deploying, configure these server-side environment values in the
target platform secret store:

- `DATABASE_URL`
- `AUTH_SECRET` with at least 32 random characters
- `AUTH_COOKIE_NAME`
- `AUTH_SESSION_DAYS`
- `AUTH_DEV_LOGIN_ENABLED="false"`
- `DOCUMENT_STORAGE_PROVIDER="s3"` for pilot deployments
- S3-compatible: `DOCUMENT_STORAGE_S3_ENDPOINT`, `DOCUMENT_STORAGE_S3_REGION`,
  `DOCUMENT_STORAGE_S3_BUCKET`, `DOCUMENT_STORAGE_S3_ACCESS_KEY_ID`,
  `DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY`, and `DOCUMENT_STORAGE_S3_FORCE_PATH_STYLE`

Use a Node.js or Docker deployment target for the Next.js app; static export is not suitable because
auth, tenant-scoped database access, PDF generation, and document downloads require server runtime
behavior. The pilot host documented for this repo is Render with managed PostgreSQL plus
S3-compatible document storage.

Recommended deployment commands:

```bash
pnpm prisma generate
pnpm build
pnpm db:migrate:deploy
pnpm --filter web start
```

Review committed Prisma migration SQL before a real environment deploy. Do not use undocumented
`prisma db push` behavior for pilot deployment.

After migrations and service startup, run:

```bash
pnpm pilot:smoke
```

Configure the host health check path as:

```text
/api/health
```

Do not enable development login in production, do not use dev-login as the pilot auth method, do not
store S3 credentials in source control, and do not expose bucket credentials to browser-side code. CI
runs `pnpm env:check-defaults` to ensure unsafe production defaults are not enabled in
`.env.example`.

## Validation

Run the same checks as CI:

```powershell
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm env:check-defaults
pnpm reference:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For pilot deployment verification, also run:

```powershell
pnpm pilot:smoke
```

Or run the aggregate local check after dependencies are installed:

```powershell
pnpm verify
```

## Workspace Layout

- `apps/web`: Next.js web app.
- `packages/calculation`: pure quote calculation package.
- `packages/drawing`: deterministic SVG schematic renderer.
- `packages/pdf`: Template A and Template B HTML/PDF rendering package.
- `prisma`: schema, migrations, and synthetic seed entrypoint.
- `scripts`: operational checks such as env-default, storage smoke, and pilot smoke tests.
- `docs`: product, data, calculation, PDF, UX, and tasking docs.

## Not Done Yet

- Real bucket integration tests.
- Real email-provider integration for auth invite delivery and customer delivery.
- Advanced pricing-rule selection inside the quote builder.
- Production-ready door formulas for panels, locks, thresholds, reinforcement, and fabrication.
- Real production formulas or supplier-specific pricing rules.
- Richer account/user-management workflows beyond pilot invites.
- Invoicing, ERP, CNC export, stock, or accounting integrations.

## Scope Guardrails

- Do not add fake formulas or pricing assumptions.
- Do not add real customer/private data.
- Keep future calculation work pure and snapshot-based.
