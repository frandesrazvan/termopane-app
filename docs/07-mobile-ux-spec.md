# Mobile UX spec

The app is mobile-first. Desktop layouts can add density, but the primary flows must work on a
phone in the field with one-handed use, unstable attention, and quick review before sending an offer.

## Navigation and layout

- Use clear, persistent access to dashboard, new quote, saved offers, catalog/admin, and account
  areas according to role.
- Keep primary actions within comfortable thumb reach on small screens.
- Prefer progressive steps for quote creation instead of one oversized form.
- Preserve draft state while navigating between quote steps.
- Make warnings visible before PDF generation and before sending/locking a quote.
- Desktop/tablet layouts may use side-by-side panels for item list, editor, and summary, but must not
  hide mobile-only functionality.

## Authentication and tenant context

- Login should be quick and responsive on mobile.
- If a user belongs to multiple tenants, require an explicit tenant selection or a clearly visible
  current tenant switcher.
- Show tenant/company identity in enough places to prevent accidental work in the wrong company.
- Do not display restricted admin areas to users without permission, but still enforce permissions on
  the server.

## COD-041 pilot acceptance notes

The pilot acceptance suite exercises the authenticated flow at a 390px mobile viewport. The dashboard
tenant switcher must keep both the tenant selector and the `Schimbă` action reachable without
overlap with logout or bottom navigation controls.

## COD-035 invite login UX notes

The login page separates pilot invite login from local development login. Pilot users enter the
invited email plus the invite code/link tenant values, and the page returns a generic Romanian error
for invalid, expired, revoked, used, or cross-tenant tokens so it does not reveal account existence.

The settings screen exposes `Utilizatori și invitații` only as an owner workflow. Invite links are
shown after creation for manual delivery because real email sending is still stubbed. Labels must not
imply that an email was sent automatically.

## Dashboard

The dashboard should prioritize daily sales work:

- create a new quote;
- resume recent drafts;
- view recently sent or revised offers;
- see calculation/PDF warnings that need attention;
- jump to saved offer filters;
- show catalog/admin prompts only to permitted roles.

## Quote creation flow

Recommended mobile flow:

1. Select item type: window, door, or custom.
2. Enter dimensions, quantity, and opening/layout basics.
3. Select profile system, glass/panel, hardware, and accessories.
4. Review calculated material/commercial/tax totals and warnings.
5. Apply permitted manual adjustments with a required reason.
6. Review quote summary and generate PDF.

UX requirements:

- Numeric inputs must use mobile-friendly keyboards and clear units.
- Validation should appear near the field and in a quote-level warning summary.
- Calculated values should distinguish base total from manual override total.
- Users must see when an item is incomplete because a configurable business rule is missing.
- Custom items should clearly show which values are manual/customer-facing.

## COD-029 accessory and service line UX notes

The draft quote builder exposes separate mobile-friendly add forms for accessory, service, transport,
and installation lines. Each line requires a tenant catalog selection and an explicit quantity; the
active price list is shown near the selector, and missing catalog prices are surfaced later as
calculation warnings rather than hidden fallbacks.

Transport and installation remain manual service lines in the quote builder. The UI must not imply
automatic distance lookup, route planning, installation scheduling, or labor formulas.

## Saved offers and filters

- Saved offers list should support search and filters by customer, status, date range, author, and
  total range where practical.
- Status and version should be visible at a glance.
- Opening an old quote should make it clear whether the user is viewing a locked version or editing a
  draft/new revision.
- Duplicating or revising a sent quote must create a new version.

## COD-032 business validation dashboard notes

OWNER/ADMIN dashboard users see `Validare business necesară` when tenant-scoped catalog, pricing, or
calculation settings contain `requires business validation` / `validare business` markers. The
callout shows only categories and record counts; it must not expose customer PII, internal material
costs, supplier costs, or quote trace details.

The callout points admins back to catalog/settings so they can resolve profile systems, glass
deductions, profile linear-meter rules, hardware rules, accessories/services, VAT/discount/markup,
PDF template choice, and sample-output requirements before historical quote validation.

## Catalog and admin UX

- Catalog admin can be denser than quote creation but must still work on mobile.
- Active/inactive states should be obvious.
- Price list and configurable deduction fields should warn admins that changes affect new quote
  versions, not locked historical ones.
- Unknown production rules should be labeled as requiring business validation rather than hidden.

## COD-030 catalog CSV UX notes

Catalog CSV import/export is visible only to OWNER/ADMIN users. Each catalog section exposes a
mobile-friendly export action and an import form with a `Sectiune CSV` selector, file input,
`Valideaza dry-run`, and `Importa CSV` actions. The price-list section can switch between
`Liste de preturi` and `Pozitii de pret` because both records are maintained from the same catalog
area.

