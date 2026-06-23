import { describe, expect, it } from "vitest";
import { getDrawingPlaceholder } from "./index.js";

describe("drawing placeholder", () => {
  it("starts without drawing outputs", () => {
    const placeholder = getDrawingPlaceholder();

    expect(placeholder.status).toBe("placeholder");
    expect(placeholder.supportedOutputs).toHaveLength(0);
  });
});
