# Calculation Package

Pure TypeScript calculation helpers for quote calculations.

## Scope

The current implementation supports simple rectangular fixed-window quote items only.

Included:

- glass dimensions from configured deduction values;
- glass area and billable area;
- rectangular frame profile linear meters;
- simple material cost from snapshot prices;
- markup, discount, and VAT using integer minor units;
- manual final-total overrides with warnings and trace entries;
- quote-level aggregation.

Excluded:

- database reads;
- auth or tenant lookup;
- supplier-specific formulas;
- production cut optimization;
- hardware, reinforcement, labor, or accessory rules.

Unknown production rules must remain configurable or be marked as requiring business validation.
