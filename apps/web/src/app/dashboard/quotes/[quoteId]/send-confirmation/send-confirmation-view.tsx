import { CheckCircle2, Download, FileText, Plus } from "lucide-react";
import type {
  Document,
  Quote,
  QuoteDelivery,
  QuoteVersion,
} from "@prisma/client";
import Link from "next/link";
import {
  formatDateTimeRo,
  formatMoneyMinorRo,
  quoteVersionStatusLabel,
} from "../../../../../lib/i18n";

type QuoteSendConfirmationViewProps = {
  delivery?: QuoteDelivery | null;
  document: Document;
  quote: Quote;
  quoteVersion: QuoteVersion;
};

export function QuoteSendConfirmationView({
  delivery,
  document,
  quote,
  quoteVersion,
}: QuoteSendConfirmationViewProps) {
  const totals = customerVisibleTotals(
    document.visibleTotalsSnapshot,
    quoteVersion,
  );
  const sentAt =
    quoteVersion.sentAt ?? quoteVersion.updatedAt ?? document.createdAt;

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href={`/dashboard/quotes/${quote.id}`}
          className="inline-flex items-center text-sm font-semibold text-zinc-600 hover:text-zinc-950"
        >
          Înapoi la ofertă
        </Link>

        <section className="mt-5 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-800">
              <CheckCircle2 aria-hidden="true" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-950">
                Ofertă trimisă
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Documentul pentru client este legat de versiunea{" "}
                {quoteVersion.versionNumber}. Nu se afișează costuri interne,
                marje sau trace-uri de calcul.
              </p>
            </div>
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <ConfirmationDetail
              label="Număr ofertă"
              value={quote.quoteNumber}
            />
            <ConfirmationDetail
              label="Versiune"
              value={`${quoteVersion.versionNumber} - ${quoteVersionStatusLabel(quoteVersion.status)}`}
            />
            <ConfirmationDetail
              label="Trimisă la"
              value={formatDateTimeRo(sentAt)}
            />
            <ConfirmationDetail
              label="Document"
              value={document.fileName ?? "quote.pdf"}
            />
          </dl>

          <dl className="mt-6 grid gap-3 rounded-md bg-stone-100 p-4 sm:grid-cols-3">
            <ConfirmationDetail
              label="Subtotal client"
              value={formatMoneyMinorRo(totals.subtotalMinor, totals.currency)}
            />
            <ConfirmationDetail
              label="TVA client"
              value={formatMoneyMinorRo(totals.vatMinor, totals.currency)}
            />
            <ConfirmationDetail
              label="Total client"
              value={formatMoneyMinorRo(totals.totalMinor, totals.currency)}
            />
          </dl>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/dashboard/quotes/${quote.id}/documents/${document.id}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
            >
              <Download aria-hidden="true" size={16} />
              Descarcă PDF
            </Link>
            <Link
              href={`/dashboard/quotes/${quote.id}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-stone-100"
            >
              <Plus aria-hidden="true" size={16} />
              Creează revizie din ofertă
            </Link>
          </div>

          <p className="mt-5 flex items-start gap-2 rounded-md bg-sky-50 px-3 py-2 text-sm font-medium text-sky-900">
            <FileText
              className="mt-0.5 shrink-0"
              aria-hidden="true"
              size={16}
            />
            {delivery
              ? `Livrare email: ${deliveryStatusLabel(delivery.status)} prin ${delivery.provider}. Destinatar: ${delivery.recipientEmailRedacted ?? "redacted"}.`
              : "Livrarea este auditată pentru documentul selectat."}
          </p>
        </section>
      </div>
    </main>
  );
}

function ConfirmationDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-zinc-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-zinc-950">
        {value}
      </dd>
    </div>
  );
}

function customerVisibleTotals(
  visibleTotalsSnapshot: unknown,
  quoteVersion: QuoteVersion,
) {
  const snapshot = asRecord(visibleTotalsSnapshot);
  const currency = stringValue(snapshot.currency) ?? quoteVersion.currency;

  return {
    currency,
    subtotalMinor:
      minorValue(snapshot.subtotalMinor) ?? quoteVersion.subtotalMinor,
    vatMinor: minorValue(snapshot.vatMinor) ?? quoteVersion.vatMinor,
    totalMinor: minorValue(snapshot.totalMinor) ?? quoteVersion.totalMinor,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function minorValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return Number(value);
  }

  return null;
}

function deliveryStatusLabel(status: string) {
  switch (status) {
    case "sent":
      return "trimisă";
    case "logged":
      return "înregistrată local";
    case "failed":
      return "eșuată";
    default:
      return status || "necunoscută";
  }
}
