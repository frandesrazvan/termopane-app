import { QuoteStatus, QuoteVersionStatus } from "@prisma/client";

export const savedOfferQuickFilters = [
  { key: "drafts", label: "Ciorne" },
  { key: "sent", label: "Trimise" },
  { key: "accepted", label: "Acceptate" },
  { key: "rejected", label: "Respinsă" },
  { key: "expiring-soon", label: "Expiră curând" },
  { key: "with-pdf", label: "Cu PDF generat" },
  { key: "without-calculation", label: "Fără calcul" },
  { key: "with-warnings", label: "Cu avertizări" },
] as const;

export type SavedOfferQuickFilterKey = (typeof savedOfferQuickFilters)[number]["key"];

export type SavedOfferFilter = Readonly<{
  quickFilter?: SavedOfferQuickFilterKey;
  customerId?: string;
  status?: QuoteStatus;
  createdById?: string;
  createdFrom?: string;
  createdTo?: string;
  totalMinMinor?: number;
  totalMaxMinor?: number;
}>;

export type SavedOfferFilterRow = Readonly<{
  quote: {
    status: QuoteStatus;
  };
  currentVersion: {
    status: QuoteVersionStatus;
    createdAt: Date;
    lockedAt: Date | null;
    sentAt: Date | null;
    companySettingsSnapshot: unknown;
    warningsSnapshot: unknown;
    totalMinor: bigint | number | null;
  } | null;
  documentCount: number;
  hasCalculation: boolean;
  calculationWarningCount: number;
}>;

const quickFilterKeys = new Set<string>(
  savedOfferQuickFilters.map((filter) => filter.key),
);
const quoteStatuses = new Set<string>(Object.values(QuoteStatus));
const quickStatusMap: Partial<Record<SavedOfferQuickFilterKey, QuoteStatus>> = {
  drafts: QuoteStatus.DRAFT,
  sent: QuoteStatus.SENT,
  accepted: QuoteStatus.ACCEPTED,
  rejected: QuoteStatus.REJECTED,
};

export function normalizeSavedOfferFilter(input: Record<string, unknown>): SavedOfferFilter {
  const filter: {
    quickFilter?: SavedOfferQuickFilterKey;
    customerId?: string;
    status?: QuoteStatus;
    createdById?: string;
    createdFrom?: string;
    createdTo?: string;
    totalMinMinor?: number;
    totalMaxMinor?: number;
  } = {};
  const quickFilter = stringValue(input.quickFilter);
  const status = stringValue(input.status);
  const customerId = stringValue(input.customerId);
  const createdById = stringValue(input.createdById) ?? stringValue(input.authorId);
  const createdFrom = dateOnlyValue(input.createdFrom);
  const createdTo = dateOnlyValue(input.createdTo);
  const totalMinMinor = minorValue(input.totalMinMinor);
  const totalMaxMinor = minorValue(input.totalMaxMinor);

  if (quickFilter && quickFilterKeys.has(quickFilter)) {
    filter.quickFilter = quickFilter as SavedOfferQuickFilterKey;
  }

  if (customerId) {
    filter.customerId = customerId;
  }

  if (status && quoteStatuses.has(status)) {
    filter.status = status as QuoteStatus;
  }

  if (createdById) {
    filter.createdById = createdById;
  }

  if (createdFrom) {
    filter.createdFrom = createdFrom;
  }

  if (createdTo) {
    filter.createdTo = createdTo;
  }

  if (totalMinMinor !== null) {
    filter.totalMinMinor = totalMinMinor;
  }

  if (totalMaxMinor !== null) {
    filter.totalMaxMinor = totalMaxMinor;
  }

  return filter;
}

export function savedOfferFilterFromSearchParams(
  params: Record<string, string | undefined>,
) {
  return normalizeSavedOfferFilter(params);
}

export function savedOfferFilterFromJson(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? normalizeSavedOfferFilter(value as Record<string, unknown>)
    : {};
}

export function hasSavedOfferFilter(filter: SavedOfferFilter) {
  return Object.values(filter).some(
    (value) => value !== null && value !== undefined && value !== "",
  );
}

