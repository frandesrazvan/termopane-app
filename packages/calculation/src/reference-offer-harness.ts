import {
  calculateQuote,
  type CalculationWarningCode,
  type QuoteCalculationInput,
  type QuoteCalculationResult,
} from "./index.js";

export const requiredReviewInputKeys = [
  "profilePriceList",
  "glassDeductionRules",
  "glassPriceList",
  "hardwareRules",
  "accessoryServicePrices",
  "commercialRules",
  "preferredPdfTemplate",
  "sampleOutputRequirements",
] as const;

export type RequiredReviewInputKey = (typeof requiredReviewInputKeys)[number];

export type ReferenceOfferPackType = "synthetic-pilot" | "validated-historical-recreation";

export type ReferenceOfferDataClassification =
  | "synthetic-redacted"
  | "redacted-validated-historical";

export type ReferenceOfferReviewStatus =
  | "synthetic-baseline"
  | "pending-business-validation"
  | "validated-historical";

export type ReferenceRequirementStatus =
  | "pending-business-owner"
  | "synthetic"
  | "collected-redacted"
  | "validated"
  | "not-applicable";

export type ReferenceRequirement = Readonly<{
  key: RequiredReviewInputKey;
  label: string;
  status: ReferenceRequirementStatus;
}>;

export type ReferenceOfferSource = Readonly<{
  kind: "synthetic-json" | "redacted-historical-json";
  originalDocumentAvailable: boolean;
  privateArtifactsCommitted: boolean;
  notes?: string;
}>;

export type ReferenceOfferRedaction = Readonly<{
  customer: "synthetic" | "redacted";
  project: "synthetic" | "redacted";
  sourceDocuments: "none-committed" | "redacted-not-committed";
}>;

export type ReferenceOfferTotalsExpectation = Partial<
  Readonly<{
    materialCostMinor: number;
    markupMinor: number;
    itemDiscountMinor: number;
    quoteDiscountMinor: number;
    discountMinor: number;
    subtotalAfterDiscountMinor: number;
    vatMinor: number;
    totalBeforeManualOverrideMinor: number;
    manualAdjustmentMinor: number;
    totalWithVatMinor: number;
  }>
>;

export type ReferenceOfferExpectation = Readonly<{
  itemCount: number;
  materialRequirementCount?: number;
  glassCutCount?: number;
  profileGroupCount?: number;
  warningCodes?: readonly CalculationWarningCode[];
  totals: ReferenceOfferTotalsExpectation;
}>;

export type ReferenceOfferCase = Readonly<{
  caseId: string;
  title: string;
  reviewStatus: ReferenceOfferReviewStatus;
  dataClassification: ReferenceOfferDataClassification;
  preferredTemplateKey: "template-a" | "template-b";
  source: ReferenceOfferSource;
  redaction: ReferenceOfferRedaction;
  businessInputStatus: Record<RequiredReviewInputKey, ReferenceRequirementStatus>;
  calculationInput: QuoteCalculationInput;
  expected: ReferenceOfferExpectation;
}>;

export type ReferenceOfferFixturePack = Readonly<{
  schemaVersion: 1;
  packId: string;
  packType: ReferenceOfferPackType;
  dataClassification: ReferenceOfferDataClassification;
  description: string;
  requirementsChecklist: readonly ReferenceRequirement[];
  cases: readonly ReferenceOfferCase[];
}>;

export type ReferenceOfferValidationResult = Readonly<{
  errors: readonly string[];
  warnings: readonly string[];
}>;

export type ReferenceOfferRecreationResult = Readonly<{
  caseId: string;
  passed: boolean;
  mismatches: readonly string[];
  result: QuoteCalculationResult;
}>;

export type ReferenceOfferPackRecreationResult = Readonly<{
  passed: boolean;
  cases: readonly ReferenceOfferRecreationResult[];
}>;

export type ReferenceOfferComparisonCaseSummary = Readonly<{
  caseId: string;
  passed: boolean;
  mismatchCount: number;
  totalWithVatMinor: number;
  warningCodes: readonly CalculationWarningCode[];
}>;

export type ReferenceOfferComparisonReport = Readonly<{
  packId: string;
  packType: ReferenceOfferPackType;
  caseCount: number;
  validationErrorCount: number;
  validationWarningCount: number;
  passedCaseCount: number;
  failedCaseCount: number;
  historicalCaseWindowSatisfied: boolean;
  readyForReviewSession: boolean;
  cases: readonly ReferenceOfferComparisonCaseSummary[];
}>;

