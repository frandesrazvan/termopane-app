export type MoneyMinor = number;
export type BasisPoints = number;

export type CalculationWarningCode =
  | "INVALID_DIMENSION"
  | "INVALID_QUANTITY"
  | "MISSING_GLASS_DEDUCTION"
  | "GLASS_DIMENSION_NON_POSITIVE"
  | "MISSING_GLASS_PRICE"
  | "MISSING_PROFILE_PRICE"
  | "MANUAL_OVERRIDE_APPLIED"
  | "MANUAL_OVERRIDE_REASON_MISSING";

export type CalculationWarning = Readonly<{
  code: CalculationWarningCode;
  message: string;
  path: string;
}>;

export type CalculationTraceEntry = Readonly<{
  step: string;
  inputs?: Record<string, unknown>;
  output?: Record<string, unknown>;
  note?: string;
}>;

export type ManualOverrideInput = Readonly<{
  target: "totalWithVat";
  amountMinor: MoneyMinor;
  reason?: string;
  actorId?: string;
  timestamp?: string;
}>;

export type CommercialRulesSnapshot = Readonly<{
  markupBasisPoints: BasisPoints;
  discountBasisPoints: BasisPoints;
  vatBasisPoints: BasisPoints;
}>;

export type GlassSnapshot = Readonly<{
  id: string;
  label: string;
  deductionWidthMm?: number;
  deductionHeightMm?: number;
  minBillableAreaM2: number;
  unitPriceMinorPerM2?: MoneyMinor;
}>;

export type FrameProfileSnapshot = Readonly<{
  id: string;
  label: string;
  unitPriceMinorPerMeter?: MoneyMinor;
}>;

export type FixedWindowElementInput = Readonly<{
  elementId: string;
  type: "fixed-window";
  quantity: number;
  dimensions: Readonly<{
    widthMm: number;
    heightMm: number;
  }>;
  glass: GlassSnapshot;
  frameProfile: FrameProfileSnapshot;
  commercialRules: CommercialRulesSnapshot;
  manualOverride?: ManualOverrideInput;
}>;

export type GlassCalculation = Readonly<{
  widthMm: number | null;
  heightMm: number | null;
  areaM2: number | null;
  billableAreaM2: number | null;
  totalBillableAreaM2: number | null;
  deductionWidthMm: number | null;
  deductionHeightMm: number | null;
}>;

export type ProfileRequirement = Readonly<{
  profileId: string;
  label: string;
  linearMetersPerElement: number;
  totalLinearMeters: number;
  unitPriceMinorPerMeter: MoneyMinor | null;
  costMinor: MoneyMinor;
}>;

export type ElementTotals = Readonly<{
  glassCostMinor: MoneyMinor;
  profileCostMinor: MoneyMinor;
  materialCostMinor: MoneyMinor;
  markupMinor: MoneyMinor;
  discountMinor: MoneyMinor;
  subtotalAfterDiscountMinor: MoneyMinor;
  vatMinor: MoneyMinor;
  totalWithVatMinor: MoneyMinor;
  totalBeforeManualOverrideMinor: MoneyMinor;
  manualAdjustmentMinor: MoneyMinor;
}>;

export type ElementCalculationResult = Readonly<{
  elementId: string;
  type: "fixed-window";
  quantity: number;
  glass: GlassCalculation;
  profiles: readonly ProfileRequirement[];
  totals: ElementTotals;
  warnings: readonly CalculationWarning[];
  trace: readonly CalculationTraceEntry[];
}>;

export type QuoteCalculationInput = Readonly<{
  quoteId: string;
  elements: readonly FixedWindowElementInput[];
}>;

export type QuoteTotals = Readonly<{
  materialCostMinor: MoneyMinor;
  markupMinor: MoneyMinor;
  discountMinor: MoneyMinor;
  subtotalAfterDiscountMinor: MoneyMinor;
  vatMinor: MoneyMinor;
  totalWithVatMinor: MoneyMinor;
  totalBeforeManualOverrideMinor: MoneyMinor;
  manualAdjustmentMinor: MoneyMinor;
}>;

export type QuoteCalculationResult = Readonly<{
  quoteId: string;
  elements: readonly ElementCalculationResult[];
  totals: QuoteTotals;
  warnings: readonly CalculationWarning[];
  trace: readonly CalculationTraceEntry[];
}>;

