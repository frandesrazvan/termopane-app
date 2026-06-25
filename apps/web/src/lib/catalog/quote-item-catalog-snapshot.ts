import {
  CatalogUnit,
  PriceListItemType,
  PriceListStatus,
  type ColorFinish,
  type GlassPackage,
  type HardwareKit,
  type PriceList,
  type PriceListItem,
  type ProfileItem,
  type ProfileSystem,
} from "@prisma/client";

const FIXED_WINDOW_SNAPSHOT_VERSION = "cod-019-fixed-window-catalog-v1";

export type FixedWindowCatalogSnapshotInput = {
  profileSystem: ProfileSystem;
  frameProfile: ProfileItem;
  glassPackage: GlassPackage;
  colorFinish: ColorFinish;
  hardwareKit?: HardwareKit | null;
  priceList?: PriceList | null;
  priceListItems?: readonly PriceListItem[];
};

type PriceListItemSnapshot = {
  id: string;
  priceListId: string;
  itemType: PriceListItemType;
  catalogItemId: string;
  sku: string | null;
  description: string | null;
  unit: CatalogUnit;
  calculationUnit: string | null;
  currency: string;
  saleMinor: number | null;
};

export function buildFixedWindowCatalogSnapshot({
  colorFinish,
  frameProfile,
  glassPackage,
  hardwareKit = null,
  priceList = null,
  priceListItems = [],
  profileSystem,
}: FixedWindowCatalogSnapshotInput): Record<string, unknown> {
  const frameProfilePrice = priceSnapshotFor(
    priceListItems,
    PriceListItemType.PROFILE_ITEM,
    frameProfile.id,
    priceList?.id,
  );
  const glassPackagePrice = priceSnapshotFor(
    priceListItems,
    PriceListItemType.GLASS_PACKAGE,
    glassPackage.id,
    priceList?.id,
  );
  const colorFinishPrice = priceSnapshotFor(
    priceListItems,
    PriceListItemType.COLOR_FINISH,
    colorFinish.id,
    priceList?.id,
  );
  const hardwareKitPrice = hardwareKit
    ? priceSnapshotFor(
        priceListItems,
        PriceListItemType.HARDWARE_KIT,
        hardwareKit.id,
        priceList?.id,
      )
    : null;

  return {
    source: "tenant-catalog",
    snapshotVersion: FIXED_WINDOW_SNAPSHOT_VERSION,
    selectedCatalogIds: {
      profileSystemId: profileSystem.id,
      frameProfileId: frameProfile.id,
      glassPackageId: glassPackage.id,
      colorFinishId: colorFinish.id,
      hardwareKitId: hardwareKit?.id ?? null,
    },
    requiresBusinessValidation: requiresBusinessValidation(
      profileSystem.configuration,
      frameProfile.deductionRule,
      frameProfile.wasteRule,
      frameProfile.configuration,
      glassPackage.deductionRule,
      glassPackage.configuration,
      colorFinish.configuration,
      hardwareKit?.quantityRule,
      hardwareKit?.configuration,
    ),
    priceList: priceList ? priceListSnapshot(priceList) : null,
    profileSystem: {
      id: profileSystem.id,
      name: profileSystem.name,
      code: profileSystem.code,
      materialType: profileSystem.materialType,
      supplierId: profileSystem.supplierId,
      requiresBusinessValidation: requiresBusinessValidation(profileSystem.configuration),
    },
    frameProfile: {
      id: frameProfile.id,
      name: frameProfile.name,
      label: frameProfile.name,
      code: frameProfile.code,
      type: frameProfile.type,
      unit: frameProfile.unit,
      calculationUnit: catalogUnitToCalculationUnit(frameProfile.unit),
      profileSystemId: frameProfile.profileSystemId,
      supplierId: frameProfile.supplierId,
      deductionRule: jsonRecordOrNull(frameProfile.deductionRule),
      wasteRule: jsonRecordOrNull(frameProfile.wasteRule),
      requiresBusinessValidation: requiresBusinessValidation(
        frameProfile.deductionRule,
        frameProfile.wasteRule,
        frameProfile.configuration,
      ),
      priceListItem: frameProfilePrice,
      unitPriceMinorPerMeter:
        frameProfilePrice?.unit === CatalogUnit.LINEAR_METER
          ? frameProfilePrice.saleMinor
          : null,
    },
    glassPackage: {
      id: glassPackage.id,
      name: glassPackage.name,
      label: glassPackage.name,
      code: glassPackage.code,
      compositionLabel: glassPackage.compositionLabel,
      unit: glassPackage.unit,
      calculationUnit: catalogUnitToCalculationUnit(glassPackage.unit),
      supplierId: glassPackage.supplierId,
      minBillableAreaSquareMm: glassPackage.minBillableAreaSquareMm,
      minBillableAreaM2: squareMillimetersToSquareMeters(glassPackage.minBillableAreaSquareMm),
      deductionRule: jsonRecordOrNull(glassPackage.deductionRule),
      requiresBusinessValidation: requiresBusinessValidation(
        glassPackage.deductionRule,
        glassPackage.configuration,
      ),
      priceListItem: glassPackagePrice,
      unitPriceMinorPerM2:
        glassPackagePrice?.unit === CatalogUnit.SQUARE_METER
          ? glassPackagePrice.saleMinor
          : null,
    },
    colorFinish: {
      id: colorFinish.id,
      name: colorFinish.name,
      label: colorFinish.name,
      code: colorFinish.code,
      surface: colorFinish.surface,
      profileSystemId: colorFinish.profileSystemId,
      supplierId: colorFinish.supplierId,
      unit: colorFinishPrice?.unit ?? null,
      calculationUnit: colorFinishPrice
        ? catalogUnitToCalculationUnit(colorFinishPrice.unit)
        : null,
      requiresBusinessValidation: requiresBusinessValidation(colorFinish.configuration),
      priceListItem: colorFinishPrice,
    },
    hardwareKit: hardwareKit
      ? {
          id: hardwareKit.id,
          name: hardwareKit.name,
          label: hardwareKit.name,
          code: hardwareKit.code,
          category: hardwareKit.category,
          openingType: hardwareKit.openingType,
          unit: hardwareKit.unit,
          calculationUnit: catalogUnitToCalculationUnit(hardwareKit.unit),
          supplierId: hardwareKit.supplierId,
          quantityRule: jsonRecordOrNull(hardwareKit.quantityRule),
          requiresBusinessValidation: requiresBusinessValidation(
            hardwareKit.quantityRule,
            hardwareKit.configuration,
          ),
          priceListItem: hardwareKitPrice,
        }
      : null,
  };
}