const privateArtifactPattern = /\.(pdf|png|jpe?g|xlsx?|docx?)\b/i;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const longPhonePattern = /(?:\+?\d[\s().-]*){8,}/g;

export function validateReferenceOfferPack(
  pack: ReferenceOfferFixturePack,
): ReferenceOfferValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (pack.schemaVersion !== 1) {
    errors.push("Reference offer pack schemaVersion must be 1.");
  }

  if (!pack.packId.trim()) {
    errors.push("Reference offer pack must have a non-empty packId.");
  }

  if (pack.packType === "validated-historical-recreation" && !isValidatedHistoricalPackSize(pack.cases.length)) {
    errors.push("Validated historical recreation packs must contain 10-20 cases.");
  }

  const checklistKeys = new Set(pack.requirementsChecklist.map((requirement) => requirement.key));

  for (const key of requiredReviewInputKeys) {
    if (!checklistKeys.has(key)) {
      errors.push(`Missing requirements checklist entry: ${key}.`);
    }
  }

  const seenCaseIds = new Set<string>();

  for (const referenceCase of pack.cases) {
    if (seenCaseIds.has(referenceCase.caseId)) {
      errors.push(`Duplicate reference offer caseId: ${referenceCase.caseId}.`);
    }
    seenCaseIds.add(referenceCase.caseId);

    const caseValidation = validateReferenceOfferCase(referenceCase);

    errors.push(...caseValidation.errors);
    warnings.push(...caseValidation.warnings);
  }

  if (pack.cases.length === 0) {
    warnings.push("Reference offer pack has no cases yet.");
  }

  return {
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
  };
}

export function validateReferenceOfferCase(
  referenceCase: ReferenceOfferCase,
): ReferenceOfferValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prefix = `Case ${referenceCase.caseId}`;

  if (!/^[a-z0-9][a-z0-9-]*$/.test(referenceCase.caseId)) {
    errors.push(`${prefix} must use a lowercase slug caseId.`);
  }

  if (referenceCase.source.privateArtifactsCommitted) {
    errors.push(`${prefix} must not commit private PDFs or source artifacts.`);
  }

  if (referenceCase.source.originalDocumentAvailable) {
    errors.push(`${prefix} must not point to original business documents inside fixtures.`);
  }

  if (referenceCase.redaction.sourceDocuments !== "none-committed") {
    warnings.push(`${prefix} references redacted source documents; keep originals outside Git.`);
  }

  if (
    referenceCase.reviewStatus === "validated-historical" &&
    referenceCase.dataClassification !== "redacted-validated-historical"
  ) {
    errors.push(`${prefix} validated historical cases must be redacted-validated-historical.`);
  }

  for (const key of requiredReviewInputKeys) {
    if (!referenceCase.businessInputStatus[key]) {
      errors.push(`${prefix} missing business input status: ${key}.`);
    }
  }

  if (!referenceCase.expected || !referenceCase.expected.totals) {
    errors.push(`${prefix} must include expected totals.`);
  }

  for (const unsafeValue of unsafeFixtureStrings(referenceCase)) {
    errors.push(`${prefix} contains unsafe fixture text: ${unsafeValue}.`);
  }

  return {
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
  };
}

export function recreateReferenceOfferCase(
  referenceCase: ReferenceOfferCase,
): ReferenceOfferRecreationResult {
  const result = calculateQuote(referenceCase.calculationInput);
  const mismatches: string[] = [];

  compareNumber("itemCount", result.items.length, referenceCase.expected.itemCount, mismatches);
  compareOptionalNumber(
    "materialRequirementCount",
    result.materialRequirements.length,
    referenceCase.expected.materialRequirementCount,
    mismatches,
  );
  compareOptionalNumber(
    "glassCutCount",
    result.glassCuts.length,
    referenceCase.expected.glassCutCount,
    mismatches,
  );
  compareOptionalNumber(
    "profileGroupCount",
    result.profileLinearMeters.length,
    referenceCase.expected.profileGroupCount,
    mismatches,
  );

  for (const [key, expectedValue] of Object.entries(referenceCase.expected.totals)) {
    const actualValue = result.totals[key as keyof typeof result.totals];

    compareNumber(`totals.${key}`, actualValue, expectedValue, mismatches);
  }

  const actualWarningCodes = uniqueSortedWarningCodes(
    result.warnings.map((warning) => warning.code),
  );
  const expectedWarningCodes = uniqueSortedWarningCodes(
    referenceCase.expected.warningCodes ?? [],
  );

  if (actualWarningCodes.join(",") !== expectedWarningCodes.join(",")) {
    mismatches.push(
      `warningCodes expected ${expectedWarningCodes.join(",") || "none"} but received ${
        actualWarningCodes.join(",") || "none"
      }`,
    );
  }

  return Object.freeze({
    caseId: referenceCase.caseId,
    passed: mismatches.length === 0,
    mismatches: Object.freeze(mismatches),
    result,
  });
}

