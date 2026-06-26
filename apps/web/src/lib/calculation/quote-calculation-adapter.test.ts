import {
  CatalogUnit,
  QuoteItemType,
  QuoteStatus,
  QuoteVersionStatus,
  type Accessory,
  type AuditLog,
  type ColorFinish,
  type CompanySettings,
  type Customer,
  type Document,
  type GlassPackage,
  type HardwareKit,
  type PriceList,
  type PriceListItem,
  type PricingRule,
  type ProfileItem,
  type ProfileSystem,
  type Project,
  type Quote,
  type QuoteCalculationResult,
  type QuoteItem,
  type QuoteNumberSettings,
  type QuoteVersion,
  type SavedFilter,
  type ServiceItem,
  type Supplier,
  type TaxRate,
  type UserPreference,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  recalculateTenantCurrentQuoteVersion,
  type RecalculateQuoteVersionResult,
} from "./quote-calculation-adapter";
import type { TenantDataClient } from "../data";

type TenantRecord = {
  id: string;
  tenantId: string;
};

type TestState = {
  calculationResults: QuoteCalculationResult[];
  client: TenantDataClient;
  quoteItems: QuoteItem[];
  quoteVersions: QuoteVersion[];
};

function delegate<TRecord extends TenantRecord>(records: TRecord[]) {
  let createCount = 0;

  return {
    async findFirst({ where }: { where: Record<string, unknown> }) {
      return records.find((record) => matchesWhere(record, where)) ?? null;
    },
    async findMany({ where }: { where: Record<string, unknown> }) {
      return records.filter((record) => matchesWhere(record, where));
    },
    async create({ data }: { data: Record<string, unknown> }) {
      createCount += 1;
      const record = {
        id: typeof data.id === "string" ? data.id : `created-${createCount}`,
        createdAt: new Date("2026-06-25T00:00:00.000Z"),
        ...data,
      } as unknown as TRecord;

      records.push(record);

      return record;
    },
    async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
      const record = records.find((candidate) => candidate.id === where.id);

      if (!record) {
        throw new Error(`Record ${where.id} was not found.`);
      }

      Object.assign(record, data);

      return record;
    },
    async delete({ where }: { where: { id: string } }) {
      const index = records.findIndex((candidate) => candidate.id === where.id);

      if (index === -1) {
        throw new Error(`Record ${where.id} was not found.`);
      }

      const [record] = records.splice(index, 1);

      return record;
    },
  };
}

function matchesWhere<TRecord extends TenantRecord>(
  record: TRecord,
  where: Record<string, unknown>,
) {
  return Object.entries(where).every(([key, value]) => record[key as keyof TRecord] === value);
}

function testState({
  items = [fixedWindowItem()],
  versionOverrides = {},
}: {
  items?: QuoteItem[];
  versionOverrides?: Partial<QuoteVersion>;
} = {}): TestState {
  const quoteVersions = [
    quoteVersion(versionOverrides),
    quoteVersion({
      id: "version-b",
      tenantId: "tenant-b",
      quoteId: "quote-b",
    }),
  ];
  const quoteItems = items;
  const calculationResults: QuoteCalculationResult[] = [];
  const client: TenantDataClient = {
    accessory: delegate([] as Accessory[]),
    colorFinish: delegate([] as ColorFinish[]),
    customer: delegate([
      customer({ id: "customer-a", tenantId: "tenant-a" }),
      customer({ id: "customer-b", tenantId: "tenant-b" }),
    ]),
    glassPackage: delegate([] as GlassPackage[]),
    hardwareKit: delegate([] as HardwareKit[]),
    priceList: delegate([] as PriceList[]),
    priceListItem: delegate([] as PriceListItem[]),
    pricingRule: delegate([] as PricingRule[]),
    profileItem: delegate([] as ProfileItem[]),
    profileSystem: delegate([] as ProfileSystem[]),
    project: delegate([] as Project[]),
    quote: delegate([
      quote({ id: "quote-a", tenantId: "tenant-a", customerId: "customer-a", currentVersionId: "version-a" }),
      quote({ id: "quote-b", tenantId: "tenant-b", customerId: "customer-b", currentVersionId: "version-b" }),
    ]),
    quoteVersion: delegate(quoteVersions),
    quoteItem: delegate(quoteItems),
    quoteCalculationResult: delegate(calculationResults),
    document: delegate([] as Document[]),
    auditLog: delegate([] as AuditLog[]),
    companySettings: delegate([] as CompanySettings[]),
    quoteNumberSettings: delegate([] as QuoteNumberSettings[]),
    savedFilter: delegate([] as SavedFilter[]),
    serviceItem: delegate([] as ServiceItem[]),
    supplier: delegate([] as Supplier[]),
    taxRate: delegate([] as TaxRate[]),
    userPreference: delegate([] as UserPreference[]),
  };

  client.$transaction = async (operation) => {
    const { $transaction, ...transactionClient } = client;
    void $transaction;

    return operation(transactionClient as TenantDataClient);
  };

  return {
    calculationResults,
    client,
    quoteItems,
    quoteVersions,
  };
}

