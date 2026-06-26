import {
  CatalogMaterialType,
  CatalogUnit,
  PriceListItemType,
  PriceListStatus,
  ProfileItemType,
  type ColorFinish,
  type GlassPackage,
  type HardwareKit,
  type PriceList,
  type PriceListItem,
  type ProfileItem,
  type ProfileSystem,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  buildDoorCatalogSnapshot,
  buildFixedWindowCatalogSnapshot,
  selectActiveCatalogPriceList,
} from "./quote-item-catalog-snapshot";

describe("quote item catalog snapshots", () => {
  it("stores selected fixed-window catalog names, ids, units, and price-list references", () => {
    const snapshot = buildFixedWindowCatalogSnapshot({
      profileSystem: profileSystem(),
      frameProfile: profileItem({
        deductionRule: { validationStatus: "requires business validation" },
      }),
      glassPackage: glassPackage({
        deductionRule: { deductionWidthMm: 80, deductionHeightMm: 100 },
      }),
      colorFinish: colorFinish(),
      hardwareKit: hardwareKit(),
      priceList: priceList(),
      priceListItems: [
        priceListItem({
          id: "price-frame",
          itemType: PriceListItemType.PROFILE_ITEM,
          catalogItemId: "profile-frame",
          unit: CatalogUnit.LINEAR_METER,
          saleMinor: BigInt(1_000),
        }),
        priceListItem({
          id: "price-glass",
          itemType: PriceListItemType.GLASS_PACKAGE,
          catalogItemId: "glass-clear",
          unit: CatalogUnit.SQUARE_METER,
          saleMinor: BigInt(10_000),
        }),
        priceListItem({
          id: "price-color",
          itemType: PriceListItemType.COLOR_FINISH,
          catalogItemId: "color-white",
          unit: CatalogUnit.SQUARE_METER,
          saleMinor: BigInt(0),
        }),
        priceListItem({
          id: "price-hardware",
          itemType: PriceListItemType.HARDWARE_KIT,
          catalogItemId: "hardware-basic",
          unit: CatalogUnit.EACH,
          saleMinor: BigInt(4_000),
        }),
      ],
    });

    expect(snapshot).toMatchObject({
      source: "tenant-catalog",
      selectedCatalogIds: {
        profileSystemId: "system-pvc",
        frameProfileId: "profile-frame",
        glassPackageId: "glass-clear",
        colorFinishId: "color-white",
        hardwareKitId: "hardware-basic",
      },
      requiresBusinessValidation: true,
      priceList: {
        id: "price-list-active",
        name: "Lista sintetică",
        version: "2026-test",
        currency: "RON",
      },
      profileSystem: {
        id: "system-pvc",
        name: "Sistem PVC sintetic",
      },
      frameProfile: {
        id: "profile-frame",
        name: "Profil toc sintetic",
        unit: CatalogUnit.LINEAR_METER,
        unitPriceMinorPerMeter: 1_000,
        priceListItem: {
          id: "price-frame",
          priceListId: "price-list-active",
          saleMinor: 1_000,
        },
      },
      glassPackage: {
        id: "glass-clear",
        name: "Sticlă clară sintetică",
        unit: CatalogUnit.SQUARE_METER,
        minBillableAreaSquareMm: 1_500_000,
        minBillableAreaM2: 1.5,
        unitPriceMinorPerM2: 10_000,
      },
      colorFinish: {
        id: "color-white",
        name: "Alb sintetic",
        unit: CatalogUnit.SQUARE_METER,
      },
      hardwareKit: {
        id: "hardware-basic",
        name: "Feronerie sintetică",
        unit: CatalogUnit.EACH,
      },
    });
    expect(JSON.stringify(snapshot)).not.toContain("costMinor");
  });

  it("keeps missing selected prices explicit without inventing values", () => {
    const snapshot = buildFixedWindowCatalogSnapshot({
      profileSystem: profileSystem(),
      frameProfile: profileItem(),
      glassPackage: glassPackage(),
      colorFinish: colorFinish(),
      priceList: priceList(),
      priceListItems: [],
    });

    expect(snapshot).toMatchObject({
      frameProfile: {
        priceListItem: null,
        unitPriceMinorPerMeter: null,
      },
      glassPackage: {
        priceListItem: null,
        unitPriceMinorPerM2: null,
      },
      hardwareKit: null,
    });
  });

  it("stores selected door catalog snapshots and manual panel pricing", () => {
    const snapshot = buildDoorCatalogSnapshot({
      profileSystem: profileSystem(),
      frameProfile: profileItem(),
      thresholdProfile: profileItem({
        id: "profile-threshold",
        name: "Profil prag sintetic",
        code: "THRESH-A",
        type: ProfileItemType.THRESHOLD,
      }),
      glassPackage: glassPackage(),
      colorFinish: colorFinish(),
      hardwareKit: hardwareKit(),
      panelDescription: "Panou decorativ sintetic",
      manualPanelPriceMinor: 12_000,
      currency: "RON",
      priceList: priceList(),
      priceListItems: [
        priceListItem({
          id: "price-hardware",
          itemType: PriceListItemType.HARDWARE_KIT,
          catalogItemId: "hardware-basic",
          unit: CatalogUnit.EACH,
          saleMinor: BigInt(4_000),
        }),
      ],
    });

    expect(snapshot).toMatchObject({
      source: "tenant-catalog",
      snapshotVersion: "cod-028-door-catalog-v1",
      selectedCatalogIds: {
        profileSystemId: "system-pvc",
        frameProfileId: "profile-frame",
        thresholdProfileId: "profile-threshold",
        glassPackageId: "glass-clear",
        colorFinishId: "color-white",
        hardwareKitId: "hardware-basic",
      },
      requiresBusinessValidation: true,
      panel: {
        description: "Panou decorativ sintetic",
        manualPricing: {
          unitPriceMinor: 12_000,
          currency: "RON",
          isFormula: false,
        },
      },
      hardwareKit: {
        id: "hardware-basic",
        priceListItem: {
          id: "price-hardware",
          saleMinor: 4_000,
        },
      },
    });
    expect(JSON.stringify(snapshot)).not.toContain("costMinor");
  });

  it("selects the active price list for the quote currency only", () => {
    expect(
      selectActiveCatalogPriceList(
        [
          priceList({ id: "eur", currency: "EUR" }),
          priceList({ id: "draft", status: PriceListStatus.DRAFT }),
          priceList({ id: "archived", deletedAt: new Date("2026-06-25T00:00:00.000Z") }),
          priceList({ id: "ron" }),
        ],
        "RON",
      )?.id,
    ).toBe("ron");
  });
});

