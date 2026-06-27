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
- TenantInvite:
  - `id`, `tenantId`, invited email, role, token hash, expiry, accepted timestamp, revoked
    timestamp, creator, timestamps;
  - raw invite tokens are never stored and acceptance is single-use.
- TenantAsset:
  - `id`, `tenantId`, asset kind, generated storage key, MIME type, checksum, byte size, uploader,
    uploaded timestamp;
  - stores metadata for private tenant assets such as company logos without exposing object-storage
    keys in UI routes.
- CompanySettings:
  - `id`, `tenantId`, company legal/display name, address, contact details, logo reference,
    default currency, VAT/tax defaults, default PDF template, PDF terms, warranty, delivery,
    advance-payment text;
  - changes affect new quote versions only unless intentionally snapshotted into a draft.
- QuoteNumberSettings:
  - `id`, `tenantId`, prefix, next number, optional year/month pattern, timestamps;
  - quote creation reserves generated numbers tenant-side and still relies on a tenant-scoped unique
    quote-number constraint as the final collision guard.
- UserPreference:
  - `id`, `tenantId`, `userId`, default PDF template preference, dashboard shortcuts, language,
    timestamps;
  - stores personal workflow preferences without changing tenant-wide quote snapshots.

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
- QuoteDelivery:
  - `id`, `tenantId`, `quoteId`, `quoteVersionId`, `documentId`, channel, provider, delivery
    status, recipient email, redacted recipient email, provider message id, timestamps;
  - stores customer-offer delivery status separately from immutable generated document metadata.
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

## COD-035 production auth and invite notes

The pilot production auth path is a minimal invite-token plus email-confirmation flow. `TenantInvite`
is tenant-owned and stores only a hash of the one-time token. Invites expire, can be revoked, and are
marked accepted after first use. Acceptance requires the token, tenant id, and matching invited
email; it creates or activates the `TenantMember` for that tenant and sets the existing signed
session cookie.

Dev login remains a local-only synthetic seed-user path gated by `AUTH_DEV_LOGIN_ENABLED=true` and is
blocked in production. Real email delivery is not implemented in this task; owner-created invite
links are delivered manually until a provider is added.

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

## COD-008 catalog base schema notes

The catalog foundation adds tenant-owned supplier, profile, glass, hardware, color, accessory,
service, tax, price-list, price-list-item, and pricing-rule records. Conceptual `Profile`,
`GlassUnit`, `Hardware`, and `CommercialRuleSet` are implemented as `ProfileItem`, `GlassPackage`,
`HardwareKit`, and `PricingRule` so future admin screens can model configurable item prices and
rules without encoding production formulas. Catalog and pricing records include `deletedAt` for soft
deletes where admin removal is expected, and seeded rule/configuration JSON is marked as requiring
business validation.

## COD-010 quote draft shell notes

Draft quote creation now creates a tenant-owned `Quote` plus an initial draft `QuoteVersion` with
empty item and totals snapshots, and the persisted `Quote.currentVersionId` points to that initial
version. Real Prisma-backed draft creation wraps the quote create, version create, and current-version
pointer update in one transaction after tenant-scoped customer/project validation passes. Generated
quote numbers still use temporary app-side numbering, but creation retries a small number of
tenant-scoped unique collisions until tenant-configurable numbering is implemented. The saved-offers
list filters quote shells by tenant-scoped customer, status, date range, author, and current-version
totals where present. Quote builder items, PDF generation, production formulas, and locked-version
mutation remain outside this task.

## COD-011 quote item draft editor notes

Draft quote items are tenant-owned `QuoteItem` records attached only to the current mutable draft
`QuoteVersion`. Fixed-window and custom-line draft forms store user-entered item data in
`configurationSnapshot`, with catalog/pricing fields represented as explicit placeholders until live
catalog selection and COD-012 calculation wiring are added. Custom-line unit prices are stored only as
manual snapshot data and are not treated as formulas. `totalsSnapshot` stays zero/pending for all
draft items in this task, and locked or sent quote versions reject item create, update, and delete
operations.

