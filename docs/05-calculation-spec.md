# Calculation spec

The calculation engine must be deterministic and testable.

It receives snapshots:
- tenant/company settings;
- price list;
- quote version;
- item configuration;
- profile/glass/hardware/accessory catalog;
- commercial rules;
- manual overrides.

It returns:
- item totals;
- quote totals;
- material requirements;
- glass cuts;
- profile linear meters;
- VAT/tax totals;
- warnings;
- calculation trace.

Rules:
- The calculation package must not read from the database.
- Inputs must be plain snapshots.
- Money should use integer minor units where possible.
- Unknown real-world formulas must remain configurable.
- Do not hard-code supplier-specific values without a fixture/test explaining them.

Initial formula placeholders:

glassWidthMm = cellInnerWidthMm - glassDeductionWidthMm
glassHeightMm = cellInnerHeightMm - glassDeductionHeightMm
glassAreaM2 = glassWidthMm * glassHeightMm / 1_000_000
billableAreaM2 = max(glassAreaM2, glassPackage.minBillableAreaM2)

outerFrameLengthM = 2 * widthM + 2 * heightM
sashLengthM = sum(2 * sashWidthM + 2 * sashHeightM)
mullionLengthM = sum(verticalDividerLengths)
transomLengthM = sum(horizontalDividerLengths)
