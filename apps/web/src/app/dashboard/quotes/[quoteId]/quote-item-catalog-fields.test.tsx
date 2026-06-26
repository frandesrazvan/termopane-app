import {
  CatalogMaterialType,
  CatalogUnit,
  PriceListStatus,
  ProfileItemType,
  type ColorFinish,
  type GlassPackage,
  type HardwareKit,
  type PriceList,
  type ProfileItem,
  type ProfileSystem,
} from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  DoorCatalogFields,
  FixedWindowCatalogFields,
  type FixedWindowCatalogFormOptions,
} from "./quote-item-catalog-fields";

describe("FixedWindowCatalogFields", () => {
  it("renders Romanian fixed-window catalog labels and select names", () => {
    const markup = renderToStaticMarkup(
      <form>
        <FixedWindowCatalogFields currency="RON" options={catalogOptions()} />
      </form>,
    );

    expect(markup).toContain("Sistem de profil");
    expect(markup).toContain("Profil toc");
    expect(markup).toContain("Pachet sticlă");
    expect(markup).toContain("Culoare/finisaj");
    expect(markup).toContain("Feronerie");
    expect(markup).toContain("Listă de prețuri activă");
    expect(markup).toContain('name="profileSystemId"');
    expect(markup).toContain('name="frameProfileId"');
    expect(markup).toContain('name="glassPackageId"');
    expect(markup).toContain('name="colorFinishId"');
    expect(markup).toContain('name="hardwareKitId"');
  });

  it("renders Romanian door catalog labels and optional select names", () => {
    const markup = renderToStaticMarkup(
      <form>
        <DoorCatalogFields currency="RON" options={catalogOptions()} />
      </form>,
    );

    expect(markup).toContain("Profil toc ușă");
    expect(markup).toContain("Profil prag");
    expect(markup).toContain("Pachet sticlă opțional");
    expect(markup).toContain("Feronerie");
    expect(markup).toContain("Listă de prețuri activă");
    expect(markup).toContain('name="profileSystemId"');
    expect(markup).toContain('name="frameProfileId"');
    expect(markup).toContain('name="thresholdProfileId"');
    expect(markup).toContain('name="glassPackageId"');
    expect(markup).toContain('name="colorFinishId"');
    expect(markup).toContain('name="hardwareKitId"');
  });
});

function catalogOptions(): FixedWindowCatalogFormOptions {
  return {
    profileSystems: [profileSystem()],
    frameProfiles: [profileItem()],
    thresholdProfiles: [profileItem({ id: "profile-threshold", type: ProfileItemType.THRESHOLD })],
    glassPackages: [glassPackage()],
    colorFinishes: [colorFinish()],
    hardwareKits: [hardwareKit()],
    activePriceList: priceList(),
  };
}

function profileSystem() {
  return {
    id: "system-pvc",
    tenantId: "tenant-a",
    supplierId: null,
    name: "Sistem PVC",
    code: "PVC",
    materialType: CatalogMaterialType.PVC,
    description: null,
    configuration: null,
    isActive: true,
    deletedAt: null,
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
  } as ProfileSystem;
}

function profileItem(overrides: Partial<ProfileItem> = {}) {
  return {
    id: "profile-frame",
    tenantId: "tenant-a",
    profileSystemId: "system-pvc",
    supplierId: null,
    name: "Profil toc",
    code: "FRAME",
    type: ProfileItemType.FRAME,
    unit: CatalogUnit.LINEAR_METER,
    description: null,
    deductionRule: null,
    wasteRule: null,
    configuration: null,
    isActive: true,
    deletedAt: null,
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
    ...overrides,
  } as ProfileItem;
}

function glassPackage() {
  return {
    id: "glass",
    tenantId: "tenant-a",
    supplierId: null,
    name: "Sticlă dublă",
    code: "GLASS",
    compositionLabel: null,
    unit: CatalogUnit.SQUARE_METER,
    minBillableAreaSquareMm: null,
    deductionRule: null,
    configuration: null,
    isActive: true,
    deletedAt: null,
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
  } as GlassPackage;
}

function colorFinish() {
  return {
    id: "color",
    tenantId: "tenant-a",
    profileSystemId: "system-pvc",
    supplierId: null,
    name: "Alb",
    code: "WHITE",
    surface: null,
    configuration: null,
    isActive: true,
    deletedAt: null,
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
  } as ColorFinish;
}

function hardwareKit() {
  return {
    id: "hardware",
    tenantId: "tenant-a",
    supplierId: null,
    name: "Feronerie fixă",
    code: "HARD",
    category: "fix",
    openingType: null,
    unit: CatalogUnit.EACH,
    quantityRule: null,
    configuration: null,
    isActive: true,
    deletedAt: null,
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
  } as HardwareKit;
}

function priceList() {
  return {
    id: "price-list",
    tenantId: "tenant-a",
    name: "Lista activă",
    version: "v1",
    currency: "RON",
    status: PriceListStatus.ACTIVE,
    effectiveFrom: null,
    effectiveTo: null,
    notes: null,
    createdById: null,
    isActive: true,
    deletedAt: null,
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
  } as PriceList;
}