const BASIS_POINTS_DENOMINATOR = 10_000;

export function calculateElement(input: FixedWindowElementInput): ElementCalculationResult {
  const warnings: CalculationWarning[] = [];
  const trace: CalculationTraceEntry[] = [];
  const quantity = input.quantity;

  if (!Number.isFinite(input.dimensions.widthMm) || input.dimensions.widthMm <= 0) {
    warnings.push(warning("INVALID_DIMENSION", "Width must be a positive millimeter value.", "dimensions.widthMm"));
  }

  if (!Number.isFinite(input.dimensions.heightMm) || input.dimensions.heightMm <= 0) {
    warnings.push(warning("INVALID_DIMENSION", "Height must be a positive millimeter value.", "dimensions.heightMm"));
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    warnings.push(warning("INVALID_QUANTITY", "Quantity must be a positive integer.", "quantity"));
  }

  const glass = calculateGlass(input, warnings, trace);
  const profileRequirement = calculateFrameProfile(input, quantity, warnings, trace);
  const glassCostMinor = calculateGlassCost(input, glass, warnings, trace);

  const profileCostMinor = profileRequirement.costMinor;
  const materialCostMinor = glassCostMinor + profileCostMinor;
  const markupMinor = applyBasisPoints(materialCostMinor, input.commercialRules.markupBasisPoints);
  const subtotalBeforeDiscountMinor = materialCostMinor + markupMinor;
  const discountMinor = applyBasisPoints(
    subtotalBeforeDiscountMinor,
    input.commercialRules.discountBasisPoints,
  );
  const subtotalAfterDiscountMinor = subtotalBeforeDiscountMinor - discountMinor;
  const vatMinor = applyBasisPoints(subtotalAfterDiscountMinor, input.commercialRules.vatBasisPoints);
  const totalBeforeManualOverrideMinor = subtotalAfterDiscountMinor + vatMinor;

  trace.push({
    step: "commercialTotals",
    inputs: {
      materialCostMinor,
      markupBasisPoints: input.commercialRules.markupBasisPoints,
      discountBasisPoints: input.commercialRules.discountBasisPoints,
      vatBasisPoints: input.commercialRules.vatBasisPoints,
    },
    output: {
      markupMinor,
      discountMinor,
      subtotalAfterDiscountMinor,
      vatMinor,
      totalBeforeManualOverrideMinor,
    },
  });

  const overrideResult = applyManualOverride(
    totalBeforeManualOverrideMinor,
    input.manualOverride,
    warnings,
    trace,
  );

  return Object.freeze({
    elementId: input.elementId,
    type: input.type,
    quantity,
    glass,
    profiles: Object.freeze([profileRequirement]),
    totals: Object.freeze({
      glassCostMinor,
      profileCostMinor,
      materialCostMinor,
      markupMinor,
      discountMinor,
      subtotalAfterDiscountMinor,
      vatMinor,
      totalWithVatMinor: overrideResult.totalWithVatMinor,
      totalBeforeManualOverrideMinor,
      manualAdjustmentMinor: overrideResult.manualAdjustmentMinor,
    }),
    warnings: Object.freeze(warnings),
    trace: Object.freeze(trace),
  });
}

export function calculateQuote(input: QuoteCalculationInput): QuoteCalculationResult {
  const elements = input.elements.map(calculateElement);
  const totals = elements.reduce<QuoteTotals>(
    (accumulator, element) => ({
      materialCostMinor: accumulator.materialCostMinor + element.totals.materialCostMinor,
      markupMinor: accumulator.markupMinor + element.totals.markupMinor,
      discountMinor: accumulator.discountMinor + element.totals.discountMinor,
      subtotalAfterDiscountMinor:
        accumulator.subtotalAfterDiscountMinor + element.totals.subtotalAfterDiscountMinor,
      vatMinor: accumulator.vatMinor + element.totals.vatMinor,
      totalWithVatMinor: accumulator.totalWithVatMinor + element.totals.totalWithVatMinor,
      totalBeforeManualOverrideMinor:
        accumulator.totalBeforeManualOverrideMinor + element.totals.totalBeforeManualOverrideMinor,
      manualAdjustmentMinor:
        accumulator.manualAdjustmentMinor + element.totals.manualAdjustmentMinor,
    }),
    {
      materialCostMinor: 0,
      markupMinor: 0,
      discountMinor: 0,
      subtotalAfterDiscountMinor: 0,
      vatMinor: 0,
      totalWithVatMinor: 0,
      totalBeforeManualOverrideMinor: 0,
      manualAdjustmentMinor: 0,
    },
  );

  const warnings = elements.flatMap((element) => element.warnings);
  const trace: CalculationTraceEntry[] = [
    {
      step: "quoteTotals",
      inputs: { elementCount: elements.length },
      output: { totals },
    },
  ];

  return Object.freeze({
    quoteId: input.quoteId,
    elements: Object.freeze(elements),
    totals: Object.freeze(totals),
    warnings: Object.freeze(warnings),
    trace: Object.freeze(trace),
  });
}

