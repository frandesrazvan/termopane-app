import { DocumentType } from "@prisma/client";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import { getTenantQuoteDocument } from "@/lib/data";
import { readLocalDocument } from "@/lib/pdf/local-document-storage";

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

  let file: Buffer;

  try {
    file = await readLocalDocument(result.document.storageKey);
  } catch {
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
