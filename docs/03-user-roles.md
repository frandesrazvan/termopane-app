# User roles

Roles describe default permission boundaries. Implementation may use a role enum plus explicit
permissions, but tenant isolation and cost visibility rules must remain enforced server-side.

## Tenant owner

Tenant owners control the company account.

- Manage tenant profile, company settings, branding, VAT/tax defaults, and PDF defaults.
- Invite, disable, and assign roles to tenant users.
- Manage catalog entries, price lists, commercial defaults, and configurable calculation fields.
- View internal material costs, commercial additions, override audits, and all tenant quotes.
- Lock, send, revise, archive, or delete drafts according to retention rules.

## Tenant admin

Tenant admins operate most configuration areas but may not own billing or account-level destructive
actions if those are introduced later.

- Manage catalog, prices, company document text, and quote defaults.
- View quote history, calculation traces, warnings, and manual override audits.
- View internal material costs unless the tenant chooses a stricter permission model.
- Manage users only if explicitly granted by the owner.

## Estimator or sales user

Estimators create and manage offers for customers.

- Create draft quotes and quote items.
- Run calculations, review warnings, and generate customer-facing PDFs.
- Save, filter, duplicate, revise, and send/lock quotes within tenant policy.
- Apply manual price overrides only when permitted, and always with an audit reason.
- View customer-facing prices and totals by default.
- View internal material costs only when explicitly permitted.

Implementation note: COD-020 models this permission with `TenantMember.canApplyCommercialOverrides`.
OWNER and ADMIN users can override by role; ESTIMATOR users require the explicit flag; DEALER users
remain blocked from manual override and quote-discount actions.

## Dealer or restricted user

Dealer-style users may create or request offers but should have limited cost visibility.

- Create quotes from allowed catalog options.
- See customer-facing prices, discounts, taxes, and final totals.
- Generate or request PDFs according to tenant policy.
- Must not see internal material costs, supplier prices, margin details, or hidden calculation traces
  unless a tenant owner explicitly grants that permission.
- Must not access other users' private drafts unless tenant policy allows it.

## Platform/support access

Platform support is not a tenant role and should be treated as exceptional access.

- Support access must be audited and limited to troubleshooting or operational maintenance.
- Support views must avoid exposing customer PII unless access is explicitly required.
- Support users must not change tenant pricing, catalog, quote versions, or PDFs without a clear
  tenant-authorized workflow.

## Cross-role security rules

- Authorize by `tenantId` on every tenant-owned record and every query.
- Never rely on client-side hiding for costs, traces, PII, or admin-only fields.
- Do not log customer names, phone numbers, email addresses, addresses, or full PDF payloads.
- Quote versions locked for sending must be immutable for every role; revisions create new versions.
- Manual override audits must be visible to admins/owners and protected from normal editing.

## COD-027 settings permissions

Company settings are editable by OWNER and ADMIN memberships. Quote numbering settings are editable
only by OWNER memberships because changing the next number affects tenant-wide commercial records.
ESTIMATOR and DEALER memberships may view settings screens where exposed, but server actions reject
company and numbering mutations for those roles. User preferences are scoped to the active tenant and
current user.

## COD-030 catalog CSV permissions

Catalog CSV import and export are restricted to OWNER and ADMIN memberships. This applies to exports
as well as imports because price-list item CSV files can include internal cost columns. ESTIMATOR and
DEALER users can continue to read permitted catalog screens but cannot download or publish catalog
CSV files.

## COD-035 invite permissions

Tenant user onboarding uses invite links with single-use hashed tokens. The current permission model
keeps user management owner-only, so OWNER memberships can create invites and ADMIN memberships
cannot invite until the model explicitly grants that capability. ESTIMATOR and DEALER memberships
cannot create invites.

Invite acceptance activates only the invited tenant membership. A disabled membership cannot be
reactivated by accepting a new invite; an owner must resolve that account state intentionally.
