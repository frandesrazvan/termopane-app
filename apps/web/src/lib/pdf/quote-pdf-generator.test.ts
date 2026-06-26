import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  AuditAction,
  CatalogUnit,
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
  type QuoteNumberSettings,
  type QuoteVersion,
  type SavedFilter,
  type ServiceItem,
  type Supplier,
  type TaxRate,
  type UserPreference,
} from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTenantDataAccess, type TenantDataClient } from "../data";
import type { DocumentStorageProvider } from "./document-storage";
import { resolveLocalDocumentPath } from "./local-document-storage";
import { generateTenantQuotePdf } from "./quote-pdf-generator";
import {
  buildQuotePdfOfferSnapshot,
  defaultQuotePdfTemplateKeyFromVersion,
} from "./template-a-snapshot";

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
    quoteNumberSettings: delegate([] as QuoteNumberSettings[]),
    savedFilter: delegate([] as SavedFilter[]),
    serviceItem: delegate([] as ServiceItem[]),
    supplier: delegate([] as Supplier[]),
    taxRate: delegate([] as TaxRate[]),
    userPreference: delegate([] as UserPreference[]),
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

  it("uses the saved default PDF template when no explicit template is selected", async () => {
    const state = testState();
    await state.client.quoteVersion.update({
      where: { id: "version-a" },
      data: {
        companySettingsSnapshot: {
          displayName: "Synthetic Company",
          defaultPdfTemplate: "template-b",
          offerValidityDays: 30,
        },
      },
    });

    const result = await generateTenantQuotePdf(
      { tenantId: "tenant-a" },
      "quote-a",
      "version-a",
      generatorOptions(state.client, "default-template"),
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error(result.reason);
    }

    expect(result.document).toMatchObject({
      templateKey: "template-b",
      fileName: "Q-001-v1-template-b.pdf",
      visibleTotalsSnapshot: {
        source: "template-b-pdf",
        templateKey: "template-b",
      },
    });
  });

  it("uses the saved default PDF template for preview snapshots", () => {
    const version = quoteVersion({
      companySettingsSnapshot: {
        displayName: "Synthetic Company",
        defaultPdfTemplate: "template-b",
      },
    });
    const snapshot = buildQuotePdfOfferSnapshot(
      quote({}),
      version,
      [],
      defaultQuotePdfTemplateKeyFromVersion(version),
    );

    expect(snapshot.templateKey).toBe("template-b");
  });

  it("includes door customer-facing fields in preview snapshots without internal costs", () => {
    const snapshot = buildQuotePdfOfferSnapshot(
      quote({ id: "quote-door" }),
      quoteVersion({ id: "version-door", quoteId: "quote-door" }),
      [
        quoteItem({
          id: "item-door",
          type: QuoteItemType.DOOR,
          widthMm: 900,
          heightMm: 2100,
          customerDescription: "Ușă intrare cu panou",
          internalNotes: "Supplier cost must stay hidden",
          configurationSnapshot: {
            kind: "door",
            panel: {
              description: "Panou decorativ",
              manualPricing: {
                unitPriceMinor: 12_000,
              },
            },
            hardware: {
              description: "Mâner și yală",
            },
            internalMaterialCostMinor: 9_999_99,
          },
          catalogSnapshot: {
            glassPackage: {
              id: "glass-door",
              name: "Sticlă mată",
              compositionLabel: "4 / 16 / 4 mat",
            },
            panel: {
              description: "Panou decorativ",
            },
            hardwareKit: {
              id: "hardware-door",
              name: "Feronerie ușă",
            },
          },
          totalsSnapshot: {
            subtotalMinor: 20_000,
            vatMinor: 3_800,
            totalMinor: 23_800,
          },
        }),
      ],
    );
    const doorItem = snapshot.items[0];

    expect(doorItem).toMatchObject({
      itemTypeLabel: "Ușă",
      customerDescription: "Ușă intrare cu panou",
      widthMm: 900,
      heightMm: 2100,
      glassLabel: "Sticlă mată / Panou decorativ",
      hardwareLabel: "Feronerie ușă",
      totalMinor: 23_800,
    });
    expect(JSON.stringify(snapshot)).not.toContain("Supplier cost");
    expect(JSON.stringify(snapshot)).not.toContain("internalMaterialCostMinor");
  });

  it("includes accessory, service, transport, and installation catalog lines in preview snapshots", () => {
    const snapshot = buildQuotePdfOfferSnapshot(
      quote({ id: "quote-lines" }),
      quoteVersion({ id: "version-lines", quoteId: "quote-lines" }),
      [
        catalogLineQuoteItem({
          id: "line-accessory",
          kind: "accessory-line",
          label: "Glaf interior",
          quantity: 1.5,
          unit: CatalogUnit.LINEAR_METER,
          saleMinor: 2_400,
          totalMinor: 3_600,
        }),
        catalogLineQuoteItem({
          id: "line-service",
          kind: "service-line",
          label: "Demontare tamplarie",
          quantity: 1,
          unit: CatalogUnit.FIXED,
          saleMinor: 10_000,
          totalMinor: 10_000,
        }),
        catalogLineQuoteItem({
          id: "line-transport",
          kind: "transport-line",
          label: "Transport",
          quantity: 1,
          unit: CatalogUnit.FIXED,
          saleMinor: 15_000,
          totalMinor: 15_000,
        }),
        catalogLineQuoteItem({
          id: "line-installation",
          kind: "installation-line",
          label: "Montaj",
          quantity: 1,
          unit: CatalogUnit.FIXED,
          saleMinor: 20_000,
          totalMinor: 20_000,
        }),
      ],
    );

    expect(snapshot.items).toEqual([
      expect.objectContaining({
        itemTypeLabel: "Accesoriu",
        customerDescription: "Glaf interior",
        quantity: 1.5,
        unitLabel: "ml",
        unitPriceMinor: 2_400,
        totalMinor: 3_600,
      }),
      expect.objectContaining({
        itemTypeLabel: "Serviciu",
        unitLabel: "lot",
        unitPriceMinor: 10_000,
      }),
      expect.objectContaining({
        itemTypeLabel: "Transport",
        customerDescription: "Transport",
      }),
      expect.objectContaining({
        itemTypeLabel: "Montaj",
        customerDescription: "Montaj",
      }),
    ]);
  });

  it("returns a storage write failure without creating Document metadata", async () => {
    const state = testState();
    const storage = memoryDocumentStorageProvider({
      putError: new Error("storage unavailable"),
    });
    const result = await generateTenantQuotePdf(
      { tenantId: "tenant-a" },
      "quote-a",
      "version-a",
      {
        ...generatorOptions(state.client, "write-failure"),
        storageProvider: storage.provider,
      },
    );

    expect(result).toEqual({ ok: false, reason: "storage_write_failed" });
    expect(state.documents).toHaveLength(0);
    expect(state.auditLogs).toHaveLength(0);
    expect(storage.storedKeys()).toEqual([]);
  });

  it("stores the provider-returned key in Document metadata and keeps quote download scope", async () => {
    const state = testState();
    const storage = memoryDocumentStorageProvider({
      returnedKeyPrefix: "object-store",
    });
    const result = await generateTenantQuotePdf(
      { tenantId: "tenant-a" },
      "quote-a",
      "version-a",
      {
        ...generatorOptions(state.client, "provider-returned-key"),
        storageProvider: storage.provider,
      },
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error(result.reason);
    }

    const requestedStorageKey = storage.requestedKeys[0];
    const returnedStorageKey = `object-store/${requestedStorageKey}`;

    expect(requestedStorageKey).toContain("documents/tenant-a/version-a/");
    expect(result.storageKey).toBe(returnedStorageKey);
    expect(result.document.storageKey).toBe(returnedStorageKey);
    expect(state.documents[0]?.storageKey).toBe(returnedStorageKey);
    expect(storage.storedKeys()).toEqual([returnedStorageKey]);

    const data = createTenantDataAccess(state.client);

    await expect(
      data.getTenantQuoteDocument({ tenantId: "tenant-a" }, "quote-a", result.document.id),
    ).resolves.toMatchObject({
      document: {
        id: result.document.id,
        storageKey: returnedStorageKey,
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

  it("cleans up stored PDF bytes when Document metadata creation fails", async () => {
    const state = testState();
    const storage = memoryDocumentStorageProvider({
      returnedKeyPrefix: "object-store",
    });
    state.client.document = {
      ...state.client.document,
      async create() {
        throw new Error("metadata unavailable");
      },
    };
    const result = await generateTenantQuotePdf(
      { tenantId: "tenant-a" },
      "quote-a",
      "version-a",
      {
        ...generatorOptions(state.client, "metadata-failure"),
        storageProvider: storage.provider,
      },
    );

    expect(result).toEqual({ ok: false, reason: "document_create_failed" });
    expect(state.documents).toHaveLength(0);
    expect(state.auditLogs).toHaveLength(0);
    expect(storage.storedKeys()).toEqual([]);
    expect(storage.deletedKeys).toHaveLength(1);
    expect(storage.deletedKeys[0]).toBe(`object-store/${storage.requestedKeys[0]}`);
    expect(storage.deletedKeys[0]).not.toBe(storage.requestedKeys[0]);
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

function memoryDocumentStorageProvider(
  options: { putError?: Error; returnedKeyPrefix?: string } = {},
) {
  const stored = new Map<string, Uint8Array>();
  const deletedKeys: string[] = [];
  const requestedKeys: string[] = [];
  const provider: DocumentStorageProvider = {
    kind: "local",
    async put({ storageKey, bytes }) {
      if (options.putError) {
        throw options.putError;
      }

      requestedKeys.push(storageKey);
      const returnedStorageKey = options.returnedKeyPrefix
        ? `${options.returnedKeyPrefix}/${storageKey}`
        : storageKey;

      stored.set(returnedStorageKey, bytes);

      return {
        storageKey: returnedStorageKey,
        provider: "local",
      };
    },
    async get(storageKey) {
      const bytes = stored.get(storageKey);

      if (!bytes) {
        throw new Error("Document missing from memory storage.");
      }

      return bytes;
    },
    async delete(storageKey) {
      deletedKeys.push(storageKey);
      stored.delete(storageKey);
    },
  };

  return {
    deletedKeys,
    provider,
    requestedKeys,
    storedKeys: () => [...stored.keys()],
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

function catalogLineQuoteItem({
  id,
  kind,
  label,
  quantity,
  saleMinor,
  totalMinor,
  unit,
}: {
  id: string;
  kind: "accessory-line" | "service-line" | "transport-line" | "installation-line";
  label: string;
  quantity: number;
  saleMinor: number;
  totalMinor: number;
  unit: CatalogUnit;
}) {
  return quoteItem({
    id,
    customerDescription: label,
    quantity: Math.max(1, Math.ceil(quantity)),
    configurationSnapshot: {
      kind,
      quantity,
      catalogSelection:
        kind === "accessory-line"
          ? { accessoryId: id }
          : { serviceItemId: id },
    },
    catalogSnapshot: {
      lineKind: kind,
      line: {
        id,
        name: label,
        label,
        unit,
        priceListItem: {
          id: `price-${id}`,
          unit,
          saleMinor,
        },
      },
    },
    totalsSnapshot: {
      subtotalMinor: totalMinor,
      vatMinor: 0,
      totalMinor,
    },
  });
}

function pdfHexText(value: string) {
  let hex = "FEFF";

  for (let index = 0; index < value.length; index += 1) {
    hex += value.charCodeAt(index).toString(16).padStart(4, "0").toUpperCase();
  }

  return `<${hex}>`;
}
