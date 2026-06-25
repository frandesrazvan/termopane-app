# PDF output spec

PDFs are customer-facing documents generated from a quote version snapshot. A generated PDF must be
bound to the exact quote version, template, company settings snapshot, and calculation output used at
generation time.

## General requirements

- Generate PDFs only from saved quote versions, not from unsaved UI state.
- Locked/sent quote versions are immutable; correcting a sent document requires a new quote version.
- Sent PDFs are immutable and must not be regenerated silently.
- Use tenant company settings for logo, company name, address, contact data, tax text, footer text,
  warranty, delivery, payment, advance-payment, and offer validity fields.
- Hide internal material costs, supplier prices, margins, and restricted trace details from
  customer-facing PDFs.
- Include quote number, quote version, date, customer snapshot, page number where practical, and
  final totals.
- Use synthetic examples in tests and reference fixtures. Do not embed real customer data.
- PDF rendering should tolerate multiple pages, many items, and long descriptions without overlapping
  text or clipped totals.

## Template A: detailed offer

Template A is a detailed Fenestra-style offer. Each item should be readable as a technical and
commercial product block.

Required visible fields:

- company header and customer block;
- offer number, quote version, date, and page number;
- document title;
- customer greeting where configured;
- item name;
- product drawing or schematic placeholder with dimensions;
- item dimensions, quantity, and surface area where available;
- profile system/details;
- hardware details;
- glass or panel details;
- accessory/service lines where selected;
- unit price, discount, VAT/tax, item total, and final value;
- delivery, advance payment, warranty, validity, address, footer, and notes fields.

Implementation notes:

- Drawings can be schematic in MVP but should match the item type and opening layout well enough for
  customer review.
- If a calculation warning affects the offer, show a customer-safe message or prevent generation
  according to product rules.
- Internal calculation trace belongs in admin/support views, not in the PDF.

## Template B: compact proposal

Template B is a compact FCCPLAST-style proposal optimized for quick item comparison.

Required visible fields:

- company header;
- proposal title;
- repeated item blocks;
- drawing or schematic on the left;
- customer-facing description in the center;
- unit of measure, quantity, and unit cost on the right;
- colored total band per item;
- accessories/services as line items where selected;
- final summary with total surface area where available and total document value.

Implementation notes:

- Compact layout must remain readable on printed A4 and exported PDF previews.
- Long descriptions should wrap inside their block without covering prices.
- Keep item order stable with the quote version.

## Regeneration and audit

- Store a `GeneratedPdf` record or equivalent metadata with `tenantId`, `quoteVersionId`, template
  key, generator user, timestamp, and file/checksum reference.
- Store or reference the calculation snapshot used to create the PDF.
- Regenerating a PDF for the same quote version should either create a new generated PDF record or
  update metadata in an auditable way.
- If company settings or templates change after generation, old PDFs should still be explainable by
  the quote version and generation metadata.
- Generated files must be access-controlled by tenant and quote permissions.

## Testing guidance

Use synthetic quote/customer/company data. Cover:

- multi-item documents;
- long customer-facing descriptions;
- missing optional logo;
- dealer/restricted output hiding internal costs;
- Template A and Template B totals matching the calculation snapshot;
- generated PDF bound to the expected quote version.

## COD-015 Template A HTML preview notes

The first customer-facing output is a Template A HTML preview, not a generated PDF binary. The web
preview route renders only the current tenant-scoped `QuoteVersion` and its stored `QuoteItem`
snapshots, labels draft or unlocked versions clearly, and hides internal calculation costs/traces.
The pure `@termopane/pdf` package owns Template A HTML escaping, deterministic item ordering,
customer-visible totals, terms, and safe drawing fallback behavior so the same snapshot boundary can
be reused by future PDF generation.