describe("quote calculation adapter", () => {
  it("recalculates a fixed-window draft item and stores version, item, and result snapshots", async () => {
    const state = testState();
    const result = await recalculateTenantCurrentQuoteVersion(
      { tenantId: "tenant-a" },
      "quote-a",
      { client: state.client },
    );

    expectCalculationOk(result);
    expect(result.quoteVersion).toMatchObject({
      subtotalMinor: 20_200,
      vatMinor: 3_838,
      totalMinor: 24_038,
    });
    expect(state.quoteItems[0]?.totalsSnapshot).toMatchObject({
      subtotalMinor: 20_200,
      vatMinor: 3_838,
      totalMinor: 24_038,
      source: "quote-calculation-adapter",
    });
    expect(state.quoteItems[0]?.calculationSnapshot).toMatchObject({
      source: "quote-calculation-adapter",
      output: {
        glassCuts: [expect.objectContaining({ widthMm: 1_120, heightMm: 1_300 })],
      },
    });
    expect(state.calculationResults).toHaveLength(1);

    const outputSnapshot = asRecord(state.calculationResults[0]?.outputSnapshot);
    const inputSnapshot = asRecord(state.calculationResults[0]?.inputSnapshot);

    expect(state.calculationResults[0]?.inputHash).toMatch(/^[a-f0-9]{64}$/);
    expect(inputSnapshot?.items).toHaveLength(1);
    expect(outputSnapshot?.totals).toMatchObject({
      subtotalAfterDiscountMinor: 20_200,
      vatMinor: 3_838,
      totalWithVatMinor: 24_038,
    });
  });

  it("recalculates a custom manual line from explicit snapshot pricing", async () => {
    const state = testState({ items: [customLineItem()] });
    const result = await recalculateTenantCurrentQuoteVersion(
      { tenantId: "tenant-a" },
      "quote-a",
      { client: state.client },
    );

    expectCalculationOk(result);
    expect(result.quoteVersion).toMatchObject({
      subtotalMinor: 10_000,
      vatMinor: 1_900,
      totalMinor: 11_900,
    });
    expect(state.quoteItems[0]?.totalsSnapshot).toMatchObject({
      subtotalMinor: 10_000,
      totalMinor: 11_900,
    });

    const outputSnapshot = asRecord(state.calculationResults[0]?.outputSnapshot);
    const outputItems = outputSnapshot?.items as Array<Record<string, unknown>>;

    expect(outputItems[0]?.totals).toMatchObject({
      customLineCostMinor: 10_000,
      totalWithVatMinor: 11_900,
    });
  });

  it("recalculates accessory and installation quote lines from explicit catalog snapshots", async () => {
    const state = testState({ items: [accessoryLineItem(), installationLineItem()] });
    const result = await recalculateTenantCurrentQuoteVersion(
      { tenantId: "tenant-a" },
      "quote-a",
      { client: state.client },
    );

    expectCalculationOk(result);
    expect(result.quoteVersion).toMatchObject({
      subtotalMinor: 18_000,
      vatMinor: 3_420,
      totalMinor: 21_420,
    });

    const outputSnapshot = asRecord(state.calculationResults[0]?.outputSnapshot);
    const outputItems = outputSnapshot?.items as Array<Record<string, unknown>>;
    const materialRequirements = outputSnapshot?.materialRequirements as Array<Record<string, unknown>>;

    expect(outputItems.map((item) => item.type)).toEqual([
      "accessory-line",
      "installation-line",
    ]);
    expect(materialRequirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          materialType: "accessory",
          catalogItemId: "accessory-sill",
          quantity: 1.5,
          costMinor: 3_000,
        }),
        expect.objectContaining({
          materialType: "service",
          catalogItemId: "service-installation",
          quantity: 1,
          costMinor: 15_000,
        }),
      ]),
    );
    expect(result.quoteVersion.warningsSnapshot).toEqual([]);
  });

  it("recalculates a door MVP item from explicit panel and hardware snapshots with warnings", async () => {
    const state = testState({ items: [doorItem()] });
    const result = await recalculateTenantCurrentQuoteVersion(
      { tenantId: "tenant-a" },
      "quote-a",
      { client: state.client },
    );

    expectCalculationOk(result);
    expect(result.quoteVersion).toMatchObject({
      subtotalMinor: 34_000,
      vatMinor: 6_460,
      totalMinor: 40_460,
    });
    expect(result.quoteVersion.warningsSnapshot).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "MISSING_DOOR_FORMULA" })]),
    );
    expect(state.quoteItems[0]?.totalsSnapshot).toMatchObject({
      subtotalMinor: 34_000,
      totalMinor: 40_460,
    });

    const outputSnapshot = asRecord(state.calculationResults[0]?.outputSnapshot);
    const outputItems = outputSnapshot?.items as Array<Record<string, unknown>>;
    const materialRequirements = outputSnapshot?.materialRequirements as Array<Record<string, unknown>>;

    expect(outputItems[0]?.type).toBe("door");
    expect(materialRequirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ materialType: "panel", costMinor: 24_000 }),
        expect.objectContaining({ materialType: "hardware", costMinor: 10_000 }),
      ]),
    );
  });

  it("stores manual override and quote discount totals for commercial review", async () => {
    const state = testState({
      items: [
        fixedWindowItem({
          configurationSnapshot: {
            kind: "fixed-window",
            quantity: 1,
            widthMm: 1_200,
            heightMm: 1_400,
            manualOverride: {
              target: "totalWithVat",
              amountMinor: 20_000,
              reason: "Synthetic item final total",
              actorId: "user-a",
              auditReferenceId: "audit-item-override",
            },
          },
        }),
      ],
      versionOverrides: {
        priceSnapshot: {
          commercialRules: {
            markupBasisPoints: 0,
            discountBasisPoints: 0,
            vatBasisPoints: 1_900,
          },
          quoteDiscount: {
            amountMinor: 1_000,
            reason: "Synthetic quote discount",
            actorId: "user-a",
          },
        },
      },
    });
    const result = await recalculateTenantCurrentQuoteVersion(
      { tenantId: "tenant-a" },
      "quote-a",
      { client: state.client },
    );

    expectCalculationOk(result);
    expect(result.quoteVersion).toMatchObject({
      subtotalMinor: 19_200,
      vatMinor: 3_648,
      totalMinor: 18_810,
    });
    expect(state.quoteItems[0]?.totalsSnapshot).toMatchObject({
      totalMinor: 20_000,
      totalBeforeManualOverrideMinor: 24_038,
      manualAdjustmentMinor: -4_038,
    });
    expect(result.quoteVersion.totalsSnapshot).toMatchObject({
      quoteDiscountMinor: 1_000,
      manualAdjustmentMinor: -4_038,
      totalBeforeManualOverrideMinor: 18_810,
    });
    expect(result.quoteVersion.warningsSnapshot).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "QUOTE_DISCOUNT_APPLIED" }),
        expect.objectContaining({ code: "MANUAL_OVERRIDE_APPLIED" }),
      ]),
    );
  });

  it("uses selected catalog price and rule snapshots for fixed-window items", async () => {
    const state = testState({
      items: [
        fixedWindowItem({
          catalogSnapshot: {
            source: "tenant-catalog",
            priceList: {
              id: "price-list-a",
              name: "Lista sintetică",
              version: "2026-test",
              currency: "RON",
            },
            glassPackage: {
              id: "glass-clear-24",
              name: "Synthetic clear 24mm",
              unit: "SQUARE_METER",
              minBillableAreaSquareMm: 1_500_000,
              deductionRule: {
                deductionWidthMm: 80,
                deductionHeightMm: 100,
              },
              priceListItem: {
                id: "price-glass",
                priceListId: "price-list-a",
                unit: "SQUARE_METER",
                saleMinor: 10_000,
              },
            },
            frameProfile: {
              id: "frame-a",
              name: "Synthetic fixed frame",
              unit: "LINEAR_METER",
              priceListItem: {
                id: "price-frame",
                priceListId: "price-list-a",
                unit: "LINEAR_METER",
                saleMinor: 1_000,
              },
            },
            colorFinish: {
              id: "color-white",
              name: "Synthetic white finish",
              unit: "SQUARE_METER",
              priceListItem: {
                id: "price-color",
                priceListId: "price-list-a",
                unit: "SQUARE_METER",
                saleMinor: 0,
              },
            },
          },
        }),
      ],
    });
    const result = await recalculateTenantCurrentQuoteVersion(
      { tenantId: "tenant-a" },
      "quote-a",
      { client: state.client },
    );

    expectCalculationOk(result);
    expect(result.quoteVersion).toMatchObject({
      subtotalMinor: 20_200,
      vatMinor: 3_838,
      totalMinor: 24_038,
    });
    expect(result.quoteVersion.warningsSnapshot).toEqual([]);

    const itemOutput = asRecord(asRecord(state.quoteItems[0]?.calculationSnapshot)?.output);

    expect(itemOutput?.glass).toMatchObject({ widthMm: 1_120, heightMm: 1_300 });
    expect(itemOutput?.totals).toMatchObject({
      glassCostMinor: 15_000,
      profileCostMinor: 5_200,
    });
  });

  it("does not use catalog prices when selected price units are incompatible", async () => {
    const state = testState({
      items: [
        fixedWindowItem({
          catalogSnapshot: {
            glassPackage: {
              id: "glass-clear-24",
              name: "Synthetic clear 24mm",
              minBillableAreaSquareMm: 1_500_000,
              deductionRule: {
                deductionWidthMm: 80,
                deductionHeightMm: 100,
              },
              priceListItem: {
                id: "price-glass",
                unit: "EACH",
                saleMinor: 10_000,
              },
            },
            frameProfile: {
              id: "frame-a",
              name: "Synthetic fixed frame",
              priceListItem: {
                id: "price-frame",
                unit: "EACH",
                saleMinor: 1_000,
              },
            },
          },
        }),
      ],
    });
    const result = await recalculateTenantCurrentQuoteVersion(
      { tenantId: "tenant-a" },
      "quote-a",
      { client: state.client },
    );

    expectCalculationOk(result);
    expect(result.quoteVersion.warningsSnapshot).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MISSING_GLASS_PRICE" }),
        expect.objectContaining({ code: "MISSING_PROFILE_PRICE" }),
      ]),
    );
    expect(result.quoteVersion.subtotalMinor).toBe(0);
  });

  it("stores warnings and incomplete values when fixed-window deduction and prices are missing", async () => {
    const state = testState({
      items: [
        fixedWindowItem({
          catalogSnapshot: {
            glass: {
              id: "glass-missing-rules",
              label: "Synthetic missing glass rules",
              minBillableAreaM2: 1.5,
            },
            frameProfile: {
              id: "frame-missing-price",
              label: "Synthetic frame missing price",
            },
          },
        }),
      ],
    });
    const result = await recalculateTenantCurrentQuoteVersion(
      { tenantId: "tenant-a" },
      "quote-a",
      { client: state.client },
    );

    expectCalculationOk(result);
    expect(result.quoteVersion).toMatchObject({
      subtotalMinor: 0,
      vatMinor: 0,
      totalMinor: 0,
    });
    expect(result.quoteVersion.warningsSnapshot).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MISSING_GLASS_DEDUCTION" }),
        expect.objectContaining({ code: "MISSING_GLASS_PRICE" }),
        expect.objectContaining({ code: "MISSING_PROFILE_PRICE" }),
      ]),
    );

    const itemOutput = asRecord(asRecord(state.quoteItems[0]?.calculationSnapshot)?.output);
    const glassOutput = asRecord(itemOutput?.glass);

    expect(glassOutput).toMatchObject({ widthMm: null, heightMm: null });
  });

  it("rejects recalculation on locked or sent quote versions", async () => {
    const state = testState({
      versionOverrides: {
        status: QuoteVersionStatus.SENT,
        isLocked: true,
        sentAt: new Date("2026-06-25T10:00:00.000Z"),
      },
    });
    const result = await recalculateTenantCurrentQuoteVersion(
      { tenantId: "tenant-a" },
      "quote-a",
      { client: state.client },
    );

    expect(result).toEqual({ ok: false, reason: "locked" });
    expect(state.calculationResults).toHaveLength(0);
    expect(state.quoteVersions[0]?.totalMinor).toBe(0);
  });

  it("rejects cross-tenant recalculation", async () => {
    const state = testState();
    const result = await recalculateTenantCurrentQuoteVersion(
      { tenantId: "tenant-a" },
      "quote-b",
      { client: state.client },
    );

    expect(result).toEqual({ ok: false, reason: "not_found" });
    expect(state.calculationResults).toHaveLength(0);
  });
});

