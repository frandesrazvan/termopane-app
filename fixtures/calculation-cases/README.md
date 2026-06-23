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

## Commercial totals

Commercial test values use integer minor units and basis points.

- Material cost: glass plus profile
- Markup: `markupBasisPoints / 10000`
- Discount: applied after markup
- VAT: applied after discount
- Manual override: may replace final total with an audited amount and trace entry

All values are synthetic and exist only to keep tests deterministic.
