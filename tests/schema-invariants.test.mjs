import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");

const tenantOwnedModels = [
  "TenantMember",
  "CompanySettings",
  "Customer",
  "Project",
  "Quote",
  "QuoteVersion",
  "QuoteItem",
  "QuoteCalculationResult",
  "Document",
  "AuditLog",
  "SavedFilter",
];

for (const modelName of tenantOwnedModels) {
  const match = schema.match(new RegExp(`model\\s+${modelName}\\s+{([\\s\\S]*?)\\n}`));
  assert.ok(match, `Expected model ${modelName} to exist in prisma/schema.prisma`);
  assert.match(match[1], /^\s*tenantId\s+String\b/m, `${modelName} must include tenantId String`);
}

assert.match(schema, /@@unique\(\[tenantId,\s*quoteNumber\]\)/, "Quote must keep tenant-scoped quote numbers unique");
assert.match(schema, /@@unique\(\[quoteId,\s*versionNumber\]\)/, "QuoteVersion must keep quote-scoped version numbers unique");
assert.match(schema, /WINDOW\s+@map\("window"\)/, "QuoteItemType must support window items");
assert.match(schema, /DOOR\s+@map\("door"\)/, "QuoteItemType must support door items");
assert.match(schema, /CUSTOM\s+@map\("custom"\)/, "QuoteItemType must support custom items");

console.log("Schema invariants passed.");
