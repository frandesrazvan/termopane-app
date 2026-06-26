import {
  QuoteItemType,
  QuoteVersionStatus,
  type Quote,
  type QuoteItem,
  type QuoteVersion,
} from "@prisma/client";
import {
  type QuotePdfOfferSnapshot,
  type QuotePdfTemplateKey,
  type TemplateACompanySnapshot,
  type TemplateACustomerSnapshot,
  type TemplateAItemSnapshot,
  type TemplateAOfferSnapshot,
  type TemplateATermsSnapshot,
  type TemplateATotalsSnapshot,
} from "@termopane/pdf";
import { quoteItemDrawingSnapshot } from "../drawing/quote-item-drawings";
import { quoteItemTypeLabel } from "../i18n";

type JsonRecord = Record<string, unknown>;

export function buildTemplateAOfferSnapshot(
  quote: Quote,
  quoteVersion: QuoteVersion,
  items: QuoteItem[],
): TemplateAOfferSnapshot {
  return buildQuotePdfOfferSnapshot(
    quote,
    quoteVersion,
    items,
    "template-a",
  ) as TemplateAOfferSnapshot;
}

export function buildQuotePdfOfferSnapshot(
  quote: Quote,
  quoteVersion: QuoteVersion,
  items: QuoteItem[],
  templateKey: QuotePdfTemplateKey = "template-a",
): QuotePdfOfferSnapshot {
  const currency = quoteVersion.currency || quote.currency || "RON";
  const draftWarning = previewDraftWarning(quoteVersion);

  return {
    templateKey,
    locale: "ro",
    quote: {
      quoteNumber: quote.quoteNumber,
      versionNumber: quoteVersion.versionNumber,
      versionStatus: quoteVersion.status,
      quoteTitle: quote.title,
      currency,
      issueDateIso: (
        quoteVersion.sentAt ??
        quoteVersion.lockedAt ??
        quoteVersion.createdAt
      ).toISOString(),
    },
    company: companySnapshotFromVersion(quoteVersion),
    customer: customerSnapshotFromVersion(quoteVersion),
    items: items.map((item) => templateItemFromQuoteItem(item)),
    totals: totalsSnapshotFromVersion(quoteVersion, currency),
    terms: termsSnapshotFromVersion(quoteVersion),
    isDraft: Boolean(draftWarning),
    warning: draftWarning,
  };
}

export function defaultQuotePdfTemplateKeyFromVersion(
  quoteVersion: QuoteVersion,
): QuotePdfTemplateKey {
  const settings = asRecord(quoteVersion.companySettingsSnapshot);
  const templateKey = settings?.defaultPdfTemplate;

  return templateKey === "template-b" ? "template-b" : "template-a";
}

export function isQuoteVersionLockedForCustomerOutput(quoteVersion: {
  status: QuoteVersionStatus;
  isLocked: boolean;
  lockedAt: Date | null;
  sentAt: Date | null;
}) {
  return (
    quoteVersion.isLocked ||
    quoteVersion.status === QuoteVersionStatus.LOCKED ||
    quoteVersion.status === QuoteVersionStatus.SENT ||
    Boolean(quoteVersion.lockedAt) ||
    Boolean(quoteVersion.sentAt)
  );
}

export function visibleTotalsSnapshotFromTemplate(
  snapshot: QuotePdfOfferSnapshot,
  quoteVersionId: string,
) {
  return {
    source: `${snapshot.templateKey}-pdf`,
    templateKey: snapshot.templateKey,
    quoteNumber: snapshot.quote.quoteNumber,
    quoteVersionId,
    versionNumber: snapshot.quote.versionNumber,
    subtotalMinor: minorNumber(snapshot.totals.subtotalMinor),
    vatMinor: minorNumber(snapshot.totals.vatMinor),
    totalMinor: minorNumber(snapshot.totals.totalMinor),
    currency: snapshot.totals.currency,
    isDraft: Boolean(snapshot.isDraft),
  };
}

function previewDraftWarning(quoteVersion: QuoteVersion) {
  if (isQuoteVersionLockedForCustomerOutput(quoteVersion)) {
    return null;
  }

  return "Previzualizare ciornă. Blochează această versiune înainte de trimitere sau export pentru client.";
}

