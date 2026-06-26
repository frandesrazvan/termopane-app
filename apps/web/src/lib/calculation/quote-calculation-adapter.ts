import { createHash } from "node:crypto";
import {
  QuoteItemType,
  QuoteVersionStatus,
  type Quote,
  type QuoteCalculationResult as StoredQuoteCalculationResult,
  type QuoteItem,
  type QuoteVersion,
} from "@prisma/client";
import {
  calculateQuote,
  type CatalogLineItemInput,
  type CalculationItemInput,
  type CalculationTraceEntry,
  type CalculationUnit,
  type CommercialRulesSnapshot,
  type CustomManualLineItemInput,
  type DoorElementInput,
  type ExplicitMaterialRequirementInput,
  type FixedWindowElementInput,
  type ManualOverrideInput,
  type QuoteCalculationInput,
  type QuoteCalculationResult,
  type QuoteDiscountInput,
} from "@termopane/calculation";
import {
  createTenantDataAccess,
  type TenantDataClient,
  type TenantDataScope,
} from "../data";
import { prisma } from "../prisma";

const ADAPTER_SOURCE = "quote-calculation-adapter";
const CALCULATOR_VERSION = "cod-029-web-adapter-v1";

type JsonRecord = Record<string, unknown>;

type RecalculateQuoteVersionSuccess = {
  ok: true;
  quote: Quote;
  quoteVersion: QuoteVersion;
  quoteItems: QuoteItem[];
  calculationResult: StoredQuoteCalculationResult;
  inputSnapshot: JsonRecord;
  outputSnapshot: JsonRecord;
};

type RecalculateQuoteVersionFailure = {
  ok: false;
  reason: "not_found" | "locked";
};

export type RecalculateQuoteVersionResult =
  | RecalculateQuoteVersionSuccess
  | RecalculateQuoteVersionFailure;

export type RecalculateQuoteVersionOptions = {
  client?: TenantDataClient;
};

export async function recalculateTenantCurrentQuoteVersion(
  scope: TenantDataScope,
  quoteId: string,
  options: RecalculateQuoteVersionOptions = {},
): Promise<RecalculateQuoteVersionResult> {
  const client = options.client ?? (prisma as unknown as TenantDataClient);

  return runCalculationTransaction(client, async (transactionClient) => {
    const data = createTenantDataAccess(transactionClient);
    const quoteState = await data.getTenantQuoteWithCurrentVersion(scope, quoteId);

    if (!quoteState?.currentVersion) {
      return { ok: false, reason: "not_found" };
    }

    if (!isDraftVersionMutable(quoteState.currentVersion)) {
      return { ok: false, reason: "locked" };
    }

    const quoteItems = await data.listTenantQuoteItems(scope, quoteState.currentVersion.id);
    const calculationInput = buildQuoteCalculationInput(
      quoteState.quote,
      quoteState.currentVersion,
      quoteItems,
    );
    const inputSnapshot = jsonClone(calculationInput) as JsonRecord;
    const frozenInput = deepFreeze(inputSnapshot) as QuoteCalculationInput;
    const calculationOutput = calculateQuote(frozenInput);
    const outputSnapshot = jsonClone(calculationOutput) as JsonRecord;
    const inputHash = hashStableJson(inputSnapshot);
    const calculatedAt = new Date().toISOString();
    const resultRecord = await data.upsertTenantQuoteCalculationResult(
      scope,
      quoteState.currentVersion.id,
      {
        calculatorVersion: CALCULATOR_VERSION,
        inputHash,
        inputSnapshot,
        outputSnapshot,
        warnings: jsonClone(calculationOutput.warnings),
        trace: jsonClone(calculationOutput.trace),
      },
    );

    if (!resultRecord) {
      return { ok: false, reason: "locked" };
    }

    const updatedVersion = await data.updateTenantQuoteVersionCalculation(
      scope,
      quoteState.currentVersion.id,
      {
        subtotalMinor: calculationOutput.totals.subtotalAfterDiscountMinor,
        vatMinor: calculationOutput.totals.vatMinor,
        totalMinor: calculationOutput.totals.totalWithVatMinor,
        totalsSnapshot: quoteTotalsSnapshot(calculationOutput, calculatedAt),
        warningsSnapshot: jsonClone(calculationOutput.warnings),
        traceSummary: traceSummary(calculationOutput, calculatedAt),
        itemSnapshot: {
          source: ADAPTER_SOURCE,
          calculatorVersion: CALCULATOR_VERSION,
          calculatedAt,
          items: inputSnapshot.items,
        },
      },
    );

    if (!updatedVersion) {
      return { ok: false, reason: "locked" };
    }

    const resultByItemId = new Map(
      calculationOutput.items.map((itemResult) => [itemResult.elementId, itemResult]),
    );
    const updatedItems: QuoteItem[] = [];

    for (const item of quoteItems) {
      const itemResult = resultByItemId.get(item.id);
      const inputItem = calculationInput.items?.find(
        (candidate) => candidate.elementId === item.id,
      );

      if (!itemResult || !inputItem) {
        continue;
      }

      const updatedItem = await data.updateTenantQuoteItemCalculation(scope, item.id, {
        calculationSnapshot: {
          source: ADAPTER_SOURCE,
          calculatorVersion: CALCULATOR_VERSION,
          calculatedAt,
          input: jsonClone(inputItem),
          output: jsonClone(itemResult),
        },
        totalsSnapshot: itemTotalsSnapshot(itemResult, calculatedAt),
      });

      if (!updatedItem) {
        return { ok: false, reason: "locked" };
      }

      updatedItems.push(updatedItem);
    }

    return {
      ok: true,
      quote: quoteState.quote,
      quoteVersion: updatedVersion,
      quoteItems: updatedItems,
      calculationResult: resultRecord,
      inputSnapshot,
      outputSnapshot,
    };
  });
}

