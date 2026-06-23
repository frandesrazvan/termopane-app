# MVP scope

The MVP is a focused offer-generation SaaS/PWA for termopane businesses. It should let a tenant
configure enough catalog and company data to create, save, calculate, and export customer offers
for windows, doors, and custom items.

## In scope

- Authentication and tenant isolation:
  - sign in/out and session handling;
  - one or more users per tenant;
  - all tenant-owned records scoped by `tenantId`;
  - role-based visibility for catalog, pricing, costs, and generated offers.
- Company and user customization:
  - company name, address, contact details, logo, tax/VAT defaults, currency, and PDF footer text;
  - offer validity, warranty, delivery, payment, and advance-payment text as configurable fields;
  - per-user profile basics such as display name and role.
- Catalog admin:
  - PVC and aluminium profile systems;
  - glass units, panels, hardware, accessories, and optional service lines;
  - configurable calculation parameters for deductions, waste, pricing, and commercial additions;
  - price list versions or snapshots so historical quotes remain stable.
- Quote creation:
  - structured forms for common rectangular windows and doors;
  - custom item lines for non-standard MVP items;
  - dimensions, quantities, opening style, profile, glass/panel, hardware, accessories, notes, and
    customer-facing descriptions;
  - draft, sent/locked, revised, accepted, rejected, and archived-style statuses as needed by the UI.
- Calculation:
  - rough material/commercial/tax totals;
  - automatic glass dimensions;
  - profile linear-meter requirements;
  - warnings and trace data for missing or uncertain configuration;
  - audited manual price overrides.
- Saved offers:
  - list, view, duplicate/revise, and filter offers by customer, status, date, author, and total;
  - preserve old quote versions when a new revision is created.
- PDF output:
  - generate a customer-facing offer document from an immutable quote version;
  - support a detailed template and a compact proposal-style template;
  - apply tenant branding and hide internal costs from customer/dealer-facing output.

## Out of scope for MVP

- Invoicing, accounting exports, payment collection, or fiscal receipt generation.
- Production ERP, manufacturing scheduling, task dispatch, installation planning, or delivery routing.
- Inventory/stock management, supplier ordering, warehouse reservations, or automatic purchase orders.
- CNC export, machine-specific cutting files, or fabrication automation.
- Full cut optimization, nesting, reinforcement optimization, or production-grade waste minimization.
- CE/DoP compliance generation, declaration packs, or legal certification workflows.
- Real production formulas unless they are provided and validated by the business owner.
- Real customer/private data in fixtures, tests, screenshots, or documentation examples.

## Implementation priorities

1. Keep quote generation fast and reliable on mobile devices.
2. Preserve tenant boundaries and quote-version immutability before adding convenience features.
3. Represent unknown business rules as tenant configuration or explicit TODOs.
4. Prefer deterministic, testable calculation code over UI-only arithmetic.
5. Keep documents and generated PDFs customer-safe by default.
