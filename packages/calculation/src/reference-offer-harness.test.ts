import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
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
});
