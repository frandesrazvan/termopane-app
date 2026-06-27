# Calculation spec

The calculation engine must be deterministic, testable, and independent from the database. Treat it
as a pure TypeScript function that receives frozen snapshots and returns totals, material
requirements, warnings, and trace data.

## Contract

Inputs:

- tenant/company settings snapshot;
- price list snapshot;
- quote version snapshot;
- quote item configuration snapshots;
- profile, glass, panel, hardware, color, accessory, service, and tax catalog snapshots;
- commercial rule snapshot;
- manual override snapshot.

Outputs:

- material requirements by item and by quote;
- glass cuts by item, pane, width, height, area, and source rule;
- profile linear meters by item, profile type, and source rule;
- hardware/accessory/service quantities;
- item material totals, commercial totals, discounts, VAT/tax, and final totals;
- quote-level totals;
- warnings;
- calculation trace suitable for support/admin inspection.

The calculation function must not:

- query the database;
- mutate input objects;
- read current tenant settings or current price lists by ID;
- hide missing configuration by inventing fallback production formulas;
- log customer PII.

Money should use integer minor units where possible.

## Input snapshots

Snapshots must contain all information needed to reproduce a quote version later. A locked quote
version should be recalculable from its stored snapshots even if the live catalog has changed.

Required snapshot groups:

- company and tax settings: currency, VAT/tax rate or tax mode, rounding settings, document defaults;
- commercial rules: markup, margin, discount, service additions, override permissions;
- catalog selections: selected profile system, profiles, glass/panel, hardware, colors,
  accessories, and services;
- item dimensions and quantity;
- configurable deduction values for glass, panel, profile, reinforcement, hardware, and any
  tenant-provided rules;
- price list values and effective version identifiers.

Unknown real-world formulas are `requires business validation`. Store them as nullable/configurable
fields and emit warnings when missing.

## Calculation behavior

- Validate dimensions, quantities, required catalog selections, and price availability before totals.
- Calculate glass dimensions only from configured deduction rules. If a rule is missing, return a
  warning and either block the item total or mark the value as incomplete according to product needs.
- Calculate profile linear meters from configured geometry and deduction rules. This is not full cut
  optimization and must not imply production-ready cutting plans.
- Calculate material requirements for hardware and accessories from explicit selections or configured
  quantity rules.
- Calculate material cost, commercial additions, discounts, VAT/tax, and final totals from snapshots.
- Apply manual overrides after the base calculation, preserve both base and overridden values, and
  include override audit references in trace data.
- Round values only through configured rounding policy. If no policy exists, use a documented default
  and add a trace entry.

## Formula placeholders

These placeholders are not validated production formulas. Use them only as implementation scaffolding
when the corresponding deduction/configuration values are supplied by fixtures or tenant settings.

```text
glassWidthMm = cellInnerWidthMm - glassDeductionWidthMm
glassHeightMm = cellInnerHeightMm - glassDeductionHeightMm
glassAreaM2 = glassWidthMm * glassHeightMm / 1_000_000
billableAreaM2 = max(glassAreaM2, glassPackage.minBillableAreaM2)

outerFrameLengthM = 2 * widthM + 2 * heightM
sashLengthM = sum(2 * sashWidthM + 2 * sashHeightM)
mullionLengthM = sum(verticalDividerLengths)
transomLengthM = sum(horizontalDividerLengths)
```

Do not hard-code supplier-specific values without a fixture/test explaining them and explicit
business validation.

## Warnings

Warnings should be structured and user-visible enough to guide correction.

Examples:

- missing glass deduction rule;
- missing profile price;
- unsupported opening style for automatic hardware quantity;
- custom item without enough pricing information;
- manual override applied to item or quote total;
- calculation used a default rounding policy;
- selected catalog record is inactive in the live catalog but present in the quote snapshot.

## Trace data

Trace data should explain how a result was produced without exposing customer PII. Include:

- input snapshot identifiers or hashes;
- formula/rule keys, not invented prose formulas;
- selected prices and units;
- intermediate dimensions, quantities, and totals;
- warnings and override references;
- final item and quote totals.

Trace visibility is permissioned. Dealer/restricted users should not receive internal material costs
or supplier-price trace details unless explicitly permitted.

## Testing guidance

Calculation tests should use synthetic fixtures. Cover:

- deterministic output for the same frozen input;
- missing deduction and missing price warnings;
- manual override audit linkage;
- old quote versions unaffected by changed live price lists;
- restricted output hiding internal costs where applicable.

## COD-024 reference offer harness notes