## COD-012 quote calculation wiring notes

Draft quote recalculation now runs through a web-app adapter that reads the current tenant-scoped
`QuoteVersion` plus its `QuoteItem` snapshots, freezes a calculation input snapshot, calls the pure
`@termopane/calculation` package, and persists the result back to tenant-owned quote records. The
adapter updates `QuoteVersion` subtotal/VAT/total fields, `totalsSnapshot`, `warningsSnapshot`,
`traceSummary`, each relevant `QuoteItem.calculationSnapshot` and `QuoteItem.totalsSnapshot`, and a
single `QuoteCalculationResult` row keyed by `quoteVersionId`.

The calculation package remains database-independent. Missing fixed-window catalog values such as
glass deductions, glass price, or profile price produce stored warnings and zero/incomplete values
instead of invented formulas. Recalculation is allowed only for the current mutable draft version;
locked or sent versions must be revised rather than mutated. Internal calculation traces are stored
for authorized support/admin inspection, while quote detail UI hides trace details unless the active
membership can view internal costs.

## COD-013 quote item drawing notes

Fixed-window and custom-line quote item configuration snapshots now include a deterministic
`drawing` snapshot from `@termopane/drawing`. The snapshot stores the drawing JSON input and a safe
schematic SVG string for quote detail previews and future PDF reuse. These drawings are visual
customer-review aids only; they do not encode production profile dimensions, CAD geometry, doors,
multi-sash layouts, or fabrication rules.

## COD-014 quote version lifecycle notes

The current draft quote version can now be locked before customer-facing document generation.
Locking sets `QuoteVersion.isLocked`, moves the version status to `LOCKED`, records `lockedAt`, and
creates an `AuditLog` entry. Existing item and recalculation helpers continue to reject mutations
once a version is locked or sent.

Revisions are created from the current locked/sent version by inserting a new draft `QuoteVersion`,
copying the source version snapshots and quote item snapshots into new rows, updating
`Quote.currentVersionId` to the new version, and marking the quote as `REVISED`. The source version
and its items remain unchanged so generated PDFs can stay bound to immutable snapshots.

## COD-015 Template A preview notes

Template A customer-facing HTML previews are built from the current tenant-scoped `QuoteVersion` and
its stored `QuoteItem` snapshots. Draft or unlocked versions can be previewed for review but are
clearly labeled as drafts. The preview hides internal material costs and calculation traces, uses
stored drawing SVG when available, and falls back to safe placeholders when an item has no reusable
schematic.

## COD-016 immutable document notes

Generated quote PDFs are stored as tenant-owned `Document` records bound to a specific
`QuoteVersion`. Each generation creates a new document row rather than silently overwriting prior
PDFs. Document metadata stores the template key, file name, local development storage key, MIME type,
checksum, visible totals snapshot, generating user, and creation timestamp. Local files live under
ignored development storage by default; production object storage remains a deployment follow-up.

## COD-031 offer sending notes

Customer delivery starts only after the current quote version is locked and a tenant-owned quote PDF
`Document` exists for that same version. Sending changes the current `QuoteVersion` from `LOCKED` to
`SENT`, sets `sentAt`, marks the parent `Quote` as `SENT`, and writes a tenant-scoped `QUOTE_SENT`
audit entry. The selected PDF is delivered through the configured server-side email provider, then a
tenant-owned `QuoteDelivery` row stores the provider, status, document id, quote version id,
recipient email, redacted recipient email, provider message id, and timestamps. The `QUOTE_SENT`
audit metadata stores only redacted recipient facts and delivery ids/statuses; it must not include
the full recipient email.

Sent quote versions remain immutable. Item edits, manual price adjustments, discounts, and
calculation updates continue to be rejected after send, and the revision flow remains the only way to
change customer-facing content. The generated PDF `Document` stays bound to its original
`quoteVersionId`; delivery status is stored separately so later revisions create new draft versions
instead of rebinding or mutating old documents.

