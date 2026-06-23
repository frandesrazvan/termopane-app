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

## Calculation and audit records

- CalculationOutput:
  - `id`, `tenantId`, `quoteVersionId`, input snapshot hash/version, material requirements,
    glass cuts, profile linear meters, item totals, quote totals, tax totals, warnings, trace data;
  - may be stored as structured JSON if the schema is not yet stable.
- ManualOverrideAudit:
  - `id`, `tenantId`, `quoteVersionId`, optional `quoteItemId`, actor user, field, old value,
    new value, reason, timestamp;
  - required for every manual price override and should not be editable by normal users.
- GeneratedPdf:
  - `id`, `tenantId`, `quoteVersionId`, template key, file/storage reference, generatedBy,
    generatedAt, visible totals, language/locale, checksum or content hash;
  - must be bound to the quote version used to generate it.

## Data integrity rules

- Every tenant-owned business record includes `tenantId`, even when reachable through another
  tenant-owned relation.
- Database queries must filter by tenant boundary server-side.
- Sent/locked quote versions must not be updated in place. Correct mistakes by creating a new
  quote version.
- Price list and company setting changes must not silently alter locked historical versions.
- Snapshots should include enough catalog, settings, and price data to explain past totals.
- Internal material costs and trace data must be separately authorized from customer-facing totals.
