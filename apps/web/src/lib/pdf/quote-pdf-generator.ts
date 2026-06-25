import { createHash, randomUUID } from "node:crypto";
import { DocumentType, type Document, type QuoteVersion } from "@prisma/client";
import { buildTemplateAPdf } from "@termopane/pdf";
import {
  createTenantDataAccess,
  type TenantDataClient,
  type TenantDataScope,
} from "../data";
import { prisma } from "../prisma";
import { writeLocalDocument, type LocalDocumentStorageOptions } from "./local-document-storage";
import {
  buildTemplateAOfferSnapshot,
  isQuoteVersionLockedForCustomerOutput,
  visibleTotalsSnapshotFromTemplate,
} from "./template-a-snapshot";

export type GenerateQuotePdfOptions = LocalDocumentStorageOptions & {
  actorUserId?: string | null;
  client?: TenantDataClient;
  now?: () => Date;
  nonce?: () => string;
  renderPdf?: typeof buildTemplateAPdf;
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
      reason: "not_found" | "not_locked" | "write_failed";
    };

const TEMPLATE_KEY = "template-a";
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
  const snapshot = buildTemplateAOfferSnapshot(quoteState.quote, quoteVersion, items);
  const renderPdf = options.renderPdf ?? buildTemplateAPdf;
  const pdfBytes = renderPdf(snapshot);
  const checksum = sha256(pdfBytes);
  const storageKey = documentStorageKey(
    tenantIdFromScope(scope),
    quoteVersion,
    checksum,
    options.now?.() ?? new Date(),
    options.nonce?.() ?? randomUUID(),
  );
  const fileName = documentFileName(quoteState.quote.quoteNumber, quoteVersion);

  try {
    await writeLocalDocument(storageKey, pdfBytes, options);
  } catch {
    return { ok: false, reason: "write_failed" };
  }

  const document = await data.createTenantQuoteDocument(scope, quoteVersion.id, {
    actorUserId: options.actorUserId ?? null,
    templateKey: TEMPLATE_KEY,
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

  if (!document) {
    return { ok: false, reason: "not_found" };
  }

  return {
    ok: true,
    document,
    checksum,
    storageKey,
  };
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

function documentFileName(quoteNumber: string, quoteVersion: QuoteVersion) {
  return `${safeFileSegment(quoteNumber)}-v${quoteVersion.versionNumber}.pdf`;
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
