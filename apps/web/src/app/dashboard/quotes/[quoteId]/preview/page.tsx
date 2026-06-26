import { AlertTriangle, ArrowLeft, FileText } from "lucide-react";
import {
  buildQuoteHtml,
  isQuotePdfTemplateKey,
  type QuotePdfTemplateKey,
} from "@termopane/pdf";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import { getTenantQuoteWithCurrentVersion, listTenantQuoteItems } from "@/lib/data";
import {
  buildQuotePdfOfferSnapshot,
  defaultQuotePdfTemplateKeyFromVersion,
} from "@/lib/pdf/template-a-snapshot";

export const dynamic = "force-dynamic";

type QuotePreviewPageProps = {
  params: Promise<{ quoteId: string }>;
  searchParams: Promise<{ template?: string }>;
};

export default async function QuotePreviewPage({ params, searchParams }: QuotePreviewPageProps) {
  const context = await requireTenant();
  const { quoteId } = await params;
  const paramsValue = await searchParams;
  const quoteState = await getTenantQuoteWithCurrentVersion(context, quoteId);

  if (!quoteState?.currentVersion) {
    notFound();
  }

  const templateKey = selectedTemplateKey(
    paramsValue.template,
    defaultQuotePdfTemplateKeyFromVersion(quoteState.currentVersion),
  );
  const items = await listTenantQuoteItems(context, quoteState.currentVersion.id);
  const snapshot = buildQuotePdfOfferSnapshot(
    quoteState.quote,
    quoteState.currentVersion,
    items,
    templateKey,
  );
  const previewHtml = buildQuoteHtml(snapshot);
  const templateLabel = quoteTemplateLabel(templateKey);

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
              Înapoi la ofertă
            </Link>
            <h1 className="mt-3 flex items-center gap-2 text-2xl font-semibold text-zinc-950 sm:text-3xl">
              <FileText aria-hidden="true" size={24} />
              Previzualizare ofertă
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Previzualizare {templateLabel} pentru client: {quoteState.quote.quoteNumber}, versiunea{" "}
              {quoteState.currentVersion.versionNumber}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TemplateLink
              active={templateKey === "template-a"}
              href={`/dashboard/quotes/${quoteState.quote.id}/preview?template=template-a`}
              label="Template A"
            />
            <TemplateLink
              active={templateKey === "template-b"}
              href={`/dashboard/quotes/${quoteState.quote.id}/preview?template=template-b`}
              label="Template B"
            />
          </div>
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
            title={`Previzualizare ofertă ${quoteState.quote.quoteNumber}`}
          />
        </section>
      </div>
    </main>
  );
}

function selectedTemplateKey(
  value: string | undefined,
  fallback: QuotePdfTemplateKey,
): QuotePdfTemplateKey {
  return value && isQuotePdfTemplateKey(value) ? value : fallback;
}

function quoteTemplateLabel(templateKey: QuotePdfTemplateKey) {
  return templateKey === "template-b" ? "Template B compact" : "Template A detaliat";
}

function TemplateLink({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      href={href}
      className={
        active
          ? "inline-flex h-10 items-center justify-center rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white shadow-sm"
          : "inline-flex h-10 items-center justify-center rounded-md bg-white px-3 text-sm font-semibold text-zinc-700 shadow-sm ring-1 ring-zinc-200 hover:bg-stone-100"
      }
    >
      {label}
    </Link>
  );
}
