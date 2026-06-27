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

export type ReferenceOfferPackType =
  | "synthetic-pilot"
  | "redacted-historical-review"
  | "validated-historical-recreation";

export type ReferenceOfferDataClassification =
  | "synthetic-redacted"
  | "redacted-historical"
  | "redacted-validated-historical";

export type ReferenceOfferReviewStatus =
  | "synthetic-baseline"
  | "pending-business-validation"
  | "draft-redacted"
  | "business-reviewed"
  | "validated-historical"
  | "blocked-missing-data";

export type ReferenceRequirementStatus =
  | "missing"
  | "pending-business-owner"
  | "requires-business-validation"
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

export type ReferencePdfOutputFieldValue =
  string | number | boolean | null | readonly string[];

export type ReferencePdfOutputFieldsExpectation = Readonly<
  Record<string, ReferencePdfOutputFieldValue>
>;

export type ReferenceOfferToleranceExpectation = Readonly<{
  approvedBy: "business-owner" | "synthetic";
  totalsMinor?: Partial<Record<keyof ReferenceOfferTotalsExpectation, number>>;
  pdfOutputFieldsMinor?: Readonly<Record<string, number>>;
}>;

export type ReferenceOfferExpectation = Readonly<{
  itemCount: number;
  materialRequirementCount?: number;
  glassCutCount?: number;
  profileGroupCount?: number;
  warningCodes?: readonly CalculationWarningCode[];
  totals: ReferenceOfferTotalsExpectation;
  pdfOutputFields?: ReferencePdfOutputFieldsExpectation;
  tolerances?: ReferenceOfferToleranceExpectation;
}>;

export type ReferenceOfferCase = Readonly<{
  caseId: string;
  title: string;
  reviewStatus: ReferenceOfferReviewStatus;
  dataClassification: ReferenceOfferDataClassification;
  preferredTemplateKey: "template-a" | "template-b";
  source: ReferenceOfferSource;
  redaction: ReferenceOfferRedaction;
  businessInputStatus: Record<
    RequiredReviewInputKey,
    ReferenceRequirementStatus
  >;
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
  warningMismatches: readonly string[];
  totalMismatches: readonly string[];
  templateFieldMismatches: readonly string[];
  result: QuoteCalculationResult;
}>;

export type ReferenceOfferPackRecreationResult = Readonly<{
  passed: boolean;
  cases: readonly ReferenceOfferRecreationResult[];
}>;

export type ReferenceOfferComparisonStatus = "pass" | "fail" | "missing-data";

export type ReferenceOfferComparisonCaseSummary = Readonly<{
  caseId: string;
  reviewStatus: ReferenceOfferReviewStatus;
  status: ReferenceOfferComparisonStatus;
  passed: boolean;
  mismatchCount: number;
  missingBusinessInputs: readonly RequiredReviewInputKey[];
  warningMismatchCount: number;
  totalMismatchCount: number;
  templateFieldMismatchCount: number;
  totalWithVatMinor: number;
  warningCodes: readonly CalculationWarningCode[];
}>;

