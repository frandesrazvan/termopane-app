import { createHash, randomUUID } from "node:crypto";
import { DocumentType, type Document, type QuoteVersion } from "@prisma/client";
import {
  buildQuotePdf,
  type QuotePdfOfferSnapshot,
  type QuotePdfTemplateKey,
} from "@termopane/pdf";
import {
  createTenantDataAccess,
  type TenantDataClient,
  type TenantDataScope,
} from "../data";
import { prisma } from "../prisma";
import type { DocumentStorageProvider } from "./document-storage";
import { createConfiguredDocumentStorageProvider } from "./document-storage-provider";
import type { LocalDocumentStorageOptions } from "./local-document-storage";
import {
  buildQuotePdfOfferSnapshot,
  isQuoteVersionLockedForCustomerOutput,
  visibleTotalsSnapshotFromTemplate,
} from "./template-a-snapshot";

export type GenerateQuotePdfOptions = LocalDocumentStorageOptions & {
  actorUserId?: string | null;
  client?: TenantDataClient;
  now?: () => Date;
  nonce?: () => string;
  storageProvider?: DocumentStorageProvider;
  templateKey?: QuotePdfTemplateKey;
  renderPdf?: (snapshot: QuotePdfOfferSnapshot) => Uint8Array;
};

export type GenerateQuotePdfResult =
  | {
      ok: true;
      document: Document;
      checksum: string;
      storageKey: string;
    }
  | {
      ok: false;
      reason:
        | "document_create_failed"
        | "not_found"
        | "not_locked"
        | "storage_write_failed";
    };

const PDF_MIME_TYPE = "application/pdf";

export async function generateTenantQuotePdf(
  scope: TenantDataScope,
  quoteId: string,
  quoteVersionId: string,
  options: GenerateQuotePdfOptions = {},
): Promise<GenerateQuotePdfResult> {
  const data = createTenantDataAccess(options.client ?? (prisma as unknown as TenantDataClient));
  const quoteState = await data.getTenantQuoteWithCurrentVersion(scope, quoteId);

  if (!quoteState) {
    return { ok: false, reason: "not_found" };
  }

  const quoteVersion = await data.getTenantQuoteVersion(scope, quoteVersionId);

  if (!quoteVersion || quoteVersion.quoteId !== quoteState.quote.id) {
    return { ok: false, reason: "not_found" };
  }

  if (!isQuoteVersionLockedForCustomerOutput(quoteVersion)) {
    return { ok: false, reason: "not_locked" };
  }

  const items = await data.listTenantQuoteItems(scope, quoteVersion.id);
  const templateKey = options.templateKey ?? "template-a";
  const snapshot = buildQuotePdfOfferSnapshot(quoteState.quote, quoteVersion, items, templateKey);
  const renderPdf = options.renderPdf ?? buildQuotePdf;
  const pdfBytes = renderPdf(snapshot);
  const checksum = sha256(pdfBytes);
  const storageKey = documentStorageKey(
    tenantIdFromScope(scope),
    quoteVersion,
    checksum,
    options.now?.() ?? new Date(),
    options.nonce?.() ?? randomUUID(),
  );
  const fileName = documentFileName(quoteState.quote.quoteNumber, quoteVersion, templateKey);
  let storageProvider: DocumentStorageProvider;

  try {
    storageProvider = options.storageProvider ?? createConfiguredDocumentStorageProvider(options);
    await storageProvider.put({
      storageKey,
      bytes: pdfBytes,
      contentType: PDF_MIME_TYPE,
      checksum,
      metadata: {
        quoteVersionId: quoteVersion.id,
        templateKey,
        tenantId: tenantIdFromScope(scope),
      },
    });
  } catch {
    return { ok: false, reason: "storage_write_failed" };
  }

  let document: Document | null;

  try {
    document = await data.createTenantQuoteDocument(scope, quoteVersion.id, {
      actorUserId: options.actorUserId ?? null,
      templateKey,
      fileName,
      storageKey,
      mimeType: PDF_MIME_TYPE,
      checksum,
      visibleTotalsSnapshot: {
        ...visibleTotalsSnapshotFromTemplate(snapshot, quoteVersion.id),
        documentType: DocumentType.QUOTE_PDF,
        itemCount: items.length,
      },
    });
  } catch {
    await cleanupStoredDocument(storageProvider, storageKey);

    return { ok: false, reason: "document_create_failed" };
  }

  if (!document) {
    await cleanupStoredDocument(storageProvider, storageKey);

    return { ok: false, reason: "not_found" };
  }

  return {
    ok: true,
    document,
    checksum,
    storageKey,
  };
}

async function cleanupStoredDocument(
  storageProvider: DocumentStorageProvider,
  storageKey: string,
) {
  try {
    await storageProvider.delete(storageKey);
  } catch {
    // Preserve the original generation failure. The missing Document row remains the source of truth.
  }
}

function documentStorageKey(
  tenantId: string,
  quoteVersion: QuoteVersion,
  checksum: string,
  createdAt: Date,
  nonce: string,
) {
  const datePart = createdAt.toISOString().replace(/[:.]/g, "-");

  return [
    "documents",
    safeStorageSegment(tenantId),
    safeStorageSegment(quoteVersion.id),
    `${datePart}-${safeStorageSegment(nonce)}-${checksum.slice(0, 16)}.pdf`,
  ].join("/");
}

function documentFileName(
  quoteNumber: string,
  quoteVersion: QuoteVersion,
  templateKey: QuotePdfTemplateKey,
) {
  const templateSuffix = templateKey === "template-a" ? "" : `-${templateKey}`;

  return `${safeFileSegment(quoteNumber)}-v${quoteVersion.versionNumber}${templateSuffix}.pdf`;
}

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function tenantIdFromScope(scope: TenantDataScope) {
  return "tenantId" in scope ? scope.tenantId : scope.tenant.id;
}

function safeStorageSegment(value: string) {
  return safeFileSegment(value).replaceAll(".", "-");
}

function safeFileSegment(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "document";
}
