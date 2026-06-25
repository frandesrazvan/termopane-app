"use server";

import {
  CatalogMaterialType,
  CatalogUnit,
  PriceListItemType,
  ProfileItemType,
} from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenant } from "@/lib/auth";
import {
  archiveTenantAccessory,
  archiveTenantColorFinish,
  archiveTenantGlassPackage,
  archiveTenantHardwareKit,
  archiveTenantPriceListItem,
  archiveTenantProfileItem,
  archiveTenantProfileSystem,
  archiveTenantServiceItem,
  archiveTenantSupplier,
  archiveTenantTaxRate,
  createTenantAccessory,
  createTenantColorFinish,
  createTenantGlassPackage,
  createTenantHardwareKit,
  createTenantPriceListItem,
  createTenantProfileItem,
  createTenantProfileSystem,
  createTenantServiceItem,
  createTenantSupplier,
  createTenantTaxRate,
  updateTenantAccessory,
  updateTenantColorFinish,
  updateTenantGlassPackage,
  updateTenantHardwareKit,
  updateTenantPriceListItem,
  updateTenantProfileItem,
  updateTenantProfileSystem,
  updateTenantServiceItem,
  updateTenantSupplier,
  updateTenantTaxRate,
} from "@/lib/data";
import {
  catalogEntityKeys,
  getCatalogRouteForEntity,
  type CatalogEntityKey,
} from "./catalog-config";
import { canMutateCatalog } from "./catalog-permissions";

const materialTypeSchema = z.enum(
  Object.values(CatalogMaterialType) as [CatalogMaterialType, ...CatalogMaterialType[]],
);
const profileItemTypeSchema = z.enum(
  Object.values(ProfileItemType) as [ProfileItemType, ...ProfileItemType[]],
);
const catalogUnitSchema = z.enum(Object.values(CatalogUnit) as [CatalogUnit, ...CatalogUnit[]]);
const priceListItemTypeSchema = z.enum(
  Object.values(PriceListItemType) as [PriceListItemType, ...PriceListItemType[]],
);

const requiredText = (maxLength: number) => z.string().trim().min(1).max(maxLength);
const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => (value.length > 0 ? value : null));

const optionalJsonObject = z
  .string()
  .trim()
  .max(10000)
  .transform((value, context): Record<string, unknown> | null => {
    if (!value) {
      return null;
    }

    try {
      const parsed = JSON.parse(value) as unknown;

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        context.addIssue({
          code: "custom",
          message: "Campul JSON trebuie sa fie un obiect.",
        });

        return null;
      }

      return parsed as Record<string, unknown>;
    } catch {
      context.addIssue({
        code: "custom",
        message: "Campul JSON nu este valid.",
      });

      return null;
    }
  });

const optionalInteger = z
  .string()
  .trim()
  .transform((value, context): number | null => {
    if (!value) {
      return null;
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 0) {
      context.addIssue({
        code: "custom",
        message: "Valoarea trebuie sa fie un numar intreg pozitiv.",
      });

      return null;
    }

    return parsed;
  });

const requiredInteger = z
  .string()
  .trim()
  .min(1)
  .transform((value, context): number => {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 0) {
      context.addIssue({
        code: "custom",
        message: "Valoarea trebuie sa fie un numar intreg pozitiv.",
      });

      return 0;
    }

    return parsed;
  });

const optionalDate = z
  .string()
  .trim()
  .transform((value, context): Date | null => {
    if (!value) {
      return null;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime())) {
      context.addIssue({
        code: "custom",
        message: "Data nu este valida.",
      });

      return null;
    }

    return date;
  });

const supplierSchema = z.object({
  name: requiredText(160),
  code: optionalText(80),
  contactName: optionalText(160),
  email: optionalText(320),
  phone: optionalText(80),
  website: optionalText(240),
  notes: optionalText(1000),
  isActive: z.boolean(),
});

const profileSystemSchema = z.object({
  supplierId: optionalText(120),
  name: requiredText(160),
  code: optionalText(80),
  materialType: materialTypeSchema,
  description: optionalText(1000),
  configuration: optionalJsonObject,
  isActive: z.boolean(),
});

const profileItemSchema = z.object({
  profileSystemId: requiredText(120),
  supplierId: optionalText(120),
  name: requiredText(160),
  code: optionalText(80),
  type: profileItemTypeSchema,
  unit: catalogUnitSchema,
  description: optionalText(1000),
  deductionRule: optionalJsonObject,
  wasteRule: optionalJsonObject,
  configuration: optionalJsonObject,
  isActive: z.boolean(),
});

const glassPackageSchema = z.object({
  supplierId: optionalText(120),
  name: requiredText(160),
  code: optionalText(80),
  compositionLabel: optionalText(160),
  unit: catalogUnitSchema,
  minBillableAreaSquareMm: optionalInteger,
  deductionRule: optionalJsonObject,
  configuration: optionalJsonObject,
  isActive: z.boolean(),
});

const hardwareKitSchema = z.object({
  supplierId: optionalText(120),
  name: requiredText(160),
  code: optionalText(80),
  category: optionalText(120),
  openingType: optionalText(120),
  unit: catalogUnitSchema,
  quantityRule: optionalJsonObject,
  configuration: optionalJsonObject,
  isActive: z.boolean(),
});