export function buildQuoteCalculationInput(
  quote: Quote,
  quoteVersion: QuoteVersion,
  quoteItems: QuoteItem[],
): QuoteCalculationInput & JsonRecord {
  const commercialRules = commercialRulesFromVersion(quoteVersion);
  const priceSnapshot = toNullableJsonRecord(quoteVersion.priceSnapshot);

  return {
    source: ADAPTER_SOURCE,
    calculatorVersion: CALCULATOR_VERSION,
    quoteId: quote.id,
    quoteVersionId: quoteVersion.id,
    currency: quoteVersion.currency,
    companySettingsSnapshot: toJsonRecord(quoteVersion.companySettingsSnapshot),
    priceListSnapshot: priceSnapshot ?? undefined,
    commercialRules,
    quoteDiscount: quoteDiscountFromSnapshot(priceSnapshot),
    manualOverride: manualOverrideFromSnapshot(priceSnapshot?.manualOverride),
    items: quoteItems.map((item) => calculationItemFromQuoteItem(item, commercialRules)),
  };
}

function calculationItemFromQuoteItem(
  item: QuoteItem,
  quoteRules: CommercialRulesSnapshot,
): CalculationItemInput {
  const configuration = toJsonRecord(item.configurationSnapshot);
  const itemKind = stringFrom(configuration.kind);

  if (item.type === QuoteItemType.WINDOW || itemKind === "fixed-window") {
    return fixedWindowInput(item, configuration, quoteRules);
  }

  if (isCatalogLineKind(itemKind)) {
    return catalogLineInput(item, configuration, itemKind, quoteRules);
  }

  if (item.type === QuoteItemType.CUSTOM || itemKind === "custom-line") {
    return customLineInput(item, configuration, quoteRules);
  }

  if (item.type === QuoteItemType.DOOR || itemKind === "door") {
    return doorInput(item, configuration, quoteRules);
  }

  return {
    elementId: item.id,
    type: itemKind ?? item.type,
    quantity: numberFrom(item.quantity) ?? 0,
    commercialRules: quoteRules,
  };
}

