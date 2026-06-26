import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd, exit } from "node:process";
import assert from "node:assert/strict";

const schemaPath = join(cwd(), "prisma", "schema.prisma");
const seedPath = join(cwd(), "prisma", "seed.ts");
const schema = readFileSync(schemaPath, "utf8");
const seed = readFileSync(seedPath, "utf8");

const tenantOwnedModels = [
  "TenantMember",
  "CompanySettings",
  "QuoteNumberSettings",
  "UserPreference",
  "Supplier",
  "ProfileSystem",
  "ProfileItem",
  "GlassPackage",
  "HardwareKit",
  "ColorFinish",
  "Accessory",
  "ServiceItem",
  "TaxRate",
  "PriceList",
  "PriceListItem",
  "PricingRule",
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

const softDeleteCatalogModels = [
  "Supplier",
  "ProfileSystem",
  "ProfileItem",
  "GlassPackage",
  "HardwareKit",
  "ColorFinish",
  "Accessory",
  "ServiceItem",
  "TaxRate",
  "PriceList",
  "PriceListItem",
  "PricingRule",
];

const requiredUniqueConstraints = [
  { modelName: "Tenant", constraint: "@unique", field: "slug" },
  { modelName: "User", constraint: "@unique", field: "email" },
  { modelName: "TenantMember", constraint: "@@unique([tenantId, userId])" },
  { modelName: "Quote", constraint: "@@unique([tenantId, quoteNumber])" },
  { modelName: "QuoteVersion", constraint: "@@unique([quoteId, versionNumber])" },
];

const requiredSeedOperations = [
  "tenant",
  "user",
  "tenantMember",
  "companySettings",
  "quoteNumberSettings",
  "userPreference",
  "supplier",
  "profileSystem",
  "profileItem",
  "glassPackage",
  "hardwareKit",
  "colorFinish",
  "accessory",
  "serviceItem",
  "taxRate",
  "priceList",
  "priceListItem",
  "pricingRule",
  "customer",
  "project",
  "quote",
  "quoteVersion",
  "quoteItem",
  "quoteCalculationResult",
  "document",
  "savedFilter",
  "auditLog",
];

function modelBlock(modelName: string): string {
  const match = schema.match(new RegExp(`model\\s+${modelName}\\s+\\{([\\s\\S]*?)\\n\\}`));

  assert.ok(match, `Expected model ${modelName} to exist in prisma/schema.prisma.`);

  return match[1] ?? "";
}

try {
  for (const modelName of tenantOwnedModels) {
    const block = modelBlock(modelName);
    assert.match(block, /^\s*tenantId\s+String\b/m, `${modelName} must include tenantId String.`);
  }

  for (const modelName of softDeleteCatalogModels) {
    const block = modelBlock(modelName);
    assert.match(block, /^\s*deletedAt\s+DateTime\?/m, `${modelName} should support soft deletes.`);
  }

  for (const { modelName, constraint, field } of requiredUniqueConstraints) {
    const block = modelBlock(modelName);

    if (field) {
      assert.match(
        block,
        new RegExp(`^\\s*${field}\\s+String\\s+.*${constraint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m"),
        `${modelName}.${field} must include ${constraint}.`,
      );
    } else {
      assert.ok(block.includes(constraint), `${modelName} must include ${constraint}.`);
    }
  }

  for (const operation of requiredSeedOperations) {
    assert.ok(
      seed.includes(`prisma.${operation}.upsert`),
      `Seed should upsert a synthetic ${operation} record.`,
    );
  }

  console.info("Prisma schema invariants passed.");
} catch (error) {
  console.error(error);
  exit(1);
}
