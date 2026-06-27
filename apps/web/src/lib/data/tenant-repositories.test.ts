import {
  Accessory,
  AuditAction,
  CatalogMaterialType,
  CatalogUnit,
  ColorFinish,
  GlassPackage,
  HardwareKit,
  PriceList,
  PriceListItem,
  PriceListItemType,
  PriceListStatus,
  PricingRule,
  PricingRuleType,
  ProfileItem,
  ProfileItemType,
  ProfileSystem,
  type AuditLog,
  QuoteItemType,
  QuoteNumberDatePattern,
  QuoteStatus,
  QuoteVersionStatus,
  ServiceItem,
  Supplier,
  TaxRate,
  type CompanySettings,
  type Customer,
  type Document,
  type Project,
  type Quote,
  type QuoteCalculationResult,
  type QuoteDelivery,
  type QuoteItem,
  type QuoteNumberSettings,
  type QuoteVersion,
  type SavedFilter,
  type TenantAsset,
  type UserPreference,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  createTenantDataAccess,
  QuoteNumberCollisionError,
  tenantIdFromScope,
  type TenantDataClient,
} from "./tenant-repositories";

type TenantRecord = {
  id: string;
  tenantId: string;
};

type UniqueConstraint<TRecord> = Array<Extract<keyof TRecord, string>>;

