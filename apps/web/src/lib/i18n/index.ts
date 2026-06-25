import {
  QuoteItemType,
  QuoteStatus,
  QuoteVersionStatus,
  TenantMemberStatus,
  TenantRole,
} from "@prisma/client";

export const DEFAULT_LOCALE = "ro" as const;
export const APP_LOCALE = "ro-RO" as const;

export type AppLocale = typeof DEFAULT_LOCALE | "en";

const ro = {
  common: {
    appName: "Termopane App",
    notSet: "Necompletat",
    totalPending: "Total în așteptare",
  },
  quoteStatus: {
    [QuoteStatus.DRAFT]: "Ciornă",
    [QuoteStatus.SENT]: "Trimisă",
    [QuoteStatus.ACCEPTED]: "Acceptată",
    [QuoteStatus.REJECTED]: "Respinsă",
    [QuoteStatus.REVISED]: "Revizuită",
    [QuoteStatus.ARCHIVED]: "Arhivată",
  },
  quoteVersionStatus: {
    [QuoteVersionStatus.DRAFT]: "Ciornă",
    [QuoteVersionStatus.LOCKED]: "Blocată",
    [QuoteVersionStatus.SENT]: "Trimisă",
    [QuoteVersionStatus.SUPERSEDED]: "Înlocuită",
  },
  quoteItemType: {
    [QuoteItemType.WINDOW]: "Fereastră fixă",
    [QuoteItemType.DOOR]: "Ușă",
    [QuoteItemType.CUSTOM]: "Poziție personalizată",
  },
  tenantRole: {
    [TenantRole.OWNER]: "proprietar",
    [TenantRole.ADMIN]: "administrator",
    [TenantRole.ESTIMATOR]: "estimator",
    [TenantRole.DEALER]: "dealer",
    [TenantRole.SUPPORT]: "suport",
  },
  tenantMemberStatus: {
    [TenantMemberStatus.INVITED]: "invitat",
    [TenantMemberStatus.ACTIVE]: "activ",
    [TenantMemberStatus.DISABLED]: "dezactivat",
  },
} as const;

const en = {
  common: {
    appName: "Termopane App",
    notSet: "Not set",
    totalPending: "Total pending",
  },
  quoteStatus: {
    [QuoteStatus.DRAFT]: "Draft",
    [QuoteStatus.SENT]: "Sent",
    [QuoteStatus.ACCEPTED]: "Accepted",
    [QuoteStatus.REJECTED]: "Rejected",
    [QuoteStatus.REVISED]: "Revised",
    [QuoteStatus.ARCHIVED]: "Archived",
  },
  quoteVersionStatus: {
    [QuoteVersionStatus.DRAFT]: "Draft",
    [QuoteVersionStatus.LOCKED]: "Locked",
    [QuoteVersionStatus.SENT]: "Sent",
    [QuoteVersionStatus.SUPERSEDED]: "Superseded",
  },
  quoteItemType: {
    [QuoteItemType.WINDOW]: "Fixed window",
    [QuoteItemType.DOOR]: "Door",
    [QuoteItemType.CUSTOM]: "Custom line",
  },
  tenantRole: {
    [TenantRole.OWNER]: "owner",
    [TenantRole.ADMIN]: "admin",
    [TenantRole.ESTIMATOR]: "estimator",
    [TenantRole.DEALER]: "dealer",
    [TenantRole.SUPPORT]: "support",
  },
  tenantMemberStatus: {
    [TenantMemberStatus.INVITED]: "invited",
    [TenantMemberStatus.ACTIVE]: "active",
    [TenantMemberStatus.DISABLED]: "disabled",
  },
} as const;

export const messages = {
  ro,
  en,
} as const;

function dictionary(locale: AppLocale = DEFAULT_LOCALE) {
  return messages[locale] ?? messages[DEFAULT_LOCALE];
}

export function commonLabel(
  key: keyof (typeof ro)["common"],
  locale: AppLocale = DEFAULT_LOCALE,
) {
  return dictionary(locale).common[key];
}

export function quoteStatusLabel(
  status: QuoteStatus,
  locale: AppLocale = DEFAULT_LOCALE,
) {
  return dictionary(locale).quoteStatus[status];
}

export function quoteVersionStatusLabel(
  status: QuoteVersionStatus,
  locale: AppLocale = DEFAULT_LOCALE,
) {
  return dictionary(locale).quoteVersionStatus[status];
}

export function quoteItemTypeLabel(
  type: QuoteItemType,
  locale: AppLocale = DEFAULT_LOCALE,
) {
  return dictionary(locale).quoteItemType[type];
}

export function tenantRoleLabel(
  role: TenantRole,
  locale: AppLocale = DEFAULT_LOCALE,
) {
  return dictionary(locale).tenantRole[role];
}

export function tenantMemberStatusLabel(
  status: TenantMemberStatus,
  locale: AppLocale = DEFAULT_LOCALE,
) {
  return dictionary(locale).tenantMemberStatus[status];
}

export function formatDateRo(value: Date | string | number) {
  return new Intl.DateTimeFormat(APP_LOCALE).format(new Date(value));
}

export function formatDateTimeRo(value: Date | string | number) {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatMoneyMinorRo(
  value: bigint | number | null | undefined,
  currency = "RON",
) {
  if (value === null || value === undefined) {
    return commonLabel("totalPending");
  }

  const minor = typeof value === "bigint" ? Number(value) : value;

  return new Intl.NumberFormat(APP_LOCALE, {
    style: "currency",
    currency,
  }).format(minor / 100);
}