function expectCalculationOk(
  result: RecalculateQuoteVersionResult,
): asserts result is Extract<RecalculateQuoteVersionResult, { ok: true }> {
  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error(`Expected calculation success, received ${result.reason}.`);
  }
}

function customer(overrides: Partial<Customer>) {
  return {
    id: "customer-a",
    tenantId: "tenant-a",
    displayName: "Synthetic Customer",
    contactName: null,
    email: null,
    phone: null,
    ...overrides,
  } as unknown as Customer;
}

function quote(overrides: Partial<Quote>) {
  return {
    id: "quote-a",
    tenantId: "tenant-a",
    customerId: "customer-a",
    projectId: null,
    quoteNumber: "Q-001",
    status: QuoteStatus.DRAFT,
    title: "Synthetic quote",
    currency: "RON",
    currentVersionId: "version-a",
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
    ...overrides,
  } as unknown as Quote;
}

function quoteVersion(overrides: Partial<QuoteVersion> = {}) {
  return {
    id: "version-a",
    tenantId: "tenant-a",
    quoteId: "quote-a",
    versionNumber: 1,
    status: QuoteVersionStatus.DRAFT,
    isLocked: false,
    currency: "RON",
    customerSnapshot: {},
    companySettingsSnapshot: {
      vatRateBasisPoints: 1_900,
    },
    priceSnapshot: {
      commercialRules: {
        markupBasisPoints: 0,
        discountBasisPoints: 0,
        vatBasisPoints: 1_900,
      },
    },
    itemSnapshot: { items: [] },
    totalsSnapshot: { subtotalMinor: 0, vatMinor: 0, totalMinor: 0 },
    warningsSnapshot: [],
    traceSummary: {},
    subtotalMinor: 0,
    vatMinor: 0,
    totalMinor: 0,
    lockedAt: null,
    sentAt: null,
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
    ...overrides,
  } as unknown as QuoteVersion;
}

