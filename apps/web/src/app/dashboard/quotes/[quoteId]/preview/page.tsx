import { AlertTriangle, ArrowLeft, FileText } from "lucide-react";
import { buildTemplateAHtml } from "@termopane/pdf";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import { getTenantQuoteWithCurrentVersion, listTenantQuoteItems } from "@/lib/data";
import { buildTemplateAOfferSnapshot } from "@/lib/pdf/template-a-snapshot";

export const dynamic = "force-dynamic";

type QuotePreviewPageProps = {
  params: Promise<{ quoteId: string }>;
};

export default async function QuotePreviewPage({ params }: QuotePreviewPageProps) {
  const context = await requireTenant();
  const { quoteId } = await params;
  const quoteState = await getTenantQuoteWithCurrentVersion(context, quoteId);

  if (!quoteState?.currentVersion) {
    notFound();
  }

  const items = await listTenantQuoteItems(context, quoteState.currentVersion.id);
  const snapshot = buildTemplateAOfferSnapshot(
    quoteState.quote,
    quoteState.currentVersion,
    items,
  );
  const previewHtml = buildTemplateAHtml(snapshot);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href={`/dashboard/quotes/${quoteState.quote.id}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
            >
              <ArrowLeft aria-hidden="true" size={16} />
              Back to quote
            </Link>
            <h1 className="mt-3 flex items-center gap-2 text-2xl font-semibold text-zinc-950 sm:text-3xl">
              <FileText aria-hidden="true" size={24} />
              Offer preview
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Customer-facing Template A preview for {quoteState.quote.quoteNumber}, version{" "}
              {quoteState.currentVersion.versionNumber}
            </p>
          </div>
          <span className="inline-flex w-fit rounded-md bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-sm ring-1 ring-zinc-200">
            Template A
          </span>
        </div>

        {snapshot.isDraft ? (
          <div className="mt-5 flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
            <p>{snapshot.warning}</p>
          </div>
        ) : null}

        <section className="mt-5 rounded-md border border-zinc-200 bg-white p-2 shadow-sm">
          <iframe
            className="h-[900px] w-full rounded-sm border-0 bg-white"
            sandbox=""
            srcDoc={previewHtml}
            title={`Offer preview ${quoteState.quote.quoteNumber}`}
          />
        </section>
      </div>
    </main>
  );
}
