import { describe, expect, it } from "vitest";
import {
  calculateElement,
  calculateQuote,
  type CalculationItemInput,
  type CustomManualLineItemInput,
  type FixedWindowElementInput,
} from "./index.js";

const commercialRules = {
  markupBasisPoints: 2_000,
  discountBasisPoints: 1_000,
  vatBasisPoints: 1_900,
};

const baseInput: FixedWindowElementInput = {
  elementId: "item-1",
  type: "fixed-window",
  quantity: 1,
  dimensions: {
    widthMm: 1_200,
    heightMm: 1_400,
  },
  glass: {
    id: "glass-clear-24",
    label: "Synthetic clear 24mm",
    deductionWidthMm: 80,
    deductionHeightMm: 100,
    minBillableAreaM2: 1.5,
    unitPriceMinorPerM2: 10_000,
  },
  frameProfile: {
    id: "frame-a",
    label: "Synthetic fixed frame",
    unitPriceMinorPerMeter: 1_000,
  },
  commercialRules,
};

const customLine: CustomManualLineItemInput = {
  elementId: "custom-1",
  type: "custom-line",
  description: "Synthetic manual service line",
  quantity: 2,
  unit: "each",
  unitPriceMinor: 5_000,
  commercialRules,
};

describe("calculateElement", () => {
  it("preserves the fixed-window fixture behavior for glass dimensions and billable area", () => {
    const result = calculateElement(baseInput);

    expect(result.glass?.widthMm).toBe(1_120);
    expect(result.glass?.heightMm).toBe(1_300);
    expect(result.glass?.areaM2).toBe(1.456);
    expect(result.glass?.billableAreaM2).toBe(1.5);
    expect(result.glass?.totalBillableAreaM2).toBe(1.5);
    expect(result.totals.glassCostMinor).toBe(15_000);
    expect(result.glassCuts).toMatchObject([
      {
        itemId: "item-1",
        glassId: "glass-clear-24",
        widthMm: 1_120,
        heightMm: 1_300,
        totalBillableAreaM2: 1.5,
      },
    ]);
  });

  it("calculates rectangular frame profile linear meters and material requirements", () => {
    const result = calculateElement({
      ...baseInput,
      quantity: 2,
    });

    expect(result.profiles).toHaveLength(1);
    expect(result.profiles[0]?.linearMetersPerElement).toBe(5.2);
    expect(result.profiles[0]?.totalLinearMeters).toBe(10.4);
    expect(result.profileLinearMeters[0]?.sourceRule).toBe("rectangular-frame-perimeter");
    expect(result.totals.profileCostMinor).toBe(10_400);
    expect(result.materialRequirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          materialType: "glass",
          quantity: 3,
          costMinor: 30_000,
        }),
        expect.objectContaining({
          materialType: "profile",
          quantity: 10.4,
          costMinor: 10_400,
        }),
      ]),
    );
  });

  it("calculates material cost, markup, discount, and VAT using integer minor units", () => {
    const result = calculateElement({
      ...baseInput,
      dimensions: {
        widthMm: 1_000,
        heightMm: 1_000,
      },
      glass: {
        ...baseInput.glass,
        deductionWidthMm: 0,
        deductionHeightMm: 0,
        minBillableAreaM2: 0,
        unitPriceMinorPerM2: 10_000,
      },
      frameProfile: {
        ...baseInput.frameProfile,
        unitPriceMinorPerMeter: 1_000,
      },
      commercialRules,
    });

    expect(result.totals.materialCostMinor).toBe(14_000);
    expect(result.totals.markupMinor).toBe(2_800);
    expect(result.totals.discountMinor).toBe(1_680);
    expect(result.totals.subtotalAfterDiscountMinor).toBe(15_120);
    expect(result.totals.vatMinor).toBe(2_873);
    expect(result.totals.totalWithVatMinor).toBe(17_993);
  });

  it("applies a manual final-total override and records audit warning and trace", () => {
    const result = calculateElement({
      ...baseInput,
      manualOverride: {
        target: "totalWithVat",
        amountMinor: 20_000,
        reason: "Synthetic negotiated round total",
        actorId: "user-synthetic",
        timestamp: "2026-06-24T00:00:00.000Z",
        auditReferenceId: "audit-1",
      },
    });

    expect(result.totals.totalWithVatMinor).toBe(20_000);
    expect(result.totals.totalBeforeManualOverrideMinor).not.toBe(20_000);
    expect(result.totals.manualAdjustmentMinor).toBe(
      20_000 - result.totals.totalBeforeManualOverrideMinor,
    );
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "MANUAL_OVERRIDE_APPLIED",
    );
    expect(result.trace.some((entry) => entry.step === "manualOverride")).toBe(true);
  });

  it("warns when deduction configuration is missing instead of inventing values", () => {
    const result = calculateElement({
      ...baseInput,
      glass: {
        ...baseInput.glass,
        deductionWidthMm: undefined,
      },
    });

    expect(result.glass?.widthMm).toBeNull();
    expect(result.glassCuts).toEqual([]);
    expect(result.totals.glassCostMinor).toBe(0);
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "MISSING_GLASS_DEDUCTION",
    );
  });

  it("warns when fixed-window prices are missing and keeps requirements explicit", () => {
    const result = calculateElement({
      ...baseInput,
      glass: {
        ...baseInput.glass,
        unitPriceMinorPerM2: undefined,
      },
      frameProfile: {
        ...baseInput.frameProfile,
        unitPriceMinorPerMeter: undefined,
      },
    });

    expect(result.totals.glassCostMinor).toBe(0);
    expect(result.totals.profileCostMinor).toBe(0);
    expect(result.materialRequirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ materialType: "glass", unitPriceMinor: null }),
        expect.objectContaining({ materialType: "profile", unitPriceMinor: null }),
      ]),
    );
    expect(result.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining(["MISSING_GLASS_PRICE", "MISSING_PROFILE_PRICE"]),
    );
  });

  it("zeros total quantities and costs for zero quantity", () => {
    const result = calculateElement({
      ...baseInput,
      quantity: 0,
    });

    expect(result.glass?.widthMm).toBe(1_120);
    expect(result.glass?.heightMm).toBe(1_300);
    expect(result.glass?.totalBillableAreaM2).toBe(0);
    expect(result.profiles[0]?.linearMetersPerElement).toBe(0);
    expect(result.profiles[0]?.totalLinearMeters).toBe(0);
    expect(result.totals).toMatchObject({
      glassCostMinor: 0,
      profileCostMinor: 0,
      materialCostMinor: 0,
      totalWithVatMinor: 0,
    });
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "INVALID_QUANTITY",
    );
    expect(result.trace.some((entry) => entry.note?.includes("quantity is invalid"))).toBe(
      true,
    );
  });

  it("blocks glass and profile calculations for invalid dimensions", () => {
    const result = calculateElement({
      ...baseInput,
      dimensions: {
        widthMm: 0,
        heightMm: -1,
      },
    });

    expect(result.glass?.widthMm).toBeNull();
    expect(result.glass?.heightMm).toBeNull();
    expect(result.profiles[0]?.linearMetersPerElement).toBe(0);
    expect(result.profiles[0]?.totalLinearMeters).toBe(0);
    expect(result.totals.materialCostMinor).toBe(0);
    expect(result.totals.totalWithVatMinor).toBe(0);
    expect(result.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining(["INVALID_DIMENSION", "CALCULATION_BLOCKED"]),
    );
    expect(result.trace.some((entry) => entry.note?.includes("width or height is invalid"))).toBe(
      true,
    );
  });

  it("does not produce negative or override-inflated totals from invalid input", () => {
    const result = calculateElement({
      ...baseInput,
      quantity: -3,
      dimensions: {
        widthMm: 0,
        heightMm: -1,
      },
      manualOverride: {
        target: "totalWithVat",
        amountMinor: 50_000,
        reason: "Synthetic override that should be ignored for invalid input",
      },
    });

    const totals = Object.values(result.totals);

    expect(totals.every((total) => total >= 0)).toBe(true);
    expect(result.totals.totalWithVatMinor).toBe(0);
    expect(result.totals.manualAdjustmentMinor).toBe(0);
    expect(result.profiles[0]?.totalLinearMeters).toBe(0);
    expect(result.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining([
        "INVALID_DIMENSION",
        "INVALID_QUANTITY",
        "CALCULATION_BLOCKED",
      ]),
    );
    expect(result.trace.some((entry) => entry.note?.includes("Manual override was not applied"))).toBe(
      true,
    );
  });
});

