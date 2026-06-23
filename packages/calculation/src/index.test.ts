import { describe, expect, it } from "vitest";
import {
  calculateElement,
  calculateQuote,
  type FixedWindowElementInput,
} from "./index.js";

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
  commercialRules: {
    markupBasisPoints: 2_000,
    discountBasisPoints: 1_000,
    vatBasisPoints: 1_900,
  },
};

describe("calculateElement", () => {
  it("calculates glass dimensions, area, and billable area from configurable deductions", () => {
    const result = calculateElement(baseInput);

    expect(result.glass.widthMm).toBe(1_120);
    expect(result.glass.heightMm).toBe(1_300);
    expect(result.glass.areaM2).toBe(1.456);
    expect(result.glass.billableAreaM2).toBe(1.5);
    expect(result.glass.totalBillableAreaM2).toBe(1.5);
    expect(result.totals.glassCostMinor).toBe(15_000);
  });

  it("calculates rectangular frame profile linear meters", () => {
    const result = calculateElement({
      ...baseInput,
      quantity: 2,
    });

    expect(result.profiles).toHaveLength(1);
    expect(result.profiles[0]?.linearMetersPerElement).toBe(5.2);
    expect(result.profiles[0]?.totalLinearMeters).toBe(10.4);
    expect(result.totals.profileCostMinor).toBe(10_400);
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
      commercialRules: {
        markupBasisPoints: 2_000,
        discountBasisPoints: 1_000,
        vatBasisPoints: 1_900,
      },
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

    expect(result.glass.widthMm).toBeNull();
    expect(result.totals.glassCostMinor).toBe(0);
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "MISSING_GLASS_DEDUCTION",
    );
  });
});

describe("calculateQuote", () => {
  it("aggregates deterministic element totals and warnings", () => {
    const quote = calculateQuote({
      quoteId: "quote-1",
      elements: [
        baseInput,
        {
          ...baseInput,
          elementId: "item-2",
          quantity: 2,
        },
      ],
    });

    const expectedTotal = quote.elements.reduce(
      (sum, element) => sum + element.totals.totalWithVatMinor,
      0,
    );

    expect(quote.quoteId).toBe("quote-1");
    expect(quote.elements).toHaveLength(2);
    expect(quote.totals.totalWithVatMinor).toBe(expectedTotal);
    expect(quote.trace[0]?.step).toBe("quoteTotals");
  });
});
