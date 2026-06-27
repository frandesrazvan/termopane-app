# Database migrations

Prisma schema changes must be deployed through committed migration files. The pilot deployment path
uses `pnpm db:migrate:deploy`, which reads `prisma/migrations` and records applied migrations in the
target database.

## Local migration workflow

Use a local or development PostgreSQL database. Do not point these commands at a pilot or production
database.

1. Update `prisma/schema.prisma`.
2. Generate and apply a development migration:

   ```powershell
   pnpm prisma migrate dev --name short_descriptive_name
   ```

3. Review the generated SQL in `prisma/migrations/<timestamp>_<name>/migration.sql`.
4. Run `pnpm prisma generate`.
5. Run the project checks before opening a PR.
6. Commit both `prisma/schema.prisma` and the new migration directory.

The first baseline migration is already committed. Future schema changes should create new migration
directories instead of editing an already-shared migration.

## Reviewing migration SQL

Before merging, open every new `migration.sql` file and confirm that it matches the schema change:

- table, enum, index, and foreign-key changes are expected;
- tenant-owned business tables include `tenantId`;
- destructive changes such as dropped tables, dropped columns, or type rewrites are intentional and
  have a rollback/backup plan;
- migration SQL does not insert real customer data, secrets, or production-only credentials;
- quote-version, pricing, document, and audit tables preserve the immutability and snapshot rules in
  the product docs.

For a baseline generated without a local database, Prisma can produce SQL from the current schema:

```powershell
pnpm prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

Compare that output with the committed baseline SQL before deployment.

## Pilot deployment workflow

The deployment host should run committed migrations before starting the web process:

```bash
pnpm prisma generate
pnpm build
pnpm db:migrate:deploy
pnpm --filter web start
```

`pnpm db:migrate:deploy` requires `DATABASE_URL` for the target PostgreSQL database and applies only
the committed migration directories. It should run once per deployment before serving traffic.

CI does not run `pnpm db:migrate:deploy` because that command needs a real PostgreSQL database and
migration history table. The test suite instead checks that committed migration SQL exists for the
models and enums declared in `prisma/schema.prisma`.

## Why not `prisma db push`

`prisma db push` updates a database directly from the schema and does not create reviewed migration
files. That makes production changes harder to audit, review, reproduce, or roll back. It also
bypasses the deployment history used by `prisma migrate deploy`.

Use `prisma db push` only for disposable local experiments, if at all. It is not the pilot or
production deployment path for this project.

## Seeding synthetic data

Synthetic seed data is for local and development databases only:

```powershell
pnpm db:seed
```

Run it only after local migrations have been applied and only with a local/dev `DATABASE_URL`. Do not
run the seed script against pilot or production databases, and do not add real customer, supplier, or
private business data to the seed file.
