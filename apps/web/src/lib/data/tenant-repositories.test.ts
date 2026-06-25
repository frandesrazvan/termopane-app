import {
  QuoteStatus,
  QuoteVersionStatus,
  type CompanySettings,
  type Customer,
  type Project,
  type Quote,
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

function testClient(options: { onTransaction?: () => void } = {}): TenantDataClient {
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
    ] as Customer[]),
    project: delegate([
      { id: "project-a", tenantId: "tenant-a", customerId: "customer-a", name: "A Project" },
      { id: "project-b", tenantId: "tenant-b", customerId: "customer-b", name: "B Project" },
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
    ] as Quote[], { unique: [["tenantId", "quoteNumber"]] }),
    quoteVersion: delegate([
      { id: "version-a", tenantId: "tenant-a", quoteId: "quote-a", versionNumber: 1 },
      { id: "version-b", tenantId: "tenant-b", quoteId: "quote-b", versionNumber: 1 },
    ] as QuoteVersion[]),
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

    await expect(data.getTenantCustomer({ tenantId: "tenant-a" }, "customer-b")).resolves.toBeNull();
    await expect(data.listTenantCustomers({ tenantId: "tenant-a" })).resolves.toMatchObject([
      { id: "customer-a", tenantId: "tenant-a" },
    ]);
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

    await expect(data.getTenantProject({ tenantId: "tenant-a" }, "project-b")).resolves.toBeNull();
    await expect(data.listTenantProjects({ tenantId: "tenant-a" })).resolves.toMatchObject([
      { id: "project-a", tenantId: "tenant-a" },
    ]);
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

    await expect(data.getTenantQuote({ tenantId: "tenant-a" }, "quote-b")).resolves.toBeNull();
    await expect(data.listTenantQuotes({ tenantId: "tenant-a" })).resolves.toMatchObject([
      { id: "quote-a", tenantId: "tenant-a" },
    ]);
  });

  it("filters saved quote lists inside the tenant boundary", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(
      data.listTenantQuotes({ tenantId: "tenant-a" }, { customerId: "customer-a" }),
    ).resolves.toMatchObject([{ id: "quote-a", tenantId: "tenant-a" }]);
    await expect(
      data.listTenantQuotes({ tenantId: "tenant-a" }, { status: QuoteStatus.SENT }),
    ).resolves.toEqual([]);
    await expect(
      data.listTenantQuotes({ tenantId: "tenant-a" }, { createdById: "user-a" }),
    ).resolves.toMatchObject([{ id: "quote-a", tenantId: "tenant-a" }]);
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
});
