# PDF output spec

The MVP should support customer-ready PDF offers.

## Template A: detailed offer

Inspired by Fenestra-style output:
- offer number/date;
- page number;
- title;
- customer greeting;
- item name;
- drawing with dimensions;
- profile details;
- hardware details;
- glass/panel details;
- surface;
- unit price;
- total price;
- discount;
- VAT;
- final value;
- delivery, advance, warranty, validity, address, and footer fields.

## Template B: compact proposal

Inspired by FCCPLAST-style output:
- company header;
- proposal title;
- repeated item blocks;
- drawing left;
- description center;
- MU/quantity/unit cost right;
- total band per item;
- accessories/services as line items;
- final summary with total m² and total document value.

## Rules

- Generated PDFs belong to a specific QuoteVersion.
- Sent PDFs are immutable.
- Do not regenerate sent documents silently.
- Store PDF metadata and the calculation snapshot used to create it.