function calculateGlass(
  input: FixedWindowElementInput,
  warnings: CalculationWarning[],
  trace: CalculationTraceEntry[],
): GlassCalculation {
  const deductionWidthMm = input.glass.deductionWidthMm;
  const deductionHeightMm = input.glass.deductionHeightMm;

  if (deductionWidthMm === undefined) {
    warnings.push(
      warning("MISSING_GLASS_DEDUCTION", "Glass width deduction is required.", "glass.deductionWidthMm"),
    );
  }

  if (deductionHeightMm === undefined) {
    warnings.push(
      warning(
        "MISSING_GLASS_DEDUCTION",
        "Glass height deduction is required.",
        "glass.deductionHeightMm",
      ),
    );
  }

  if (deductionWidthMm === undefined || deductionHeightMm === undefined) {
    const incompleteGlass = Object.freeze({
      widthMm: null,
      heightMm: null,
      areaM2: null,
      billableAreaM2: null,
      totalBillableAreaM2: null,
      deductionWidthMm: deductionWidthMm ?? null,
      deductionHeightMm: deductionHeightMm ?? null,
    });

    trace.push({
      step: "glassDimensions",
      inputs: {
        widthMm: input.dimensions.widthMm,
        heightMm: input.dimensions.heightMm,
        deductionWidthMm,
        deductionHeightMm,
      },
      output: { complete: false },
      note: "Glass dimensions were not calculated because deduction values are incomplete.",
    });

    return incompleteGlass;
  }

  const widthMm = input.dimensions.widthMm - deductionWidthMm;
  const heightMm = input.dimensions.heightMm - deductionHeightMm;

  if (widthMm <= 0 || heightMm <= 0) {
    warnings.push(
      warning(
        "GLASS_DIMENSION_NON_POSITIVE",
        "Calculated glass dimensions must be positive.",
        "glass",
      ),
    );
  }

  const areaM2 = widthMm > 0 && heightMm > 0 ? roundMeasurement((widthMm * heightMm) / 1_000_000) : null;
  const billableAreaM2 =
    areaM2 === null ? null : roundMeasurement(Math.max(areaM2, input.glass.minBillableAreaM2));
  const totalBillableAreaM2 =
    billableAreaM2 === null ? null : roundMeasurement(billableAreaM2 * input.quantity);

  trace.push({
    step: "glassDimensions",
    inputs: {
      widthMm: input.dimensions.widthMm,
      heightMm: input.dimensions.heightMm,
      deductionWidthMm,
      deductionHeightMm,
      minBillableAreaM2: input.glass.minBillableAreaM2,
      quantity: input.quantity,
    },
    output: { widthMm, heightMm, areaM2, billableAreaM2, totalBillableAreaM2 },
  });

  return Object.freeze({
    widthMm,
    heightMm,
    areaM2,
    billableAreaM2,
    totalBillableAreaM2,
    deductionWidthMm,
    deductionHeightMm,
  });
}

function calculateGlassCost(
  input: FixedWindowElementInput,
  glass: GlassCalculation,
  warnings: CalculationWarning[],
  trace: CalculationTraceEntry[],
): MoneyMinor {
  if (input.glass.unitPriceMinorPerM2 === undefined) {
    warnings.push(warning("MISSING_GLASS_PRICE", "Glass unit price is required.", "glass.unitPriceMinorPerM2"));
    return 0;
  }

  if (glass.totalBillableAreaM2 === null) {
    return 0;
  }

  const costMinor = multiplyMoneyByMeasurement(input.glass.unitPriceMinorPerM2, glass.totalBillableAreaM2);

  trace.push({
    step: "glassCost",
    inputs: {
      unitPriceMinorPerM2: input.glass.unitPriceMinorPerM2,
      totalBillableAreaM2: glass.totalBillableAreaM2,
    },
    output: { costMinor },
  });

  return costMinor;
}