function fixedWindowInput(
  item: QuoteItem,
  configuration: JsonRecord,
  quoteRules: CommercialRulesSnapshot,
): FixedWindowElementInput {
  const catalog = toNullableJsonRecord(item.catalogSnapshot);
  const glass = firstRecord(
    catalog?.glass,
    catalog?.glassSnapshot,
    catalog?.glassPackage,
    configuration.glass,
    configuration.glassSnapshot,
    configuration.glassPackage,
  );
  const frameProfile = firstRecord(
    catalog?.frameProfile,
    catalog?.profile,
    catalog?.profileSnapshot,
    configuration.frameProfile,
    configuration.profile,
    configuration.profileSnapshot,
  );
  const glassDeductionRule = firstRecord(glass?.deductionRule);
  const glassPrice = firstRecord(glass?.priceListItem, glass?.price);
  const frameProfilePrice = firstRecord(frameProfile?.priceListItem, frameProfile?.price);

  return {
    elementId: item.id,
    type: "fixed-window",
    quantity: numberFrom(item.quantity, configuration.quantity) ?? 0,
    dimensions: {
      widthMm: numberFrom(item.widthMm, configuration.widthMm) ?? 0,
      heightMm: numberFrom(item.heightMm, configuration.heightMm) ?? 0,
    },
    glass: {
      id: stringFrom(glass?.id, glass?.catalogItemId) ?? `missing-glass-${item.id}`,
      label: stringFrom(glass?.label, glass?.name) ?? "Missing glass snapshot",
      deductionWidthMm: numberFrom(
        glass?.deductionWidthMm,
        glass?.glassDeductionWidthMm,
        glassDeductionRule?.deductionWidthMm,
        glassDeductionRule?.glassDeductionWidthMm,
      ),
      deductionHeightMm: numberFrom(
        glass?.deductionHeightMm,
        glass?.glassDeductionHeightMm,
        glassDeductionRule?.deductionHeightMm,
        glassDeductionRule?.glassDeductionHeightMm,
      ),
      minBillableAreaM2:
        numberFrom(glass?.minBillableAreaM2, glass?.minimumBillableAreaM2) ??
        squareMillimetersToSquareMeters(numberFrom(glass?.minBillableAreaSquareMm)) ??
        0,
      unitPriceMinorPerM2: numberFrom(
        glass?.unitPriceMinorPerM2,
        glass?.unitPriceMinor,
        unitPriceMinorFromSnapshot(glassPrice, "SQUARE_METER", "square-meter"),
      ),
    },
    frameProfile: {
      id: stringFrom(frameProfile?.id, frameProfile?.catalogItemId) ?? `missing-profile-${item.id}`,
      label: stringFrom(frameProfile?.label, frameProfile?.name) ?? "Missing frame profile snapshot",
      unitPriceMinorPerMeter: numberFrom(
        frameProfile?.unitPriceMinorPerMeter,
        frameProfile?.unitPriceMinor,
        unitPriceMinorFromSnapshot(frameProfilePrice, "LINEAR_METER", "linear-meter"),
      ),
    },
    commercialRules: commercialRulesFromSnapshot(configuration.commercialRules) ?? quoteRules,
    manualOverride: manualOverrideFromSnapshot(configuration.manualOverride),
    explicitMaterialRequirements: explicitMaterialRequirementsFromSnapshot(
      configuration.explicitMaterialRequirements ?? catalog?.explicitMaterialRequirements,
    ),
  };
}