## COD-018 catalog admin UI foundation notes

Tenant-scoped repository helpers now cover the catalog models added in COD-008. Reads and mutations
filter by `tenantId`, validate tenant-owned parent references before writes, and archive catalog
records by setting `deletedAt` plus `isActive: false` instead of deleting rows. Price lists and
pricing rules are listed for context, while price-list item create/update/archive is available.

The first catalog admin UI lives under `/dashboard/catalog` with Romanian labels. OWNER and ADMIN
memberships can create, edit, and archive catalog records; ESTIMATOR and DEALER memberships are
read-only. Unvalidated configuration or rule JSON is shown with the `necesită validare business`
badge. Catalog admin remains separate from supplier integrations and production formula execution.

## COD-030 catalog CSV import/export notes

Catalog CSV import/export covers supplier, profile-system, profile-item, glass-package,
hardware-kit, color-finish, accessory, service-item, tax-rate, price-list, and price-list-item
records. CSV files omit `tenantId`; import/export scope is always resolved from the authenticated
tenant context, and OWNER/ADMIN authorization is enforced server-side because price-list item exports
can include internal cost columns.

CSV import validates the whole file as a dry-run before publishing. Rows with missing required
fields, invalid enum/date/JSON values, unknown record ids, or parent references outside the active
tenant produce row-level errors. If any row is invalid, no rows are published. Valid publish imports
create rows without an `id` and update only existing rows whose `id` belongs to the active tenant.
Price-list changes still affect new quote snapshots only; locked quote versions continue to use
their stored catalog and price snapshots.

## COD-019 catalog snapshot selection notes

Fixed-window quote item creation and editing now resolve selected tenant catalog records server-side
before writing `QuoteItem`. The frozen `catalogSnapshot` stores selected profile system, frame
profile, glass package, color finish, optional hardware placeholder, catalog IDs, display names,
units, the active price-list reference for the quote currency, and matching sale-price item
references. Internal cost values are not copied into quote item snapshots.

The calculation adapter remains database-independent and reads only the frozen snapshot. It consumes
selected glass/profile deduction and sale-price values when they are explicitly present with
compatible units. Missing price or deduction configuration continues to produce warnings instead of
formula assumptions. Custom lines remain explicit manual-price snapshots.

## COD-025 document storage readiness notes

Document storage now uses a provider abstraction around `Document.storageKey`. The local provider
remains the default for development and tests, while the S3-compatible provider uses an SDK-backed
server-side adapter for deployable object storage.

`Document` rows remain tenant-owned metadata bound to quote versions. PDF generation passes a
requested storage key to the provider, persists the provider-returned key on the immutable
`Document` row, and includes that key in audit metadata. If metadata creation fails after storage
succeeds, generation attempts to delete the provider-returned storage object to avoid orphaned files;
no customer PII is added to storage logs or configuration.

## COD-026 S3-compatible storage adapter notes

The S3-compatible provider uses the AWS SDK v3 S3 client with tenant/document object keys generated
by the PDF workflow. The provider writes content type plus user metadata for checksum,
`quoteVersionId`, `templateKey`, and `tenantId` when those values are provided, reads object bytes
for tenant-scoped download routes, and deletes objects during failed-generation cleanup. SDK errors
are mapped to `DocumentStorageError` without exposing configured credentials.

## COD-027 company settings, preferences, and numbering notes

`CompanySettings.defaultPdfTemplate`, `QuoteNumberSettings`, and `UserPreference` are tenant-owned
Prisma records. Draft quote creation snapshots company settings, uses `CompanySettings.defaultCurrency`
when no currency is supplied, generates quote numbers from `QuoteNumberSettings`, and advances the
next number only after the quote shell is created. Unique quote-number collisions retry the next
tenant sequence number before returning a controlled collision error. Company and quote-number
changes create `AuditLog` rows with `SETTINGS_UPDATED` or `QUOTE_NUMBERING_UPDATED`.

