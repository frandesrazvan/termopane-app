import { AlertTriangle, ArrowLeft, FileText } from "lucide-react";
import {
  QuoteItemType,
  QuoteVersionStatus,
  type Quote,
  type QuoteItem,
  type QuoteVersion,
} from "@prisma/client";
import {
  buildTemplateAHtml,
  type TemplateACompanySnapshot,
  type TemplateACustomerSnapshot,
  type TemplateAItemSnapshot,
  type TemplateAOfferSnapshot,
  type TemplateATermsSnapshot,
  type TemplateATotalsSnapshot,
} from "@termopane/pdf";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import { getTenantQuoteWithCurrentVersion, listTenantQuoteItems } from "@/lib/data";
import { quoteItemDrawingSnapshot } from "@/lib/drawing/quote-item-drawings";

export const dynamic = "force-dynamic";

type QuotePreviewPageProps = {
  params: Promise<{ quoteId: string }>;
};

type JsonRecord = Record<string, unknown>;

export default async function QuotePreviewPage({ params }: QuotePreviewPageProps) {
  const context = await requireTenant();
  const { quoteId } = await params;
  const quoteState = await getTenantQuoteWithCurrentVersion(context, quoteId);

  if (!quoteState?.currentVersion) {
    notFound();
  }

  const items = await listTenantQuoteItems(context, quoteState.currentVersion.id);
  const snapshot = templateSnapshotFromQuote(
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

function templateSnapshotFromQuote(
  quote: Quote,
  currentVersion: QuoteVersion,
  items: QuoteItem[],
): TemplateAOfferSnapshot {
  const currency = currentVersion.currency || quote.currency || "RON";
  const draftWarning = previewDraftWarning(currentVersion);

  return {
    templateKey: "template-a",
    locale: "ro",
    quote: {
      quoteNumber: quote.quoteNumber,
      versionNumber: currentVersion.versionNumber,
      versionStatus: currentVersion.status,
      quoteTitle: quote.title,
      currency,
      issueDateIso: (
        currentVersion.sentAt ??
        currentVersion.lockedAt ??
        currentVersion.createdAt
      ).toISOString(),
    },
    company: companySnapshotFromVersion(currentVersion),
    customer: customerSnapshotFromVersion(currentVersion),
    items: items.map((item) => templateItemFromQuoteItem(item)),
    totals: totalsSnapshotFromVersion(currentVersion, currency),
    terms: termsSnapshotFromVersion(currentVersion),
    isDraft: Boolean(draftWarning),
    warning: draftWarning,
  };
}

function previewDraftWarning(currentVersion: QuoteVersion) {
  if (isLockedVersion(currentVersion)) {
    return null;
  }

  return "Draft preview. Lock this quote version before sending or exporting it for a customer.";
}

function isLockedVersion(currentVersion: QuoteVersion) {
  return (
    currentVersion.isLocked ||
    currentVersion.status === QuoteVersionStatus.LOCKED ||
    currentVersion.status === QuoteVersionStatus.SENT ||
    Boolean(currentVersion.lockedAt) ||
    Boolean(currentVersion.sentAt)
  );
}

function companySnapshotFromVersion(currentVersion: QuoteVersion): TemplateACompanySnapshot {
  const settings = asRecord(currentVersion.companySettingsSnapshot);
  const cityCountry = compactText([
    stringFrom(settings?.city),
    stringFrom(settings?.country),
  ]).join(", ");

  return {
    displayName:
      stringFrom(settings?.displayName, settings?.legalName) ??
      "Company details unavailable",
    legalName: stringFrom(settings?.legalName),
    taxIdentifier: stringFrom(settings?.taxIdentifier),
    registrationNumber: stringFrom(settings?.registrationNumber),
    addressLines: compactText([
      stringFrom(settings?.addressLine1),
      stringFrom(settings?.addressLine2),
      cityCountry,
    ]),
    phone: stringFrom(settings?.phone),
    email: stringFrom(settings?.email),
    website: stringFrom(settings?.website),
    logoUrl: stringFrom(settings?.logoUrl),
  };
}

function customerSnapshotFromVersion(currentVersion: QuoteVersion): TemplateACustomerSnapshot {
  const customer = asRecord(currentVersion.customerSnapshot);
  const cityCountry = compactText([
    stringFrom(customer?.city),
    stringFrom(customer?.country),
  ]).join(", ");

  return {
    displayName:
      stringFrom(customer?.displayName, customer?.companyName, customer?.contactName) ??
      "Customer",
    companyName: stringFrom(customer?.companyName),
    contactName: stringFrom(customer?.contactName),
    email: stringFrom(customer?.email),
    phone: stringFrom(customer?.phone),
    taxIdentifier: stringFrom(customer?.taxIdentifier),
    addressLines: compactText([
      stringFrom(customer?.addressLine1),
      stringFrom(customer?.addressLine2),
      cityCountry,
    ]),
  };
}

function termsSnapshotFromVersion(currentVersion: QuoteVersion): TemplateATermsSnapshot {
  const settings = asRecord(currentVersion.companySettingsSnapshot);
  const offerValidityDays = numberFrom(settings?.offerValidityDays);

  return {
    paymentTermsText: stringFrom(settings?.paymentTermsText),
    warrantyText: stringFrom(settings?.warrantyText),
    deliveryText: stringFrom(settings?.deliveryText),
    advancePaymentText: stringFrom(settings?.advancePaymentText),
    validityText: offerValidityDays ? `${offerValidityDays} days` : stringFrom(settings?.validityText),
    footerText: stringFrom(settings?.pdfFooterText),
  };
}

function totalsSnapshotFromVersion(
  currentVersion: QuoteVersion,
  currency: string,
): TemplateATotalsSnapshot {
  const totals = asRecord(currentVersion.totalsSnapshot);

  return {
    subtotalMinor: numberFrom(totals?.subtotalMinor, currentVersion.subtotalMinor) ?? 0,
    vatMinor: numberFrom(totals?.vatMinor, currentVersion.vatMinor) ?? 0,
    totalMinor: numberFrom(totals?.totalMinor, currentVersion.totalMinor) ?? 0,
    currency,
  };
}

function templateItemFromQuoteItem(item: QuoteItem): TemplateAItemSnapshot {
  const configuration = asRecord(item.configurationSnapshot);
  const catalog = asRecord(item.catalogSnapshot);
  const totals = asRecord(item.totalsSnapshot);
  const manualPricing = firstRecord(configuration?.manualPricing, catalog?.manualPricing);
  const widthMm = numberFrom(item.widthMm, configuration?.widthMm);
  const heightMm = numberFrom(item.heightMm, configuration?.heightMm);
  const quantity = numberFrom(item.quantity, configuration?.quantity) ?? 1;
  const profile = firstRecord(
    catalog?.frameProfile,
    catalog?.profile,
    catalog?.profileSnapshot,
    configuration?.frameProfile,
    configuration?.profile,
  );
  const glass = firstRecord(
    catalog?.glass,
    catalog?.glassSnapshot,
    catalog?.glassPackage,
    configuration?.glass,
    configuration?.glassPackage,
  );
  const hardware = firstRecord(
    catalog?.hardware,
    catalog?.hardwareKit,
    catalog?.hardwareSnapshot,
    configuration?.hardware,
    configuration?.hardwareKit,
  );

  return {
    id: item.id,
    sortOrder: item.sortOrder,
    itemTypeLabel: itemTypeLabel(item.type),
    customerDescription:
      item.customerDescription ??
      stringFrom(configuration?.customerDescription, configuration?.description) ??
      "Untitled item",
    quantity,
    widthMm,
    heightMm,
    surfaceAreaSquareMeters: surfaceAreaSquareMeters(widthMm, heightMm, quantity),
    profileLabel: stringFrom(profile?.label, profile?.name),
    glassLabel: stringFrom(glass?.label, glass?.name, glass?.compositionLabel),
    hardwareLabel: stringFrom(hardware?.label, hardware?.name, hardware?.category),
    unitPriceMinor: numberFrom(manualPricing?.unitPriceMinor, configuration?.unitPriceMinor),
    subtotalMinor: numberFrom(totals?.subtotalMinor),
    vatMinor: numberFrom(totals?.vatMinor),
    totalMinor: numberFrom(totals?.totalMinor),
    totalsPending: totals?.pendingCalculation === true,
    drawingSvg: quoteItemDrawingSnapshot(item).svg,
  };
}

function itemTypeLabel(itemType: QuoteItemType) {
  if (itemType === QuoteItemType.WINDOW) {
    return "Fixed window";
  }

  if (itemType === QuoteItemType.CUSTOM) {
    return "Custom line";
  }

  if (itemType === QuoteItemType.DOOR) {
    return "Door";
  }

  return "Quote item";
}

function surfaceAreaSquareMeters(
  widthMm: number | undefined,
  heightMm: number | undefined,
  quantity: number,
) {
  if (!widthMm || !heightMm || !Number.isFinite(quantity)) {
    return null;
  }

  return Math.round((widthMm * heightMm * quantity) / 10_000) / 100;
}

function firstRecord(...values: unknown[]) {
  for (const value of values) {
    const record = asRecord(value);

    if (record) {
      return record;
    }
  }

  return null;
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function stringFrom(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function numberFrom(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "bigint") {
      return Number(value);
    }
  }

  return undefined;
}

function compactText(values: readonly (string | null | undefined)[]) {
  return values.flatMap((value) => {
    const trimmed = value?.trim();

    return trimmed ? [trimmed] : [];
  });
}