function fixedWindowItem(overrides: Partial<QuoteItem> = {}) {
  return {
    id: "item-fixed",
    tenantId: "tenant-a",
    quoteVersionId: "version-a",
    type: QuoteItemType.WINDOW,
    sortOrder: 0,
    quantity: 1,
    widthMm: 1_200,
    heightMm: 1_400,
    customerDescription: "Synthetic fixed window",
    internalNotes: null,
    configurationSnapshot: {
      kind: "fixed-window",
      quantity: 1,
      widthMm: 1_200,
      heightMm: 1_400,
    },
    catalogSnapshot: {
      glass: {
        id: "glass-clear-24",
        label: "Synthetic clear 24mm",
        deductionWidthMm: 80,
        deductionHeightMm: 100,
        minBillableAreaM2: 1.5,
        unitPriceMinorPerM2: 10_000,
      },
      frameProfile: {
        id: "frame-a",
        label: "Synthetic fixed frame",
        unitPriceMinorPerMeter: 1_000,
      },
    },
    calculationSnapshot: null,
    totalsSnapshot: { subtotalMinor: 0, vatMinor: 0, totalMinor: 0, pendingCalculation: true },
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
    ...overrides,
  } as unknown as QuoteItem;
}

function customLineItem(overrides: Partial<QuoteItem> = {}) {
  return {
    id: "item-custom",
    tenantId: "tenant-a",
    quoteVersionId: "version-a",
    type: QuoteItemType.CUSTOM,
    sortOrder: 0,
    quantity: 2,
    widthMm: null,
    heightMm: null,
    customerDescription: "Synthetic manual service line",
    internalNotes: null,
    configurationSnapshot: {
      kind: "custom-line",
      quantity: 2,
      manualPricing: {
        unitPriceMinor: 5_000,
        currency: "RON",
        source: "explicit-manual-snapshot",
      },
    },
    catalogSnapshot: {
      manualPricing: {
        unitPriceMinor: 5_000,
        currency: "RON",
        isFormula: false,
      },
    },
    calculationSnapshot: null,
    totalsSnapshot: { subtotalMinor: 0, vatMinor: 0, totalMinor: 0, pendingCalculation: true },
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
    ...overrides,
  } as unknown as QuoteItem;
}

