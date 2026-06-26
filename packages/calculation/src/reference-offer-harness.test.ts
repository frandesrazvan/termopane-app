import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  createReferenceOfferComparisonReport,
  isValidatedHistoricalPackSize,
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
  return JSON.parse(await readFile(fixtureUrl, "utf8")) as ReferenceOfferFixturePack;
}

describe("reference offer harness", () => {
  it("validates the synthetic pilot pack and required owner-review checklist", async () => {
    const pack = await loadSyntheticPack();
    const validation = validateReferenceOfferPack(pack);

    expect(validation.errors).toEqual([]);
    expect(pack.dataClassification).toBe("synthetic-redacted");
    expect(pack.requirementsChecklist.map((requirement) => requirement.key)).toEqual(
      requiredReviewInputKeys,
    );
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
    expect(recreation.cases.map((result) => result.mismatches)).toEqual([[], []]);
    expect(recreation.cases[0]?.result.totals.totalWithVatMinor).toBe(67_116);
    expect(recreation.cases[1]?.result.totals.totalWithVatMinor).toBe(64_000);
    expect(recreation.cases[1]?.result.warnings.map((warning) => warning.code)).toEqual([
      "MANUAL_OVERRIDE_APPLIED",
    ]);
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
      caseCount: 2,
      validationErrorCount: 0,
      failedCaseCount: 0,
      historicalCaseWindowSatisfied: true,
      readyForReviewSession: true,
    });
    expect(report.cases).toEqual([
      {
        caseId: "synthetic-offer-001",
        passed: true,
        mismatchCount: 0,
        totalWithVatMinor: 67_116,
        warningCodes: [],
      },
      {
        caseId: "synthetic-offer-002",
        passed: true,
        mismatchCount: 0,
        totalWithVatMinor: 64_000,
        warningCodes: ["MANUAL_OVERRIDE_APPLIED"],
      },
    ]);
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
        };
      }),
    };
    const validation = validateReferenceOfferPack(historicalPack);
    const report = createReferenceOfferComparisonReport(historicalPack);

    expect(validation.errors).toEqual([]);
    expect(report.caseCount).toBe(10);
    expect(report.historicalCaseWindowSatisfied).toBe(true);
    expect(report.readyForReviewSession).toBe(true);
  });
});