const colorFinishSchema = z.object({
  profileSystemId: optionalText(120),
  supplierId: optionalText(120),
  name: requiredText(160),
  code: optionalText(80),
  surface: optionalText(120),
  configuration: optionalJsonObject,
  isActive: z.boolean(),
});

const accessorySchema = z.object({
  supplierId: optionalText(120),
  name: requiredText(160),
  code: optionalText(80),
  category: optionalText(120),
  unit: catalogUnitSchema,
  quantityRule: optionalJsonObject,
  configuration: optionalJsonObject,
  isActive: z.boolean(),
});

const serviceItemSchema = z.object({
  name: requiredText(160),
  code: optionalText(80),
  category: optionalText(120),
  unit: catalogUnitSchema,
  configuration: optionalJsonObject,
  isActive: z.boolean(),
});

const taxRateSchema = z.object({
  name: requiredText(160),
  code: optionalText(80),
  rateBasisPoints: requiredInteger,
  isDefault: z.boolean(),
  validFrom: optionalDate,
  validTo: optionalDate,
  configuration: optionalJsonObject,
  isActive: z.boolean(),
});

const priceListItemSchema = z.object({
  priceListId: requiredText(120),
  itemType: priceListItemTypeSchema,
  catalogItemId: requiredText(120),
  sku: optionalText(120),
  description: optionalText(1000),
  unit: catalogUnitSchema,
  costMinor: optionalInteger,
  saleMinor: optionalInteger,
  currency: z
    .string()
    .trim()
    .max(3)
    .transform((value) => (value.length > 0 ? value.toUpperCase() : "RON")),
  metadata: optionalJsonObject,
  isActive: z.boolean(),
});

export async function createCatalogRecordAction(formData: FormData) {
  const entity = parseEntity(formText(formData, "entity"));
  const route = getCatalogRouteForEntity(entity);
  const context = await requireTenant();

  if (!canMutateCatalog(context.membership)) {
    redirect("/forbidden");
  }

  const data = parseCatalogForm(entity, formData, route);
  const record = await createCatalogRecord(entity, context, data);

  if (!record) {
    redirect("/forbidden");
  }

  redirect(`${route}?event=created`);
}

export async function updateCatalogRecordAction(
  entity: CatalogEntityKey,
  recordId: string,
  formData: FormData,
) {
  const route = getCatalogRouteForEntity(entity);
  const context = await requireTenant();

  if (!canMutateCatalog(context.membership)) {
    redirect("/forbidden");
  }

  const data = parseCatalogForm(entity, formData, route);
  const record = await updateCatalogRecord(entity, context, recordId, data);

  if (!record) {
    redirect("/forbidden");
  }

  redirect(`${route}?event=updated`);
}

export async function archiveCatalogRecordAction(entity: CatalogEntityKey, recordId: string) {
  const route = getCatalogRouteForEntity(entity);
  const context = await requireTenant();

  if (!canMutateCatalog(context.membership)) {
    redirect("/forbidden");
  }

  const record = await archiveCatalogRecord(entity, context, recordId);

  if (!record) {
    redirect("/forbidden");
  }

  redirect(`${route}?event=archived`);
}

function parseEntity(value: string): CatalogEntityKey {
  if (catalogEntityKeys.includes(value as CatalogEntityKey)) {
    return value as CatalogEntityKey;
  }

  redirect("/dashboard/catalog?error=section");
}

function parseCatalogForm(entity: CatalogEntityKey, formData: FormData, route: string) {
  const parsed = schemaForEntity(entity).safeParse(formPayload(formData));

  if (!parsed.success) {
    redirect(`${route}?error=validation`);
  }

  return parsed.data;
}

function schemaForEntity(entity: CatalogEntityKey) {
  switch (entity) {
    case "suppliers":
      return supplierSchema;
    case "profileSystems":
      return profileSystemSchema;
    case "profileItems":
      return profileItemSchema;
    case "glassPackages":
      return glassPackageSchema;
    case "hardwareKits":
      return hardwareKitSchema;
    case "colorFinishes":
      return colorFinishSchema;
    case "accessories":
      return accessorySchema;
    case "serviceItems":
      return serviceItemSchema;
    case "taxRates":
      return taxRateSchema;
    case "priceListItems":
      return priceListItemSchema;
    default:
      return supplierSchema;
  }
}

