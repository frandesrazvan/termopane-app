export const businessValidationAreaLabels = {
  companySettings: "Setări companie și calcul",
  profileSystems: "Sisteme de profil",
  profileItems: "Profile și reguli liniare",
  glassPackages: "Pachete sticlă și deducții",
  hardwareKits: "Feronerie",
  colorFinishes: "Culori",
  accessories: "Accesorii",
  serviceItems: "Servicii",
  taxRates: "TVA și taxe",
  priceLists: "Liste de prețuri",
  priceListItems: "Poziții de preț",
  pricingRules: "Reguli de preț",
} as const;

export type BusinessValidationArea = keyof typeof businessValidationAreaLabels;

export type BusinessValidationRecordInput = Readonly<{
  area: BusinessValidationArea;
  label: string;
  recordId?: string | null;
  requiresBusinessValidation?: boolean | null;
  values: readonly unknown[];
}>;

export type BusinessValidationItem = Readonly<{
  area: BusinessValidationArea;
  areaLabel: string;
  label: string;
  recordId?: string | null;
  reasons: readonly string[];
}>;

export type BusinessValidationAreaSummary = Readonly<{
  area: BusinessValidationArea;
  label: string;
  count: number;
}>;

export type BusinessValidationSummary = Readonly<{
  total: number;
  hasPending: boolean;
  areas: readonly BusinessValidationAreaSummary[];
  items: readonly BusinessValidationItem[];
}>;

const businessValidationAreaOrder = Object.keys(
  businessValidationAreaLabels,
) as BusinessValidationArea[];

export function summarizeBusinessValidationRecords(
  records: readonly BusinessValidationRecordInput[],
): BusinessValidationSummary {
  const items = records.flatMap((record) => {
    const reasons = uniqueReasons([
      ...(record.requiresBusinessValidation ? ["marcat explicit"] : []),
      ...record.values.flatMap(validationReasonsForValue),
    ]);

    if (reasons.length === 0) {
      return [];
    }

    return [
      {
        area: record.area,
        areaLabel: businessValidationAreaLabels[record.area],
        label: record.label,
        recordId: record.recordId,
        reasons: Object.freeze(reasons),
      },
    ];
  });
  const counts = new Map<BusinessValidationArea, number>();

  for (const item of items) {
    counts.set(item.area, (counts.get(item.area) ?? 0) + 1);
  }

  const areas = businessValidationAreaOrder.flatMap((area) => {
    const count = counts.get(area) ?? 0;

    return count > 0
      ? [{ area, label: businessValidationAreaLabels[area], count }]
      : [];
  });

  return Object.freeze({
    total: items.length,
    hasPending: items.length > 0,
    areas: Object.freeze(areas),
    items: Object.freeze(items),
  });
}

export function containsBusinessValidationMarker(value: unknown): boolean {
  return validationReasonsForValue(value).length > 0;
}

function validationReasonsForValue(value: unknown): string[] {
  if (typeof value === "string") {
    return isBusinessValidationText(value) ? ["text marcat pentru validare"] : [];
  }

  if (Array.isArray(value)) {
    return uniqueReasons(value.flatMap(validationReasonsForValue));
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  const directReasons = [
    record.requiresBusinessValidation === true ? "marcat explicit" : null,
    isBusinessValidationText(record.validationStatus) ? "status de validare" : null,
    isBusinessValidationText(record.reviewStatus) ? "status de revizie" : null,
  ].filter((reason): reason is string => Boolean(reason));
  const nestedReasons = Object.entries(record)
    .filter(
      ([key]) =>
        !["requiresBusinessValidation", "validationStatus", "reviewStatus"].includes(key),
    )
    .flatMap(([, nestedValue]) => validationReasonsForValue(nestedValue));

  return uniqueReasons([...directReasons, ...nestedReasons]);
}

function isBusinessValidationText(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.toLowerCase();

  return (
    normalized.includes("requires business validation") ||
    normalized.includes("pending-business-validation") ||
    normalized.includes("validare business")
  );
}

function uniqueReasons(reasons: readonly string[]) {
  return [...new Set(reasons)];
}