function doorInput(
  item: QuoteItem,
  configuration: JsonRecord,
  quoteRules: CommercialRulesSnapshot,
): DoorElementInput {
  const catalog = toNullableJsonRecord(item.catalogSnapshot);
  const panel = firstRecord(configuration.panel, catalog?.panel);
  const glass = firstRecord(
    catalog?.glass,
    catalog?.glassSnapshot,
    catalog?.glassPackage,
    configuration.glass,
    configuration.glassSnapshot,
    configuration.glassPackage,
  );
  const hardware = firstRecord(
    catalog?.hardware,
    catalog?.hardwareKit,
    catalog?.hardwareSnapshot,
    configuration.hardware,
    configuration.hardwareKit,
  );
  const explicitMaterials = [
    ...(explicitMaterialRequirementsFromSnapshot(
      configuration.explicitMaterialRequirements ?? catalog?.explicitMaterialRequirements,
    ) ?? []),
    ...doorExplicitMaterialRequirements(item, configuration, catalog),
  ];

  return {
    elementId: item.id,
    type: "door",
    quantity: numberFrom(item.quantity, configuration.quantity) ?? 0,
    dimensions: {
      widthMm: numberFrom(item.widthMm, configuration.widthMm) ?? 0,
      heightMm: numberFrom(item.heightMm, configuration.heightMm) ?? 0,
    },
    description:
      item.customerDescription ??
      stringFrom(configuration.description, configuration.customerDescription),
    panelDescription: stringFrom(panel?.description, configuration.panelDescription),
    glassLabel: stringFrom(glass?.label, glass?.name, glass?.compositionLabel),
    hardwareLabel: stringFrom(
      hardware?.label,
      hardware?.name,
      hardware?.category,
      firstRecord(configuration.hardware)?.description,
    ),
    commercialRules: commercialRulesFromSnapshot(configuration.commercialRules) ?? quoteRules,
    manualOverride: manualOverrideFromSnapshot(configuration.manualOverride),
    explicitMaterialRequirements:
      explicitMaterials.length > 0 ? Object.freeze(explicitMaterials) : undefined,
  };
}

function customLineInput(
  item: QuoteItem,
  configuration: JsonRecord,
  quoteRules: CommercialRulesSnapshot,
): CustomManualLineItemInput {
  const catalog = toNullableJsonRecord(item.catalogSnapshot);
  const manualPricing = firstRecord(configuration.manualPricing, catalog?.manualPricing);

  return {
    elementId: item.id,
    type: "custom-line",
    quantity: numberFrom(item.quantity, configuration.quantity) ?? 0,
    description:
      item.customerDescription ??
      stringFrom(configuration.description, configuration.customerDescription) ??
      "Custom manual line",
    unit: calculationUnitFromSnapshot(configuration.unit) ?? "each",
    unitPriceMinor: numberFrom(manualPricing?.unitPriceMinor, configuration.unitPriceMinor),
    commercialRules: commercialRulesFromSnapshot(configuration.commercialRules) ?? quoteRules,
    manualOverride: manualOverrideFromSnapshot(configuration.manualOverride),
    explicitMaterialRequirements: explicitMaterialRequirementsFromSnapshot(
      configuration.explicitMaterialRequirements ?? catalog?.explicitMaterialRequirements,
    ),
  };
}

function catalogLineInput(
  item: QuoteItem,
  configuration: JsonRecord,
  lineKind: CatalogLineItemInput["type"],
  quoteRules: CommercialRulesSnapshot,
): CatalogLineItemInput {
  const catalog = toNullableJsonRecord(item.catalogSnapshot);
  const line = firstRecord(
    catalog?.line,
    catalog?.accessory,
    catalog?.serviceItem,
    configuration.catalogLine,
  );
  const price = firstRecord(line?.priceListItem, line?.price);
  const unit =
    calculationUnitFromSnapshot(
      line?.calculationUnit,
      price?.calculationUnit,
      line?.unit,
      price?.unit,
      configuration.unit,
    ) ?? "each";

  return {
    elementId: item.id,
    type: lineKind,
    quantity: numberFrom(configuration.quantity, item.quantity) ?? 0,
    description:
      item.customerDescription ??
      stringFrom(configuration.customerDescription, configuration.description) ??
      stringFrom(line?.label, line?.name) ??
      "Linie catalog",
    catalogItemId:
      stringFrom(line?.id, line?.catalogItemId) ?? `missing-${lineKind}-${item.id}`,
    catalogItemLabel:
      stringFrom(line?.label, line?.name) ??
      item.customerDescription ??
      "Linie catalog",
    unit,
    unitPriceMinor: unitPriceMinorFromCatalogLine(line, price, unit),
    commercialRules: commercialRulesFromSnapshot(configuration.commercialRules) ?? quoteRules,
    manualOverride: manualOverrideFromSnapshot(configuration.manualOverride),
  };
}