function formPayload(formData: FormData) {
  return {
    supplierId: formText(formData, "supplierId"),
    profileSystemId: formText(formData, "profileSystemId"),
    priceListId: formText(formData, "priceListId"),
    name: formText(formData, "name"),
    code: formText(formData, "code"),
    contactName: formText(formData, "contactName"),
    email: formText(formData, "email"),
    phone: formText(formData, "phone"),
    website: formText(formData, "website"),
    notes: formText(formData, "notes"),
    materialType: formText(formData, "materialType"),
    description: formText(formData, "description"),
    configuration: formText(formData, "configuration"),
    type: formText(formData, "type"),
    unit: formText(formData, "unit"),
    deductionRule: formText(formData, "deductionRule"),
    wasteRule: formText(formData, "wasteRule"),
    compositionLabel: formText(formData, "compositionLabel"),
    minBillableAreaSquareMm: formText(formData, "minBillableAreaSquareMm"),
    category: formText(formData, "category"),
    openingType: formText(formData, "openingType"),
    quantityRule: formText(formData, "quantityRule"),
    surface: formText(formData, "surface"),
    rateBasisPoints: formText(formData, "rateBasisPoints"),
    isDefault: formData.get("isDefault") === "on",
    validFrom: formText(formData, "validFrom"),
    validTo: formText(formData, "validTo"),
    itemType: formText(formData, "itemType"),
    catalogItemId: formText(formData, "catalogItemId"),
    sku: formText(formData, "sku"),
    costMinor: formText(formData, "costMinor"),
    saleMinor: formText(formData, "saleMinor"),
    currency: formText(formData, "currency"),
    metadata: formText(formData, "metadata"),
    isActive: formData.get("isActive") === "on",
  };
}

function createCatalogRecord(
  entity: CatalogEntityKey,
  context: Awaited<ReturnType<typeof requireTenant>>,
  data: z.infer<ReturnType<typeof schemaForEntity>>,
) {
  switch (entity) {
    case "suppliers":
      return createTenantSupplier(context, data as z.infer<typeof supplierSchema>);
    case "profileSystems":
      return createTenantProfileSystem(context, data as z.infer<typeof profileSystemSchema>);
    case "profileItems":
      return createTenantProfileItem(context, data as z.infer<typeof profileItemSchema>);
    case "glassPackages":
      return createTenantGlassPackage(context, data as z.infer<typeof glassPackageSchema>);
    case "hardwareKits":
      return createTenantHardwareKit(context, data as z.infer<typeof hardwareKitSchema>);
    case "colorFinishes":
      return createTenantColorFinish(context, data as z.infer<typeof colorFinishSchema>);
    case "accessories":
      return createTenantAccessory(context, data as z.infer<typeof accessorySchema>);
    case "serviceItems":
      return createTenantServiceItem(context, data as z.infer<typeof serviceItemSchema>);
    case "taxRates":
      return createTenantTaxRate(context, data as z.infer<typeof taxRateSchema>);
    case "priceListItems":
      return createTenantPriceListItem(context, data as z.infer<typeof priceListItemSchema>);
    default:
      return null;
  }
}

function updateCatalogRecord(
  entity: CatalogEntityKey,
  context: Awaited<ReturnType<typeof requireTenant>>,
  recordId: string,
  data: z.infer<ReturnType<typeof schemaForEntity>>,
) {
  switch (entity) {
    case "suppliers":
      return updateTenantSupplier(context, recordId, data as z.infer<typeof supplierSchema>);
    case "profileSystems":
      return updateTenantProfileSystem(context, recordId, data as z.infer<typeof profileSystemSchema>);
    case "profileItems":
      return updateTenantProfileItem(context, recordId, data as z.infer<typeof profileItemSchema>);
    case "glassPackages":
      return updateTenantGlassPackage(context, recordId, data as z.infer<typeof glassPackageSchema>);
    case "hardwareKits":
      return updateTenantHardwareKit(context, recordId, data as z.infer<typeof hardwareKitSchema>);
    case "colorFinishes":
      return updateTenantColorFinish(context, recordId, data as z.infer<typeof colorFinishSchema>);
    case "accessories":
      return updateTenantAccessory(context, recordId, data as z.infer<typeof accessorySchema>);
    case "serviceItems":
      return updateTenantServiceItem(context, recordId, data as z.infer<typeof serviceItemSchema>);
    case "taxRates":
      return updateTenantTaxRate(context, recordId, data as z.infer<typeof taxRateSchema>);
    case "priceListItems":
      return updateTenantPriceListItem(context, recordId, data as z.infer<typeof priceListItemSchema>);
    default:
      return null;
  }
}

function archiveCatalogRecord(
  entity: CatalogEntityKey,
  context: Awaited<ReturnType<typeof requireTenant>>,
  recordId: string,
) {
  switch (entity) {
    case "suppliers":
      return archiveTenantSupplier(context, recordId);
    case "profileSystems":
      return archiveTenantProfileSystem(context, recordId);
    case "profileItems":
      return archiveTenantProfileItem(context, recordId);
    case "glassPackages":
      return archiveTenantGlassPackage(context, recordId);
    case "hardwareKits":
      return archiveTenantHardwareKit(context, recordId);
    case "colorFinishes":
      return archiveTenantColorFinish(context, recordId);
    case "accessories":
      return archiveTenantAccessory(context, recordId);
    case "serviceItems":
      return archiveTenantServiceItem(context, recordId);
    case "taxRates":
      return archiveTenantTaxRate(context, recordId);
    case "priceListItems":
      return archiveTenantPriceListItem(context, recordId);
    default:
      return null;
  }
}

function formText(formData: FormData, field: string) {
  const value = formData.get(field);

  return typeof value === "string" ? value : "";
}

