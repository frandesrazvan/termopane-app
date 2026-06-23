import { describe, expect, it } from "vitest";
import { getCalculationPlaceholder } from "./index.js";

describe("calculation placeholder", () => {
  it("documents that formulas are intentionally absent", () => {
    const placeholder = getCalculationPlaceholder();

    expect(placeholder.status).toBe("placeholder");
    expect(placeholder.guardrails).toContain(
      "No business formulas are implemented in the foundation scaffold.",
    );
  });
});