function commercialRulesFromVersion(quoteVersion: QuoteVersion): CommercialRulesSnapshot {
  const companySettings = toJsonRecord(quoteVersion.companySettingsSnapshot);
  const priceSnapshot = toNullableJsonRecord(quoteVersion.priceSnapshot);
  const snapshotRules = firstRecord(
    priceSnapshot?.commercialRules,
    priceSnapshot?.commercialRuleSnapshot,
    companySettings.commercialRules,
  );

  return {
    markupBasisPoints: numberFrom(snapshotRules?.markupBasisPoints, companySettings.markupBasisPoints) ?? 0,
    discountBasisPoints:
      numberFrom(snapshotRules?.discountBasisPoints, companySettings.discountBasisPoints) ?? 0,
    vatBasisPoints:
      numberFrom(
        snapshotRules?.vatBasisPoints,
        snapshotRules?.vatRateBasisPoints,
        companySettings.vatBasisPoints,
        companySettings.vatRateBasisPoints,
      ) ?? 0,
  };
}

function commercialRulesFromSnapshot(value: unknown): CommercialRulesSnapshot | undefined {
  const record = toNullableJsonRecord(value);

  if (!record) {
    return undefined;
  }

  return {
    markupBasisPoints: numberFrom(record.markupBasisPoints) ?? 0,
    discountBasisPoints: numberFrom(record.discountBasisPoints) ?? 0,
    vatBasisPoints: numberFrom(record.vatBasisPoints, record.vatRateBasisPoints) ?? 0,
  };
}

function quoteDiscountFromSnapshot(snapshot: JsonRecord | null): QuoteDiscountInput | undefined {
  const discount = firstRecord(snapshot?.quoteDiscount, snapshot?.discount);

  if (!discount) {
    return undefined;
  }

  const amountMinor = numberFrom(discount.amountMinor);
  const basisPoints = numberFrom(discount.basisPoints);

  if (amountMinor === undefined && basisPoints === undefined) {
    return undefined;
  }

  return {
    amountMinor,
    basisPoints,
    reason: stringFrom(discount.reason),
    actorId: stringFrom(discount.actorId),
    timestamp: stringFrom(discount.timestamp),
  };
}

function manualOverrideFromSnapshot(value: unknown): ManualOverrideInput | undefined {
  const record = toNullableJsonRecord(value);
  const amountMinor = numberFrom(record?.amountMinor);
  const target = stringFrom(record?.target);

  if (
    !record ||
    amountMinor === undefined ||
    (target !== "totalWithVat" && target !== "quoteTotalWithVat")
  ) {
    return undefined;
  }

  return {
    target,
    amountMinor,
    reason: stringFrom(record.reason),
    actorId: stringFrom(record.actorId),
    timestamp: stringFrom(record.timestamp),
    auditReferenceId: stringFrom(record.auditReferenceId),
  };
}

function doorExplicitMaterialRequirements(
  item: QuoteItem,
  configuration: JsonRecord,
  catalog: JsonRecord | null,
): ExplicitMaterialRequirementInput[] {
  const quantity = numberFrom(item.quantity, configuration.quantity) ?? 0;
  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  const panel = firstRecord(configuration.panel, catalog?.panel);
  const panelPricing = firstRecord(panel?.manualPricing, configuration.manualPanelPricing);
  const panelPriceMinor = numberFrom(panelPricing?.unitPriceMinor);
  const panelDescription = stringFrom(panel?.description, configuration.panelDescription);
  const hardware = firstRecord(
    catalog?.hardware,
    catalog?.hardwareKit,
    catalog?.hardwareSnapshot,
    configuration.hardware,
    configuration.hardwareKit,
  );
  const hardwarePrice = firstRecord(hardware?.priceListItem, hardware?.price);
  const hardwareUnit = calculationUnitFromSnapshot(hardwarePrice?.calculationUnit, hardwarePrice?.unit);
  const hardwarePriceMinor =
    hardwareUnit === "each" || hardwareUnit === "fixed"
      ? numberFrom(hardwarePrice?.saleMinor, hardwarePrice?.unitPriceMinor)
      : undefined;
  const requirements: ExplicitMaterialRequirementInput[] = [];

  if (panelPriceMinor !== undefined) {
    requirements.push({
      materialType: "panel",
      catalogItemId: `manual-panel-${item.id}`,
      label: panelDescription ?? "Panou ușă manual",
      unit: "each",
      quantity: safeQuantity,
      unitPriceMinor: panelPriceMinor,
      sourceRule: "manual-panel-price-snapshot",
    });
  }

  if (
    hardware &&
    hardwarePriceMinor !== undefined &&
    (hardwareUnit === "each" || hardwareUnit === "fixed")
  ) {
    requirements.push({
      materialType: "hardware",
      catalogItemId: stringFrom(hardware.id, hardware.catalogItemId) ?? `hardware-${item.id}`,
      label: stringFrom(hardware.label, hardware.name, hardware.category) ?? "Feronerie ușă",
      unit: hardwareUnit,
      quantity: safeQuantity,
      unitPriceMinor: hardwarePriceMinor,
      sourceRule: "explicit-door-hardware-snapshot",
    });
  }

  return requirements;
}

