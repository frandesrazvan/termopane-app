import { DocumentType, QuoteVersionStatus, type QuoteVersion } from "@prisma/client";
import {
  createTenantDataAccess,
  tenantIdFromScope,
  type TenantDataClient,
  type TenantDataScope,
} from "../data";
import type { DocumentStorageProvider } from "../pdf/document-storage";
import { createConfiguredDocumentStorageProvider } from "../pdf/document-storage-provider";
import { looksLikeEmailAddress, normalizeEmailAddress } from "../privacy/redaction";
import { prisma } from "../prisma";
import {
  createConfiguredEmailProvider,
  type CustomerOfferEmailInput,
  type EmailProvider,
} from "./email-provider";

export type DeliverTenantQuotePdfOptions = Readonly<{
  actorUserId?: string | null;
  client?: TenantDataClient;
  emailProvider?: EmailProvider;
  recipientEmail: string;
  recipientName?: string | null;
  storageProvider?: DocumentStorageProvider;
}>;

export type DeliverTenantQuotePdfResult =
  | {
      ok: true;
      deliveryId: string | null;
      documentId: string;
      provider: string;
      status: string;
    }
  | {
      ok: false;
      reason:
        | "delivery_record_failed"
        | "document_not_readable"
        | "not_found"
        | "not_locked"
        | "provider_failed"
        | "recipient_required"
        | "storage_read_failed";
    };

export async function deliverTenantQuotePdfToCustomer(
  scope: TenantDataScope,
  quoteId: string,
  documentId: string,
  options: DeliverTenantQuotePdfOptions,
): Promise<DeliverTenantQuotePdfResult> {
  const recipientEmail = normalizeEmailAddress(options.recipientEmail);

  if (!looksLikeEmailAddress(recipientEmail)) {
    return { ok: false, reason: "recipient_required" };
  }

  const data = createTenantDataAccess(
    options.client ?? (prisma as unknown as TenantDataClient),
  );
  const documentState = await data.getTenantQuoteDocument(
    scope,
    quoteId,
    documentId,
  );

  if (
    !documentState ||
    documentState.document.type !== DocumentType.QUOTE_PDF ||
    documentState.quote.currentVersionId !== documentState.quoteVersion.id
  ) {
    return { ok: false, reason: "not_found" };
  }

  if (!isLockedVersionReadyForSend(documentState.quoteVersion)) {
    return { ok: false, reason: "not_locked" };
  }

  if (!documentState.document.storageKey || !documentState.document.mimeType) {
    return { ok: false, reason: "document_not_readable" };
  }

  let pdfBytes: Uint8Array;

  try {
    const storageProvider =
      options.storageProvider ?? createConfiguredDocumentStorageProvider();
    pdfBytes = await storageProvider.get(documentState.document.storageKey);
  } catch {
    return { ok: false, reason: "storage_read_failed" };
  }

  const emailProvider = options.emailProvider ?? createConfiguredEmailProvider();
  const emailInput = customerOfferEmailInput(scope, {
    bytes: pdfBytes,
    documentId,
    fileName: documentState.document.fileName ?? "oferta.pdf",
    mimeType: documentState.document.mimeType,
    quoteNumber: documentState.quote.quoteNumber,
    quoteId: documentState.quote.id,
    quoteVersion: documentState.quoteVersion,
    recipientEmail,
    recipientName: options.recipientName ?? null,
  });
  let providerResult: Awaited<ReturnType<EmailProvider["sendCustomerOffer"]>>;

  try {
    providerResult = await emailProvider.sendCustomerOffer(emailInput);
  } catch {
    return { ok: false, reason: "provider_failed" };
  }

  const sendResult = await data.sendTenantQuote(scope, quoteId, {
    actorUserId: options.actorUserId ?? null,
    completedAt: providerResult.completedAt,
    deliveryProvider: providerResult.provider,
    deliveryStatus: providerResult.status,
    documentId,
    providerMessageId: providerResult.providerMessageId ?? null,
    recipientEmail,
    recipientName: options.recipientName ?? null,
  });

  if (!sendResult) {
    return { ok: false, reason: "delivery_record_failed" };
  }

  return {
    ok: true,
    deliveryId: sendResult.delivery?.id ?? null,
    documentId: sendResult.document.id,
    provider: providerResult.provider,
    status: providerResult.status,
  };
}

export function customerOfferEmailInput(
  scope: TenantDataScope,
  input: Readonly<{
    bytes: Uint8Array;
    documentId: string;
    fileName: string;
    mimeType: string;
    quoteId: string;
    quoteNumber: string;
    quoteVersion: QuoteVersion;
    recipientEmail: string;
    recipientName?: string | null;
  }>,
): CustomerOfferEmailInput {
  const company = asRecord(input.quoteVersion.companySettingsSnapshot);
  const companyName =
    stringValue(company.displayName) ??
    stringValue(company.legalName) ??
    tenantNameFromScope(scope) ??
    "Termopane App";
  const companyEmail = stringValue(company.email);
  const subject = `Oferta ${input.quoteNumber} - versiunea ${input.quoteVersion.versionNumber}`;

  return {
    attachments: [
      {
        bytes: input.bytes,
        contentType: input.mimeType,
        fileName: input.fileName,
      },
    ],
    bodyText: [
      "Buna ziua,",
      "",
      `Va transmitem atasat oferta ${input.quoteNumber}, versiunea ${input.quoteVersion.versionNumber}.`,
      "Documentul PDF atasat este varianta pentru client.",
      "Pentru intrebari sau modificari, va rugam sa raspundeti la acest email.",
      "",
      "Cu stima,",
      companyName,
    ].join("\n"),
    documentId: input.documentId,
    quoteId: input.quoteId,
    quoteNumber: input.quoteNumber,
    quoteVersionId: input.quoteVersion.id,
    recipientEmail: input.recipientEmail,
    recipientName: input.recipientName ?? null,
    replyToEmail: companyEmail,
    senderEmail: companyEmail,
    senderName: companyName,
    subject,
    tenantId: tenantIdFromScope(scope),
  };
}

function isLockedVersionReadyForSend(quoteVersion: QuoteVersion) {
  return (
    quoteVersion.status === QuoteVersionStatus.LOCKED &&
    quoteVersion.isLocked &&
    Boolean(quoteVersion.lockedAt) &&
    !quoteVersion.sentAt
  );
}

function tenantNameFromScope(scope: TenantDataScope) {
  return "tenant" in scope ? scope.tenant.name : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}
