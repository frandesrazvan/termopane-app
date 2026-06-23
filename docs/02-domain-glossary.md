# Domain glossary

Use these terms consistently in implementation tasks, code, and documentation.

## Core business terms

- Tenant: a company or business account using the app. Tenant-owned records must include
  `tenantId` and must not be visible across tenants.
- User: an authenticated person who belongs to one or more tenants through a membership.
- Membership: the relationship between a user, a tenant, and a role/permission set.
- Customer: the person or company receiving an offer. Customer PII must not be logged.
- Offer or quote: the business document being prepared for a customer. Prefer `quote` in code.
- Quote version: an immutable version of a quote once sent or locked. New customer changes should
  create a new version instead of mutating the sent one.
- Quote item: one priced line or product in a quote, such as a window, door, or custom item.
- Custom item: a quote item that does not use the full structured window/door form but still
  participates in totals and PDF output.

## Catalog terms

- Catalog item: a tenant-defined reusable product/configuration entry used in quote creation.
- Profile system: a PVC or aluminium system/family that groups compatible frame, sash, mullion, and
  related profile records.
- Profile: a linear material component used for frames, sashes, mullions, thresholds, or similar
  elements. Profile calculation should output linear meters.
- Glass unit: a glass configuration such as double or triple glazing. Exact construction, supplier
  names, and pricing remain tenant catalog data.
- Panel: an opaque or decorative fill used instead of glass in doors or custom items.
- Hardware: fittings such as handles, hinges, locks, tilt/turn mechanisms, cylinders, and related
  components.
- Accessory: optional add-ons such as sill, mosquito net, trim, casing, transport, installation, or
  other tenant-defined extras.
- Price list: a dated or versioned set of prices and commercial defaults used for calculations.
- Price snapshot: the copy of prices and relevant settings bound to a quote version so later catalog
  edits do not change old quotes.

## Calculation terms

- Material requirement: calculated quantity of profiles, glass, hardware, accessories, or other
  components required by an item.
- Glass cut: calculated glass width/height for a pane, based on configured deductions.
- Profile linear meters: the total profile length required per profile type, before any production
  optimization.
- Deduction rule: tenant-configurable value used to derive glass or profile dimensions. Unknown
  deductions must not be hard-coded as real formulas.
- Commercial addition: tenant-configurable markup, margin, service addition, or other commercial
  value applied above material costs.
- Manual override: an explicit user adjustment to a calculated price or total. Overrides require
  audit data: actor, timestamp, reason, field, old value, and new value.
- Warning: a non-blocking calculation or document issue that must be visible to the user, such as
  missing deduction settings or unsupported item geometry.
- Trace: structured calculation detail explaining which inputs, rules, and intermediate values
  produced the output.
- Snapshot: frozen data copied into a calculation or quote version, including catalog, settings,
  price list, and user-entered item configuration.

## Document terms

- PDF template: a tenant-selectable document layout used to render a quote version.
- Template A: detailed offer layout inspired by Fenestra-style offers.
- Template B: compact proposal layout inspired by FCCPLAST-style offers.
- Customer-facing output: PDF or screen view intended for the customer. It must not expose internal
  material costs unless explicitly designed and permitted.
