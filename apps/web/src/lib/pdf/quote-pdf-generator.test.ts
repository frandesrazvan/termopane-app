import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  AuditAction,
  DocumentType,
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
  type QuoteVersion,
  type ServiceItem,
  type Supplier,
  type TaxRate,
} from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTenantDataAccess, type TenantDataClient } from "../data";
import { resolveLocalDocumentPath } from "./local-document-storage";
import { generateTenantQuotePdf } from "./quote-pdf-generator";

type TenantRecord = {
  id: string;
  tenantId: string;
};

type TestState = {
  auditLogs: AuditLog[];
  client: TenantDataClient;
  documents: Document[];
};

let storageRoot: string;

beforeEach(async () => {
  storageRoot = await mkdtemp(path.join(tmpdir(), "termopane-pdf-test-"));
});

afterEach(async () => {
  await rm(storageRoot, { force: true, recursive: true });
});

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
        createdAt: new Date("2026-06-25T12:00:00.000Z"),
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

function testState(): TestState {
  const documents: Document[] = [];
  const auditLogs: AuditLog[] = [];
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
    quoteVersion: delegate([
      quoteVersion(),
      quoteVersion({ id: "version-b", tenantId: "tenant-b", quoteId: "quote-b" }),
      quoteVersion({
        id: "version-draft",
        status: QuoteVersionStatus.DRAFT,
        isLocked: false,
        lockedAt: null,
      }),
    ]),
    quoteItem: delegate([
      quoteItem(),
      quoteItem({ id: "item-b", tenantId: "tenant-b", quoteVersionId: "version-b" }),
    ]),
    quoteCalculationResult: delegate([] as QuoteCalculationResult[]),
    document: delegate(documents),
    auditLog: delegate(auditLogs),
    companySettings: delegate([] as CompanySettings[]),
    serviceItem: delegate([] as ServiceItem[]),
    supplier: delegate([] as Supplier[]),
    taxRate: delegate([] as TaxRate[]),
  };

  client.$transaction = async (operation) => operation(client);

  return {
    auditLogs,
    client,
    documents,
  };
}

describe("quote PDF generation", () => {
  it("creates a tenant-owned Document record and local PDF file", async () => {
    const state = testState();
    const result = await generateTenantQuotePdf(
      { tenantId: "tenant-a" },
      "quote-a",
      "version-a",
      generatorOptions(state.client, "first"),
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error(result.reason);
    }

    expect(state.documents).toHaveLength(1);
    expect(result.document).toMatchObject({
      tenantId: "tenant-a",
      quoteVersionId: "version-a",
      type: DocumentType.QUOTE_PDF,
      templateKey: "template-a",
      fileName: "Q-001-v1.pdf",
      mimeType: "application/pdf",
      generatedById: "user-a",
      checksum: result.checksum,
    });
    await expect(
      readFile(resolveLocalDocumentPath(result.storageKey, { rootDir: storageRoot }), "utf8"),
    ).resolves.toContain("%PDF-1.4");
    expect(state.auditLogs).toHaveLength(1);
    expect(state.auditLogs[0]).toMatchObject({
      action: AuditAction.DOCUMENT_GENERATED,
      entityType: "Document",
      entityId: result.document.id,
      tenantId: "tenant-a",
      actorUserId: "user-a",
    });
  });

  it("stores visible totals from the quote version snapshot", async () => {
    const state = testState();
    const result = await generateTenantQuotePdf(
      { tenantId: "tenant-a" },
      "quote-a",
      "version-a",
      generatorOptions(state.client, "totals"),
    );

    expect(result.ok).toBe(true);
    expect(state.documents[0]?.visibleTotalsSnapshot).toMatchObject({
      subtotalMinor: 10_000,
      vatMinor: 1_900,
      totalMinor: 11_900,
      currency: "RON",
      quoteVersionId: "version-a",
      documentType: DocumentType.QUOTE_PDF,
    });
  });

  it("creates Template B documents with compact customer-safe PDF output", async () => {
    const state = testState();
    const result = await generateTenantQuotePdf(
      { tenantId: "tenant-a" },
      "quote-a",
      "version-a",
      {
        ...generatorOptions(state.client, "template-b"),
        templateKey: "template-b",
        renderPdf: undefined,
      },
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error(result.reason);
    }

    expect(result.document).toMatchObject({
      tenantId: "tenant-a",
      quoteVersionId: "version-a",
      type: DocumentType.QUOTE_PDF,
      templateKey: "template-b",
      fileName: "Q-001-v1-template-b.pdf",
      mimeType: "application/pdf",
    });
    expect(state.documents[0]?.visibleTotalsSnapshot).toMatchObject({
      source: "template-b-pdf",
      templateKey: "template-b",
      totalMinor: 11_900,
      itemCount: 1,
    });

    const pdfText = await readFile(
      resolveLocalDocumentPath(result.storageKey, { rootDir: storageRoot }),
      "utf8",
    );

    expect(pdfText).toContain(pdfHexText("Template B compact"));
    expect(pdfText).toContain(pdfHexText("Valoare totală document"));
    expect(pdfText).not.toContain("Internal cost note");
    expect(pdfText).not.toContain("materialCostMinor");
  });

  it("rejects cross-tenant generation", async () => {
    const state = testState();
    const result = await generateTenantQuotePdf(
      { tenantId: "tenant-a" },
      "quote-b",
      "version-b",
      generatorOptions(state.client, "blocked"),
    );

    expect(result).toEqual({ ok: false, reason: "not_found" });
    expect(state.documents).toHaveLength(0);
    expect(state.auditLogs).toHaveLength(0);
  });

  it("rejects draft quote version generation", async () => {
    const state = testState();
    const result = await generateTenantQuotePdf(
      { tenantId: "tenant-a" },
      "quote-a",
      "version-draft",
      generatorOptions(state.client, "draft"),
    );

    expect(result).toEqual({ ok: false, reason: "not_locked" });
    expect(state.documents).toHaveLength(0);
  });

  it("creates a new Document record when regenerating", async () => {
    const state = testState();
    const first = await generateTenantQuotePdf(
      { tenantId: "tenant-a" },
      "quote-a",
      "version-a",
      generatorOptions(state.client, "first"),
    );
    const second = await generateTenantQuotePdf(
      { tenantId: "tenant-a" },
      "quote-a",
      "version-a",
      generatorOptions(state.client, "second"),
    );

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(state.documents).toHaveLength(2);

    if (first.ok && second.ok) {
      expect(second.document.id).not.toBe(first.document.id);
      expect(second.storageKey).not.toBe(first.storageKey);
    }
  });

  it("resolves download metadata only inside tenant and quote boundaries", async () => {
    const state = testState();
    const result = await generateTenantQuotePdf(
      { tenantId: "tenant-a" },
      "quote-a",
      "version-a",
      generatorOptions(state.client, "download"),
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error(result.reason);
    }

    const data = createTenantDataAccess(state.client);

    await expect(
      data.getTenantQuoteDocument({ tenantId: "tenant-a" }, "quote-a", result.document.id),
    ).resolves.toMatchObject({
      document: {
        id: result.document.id,
        tenantId: "tenant-a",
      },
      quoteVersion: {
        id: "version-a",
      },
    });
    await expect(
      data.getTenantQuoteDocument({ tenantId: "tenant-b" }, "quote-a", result.document.id),
    ).resolves.toBeNull();
    await expect(
      data.getTenantQuoteDocument({ tenantId: "tenant-a" }, "quote-b", result.document.id),
    ).resolves.toBeNull();
  });
});

