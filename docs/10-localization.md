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

## COD-019 Quote Catalog Selection Labels

Fixed-window quote item forms use these Romanian labels:

- `Sistem de profil`
- `Profil toc`
- `Pachet sticlă`
- `Culoare/finisaj`
- `Feronerie`
- `Listă de prețuri activă`
- `Nu există listă de prețuri activă`

The quote item catalog validation badge remains `necesită validare business`.

## COD-020 Commercial Adjustment Labels

Manual commercial controls in the quote workflow use Romanian labels:

- `Ajustare preț poziție`
- `Total final manual`
- `Motiv override`
- `Reducere ofertă`
- `Tip reducere`
- `Valoare reducere`
- `Motiv reducere`
- `Total calculat`
- `Ajustări manuale`
- `Total înainte de override`

These labels are internal workflow UI labels, not database enum values. Audit action constants remain
untranslated.

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

## COD-021 Template B Labels

Template B compact proposal previews and PDFs use Romanian customer-facing labels, including:

- `Propunere compactă`;
- `Poziții ofertă`;
- `UM`;
- `Cant.`;
- `Preț unitar`;
- `Total poziție`;
- `Total m²`;
- `Valoare totală document`.

The quote document UI exposes the template choices as `Template A - ofertă detaliată` and
`Template B - propunere compactă`.

## COD-022 Saved Offer Workflow Labels

The saved-offers workflow uses these Romanian labels:

- `Filtre rapide`;
- `Filtre salvate`;
- `Ciorne`;
- `Trimise`;
- `Acceptate`;
- `Respinsă`;
- `Expiră curând`;
- `Cu PDF generat`;
- `Fără calcul`;
- `Cu avertizări`;
- `Nume filtru salvat`;
- `Salvează filtrul`;
- `Versiune Ciornă`;
- `Versiune Blocată`;
- `Versiune Trimisă`;
- `Versiune Înlocuită`.

## COD-023 Mobile/PWA Labels

The mobile shell and PWA states use Romanian labels including:

- `Se încarcă spațiul de lucru`;
- `Nu am putut încărca acest ecran`;
- `Panou`;
- `Clienți`;
- `Oferte`;
- `Catalog`;
- `Total curent`;
- `Previzualizare`;
- `Recalculează`;
- `Generează PDF`;
- `Revizie`.

The formal mobile audit widths are `360px`, `390px`, and `430px`; labels above must remain readable
on those widths.

## Testing Expectations

When a task changes user-facing offer output, update package/app tests so Romanian labels remain
covered. Template A tests should assert that core English labels such as `Offer summary`,
`Final total`, `Items`, and `Customer` do not appear in customer-facing output.

## Documentation Expectations

Update the README when setup, user-visible behavior, storage, authentication, or validation commands
change. Update this document when localization boundaries or helper conventions change.