Pilot reference-offer fixtures live under `fixtures/reference-offers`. The committed pack contains
only synthetic redacted JSON examples and must not include private PDFs, real customer data, real
addresses, phone numbers, emails, or supplier-confidential spreadsheets.

The calculation harness in `packages/calculation/src/reference-offer-harness.ts` is the intended
entry point for recreating 10-20 business-owner validated historical quotes later. It validates the
required collection categories, enforces redaction guardrails, calculates each frozen snapshot with
the pure calculation package, and compares expected totals and warning codes.

Validated historical packs should contain between 10 and 20 cases. Unknown or unprovided business
rules must stay marked as pending business-owner input or `requires business validation`; they must
not be filled with invented production formulas.

## COD-032 business-owner validation notes

The owner-review checklist lives in `docs/11-business-owner-review-pack.md`. It adds
`sampleOutputRequirements` to the required reference-offer input categories so the business owner can
confirm not only formulas and prices, but also the expected visible PDF/sample-output shape.

`createReferenceOfferComparisonReport` summarizes validation errors, warning counts, pass/fail
status, and whether a historical pack satisfies the 10-20 case window. A pack can be used in review
only when the JSON is redacted, contains no private artifacts, and all recreated totals/warnings match
the expected values.

## COD-038 redacted historical validation notes

`pnpm reference:validate` validates the committed synthetic reference pack and any redacted pack path
passed to the command. The report includes case count, missing business inputs, warning mismatches,
total mismatches, template/PDF field mismatches, validation errors, validation warnings, and review
readiness.

Reference cases can be marked `draft-redacted`, `business-reviewed`, `validated-historical`, or
`blocked-missing-data`. Historical cases are ready only after every required business input is
`validated` or `not-applicable`, all expected totals and warning codes match the pure calculation
result, and no private artifacts are referenced.

## COD-039 calculation-rule calibration notes

The calculator now accepts explicit rule snapshots for calibrated fixed-window behavior:

- `glass.deductionRule` carries owner-provided width/height deductions, rule id/source, and
  validation status;
- `frameProfile.meterRule` carries an explicit `rectangular-perimeter` profile-meter rule with
  multipliers and optional waste basis points;
- hardware, accessory, service, reinforcement, panel, and labor quantities still enter only through
  explicit material requirements or catalog line snapshots.

Legacy quote snapshots with flat `deductionWidthMm`, `deductionHeightMm`, and no `meterRule` continue
to calculate with the previous rectangular frame perimeter so old quotes remain stable. Unsupported
profile-meter rule kinds are blocked with `UNSUPPORTED_PROFILE_METER_RULE`; unvalidated rule
snapshots emit `UNVALIDATED_GLASS_DEDUCTION_RULE` or `UNVALIDATED_PROFILE_METER_RULE`.

The trusted areas are currently owner-provided glass deduction snapshots and explicit
rectangular-perimeter profile-meter snapshots. Door panel/lock/threshold/reinforcement formulas,
automatic hardware quantities, transport distance, installation labor, supplier formulas, and
production cutting remain unvalidated.

Reference fixtures may declare owner-approved rounding tolerances per expected total/PDF field. A
historical fixture using tolerance must set `approvedBy = "business-owner"`; otherwise the harness
rejects the case.

No 10-20 case owner-validated historical pack is committed yet. Until owners provide redacted
historical cases, the committed regression coverage remains synthetic and must not be treated as
production formula validation.

## COD-028 door MVP calculation notes

Door quote items are supported as rough MVP calculation inputs with `type: "door"`. The calculator
validates dimensions and quantity, accepts explicit snapshot material prices such as a manual panel
price or safely-priced hardware, and returns customer totals from those explicit values only.

The calculator emits `MISSING_DOOR_FORMULA` for door items because panel sizing, locks, thresholds,
reinforcement, and door-specific fabrication formulas are not validated. Door glass, panel, profile,
threshold, and hardware quantities must not be derived from hard-coded assumptions; future production
behavior needs tenant-provided configuration or business-validated formulas.

## COD-029 accessory/service line calculation notes

Accessory, service, transport, and installation quote lines are calculated only from frozen explicit
snapshots. The pure calculation package accepts catalog line inputs for `accessory-line`,
`service-line`, `transport-line`, and `installation-line`, each with catalog item id, label, unit,
quantity, and optional sale price in minor units.

These lines produce material requirements with `materialType = accessory` for accessory rows and
`materialType = service` for service, transport, and installation rows. Missing sale price snapshots
emit `MISSING_EXPLICIT_MATERIAL_PRICE`; invalid or missing quantities emit `INVALID_QUANTITY`.
Transport and installation do not derive quantities or prices from distance, dimensions, labor rules,
or any other production formula.