function generatorOptions(client: TenantDataClient, nonce: string) {
  return {
    actorUserId: "user-a",
    client,
    nonce: () => nonce,
    now: () => new Date("2026-06-25T12:00:00.000Z"),
    renderPdf: () => new TextEncoder().encode("%PDF-1.4\nSynthetic PDF\n"),
    rootDir: storageRoot,
  };
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
    status: QuoteStatus.SENT,
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
    status: QuoteVersionStatus.LOCKED,
    isLocked: true,
    currency: "RON",
    customerSnapshot: {
      displayName: "Synthetic Customer",
    },
    companySettingsSnapshot: {
      displayName: "Synthetic Company",
      offerValidityDays: 30,
    },
    priceSnapshot: null,
    itemSnapshot: { items: [] },
    totalsSnapshot: {
      subtotalMinor: 10_000,
      vatMinor: 1_900,
      totalMinor: 11_900,
    },
    warningsSnapshot: [],
    traceSummary: {},
    subtotalMinor: 10_000,
    vatMinor: 1_900,
    totalMinor: 11_900,
    lockedAt: new Date("2026-06-25T10:00:00.000Z"),
    sentAt: null,
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
    ...overrides,
  } as unknown as QuoteVersion;
}

function quoteItem(overrides: Partial<QuoteItem> = {}) {
  return {
    id: "item-a",
    tenantId: "tenant-a",
    quoteVersionId: "version-a",
    type: QuoteItemType.CUSTOM,
    sortOrder: 0,
    quantity: 1,
    widthMm: null,
    heightMm: null,
    customerDescription: "Synthetic service",
    internalNotes: "Internal cost note must not render",
    configurationSnapshot: {
      kind: "custom-line",
      manualPricing: {
        unitPriceMinor: 10_000,
      },
    },
    catalogSnapshot: null,
    calculationSnapshot: null,
    totalsSnapshot: {
      subtotalMinor: 10_000,
      vatMinor: 1_900,
      totalMinor: 11_900,
    },
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
    ...overrides,
  } as unknown as QuoteItem;
}

function pdfHexText(value: string) {
  let hex = "FEFF";

  for (let index = 0; index < value.length; index += 1) {
    hex += value.charCodeAt(index).toString(16).padStart(4, "0").toUpperCase();
  }

  return `<${hex}>`;
}
