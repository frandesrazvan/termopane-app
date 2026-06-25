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
  QuoteStatus,
  QuoteVersionStatus,
  ServiceItem,
  Supplier,
  TaxRate,
  type CompanySettings,
  type Customer,
  type Project,
  type Quote,
  type QuoteCalculationResult,
  type QuoteItem,
  type QuoteVersion,
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
    async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
      const record = records.find((candidate) => candidate.id === where.id);

      if (!record) {
        throw new Error(`Record ${where.id} was not found.`);
      }

      Object.assign(record, data);

      return record;
    },
    async delete({ where }: { where: { id: string } }) {
      const recordIndex = records.findIndex((candidate) => candidate.id === where.id);

      if (recordIndex === -1) {
        throw new Error(`Record ${where.id} was not found.`);
      }

      const [record] = records.splice(recordIndex, 1);

      return record;
    },
  };
}

function uniqueConstraintError(target: string[]) {
  return Object.assign(new Error(`Unique constraint failed on ${target.join(", ")}`), {
    code: "P2002",
    meta: { target },
  });
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
      const comparableValue = recordValue instanceof Date ? recordValue.getTime() : Number(recordValue);
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

function isRangeFilter(value: unknown): value is { gte?: Date | number; lte?: Date | number } {
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
      { id: "project-a", tenantId: "tenant-a", customerId: "customer-a", name: "A Project" },
      { id: "project-b", tenantId: "tenant-b", customerId: "customer-b", name: "B Project" },
      { id: "project-c", tenantId: "tenant-a", customerId: "customer-c", name: "C Project" },
    ] as Project[]),
    quote: delegate([
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
    ] as Quote[], { unique: [["tenantId", "quoteNumber"]] }),
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
    auditLog: delegate(options.auditLogs ?? ([] as AuditLog[])),
    companySettings: delegate([
      {
        id: "settings-a",
        tenantId: "tenant-a",
        legalName: "Tenant A SRL",
        displayName: "Tenant A",
        defaultCurrency: "RON",
      },
    ] as CompanySettings[]),
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
      expect.arrayContaining([expect.objectContaining({ id: "supplier-a", tenantId: "tenant-a" })]),
    );
    expect(suppliers).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: "supplier-b" })]));
    await expect(data.getTenantSupplier({ tenantId: "tenant-a" }, "supplier-b")).resolves.toBeNull();
    await expect(
      data.createTenantSupplier({ tenantId: "tenant-a" }, { name: "New Supplier", code: "SUP-NEW" }),
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
    ).resolves.toMatchObject({ id: "supplier-a", tenantId: "tenant-a", name: "Updated Supplier" });
    await expect(
      data.updateTenantSupplier({ tenantId: "tenant-a" }, "supplier-b", {
        name: "Blocked Supplier",
      }),
    ).resolves.toBeNull();

    const archived = await data.archiveTenantSupplier({ tenantId: "tenant-a" }, "supplier-a");

    expect(archived).toMatchObject({ id: "supplier-a", tenantId: "tenant-a", isActive: false });
    expect(archived?.deletedAt).toBeInstanceOf(Date);
    await expect(data.getTenantSupplier({ tenantId: "tenant-a" }, "supplier-a")).resolves.toMatchObject({
      id: "supplier-a",
      isActive: false,
      deletedAt: expect.any(Date),
    });
  });

  it("manages profile systems and profile items with tenant-scoped parent validation", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(data.listTenantProfileSystems({ tenantId: "tenant-a" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "profile-system-a", tenantId: "tenant-a" })]),
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

    await expect(data.listTenantProfileItems({ tenantId: "tenant-a" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "profile-item-a", tenantId: "tenant-a" })]),
    );
    await expect(data.getTenantProfileItem({ tenantId: "tenant-a" }, "profile-item-b")).resolves.toBeNull();
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
      data.updateTenantProfileItem(
        { tenantId: "tenant-a" },
        "profile-item-a",
        {
          profileSystemId: "profile-system-a",
          supplierId: "supplier-a",
          name: "Frame A Updated",
          code: "FRAME-A",
          type: ProfileItemType.FRAME,
          unit: CatalogUnit.LINEAR_METER,
        },
      ),
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

    await expect(data.listTenantGlassPackages({ tenantId: "tenant-a" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "glass-a", tenantId: "tenant-a" })]),
    );
    await expect(data.getTenantGlassPackage({ tenantId: "tenant-a" }, "glass-b")).resolves.toBeNull();
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
    ).resolves.toMatchObject({ tenantId: "tenant-a", supplierId: "supplier-a" });
    await expect(
      data.updateTenantGlassPackage(
        { tenantId: "tenant-a" },
        "glass-a",
        {
          supplierId: "supplier-a",
          name: "Glass A Updated",
          code: "GL-A",
          unit: CatalogUnit.SQUARE_METER,
        },
      ),
    ).resolves.toMatchObject({ id: "glass-a", name: "Glass A Updated" });
    expect((await data.archiveTenantGlassPackage({ tenantId: "tenant-a" }, "glass-a"))?.deletedAt).toBeInstanceOf(Date);

    await expect(data.listTenantAccessories({ tenantId: "tenant-a" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "accessory-a", tenantId: "tenant-a" })]),
    );
    await expect(data.getTenantAccessory({ tenantId: "tenant-a" }, "accessory-b")).resolves.toBeNull();
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
      data.updateTenantAccessory(
        { tenantId: "tenant-a" },
        "accessory-a",
        {
          supplierId: "supplier-a",
          name: "Sill A Updated",
          code: "SILL-A",
          unit: CatalogUnit.LINEAR_METER,
        },
      ),
    ).resolves.toMatchObject({ id: "accessory-a", name: "Sill A Updated" });
    expect((await data.archiveTenantAccessory({ tenantId: "tenant-a" }, "accessory-a"))?.deletedAt).toBeInstanceOf(Date);

    await expect(data.listTenantServiceItems({ tenantId: "tenant-a" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "service-a", tenantId: "tenant-a" })]),
    );
    await expect(data.getTenantServiceItem({ tenantId: "tenant-a" }, "service-b")).resolves.toBeNull();
    await expect(
      data.createTenantServiceItem(
        { tenantId: "tenant-a" },
        { name: "Transport A", code: "TRANSPORT-A", unit: CatalogUnit.FIXED },
      ),
    ).resolves.toMatchObject({ tenantId: "tenant-a", name: "Transport A" });
    await expect(
      data.updateTenantServiceItem(
        { tenantId: "tenant-a" },
        "service-a",
        { name: "Installation A Updated", code: "INSTALL-A", unit: CatalogUnit.FIXED },
      ),
    ).resolves.toMatchObject({ id: "service-a", name: "Installation A Updated" });
    expect((await data.archiveTenantServiceItem({ tenantId: "tenant-a" }, "service-a"))?.deletedAt).toBeInstanceOf(Date);

    await expect(data.listTenantTaxRates({ tenantId: "tenant-a" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "tax-a", tenantId: "tenant-a" })]),
    );
    await expect(data.getTenantTaxRate({ tenantId: "tenant-a" }, "tax-b")).resolves.toBeNull();
    await expect(
      data.createTenantTaxRate(
        { tenantId: "tenant-a" },
        { name: "Reduced VAT", code: "VAT-RED", rateBasisPoints: 900 },
      ),
    ).resolves.toMatchObject({ tenantId: "tenant-a", rateBasisPoints: 900 });
    await expect(
      data.updateTenantTaxRate(
        { tenantId: "tenant-a" },
        "tax-a",
        { name: "VAT A Updated", code: "VAT-A", rateBasisPoints: 1900, isDefault: true },
      ),
    ).resolves.toMatchObject({ id: "tax-a", name: "VAT A Updated", isDefault: true });
    expect((await data.archiveTenantTaxRate({ tenantId: "tenant-a" }, "tax-a"))?.deletedAt).toBeInstanceOf(Date);
  });

  it("manages price-list items and lists price lists and pricing rules inside the tenant", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(data.listTenantPriceLists({ tenantId: "tenant-a" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "price-list-a", tenantId: "tenant-a" })]),
    );
    await expect(data.listTenantPriceLists({ tenantId: "tenant-a" })).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "price-list-b" })]),
    );
    await expect(
      data.listTenantPricingRules({ tenantId: "tenant-a" }, { priceListId: "price-list-a" }),
    ).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "pricing-rule-a", tenantId: "tenant-a" })]),
    );
    await expect(
      data.listTenantPricingRules({ tenantId: "tenant-a" }, { priceListId: "price-list-b" }),
    ).resolves.toEqual([]);
    await expect(data.listTenantPriceListItems({ tenantId: "tenant-a" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "price-item-a", tenantId: "tenant-a" })]),
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
      data.updateTenantPriceListItem(
        { tenantId: "tenant-a" },
        "price-item-a",
        {
          priceListId: "price-list-a",
          itemType: PriceListItemType.ACCESSORY,
          catalogItemId: "accessory-a",
          unit: CatalogUnit.LINEAR_METER,
          costMinor: 120,
          saleMinor: 180,
          currency: "RON",
        },
      ),
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

    await expect(data.getTenantCustomer({ tenantId: "tenant-a" }, "customer-b")).resolves.toBeNull();
    expect(customers).toEqual(
      expect.arrayContaining([{ id: "customer-a", tenantId: "tenant-a", displayName: "A Customer", contactName: "Alice Contact" }]),
    );
    expect(customers).not.toEqual(expect.arrayContaining([{ id: "customer-b" }]));
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
    ).resolves.toMatchObject({ displayName: "Updated Customer", tenantId: "tenant-a" });
    await expect(
      data.updateTenantCustomer({ tenantId: "tenant-a" }, "customer-b", {
        displayName: "Blocked Customer",
      }),
    ).resolves.toBeNull();
    await expect(data.getTenantCustomer({ tenantId: "tenant-b" }, "customer-b")).resolves.toMatchObject({
      displayName: "B Customer",
    });
  });

  it("does not return projects across tenant boundaries", async () => {
    const data = createTenantDataAccess(testClient());
    const projects = await data.listTenantProjects({ tenantId: "tenant-a" });

    await expect(data.getTenantProject({ tenantId: "tenant-a" }, "project-b")).resolves.toBeNull();
    expect(projects).toEqual(
      expect.arrayContaining([{ id: "project-a", tenantId: "tenant-a", customerId: "customer-a", name: "A Project" }]),
    );
    expect(projects).not.toEqual(expect.arrayContaining([{ id: "project-b" }]));
  });

  it("lists projects by customer inside the tenant boundary", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.listTenantProjects({ tenantId: "tenant-a" }, { customerId: "customer-a" }),
    ).resolves.toMatchObject([{ id: "project-a", tenantId: "tenant-a" }]);
    await expect(
      data.listTenantProjects({ tenantId: "tenant-a" }, { customerId: "customer-b" }),
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

    await expect(data.getTenantQuote({ tenantId: "tenant-a" }, "quote-b")).resolves.toBeNull();
    expect(quotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "quote-a", tenantId: "tenant-a", customerId: "customer-a" }),
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
        expect.objectContaining({ id: "quote-a", tenantId: "tenant-a", customerId: "customer-a" }),
      ]),
    );
    expect(customerQuotes).not.toEqual(expect.arrayContaining([{ id: "quote-b" }]));
    await expect(
      data.listTenantQuotes({ tenantId: "tenant-a" }, { status: QuoteStatus.SENT }),
    ).resolves.toMatchObject([{ id: "quote-locked", tenantId: "tenant-a" }]);
    await expect(
      data.listTenantQuotes({ tenantId: "tenant-a" }, { createdById: "user-a" }),
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
      {
        quoteNumberGenerator: () => "A-transaction",
      },
    );

    await expect(
      data.createTenantQuoteDraft({ tenantId: "tenant-a" }, { customerId: "customer-a" }),
    ).resolves.toMatchObject({
      quote: {
        tenantId: "tenant-a",
        quoteNumber: "A-transaction",
      },
      currentVersion: {
        tenantId: "tenant-a",
        versionNumber: 1,
      },
    });
    expect(transactionCount).toBe(1);
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
        { customerId: "customer-a", projectId: "project-b", quoteNumber: "A-004" },
      ),
    ).resolves.toBeNull();
  });

  it("retries generated quote numbers when a tenant-scoped collision occurs", async () => {
    const generatedNumbers = ["A-001", "A-002"];
    const data = createTenantDataAccess(testClient(), {
      quoteNumberGenerator: () => generatedNumbers.shift() ?? "A-003",
    });
    const result = await data.createTenantQuoteDraft(
      { tenantId: "tenant-a" },
      { customerId: "customer-a", createdById: "user-a" },
    );

    expect(result?.quote).toMatchObject({
      tenantId: "tenant-a",
      quoteNumber: "A-002",
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

    await expect(data.listTenantQuoteVersions({ tenantId: "tenant-a" }, "quote-a")).resolves.toMatchObject([
      { id: "version-a", tenantId: "tenant-a", quoteId: "quote-a" },
    ]);
    await expect(data.listTenantQuoteVersions({ tenantId: "tenant-a" }, "quote-b")).resolves.toEqual([]);
  });

  it("returns a tenant quote with its current version after validating customer and project links", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.getTenantQuoteWithCurrentVersion({ tenantId: "tenant-a" }, "quote-a"),
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
      data.getTenantQuoteWithCurrentVersion({ tenantId: "tenant-a" }, "quote-b"),
    ).resolves.toBeNull();
    await expect(
      data.getTenantQuoteWithCurrentVersion({ tenantId: "tenant-a" }, "quote-mismatch"),
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
    await expect(data.listTenantQuoteItems({ tenantId: "tenant-a" }, "version-a")).resolves.toHaveLength(2);
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

  it("deletes an item in the same tenant and current draft version", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.deleteTenantQuoteItem({ tenantId: "tenant-a" }, "item-a"),
    ).resolves.toMatchObject({
      id: "item-a",
      tenantId: "tenant-a",
    });
    await expect(data.getTenantQuoteItem({ tenantId: "tenant-a" }, "item-a")).resolves.toBeNull();
  });

  it("rejects item mutations on locked or sent quote versions", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.createTenantQuoteItem(
        { tenantId: "tenant-a" },
        "quote-locked",
        {
          type: QuoteItemType.CUSTOM,
          quantity: 1,
          customerDescription: "Blocked custom line",
          configurationSnapshot: { kind: "custom-line" },
        },
      ),
    ).resolves.toBeNull();
    await expect(
      data.updateTenantQuoteItem({ tenantId: "tenant-a" }, "item-locked", {
        customerDescription: "Blocked edit",
      }),
    ).resolves.toBeNull();
    await expect(
      data.deleteTenantQuoteItem({ tenantId: "tenant-a" }, "item-locked"),
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
    await expect(data.deleteTenantQuoteItem({ tenantId: "tenant-a" }, "item-a")).resolves.toBeNull();
    await expect(
      data.updateTenantQuoteVersionCalculation({ tenantId: "tenant-a" }, "version-a", {
        subtotalMinor: 100,
        vatMinor: 19,
        totalMinor: 119,
        totalsSnapshot: { totalMinor: 119 },
        warningsSnapshot: [],
        traceSummary: { source: "blocked-test" },
      }),
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

  it("creates a revision from a locked version while preserving the old version and copying item snapshots", async () => {
    const auditLogs: AuditLog[] = [];
    const data = createTenantDataAccess(testClient({ auditLogs }));
    const sourceVersionBefore = await data.getTenantQuoteVersion({ tenantId: "tenant-a" }, "version-locked");
    const sourceItemBefore = await data.getTenantQuoteItem({ tenantId: "tenant-a" }, "item-locked");
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
    await expect(data.getTenantQuoteItem({ tenantId: "tenant-a" }, "item-locked")).resolves.toEqual(
      sourceItemBefore,
    );
    await expect(
      data.getTenantQuoteWithCurrentVersion({ tenantId: "tenant-a" }, "quote-locked"),
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

    await expect(data.getTenantQuoteItem({ tenantId: "tenant-a" }, "item-b")).resolves.toBeNull();
    await expect(data.listTenantQuoteItems({ tenantId: "tenant-a" }, "version-b")).resolves.toEqual([]);
    await expect(
      data.updateTenantQuoteItem({ tenantId: "tenant-a" }, "item-b", {
        customerDescription: "Blocked edit",
      }),
    ).resolves.toBeNull();
    await expect(data.deleteTenantQuoteItem({ tenantId: "tenant-a" }, "item-b")).resolves.toBeNull();
  });
});