function delegate<TRecord extends TenantRecord>(
  records: TRecord[],
  options: { unique?: Array<UniqueConstraint<TRecord>> } = {},
) {
  let createCount = 0;

  return {
    async findFirst({ where }: { where: Record<string, unknown> }) {
      return records.find((record) => matchesWhere(record, where)) ?? null;
    },
    async findMany({ where }: { where: Record<string, unknown> }) {
      return records.filter((record) => matchesWhere(record, where));
    },
    async create({ data }: { data: Record<string, unknown> }) {
      const duplicateConstraint = options.unique?.find((constraint) =>
        records.some((record) =>
          constraint.every((field) => record[field] === data[field]),
        ),
      );

      if (duplicateConstraint) {
        throw uniqueConstraintError(duplicateConstraint);
      }

      createCount += 1;
      const record = {
        id: data.id ?? `created-${createCount}`,
        ...data,
      } as TRecord;

      records.push(record);

      return record;
    },
    async update({
      where,
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) {
      const record = records.find((candidate) => candidate.id === where.id);

      if (!record) {
        throw new Error(`Record ${where.id} was not found.`);
      }

      Object.assign(record, data);

      return record;
    },
    async delete({ where }: { where: { id: string } }) {
      const recordIndex = records.findIndex(
        (candidate) => candidate.id === where.id,
      );

      if (recordIndex === -1) {
        throw new Error(`Record ${where.id} was not found.`);
      }

      const [record] = records.splice(recordIndex, 1);

      return record;
    },
  };
}

function uniqueConstraintError(target: string[]) {
  return Object.assign(
    new Error(`Unique constraint failed on ${target.join(", ")}`),
    {
      code: "P2002",
      meta: { target },
    },
  );
}

function matchesWhere<TRecord extends TenantRecord>(
  record: TRecord,
  where: Record<string, unknown>,
): boolean {
  return Object.entries(where).every(([key, value]): boolean => {
    if (key === "OR" && Array.isArray(value)) {
      return value.some((clause): boolean =>
        matchesWhere(record, clause as Record<string, unknown>),
      );
    }

    const recordValue = record[key as keyof TRecord];

    if (isContainsFilter(value)) {
      return String(recordValue ?? "")
        .toLowerCase()
        .includes(String(value.contains).toLowerCase());
    }

    if (isRangeFilter(value)) {
      const comparableValue =
        recordValue instanceof Date
          ? recordValue.getTime()
          : Number(recordValue);
      const gte = value.gte instanceof Date ? value.gte.getTime() : value.gte;
      const lte = value.lte instanceof Date ? value.lte.getTime() : value.lte;

      return (
        (gte === undefined || comparableValue >= Number(gte)) &&
        (lte === undefined || comparableValue <= Number(lte))
      );
    }

    return recordValue === value;
  });
}

function isContainsFilter(value: unknown): value is { contains: string } {
  return Boolean(value && typeof value === "object" && "contains" in value);
}

function isRangeFilter(
  value: unknown,
): value is { gte?: Date | number; lte?: Date | number } {
  return Boolean(
    value &&
    typeof value === "object" &&
    ("gte" in value || "lte" in value) &&
    !("contains" in value),
  );
}

function testClient(
  options: { auditLogs?: AuditLog[]; onTransaction?: () => void } = {},
): TenantDataClient {
  const client: TenantDataClient = {
    supplier: delegate([
      {
        id: "supplier-a",
        tenantId: "tenant-a",
        name: "Supplier A",
        code: "SUP-A",
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "supplier-b",
        tenantId: "tenant-b",
        name: "Supplier B",
        code: "SUP-B",
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as unknown as Supplier[]),
    profileSystem: delegate([
      {
        id: "profile-system-a",
        tenantId: "tenant-a",
        supplierId: "supplier-a",
        name: "PVC A",
        code: "PVC-A",
        materialType: CatalogMaterialType.PVC,
        configuration: { validationStatus: "requires business validation" },
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "profile-system-b",
        tenantId: "tenant-b",
        supplierId: "supplier-b",
        name: "PVC B",
        code: "PVC-B",
        materialType: CatalogMaterialType.PVC,
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as unknown as ProfileSystem[]),
    profileItem: delegate([
      {
        id: "profile-item-a",
        tenantId: "tenant-a",
        profileSystemId: "profile-system-a",
        supplierId: "supplier-a",
        name: "Frame A",
        code: "FRAME-A",
        type: ProfileItemType.FRAME,
        unit: CatalogUnit.LINEAR_METER,
        deductionRule: { validationStatus: "requires business validation" },
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "profile-item-b",
        tenantId: "tenant-b",
        profileSystemId: "profile-system-b",
        supplierId: "supplier-b",
        name: "Frame B",
        code: "FRAME-B",
        type: ProfileItemType.FRAME,
        unit: CatalogUnit.LINEAR_METER,
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as unknown as ProfileItem[]),
    glassPackage: delegate([
      {
        id: "glass-a",
        tenantId: "tenant-a",
        supplierId: "supplier-a",
        name: "Glass A",
        code: "GL-A",
        unit: CatalogUnit.SQUARE_METER,
        deductionRule: { validationStatus: "requires business validation" },
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "glass-b",
        tenantId: "tenant-b",
        supplierId: "supplier-b",
        name: "Glass B",
        code: "GL-B",
        unit: CatalogUnit.SQUARE_METER,
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as unknown as GlassPackage[]),
    hardwareKit: delegate([
      {
        id: "hardware-a",
        tenantId: "tenant-a",
        supplierId: "supplier-a",
        name: "Hardware A",
        code: "HW-A",
        unit: CatalogUnit.EACH,
        quantityRule: { validationStatus: "requires business validation" },
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "hardware-b",
        tenantId: "tenant-b",
        supplierId: "supplier-b",
        name: "Hardware B",
        code: "HW-B",
        unit: CatalogUnit.EACH,
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as unknown as HardwareKit[]),
    colorFinish: delegate([
      {
        id: "color-a",
        tenantId: "tenant-a",
        profileSystemId: "profile-system-a",
        supplierId: "supplier-a",
        name: "White A",
        code: "WHITE-A",
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "color-b",
        tenantId: "tenant-b",
        profileSystemId: "profile-system-b",
        supplierId: "supplier-b",
        name: "White B",
        code: "WHITE-B",
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as unknown as ColorFinish[]),
    accessory: delegate([
      {
        id: "accessory-a",
        tenantId: "tenant-a",
        supplierId: "supplier-a",
        name: "Sill A",
        code: "SILL-A",
        unit: CatalogUnit.LINEAR_METER,
        quantityRule: { validationStatus: "requires business validation" },
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "accessory-b",
        tenantId: "tenant-b",
        supplierId: "supplier-b",
        name: "Sill B",
        code: "SILL-B",
        unit: CatalogUnit.LINEAR_METER,
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as unknown as Accessory[]),
    serviceItem: delegate([
      {
        id: "service-a",
        tenantId: "tenant-a",
        name: "Installation A",
        code: "INSTALL-A",
        unit: CatalogUnit.FIXED,
        configuration: { validationStatus: "requires business validation" },
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "service-b",
        tenantId: "tenant-b",
        name: "Installation B",
        code: "INSTALL-B",
        unit: CatalogUnit.FIXED,
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as unknown as ServiceItem[]),
    taxRate: delegate([
      {
        id: "tax-a",
        tenantId: "tenant-a",
        name: "VAT A",
        code: "VAT-A",
        rateBasisPoints: 1900,
        isDefault: true,
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "tax-b",
        tenantId: "tenant-b",
        name: "VAT B",
        code: "VAT-B",
        rateBasisPoints: 1900,
        isDefault: true,
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as unknown as TaxRate[]),
    priceList: delegate([
      {
        id: "price-list-a",
        tenantId: "tenant-a",
        name: "List A",
        version: "2026-a",
        currency: "RON",
        status: PriceListStatus.ACTIVE,
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "price-list-b",
        tenantId: "tenant-b",
        name: "List B",
        version: "2026-b",
        currency: "RON",
        status: PriceListStatus.ACTIVE,
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as unknown as PriceList[]),
    priceListItem: delegate([
      {
        id: "price-item-a",
        tenantId: "tenant-a",
        priceListId: "price-list-a",
        itemType: PriceListItemType.ACCESSORY,
        catalogItemId: "accessory-a",
        unit: CatalogUnit.LINEAR_METER,
        costMinor: BigInt(100),
        saleMinor: BigInt(150),
        currency: "RON",
        metadata: { validationStatus: "requires business validation" },
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "price-item-b",
        tenantId: "tenant-b",
        priceListId: "price-list-b",
        itemType: PriceListItemType.ACCESSORY,
        catalogItemId: "accessory-b",
        unit: CatalogUnit.LINEAR_METER,
        costMinor: BigInt(100),
        saleMinor: BigInt(150),
        currency: "RON",
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as unknown as PriceListItem[]),
    pricingRule: delegate([
      {
        id: "pricing-rule-a",
        tenantId: "tenant-a",
        priceListId: "price-list-a",
        name: "Markup A",
        code: "RULE-A",
        ruleType: PricingRuleType.MARKUP,
        priority: 1,
        configuration: { validationStatus: "requires business validation" },
        requiresBusinessValidation: true,
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "pricing-rule-b",
        tenantId: "tenant-b",
        priceListId: "price-list-b",
        name: "Markup B",
        code: "RULE-B",
        ruleType: PricingRuleType.MARKUP,
        priority: 1,
        configuration: { validationStatus: "requires business validation" },
        requiresBusinessValidation: true,
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as unknown as PricingRule[]),
    customer: delegate([
      {
        id: "customer-a",
        tenantId: "tenant-a",
        displayName: "A Customer",
        contactName: "Alice Contact",
      },
      {
        id: "customer-b",
        tenantId: "tenant-b",
        displayName: "B Customer",
        contactName: "Bob Contact",
      },
      {
        id: "customer-c",
        tenantId: "tenant-a",
        displayName: "C Customer",
        contactName: "Carol Contact",
      },
    ] as Customer[]),
    project: delegate([
      {
        id: "project-a",
        tenantId: "tenant-a",
        customerId: "customer-a",
        name: "A Project",
      },
      {
        id: "project-b",
        tenantId: "tenant-b",
        customerId: "customer-b",
        name: "B Project",
      },
      {
        id: "project-c",
        tenantId: "tenant-a",
        customerId: "customer-c",
        name: "C Project",
      },
    ] as Project[]),
    quote: delegate(
      [
        {
          id: "quote-a",
          tenantId: "tenant-a",
          customerId: "customer-a",
          projectId: "project-a",
          quoteNumber: "A-001",
          status: QuoteStatus.DRAFT,
          createdById: "user-a",
          currentVersionId: "version-a",
          createdAt: new Date("2026-01-10T00:00:00.000Z"),
        },
        {
          id: "quote-b",
          tenantId: "tenant-b",
          customerId: "customer-b",
          projectId: "project-b",
          quoteNumber: "B-001",
          status: QuoteStatus.SENT,
          createdById: "user-b",
          currentVersionId: "version-b",
          createdAt: new Date("2026-01-11T00:00:00.000Z"),
        },
        {
          id: "quote-locked",
          tenantId: "tenant-a",
          customerId: "customer-a",
          projectId: "project-a",
          quoteNumber: "A-locked",
          status: QuoteStatus.SENT,
          createdById: "user-a",
          currentVersionId: "version-locked",
          createdAt: new Date("2026-01-12T00:00:00.000Z"),
        },
        {
          id: "quote-mismatch",
          tenantId: "tenant-a",
          customerId: "customer-a",
          projectId: "project-c",
          quoteNumber: "A-mismatch",
          status: QuoteStatus.DRAFT,
          createdById: "user-a",
          currentVersionId: "version-mismatch",
          createdAt: new Date("2026-01-13T00:00:00.000Z"),
        },
      ] as Quote[],
      { unique: [["tenantId", "quoteNumber"]] },
    ),
    quoteVersion: delegate([
      {
        id: "version-a",
        tenantId: "tenant-a",
        quoteId: "quote-a",
        versionNumber: 1,
        status: QuoteVersionStatus.DRAFT,
        isLocked: false,
        currency: "RON",
        customerSnapshot: { id: "customer-a", displayName: "A Customer" },
        companySettingsSnapshot: { displayName: "Tenant A" },
        itemSnapshot: { items: ["item-a"] },
        totalsSnapshot: { subtotalMinor: 0, vatMinor: 0, totalMinor: 0 },
        warningsSnapshot: [],
        traceSummary: { source: "test" },
        subtotalMinor: 0,
        vatMinor: 0,
        totalMinor: 0,
        createdById: "user-a",
        lockedAt: null,
        sentAt: null,
      },
      {
        id: "version-b",
        tenantId: "tenant-b",
        quoteId: "quote-b",
        versionNumber: 1,
        status: QuoteVersionStatus.DRAFT,
        isLocked: false,
        currency: "RON",
        customerSnapshot: { id: "customer-b", displayName: "B Customer" },
        companySettingsSnapshot: { displayName: "Tenant B" },
        itemSnapshot: { items: ["item-b"] },
        totalsSnapshot: { subtotalMinor: 0, vatMinor: 0, totalMinor: 0 },
        warningsSnapshot: [],
        traceSummary: { source: "test" },
        subtotalMinor: 0,
        vatMinor: 0,
        totalMinor: 0,
        createdById: "user-b",
        lockedAt: null,
        sentAt: null,
      },
      {
        id: "version-locked",
        tenantId: "tenant-a",
        quoteId: "quote-locked",
        versionNumber: 1,
        status: QuoteVersionStatus.SENT,
        isLocked: true,
        currency: "RON",
        customerSnapshot: { id: "customer-a", displayName: "A Customer" },
        companySettingsSnapshot: { displayName: "Tenant A" },
        itemSnapshot: { items: ["item-locked"] },
        totalsSnapshot: { subtotalMinor: 0, vatMinor: 0, totalMinor: 0 },
        warningsSnapshot: [],
        traceSummary: { source: "test" },
        subtotalMinor: 0,
        vatMinor: 0,
        totalMinor: 0,
        createdById: "user-a",
        lockedAt: new Date("2026-01-12T10:00:00.000Z"),
        sentAt: new Date("2026-01-12T10:00:00.000Z"),
      },
      {
        id: "version-mismatch",
        tenantId: "tenant-a",
        quoteId: "quote-mismatch",
        versionNumber: 1,
        status: QuoteVersionStatus.DRAFT,
        isLocked: false,
        currency: "RON",
        customerSnapshot: { id: "customer-a", displayName: "A Customer" },
        companySettingsSnapshot: { displayName: "Tenant A" },
        itemSnapshot: { items: [] },
        totalsSnapshot: { subtotalMinor: 0, vatMinor: 0, totalMinor: 0 },
        warningsSnapshot: [],
        traceSummary: { source: "test" },
        subtotalMinor: 0,
        vatMinor: 0,
        totalMinor: 0,
        createdById: "user-a",
        lockedAt: null,
        sentAt: null,
      },
    ] as unknown as QuoteVersion[]),
    quoteItem: delegate([
      {
        id: "item-a",
        tenantId: "tenant-a",
        quoteVersionId: "version-a",
        type: QuoteItemType.WINDOW,
        sortOrder: 0,
        quantity: 1,
        widthMm: 1200,
        heightMm: 1000,
        customerDescription: "Fixed window",
        internalNotes: "Synthetic item",
        configurationSnapshot: { kind: "fixed-window" },
        catalogSnapshot: { placeholder: true },
        totalsSnapshot: { subtotalMinor: 0, vatMinor: 0, totalMinor: 0 },
      },
      {
        id: "item-b",
        tenantId: "tenant-b",
        quoteVersionId: "version-b",
        type: QuoteItemType.CUSTOM,
        sortOrder: 0,
        quantity: 1,
        customerDescription: "Other tenant custom line",
        configurationSnapshot: { kind: "custom-line" },
        totalsSnapshot: { subtotalMinor: 0, vatMinor: 0, totalMinor: 0 },
      },
      {
        id: "item-locked",
        tenantId: "tenant-a",
        quoteVersionId: "version-locked",
        type: QuoteItemType.CUSTOM,
        sortOrder: 0,
        quantity: 1,
        customerDescription: "Locked custom line",
        configurationSnapshot: { kind: "custom-line" },
        totalsSnapshot: { subtotalMinor: 0, vatMinor: 0, totalMinor: 0 },
      },
    ] as unknown as QuoteItem[]),
    quoteCalculationResult: delegate([] as QuoteCalculationResult[]),
    document: delegate([] as Document[]),
    quoteDelivery: delegate([] as QuoteDelivery[]),
    auditLog: delegate(options.auditLogs ?? ([] as AuditLog[])),
    companySettings: delegate([
      {
        id: "settings-a",
        tenantId: "tenant-a",
        legalName: "Tenant A SRL",
        displayName: "Tenant A",
        defaultCurrency: "RON",
        defaultPdfTemplate: "template-b",
      },
      {
        id: "settings-b",
        tenantId: "tenant-b",
        legalName: "Tenant B SRL",
        displayName: "Tenant B",
        defaultCurrency: "EUR",
        defaultPdfTemplate: "template-a",
      },
    ] as CompanySettings[]),
    quoteNumberSettings: delegate(
      [
        {
          id: "numbering-a",
          tenantId: "tenant-a",
          prefix: "A",
          nextNumber: 2,
          datePattern: QuoteNumberDatePattern.NONE,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        {
          id: "numbering-b",
          tenantId: "tenant-b",
          prefix: "B",
          nextNumber: 7,
          datePattern: QuoteNumberDatePattern.YEAR,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ] as QuoteNumberSettings[],
      { unique: [["tenantId"]] },
    ),
    savedFilter: delegate(
      [
        {
          id: "filter-a",
          tenantId: "tenant-a",
          userId: "user-a",
          name: "Ciorne proprii",
          entityType: "Quote",
          filter: { status: QuoteStatus.DRAFT },
          isDefault: false,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        {
          id: "filter-other-user",
          tenantId: "tenant-a",
          userId: "user-other",
          name: "Alt utilizator",
          entityType: "Quote",
          filter: { status: QuoteStatus.SENT },
          isDefault: false,
          createdAt: new Date("2026-01-02T00:00:00.000Z"),
          updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        },
        {
          id: "filter-b",
          tenantId: "tenant-b",
          userId: "user-b",
          name: "Tenant B",
          entityType: "Quote",
          filter: { status: QuoteStatus.SENT },
          isDefault: false,
          createdAt: new Date("2026-01-03T00:00:00.000Z"),
          updatedAt: new Date("2026-01-03T00:00:00.000Z"),
        },
      ] as SavedFilter[],
      { unique: [["tenantId", "userId", "name"]] },
    ),
    tenantAsset: delegate([
      {
        id: "logo-a",
        tenantId: "tenant-a",
        kind: "company-logo",
        storageKey: "tenant-assets/tenant-a/company-logo/logo-a.png",
        mimeType: "image/png",
        checksum: "checksum-a",
        byteSize: 128,
        uploadedById: "user-a",
        uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "logo-b",
        tenantId: "tenant-b",
        kind: "company-logo",
        storageKey: "tenant-assets/tenant-b/company-logo/logo-b.png",
        mimeType: "image/png",
        checksum: "checksum-b",
        byteSize: 128,
        uploadedById: "user-b",
        uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as TenantAsset[]),
    userPreference: delegate(
      [
        {
          id: "preference-a",
          tenantId: "tenant-a",
          userId: "user-a",
          defaultPdfTemplate: "template-b",
          dashboardShortcuts: ["new-quote", "quotes"],
          language: "ro",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ] as UserPreference[],
      { unique: [["tenantId", "userId"]] },
    ),
  };

  if (options.onTransaction) {
    client.$transaction = async (operation) => {
      options.onTransaction?.();

      return operation(client);
    };
  }

  return client;
}

describe("tenant repositories", () => {
  it("derives tenantId from explicit tenant scope or verified tenant context", () => {
    expect(tenantIdFromScope({ tenantId: "tenant-a" })).toBe("tenant-a");
    expect(
      tenantIdFromScope({
        tenant: {
          id: "tenant-b",
          name: "Tenant B",
          slug: "tenant-b",
          status: "ACTIVE",
        },
      }),
    ).toBe("tenant-b");
  });

  it("lists, reads, creates, updates, and archives suppliers inside one tenant", async () => {
    const data = createTenantDataAccess(testClient());
    const suppliers = await data.listTenantSuppliers({ tenantId: "tenant-a" });

    expect(suppliers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "supplier-a", tenantId: "tenant-a" }),
      ]),
    );
    expect(suppliers).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "supplier-b" })]),
    );
    await expect(
      data.getTenantSupplier({ tenantId: "tenant-a" }, "supplier-b"),
    ).resolves.toBeNull();
    await expect(
      data.createTenantSupplier(
        { tenantId: "tenant-a" },
        { name: "New Supplier", code: "SUP-NEW" },
      ),
    ).resolves.toMatchObject({
      tenantId: "tenant-a",
      name: "New Supplier",
      code: "SUP-NEW",
      isActive: true,
      deletedAt: null,
    });
    await expect(
      data.updateTenantSupplier({ tenantId: "tenant-a" }, "supplier-a", {
        name: "Updated Supplier",
        code: "SUP-A",
      }),
    ).resolves.toMatchObject({
      id: "supplier-a",
      tenantId: "tenant-a",
      name: "Updated Supplier",
    });
    await expect(
      data.updateTenantSupplier({ tenantId: "tenant-a" }, "supplier-b", {
        name: "Blocked Supplier",
      }),
    ).resolves.toBeNull();

    const archived = await data.archiveTenantSupplier(
      { tenantId: "tenant-a" },
      "supplier-a",
    );

    expect(archived).toMatchObject({
      id: "supplier-a",
      tenantId: "tenant-a",
      isActive: false,
    });
    expect(archived?.deletedAt).toBeInstanceOf(Date);
    await expect(
      data.getTenantSupplier({ tenantId: "tenant-a" }, "supplier-a"),
    ).resolves.toMatchObject({
      id: "supplier-a",
      isActive: false,
      deletedAt: expect.any(Date),
    });
  });

  it("manages profile systems and profile items with tenant-scoped parent validation", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.listTenantProfileSystems({ tenantId: "tenant-a" }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "profile-system-a",
          tenantId: "tenant-a",
        }),
      ]),
    );
    await expect(
      data.getTenantProfileSystem({ tenantId: "tenant-a" }, "profile-system-b"),
    ).resolves.toBeNull();
    await expect(
      data.createTenantProfileSystem(
        { tenantId: "tenant-a" },
        {
          supplierId: "supplier-b",
          name: "Blocked PVC",
          code: "PVC-X",
          materialType: CatalogMaterialType.PVC,
        },
      ),
    ).resolves.toBeNull();
    await expect(
      data.createTenantProfileSystem(
        { tenantId: "tenant-a" },
        {
          supplierId: "supplier-a",
          name: "Aluminium A",
          code: "AL-A",
          materialType: CatalogMaterialType.ALUMINIUM,
        },
      ),
    ).resolves.toMatchObject({
      tenantId: "tenant-a",
      supplierId: "supplier-a",
      materialType: CatalogMaterialType.ALUMINIUM,
    });
    await expect(
      data.updateTenantProfileSystem(
        { tenantId: "tenant-a" },
        "profile-system-a",
        {
          supplierId: "supplier-a",
          name: "PVC A Updated",
          code: "PVC-A",
          materialType: CatalogMaterialType.PVC,
        },
      ),
    ).resolves.toMatchObject({ id: "profile-system-a", name: "PVC A Updated" });
    await expect(
      data.updateTenantProfileSystem(
        { tenantId: "tenant-a" },
        "profile-system-b",
        {
          supplierId: "supplier-a",
          name: "Blocked",
          code: "PVC-B",
          materialType: CatalogMaterialType.PVC,
        },
      ),
    ).resolves.toBeNull();

    await expect(
      data.listTenantProfileItems({ tenantId: "tenant-a" }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "profile-item-a", tenantId: "tenant-a" }),
      ]),
    );
    await expect(
      data.getTenantProfileItem({ tenantId: "tenant-a" }, "profile-item-b"),
    ).resolves.toBeNull();
    await expect(
      data.createTenantProfileItem(
        { tenantId: "tenant-a" },
        {
          profileSystemId: "profile-system-b",
          supplierId: "supplier-a",
          name: "Blocked frame",
          code: "FRAME-X",
          type: ProfileItemType.FRAME,
          unit: CatalogUnit.LINEAR_METER,
        },
      ),
    ).resolves.toBeNull();
    await expect(
      data.createTenantProfileItem(
        { tenantId: "tenant-a" },
        {
          profileSystemId: "profile-system-a",
          supplierId: "supplier-a",
          name: "New sash",
          code: "SASH-A",
          type: ProfileItemType.SASH,
          unit: CatalogUnit.LINEAR_METER,
          deductionRule: { validationStatus: "requires business validation" },
        },
      ),
    ).resolves.toMatchObject({
      tenantId: "tenant-a",
      profileSystemId: "profile-system-a",
      type: ProfileItemType.SASH,
    });
    await expect(
      data.updateTenantProfileItem({ tenantId: "tenant-a" }, "profile-item-a", {
        profileSystemId: "profile-system-a",
        supplierId: "supplier-a",
        name: "Frame A Updated",
        code: "FRAME-A",
        type: ProfileItemType.FRAME,
        unit: CatalogUnit.LINEAR_METER,
      }),
    ).resolves.toMatchObject({ id: "profile-item-a", name: "Frame A Updated" });

    const archivedSystem = await data.archiveTenantProfileSystem(
      { tenantId: "tenant-a" },
      "profile-system-a",
    );
    const archivedItem = await data.archiveTenantProfileItem(
      { tenantId: "tenant-a" },
      "profile-item-a",
    );

    expect(archivedSystem?.deletedAt).toBeInstanceOf(Date);
    expect(archivedItem?.deletedAt).toBeInstanceOf(Date);
    await expect(
      data.archiveTenantProfileItem({ tenantId: "tenant-a" }, "profile-item-b"),
    ).resolves.toBeNull();
  });

  it("manages glass packages, accessories, services, and tax rates with soft archives", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.listTenantGlassPackages({ tenantId: "tenant-a" }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "glass-a", tenantId: "tenant-a" }),
      ]),
    );
    await expect(
      data.getTenantGlassPackage({ tenantId: "tenant-a" }, "glass-b"),
    ).resolves.toBeNull();
    await expect(
      data.createTenantGlassPackage(
        { tenantId: "tenant-a" },
        {
          supplierId: "supplier-b",
          name: "Blocked glass",
          code: "GL-X",
          unit: CatalogUnit.SQUARE_METER,
        },
      ),
    ).resolves.toBeNull();
    await expect(
      data.createTenantGlassPackage(
        { tenantId: "tenant-a" },
        {
          supplierId: "supplier-a",
          name: "Triple glass",
          code: "GL-TRI",
          unit: CatalogUnit.SQUARE_METER,
        },
      ),
    ).resolves.toMatchObject({
      tenantId: "tenant-a",
      supplierId: "supplier-a",
    });
    await expect(
      data.updateTenantGlassPackage({ tenantId: "tenant-a" }, "glass-a", {
        supplierId: "supplier-a",
        name: "Glass A Updated",
        code: "GL-A",
        unit: CatalogUnit.SQUARE_METER,
      }),
    ).resolves.toMatchObject({ id: "glass-a", name: "Glass A Updated" });
    expect(
      (
        await data.archiveTenantGlassPackage(
          { tenantId: "tenant-a" },
          "glass-a",
        )
      )?.deletedAt,
    ).toBeInstanceOf(Date);

    await expect(
      data.listTenantAccessories({ tenantId: "tenant-a" }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "accessory-a", tenantId: "tenant-a" }),
      ]),
    );
    await expect(
      data.getTenantAccessory({ tenantId: "tenant-a" }, "accessory-b"),
    ).resolves.toBeNull();
    await expect(
      data.createTenantAccessory(
        { tenantId: "tenant-a" },
        {
          supplierId: "supplier-a",
          name: "Trim A",
          code: "TRIM-A",
          unit: CatalogUnit.LINEAR_METER,
        },
      ),
    ).resolves.toMatchObject({ tenantId: "tenant-a", name: "Trim A" });
    await expect(
      data.updateTenantAccessory({ tenantId: "tenant-a" }, "accessory-a", {
        supplierId: "supplier-a",
        name: "Sill A Updated",
        code: "SILL-A",
        unit: CatalogUnit.LINEAR_METER,
      }),
    ).resolves.toMatchObject({ id: "accessory-a", name: "Sill A Updated" });
    expect(
      (
        await data.archiveTenantAccessory(
          { tenantId: "tenant-a" },
          "accessory-a",
        )
      )?.deletedAt,
    ).toBeInstanceOf(Date);

    await expect(
      data.listTenantServiceItems({ tenantId: "tenant-a" }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "service-a", tenantId: "tenant-a" }),
      ]),
    );
    await expect(
      data.getTenantServiceItem({ tenantId: "tenant-a" }, "service-b"),
    ).resolves.toBeNull();
    await expect(
      data.createTenantServiceItem(
        { tenantId: "tenant-a" },
        { name: "Transport A", code: "TRANSPORT-A", unit: CatalogUnit.FIXED },
      ),
    ).resolves.toMatchObject({ tenantId: "tenant-a", name: "Transport A" });
    await expect(
      data.updateTenantServiceItem({ tenantId: "tenant-a" }, "service-a", {
        name: "Installation A Updated",
        code: "INSTALL-A",
        unit: CatalogUnit.FIXED,
      }),
    ).resolves.toMatchObject({
      id: "service-a",
      name: "Installation A Updated",
    });
    expect(
      (
        await data.archiveTenantServiceItem(
          { tenantId: "tenant-a" },
          "service-a",
        )
      )?.deletedAt,
    ).toBeInstanceOf(Date);

    await expect(
      data.listTenantTaxRates({ tenantId: "tenant-a" }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "tax-a", tenantId: "tenant-a" }),
      ]),
    );
    await expect(
      data.getTenantTaxRate({ tenantId: "tenant-a" }, "tax-b"),
    ).resolves.toBeNull();
    await expect(
      data.createTenantTaxRate(
        { tenantId: "tenant-a" },
        { name: "Reduced VAT", code: "VAT-RED", rateBasisPoints: 900 },
      ),
    ).resolves.toMatchObject({ tenantId: "tenant-a", rateBasisPoints: 900 });
    await expect(
      data.updateTenantTaxRate({ tenantId: "tenant-a" }, "tax-a", {
        name: "VAT A Updated",
        code: "VAT-A",
        rateBasisPoints: 1900,
        isDefault: true,
      }),
    ).resolves.toMatchObject({
      id: "tax-a",
      name: "VAT A Updated",
      isDefault: true,
    });
    expect(
      (await data.archiveTenantTaxRate({ tenantId: "tenant-a" }, "tax-a"))
        ?.deletedAt,
    ).toBeInstanceOf(Date);
  });

  it("manages price-list items and lists price lists and pricing rules inside the tenant", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.listTenantPriceLists({ tenantId: "tenant-a" }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "price-list-a", tenantId: "tenant-a" }),
      ]),
    );
    await expect(
      data.listTenantPriceLists({ tenantId: "tenant-a" }),
    ).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "price-list-b" })]),
    );
    await expect(
      data.listTenantPricingRules(
        { tenantId: "tenant-a" },
        { priceListId: "price-list-a" },
      ),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "pricing-rule-a", tenantId: "tenant-a" }),
      ]),
    );
    await expect(
      data.listTenantPricingRules(
        { tenantId: "tenant-a" },
        { priceListId: "price-list-b" },
      ),
    ).resolves.toEqual([]);
    await expect(
      data.listTenantPriceListItems({ tenantId: "tenant-a" }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "price-item-a", tenantId: "tenant-a" }),
      ]),
    );
    await expect(
      data.getTenantPriceListItem({ tenantId: "tenant-a" }, "price-item-b"),
    ).resolves.toBeNull();
    await expect(
      data.createTenantPriceListItem(
        { tenantId: "tenant-a" },
        {
          priceListId: "price-list-b",
          itemType: PriceListItemType.ACCESSORY,
          catalogItemId: "accessory-a",
          unit: CatalogUnit.LINEAR_METER,
        },
      ),
    ).resolves.toBeNull();
    await expect(
      data.createTenantPriceListItem(
        { tenantId: "tenant-a" },
        {
          priceListId: "price-list-a",
          itemType: PriceListItemType.ACCESSORY,
          catalogItemId: "accessory-b",
          unit: CatalogUnit.LINEAR_METER,
        },
      ),
    ).resolves.toBeNull();
    await expect(
      data.createTenantPriceListItem(
        { tenantId: "tenant-a" },
        {
          priceListId: "price-list-a",
          itemType: PriceListItemType.ACCESSORY,
          catalogItemId: "accessory-a",
          unit: CatalogUnit.LINEAR_METER,
          costMinor: 100,
          saleMinor: 150,
        },
      ),
    ).resolves.toMatchObject({
      tenantId: "tenant-a",
      priceListId: "price-list-a",
      catalogItemId: "accessory-a",
      currency: "RON",
    });
    await expect(
      data.updateTenantPriceListItem({ tenantId: "tenant-a" }, "price-item-a", {
        priceListId: "price-list-a",
        itemType: PriceListItemType.ACCESSORY,
        catalogItemId: "accessory-a",
        unit: CatalogUnit.LINEAR_METER,
        costMinor: 120,
        saleMinor: 180,
        currency: "RON",
      }),
    ).resolves.toMatchObject({ id: "price-item-a", saleMinor: 180 });

    const archived = await data.archiveTenantPriceListItem(
      { tenantId: "tenant-a" },
      "price-item-a",
    );

    expect(archived).toMatchObject({ id: "price-item-a", isActive: false });
    expect(archived?.deletedAt).toBeInstanceOf(Date);
    await expect(
      data.archiveTenantPriceListItem({ tenantId: "tenant-a" }, "price-item-b"),
    ).resolves.toBeNull();
  });

  it("does not return customers across tenant boundaries", async () => {
    const data = createTenantDataAccess(testClient());
    const customers = await data.listTenantCustomers({ tenantId: "tenant-a" });

    await expect(
      data.getTenantCustomer({ tenantId: "tenant-a" }, "customer-b"),
    ).resolves.toBeNull();
    expect(customers).toEqual(
      expect.arrayContaining([
        {
          id: "customer-a",
          tenantId: "tenant-a",
          displayName: "A Customer",
          contactName: "Alice Contact",
        },
      ]),
    );
    expect(customers).not.toEqual(
      expect.arrayContaining([{ id: "customer-b" }]),
    );
  });

  it("searches customer name and contact fields inside the tenant boundary", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.listTenantCustomers({ tenantId: "tenant-a" }, { search: "alice" }),
    ).resolves.toMatchObject([{ id: "customer-a", tenantId: "tenant-a" }]);
    await expect(
      data.listTenantCustomers({ tenantId: "tenant-a" }, { search: "bob" }),
    ).resolves.toEqual([]);
  });

  it("creates and updates customers only through an explicit tenant scope", async () => {
    const data = createTenantDataAccess(testClient());
    const created = await data.createTenantCustomer(
      { tenantId: "tenant-a" },
      { displayName: "New Customer", email: "customer@example.test" },
    );

    expect(created).toMatchObject({
      tenantId: "tenant-a",
      displayName: "New Customer",
      email: "customer@example.test",
    });

    await expect(
      data.updateTenantCustomer({ tenantId: "tenant-a" }, "customer-a", {
        displayName: "Updated Customer",
      }),
    ).resolves.toMatchObject({
      displayName: "Updated Customer",
      tenantId: "tenant-a",
    });
    await expect(
      data.updateTenantCustomer({ tenantId: "tenant-a" }, "customer-b", {
        displayName: "Blocked Customer",
      }),
    ).resolves.toBeNull();
    await expect(
      data.getTenantCustomer({ tenantId: "tenant-b" }, "customer-b"),
    ).resolves.toMatchObject({
      displayName: "B Customer",
    });
  });

  it("does not return projects across tenant boundaries", async () => {
    const data = createTenantDataAccess(testClient());
    const projects = await data.listTenantProjects({ tenantId: "tenant-a" });

    await expect(
      data.getTenantProject({ tenantId: "tenant-a" }, "project-b"),
    ).resolves.toBeNull();
    expect(projects).toEqual(
      expect.arrayContaining([
        {
          id: "project-a",
          tenantId: "tenant-a",
          customerId: "customer-a",
          name: "A Project",
        },
      ]),
    );
    expect(projects).not.toEqual(expect.arrayContaining([{ id: "project-b" }]));
  });

  it("lists projects by customer inside the tenant boundary", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.listTenantProjects(
        { tenantId: "tenant-a" },
        { customerId: "customer-a" },
      ),
    ).resolves.toMatchObject([{ id: "project-a", tenantId: "tenant-a" }]);
    await expect(
      data.listTenantProjects(
        { tenantId: "tenant-a" },
        { customerId: "customer-b" },
      ),
    ).resolves.toEqual([]);
  });

  it("creates projects only for customers in the same tenant", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.createTenantProject(
        { tenantId: "tenant-a" },
        { customerId: "customer-b", name: "Blocked Project" },
      ),
    ).resolves.toBeNull();
    await expect(
      data.createTenantProject(
        { tenantId: "tenant-a" },
        { customerId: "customer-a", name: "New Project" },
      ),
    ).resolves.toMatchObject({
      tenantId: "tenant-a",
      customerId: "customer-a",
      name: "New Project",
    });
  });

  it("updates projects only inside the tenant boundary", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.updateTenantProject({ tenantId: "tenant-a" }, "project-a", {
        customerId: "customer-a",
        name: "Updated Project",
      }),
    ).resolves.toMatchObject({ name: "Updated Project", tenantId: "tenant-a" });
    await expect(
      data.updateTenantProject({ tenantId: "tenant-a" }, "project-b", {
        customerId: "customer-a",
        name: "Blocked Project",
      }),
    ).resolves.toBeNull();
    await expect(
      data.updateTenantProject({ tenantId: "tenant-a" }, "project-a", {
        customerId: "customer-b",
        name: "Blocked Reparent",
      }),
    ).resolves.toBeNull();
  });

  it("does not return quotes across tenant boundaries", async () => {
    const data = createTenantDataAccess(testClient());
    const quotes = await data.listTenantQuotes({ tenantId: "tenant-a" });

    await expect(
      data.getTenantQuote({ tenantId: "tenant-a" }, "quote-b"),
    ).resolves.toBeNull();
    expect(quotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "quote-a",
          tenantId: "tenant-a",
          customerId: "customer-a",
        }),
      ]),
    );
    expect(quotes).not.toEqual(expect.arrayContaining([{ id: "quote-b" }]));
  });

  it("filters saved quote lists inside the tenant boundary", async () => {
    const data = createTenantDataAccess(testClient());
    const customerQuotes = await data.listTenantQuotes(
      { tenantId: "tenant-a" },
      { customerId: "customer-a" },
    );

    expect(customerQuotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "quote-a",
          tenantId: "tenant-a",
          customerId: "customer-a",
        }),
      ]),
    );
    expect(customerQuotes).not.toEqual(
      expect.arrayContaining([{ id: "quote-b" }]),
    );
    await expect(
      data.listTenantQuotes(
        { tenantId: "tenant-a" },
        { status: QuoteStatus.SENT },
      ),
    ).resolves.toMatchObject([{ id: "quote-locked", tenantId: "tenant-a" }]);
    await expect(
      data.listTenantQuotes(
        { tenantId: "tenant-a" },
        { createdById: "user-a" },
      ),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "quote-a", tenantId: "tenant-a" }),
      ]),
    );
    await expect(
      data.listTenantQuotes(
        { tenantId: "tenant-a" },
        {
          createdFrom: new Date("2026-01-09T00:00:00.000Z"),
          createdTo: new Date("2026-01-10T23:59:59.999Z"),
        },
      ),
    ).resolves.toMatchObject([{ id: "quote-a", tenantId: "tenant-a" }]);
  });

  it("lists and reads saved quote filters inside tenant and user boundaries", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.listTenantSavedFilters(
        { tenantId: "tenant-a" },
        { entityType: "Quote", userId: "user-a" },
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "filter-a",
        tenantId: "tenant-a",
        userId: "user-a",
        filter: { status: QuoteStatus.DRAFT },
      }),
    ]);
    await expect(
      data.getTenantSavedFilter({ tenantId: "tenant-a" }, "filter-b"),
    ).resolves.toBeNull();
  });

  it("upserts saved quote filters without leaking across tenants or users", async () => {
    const data = createTenantDataAccess(testClient());
    const created = await data.upsertTenantSavedFilter(
      { tenantId: "tenant-a" },
      {
        userId: "user-a",
        name: "Trimise",
        entityType: "Quote",
        filter: { status: QuoteStatus.SENT },
      },
    );

    expect(created).toMatchObject({
      tenantId: "tenant-a",
      userId: "user-a",
      name: "Trimise",
      filter: { status: QuoteStatus.SENT },
    });

    const updated = await data.upsertTenantSavedFilter(
      { tenantId: "tenant-a" },
      {
        userId: "user-a",
        name: "Trimise",
        entityType: "Quote",
        filter: { status: QuoteStatus.ACCEPTED },
      },
    );

    expect(updated.id).toBe(created.id);
    expect(updated.filter).toEqual({ status: QuoteStatus.ACCEPTED });
    await expect(
      data.listTenantSavedFilters(
        { tenantId: "tenant-a" },
        { entityType: "Quote", userId: "user-b" },
      ),
    ).resolves.toEqual([]);
  });

  it("updates company settings inside the current tenant and writes an audit log", async () => {
    const auditLogs: AuditLog[] = [];
    const data = createTenantDataAccess(testClient({ auditLogs }));
    const result = await data.updateTenantCompanySettings(
      { tenantId: "tenant-a" },
      "settings-a",
      {
        actorUserId: "owner-a",
        legalName: "Tenant A Legal SRL",
        displayName: "Tenant A Comercial",
        taxIdentifier: "RO123456",
        registrationNumber: "J40/123/2026",
        addressLine1: "Strada Test 1",
        city: "Bucuresti",
        country: "Romania",
        phone: "+40000000001",
        email: "office-a@example.test",
        website: "https://tenant-a.example.test",
        defaultCurrency: "ron",
        defaultPdfTemplate: "template-b",
        vatRateBasisPoints: 2100,
        offerValidityDays: 21,
        paymentTermsText: "Plata prin transfer bancar.",
        warrantyText: "Garantie sintetica.",
        deliveryText: "Livrare sintetica.",
        advancePaymentText: "Avans conform ofertei.",
        pdfFooterText: "Footer sintetic.",
      },
    );

    expect(result?.record).toMatchObject({
      id: "settings-a",
      tenantId: "tenant-a",
      displayName: "Tenant A Comercial",
      defaultCurrency: "RON",
      defaultPdfTemplate: "template-b",
      vatRateBasisPoints: 2100,
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({
      tenantId: "tenant-a",
      actorUserId: "owner-a",
      action: AuditAction.SETTINGS_UPDATED,
      entityType: "CompanySettings",
      entityId: "settings-a",
      metadata: {
        settingsType: "company",
        defaultPdfTemplate: "template-b",
      },
    });
  });

  it("stores company logo metadata inside the current tenant", async () => {
    const auditLogs: AuditLog[] = [];
    const data = createTenantDataAccess(testClient({ auditLogs }));
    const uploadedAt = new Date("2026-06-27T12:00:00.000Z");
    const result = await data.updateTenantCompanyLogoAsset(
      { tenantId: "tenant-a" },
      {
        assetId: "logo-new",
        byteSize: 512,
        checksum: "checksum-new",
        fallbackDisplayName: "Tenant A",
        fallbackLegalName: "Tenant A SRL",
        logoUrl: "/dashboard/settings/logo/logo-new",
        mimeType: "image/png",
        storageKey: "tenant-assets/tenant-a/company-logo/logo-new.png",
        uploadedAt,
        uploadedById: "owner-a",
      },
    );

    expect(result.asset).toMatchObject({
      id: "logo-new",
      tenantId: "tenant-a",
      kind: "company-logo",
      storageKey: "tenant-assets/tenant-a/company-logo/logo-new.png",
      mimeType: "image/png",
      checksum: "checksum-new",
      byteSize: 512,
      uploadedById: "owner-a",
      uploadedAt,
    });
    expect(result.record).toMatchObject({
      id: "settings-a",
      tenantId: "tenant-a",
      logoAssetId: "logo-new",
      logoUrl: "/dashboard/settings/logo/logo-new",
    });
    await expect(
      data.getTenantCompanyLogoAsset({ tenantId: "tenant-a" }, "logo-new"),
    ).resolves.toMatchObject({
      id: "logo-new",
      tenantId: "tenant-a",
      storageKey: "tenant-assets/tenant-a/company-logo/logo-new.png",
    });
    await expect(
      data.getTenantCompanyLogoAsset({ tenantId: "tenant-b" }, "logo-new"),
    ).resolves.toBeNull();
    expect(auditLogs).toEqual([
      expect.objectContaining({
        tenantId: "tenant-a",
        actorUserId: "owner-a",
        action: AuditAction.SETTINGS_UPDATED,
        entityType: "CompanySettings",
        entityId: "settings-a",
        metadata: {
          settingsType: "company-logo",
          logoAssetId: "logo-new",
          mimeType: "image/png",
          byteSize: 512,
          checksum: "checksum-new",
        },
      }),
    ]);
  });

  it("rejects cross-tenant company logo asset reads", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.getTenantCompanyLogoAsset({ tenantId: "tenant-a" }, "logo-b"),
    ).resolves.toBeNull();
  });

  it("rejects cross-tenant settings updates", async () => {
    const auditLogs: AuditLog[] = [];
    const data = createTenantDataAccess(testClient({ auditLogs }));

    await expect(
      data.updateTenantCompanySettings({ tenantId: "tenant-a" }, "settings-b", {
        legalName: "Blocked SRL",
        displayName: "Blocked",
        defaultCurrency: "RON",
        defaultPdfTemplate: "template-a",
      }),
    ).resolves.toBeNull();
    await expect(
      data.updateTenantQuoteNumberSettings(
        { tenantId: "tenant-a" },
        "numbering-b",
        {
          prefix: "X",
          nextNumber: 10,
          datePattern: QuoteNumberDatePattern.NONE,
        },
      ),
    ).resolves.toBeNull();
    expect(auditLogs).toHaveLength(0);
  });

  it("updates quote numbering settings with a tenant-scoped audit log", async () => {
    const auditLogs: AuditLog[] = [];
    const data = createTenantDataAccess(testClient({ auditLogs }), {
      now: () => new Date("2026-06-26T10:00:00.000Z"),
    });
    const result = await data.updateTenantQuoteNumberSettings(
      { tenantId: "tenant-a" },
      "numbering-a",
      {
        actorUserId: "owner-a",
        prefix: "oferta",
        nextNumber: 42,
        datePattern: QuoteNumberDatePattern.YEAR_MONTH,
      },
    );

    expect(result?.record).toMatchObject({
      id: "numbering-a",
      tenantId: "tenant-a",
      prefix: "OFERTA",
      nextNumber: 42,
      datePattern: QuoteNumberDatePattern.YEAR_MONTH,
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({
      tenantId: "tenant-a",
      actorUserId: "owner-a",
      action: AuditAction.QUOTE_NUMBERING_UPDATED,
      entityType: "QuoteNumberSettings",
      entityId: "numbering-a",
      metadata: {
        settingsType: "quote-numbering",
        nextQuoteNumberPreview: "OFERTA-202606-0042",
      },
    });
  });

  it("creates a draft quote shell with an initial tenant-scoped quote version", async () => {
    const data = createTenantDataAccess(testClient());
    const result = await data.createTenantQuoteDraft(
      { tenantId: "tenant-a" },
      {
        customerId: "customer-a",
        projectId: "project-a",
        quoteNumber: "A-002",
        title: "Synthetic draft shell",
        createdById: "user-a",
      },
    );

    expect(result).not.toBeNull();
    expect(result?.quote).toBeDefined();
    expect(result?.currentVersion).toBeDefined();
    expect(result?.quote.currentVersionId).toBe(result?.currentVersion.id);
    expect(result?.quote).toMatchObject({
      tenantId: "tenant-a",
      customerId: "customer-a",
      projectId: "project-a",
      quoteNumber: "A-002",
      status: QuoteStatus.DRAFT,
      currentVersionId: result?.currentVersion.id,
    });
    expect(result?.currentVersion).toMatchObject({
      tenantId: "tenant-a",
      quoteId: result?.quote.id,
      versionNumber: 1,
      status: QuoteVersionStatus.DRAFT,
      isLocked: false,
      totalMinor: 0,
    });
  });

  it("creates a draft quote shell inside a transaction when the client supports it", async () => {
    let transactionCount = 0;
    const data = createTenantDataAccess(
      testClient({
        onTransaction: () => {
          transactionCount += 1;
        },
      }),
    );

    await expect(
      data.createTenantQuoteDraft(
        { tenantId: "tenant-a" },
        { customerId: "customer-a" },
      ),
    ).resolves.toMatchObject({
      quote: {
        tenantId: "tenant-a",
        quoteNumber: "A-0002",
      },
      currentVersion: {
        tenantId: "tenant-a",
        versionNumber: 1,
      },
    });
    expect(transactionCount).toBe(1);
  });

  it("generates tenant-specific quote numbers from saved numbering settings", async () => {
    const data = createTenantDataAccess(testClient(), {
      now: () => new Date("2026-06-26T10:00:00.000Z"),
    });

    await expect(
      data.createTenantQuoteDraft(
        { tenantId: "tenant-a" },
        { customerId: "customer-a" },
      ),
    ).resolves.toMatchObject({
      quote: {
        tenantId: "tenant-a",
        quoteNumber: "A-0002",
      },
    });
    await expect(
      data.createTenantQuoteDraft(
        { tenantId: "tenant-b" },
        { customerId: "customer-b" },
      ),
    ).resolves.toMatchObject({
      quote: {
        tenantId: "tenant-b",
        quoteNumber: "B-2026-0007",
      },
    });
  });

  it("rejects draft quote creation for a customer outside the tenant boundary", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.createTenantQuoteDraft(
        { tenantId: "tenant-a" },
        { customerId: "customer-b", quoteNumber: "A-003" },
      ),
    ).resolves.toBeNull();
  });

  it("rejects draft quote creation for a project outside the tenant boundary", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.createTenantQuoteDraft(
        { tenantId: "tenant-a" },
        {
          customerId: "customer-a",
          projectId: "project-b",
          quoteNumber: "A-004",
        },
      ),
    ).resolves.toBeNull();
  });

  it("retries generated quote numbers when a tenant-scoped collision occurs", async () => {
    const data = createTenantDataAccess(testClient());
    await data.createTenantQuoteDraft(
      { tenantId: "tenant-a" },
      { customerId: "customer-a", quoteNumber: "A-0002" },
    );
    const result = await data.createTenantQuoteDraft(
      { tenantId: "tenant-a" },
      { customerId: "customer-a", createdById: "user-a" },
    );

    expect(result?.quote).toMatchObject({
      tenantId: "tenant-a",
      quoteNumber: "A-0003",
      currentVersionId: result?.currentVersion.id,
    });
    expect(result?.currentVersion).toMatchObject({
      tenantId: "tenant-a",
      quoteId: result?.quote.id,
      versionNumber: 1,
    });
  });

  it("returns a controlled error for an explicit duplicate quote number", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.createTenantQuoteDraft(
        { tenantId: "tenant-a" },
        { customerId: "customer-a", quoteNumber: "A-001" },
      ),
    ).rejects.toBeInstanceOf(QuoteNumberCollisionError);
  });

  it("does not return quote versions across tenant boundaries", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.getTenantQuoteVersion({ tenantId: "tenant-a" }, "version-b"),
    ).resolves.toBeNull();
    await expect(
      data.getTenantQuoteVersion({ tenantId: "tenant-a" }, "version-a"),
    ).resolves.toMatchObject({ id: "version-a", tenantId: "tenant-a" });
  });

  it("lists quote versions only after the parent quote is tenant-scoped", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.listTenantQuoteVersions({ tenantId: "tenant-a" }, "quote-a"),
    ).resolves.toMatchObject([
      { id: "version-a", tenantId: "tenant-a", quoteId: "quote-a" },
    ]);
    await expect(
      data.listTenantQuoteVersions({ tenantId: "tenant-a" }, "quote-b"),
    ).resolves.toEqual([]);
  });

  it("returns a tenant quote with its current version after validating customer and project links", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.getTenantQuoteWithCurrentVersion(
        { tenantId: "tenant-a" },
        "quote-a",
      ),
    ).resolves.toMatchObject({
      quote: {
        id: "quote-a",
        tenantId: "tenant-a",
      },
      currentVersion: {
        id: "version-a",
        tenantId: "tenant-a",
        status: QuoteVersionStatus.DRAFT,
      },
    });
    await expect(
      data.getTenantQuoteWithCurrentVersion(
        { tenantId: "tenant-a" },
        "quote-b",
      ),
    ).resolves.toBeNull();
    await expect(
      data.getTenantQuoteWithCurrentVersion(
        { tenantId: "tenant-a" },
        "quote-mismatch",
      ),
    ).resolves.toBeNull();
  });

  it("adds an item to the current draft quote version", async () => {
    const data = createTenantDataAccess(testClient());
    const item = await data.createTenantQuoteItem(
      { tenantId: "tenant-a" },
      "quote-a",
      {
        type: QuoteItemType.WINDOW,
        quantity: 2,
        widthMm: 1400,
        heightMm: 1100,
        customerDescription: "Living room fixed window",
        internalNotes: "Synthetic draft item",
        configurationSnapshot: {
          kind: "fixed-window",
          widthMm: 1400,
          heightMm: 1100,
        },
        catalogSnapshot: {
          placeholder: true,
        },
      },
    );

    expect(item).toMatchObject({
      tenantId: "tenant-a",
      quoteVersionId: "version-a",
      type: QuoteItemType.WINDOW,
      quantity: 2,
      widthMm: 1400,
      heightMm: 1100,
      sortOrder: 1,
      customerDescription: "Living room fixed window",
      totalsSnapshot: {
        subtotalMinor: 0,
        vatMinor: 0,
        totalMinor: 0,
      },
    });
    await expect(
      data.listTenantQuoteItems({ tenantId: "tenant-a" }, "version-a"),
    ).resolves.toHaveLength(2);
  });

  it("edits an item in the same tenant and current draft version", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.updateTenantQuoteItem({ tenantId: "tenant-a" }, "item-a", {
        quantity: 3,
        widthMm: 1300,
        customerDescription: "Updated fixed window",
        configurationSnapshot: {
          kind: "fixed-window",
          widthMm: 1300,
          heightMm: 1000,
        },
      }),
    ).resolves.toMatchObject({
      id: "item-a",
      tenantId: "tenant-a",
      quoteVersionId: "version-a",
      quantity: 3,
      widthMm: 1300,
      heightMm: 1000,
      customerDescription: "Updated fixed window",
    });
  });

  it("adds, edits, and deletes a door item in the current mutable draft", async () => {
    const data = createTenantDataAccess(testClient());
    const created = await data.createTenantQuoteItem(
      { tenantId: "tenant-a" },
      "quote-a",
      doorQuoteItemInput({
        customerDescription: "Ușă intrare sintetică",
        panelDescription: "Panou decorativ sintetic",
      }),
    );

    expect(created).toMatchObject({
      tenantId: "tenant-a",
      quoteVersionId: "version-a",
      type: QuoteItemType.DOOR,
      quantity: 1,
      widthMm: 900,
      heightMm: 2100,
      customerDescription: "Ușă intrare sintetică",
      configurationSnapshot: {
        kind: "door",
        panel: {
          description: "Panou decorativ sintetic",
        },
      },
    });

    const updated = await data.updateTenantQuoteItem(
      { tenantId: "tenant-a" },
      created!.id,
      doorQuoteItemInput({
        quantity: 2,
        widthMm: 950,
        customerDescription: "Ușă intrare actualizată",
        panelDescription: "Panou plin actualizat",
      }),
    );

    expect(updated).toMatchObject({
      id: created?.id,
      type: QuoteItemType.DOOR,
      quantity: 2,
      widthMm: 950,
      customerDescription: "Ușă intrare actualizată",
      configurationSnapshot: {
        kind: "door",
        panel: {
          description: "Panou plin actualizat",
        },
      },
    });
    await expect(
      data.deleteTenantQuoteItem({ tenantId: "tenant-a" }, created!.id),
    ).resolves.toMatchObject({
      id: created?.id,
      type: QuoteItemType.DOOR,
    });
  });

  it("applies an audited item-level manual override to a current draft item", async () => {
    const auditLogs: AuditLog[] = [];
    const data = createTenantDataAccess(testClient({ auditLogs }));
    const result = await data.applyTenantQuoteItemManualOverride(
      { tenantId: "tenant-a" },
      "item-a",
      {
        amountMinor: 25_000,
        reason: "Synthetic negotiated item total",
        actorUserId: "user-a",
      },
    );
    const manualOverride = asRecord(
      asRecord(result?.record.configurationSnapshot)?.manualOverride,
    );

    expect(result?.record).toMatchObject({
      id: "item-a",
      tenantId: "tenant-a",
      calculationSnapshot: null,
    });
    expect(result?.record.totalsSnapshot).toMatchObject({
      pendingCalculation: true,
      source: "manual-commercial-adjustment",
    });
    expect(manualOverride).toMatchObject({
      target: "totalWithVat",
      amountMinor: "25000",
      reason: "Synthetic negotiated item total",
      actorId: "user-a",
      auditReferenceId: result?.auditLog.id,
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({
      id: result?.auditLog.id,
      tenantId: "tenant-a",
      actorUserId: "user-a",
      action: AuditAction.PRICING_OVERRIDE_APPLIED,
      entityType: "QuoteItem",
      entityId: "item-a",
      metadata: {
        adjustmentType: "item-manual-override",
        quoteId: "quote-a",
        quoteVersionId: "version-a",
        amountMinor: "25000",
        reason: "Synthetic negotiated item total",
      },
    });
  });

  it("applies an audited quote-level discount to the current draft version", async () => {
    const auditLogs: AuditLog[] = [];
    const data = createTenantDataAccess(testClient({ auditLogs }));
    const result = await data.applyTenantQuoteDiscount(
      { tenantId: "tenant-a" },
      "quote-a",
      {
        basisPoints: 750,
        reason: "Synthetic campaign discount",
        actorUserId: "user-a",
      },
    );
    const quoteDiscount = asRecord(
      asRecord(result?.record.priceSnapshot)?.quoteDiscount,
    );

    expect(result?.record).toMatchObject({
      id: "version-a",
      tenantId: "tenant-a",
      quoteId: "quote-a",
    });
    expect(result?.record.totalsSnapshot).toMatchObject({
      pendingCalculation: true,
      source: "manual-commercial-adjustment",
    });
    expect(quoteDiscount).toMatchObject({
      basisPoints: 750,
      reason: "Synthetic campaign discount",
      actorId: "user-a",
      auditReferenceId: result?.auditLog.id,
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({
      id: result?.auditLog.id,
      tenantId: "tenant-a",
      actorUserId: "user-a",
      action: AuditAction.PRICING_OVERRIDE_APPLIED,
      entityType: "QuoteVersion",
      entityId: "version-a",
      metadata: {
        adjustmentType: "quote-discount",
        quoteId: "quote-a",
        quoteVersionId: "version-a",
        basisPoints: 750,
        reason: "Synthetic campaign discount",
      },
    });
  });

  it("deletes an item in the same tenant and current draft version", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.deleteTenantQuoteItem({ tenantId: "tenant-a" }, "item-a"),
    ).resolves.toMatchObject({
      id: "item-a",
      tenantId: "tenant-a",
    });
    await expect(
      data.getTenantQuoteItem({ tenantId: "tenant-a" }, "item-a"),
    ).resolves.toBeNull();
  });

  it("rejects item mutations on locked or sent quote versions", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.createTenantQuoteItem({ tenantId: "tenant-a" }, "quote-locked", {
        type: QuoteItemType.DOOR,
        quantity: 1,
        widthMm: 900,
        heightMm: 2100,
        customerDescription: "Blocked door line",
        configurationSnapshot: { kind: "door" },
      }),
    ).resolves.toBeNull();
    await expect(
      data.updateTenantQuoteItem({ tenantId: "tenant-a" }, "item-locked", {
        customerDescription: "Blocked edit",
      }),
    ).resolves.toBeNull();
    await expect(
      data.deleteTenantQuoteItem({ tenantId: "tenant-a" }, "item-locked"),
    ).resolves.toBeNull();
    await expect(
      data.applyTenantQuoteItemManualOverride(
        { tenantId: "tenant-a" },
        "item-locked",
        {
          amountMinor: 12_000,
          reason: "Blocked locked override",
          actorUserId: "user-a",
        },
      ),
    ).resolves.toBeNull();
    await expect(
      data.applyTenantQuoteDiscount({ tenantId: "tenant-a" }, "quote-locked", {
        amountMinor: 1_000,
        reason: "Blocked locked discount",
        actorUserId: "user-a",
      }),
    ).resolves.toBeNull();
  });

  it("locks the current draft version and prevents item and calculation mutations", async () => {
    const auditLogs: AuditLog[] = [];
    const data = createTenantDataAccess(testClient({ auditLogs }));
    const result = await data.lockTenantQuoteVersion(
      { tenantId: "tenant-a" },
      "quote-a",
      { actorUserId: "user-a" },
    );

    expect(result).toMatchObject({
      quote: {
        id: "quote-a",
        currentVersionId: "version-a",
      },
      currentVersion: {
        id: "version-a",
        status: QuoteVersionStatus.LOCKED,
        isLocked: true,
      },
    });
    expect(result?.currentVersion.lockedAt).toBeInstanceOf(Date);
    await expect(
      data.updateTenantQuoteItem({ tenantId: "tenant-a" }, "item-a", {
        customerDescription: "Blocked after lock",
      }),
    ).resolves.toBeNull();
    await expect(
      data.deleteTenantQuoteItem({ tenantId: "tenant-a" }, "item-a"),
    ).resolves.toBeNull();
    await expect(
      data.updateTenantQuoteVersionCalculation(
        { tenantId: "tenant-a" },
        "version-a",
        {
          subtotalMinor: 100,
          vatMinor: 19,
          totalMinor: 119,
          totalsSnapshot: { totalMinor: 119 },
          warningsSnapshot: [],
          traceSummary: { source: "blocked-test" },
        },
      ),
    ).resolves.toBeNull();
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({
      tenantId: "tenant-a",
      actorUserId: "user-a",
      action: AuditAction.QUOTE_VERSION_LOCKED,
      entityType: "QuoteVersion",
      entityId: "version-a",
      metadata: {
        quoteId: "quote-a",
        targetStatus: QuoteVersionStatus.LOCKED,
      },
    });
  });

  it("sends a locked quote with a generated document and keeps the sent version immutable", async () => {
    const auditLogs: AuditLog[] = [];
    const data = createTenantDataAccess(testClient({ auditLogs }), {
      now: () => new Date("2026-06-26T09:30:00.000Z"),
    });

    await data.lockTenantQuoteVersion({ tenantId: "tenant-a" }, "quote-a", {
      actorUserId: "user-a",
    });
    const document = await data.createTenantQuoteDocument(
      { tenantId: "tenant-a" },
      "version-a",
      {
        actorUserId: "user-a",
        templateKey: "template-a",
        fileName: "A-001-v1.pdf",
        storageKey: "documents/tenant-a/version-a/sent.pdf",
        mimeType: "application/pdf",
        checksum: "sent-checksum",
        visibleTotalsSnapshot: {
          subtotalMinor: 0,
          vatMinor: 0,
          totalMinor: 0,
          currency: "RON",
        },
      },
    );
    const documentBeforeSend = await data.getTenantDocument(
      { tenantId: "tenant-a" },
      document!.id,
    );
    const result = await data.sendTenantQuote(
      { tenantId: "tenant-a" },
      "quote-a",
      {
        actorUserId: "user-a",
        completedAt: new Date("2026-06-26T09:30:02.000Z"),
        deliveryProvider: "local",
        deliveryStatus: "logged",
        documentId: document!.id,
        providerMessageId: "local-synthetic-event",
        recipientEmail: "client.sintetic@example.test",
        recipientName: "Contact sintetic",
      },
    );

    expect(result).toMatchObject({
      quote: {
        id: "quote-a",
        status: QuoteStatus.SENT,
      },
      currentVersion: {
        id: "version-a",
        status: QuoteVersionStatus.SENT,
        isLocked: true,
        sentAt: new Date("2026-06-26T09:30:00.000Z"),
      },
      document: {
        id: document?.id,
        quoteVersionId: "version-a",
      },
      delivery: {
        documentId: document?.id,
        provider: "local",
        providerMessageId: "local-synthetic-event",
        quoteId: "quote-a",
        quoteVersionId: "version-a",
        recipientEmail: "client.sintetic@example.test",
        recipientEmailRedacted: "c***@e***.test",
        status: "logged",
        tenantId: "tenant-a",
      },
    });
    await expect(
      data.getTenantDocument({ tenantId: "tenant-a" }, document!.id),
    ).resolves.toEqual(documentBeforeSend);
    await expect(
      data.getTenantQuoteDocument(
        { tenantId: "tenant-a" },
        "quote-a",
        document!.id,
      ),
    ).resolves.toMatchObject({
      document: {
        id: document?.id,
        quoteVersionId: "version-a",
      },
      quoteVersion: {
        id: "version-a",
        status: QuoteVersionStatus.SENT,
      },
    });
    await expect(
      data.listTenantQuoteDocumentDeliveries(
        { tenantId: "tenant-a" },
        "quote-a",
        document!.id,
      ),
    ).resolves.toMatchObject([
      {
        id: result?.delivery?.id,
        status: "logged",
        provider: "local",
      },
    ]);
    await expect(
      data.updateTenantQuoteItem({ tenantId: "tenant-a" }, "item-a", {
        customerDescription: "Blocked after send",
      }),
    ).resolves.toBeNull();
    await expect(
      data.updateTenantQuoteVersionCalculation(
        { tenantId: "tenant-a" },
        "version-a",
        {
          subtotalMinor: 100,
          vatMinor: 19,
          totalMinor: 119,
          totalsSnapshot: { totalMinor: 119 },
          warningsSnapshot: [],
          traceSummary: { source: "blocked-sent-test" },
        },
      ),
    ).resolves.toBeNull();

    expect(auditLogs).toHaveLength(3);
    expect(auditLogs[2]).toMatchObject({
      tenantId: "tenant-a",
      actorUserId: "user-a",
      action: AuditAction.QUOTE_SENT,
      entityType: "QuoteVersion",
      entityId: "version-a",
      metadata: {
        quoteId: "quote-a",
        targetStatus: QuoteVersionStatus.SENT,
        documentId: document?.id,
        deliveryId: result?.delivery?.id,
        deliveryProvider: "local",
        deliveryStatus: "logged",
        providerMessageId: "local-synthetic-event",
        recipientEmailRedacted: "c***@e***.test",
        recipientNamePresent: true,
      },
    });
    expect(JSON.stringify(auditLogs[2])).not.toContain(
      "client.sintetic@example.test",
    );
  });

  it("rejects sending with a document from another tenant", async () => {
    const auditLogs: AuditLog[] = [];
    const data = createTenantDataAccess(testClient({ auditLogs }));

    await data.lockTenantQuoteVersion({ tenantId: "tenant-a" }, "quote-a", {
      actorUserId: "user-a",
    });
    await data.lockTenantQuoteVersion({ tenantId: "tenant-b" }, "quote-b", {
      actorUserId: "user-b",
    });
    const tenantBDocument = await data.createTenantQuoteDocument(
      { tenantId: "tenant-b" },
      "version-b",
      {
        actorUserId: "user-b",
        templateKey: "template-a",
        fileName: "B-001-v1.pdf",
        storageKey: "documents/tenant-b/version-b/sent.pdf",
        mimeType: "application/pdf",
        checksum: "tenant-b-checksum",
        visibleTotalsSnapshot: {},
      },
    );
    const auditCountBeforeSend = auditLogs.length;

    await expect(
      data.sendTenantQuote({ tenantId: "tenant-a" }, "quote-a", {
        actorUserId: "user-a",
        documentId: tenantBDocument!.id,
      }),
    ).resolves.toBeNull();
    expect(auditLogs).toHaveLength(auditCountBeforeSend);
  });

  it("rejects door item edits and deletes after the draft version is locked", async () => {
    const data = createTenantDataAccess(testClient());
    const created = await data.createTenantQuoteItem(
      { tenantId: "tenant-a" },
      "quote-a",
      doorQuoteItemInput(),
    );

    expect(created).not.toBeNull();
    await data.lockTenantQuoteVersion({ tenantId: "tenant-a" }, "quote-a", {
      actorUserId: "user-a",
    });
    await expect(
      data.updateTenantQuoteItem({ tenantId: "tenant-a" }, created!.id, {
        customerDescription: "Blocked locked door edit",
      }),
    ).resolves.toBeNull();
    await expect(
      data.deleteTenantQuoteItem({ tenantId: "tenant-a" }, created!.id),
    ).resolves.toBeNull();
  });

  it("creates a revision from a locked version while preserving the old version and copying item snapshots", async () => {
    const auditLogs: AuditLog[] = [];
    const data = createTenantDataAccess(testClient({ auditLogs }));
    const sourceVersionBefore = await data.getTenantQuoteVersion(
      { tenantId: "tenant-a" },
      "version-locked",
    );
    const sourceItemBefore = await data.getTenantQuoteItem(
      { tenantId: "tenant-a" },
      "item-locked",
    );
    const result = await data.createTenantQuoteRevision(
      { tenantId: "tenant-a" },
      "quote-locked",
      { actorUserId: "user-a" },
    );

    expect(result).toMatchObject({
      quote: {
        id: "quote-locked",
        status: QuoteStatus.REVISED,
        currentVersionId: result?.currentVersion.id,
      },
      sourceVersion: {
        id: "version-locked",
        status: QuoteVersionStatus.SENT,
        isLocked: true,
      },
      currentVersion: {
        tenantId: "tenant-a",
        quoteId: "quote-locked",
        versionNumber: 2,
        status: QuoteVersionStatus.DRAFT,
        isLocked: false,
      },
    });
    expect(result?.currentVersion.id).not.toBe("version-locked");
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0]).toMatchObject({
      tenantId: "tenant-a",
      quoteVersionId: result?.currentVersion.id,
      type: QuoteItemType.CUSTOM,
      quantity: 1,
      customerDescription: "Locked custom line",
      configurationSnapshot: { kind: "custom-line" },
      totalsSnapshot: { subtotalMinor: 0, vatMinor: 0, totalMinor: 0 },
    });
    expect(result?.items[0]?.id).not.toBe("item-locked");
    await expect(
      data.getTenantQuoteVersion({ tenantId: "tenant-a" }, "version-locked"),
    ).resolves.toEqual(sourceVersionBefore);
    await expect(
      data.getTenantQuoteItem({ tenantId: "tenant-a" }, "item-locked"),
    ).resolves.toEqual(sourceItemBefore);
    await expect(
      data.getTenantQuoteWithCurrentVersion(
        { tenantId: "tenant-a" },
        "quote-locked",
      ),
    ).resolves.toMatchObject({
      quote: {
        currentVersionId: result?.currentVersion.id,
        status: QuoteStatus.REVISED,
      },
      currentVersion: {
        id: result?.currentVersion.id,
        status: QuoteVersionStatus.DRAFT,
      },
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({
      tenantId: "tenant-a",
      actorUserId: "user-a",
      action: AuditAction.QUOTE_VERSION_CREATED,
      entityType: "QuoteVersion",
      entityId: result?.currentVersion.id,
      metadata: {
        quoteId: "quote-locked",
        sourceVersionId: "version-locked",
        copiedItemCount: 1,
      },
    });
  });

  it("rejects cross-tenant lock and revision attempts", async () => {
    const auditLogs: AuditLog[] = [];
    const data = createTenantDataAccess(testClient({ auditLogs }));

    await expect(
      data.lockTenantQuoteVersion({ tenantId: "tenant-a" }, "quote-b", {
        actorUserId: "user-a",
      }),
    ).resolves.toBeNull();
    await expect(
      data.createTenantQuoteRevision({ tenantId: "tenant-a" }, "quote-b", {
        actorUserId: "user-a",
      }),
    ).resolves.toBeNull();
    expect(auditLogs).toHaveLength(0);
  });

  it("rejects cross-tenant quote item access and mutations", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.getTenantQuoteItem({ tenantId: "tenant-a" }, "item-b"),
    ).resolves.toBeNull();
    await expect(
      data.listTenantQuoteItems({ tenantId: "tenant-a" }, "version-b"),
    ).resolves.toEqual([]);
    await expect(
      data.updateTenantQuoteItem({ tenantId: "tenant-a" }, "item-b", {
        customerDescription: "Blocked edit",
      }),
    ).resolves.toBeNull();
    await expect(
      data.deleteTenantQuoteItem({ tenantId: "tenant-a" }, "item-b"),
    ).resolves.toBeNull();
    await expect(
      data.applyTenantQuoteItemManualOverride(
        { tenantId: "tenant-a" },
        "item-b",
        {
          amountMinor: 20_000,
          reason: "Blocked cross-tenant override",
          actorUserId: "user-a",
        },
      ),
    ).resolves.toBeNull();
    await expect(
      data.applyTenantQuoteDiscount({ tenantId: "tenant-a" }, "quote-b", {
        amountMinor: 1_000,
        reason: "Blocked cross-tenant discount",
        actorUserId: "user-a",
      }),
    ).resolves.toBeNull();
  });

  it("rejects cross-tenant door item access and mutations", async () => {
    const data = createTenantDataAccess(testClient());
    const tenantBDoor = await data.createTenantQuoteItem(
      { tenantId: "tenant-b" },
      "quote-b",
      doorQuoteItemInput({ customerDescription: "Ușă tenant B" }),
    );

    expect(tenantBDoor).toMatchObject({
      tenantId: "tenant-b",
      type: QuoteItemType.DOOR,
    });
    await expect(
      data.getTenantQuoteItem({ tenantId: "tenant-a" }, tenantBDoor!.id),
    ).resolves.toBeNull();
    await expect(
      data.updateTenantQuoteItem({ tenantId: "tenant-a" }, tenantBDoor!.id, {
        customerDescription: "Blocked cross-tenant door edit",
      }),
    ).resolves.toBeNull();
    await expect(
      data.deleteTenantQuoteItem({ tenantId: "tenant-a" }, tenantBDoor!.id),
    ).resolves.toBeNull();
  });

  it("creates tenant-scoped quote PDF document metadata with an audit entry", async () => {
    const auditLogs: AuditLog[] = [];
    const data = createTenantDataAccess(testClient({ auditLogs }));
    const document = await data.createTenantQuoteDocument(
      { tenantId: "tenant-a" },
      "version-locked",
      {
        actorUserId: "user-a",
        templateKey: "template-a",
        fileName: "A-locked-v1.pdf",
        storageKey: "documents/tenant-a/version-locked/example.pdf",
        mimeType: "application/pdf",
        checksum: "abc123",
        visibleTotalsSnapshot: {
          subtotalMinor: 0,
          vatMinor: 0,
          totalMinor: 0,
          currency: "RON",
        },
      },
    );

    expect(document).toMatchObject({
      tenantId: "tenant-a",
      quoteVersionId: "version-locked",
      fileName: "A-locked-v1.pdf",
      storageKey: "documents/tenant-a/version-locked/example.pdf",
    });
    await expect(
      data.listTenantQuoteDocuments({ tenantId: "tenant-a" }, "version-locked"),
    ).resolves.toMatchObject([
      {
        id: document?.id,
        tenantId: "tenant-a",
      },
    ]);
    await expect(
      data.createTenantQuoteDocument({ tenantId: "tenant-a" }, "version-b", {
        actorUserId: "user-a",
        templateKey: "template-a",
        fileName: "blocked.pdf",
        storageKey: "documents/tenant-b/version-b/blocked.pdf",
        mimeType: "application/pdf",
        checksum: "blocked",
        visibleTotalsSnapshot: {},
      }),
    ).resolves.toBeNull();
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({
      action: AuditAction.DOCUMENT_GENERATED,
      entityType: "Document",
      entityId: document?.id,
      tenantId: "tenant-a",
      actorUserId: "user-a",
    });
  });
});

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function doorQuoteItemInput(
  overrides: {
    customerDescription?: string;
    heightMm?: number;
    panelDescription?: string;
    quantity?: number;
    widthMm?: number;
  } = {},
) {
  const quantity = overrides.quantity ?? 1;
  const widthMm = overrides.widthMm ?? 900;
  const heightMm = overrides.heightMm ?? 2100;
  const panelDescription = overrides.panelDescription ?? "Panou decorativ";

  return {
    type: QuoteItemType.DOOR,
    quantity,
    widthMm,
    heightMm,
    customerDescription: overrides.customerDescription ?? "Ușă intrare",
    internalNotes: "Door synthetic internal note",
    configurationSnapshot: {
      kind: "door",
      quantity,
      widthMm,
      heightMm,
      panel: {
        description: panelDescription,
        manualPricing: {
          unitPriceMinor: 12_000,
          currency: "RON",
          source: "explicit-manual-panel-snapshot",
        },
      },
      source: "quote-item-draft-editor",
    },
    catalogSnapshot: {
      source: "tenant-catalog",
      snapshotVersion: "cod-028-door-catalog-v1",
      panel: {
        description: panelDescription,
        manualPricing: {
          unitPriceMinor: 12_000,
          currency: "RON",
          isFormula: false,
        },
      },
      requiresBusinessValidation: true,
    },
    totalsSnapshot: {
      subtotalMinor: 0,
      vatMinor: 0,
      totalMinor: 0,
      pendingCalculation: true,
    },
  };
}