function accessoryLineItem(overrides: Partial<QuoteItem> = {}) {
  return {
    id: "item-accessory",
    tenantId: "tenant-a",
    quoteVersionId: "version-a",
    type: QuoteItemType.CUSTOM,
    sortOrder: 1,
    quantity: 2,
    widthMm: null,
    heightMm: null,
    customerDescription: "Synthetic sill line",
    internalNotes: null,
    configurationSnapshot: {
      kind: "accessory-line",
      quantity: 1.5,
      currency: "RON",
      catalogSelection: {
        accessoryId: "accessory-sill",
      },
      source: "quote-item-draft-editor",
      requiresCalculation: true,
    },
    catalogSnapshot: {
      source: "tenant-catalog",
      snapshotVersion: "cod-029-catalog-line-v1",
      lineKind: "accessory-line",
      line: {
        id: "accessory-sill",
        name: "Synthetic sill",
        label: "Synthetic sill",
        unit: CatalogUnit.LINEAR_METER,
        calculationUnit: "linear-meter",
        priceListItem: {
          id: "price-accessory-sill",
          unit: CatalogUnit.LINEAR_METER,
          calculationUnit: "linear-meter",
          saleMinor: 2_000,
        },
      },
    },
    calculationSnapshot: null,
    totalsSnapshot: { subtotalMinor: 0, vatMinor: 0, totalMinor: 0, pendingCalculation: true },
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
    ...overrides,
  } as unknown as QuoteItem;
}

