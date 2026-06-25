# Termopane App

Romanian-first SaaS/PWA for creating customer offers for termopane businesses.

The current MVP has authentication, tenant context, customer/project CRUD, saved quote drafts,
quote item drafting, calculation snapshots, drawing previews, quote version locking/revisions,
Template A HTML preview, PDF generation, local document storage, immutable `Document` records, and
audit logging.

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
- Catalog admin UI.
- Template B.
- Real production formulas or supplier-specific pricing rules.
- Invoicing, ERP, CNC export, stock, or accounting integrations.
