# Localization

The app is Romanian-first. User-facing UI, customer-facing previews, and generated offer documents
default to Romanian labels and `ro-RO` formatting.

## Locale Scope

- Default app locale: `ro`.
- Default formatting locale: `ro-RO`.
- Optional English labels can exist only as a small internal fallback, not as the primary UI.
- Do not translate enum values, database values, route segments, API parameters, source keys, audit
  action constants, or snapshot machine fields.

## Internal App i18n

The web app keeps lightweight translation helpers in `apps/web/src/lib/i18n`. Use those helpers for
shared labels such as:

- quote statuses;
- quote version statuses;
- quote item types;
- tenant roles and membership statuses;
- money and date formatting.

Small one-off strings may stay local to the owning component, but new user-facing features should
use Romanian copy by default.

## COD-018 Catalog Labels

The catalog admin UI uses these Romanian section labels:

- `Catalog`
- `Furnizori`
- `Sisteme de profil`
- `Profile`
- `Pachete sticla`
- `Kituri feronerie`
- `Culori si finisaje`
- `Accesorii`
- `Servicii`
- `Cote taxe`
- `Liste de preturi`
- `Pozitii de pret`

Catalog record state labels are `activ`, `inactiv`, and `arhivat`. Records with unvalidated
configuration or pricing-rule JSON show the badge `necesită validare business`.

## Customer-Facing Output

Template A HTML previews and generated PDFs must use Romanian labels, including:

- `Ofertă`;
- `Client`;
- `Poziții ofertă`;
- `Subtotal`;
- `TVA`;
- `Total final`;
- `Termeni`.

Customer-facing PDF/HTML output must continue to hide internal costs and calculation traces unless
a future task explicitly adds an authorized internal document view.

## Testing Expectations

When a task changes user-facing offer output, update package/app tests so Romanian labels remain
covered. Template A tests should assert that core English labels such as `Offer summary`,
`Final total`, `Items`, and `Customer` do not appear in customer-facing output.

## Documentation Expectations

Update the README when setup, user-visible behavior, storage, authentication, or validation commands
change. Update this document when localization boundaries or helper conventions change.
