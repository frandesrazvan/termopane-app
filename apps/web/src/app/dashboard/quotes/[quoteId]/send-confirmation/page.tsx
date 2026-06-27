import { DocumentType, QuoteVersionStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import {
  getTenantQuoteDocument,
  listTenantQuoteDocumentDeliveries,
} from "@/lib/data";
import { QuoteSendConfirmationView } from "./send-confirmation-view";

export const dynamic = "force-dynamic";

type QuoteSendConfirmationPageProps = {
  params: Promise<{
    quoteId: string;
  }>;
  searchParams: Promise<{
    documentId?: string;
  }>;
};

export default async function QuoteSendConfirmationPage({
  params,
  searchParams,
}: QuoteSendConfirmationPageProps) {
  const context = await requireTenant();
  const { quoteId } = await params;
  const { documentId } = await searchParams;

  if (!documentId) {
    notFound();
  }

  const result = await getTenantQuoteDocument(context, quoteId, documentId);

  if (
    !result ||
    result.document.type !== DocumentType.QUOTE_PDF ||
    result.quoteVersion.status !== QuoteVersionStatus.SENT ||
    !result.quoteVersion.sentAt
  ) {
    notFound();
  }

  const deliveries = await listTenantQuoteDocumentDeliveries(
    context,
    quoteId,
    documentId,
  );

  return (
    <QuoteSendConfirmationView
      delivery={deliveries[0] ?? null}
      document={result.document}
      quote={result.quote}
      quoteVersion={result.quoteVersion}
    />
  );
}
