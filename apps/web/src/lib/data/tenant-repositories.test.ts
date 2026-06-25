import {
  AuditAction,
  type AuditLog,
  QuoteItemType,
  QuoteStatus,
  QuoteVersionStatus,
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