export function recreateReferenceOfferPack(
  pack: ReferenceOfferFixturePack,
): ReferenceOfferPackRecreationResult {
  const cases = pack.cases.map(recreateReferenceOfferCase);

  return Object.freeze({
    passed: cases.every((result) => result.passed),
    cases: Object.freeze(cases),
  });
}

export function createReferenceOfferComparisonReport(
  pack: ReferenceOfferFixturePack,
): ReferenceOfferComparisonReport {
  const validation = validateReferenceOfferPack(pack);
  const recreation = recreateReferenceOfferPack(pack);
  const passedCaseCount = recreation.cases.filter((result) => result.passed).length;
  const failedCaseCount = recreation.cases.length - passedCaseCount;
  const historicalCaseWindowSatisfied =
    pack.packType !== "validated-historical-recreation" ||
    isValidatedHistoricalPackSize(pack.cases.length);

  return Object.freeze({
    packId: pack.packId,
    packType: pack.packType,
    caseCount: pack.cases.length,
    validationErrorCount: validation.errors.length,
    validationWarningCount: validation.warnings.length,
    passedCaseCount,
    failedCaseCount,
    historicalCaseWindowSatisfied,
    readyForReviewSession:
      validation.errors.length === 0 &&
      failedCaseCount === 0 &&
      historicalCaseWindowSatisfied,
    cases: Object.freeze(
      recreation.cases.map((result) =>
        Object.freeze({
          caseId: result.caseId,
          passed: result.passed,
          mismatchCount: result.mismatches.length,
          totalWithVatMinor: result.result.totals.totalWithVatMinor,
          warningCodes: uniqueSortedWarningCodes(
            result.result.warnings.map((warning) => warning.code),
          ),
        }),
      ),
    ),
  });
}

export function isValidatedHistoricalPackSize(caseCount: number) {
  return Number.isInteger(caseCount) && caseCount >= 10 && caseCount <= 20;
}

function compareNumber(
  label: string,
  actualValue: number,
  expectedValue: number,
  mismatches: string[],
) {
  if (actualValue !== expectedValue) {
    mismatches.push(`${label} expected ${expectedValue} but received ${actualValue}`);
  }
}

function compareOptionalNumber(
  label: string,
  actualValue: number,
  expectedValue: number | undefined,
  mismatches: string[],
) {
  if (expectedValue === undefined) {
    return;
  }

  compareNumber(label, actualValue, expectedValue, mismatches);
}

function uniqueSortedWarningCodes(codes: readonly CalculationWarningCode[]) {
  return [...new Set(codes)].sort();
}

function unsafeFixtureStrings(value: unknown): string[] {
  const unsafeValues: string[] = [];

  visitStrings(value, (text) => {
    if (privateArtifactPattern.test(text) || emailPattern.test(text) || hasUnsafePhoneLikeText(text)) {
      unsafeValues.push(text);
    }
  });

  return unsafeValues;
}

function hasUnsafePhoneLikeText(text: string) {
  const matches = text.match(longPhonePattern) ?? [];

  return matches.some((match) => {
    const trimmed = match.trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return false;
    }

    const digits = trimmed.replace(/\D/g, "");

    return digits.length >= 8 && (trimmed.includes("+") || /[\s().]/.test(trimmed) || digits.length >= 10);
  });
}

function visitStrings(value: unknown, visitor: (text: string) => void) {
  if (typeof value === "string") {
    visitor(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      visitStrings(item, visitor);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      visitStrings(item, visitor);
    }
  }
}
