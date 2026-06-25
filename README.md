# Termopane App

Romanian-first SaaS/PWA for creating customer offers for termopane businesses.

Future work should follow `AGENTS.md` and the docs in `docs/`. The app intentionally avoids
production ERP, CNC export, stock management, invoicing, supplier integrations, and unvalidated
production formulas.

## Current MVP status

- Authentication, tenant context, role permissions, customer/project records, saved quote shells,
  draft quote items, calculation wiring, quote lifecycle, and Template A HTML preview foundations
  are present.
- PDF generation, local document storage, immutable `Document` records, and audit logging are
  present for generated quote documents.
- Catalog schema and synthetic seed data are present for suppliers, profile systems, profile items,
  glass packages, hardware kits, colors, accessories, services, tax rates, price lists, price-list
  items, and pricing rules.
- Catalog admin UI is available at `/dashboard/catalog`. OWNER and ADMIN memberships can create,
  edit, and archive catalog records; ESTIMATOR and DEALER memberships have read-only catalog access.
- Catalog archive actions use `deletedAt` soft delete and mark records inactive. Unvalidated
  configuration/rule JSON is surfaced with the Romanian `necesită validare business` badge.
- Catalog records are not wired into quote item selection or calculation yet; quote calculations
  still use frozen snapshots and explicit placeholders.

## Stack

- pnpm workspace pinned to `pnpm@9.15.4`
- Next.js app with TypeScript and Tailwind
- Prisma configured for PostgreSQL
- Pure packages for calculation, drawing, and PDF rendering
- Local development document storage under ignored `.local-storage`
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

Generated PDFs are written to ignored local storage. By default this is `.local-storage` at the repo
root. Override it with:

```powershell
$env:DOCUMENT_STORAGE_ROOT="E:\path\to\storage"
```

Production object storage is not implemented yet.

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
- `packages/pdf`: Template A HTML/PDF rendering package.
- `prisma`: schema, migrations, and synthetic seed entrypoint.
- `docs`: product, data, calculation, PDF, UX, and tasking docs.

## Not Done Yet

- Production object storage.
- Email sending or customer delivery workflow.
- Catalog selection wiring into quote items and calculations.
- Template B.
- Real production formulas or supplier-specific pricing rules.
- Invoicing, ERP, CNC export, stock, or accounting integrations.

## Scope Guardrails

- Do not add fake formulas or pricing assumptions.
- Do not add real customer/private data.
- Keep future calculation work pure and snapshot-based.