describe("calculateQuote", () => {
  it("supports custom manual line items with explicit snapshot prices", () => {
    const quote = calculateQuote({
      quoteId: "quote-custom",
      commercialRules,
      items: [customLine],
    });

    expect(quote.items[0]?.type).toBe("custom-line");
    expect(quote.items[0]?.totals.customLineCostMinor).toBe(10_000);
    expect(quote.items[0]?.materialRequirements).toEqual([
      expect.objectContaining({
        materialType: "custom-line",
        label: "Synthetic manual service line",
        quantity: 2,
        costMinor: 10_000,
      }),
    ]);
  });

  it("aggregates quote totals, material requirements, glass cuts, and grouped profile meters", () => {
    const quote = calculateQuote({
      quoteId: "quote-1",
      commercialRules,
      items: [
        baseInput,
        {
          ...baseInput,
          elementId: "item-2",
          quantity: 2,
        },
        customLine,
      ],
    });

    const expectedTotal = quote.items.reduce(
      (sum, item) => sum + item.totals.totalWithVatMinor,
      0,
    );

    expect(quote.quoteId).toBe("quote-1");
    expect(quote.items).toHaveLength(3);
    expect(quote.elements).toBe(quote.items);
    expect(quote.totals.totalWithVatMinor).toBe(expectedTotal);
    expect(quote.materialRequirements.length).toBeGreaterThanOrEqual(5);
    expect(quote.glassCuts).toHaveLength(2);
    expect(quote.profileLinearMeters).toMatchObject([
      {
        profileId: "frame-a",
        totalLinearMeters: 15.6,
        costMinor: 15_600,
        itemIds: ["item-1", "item-2"],
      },
    ]);
    expect(quote.trace.some((entry) => entry.step === "quoteTotals")).toBe(true);
    expect(quote.trace.some((entry) => entry.step === "glassDimensions")).toBe(true);
  });

  it("applies quote-level discounts before quote-level manual override", () => {
    const quoteBeforeAdjustments = calculateQuote({
      quoteId: "quote-before-adjustment",
      commercialRules,
      items: [baseInput, customLine],
    });
    const quote = calculateQuote({
      quoteId: "quote-adjusted",
      commercialRules,
      items: [baseInput, customLine],
      quoteDiscount: {
        amountMinor: 1_000,
        reason: "Synthetic quote-level discount",
        actorId: "user-synthetic",
      },
      manualOverride: {
        target: "quoteTotalWithVat",
        amountMinor: 40_000,
        reason: "Synthetic final negotiated quote total",
        auditReferenceId: "audit-quote-override",
      },
    });

    expect(quote.totals.quoteDiscountMinor).toBe(1_000);
    expect(quote.totals.discountMinor).toBe(
      quoteBeforeAdjustments.totals.itemDiscountMinor + 1_000,
    );
    expect(quote.totals.totalBeforeManualOverrideMinor).toBeLessThan(
      quoteBeforeAdjustments.totals.totalWithVatMinor,
    );
    expect(quote.totals.totalWithVatMinor).toBe(40_000);
    expect(quote.totals.manualAdjustmentMinor).toBe(
      40_000 - quote.totals.totalBeforeManualOverrideMinor,
    );
    expect(quote.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining(["QUOTE_DISCOUNT_APPLIED", "MANUAL_OVERRIDE_APPLIED"]),
    );
    expect(quote.trace.map((entry) => entry.step)).toEqual(
      expect.arrayContaining(["quoteDiscount", "manualOverride", "quoteTotals"]),
    );
  });

  it("keeps item-level manual adjustments when a quote-level discount is applied", () => {
    const quoteWithoutItemOverride = calculateQuote({
      quoteId: "quote-discount-only",
      commercialRules,
      items: [baseInput],
      quoteDiscount: {
        amountMinor: 1_000,
        reason: "Synthetic quote-level discount",
      },
    });
    const quoteWithItemOverride = calculateQuote({
      quoteId: "quote-item-override-and-discount",
      commercialRules,
      items: [
        {
          ...baseInput,
          manualOverride: {
            target: "totalWithVat",
            amountMinor: 20_000,
            reason: "Synthetic item final total override",
            auditReferenceId: "audit-item-override",
          },
        },
      ],
      quoteDiscount: {
        amountMinor: 1_000,
        reason: "Synthetic quote-level discount",
      },
    });

    expect(quoteWithItemOverride.totals.manualAdjustmentMinor).toBe(
      20_000 - quoteWithItemOverride.items[0]!.totals.totalBeforeManualOverrideMinor,
    );
    expect(quoteWithItemOverride.totals.totalWithVatMinor).toBe(
      quoteWithoutItemOverride.totals.totalWithVatMinor +
        quoteWithItemOverride.totals.manualAdjustmentMinor,
    );
    expect(quoteWithItemOverride.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining(["QUOTE_DISCOUNT_APPLIED", "MANUAL_OVERRIDE_APPLIED"]),
    );
  });

  it("warns when custom manual line prices are missing", () => {
    const quote = calculateQuote({
      quoteId: "quote-missing-custom-price",
      commercialRules,
      items: [
        {
          ...customLine,
          unitPriceMinor: undefined,
        },
      ],
    });

    expect(quote.totals.totalWithVatMinor).toBe(0);
    expect(quote.warnings.map((warning) => warning.code)).toContain(
      "MISSING_CUSTOM_LINE_PRICE",
    );
  });

  it("warns for unsupported MVP item types and leaves totals at zero", () => {
    const unsupportedItem = {
      elementId: "door-1",
      type: "tilt-turn-door",
      quantity: 1,
    } satisfies CalculationItemInput;

    const quote = calculateQuote({
      quoteId: "quote-unsupported",
      commercialRules,
      items: [unsupportedItem],
    });

    expect(quote.items[0]?.type).toBe("tilt-turn-door");
    expect(quote.totals.totalWithVatMinor).toBe(0);
    expect(quote.warnings.map((warning) => warning.code)).toContain(
      "UNSUPPORTED_ITEM_TYPE",
    );
    expect(quote.trace.some((entry) => entry.step === "unsupportedItem")).toBe(true);
  });

  it("supports explicit hardware and accessory snapshots without deriving formulas", () => {
    const quote = calculateQuote({
      quoteId: "quote-explicit-materials",
      commercialRules,
      items: [
        {
          ...baseInput,
          explicitMaterialRequirements: [
            {
              materialType: "hardware",
              catalogItemId: "hardware-fixed",
              label: "Synthetic explicit hardware kit",
              unit: "each",
              quantity: 1,
              unitPriceMinor: 2_500,
              sourceRule: "explicit-fixture",
            },
            {
              materialType: "accessory",
              catalogItemId: "accessory-sill",
              label: "Synthetic explicit sill",
              unit: "linear-meter",
              quantity: 1.2,
              unitPriceMinor: 1_000,
              sourceRule: "explicit-fixture",
            },
          ],
        },
      ],
    });

    expect(quote.materialRequirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ materialType: "hardware", costMinor: 2_500 }),
        expect.objectContaining({ materialType: "accessory", costMinor: 1_200 }),
      ]),
    );
    expect(quote.trace.filter((entry) => entry.step === "explicitMaterialRequirement")).toHaveLength(
      2,
    );
  });
});
