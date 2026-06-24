# Calculation Package

Pure TypeScript calculation helpers for quote calculations.

## Scope

The current implementation supports simple rectangular fixed-window quote items and synthetic
custom manual line items.

Included:

- glass dimensions from configured deduction values;
- glass area and billable area;
- rectangular frame profile linear meters;
- simple material cost from snapshot prices;
- markup, discount, and VAT using integer minor units;
- item-level and quote-level manual final-total overrides with warnings and trace entries;
- quote-level discount adjustments;
- quote-level aggregation.
- structured `materialRequirements`, `glassCuts`, and grouped `profileLinearMeters` outputs.

Excluded:

- database reads;
- auth or tenant lookup;
- supplier-specific formulas;
- production cut optimization;
- hardware, reinforcement, labor, or accessory formulas.

Hardware, reinforcement, labor, accessory, and service quantities may appear only as explicit
snapshot requirements passed into the input. The package does not derive those quantities.

Unknown production rules must remain configurable or be marked as requiring business validation.
