# Calculation Cases

These fixtures document synthetic calculation expectations for the pure calculation package.
They are not supplier data and must not be treated as production formulas.

## Fixed rectangular window

Use this case for unit tests around `calculateElement`.

- Element type: `fixed-window`
- Outer dimensions: `1200mm x 1400mm`
- Quantity: `1`
- Glass deductions: `80mm` width, `100mm` height
- Calculated glass dimensions: `1120mm x 1300mm`
- Glass area: `1.456m2`
- Minimum billable glass area: `1.5m2`
- Glass unit price: `10000` minor units per `m2`
- Glass cost: `15000` minor units
- Frame profile perimeter: `2 * 1.2m + 2 * 1.4m = 5.2m`
- Frame profile unit price: `1000` minor units per meter
- Frame profile cost: `5200` minor units
- Glass cuts output contains one `main` pane using the configured deduction rule.
- Profile linear meters output uses one grouped frame profile requirement.
- Validated profile-meter snapshots may provide the rectangular-perimeter multipliers and optional
  waste basis points. Unsupported rule kinds must warn instead of falling back to a guessed formula.

## Custom manual line

Use this case for unit tests around explicit non-standard MVP items.

- Element type: `custom-line`
- Quantity: `2`
- Unit price: `5000` minor units
- Custom line cost: `10000` minor units
- No geometry, glass, profile, hardware, reinforcement, labor, or accessory formula is inferred.

## Commercial totals

Commercial test values use integer minor units and basis points.

- Material cost: glass plus profile
- Markup: `markupBasisPoints / 10000`
- Discount: applied after markup
- VAT: applied after discount
- Item manual override: may replace an item final total with an audited amount and trace entry
- Quote discount: may adjust the quote subtotal after item aggregation
- Quote manual override: may replace final quote total with an audited amount and trace entry

## Warning fixtures

Tests intentionally cover:

- missing glass deductions;
- missing glass/profile/custom prices;
- unsupported item types;
- explicit hardware/accessory snapshots, without automatic formulas;
- rule snapshots that still require business validation;
- owner-approved rounding tolerances in the reference-offer harness;
- manual override and quote discount trace entries.

All values are synthetic and exist only to keep tests deterministic.