function explicitMaterialRequirementsFromSnapshot(
  value: unknown,
): ExplicitMaterialRequirementInput[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const requirements = value.flatMap((entry) => {
    const record = toNullableJsonRecord(entry);
    const materialType = stringFrom(record?.materialType);
    const unit = calculationUnitFromSnapshot(record?.unit);
    const quantity = numberFrom(record?.quantity);
    const catalogItemId = stringFrom(record?.catalogItemId, record?.id);
    const label = stringFrom(record?.label, record?.name);

    if (
      !record ||
      !isExplicitMaterialType(materialType) ||
      !unit ||
      quantity === undefined ||
      !catalogItemId ||
      !label
    ) {
      return [];
    }

    return [
      {
        materialType,
        catalogItemId,
        label,
        unit,
        quantity,
        unitPriceMinor: numberFrom(record.unitPriceMinor),
        sourceRule: stringFrom(record.sourceRule),
      },
    ];
  });

  return requirements.length > 0 ? requirements : undefined;
}

function quoteTotalsSnapshot(result: QuoteCalculationResult, calculatedAt: string) {
  return {
    source: ADAPTER_SOURCE,
    calculatorVersion: CALCULATOR_VERSION,
    calculatedAt,
    subtotalMinor: result.totals.subtotalAfterDiscountMinor,
    vatMinor: result.totals.vatMinor,
    totalMinor: result.totals.totalWithVatMinor,
    totalBeforeManualOverrideMinor: result.totals.totalBeforeManualOverrideMinor,
    materialCostMinor: result.totals.materialCostMinor,
    markupMinor: result.totals.markupMinor,
    discountMinor: result.totals.discountMinor,
    quoteDiscountMinor: result.totals.quoteDiscountMinor,
    manualAdjustmentMinor: result.totals.manualAdjustmentMinor,
    itemCount: result.items.length,
    warningCount: result.warnings.length,
  };
}

function itemTotalsSnapshot(
  itemResult: QuoteCalculationResult["items"][number],
  calculatedAt: string,
) {
  return {
    source: ADAPTER_SOURCE,
    calculatorVersion: CALCULATOR_VERSION,
    calculatedAt,
    subtotalMinor: itemResult.totals.subtotalAfterDiscountMinor,
    vatMinor: itemResult.totals.vatMinor,
    totalMinor: itemResult.totals.totalWithVatMinor,
    totalBeforeManualOverrideMinor: itemResult.totals.totalBeforeManualOverrideMinor,
    materialCostMinor: itemResult.totals.materialCostMinor,
    markupMinor: itemResult.totals.markupMinor,
    discountMinor: itemResult.totals.discountMinor,
    manualAdjustmentMinor: itemResult.totals.manualAdjustmentMinor,
    warningCount: itemResult.warnings.length,
  };
}

function traceSummary(result: QuoteCalculationResult, calculatedAt: string) {
  return {
    source: ADAPTER_SOURCE,
    calculatorVersion: CALCULATOR_VERSION,
    calculatedAt,
    traceEntryCount: result.trace.length,
    warningCount: result.warnings.length,
    materialRequirementsCount: result.materialRequirements.length,
    glassCutsCount: result.glassCuts.length,
    profileLinearMetersCount: result.profileLinearMeters.length,
    traceSteps: traceStepCounts(result.trace),
    internalCostTraceStored: true,
  };
}

