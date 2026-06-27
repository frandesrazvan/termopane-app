# Calculation Package

Pure TypeScript calculation helpers for quote calculations.

## Scope

The current implementation supports simple rectangular fixed-window quote items and synthetic
custom manual line items.

Included:

- glass dimensions from configured deduction values;
- owner-provided glass deduction rule snapshots;
- glass area and billable area;
- rectangular frame profile linear meters from legacy snapshots or explicit profile-meter rules;
- simple material cost from snapshot prices;
- markup, discount, and VAT using integer minor units;
- item-level and quote-level manual final-total overrides with warnings and trace entries;
- quote-level discount adjustments;
- quote-level aggregation.
- structured `materialRequirements`, `glassCuts`, and grouped `profileLinearMeters` outputs.
- explicit catalog-backed accessory, service, transport, and installation line totals from frozen
  quantity/unit/sale-price snapshots.

Excluded:

- database reads;
- auth or tenant lookup;
- supplier-specific formulas;
- production cut optimization;
- hardware, reinforcement, labor, accessory, service, transport, or installation formulas.

Hardware, reinforcement, labor, accessory, service, transport, and installation quantities may
appear only as explicit snapshot requirements passed into the input. The package does not derive
those quantities.

Unknown production rules must remain configurable or be marked as requiring business validation.
Rule snapshots marked `requires-business-validation` are calculated only with warnings. Unsupported
profile-meter rule kinds are blocked instead of inferred.

## Reference Offer Harness

`src/reference-offer-harness.ts` validates the redacted reference-offer fixture pack used for
business-owner review. The committed pack is synthetic only; future validated historical packs must
contain 10-20 redacted cases and must not include private PDFs, real customer identifiers, addresses,
emails, phone numbers, or supplier-confidential files.

The harness checks required owner inputs, redaction guardrails, expected totals, expected warning
codes, and exposes `createReferenceOfferComparisonReport` for a compact pass/fail summary before a
review session.

```powershell
pnpm --filter @termopane/calculation test -- reference-offer-harness
```
