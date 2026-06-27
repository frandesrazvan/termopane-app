import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import {
  createReferenceOfferComparisonReport,
  recreateReferenceOfferPack,
  validateReferenceOfferPack,
  type ReferenceOfferFixturePack,
} from "./reference-offer-harness.js";

const defaultFixturePath = "fixtures/reference-offers/synthetic-offers.json";

async function main() {
  const fixturePath = resolve(process.cwd(), process.argv[2] ?? defaultFixturePath);
  const pack = JSON.parse(await readFile(fixturePath, "utf8")) as ReferenceOfferFixturePack;
  const validation = validateReferenceOfferPack(pack);
  const recreation = recreateReferenceOfferPack(pack);
  const report = createReferenceOfferComparisonReport(pack);

  const lines = [
    "Reference offer validation report",
    `Pack: ${report.packId}`,
    `Type: ${report.packType}`,
    `Cases: ${report.caseCount}`,
    `Missing business inputs: ${report.missingBusinessInputCount}`,
    `Warning mismatches: ${report.warningMismatchCount}`,
    `Total mismatches: ${report.totalMismatchCount}`,
    `Template field mismatches: ${report.templateFieldMismatchCount}`,
    `Validation errors: ${report.validationErrorCount}`,
    `Validation warnings: ${report.validationWarningCount}`,
    `Passed cases: ${report.passedCaseCount}`,
    `Failed cases: ${report.failedCaseCount}`,
    `Historical 10-20 case window: ${
      report.historicalCaseWindowSatisfied ? "satisfied" : "not satisfied"
    }`,
    `Ready for review session: ${report.readyForReviewSession ? "yes" : "no"}`,
  ];

  if (validation.errors.length > 0) {
    lines.push("", "Validation errors:");
    lines.push(...validation.errors.map((error) => `- ${error}`));
  }

  if (validation.warnings.length > 0) {
    lines.push("", "Validation warnings:");
    lines.push(...validation.warnings.map((warning) => `- ${warning}`));
  }

  const casesWithMissingInputs = report.cases.filter(
    (referenceCase) => referenceCase.missingBusinessInputs.length > 0,
  );

  if (casesWithMissingInputs.length > 0) {
    lines.push("", "Missing business inputs by case:");
    lines.push(
      ...casesWithMissingInputs.map(
        (referenceCase) =>
          `- ${referenceCase.caseId}: ${referenceCase.missingBusinessInputs.join(", ")}`,
      ),
    );
  }

  const failedCases = recreation.cases.filter((referenceCase) => !referenceCase.passed);

  if (failedCases.length > 0) {
    lines.push("", "Case mismatches:");
    for (const referenceCase of failedCases) {
      lines.push(`- ${referenceCase.caseId}`);
      lines.push(...referenceCase.mismatches.map((mismatch) => `  - ${mismatch}`));
    }
  }

  console.log(lines.join("\n"));

  if (!report.readyForReviewSession) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