function traceStepCounts(trace: readonly CalculationTraceEntry[]) {
  return trace.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.step] = (counts[entry.step] ?? 0) + 1;

    return counts;
  }, {});
}

function isDraftVersionMutable(quoteVersion: QuoteVersion) {
  return (
    quoteVersion.status === QuoteVersionStatus.DRAFT &&
    !quoteVersion.isLocked &&
    !quoteVersion.lockedAt &&
    !quoteVersion.sentAt
  );
}

function runCalculationTransaction<TResult>(
  client: TenantDataClient,
  operation: (transactionClient: TenantDataClient) => Promise<TResult>,
) {
  if (client.$transaction) {
    return client.$transaction(operation);
  }

  return operation(client);
}

function firstRecord(...values: unknown[]) {
  for (const value of values) {
    const record = toNullableJsonRecord(value);

    if (record) {
      return record;
    }
  }

  return null;
}

function toJsonRecord(value: unknown): JsonRecord {
  return toNullableJsonRecord(value) ?? {};
}

function toNullableJsonRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function stringFrom(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function numberFrom(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "bigint") {
      return Number(value);
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function squareMillimetersToSquareMeters(value: number | undefined) {
  return value === undefined ? undefined : value / 1_000_000;
}

function unitPriceMinorFromSnapshot(
  priceSnapshot: JsonRecord | null,
  expectedCatalogUnit: string,
  expectedCalculationUnit: string,
) {
  const unit = stringFrom(priceSnapshot?.unit, priceSnapshot?.calculationUnit);

  if (unit && unit !== expectedCatalogUnit && unit !== expectedCalculationUnit) {
    return undefined;
  }

  return numberFrom(priceSnapshot?.saleMinor, priceSnapshot?.unitPriceMinor);
}

function unitPriceMinorFromCatalogLine(
  lineSnapshot: JsonRecord | null,
  priceSnapshot: JsonRecord | null,
  expectedCalculationUnit: CalculationUnit,
) {
  const priceUnit = calculationUnitFromSnapshot(priceSnapshot?.calculationUnit, priceSnapshot?.unit);

  if (priceUnit && priceUnit !== expectedCalculationUnit) {
    return undefined;
  }

  const lineUnit = calculationUnitFromSnapshot(lineSnapshot?.calculationUnit, lineSnapshot?.unit);

  if (lineUnit && lineUnit !== expectedCalculationUnit) {
    return undefined;
  }

  return numberFrom(
    lineSnapshot?.unitPriceMinor,
    priceSnapshot?.saleMinor,
    priceSnapshot?.unitPriceMinor,
  );
}

function calculationUnitFromSnapshot(...values: unknown[]): CalculationUnit | undefined {
  const unit = stringFrom(...values);
  const normalized =
    unit === "EACH"
      ? "each"
      : unit === "LINEAR_METER"
        ? "linear-meter"
        : unit === "SQUARE_METER"
          ? "square-meter"
          : unit === "HOUR"
            ? "hour"
            : unit === "FIXED"
              ? "fixed"
              : unit;

  return normalized === "each" ||
    normalized === "linear-meter" ||
    normalized === "square-meter" ||
    normalized === "hour" ||
    normalized === "fixed"
    ? normalized
    : undefined;
}

function isCatalogLineKind(value: string | undefined): value is CatalogLineItemInput["type"] {
  return (
    value === "accessory-line" ||
    value === "service-line" ||
    value === "transport-line" ||
    value === "installation-line"
  );
}

function isExplicitMaterialType(
  value: string | undefined,
): value is ExplicitMaterialRequirementInput["materialType"] {
  return (
    value === "hardware" ||
    value === "panel" ||
    value === "reinforcement" ||
    value === "labor" ||
    value === "accessory" ||
    value === "service"
  );
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object") {
    return value;
  }

  Object.freeze(value);

  for (const child of Object.values(value)) {
    deepFreeze(child);
  }

  return value;
}

function jsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function hashStableJson(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  if (!value || typeof value !== "object") {
    return typeof value === "bigint" ? value.toString() : value;
  }

  return Object.fromEntries(
    Object.entries(value as JsonRecord)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => [key, sortJson(entryValue)]),
  );
}
