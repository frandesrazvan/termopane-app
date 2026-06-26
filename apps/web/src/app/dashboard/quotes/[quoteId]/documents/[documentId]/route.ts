import { DocumentType } from "@prisma/client";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import { getTenantQuoteDocument } from "@/lib/data";
import { isDocumentStorageError } from "@/lib/pdf/document-storage";
import { createConfiguredDocumentStorageProvider } from "@/lib/pdf/document-storage-provider";

export const dynamic = "force-dynamic";

type DocumentDownloadRouteContext = {
  params: Promise<{
    quoteId: string;
    documentId: string;
  }>;
};

export async function GET(_request: Request, { params }: DocumentDownloadRouteContext) {
  const context = await requireTenant();
  const { quoteId, documentId } = await params;
  const result = await getTenantQuoteDocument(context, quoteId, documentId);

  if (
    !result ||
    result.document.type !== DocumentType.QUOTE_PDF ||
    !result.document.storageKey
  ) {
    notFound();
  }

  let file: Uint8Array;

  try {
    file = await createConfiguredDocumentStorageProvider().get(result.document.storageKey);
  } catch (error) {
    if (isOperationalStorageError(error)) {
      return storageUnavailableResponse();
    }

    notFound();
  }

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Disposition": `attachment; filename="${downloadFileName(result.document.fileName)}"`,
      "Content-Length": String(file.byteLength),
      "Content-Type": result.document.mimeType ?? "application/pdf",
      "X-Content-Type-Options": "nosniff",
      ...(result.document.checksum ? { "X-Document-Checksum": result.document.checksum } : {}),
    },
  });
}

function downloadFileName(value: string | null) {
  return (value || "quote.pdf").replace(/["\r\n]/g, "");
}

function isOperationalStorageError(error: unknown) {
  return (
    isDocumentStorageError(error, "configuration") ||
    isDocumentStorageError(error, "not_implemented") ||
    isDocumentStorageError(error, "unavailable")
  );
}

function storageUnavailableResponse() {
  return new Response("Document storage unavailable.", {
    status: 503,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