export type ReferenceOfferComparisonReport = Readonly<{
  packId: string;
  packType: ReferenceOfferPackType;
  status: ReferenceOfferComparisonStatus;
  caseCount: number;
  missingBusinessInputCount: number;
  warningMismatchCount: number;
  totalMismatchCount: number;
  templateFieldMismatchCount: number;
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

  if (
    pack.packType === "validated-historical-recreation" &&
    !isValidatedHistoricalPackSize(pack.cases.length)
  ) {
    errors.push(
      "Validated historical recreation packs must contain 10-20 cases.",
    );
  }

  if (
    pack.packType === "validated-historical-recreation" &&
    pack.dataClassification !== "redacted-validated-historical"
  ) {
    errors.push(
      "Validated historical recreation packs must be redacted-validated-historical.",
    );
  }

  if (
    pack.packType === "redacted-historical-review" &&
    !["redacted-historical", "redacted-validated-historical"].includes(
      pack.dataClassification,
    )
  ) {
    errors.push(
      "Redacted historical review packs must use a redacted data classification.",
    );
  }

  const checklistKeys = new Set(
    pack.requirementsChecklist.map((requirement) => requirement.key),
  );

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
    errors.push(
      `${prefix} must not point to original business documents inside fixtures.`,
    );
  }

  if (referenceCase.redaction.sourceDocuments !== "none-committed") {
    warnings.push(
      `${prefix} references redacted source documents; keep originals outside Git.`,
    );
  }

  if (
    isRedactedHistoricalStatus(referenceCase.reviewStatus) &&
    referenceCase.source.kind !== "redacted-historical-json"
  ) {
    errors.push(
      `${prefix} redacted historical cases must use redacted-historical-json source kind.`,
    );
  }

  if (
    isRedactedHistoricalStatus(referenceCase.reviewStatus) &&
    (referenceCase.redaction.customer !== "redacted" ||
      referenceCase.redaction.project !== "redacted")
  ) {
    errors.push(
      `${prefix} redacted historical cases must redact customer and project fields.`,
    );
  }

  if (
    referenceCase.reviewStatus === "validated-historical" &&
    referenceCase.dataClassification !== "redacted-validated-historical"
  ) {
    errors.push(
      `${prefix} validated historical cases must be redacted-validated-historical.`,
    );
  }

  for (const key of requiredReviewInputKeys) {
    if (!referenceCase.businessInputStatus[key]) {
      errors.push(`${prefix} missing business input status: ${key}.`);
    }
  }

  const missingBusinessInputs = missingBusinessInputKeysForCase(referenceCase);

  if (
    referenceCase.reviewStatus === "blocked-missing-data" &&
    missingBusinessInputs.length === 0
  ) {
    warnings.push(
      `${prefix} is blocked-missing-data but no missing business inputs were listed.`,
    );
  }

  if (referenceCase.reviewStatus === "validated-historical") {
    const unvalidatedBusinessInputs = requiredReviewInputKeys.filter(
      (key) =>
        !isValidatedHistoricalBusinessInputStatus(
          referenceCase.businessInputStatus[key],
        ),
    );

    if (unvalidatedBusinessInputs.length > 0) {
      errors.push(
        `${prefix} validated historical cases need validated or not-applicable business inputs: ${unvalidatedBusinessInputs.join(
          ", ",
        )}.`,
      );
    }
  }

  if (!referenceCase.expected || !referenceCase.expected.totals) {
    errors.push(`${prefix} must include expected totals.`);
  }

  if (
    referenceCase.reviewStatus === "validated-historical" &&
    referenceCase.expected.tolerances &&
    referenceCase.expected.tolerances.approvedBy !== "business-owner"
  ) {
    errors.push(
      `${prefix} historical rounding tolerances must be approved by business-owner.`,
    );
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
  const warningMismatches: string[] = [];
  const totalMismatches: string[] = [];
  const templateFieldMismatches: string[] = [];

  compareNumber(
    "itemCount",
    result.items.length,
    referenceCase.expected.itemCount,
    mismatches,
  );
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

  for (const [key, expectedValue] of Object.entries(
    referenceCase.expected.totals,
  )) {
    const actualValue = result.totals[key as keyof typeof result.totals];
    const toleranceMinor =
      referenceCase.expected.tolerances?.totalsMinor?.[
        key as keyof ReferenceOfferTotalsExpectation
      ] ?? 0;

    compareNumber(
      `totals.${key}`,
      actualValue,
      expectedValue,
      mismatches,
      totalMismatches,
      toleranceMinor,
    );
  }

  const actualWarningCodes = uniqueSortedWarningCodes(
    result.warnings.map((warning) => warning.code),
  );
  const expectedWarningCodes = uniqueSortedWarningCodes(
    referenceCase.expected.warningCodes ?? [],
  );

  if (actualWarningCodes.join(",") !== expectedWarningCodes.join(",")) {
    const missingWarnings = expectedWarningCodes.filter(
      (code) => !actualWarningCodes.includes(code),
    );
    const unexpectedWarnings = actualWarningCodes.filter(
      (code) => !expectedWarningCodes.includes(code),
    );
    const mismatch = `warningCodes missing expected [${
      missingWarnings.join(",") || "none"
    }], unexpected [${unexpectedWarnings.join(",") || "none"}]`;

    mismatches.push(mismatch);
    warningMismatches.push(mismatch);
  }

  comparePdfOutputFields(
    result,
    referenceCase,
    referenceCase.expected.pdfOutputFields,
    referenceCase.expected.tolerances,
    mismatches,
    templateFieldMismatches,
  );

  return Object.freeze({
    caseId: referenceCase.caseId,
    passed: mismatches.length === 0,
    mismatches: Object.freeze(mismatches),
    warningMismatches: Object.freeze(warningMismatches),
    totalMismatches: Object.freeze(totalMismatches),
    templateFieldMismatches: Object.freeze(templateFieldMismatches),
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
  const passedCaseCount = recreation.cases.filter(
    (result) => result.passed,
  ).length;
  const failedCaseCount = recreation.cases.length - passedCaseCount;
  const missingBusinessInputsByCase = new Map(
    pack.cases.map((referenceCase) => [
      referenceCase.caseId,
      missingBusinessInputKeysForCase(referenceCase),
    ]),
  );
  const missingBusinessInputCount = [
    ...missingBusinessInputsByCase.values(),
  ].reduce((count, missingInputs) => count + missingInputs.length, 0);
  const warningMismatchCount = recreation.cases.reduce(
    (count, result) => count + result.warningMismatches.length,
    0,
  );
  const totalMismatchCount = recreation.cases.reduce(
    (count, result) => count + result.totalMismatches.length,
    0,
  );
  const templateFieldMismatchCount = recreation.cases.reduce(
    (count, result) => count + result.templateFieldMismatches.length,
    0,
  );
  const historicalCaseWindowSatisfied =
    pack.packType !== "validated-historical-recreation" ||
    isValidatedHistoricalPackSize(pack.cases.length);
  const status = comparisonStatus({
    validationErrorCount: validation.errors.length,
    failedCaseCount,
    caseCount: pack.cases.length,
    missingBusinessInputCount,
    historicalCaseWindowSatisfied,
  });

  return Object.freeze({
    packId: pack.packId,
    packType: pack.packType,
    status,
    caseCount: pack.cases.length,
    missingBusinessInputCount,
    warningMismatchCount,
    totalMismatchCount,
    templateFieldMismatchCount,
    validationErrorCount: validation.errors.length,
    validationWarningCount: validation.warnings.length,
    passedCaseCount,
    failedCaseCount,
    historicalCaseWindowSatisfied,
    readyForReviewSession:
      validation.errors.length === 0 &&
      pack.cases.length > 0 &&
      missingBusinessInputCount === 0 &&
      failedCaseCount === 0 &&
      historicalCaseWindowSatisfied,
    cases: Object.freeze(
      recreation.cases.map((result) => {
        const referenceCase = pack.cases.find(
          (item) => item.caseId === result.caseId,
        );

        return Object.freeze({
          caseId: result.caseId,
          reviewStatus:
            referenceCase?.reviewStatus ?? "pending-business-validation",
          status: caseComparisonStatus(result, referenceCase),
          passed: result.passed,
          mismatchCount: result.mismatches.length,
          missingBusinessInputs: Object.freeze(
            missingBusinessInputsByCase.get(result.caseId) ?? [],
          ),
          warningMismatchCount: result.warningMismatches.length,
          totalMismatchCount: result.totalMismatches.length,
          templateFieldMismatchCount: result.templateFieldMismatches.length,
          totalWithVatMinor: result.result.totals.totalWithVatMinor,
          warningCodes: uniqueSortedWarningCodes(
            result.result.warnings.map((warning) => warning.code),
          ),
        });
      }),
    ),
  });
}

export function isValidatedHistoricalPackSize(caseCount: number) {
  return Number.isInteger(caseCount) && caseCount >= 10 && caseCount <= 20;
}

function comparisonStatus(
  input: Readonly<{
    validationErrorCount: number;
    failedCaseCount: number;
    caseCount: number;
    missingBusinessInputCount: number;
    historicalCaseWindowSatisfied: boolean;
  }>,
): ReferenceOfferComparisonStatus {
  if (
    input.validationErrorCount > 0 ||
    input.failedCaseCount > 0 ||
    !input.historicalCaseWindowSatisfied
  ) {
    return "fail";
  }

  if (input.caseCount === 0 || input.missingBusinessInputCount > 0) {
    return "missing-data";
  }

  return "pass";
}

function caseComparisonStatus(
  result: ReferenceOfferRecreationResult,
  referenceCase: ReferenceOfferCase | undefined,
): ReferenceOfferComparisonStatus {
  if (!result.passed) {
    return "fail";
  }

  if (
    !referenceCase ||
    referenceCase.reviewStatus === "blocked-missing-data" ||
    missingBusinessInputKeysForCase(referenceCase).length > 0
  ) {
    return "missing-data";
  }

  return "pass";
}

export function missingBusinessInputKeysForCase(
  referenceCase: ReferenceOfferCase,
): readonly RequiredReviewInputKey[] {
  return Object.freeze(
    requiredReviewInputKeys.filter((key) =>
      isMissingBusinessInputStatus(referenceCase.businessInputStatus[key]),
    ),
  );
}

function compareNumber(
  label: string,
  actualValue: number,
  expectedValue: number,
  mismatches: string[],
  categoryMismatches?: string[],
  tolerance = 0,
) {
  if (Math.abs(actualValue - expectedValue) > tolerance) {
    const toleranceText = tolerance > 0 ? ` within +/- ${tolerance}` : "";
    const mismatch = `${label} expected ${expectedValue}${toleranceText} but received ${actualValue}`;

    mismatches.push(mismatch);
    categoryMismatches?.push(mismatch);
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

function comparePdfOutputFields(
  result: QuoteCalculationResult,
  referenceCase: ReferenceOfferCase,
  expectedFields: ReferencePdfOutputFieldsExpectation | undefined,
  tolerances: ReferenceOfferToleranceExpectation | undefined,
  mismatches: string[],
  templateFieldMismatches: string[],
) {
  if (!expectedFields) {
    return;
  }

  const actualFields = createComparablePdfOutputFields(referenceCase, result);

  for (const [key, expectedValue] of Object.entries(expectedFields)) {
    const actualValue = actualFields[key];
    const toleranceMinor = tolerances?.pdfOutputFieldsMinor?.[key] ?? 0;

    if (!samePdfFieldValue(actualValue, expectedValue, toleranceMinor)) {
      const mismatch = `pdfOutputFields.${key} expected ${formatPdfFieldValue(
        expectedValue,
      )}${toleranceMinor > 0 ? ` within +/- ${toleranceMinor}` : ""} but received ${formatPdfFieldValue(actualValue)}`;

      mismatches.push(mismatch);
      templateFieldMismatches.push(mismatch);
    }
  }
}

function createComparablePdfOutputFields(
  referenceCase: ReferenceOfferCase,
  result: QuoteCalculationResult,
): ReferencePdfOutputFieldsExpectation {
  return Object.freeze({
    templateKey: referenceCase.preferredTemplateKey,
    quoteId: referenceCase.calculationInput.quoteId,
    itemCount: result.items.length,
    totalWithVatMinor: result.totals.totalWithVatMinor,
    warningCodes: uniqueSortedWarningCodes(
      result.warnings.map((warning) => warning.code),
    ),
  });
}

function samePdfFieldValue(
  actualValue: ReferencePdfOutputFieldValue | undefined,
  expectedValue: ReferencePdfOutputFieldValue,
  tolerance = 0,
) {
  if (actualValue === undefined) {
    return false;
  }

  if (
    typeof actualValue === "number" &&
    typeof expectedValue === "number" &&
    tolerance > 0
  ) {
    return Math.abs(actualValue - expectedValue) <= tolerance;
  }

  if (Array.isArray(actualValue) || Array.isArray(expectedValue)) {
    return JSON.stringify(actualValue) === JSON.stringify(expectedValue);
  }

  return actualValue === expectedValue;
}

function formatPdfFieldValue(value: ReferencePdfOutputFieldValue | undefined) {
  return value === undefined ? "missing" : JSON.stringify(value);
}

function isRedactedHistoricalStatus(status: ReferenceOfferReviewStatus) {
  return (
    status === "draft-redacted" ||
    status === "business-reviewed" ||
    status === "validated-historical" ||
    status === "blocked-missing-data"
  );
}

function isMissingBusinessInputStatus(
  status: ReferenceRequirementStatus | undefined,
) {
  return (
    status === undefined ||
    status === "missing" ||
    status === "pending-business-owner" ||
    status === "requires-business-validation"
  );
}

function isValidatedHistoricalBusinessInputStatus(
  status: ReferenceRequirementStatus | undefined,
) {
  return status === "validated" || status === "not-applicable";
}

function uniqueSortedWarningCodes(codes: readonly CalculationWarningCode[]) {
  return [...new Set(codes)].sort();
}

function unsafeFixtureStrings(value: unknown): string[] {
  const unsafeValues: string[] = [];

  visitStrings(value, (text) => {
    if (
      privateArtifactPattern.test(text) ||
      emailPattern.test(text) ||
      hasUnsafePhoneLikeText(text)
    ) {
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

    return (
      digits.length >= 8 &&
      (trimmed.includes("+") || /[\s().]/.test(trimmed) || digits.length >= 10)
    );
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
