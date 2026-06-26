import { describe, expect, it } from "vitest";
import {
  containsBusinessValidationMarker,
  summarizeBusinessValidationRecords,
} from "./business-validation";

describe("business validation summary", () => {
  it("groups tenant-owned catalog and calculation fields that require owner validation", () => {
    const summary = summarizeBusinessValidationRecords([
      {
        area: "profileItems",
        label: "Toc sintetic",
        recordId: "profile-1",
        values: [
          {
            deductionRule: {
              validationStatus: "requires business validation",
            },
          },
        ],
      },
      {
        area: "hardwareKits",
        label: "Feronerie oscilo",
        recordId: "hardware-1",
        values: [{ quantityRule: { requiresBusinessValidation: true } }],
      },
      {
        area: "companySettings",
        label: "Setari demo",
        recordId: "settings-1",
        values: [
          {
            calculationDefaults: {
              note: "Calculul necesita validare business inainte de productie.",
            },
          },
        ],
      },
    ]);

    expect(summary.hasPending).toBe(true);
    expect(summary.total).toBe(3);
    expect(summary.areas).toEqual([
      { area: "companySettings", label: "Setări companie și calcul", count: 1 },
      { area: "profileItems", label: "Profile și reguli liniare", count: 1 },
      { area: "hardwareKits", label: "Feronerie", count: 1 },
    ]);
    expect(summary.items.map((item) => item.label)).toEqual([
      "Toc sintetic",
      "Feronerie oscilo",
      "Setari demo",
    ]);
  });

  it("ignores ordinary fixture-safe strings without validation markers", () => {
    const summary = summarizeBusinessValidationRecords([
      {
        area: "colorFinishes",
        label: "Culoare sintetica",
        values: ["Synthetic supplier note for tests only."],
      },
      {
        area: "priceLists",
        label: "Lista demo",
        values: [{ note: "Lista de test fara formula de productie." }],
      },
    ]);

    expect(summary.hasPending).toBe(false);
    expect(summary.total).toBe(0);
    expect(summary.areas).toEqual([]);
  });

  it("detects nested Romanian and English marker text", () => {
    expect(
      containsBusinessValidationMarker({
        commercial: [{ status: "pending-business-validation" }],
      }),
    ).toBe(true);
    expect(
      containsBusinessValidationMarker({
        configuration: { validationStatus: "necesita validare business" },
      }),
    ).toBe(true);
    expect(containsBusinessValidationMarker({ configuration: { status: "validat" } })).toBe(false);
  });
});
