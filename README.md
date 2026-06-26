# Termopane App

Romanian-first SaaS/PWA for creating customer offers for termopane businesses.

Future work should follow `AGENTS.md` and the docs in `docs/`. The app intentionally avoids
production ERP, CNC export, stock management, invoicing, supplier integrations, and unvalidated
production formulas.

## Current MVP status

- Authentication, tenant context, role permissions, customer/project records, saved quote shells,
  draft quote items, calculation wiring, quote lifecycle, and Template A/B HTML previews are
  present.
- PDF generation, local document storage, immutable `Document` records, selected template keys, and
  audit logging are present for generated quote documents.
- Document storage now goes through a provider interface. The local provider remains the default
  for dev/test, and an SDK-backed S3-compatible provider is available for deployable object storage.
- Catalog schema and synthetic seed data are present for suppliers, profile systems, profile items,
  glass packages, hardware kits, colors, accessories, services, tax rates, price lists, price-list
  items, and pricing rules.
- Catalog admin UI is available at `/dashboard/catalog`. OWNER and ADMIN memberships can create,
  edit, and archive catalog records; ESTIMATOR and DEALER memberships have read-only catalog access.
- Catalog archive actions use `deletedAt` soft delete and mark records inactive. Unvalidated
  configuration/rule JSON is surfaced with the Romanian `necesită validare business` badge.
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
  redacted examples, a business-owner collection checklist, and a pure calculation harness for
  recreating 10-20 validated historical quotes later.

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

5. Apply Prisma and seed synthetic demo data:

   ```powershell
   pnpm prisma generate
   pnpm prisma migrate dev
   pnpm db:seed
   ```

   The repository currently has a Prisma schema and synthetic seed script, but no committed
   `prisma/migrations` directory. `pnpm prisma migrate dev` creates local development migration
   files and applies the schema to your local database.

6. Start the web app:

   ```powershell
   pnpm dev
   ```

The web app runs at `http://localhost:3000` by default. Development login requires
`AUTH_DEV_LOGIN_ENABLED="true"`.

## Seed Users

Synthetic users seeded for local testing:

- `owner@example.test`
- `admin@example.test`
- `estimator@example.test`
- `dealer@example.test`

Use only synthetic data in fixtures, screenshots, and docs.

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

No real bucket integration tests run in CI. Validate bucket credentials, endpoint behavior,
path-style settings, lifecycle/retention policy, and object access controls in the target
environment before using `DOCUMENT_STORAGE_PROVIDER="s3"` for live PDF delivery.

## Deployment Readiness

Before deploying, configure these server-side environment values in the target platform secret store:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_COOKIE_NAME`
- `AUTH_SESSION_DAYS`
- `AUTH_DEV_LOGIN_ENABLED="false"`
- `DOCUMENT_STORAGE_PROVIDER`
- Local-only: `DOCUMENT_STORAGE_ROOT`
- S3-compatible: `DOCUMENT_STORAGE_S3_ENDPOINT`, `DOCUMENT_STORAGE_S3_REGION`,
  `DOCUMENT_STORAGE_S3_BUCKET`, `DOCUMENT_STORAGE_S3_ACCESS_KEY_ID`,
  `DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY`, and `DOCUMENT_STORAGE_S3_FORCE_PATH_STYLE`

Use a Node.js or Docker deployment target for the Next.js app; static export is not suitable because
auth, tenant-scoped database access, PDF generation, and document downloads require server runtime
behavior. Run `pnpm prisma generate` and `pnpm build` during deployment. Because committed Prisma
migrations are not present yet, define the target database schema rollout explicitly before a real
environment deploy; once migrations are committed, use the normal deployment migration command for
the target database before starting `pnpm --filter web start`.

Do not enable development login in production, do not store S3 credentials in source control, and do
not expose bucket credentials to browser-side code.

## Validation

Run the same checks as CI:

```powershell
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
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
- `docs`: product, data, calculation, PDF, UX, and tasking docs.

## Not Done Yet

- Real bucket integration tests and deployment-specific storage smoke tests.
- Email sending or customer delivery workflow.
- Advanced pricing-rule selection inside the quote builder.
- Production-ready door formulas for panels, locks, thresholds, reinforcement, and fabrication.
- Real production formulas or supplier-specific pricing rules.
- Logo upload and richer account/user-management workflows.
- Invoicing, ERP, CNC export, stock, or accounting integrations.

## Scope Guardrails

- Do not add fake formulas or pricing assumptions.
- Do not add real customer/private data.
- Keep future calculation work pure and snapshot-based.