export function selectActiveCatalogPriceList(
  priceLists: readonly PriceList[],
  currency: string,
) {
  return (
    priceLists.find(
      (priceList) =>
        priceList.currency === currency &&
        priceList.status === PriceListStatus.ACTIVE &&
        priceList.isActive &&
        !priceList.deletedAt,
    ) ?? null
  );
}

export function isSelectableCatalogRecord(record: {
  isActive: boolean;
  deletedAt: Date | null;
}) {
  return record.isActive && !record.deletedAt;
}

function priceSnapshotFor(
  priceListItems: readonly PriceListItem[],
  itemType: PriceListItemType,
  catalogItemId: string,
  priceListId?: string | null,
): PriceListItemSnapshot | null {
  const priceListItem = priceListItems.find(
    (candidate) =>
      candidate.itemType === itemType &&
      candidate.catalogItemId === catalogItemId &&
      (!priceListId || candidate.priceListId === priceListId) &&
      isSelectableCatalogRecord(candidate),
  );

  if (!priceListItem) {
    return null;
  }

  return {
    id: priceListItem.id,
    priceListId: priceListItem.priceListId,
    itemType: priceListItem.itemType,
    catalogItemId: priceListItem.catalogItemId,
    sku: priceListItem.sku,
    description: priceListItem.description,
    unit: priceListItem.unit,
    calculationUnit: catalogUnitToCalculationUnit(priceListItem.unit),
    currency: priceListItem.currency,
    saleMinor: minorToNumber(priceListItem.saleMinor),
  };
}

function priceListSnapshot(priceList: PriceList) {
  return {
    id: priceList.id,
    name: priceList.name,
    version: priceList.version,
    currency: priceList.currency,
    status: priceList.status,
    effectiveFrom: priceList.effectiveFrom?.toISOString() ?? null,
    effectiveTo: priceList.effectiveTo?.toISOString() ?? null,
  };
}

function catalogUnitToCalculationUnit(unit: CatalogUnit) {
  switch (unit) {
    case CatalogUnit.EACH:
      return "each";
    case CatalogUnit.LINEAR_METER:
      return "linear-meter";
    case CatalogUnit.SQUARE_METER:
      return "square-meter";
    case CatalogUnit.HOUR:
      return "hour";
    case CatalogUnit.FIXED:
      return "fixed";
  }
}

function squareMillimetersToSquareMeters(value: number | null) {
  return value === null ? null : value / 1_000_000;
}

function minorToNumber(value: bigint | number | null) {
  if (typeof value === "bigint") {
    return Number(value);
  }

  return value;
}

function jsonRecordOrNull(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function requiresBusinessValidation(...values: unknown[]) {
  return values.some((value) => {
    const record = jsonRecordOrNull(value);

    if (!record) {
      return false;
    }

    if (record.requiresBusinessValidation === true) {
      return true;
    }

    const validationStatus =
      typeof record.validationStatus === "string" ? record.validationStatus.toLowerCase() : "";

    return (
      validationStatus.includes("requires business validation") ||
      validationStatus.includes("necesita validare business") ||
      validationStatus.includes("necesită validare business")
    );
  });
}