function profileSystem(overrides: Partial<ProfileSystem> = {}) {
  return {
    id: "system-pvc",
    tenantId: "tenant-a",
    supplierId: "supplier-a",
    name: "Sistem PVC sintetic",
    code: "PVC-A",
    materialType: CatalogMaterialType.PVC,
    description: null,
    configuration: null,
    isActive: true,
    deletedAt: null,
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
    ...overrides,
  } as ProfileSystem;
}

function profileItem(overrides: Partial<ProfileItem> = {}) {
  return {
    id: "profile-frame",
    tenantId: "tenant-a",
    profileSystemId: "system-pvc",
    supplierId: "supplier-a",
    name: "Profil toc sintetic",
    code: "FRAME-A",
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

function glassPackage(overrides: Partial<GlassPackage> = {}) {
  return {
    id: "glass-clear",
    tenantId: "tenant-a",
    supplierId: "supplier-a",
    name: "Sticlă clară sintetică",
    code: "GLASS-A",
    compositionLabel: "4 / 16 / 4 sintetic",
    unit: CatalogUnit.SQUARE_METER,
    minBillableAreaSquareMm: 1_500_000,
    deductionRule: null,
    configuration: null,
    isActive: true,
    deletedAt: null,
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
    ...overrides,
  } as GlassPackage;
}

function colorFinish(overrides: Partial<ColorFinish> = {}) {
  return {
    id: "color-white",
    tenantId: "tenant-a",
    profileSystemId: "system-pvc",
    supplierId: "supplier-a",
    name: "Alb sintetic",
    code: "WHITE-A",
    surface: "ambele fețe",
    configuration: null,
    isActive: true,
    deletedAt: null,
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
    ...overrides,
  } as ColorFinish;
}

function hardwareKit(overrides: Partial<HardwareKit> = {}) {
  return {
    id: "hardware-basic",
    tenantId: "tenant-a",
    supplierId: "supplier-a",
    name: "Feronerie sintetică",
    code: "HARD-A",
    category: "fix",
    openingType: null,
    unit: CatalogUnit.EACH,
    quantityRule: null,
    configuration: null,
    isActive: true,
    deletedAt: null,
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
    ...overrides,
  } as HardwareKit;
}

function priceList(overrides: Partial<PriceList> = {}) {
  return {
    id: "price-list-active",
    tenantId: "tenant-a",
    name: "Lista sintetică",
    version: "2026-test",
    currency: "RON",
    status: PriceListStatus.ACTIVE,
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    effectiveTo: null,
    notes: null,
    createdById: null,
    isActive: true,
    deletedAt: null,
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
    ...overrides,
  } as PriceList;
}

function priceListItem(overrides: Partial<PriceListItem> = {}) {
  return {
    id: "price-item",
    tenantId: "tenant-a",
    priceListId: "price-list-active",
    itemType: PriceListItemType.PROFILE_ITEM,
    catalogItemId: "profile-frame",
    sku: null,
    description: null,
    unit: CatalogUnit.LINEAR_METER,
    costMinor: BigInt(500),
    saleMinor: BigInt(1_000),
    currency: "RON",
    metadata: null,
    isActive: true,
    deletedAt: null,
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
    ...overrides,
  } as PriceListItem;
}