function companySnapshotFromVersion(quoteVersion: QuoteVersion): TemplateACompanySnapshot {
  const settings = asRecord(quoteVersion.companySettingsSnapshot);
  const cityCountry = compactText([
    stringFrom(settings?.city),
    stringFrom(settings?.country),
  ]).join(", ");

  return {
    displayName:
      stringFrom(settings?.displayName, settings?.legalName) ??
      "Date companie indisponibile",
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

function customerSnapshotFromVersion(quoteVersion: QuoteVersion): TemplateACustomerSnapshot {
  const customer = asRecord(quoteVersion.customerSnapshot);
  const cityCountry = compactText([
    stringFrom(customer?.city),
    stringFrom(customer?.country),
  ]).join(", ");

  return {
    displayName:
      stringFrom(customer?.displayName, customer?.companyName, customer?.contactName) ??
      "Client",
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

function termsSnapshotFromVersion(quoteVersion: QuoteVersion): TemplateATermsSnapshot {
  const settings = asRecord(quoteVersion.companySettingsSnapshot);
  const offerValidityDays = numberFrom(settings?.offerValidityDays);

  return {
    paymentTermsText: stringFrom(settings?.paymentTermsText),
    warrantyText: stringFrom(settings?.warrantyText),
    deliveryText: stringFrom(settings?.deliveryText),
    advancePaymentText: stringFrom(settings?.advancePaymentText),
    validityText: offerValidityDays ? `${offerValidityDays} zile` : stringFrom(settings?.validityText),
    footerText: stringFrom(settings?.pdfFooterText),
  };
}

function totalsSnapshotFromVersion(
  quoteVersion: QuoteVersion,
  currency: string,
): TemplateATotalsSnapshot {
  const totals = asRecord(quoteVersion.totalsSnapshot);

  return {
    subtotalMinor: numberFrom(totals?.subtotalMinor, quoteVersion.subtotalMinor) ?? 0,
    vatMinor: numberFrom(totals?.vatMinor, quoteVersion.vatMinor) ?? 0,
    totalMinor: numberFrom(totals?.totalMinor, quoteVersion.totalMinor) ?? 0,
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
    catalog?.thresholdProfile,
    catalog?.profile,
    catalog?.profileSnapshot,
    configuration?.frameProfile,
    configuration?.profile,
  );
  const panel = firstRecord(catalog?.panel, configuration?.panel);
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
      "Poziție fără titlu",
    unitLabel:
      unitLabelFromSnapshot(
        stringFrom(
          configuration?.unitLabel,
          configuration?.unit,
          catalog?.unitLabel,
          catalog?.unit,
        ),
      ) ?? "buc.",
    quantity,
    widthMm,
    heightMm,
    surfaceAreaSquareMeters: surfaceAreaSquareMeters(widthMm, heightMm, quantity),
    profileLabel: stringFrom(profile?.label, profile?.name),
    glassLabel: glassPanelLabel(glass, panel),
    hardwareLabel: stringFrom(
      hardware?.label,
      hardware?.name,
      hardware?.category,
      hardware?.description,
    ),
    unitPriceMinor: numberFrom(manualPricing?.unitPriceMinor, configuration?.unitPriceMinor),
    subtotalMinor: numberFrom(totals?.subtotalMinor),
    vatMinor: numberFrom(totals?.vatMinor),
    totalMinor: numberFrom(totals?.totalMinor),
    totalsPending: totals?.pendingCalculation === true,
    drawingSvg: quoteItemDrawingSnapshot(item).svg,
  };
}

function glassPanelLabel(
  glass: JsonRecord | null,
  panel: JsonRecord | null,
) {
  const glassLabel = stringFrom(glass?.label, glass?.name, glass?.compositionLabel);
  const panelLabel = stringFrom(panel?.description);

  return compactText([glassLabel, panelLabel]).join(" / ") || undefined;
}

function itemTypeLabel(itemType: QuoteItemType) {
  return quoteItemTypeLabel(itemType);
}

function unitLabelFromSnapshot(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  const upper = normalized.toUpperCase();

  switch (upper) {
    case "EACH":
      return "buc.";
    case "LINEAR_METER":
      return "ml";
    case "SQUARE_METER":
      return "mp";
    case "HOUR":
      return "oră";
    case "FIXED":
      return "lot";
    default:
      return normalized;
  }
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

function minorNumber(value: number | bigint) {
  return typeof value === "bigint" ? Number(value) : Math.round(value);
}

function compactText(values: readonly (string | null | undefined)[]) {
  return values.flatMap((value) => {
    const trimmed = value?.trim();

    return trimmed ? [trimmed] : [];
  });
}
