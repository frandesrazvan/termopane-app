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

## COD-016 PDF binary generation notes

Template A can now be generated as a PDF binary from a locked or sent `QuoteVersion`. Generation
uses the same customer-facing snapshot as the HTML preview, stores the PDF under ignored local
development storage, creates a new immutable `Document` row for every generation, records visible
totals and checksum metadata, and writes an `AuditLog` entry with `DOCUMENT_GENERATED`. Regeneration
does not overwrite existing document records or files; production object storage remains a future
deployment concern.

## COD-021 Template B compact proposal notes

Template B is available as a tenant-selected template key during quote preview and PDF generation.
The compact customer-facing layout keeps item order stable from the saved `QuoteVersion`, renders a
left drawing/schematic, center description/spec block, and right commercial block with `UM`,
quantity, and unit price, then shows a colored item total band.

Template B final summary displays total surface area in square meters when available and the total
document value from the quote version totals snapshot. Generated Template B PDFs store
`template-b` on the immutable `Document`, include that key in visible totals metadata and audit
metadata, and use a distinct filename suffix. Internal material costs, supplier notes, margins, and
calculation traces remain excluded from Template B HTML/PDF output.

## COD-024 pilot review fixture notes

Business-owner review preparation starts in `fixtures/reference-offers`. The fixture README lists the
required intake checklist: profile price list, glass deduction rules, glass price list, hardware
rules, accessory/service prices, VAT/markup/discount rules, and preferred PDF template.

The committed examples are synthetic redacted JSON fixtures, not PDF files. Real historical offer
PDFs and source price lists must remain outside Git. Future validated cases should store only the
redacted snapshot facts needed to reproduce the quote totals and selected `template-a` or
`template-b` output.

## COD-025 storage/deployment readiness notes

Generated quote PDFs now go through a document storage provider interface. The local provider keeps
the current development/test behavior under ignored local storage. The S3-compatible provider uses
the server-side AWS SDK v3 S3 client with endpoint, region, bucket, credential, and path-style
configuration from environment variables.

Generation distinguishes storage-write failures from `Document` metadata creation failures. The
generated key remains the provider input, while the provider-returned storage key is persisted on the
immutable `Document` row. If bytes are stored but the `Document` row or audit metadata cannot be
created, the app attempts to delete the provider-returned object so failed generations do not leave
orphaned PDF files. Customer-facing PDF contents, tenant-scoped document access, quote-version
binding, and hidden internal costs are unchanged.

## COD-026 S3-compatible storage adapter notes

S3-compatible PDF storage supports `put`, `get`, and `delete` through SDK commands. Put operations
store the PDF `Content-Type` and portable metadata for checksum, quote version, template key, and
tenant id. Get operations return bytes to the existing tenant/quote-scoped download route. Delete
operations are used by failed generation cleanup. Missing objects map to `not_found`; invalid keys
map to `invalid_key`; credential, endpoint, or network failures map to controlled storage errors
without leaking secret values.

## COD-027 settings-backed PDF defaults

Company settings now include the default PDF template key. New quote versions snapshot that key with
the other company settings, and preview/PDF generation uses the snapshotted default when no explicit
template is selected. Generated documents still persist the actual template key used, so later
settings changes do not rewrite historical PDF metadata or locked quote-version output.

## COD-028 door output notes

Door quote items render in customer-facing HTML/PDF output as `Ușă`. The visible line includes
quantity, dimensions, glass/panel text, hardware text, schematic drawing, and customer totals. Door
internal notes, internal material costs, and calculation traces remain excluded from customer output.

Door drawings are schematic only. They show a rectangular door with optional glass/panel split and
dimension labels; they do not represent production fabrication geometry.