## COD-037 tenant branding asset notes

Company logos are represented as tenant-owned `TenantAsset` metadata rows plus private bytes in the
configured document storage provider. `CompanySettings.logoAssetId` and `CompanySettings.logoUrl`
point to the current logo through an authenticated app route. The raw storage key stays server-side,
and logo reads require the current tenant context before object storage is accessed.

Logo uploads are settings mutations: OWNER/ADMIN users can create a new company-logo asset and
update company settings, while ESTIMATOR and DEALER users cannot mutate logo metadata. Existing
quote-version snapshots keep their stored `logoAssetId`/`logoUrl` reference and fall back to text
branding if the logo is unavailable.

## COD-028 door item notes

`QuoteItemType.DOOR` is now used by the draft quote editor. Door items remain tenant-owned
`QuoteItem` rows and store the MVP door fields in `configurationSnapshot`: dimensions, quantity,
panel/manual pricing text, hardware placeholder text, and the reusable drawing snapshot. Selected
profile system, optional frame profile, optional threshold profile, optional glass package, color,
optional hardware kit, active price-list references, and safe sale-price snapshots are stored in
`catalogSnapshot`.

Door snapshots intentionally do not encode production panel, lock, threshold, reinforcement, or cut
formulas. The calculation adapter reads the frozen snapshots and converts only explicit safe values,
such as manual panel price or per-door hardware price, into calculation input.

## COD-029 accessory/service quote line notes

Draft quote accessory, service, transport, and installation selections are stored as tenant-owned
`QuoteItem` rows with `type = CUSTOM` and a line-specific `configurationSnapshot.kind`
(`accessory-line`, `service-line`, `transport-line`, or `installation-line`). The matching
`catalogSnapshot` freezes the selected tenant `Accessory` or `ServiceItem`, selected catalog id,
unit, active price-list reference, and sale-price snapshot.

The integer `QuoteItem.quantity` remains a compatibility/display value, while the exact line
quantity used for calculation is stored in `configurationSnapshot.quantity`. Calculation and PDF
serialization prefer that frozen explicit quantity for these line kinds. Transport and installation
are manual catalog/service lines only; no route distance lookup, installation formula, stock/order
generation, or supplier integration is modeled.

## COD-020 manual commercial override notes

Tenant memberships now include `canApplyCommercialOverrides` so override permission is separate from
internal cost visibility. OWNER and ADMIN memberships can apply commercial overrides by role;
ESTIMATOR memberships require the explicit flag; DEALER memberships remain blocked from manual
override and quote-discount mutations.

Item-level manual overrides are stored in `QuoteItem.configurationSnapshot.manualOverride` with
target, amount, actor, timestamp, reason, and audit reference. Quote-level discounts are stored in
`QuoteVersion.priceSnapshot.quoteDiscount` with amount or basis points plus the same audit context.
Both write paths require a reason, reject locked/sent versions, create `AuditLog` rows with
`PRICING_OVERRIDE_APPLIED`, and mark calculation snapshots pending until the draft version is
recalculated. Stored totals preserve calculated values separately from manual adjustments so quote
review can show base totals, discounts, overrides, and final totals.

## COD-022 saved offer filter notes

Saved offer views now use tenant-owned `SavedFilter` records for user-specific quote filters. The
persisted filter JSON stores only supported customer, status, author, date range, total range, and
quick-filter keys. Applying a saved filter first validates tenant and user scope through repository
helpers, then resolves it into the same normalized filter shape used by the saved-offers URL.

Quick workflow filters such as generated PDFs, missing calculations, warnings, and expiring offers
are evaluated from the quote's current version, document rows, calculation result, warning
snapshots, and company offer-validity snapshot. They do not mutate quote versions or depend on live
catalog/pricing data.
