# Reference Offers Fixture Pack

This folder prepares the business-owner review for recreating real historical offers later.
Everything committed here must be synthetic, redacted, or explicitly safe for source control.

Do not commit private PDFs, real customer names, phone numbers, email addresses, project addresses,
tax identifiers, supplier-confidential spreadsheets, or screenshots from real offers. Keep original
business documents outside the repository and convert only approved redacted facts into JSON
fixtures.

## Files

- `synthetic-offers.json` contains synthetic redacted offer examples for exercising the future
  recreation harness.
- `README.md` is the review checklist and fixture intake guide.

## Collection Checklist

Collect these from the business owner before recreating 10-20 validated historical quotes:

- real profile price list, including version/date, currency, units, and active/inactive status;
- glass deduction rules, including width and height deductions by system or glass package;
- glass price list, including unit basis, minimum billable area, and version/date;
- hardware rules, including explicit quantities or rule keys for supported opening styles;
- accessory/service prices, including units, quantities, and whether they are customer-facing;
- VAT/markup/discount rules, including rounding policy and any permitted manual overrides;
- preferred PDF template, either `template-a` or `template-b`, plus any required document wording.

## Intake Rules

1. Start with 10-20 historical offers selected by the business owner.
2. Store original PDFs, price lists, and screenshots outside Git.
3. Redact every customer, site, phone, email, address, and tax identifier before converting to JSON.
4. Freeze the exact catalog, price, commercial, and company settings snapshots used by that offer.
5. Record expected totals in integer minor units and the expected warning codes.
6. Mark unknown formulas as `requires business validation`; do not invent them.
7. Run the reference-offer harness before accepting the recreated case.

## Harness Expectations

The harness in `packages/calculation/src/reference-offer-harness.ts` validates that:

- fixture packs are synthetic/redacted or explicitly redacted validated historical data;
- no committed case points at private PDFs or other private artifacts;
- every required business-input category has a status;
- validated historical packs contain 10-20 cases;
- calculated totals and warning codes match the stored expectations.

The current JSON examples are synthetic baselines only. They are not supplier formulas and must not
be treated as production validation.
