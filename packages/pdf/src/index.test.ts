import { describe, expect, it } from "vitest";
import { getPdfPlaceholder } from "./index.js";

describe("pdf placeholder", () => {
  it("keeps future PDF work tied to quote versions", () => {
    const placeholder = getPdfPlaceholder();

    expect(placeholder.status).toBe("placeholder");
    expect(placeholder.bindsToQuoteVersion).toBe(true);
  });
});