Dry-run and publish results must stay near the import controls and show row-level validation errors
with `Rand`, `Camp`, and `Eroare` columns. Invalid rows block the whole publish action so admins can
correct the CSV without partial catalog updates. The UI must not imply supplier integration,
automatic formula execution, or changes to locked historical quote snapshots.

## PDF generation UX

- Before generation, show the selected template, quote version, customer, totals, and unresolved
  warnings.
- Prevent generation if required customer-facing information is missing.
- After generation, provide preview/download/share actions according to platform capability.
- Make it clear whether the generated PDF is for a draft, sent version, or revised version.

## COD-031 customer delivery UX notes

Generated PDFs on a locked version expose a Romanian `Trimite către client` action with required
recipient email and optional recipient name fields. The action delivers the selected generated PDF
through the configured email provider. In local development the provider records only a synthetic
redacted delivery event; production/pilot should configure a real provider.

After send, users land on a confirmation screen with the quote number, version, sent timestamp,
download action, customer-visible totals, and delivery status with only a redacted recipient email.
The screen avoids internal costs and trace details, and the quote detail page explains that a
revision is the only way to change a sent offer.

## COD-040 customer email delivery UX notes

Send errors distinguish invalid recipient email, unreadable stored PDF, provider failure, and
not-locked/not-current document state. The UI must not display full recipient emails from delivery
logs or audit metadata, and it must not imply invite-email automation; invite links remain manually
delivered until a separate auth-invite email task is implemented.

## COD-020 commercial adjustment UX notes

The quote detail workflow exposes Romanian commercial controls only on mutable drafts. Authorized
users can enter an item-level manual final total or a quote-level discount, and every form requires a
reason before submission. The review panel separates `Total calculat`, `Reducere ofertă`,
`Ajustări manuale`, `Total înainte de override`, and final `Total` so mobile users can see what the
calculator produced versus what was commercially adjusted before locking a version.

## COD-022 saved offer workflow notes

The saved-offers page now presents quick workflow filters for `Ciorne`, `Trimise`, `Acceptate`,
`Respinsă`, `Expiră curând`, `Cu PDF generat`, `Fără calcul`, and `Cu avertizări`. Users can combine
manual filters with workflow filters and save the current view as a user-specific `SavedFilter`.

Offer cards show the quote status, current quote-version status, generated-PDF state, missing
calculation state, and warning count in Romanian badges so mobile users can triage work without
opening every offer.

## COD-023 PWA and mobile hardening notes

The web app exposes installable PWA metadata through the Next manifest route, app icons, Romanian
application description, standalone display mode, and a service worker. The service worker caches
only static application assets such as icons, the manifest, and hashed framework files; tenant pages,
quote data, customer data, and generated documents remain network-first and are not cached for
offline reuse.

Authenticated dashboard routes share persistent navigation: a desktop sidebar and a bottom mobile
navigation bar for `Panou`, `Clienți`, `Oferte`, and `Catalog`. Dead mobile links are not shown until
their destination routes exist.

The quote detail screen keeps `Total curent`, the version number, preview, and the next useful quote
action sticky above the mobile navigation. This keeps recalculation, PDF generation, or revision
creation reachable while reviewing positions and warnings on a phone.

Mobile audit widths for this hardening pass are `360px`, `390px`, and `430px`. The audited target is
that Romanian labels, totals, status badges, sticky actions, and bottom navigation remain readable
without hover-only controls at those widths.

## COD-027 settings UX notes

`/dashboard/settings` is a mobile-first configuration screen for company/PDF defaults, quote
numbering, and personal shortcuts. OWNER/ADMIN users can edit company settings, only OWNER users can
edit numbering, and restricted roles see read-only controls for tenant-wide settings. The quote-number
preview must remain visible near prefix/date/next-number inputs on small screens.

## COD-028 door item UX notes

The quote detail draft editor now exposes three first-step item choices: `Fereastră fixă`, `Ușă`, and
`Poziție personalizată`. The door form keeps quantity, width, height, customer description, catalog
selection, panel/manual price, hardware placeholder, and internal notes in one compact mobile-first
section.

Door drawings are orientative rectangular schematics with optional glass/panel split and dimensions.
Calculation warnings for missing door formulas must stay visible before document generation so users
understand the MVP door total is based only on explicit snapshot prices.

## Accessibility and responsiveness

- Tap targets should be large enough for mobile use.
- Text, buttons, totals, and tables must not overlap or clip on narrow screens.
- Totals and call-to-action buttons should remain readable with long customer names and long item
  descriptions.
- Use labels, units, and helper text where domain fields are ambiguous.
- Do not rely on color alone for status, warnings, or locked-version state.
