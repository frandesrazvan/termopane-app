import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import {
  createReferenceOfferComparisonReport,
  recreateReferenceOfferPack,
  validateReferenceOfferPack,
  type ReferenceOfferFixturePack,
  type ReferenceOfferComparisonReport,
} from "./reference-offer-harness.js";

const defaultFixturePaths = [
  "fixtures/reference-offers/synthetic-offers.json",
  "fixtures/reference-offers/owner-validated-historical-pack.json",
];

async function main() {
  const fixturePaths = process.argv.slice(2);
  const pathsToValidate =
    fixturePaths.length > 0 ? fixturePaths : defaultFixturePaths;
  const reports: ReferenceOfferComparisonReport[] = [];
  const output: string[] = [];

  for (const fixturePathInput of pathsToValidate) {
    const fixturePath = resolve(process.cwd(), fixturePathInput);
    const { lines, report } = await validateFixturePath(fixturePath);

    if (output.length > 0) {
      output.push("");
    }

    output.push(...lines);
    reports.push(report);
  }

  console.log(output.join("\n"));

  if (reports.some((report) => report.status === "fail")) {
    process.exitCode = 1;
  }
}

async function validateFixturePath(fixturePath: string) {
  const pack = JSON.parse(
    await readFile(fixturePath, "utf8"),
  ) as ReferenceOfferFixturePack;
  const validation = validateReferenceOfferPack(pack);
  const recreation = recreateReferenceOfferPack(pack);
  const report = createReferenceOfferComparisonReport(pack);

  const lines = [
    "Reference offer validation report",
    `Path: ${fixturePath}`,
    `Pack: ${report.packId}`,
    `Type: ${report.packType}`,
    `Status: ${report.status}`,
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

  if (pack.requirementsChecklist.length > 0) {
    lines.push("", "Business input status:");
    lines.push(
      ...pack.requirementsChecklist.map(
        (requirement) => `- ${requirement.key}: ${requirement.status}`,
      ),
    );
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

  lines.push("", "Case status:");

  if (report.cases.length === 0) {
    lines.push(
      "- none: missing-data (no redacted owner cases have been committed yet)",
    );
  } else {
    lines.push(
      ...report.cases.map((referenceCase) => {
        const missingInputs =
          referenceCase.missingBusinessInputs.length > 0
            ? `, missing inputs: ${referenceCase.missingBusinessInputs.join(", ")}`
            : "";
        const mismatchText =
          referenceCase.mismatchCount > 0
            ? `, mismatches: ${referenceCase.mismatchCount}`
            : "";

        return `- ${referenceCase.caseId}: ${referenceCase.status} (${referenceCase.reviewStatus}${missingInputs}${mismatchText})`;
      }),
    );
  }

  const failedCases = recreation.cases.filter(
    (referenceCase) => !referenceCase.passed,
  );

  if (failedCases.length > 0) {
    lines.push("", "Case mismatches:");
    for (const referenceCase of failedCases) {
      lines.push(`- ${referenceCase.caseId}`);
      lines.push(
        ...referenceCase.mismatches.map((mismatch) => `  - ${mismatch}`),
      );
    }
  }

  return { lines, report };
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
