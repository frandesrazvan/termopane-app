export type CalculationPlaceholder = Readonly<{
  packageName: "@termopane/calculation";
  status: "placeholder";
  guardrails: readonly string[];
}>;

export function getCalculationPlaceholder(): CalculationPlaceholder {
  return Object.freeze({
    packageName: "@termopane/calculation",
    status: "placeholder",
    guardrails: Object.freeze([
      "No business formulas are implemented in the foundation scaffold.",
      "Future calculation inputs must be frozen snapshots.",
      "Future calculation outputs must include warnings and trace data.",
    ]),
  });
}