export function savedOfferFilterToSearchParams(filter: SavedOfferFilter) {
  const params = new URLSearchParams();

  if (filter.quickFilter) {
    params.set("quickFilter", filter.quickFilter);
  }

  if (filter.customerId) {
    params.set("customerId", filter.customerId);
  }

  if (filter.status) {
    params.set("status", filter.status);
  }

  if (filter.createdById) {
    params.set("authorId", filter.createdById);
  }

  if (filter.createdFrom) {
    params.set("createdFrom", filter.createdFrom);
  }

  if (filter.createdTo) {
    params.set("createdTo", filter.createdTo);
  }

  if (filter.totalMinMinor !== undefined) {
    params.set("totalMinMinor", String(filter.totalMinMinor));
  }

  if (filter.totalMaxMinor !== undefined) {
    params.set("totalMaxMinor", String(filter.totalMaxMinor));
  }

  return params;
}

export function quoteListOptionsFromSavedOfferFilter(filter: SavedOfferFilter) {
  return {
    customerId: filter.customerId ?? null,
    status: filter.status ?? quickStatusForFilter(filter.quickFilter) ?? null,
    createdById: filter.createdById ?? null,
    createdFrom: parseDateStart(filter.createdFrom),
    createdTo: parseDateEnd(filter.createdTo),
  };
}

export function matchesSavedOfferWorkflowFilter(
  row: SavedOfferFilterRow,
  filter: SavedOfferFilter,
  now = new Date(),
) {
  if (
    !matchesTotalRange(
      row.currentVersion?.totalMinor,
      filter.totalMinMinor ?? null,
      filter.totalMaxMinor ?? null,
    )
  ) {
    return false;
  }

  if (!filter.quickFilter) {
    return true;
  }

  switch (filter.quickFilter) {
    case "drafts":
    case "sent":
    case "accepted":
    case "rejected":
      return row.quote.status === quickStatusMap[filter.quickFilter];
    case "expiring-soon":
      return expiresSoon(row, now);
    case "with-pdf":
      return row.documentCount > 0;
    case "without-calculation":
      return !row.hasCalculation;
    case "with-warnings":
      return (
        warningCount(row.currentVersion?.warningsSnapshot) > 0 ||
        row.calculationWarningCount > 0
      );
  }
}

export function matchesTotalRange(
  value: bigint | number | null | undefined,
  min: number | null,
  max: number | null,
) {
  if (min === null && max === null) {
    return true;
  }

  if (value === null || value === undefined) {
    return false;
  }

  const total = typeof value === "bigint" ? Number(value) : value;

  return (min === null || total >= min) && (max === null || total <= max);
}

export function warningCount(value: unknown) {
  if (Array.isArray(value)) {
    return value.length;
  }

  if (value && typeof value === "object" && "warnings" in value) {
    const warnings = (value as { warnings?: unknown }).warnings;

    return Array.isArray(warnings) ? warnings.length : 0;
  }

  return 0;
}

function quickStatusForFilter(key: SavedOfferQuickFilterKey | undefined) {
  return key ? quickStatusMap[key] : null;
}

function expiresSoon(row: SavedOfferFilterRow, now: Date) {
  if (!row.currentVersion) {
    return false;
  }

  if (
    row.quote.status === QuoteStatus.ACCEPTED ||
    row.quote.status === QuoteStatus.REJECTED ||
    row.quote.status === QuoteStatus.ARCHIVED
  ) {
    return false;
  }

  const settings = jsonRecord(row.currentVersion.companySettingsSnapshot);
  const validityDays = numberValue(settings?.offerValidityDays);

  if (!validityDays || validityDays <= 0) {
    return false;
  }

  const issueDate =
    row.currentVersion.sentAt ?? row.currentVersion.lockedAt ?? row.currentVersion.createdAt;
  const expiresAt = addDays(issueDate, validityDays);
  const windowEnd = addDays(now, 7);

  return expiresAt >= now && expiresAt <= windowEnd;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() || null : null;
}

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function minorValue(value: unknown) {
  const parsed = numberValue(value);

  return parsed !== null && parsed >= 0 ? Math.round(parsed) : null;
}

function dateOnlyValue(value: unknown) {
  const text = stringValue(value);

  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }

  const date = new Date(`${text}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : text;
}

function parseDateStart(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateEnd(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T23:59:59.999Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);

  date.setUTCDate(date.getUTCDate() + days);

  return date;
}

function jsonRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
