# Termopane App

Mobile-first SaaS/PWA foundation for Romanian termopane offer generation.

Future work should follow `AGENTS.md` and the docs in `docs/`. The app intentionally avoids
production ERP, CNC export, stock management, invoicing, supplier integrations, and unvalidated
production formulas.

## Current MVP status

- Authentication, tenant context, role permissions, customer/project records, saved quote shells,
  draft quote items, calculation wiring, quote lifecycle, and Template A HTML preview foundations
  are present.
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

- pnpm workspace
- Next.js app with TypeScript and Tailwind
- Prisma configured for PostgreSQL
- Docker Compose PostgreSQL service
- Placeholder packages for calculation, drawing, and PDF work
- GitHub Actions CI for install, lint, typecheck, test, and build

## Local setup

1. Enable pnpm through Corepack:

   ```powershell
   corepack enable
   corepack prepare pnpm@9.15.4 --activate
   ```

2. Install dependencies:

   ```powershell
   pnpm install
   ```

3. Copy environment values:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Start PostgreSQL:

   ```powershell
   docker compose up -d postgres
   ```

5. Generate Prisma client:

   ```powershell
   pnpm prisma generate
   ```

6. Start the web app:

   ```powershell
   pnpm dev
   ```

The web app runs at `http://localhost:3000` by default.

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

Tests should follow the conventions in `tests/README.md`.

## Workspace layout

- `apps/web`: Next.js web app shell.
- `packages/calculation`: placeholder for pure calculation logic.
- `packages/drawing`: placeholder for future product drawing helpers.
- `packages/pdf`: placeholder for future PDF generation helpers.
- `prisma`: Prisma schema and seed entrypoint.

## Scope guardrails

- Do not add fake formulas or pricing assumptions.
- Do not add real customer/private data.
- Keep future calculation work pure and snapshot-based.
