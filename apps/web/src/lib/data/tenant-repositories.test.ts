import type { Customer, Project, Quote, QuoteVersion } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { createTenantDataAccess, tenantIdFromScope, type TenantDataClient } from "./tenant-repositories";

type TenantRecord = {
  id: string;
  tenantId: string;
};

function delegate<TRecord extends TenantRecord>(records: TRecord[]) {
  return {
    async findFirst({ where }: { where: Record<string, unknown> }) {
      return records.find((record) => matchesWhere(record, where)) ?? null;
    },
    async findMany({ where }: { where: Record<string, unknown> }) {
      return records.filter((record) => matchesWhere(record, where));
    },
  };
}

function matchesWhere<TRecord extends TenantRecord>(
  record: TRecord,
  where: Record<string, unknown>,
) {
  return Object.entries(where).every(([key, value]) => record[key as keyof TRecord] === value);
}

function testClient(): TenantDataClient {
  return {
    customer: delegate([
      { id: "customer-a", tenantId: "tenant-a", displayName: "A Customer" },
      { id: "customer-b", tenantId: "tenant-b", displayName: "B Customer" },
    ] as Customer[]),
    project: delegate([
      { id: "project-a", tenantId: "tenant-a", customerId: "customer-a", name: "A Project" },
      { id: "project-b", tenantId: "tenant-b", customerId: "customer-b", name: "B Project" },
    ] as Project[]),
    quote: delegate([
      { id: "quote-a", tenantId: "tenant-a", quoteNumber: "A-001" },
      { id: "quote-b", tenantId: "tenant-b", quoteNumber: "B-001" },
    ] as Quote[]),
    quoteVersion: delegate([
      { id: "version-a", tenantId: "tenant-a", quoteId: "quote-a", versionNumber: 1 },
      { id: "version-b", tenantId: "tenant-b", quoteId: "quote-b", versionNumber: 1 },
    ] as QuoteVersion[]),
  };
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

  it("does not return projects across tenant boundaries", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(data.getTenantProject({ tenantId: "tenant-a" }, "project-b")).resolves.toBeNull();
    await expect(data.listTenantProjects({ tenantId: "tenant-a" })).resolves.toMatchObject([
      { id: "project-a", tenantId: "tenant-a" },
    ]);
  });

  it("does not return quotes across tenant boundaries", async () => {
    const data = createTenantDataAccess(testClient());

    await expect(data.getTenantQuote({ tenantId: "tenant-a" }, "quote-b")).resolves.toBeNull();
    await expect(data.listTenantQuotes({ tenantId: "tenant-a" })).resolves.toMatchObject([
      { id: "quote-a", tenantId: "tenant-a" },
    ]);
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
});