function installationLineItem(overrides: Partial<QuoteItem> = {}) {
  return {
    id: "item-installation",
    tenantId: "tenant-a",
    quoteVersionId: "version-a",
    type: QuoteItemType.CUSTOM,
    sortOrder: 2,
    quantity: 1,
    widthMm: null,
    heightMm: null,
    customerDescription: "Synthetic installation line",
    internalNotes: null,
    configurationSnapshot: {
      kind: "installation-line",
      quantity: 1,
      currency: "RON",
      catalogSelection: {
        serviceItemId: "service-installation",
      },
      source: "quote-item-draft-editor",
      requiresCalculation: true,
    },
    catalogSnapshot: {
      source: "tenant-catalog",
      snapshotVersion: "cod-029-catalog-line-v1",
      lineKind: "installation-line",
      line: {
        id: "service-installation",
        name: "Synthetic installation",
        label: "Synthetic installation",
        unit: CatalogUnit.FIXED,
        calculationUnit: "fixed",
        priceListItem: {
          id: "price-service-installation",
          unit: CatalogUnit.FIXED,
          calculationUnit: "fixed",
          saleMinor: 15_000,
        },
      },
    },
    calculationSnapshot: null,
    totalsSnapshot: { subtotalMinor: 0, vatMinor: 0, totalMinor: 0, pendingCalculation: true },
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
    ...overrides,
  } as unknown as QuoteItem;
}

function doorItem(overrides: Partial<QuoteItem> = {}) {
  return {
    id: "item-door",
    tenantId: "tenant-a",
    quoteVersionId: "version-a",
    type: QuoteItemType.DOOR,
    sortOrder: 0,
    quantity: 2,
    widthMm: 900,
    heightMm: 2_100,
    customerDescription: "Synthetic entrance door",
    internalNotes: null,
    configurationSnapshot: {
      kind: "door",
      quantity: 2,
      widthMm: 900,
      heightMm: 2_100,
      panel: {
        description: "Synthetic decorative panel",
        manualPricing: {
          unitPriceMinor: 12_000,
          currency: "RON",
          source: "explicit-manual-panel-snapshot",
        },
      },
      hardware: {
        description: "Synthetic handle and lock",
      },
    },
    catalogSnapshot: {
      hardwareKit: {
        id: "hardware-door",
        name: "Synthetic door hardware",
        priceListItem: {
          id: "price-hardware-door",
          unit: "EACH",
          saleMinor: 5_000,
        },
      },
      panel: {
        description: "Synthetic decorative panel",
        manualPricing: {
          unitPriceMinor: 12_000,
          currency: "RON",
          isFormula: false,
        },
      },
    },
    calculationSnapshot: null,
    totalsSnapshot: { subtotalMinor: 0, vatMinor: 0, totalMinor: 0, pendingCalculation: true },
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
    ...overrides,
  } as unknown as QuoteItem;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
