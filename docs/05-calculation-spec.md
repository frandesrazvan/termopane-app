# Calculation engine

The calculation engine must be deterministic and testable.

It receives:
- tenant/company settings snapshot;
- price list snapshot;
- quote version snapshot;
- item configuration;
- profile/glass/hardware/accessory catalog snapshots;
- commercial rules;
- overrides.

It returns:
- material requirements;
- glass cuts;
- profile linear meters;
- item totals;
- quote totals;
- VAT/tax totals;
- warnings;
- calculation trace.

The calculation package must not read from the database.

Unknown real-world formulas must remain configurable.