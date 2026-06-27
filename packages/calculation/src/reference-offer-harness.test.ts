import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  createReferenceOfferComparisonReport,
  isValidatedHistoricalPackSize,
  missingBusinessInputKeysForCase,
  recreateReferenceOfferCase,
  recreateReferenceOfferPack,
  requiredReviewInputKeys,
  validateReferenceOfferCase,
  validateReferenceOfferPack,
  type ReferenceOfferFixturePack,
} from "./reference-offer-harness.js";

const fixtureUrl = new URL(
  "../../../fixtures/reference-offers/synthetic-offers.json",
  import.meta.url,
);

async function loadSyntheticPack() {
  return JSON.parse(
    await readFile(fixtureUrl, "utf8"),
  ) as ReferenceOfferFixturePack;
}

describe("reference offer harness", () => {
  it("validates the synthetic pilot pack and required owner-review checklist", async () => {
    const pack = await loadSyntheticPack();
    const validation = validateReferenceOfferPack(pack);

    expect(validation.errors).toEqual([]);
    expect(pack.dataClassification).toBe("synthetic-redacted");
    expect(
      pack.requirementsChecklist.map((requirement) => requirement.key),
    ).toEqual(requiredReviewInputKeys);
    expect(
      pack.requirementsChecklist.every(
        (requirement) => requirement.status === "pending-business-owner",
      ),
    ).toBe(true);
  });

  it("recreates synthetic reference offers with expected totals and warnings", async () => {
    const pack = await loadSyntheticPack();
    const recreation = recreateReferenceOfferPack(pack);

    expect(recreation.passed).toBe(true);
    expect(recreation.cases).toHaveLength(2);
    expect(recreation.cases.map((result) => result.mismatches)).toEqual([
      [],
      [],
    ]);
    expect(recreation.cases[0]?.result.totals.totalWithVatMinor).toBe(67_116);
    expect(recreation.cases[1]?.result.totals.totalWithVatMinor).toBe(64_000);
    expect(
      recreation.cases[1]?.result.warnings.map((warning) => warning.code),
    ).toEqual(["MANUAL_OVERRIDE_APPLIED"]);
  });

  it("rejects private artifact references and unredacted contact strings", async () => {
    const pack = await loadSyntheticPack();
    const unsafeCase = {
      ...pack.cases[0]!,
      source: {
        ...pack.cases[0]!.source,
        privateArtifactsCommitted: true,
        notes: "original-offer.pdf owner@example.test",
      },
    };

    expect(validateReferenceOfferCase(unsafeCase).errors).toEqual(
      expect.arrayContaining([
        "Case synthetic-offer-001 must not commit private PDFs or source artifacts.",
        "Case synthetic-offer-001 contains unsafe fixture text: original-offer.pdf owner@example.test.",
      ]),
    );
  });

  it("documents the 10-20 case window for future validated historical packs", () => {
    expect(isValidatedHistoricalPackSize(9)).toBe(false);
    expect(isValidatedHistoricalPackSize(10)).toBe(true);
    expect(isValidatedHistoricalPackSize(20)).toBe(true);
    expect(isValidatedHistoricalPackSize(21)).toBe(false);
  });

  it("summarizes comparison readiness for business-owner review sessions", async () => {
    const pack = await loadSyntheticPack();
    const report = createReferenceOfferComparisonReport(pack);

    expect(report).toMatchObject({
      packId: "synthetic-redacted-pilot-reference-offers",
      packType: "synthetic-pilot",
      status: "pass",
      caseCount: 2,
      missingBusinessInputCount: 0,
      warningMismatchCount: 0,
      totalMismatchCount: 0,
      templateFieldMismatchCount: 0,
      validationErrorCount: 0,
      failedCaseCount: 0,
      historicalCaseWindowSatisfied: true,
      readyForReviewSession: true,
    });
    expect(report.cases).toEqual([
      {
        caseId: "synthetic-offer-001",
        reviewStatus: "synthetic-baseline",
        status: "pass",
        passed: true,
        mismatchCount: 0,
        missingBusinessInputs: [],
        warningMismatchCount: 0,
        totalMismatchCount: 0,
        templateFieldMismatchCount: 0,
        totalWithVatMinor: 67_116,
        warningCodes: [],
      },
      {
        caseId: "synthetic-offer-002",
        reviewStatus: "synthetic-baseline",
        status: "pass",
        passed: true,
        mismatchCount: 0,
        missingBusinessInputs: [],
        warningMismatchCount: 0,
        totalMismatchCount: 0,
        templateFieldMismatchCount: 0,
        totalWithVatMinor: 64_000,
        warningCodes: ["MANUAL_OVERRIDE_APPLIED"],
      },
    ]);
  });

  it("supports redacted review statuses and reports missing business inputs", async () => {
    const pack = await loadSyntheticPack();
    const blockedCase = {
      ...pack.cases[0]!,
      reviewStatus: "blocked-missing-data",
      dataClassification: "redacted-historical",
      source: {
        kind: "redacted-historical-json",
        originalDocumentAvailable: false,
        privateArtifactsCommitted: false,
      },
      redaction: {
        customer: "redacted",
        project: "redacted",
        sourceDocuments: "none-committed",
      },
      businessInputStatus: {
        ...pack.cases[0]!.businessInputStatus,
        glassPriceList: "missing",
        hardwareRules: "requires-business-validation",
      },
    } satisfies ReferenceOfferFixturePack["cases"][number];
    const report = createReferenceOfferComparisonReport({
      ...pack,
      packType: "redacted-historical-review",
      dataClassification: "redacted-historical",
      cases: [blockedCase],
    });

    expect(validateReferenceOfferCase(blockedCase).errors).toEqual([]);
    expect(missingBusinessInputKeysForCase(blockedCase)).toEqual([
      "glassPriceList",
      "hardwareRules",
    ]);
    expect(report).toMatchObject({
      caseCount: 1,
      status: "missing-data",
      missingBusinessInputCount: 2,
      readyForReviewSession: false,
    });
    expect(report.cases[0]).toMatchObject({
      caseId: "synthetic-offer-001",
      reviewStatus: "blocked-missing-data",
      status: "missing-data",
      missingBusinessInputs: ["glassPriceList", "hardwareRules"],
    });
  });

  it("classifies warning, total, and template field mismatches", async () => {
    const pack = await loadSyntheticPack();
    const failingCase = {
      ...pack.cases[0]!,
      expected: {
        ...pack.cases[0]!.expected,
        warningCodes: ["MISSING_GLASS_PRICE"],
        totals: {
          ...pack.cases[0]!.expected.totals,
          totalWithVatMinor: 1,
        },
        pdfOutputFields: {
          ...pack.cases[0]!.expected.pdfOutputFields,
          templateKey: "template-b",
        },
      },
    } satisfies ReferenceOfferFixturePack["cases"][number];
    const recreation = recreateReferenceOfferCase(failingCase);
    const report = createReferenceOfferComparisonReport({
      ...pack,
      cases: [failingCase],
    });

    expect(recreation.passed).toBe(false);
    expect(recreation.warningMismatches).toHaveLength(1);
    expect(recreation.warningMismatches[0]).toBe(
      "warningCodes missing expected [MISSING_GLASS_PRICE], unexpected [none]",
    );
    expect(recreation.totalMismatches).toHaveLength(1);
    expect(recreation.templateFieldMismatches).toHaveLength(1);
    expect(report).toMatchObject({
      warningMismatchCount: 1,
      totalMismatchCount: 1,
      templateFieldMismatchCount: 1,
      failedCaseCount: 1,
      status: "fail",
      readyForReviewSession: false,
    });
  });

  it("applies explicit owner-approved rounding tolerances to total and template fields", async () => {
    const pack = await loadSyntheticPack();
    const toleratedCase = {
      ...pack.cases[0]!,
      expected: {
        ...pack.cases[0]!.expected,
        totals: {
          ...pack.cases[0]!.expected.totals,
          totalWithVatMinor: 67_117,
        },
        pdfOutputFields: {
          ...pack.cases[0]!.expected.pdfOutputFields,
          totalWithVatMinor: 67_117,
        },
        tolerances: {
          approvedBy: "synthetic",
          totalsMinor: {
            totalWithVatMinor: 1,
          },
          pdfOutputFieldsMinor: {
            totalWithVatMinor: 1,
          },
        },
      },
    } satisfies ReferenceOfferFixturePack["cases"][number];
    const recreation = recreateReferenceOfferCase(toleratedCase);

    expect(recreation.passed).toBe(true);
    expect(recreation.totalMismatches).toEqual([]);
    expect(recreation.templateFieldMismatches).toEqual([]);
  });

  it("requires business-owner approval for historical rounding tolerances", async () => {
    const pack = await loadSyntheticPack();
    const historicalCase = {
      ...pack.cases[0]!,
      reviewStatus: "validated-historical",
      dataClassification: "redacted-validated-historical",
      source: {
        kind: "redacted-historical-json",
        originalDocumentAvailable: false,
        privateArtifactsCommitted: false,
      },
      redaction: {
        customer: "redacted",
        project: "redacted",
        sourceDocuments: "none-committed",
      },
      businessInputStatus: Object.fromEntries(
        requiredReviewInputKeys.map((key) => [key, "validated"]),
      ) as ReferenceOfferFixturePack["cases"][number]["businessInputStatus"],
      expected: {
        ...pack.cases[0]!.expected,
        tolerances: {
          approvedBy: "synthetic",
          totalsMinor: {
            totalWithVatMinor: 1,
          },
        },
      },
    } satisfies ReferenceOfferFixturePack["cases"][number];

    expect(validateReferenceOfferCase(historicalCase).errors).toContain(
      "Case synthetic-offer-001 historical rounding tolerances must be approved by business-owner.",
    );
  });

  it("accepts a 10-case redacted historical comparison pack shape", async () => {
    const pack = await loadSyntheticPack();
    const historicalPack: ReferenceOfferFixturePack = {
      ...pack,
      packId: "redacted-historical-review-pack",
      packType: "validated-historical-recreation",
      dataClassification: "redacted-validated-historical",
      requirementsChecklist: pack.requirementsChecklist.map((requirement) => ({
        ...requirement,
        status: "validated",
      })),
      cases: Array.from({ length: 10 }, (_, index) => {
        const sourceCase = pack.cases[index % pack.cases.length]!;
        const caseId = `redacted-historical-${String(index + 1).padStart(2, "0")}`;

        return {
          ...sourceCase,
          caseId,
          title: `Redacted historical recreation ${index + 1}`,
          reviewStatus: "validated-historical",
          dataClassification: "redacted-validated-historical",
          source: {
            kind: "redacted-historical-json",
            originalDocumentAvailable: false,
            privateArtifactsCommitted: false,
            notes: "Redacted historical JSON only; originals stay outside Git.",
          },
          redaction: {
            customer: "redacted",
            project: "redacted",
            sourceDocuments: "none-committed",
          },
          businessInputStatus: Object.fromEntries(
            requiredReviewInputKeys.map((key) => [key, "validated"]),
          ) as ReferenceOfferFixturePack["cases"][number]["businessInputStatus"],
          calculationInput: {
            ...sourceCase.calculationInput,
            quoteId: caseId,
          },
          expected: {
            ...sourceCase.expected,
            pdfOutputFields: sourceCase.expected.pdfOutputFields
              ? {
                  ...sourceCase.expected.pdfOutputFields,
                  quoteId: caseId,
                }
              : undefined,
          },
        };
      }),
    };
    const validation = validateReferenceOfferPack(historicalPack);
    const report = createReferenceOfferComparisonReport(historicalPack);

    expect(validation.errors).toEqual([]);
    expect(report.caseCount).toBe(10);
    expect(report.status).toBe("pass");
    expect(report.historicalCaseWindowSatisfied).toBe(true);
    expect(report.readyForReviewSession).toBe(true);
  });

  it("keeps an empty redacted historical review pack in missing-data status", async () => {
    const pack = await loadSyntheticPack();
    const emptyHistoricalPack: ReferenceOfferFixturePack = {
      ...pack,
      packId: "owner-validated-redacted-historical-quotes",
      packType: "redacted-historical-review",
      dataClassification: "redacted-historical",
      requirementsChecklist: pack.requirementsChecklist.map((requirement) => ({
        ...requirement,
        status: "missing",
      })),
      cases: [],
    };
    const validation = validateReferenceOfferPack(emptyHistoricalPack);
    const report = createReferenceOfferComparisonReport(emptyHistoricalPack);

    expect(validation.errors).toEqual([]);
    expect(validation.warnings).toEqual([
      "Reference offer pack has no cases yet.",
    ]);
    expect(report).toMatchObject({
      packId: "owner-validated-redacted-historical-quotes",
      packType: "redacted-historical-review",
      status: "missing-data",
      caseCount: 0,
      missingBusinessInputCount: 0,
      validationWarningCount: 1,
      readyForReviewSession: false,
    });
  });
});
