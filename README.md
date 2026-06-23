# Termopane App

Mobile-first SaaS/PWA foundation for Romanian termopane offer generation.

This scaffold intentionally contains no authentication, quote business logic, production formulas,
or PDF generation logic yet. Future work should follow `AGENTS.md` and the docs in `docs/`.

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
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Workspace layout

- `apps/web`: Next.js web app shell.
- `packages/calculation`: placeholder for pure calculation logic.
- `packages/drawing`: placeholder for future product drawing helpers.
- `packages/pdf`: placeholder for future PDF generation helpers.
- `prisma`: Prisma schema and seed entrypoint.

## Scope guardrails

- Do not implement auth in this scaffold.
- Do not add fake formulas or pricing assumptions.
- Do not add real customer/private data.
- Keep future calculation work pure and snapshot-based.