function calculateFrameProfile(
  input: FixedWindowElementInput,
  quantity: number,
  warnings: CalculationWarning[],
  trace: CalculationTraceEntry[],
): ProfileRequirement {
  const widthM = input.dimensions.widthMm / 1_000;
  const heightM = input.dimensions.heightMm / 1_000;
  const linearMetersPerElement = roundMeasurement(2 * widthM + 2 * heightM);
  const totalLinearMeters = roundMeasurement(linearMetersPerElement * quantity);

  if (input.frameProfile.unitPriceMinorPerMeter === undefined) {
    warnings.push(
      warning("MISSING_PROFILE_PRICE", "Frame profile unit price is required.", "frameProfile.unitPriceMinorPerMeter"),
    );
  }

  const costMinor =
    input.frameProfile.unitPriceMinorPerMeter === undefined
      ? 0
      : multiplyMoneyByMeasurement(input.frameProfile.unitPriceMinorPerMeter, totalLinearMeters);

  trace.push({
    step: "frameProfileLinearMeters",
    inputs: {
      widthMm: input.dimensions.widthMm,
      heightMm: input.dimensions.heightMm,
      quantity,
      profileId: input.frameProfile.id,
      unitPriceMinorPerMeter: input.frameProfile.unitPriceMinorPerMeter,
    },
    output: { linearMetersPerElement, totalLinearMeters, costMinor },
    note: "Rectangular fixed-window frame perimeter only; not production cut optimization.",
  });

  return Object.freeze({
    profileId: input.frameProfile.id,
    label: input.frameProfile.label,
    linearMetersPerElement,
    totalLinearMeters,
    unitPriceMinorPerMeter: input.frameProfile.unitPriceMinorPerMeter ?? null,
    costMinor,
  });
}

function applyManualOverride(
  totalBeforeManualOverrideMinor: MoneyMinor,
  override: ManualOverrideInput | undefined,
  warnings: CalculationWarning[],
  trace: CalculationTraceEntry[],
): Readonly<{ totalWithVatMinor: MoneyMinor; manualAdjustmentMinor: MoneyMinor }> {
  if (!override) {
    return Object.freeze({
      totalWithVatMinor: totalBeforeManualOverrideMinor,
      manualAdjustmentMinor: 0,
    });
  }

  warnings.push(
    warning(
      "MANUAL_OVERRIDE_APPLIED",
      "Manual override changed the final total.",
      "manualOverride",
    ),
  );

  if (!override.reason || override.reason.trim().length === 0) {
    warnings.push(
      warning(
        "MANUAL_OVERRIDE_REASON_MISSING",
        "Manual override should include an audit reason.",
        "manualOverride.reason",
      ),
    );
  }

  const manualAdjustmentMinor = override.amountMinor - totalBeforeManualOverrideMinor;

  trace.push({
    step: "manualOverride",
    inputs: {
      target: override.target,
      amountMinor: override.amountMinor,
      hasReason: Boolean(override.reason?.trim()),
      actorId: override.actorId,
      timestamp: override.timestamp,
      totalBeforeManualOverrideMinor,
    },
    output: { totalWithVatMinor: override.amountMinor, manualAdjustmentMinor },
  });

  return Object.freeze({
    totalWithVatMinor: override.amountMinor,
    manualAdjustmentMinor,
  });
}

function applyBasisPoints(amountMinor: MoneyMinor, basisPoints: BasisPoints): MoneyMinor {
  return Math.round((amountMinor * basisPoints) / BASIS_POINTS_DENOMINATOR);
}

function multiplyMoneyByMeasurement(amountMinor: MoneyMinor, measurement: number): MoneyMinor {
  return Math.round(amountMinor * measurement);
}

function roundMeasurement(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function warning(
  code: CalculationWarningCode,
  message: string,
  path: string,
): CalculationWarning {
  return Object.freeze({ code, message, path });
}
