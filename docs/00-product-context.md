# Product context

This repository implements a mobile-first SaaS/PWA for Romanian termopane offer generation.
We are building a modern, customizable alternative to existing termopane offer-generation tools.
The product helps small and medium window/door businesses create fast customer offers for PVC or
aluminium windows, doors, and custom termopane items without turning the app into a full production
ERP.

The app should feel like a practical daily sales tool: quick on a phone at a job site, comfortable
on a tablet or desktop in an office, and strict about tenant data boundaries. Future implementation
tasks should optimize for quote accuracy, traceability, and speed of use rather than production
automation.

## Primary use

- Web app with responsive/PWA priority.
- Mostly mobile usage.
- Authenticated users.
- Tenant/company-specific customization.
- Customer offer generation.
- Saved and filtered generated offers.

## Primary users and workflows

- Authenticated business users sign in and work inside one tenant/company context.
- Tenant admins maintain company branding, VAT/tax settings, commercial defaults, catalog entries,
  price lists, and document text such as payment terms or warranty text.
- Estimators create offers by choosing a window, door, or custom item form, entering dimensions,
  quantities, profile/glass/hardware options, colors, services, and optional accessories.
- The calculation engine produces rough material requirements, commercial totals, tax totals,
  warnings, and trace data from frozen snapshots.
- Users review calculated values, make audited manual price adjustments when needed, then generate a
  customer-facing PDF.
- Users save offers, filter/search them later, open previous versions, and create a new version when
  a sent offer needs to be revised.

## Business capabilities

- Mobile-first quote generation for common rectangular windows and doors.
- Custom item lines for MVP cases that do not fit the structured forms.
- Automatic glass dimension calculation from configured deduction rules.
- Profile linear-meter requirement calculation from configured geometry/deduction rules.
- Rough material cost, commercial addition, discount, VAT/tax, and final total calculation.
- Manual commercial price adjustments with reason, actor, timestamp, and before/after values.
- Tenant-level customization for company identity, catalog data, price lists, PDF templates, and
  commercial defaults.
- Saved offers with status, customer, date, total, author, and other practical filters.

## Key invariants

- Every tenant-owned business record must include `tenantId` and must only be accessible inside that
  tenant boundary.
- Quote versions are immutable after they are sent or otherwise locked for customer delivery.
- Price list changes must not silently modify old quote versions; quote versions must keep the
  calculation and pricing snapshots they used.
- Dealer or restricted users must not see internal material costs unless a tenant admin explicitly
  grants that permission.
- Customer personally identifiable information must not be written to application logs.
- Real production formulas must not be invented. Unknown profile, glass, reinforcement, hardware,
  labor, waste, tax, or pricing rules must be represented as configurable settings or marked
  `requires business validation`.

## MVP boundary

The MVP is quote generation, catalog admin, calculation, PDF output, saved offers, authentication,
tenant isolation, and company/user customization. It is not production planning, stock management,
CNC export, invoicing, accounting, CE/DoP compliance, or full cut optimization.

## Product validation principle

Use real interviews, approved sample offers, exported PDFs, actual price lists, and production data
provided by the business owner before finalizing business formulas. Until those rules are validated,
implementation must keep them configurable or explicitly marked as requiring business validation.
