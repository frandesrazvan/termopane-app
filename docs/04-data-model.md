# Data model

This is a conceptual data model for implementation planning. It is not a committed Prisma schema.
Future schema work should adapt names and relations to the actual codebase while preserving tenant
isolation, quote-version immutability, and snapshot behavior.

## Tenant and identity

- Tenant:
  - `id`, `name`, `slug`, `status`, timestamps;
  - owns company settings, users/memberships, catalog, price lists, customers, quotes, and PDFs.
- User:
  - `id`, authentication identity fields, display name, email, timestamps;
  - should not directly imply tenant access without a membership record.
- Membership:
  - `id`, `tenantId`, `userId`, `role`, permission flags, status, timestamps;
  - unique per tenant/user pair unless the auth model requires otherwise.
- CompanySettings:
  - `id`, `tenantId`, company legal/display name, address, contact details, logo reference,
    default currency, VAT/tax defaults, PDF terms, warranty, delivery, advance-payment text;
  - changes affect new quote versions only unless intentionally snapshotted into a draft.

## Catalog and pricing

All tenant-owned catalog and pricing records require `tenantId`.

- ProfileSystem:
  - PVC/aluminium family, display name, material type, active flag.
- Profile:
  - profile system relation, type such as frame/sash/mullion/threshold, unit, price reference,
    configurable waste/deduction fields, active flag.
- GlassUnit:
  - display name, composition label, unit price basis, configurable deduction fields, active flag.
- Panel:
  - display name, unit price basis, configurable deduction fields, active flag.
- Hardware:
  - display name, category, unit price basis, configurable quantity rules, active flag.
- Accessory:
  - display name, category, unit, unit price, active flag.
- PriceList:
  - `id`, `tenantId`, name, version/date, currency, status, effective dates, createdBy;
  - should be snapshot or copied into quote versions before locking.
- CommercialRuleSet:
  - tenant defaults for markup/margin/discount/tax/service additions;
  - unknown values remain configurable and should not be hard-coded as production formulas.

## Customers and quotes

- Customer:
  - `id`, `tenantId`, name/company, contact fields, address fields, notes, timestamps;
  - avoid logging PII from this record.
- Quote:
  - `id`, `tenantId`, customer relation, quote number, status, author, assigned user, tags/notes,
    current version pointer, timestamps;
  - represents the ongoing commercial opportunity.
- QuoteVersion:
  - `id`, `tenantId`, `quoteId`, version number, status, createdBy, sentAt/lockedAt, currency,
    customer snapshot, company settings snapshot, price list snapshot, totals, warnings, trace
    summary, timestamps;
  - immutable after send/lock. Revisions create a new version.
- QuoteItem:
  - `id`, `tenantId`, `quoteVersionId`, item type (`window`, `door`, `custom`), dimensions,
    quantity, selected catalog snapshot, customer description, internal notes, ordering index;
  - item configuration must be sufficient for recalculation without reading current catalog rows.

## Calculation, document, saved filter, and audit records

- QuoteCalculationResult:
  - `id`, `tenantId`, `quoteVersionId`, input snapshot hash/version, material requirements,
    glass cuts, profile linear meters, item totals, quote totals, tax totals, warnings, trace data;
  - may be stored as structured JSON if the schema is not yet stable.
- Document:
  - `id`, `tenantId`, `quoteVersionId`, template key, file/storage reference, generatedBy,
    generatedAt, visible totals, language/locale, checksum or content hash;
  - must be bound to the quote version used to generate it.
- AuditLog:
  - `id`, `tenantId`, optional actor user, action, entity type/id, before snapshot, after snapshot,
    metadata, timestamp;
  - covers pricing, manual override, catalog, quote, auth, and document actions;
  - required for every manual price override and should not be editable by normal users.
- SavedFilter:
  - `id`, `tenantId`, optional user, name, entity type, filter JSON, default flag, timestamps;
  - supports saved offer filters by status, customer, date, author, total, or other UI criteria.

## Prisma implementation notes

The first committed Prisma schema uses the task names `QuoteCalculationResult`, `Document`,
`AuditLog`, and `SavedFilter` for the MVP commercial quote loop. Catalog and price-list tables remain
deferred; quote versions and quote items carry JSON snapshots so historical quotes do not depend on
future catalog edits. The schema intentionally stores monetary totals as integer minor-unit fields or
JSON snapshots and does not encode production pricing formulas.

## Data integrity rules

- Every tenant-owned business record includes `tenantId`, even when reachable through another
  tenant-owned relation.
- Database queries must filter by tenant boundary server-side.
- Sent/locked quote versions must not be updated in place. Correct mistakes by creating a new
  quote version.
- Price list and company setting changes must not silently alter locked historical versions.
- Snapshots should include enough catalog, settings, and price data to explain past totals.
- Internal material costs and trace data must be separately authorized from customer-facing totals.

## COD-004 Prisma implementation notes

The initial committed Prisma schema implements the core commercial quote loop without catalog or
pricing-formula models. A few conceptual records above are represented with implementation names:

- `CalculationOutput` is implemented as `QuoteCalculationResult` with JSON input/output snapshots,
  warnings, and trace data.
- `GeneratedPdf` is implemented as `Document`, which is tenant-owned and can optionally point to a
  `QuoteVersion`.
- `ManualOverrideAudit` is covered by the general tenant-owned `AuditLog`, with `OVERRIDE_APPLIED`
  and pricing/catalog/quote/auth/document action values.

Catalog and price-list relations remain JSON snapshots on quote versions and items until dedicated
catalog/pricing tasks add those models.

## COD-005 auth and tenant-context notes

The current auth foundation uses signed HTTP-only session cookies for development and resolves app
access through `User` plus active `TenantMember` records. A user can belong to multiple active
tenants; the server chooses the selected tenant from the session when valid, otherwise it falls back
to the first active membership.

Tenant-owned data access must call server-side tenant-context helpers before querying tenant records.
Dealer/restricted users do not see internal costs by default. Owner/admin roles can manage catalog
and generate PDFs; user management is owner-only until an explicit per-member user-management
permission is added.

## COD-006 tenant-scoped data access notes

Core customer, project, quote, and quote-version reads are exposed through tenant-scoped repository
helpers. These helpers require a tenant scope (`tenantId`) or a verified tenant context before any
tenant-owned record id is accepted, and every query adds `tenantId` to its `where` clause. Future
CRUD work should use these helpers instead of calling Prisma delegates directly for tenant-owned
commercial records.

## COD-007 customer and project CRUD notes

Customer and project create/update flows use the tenant-scoped repository helpers rather than direct
Prisma calls from routes. Project creation and updates verify the parent customer through the same
tenant scope, so a project cannot be created under or moved to a customer from another tenant.
Customer search is server-side and limited to the active tenant across name and contact fields.
