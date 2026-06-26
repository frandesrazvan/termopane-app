export type MoneyMinor = number;
export type BasisPoints = number;

export type CalculationWarningCode =
  | "INVALID_DIMENSION"
  | "INVALID_QUANTITY"
  | "CALCULATION_BLOCKED"
  | "MISSING_GLASS_DEDUCTION"
  | "GLASS_DIMENSION_NON_POSITIVE"
  | "MISSING_GLASS_PRICE"
  | "MISSING_PROFILE_PRICE"
  | "MISSING_CUSTOM_LINE_PRICE"
  | "MISSING_DOOR_FORMULA"
  | "MISSING_EXPLICIT_MATERIAL_PRICE"
  | "UNSUPPORTED_ITEM_TYPE"
  | "QUOTE_DISCOUNT_APPLIED"
  | "QUOTE_DISCOUNT_REASON_MISSING"
  | "MANUAL_OVERRIDE_APPLIED"
  | "MANUAL_OVERRIDE_REASON_MISSING"
  | "INVALID_MANUAL_OVERRIDE";

export type CalculationWarning = Readonly<{
  code: CalculationWarningCode;
  message: string;
  path: string;
}>;

export type CalculationTraceEntry = Readonly<{
  step: string;
  itemId?: string;
  inputs?: Record<string, unknown>;
  output?: Record<string, unknown>;
  note?: string;
}>;

export type CalculationUnit =
  | "each"
  | "linear-meter"
  | "square-meter"
  | "hour"
  | "fixed";

export type MaterialRequirementType =
  | "glass"
  | "profile"
  | "panel"
  | "custom-line"
  | "hardware"
  | "reinforcement"
  | "labor"
  | "accessory"
  | "service";

export type ManualOverrideInput = Readonly<{
  target: "totalWithVat" | "quoteTotalWithVat";
  amountMinor: MoneyMinor;
  reason?: string;
  actorId?: string;
  timestamp?: string;
  auditReferenceId?: string;
}>;

export type QuoteDiscountInput = Readonly<{
  amountMinor?: MoneyMinor;
  basisPoints?: BasisPoints;
  reason?: string;
  actorId?: string;
  timestamp?: string;
}>;

export type CommercialRulesSnapshot = Readonly<{
  markupBasisPoints: BasisPoints;
  discountBasisPoints: BasisPoints;
  vatBasisPoints: BasisPoints;
}>;

export type CalculationContextSnapshot = Readonly<{
  companySettingsSnapshot?: Record<string, unknown>;
  priceListSnapshot?: Record<string, unknown>;
  commercialRules?: CommercialRulesSnapshot;
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

export type ExplicitMaterialRequirementInput = Readonly<{
  materialType: Exclude<MaterialRequirementType, "glass" | "profile" | "custom-line">;
  catalogItemId: string;
  label: string;
  unit: CalculationUnit;
  quantity: number;
  unitPriceMinor?: MoneyMinor;
  sourceRule?: string;
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
  commercialRules?: CommercialRulesSnapshot;
  manualOverride?: ManualOverrideInput;
  explicitMaterialRequirements?: readonly ExplicitMaterialRequirementInput[];
}>;

export type CustomManualLineItemInput = Readonly<{
  elementId: string;
  type: "custom-line";
  quantity: number;
  description: string;
  unit?: CalculationUnit;
  unitPriceMinor?: MoneyMinor;
  commercialRules?: CommercialRulesSnapshot;
  manualOverride?: ManualOverrideInput;
  explicitMaterialRequirements?: readonly ExplicitMaterialRequirementInput[];
}>;

export type CatalogLineItemType =
  | "accessory-line"
  | "service-line"
  | "transport-line"
  | "installation-line";

export type CatalogLineItemInput = Readonly<{
  elementId: string;
  type: CatalogLineItemType;
  quantity: number;
  description: string;
  catalogItemId: string;
  catalogItemLabel: string;
  unit: CalculationUnit;
  unitPriceMinor?: MoneyMinor;
  commercialRules?: CommercialRulesSnapshot;
  manualOverride?: ManualOverrideInput;
}>;

export type DoorElementInput = Readonly<{
  elementId: string;
  type: "door";
  quantity: number;
  dimensions: Readonly<{
    widthMm: number;
    heightMm: number;
  }>;
  description?: string;
  panelDescription?: string;
  glassLabel?: string;
  hardwareLabel?: string;
  commercialRules?: CommercialRulesSnapshot;
  manualOverride?: ManualOverrideInput;
  explicitMaterialRequirements?: readonly ExplicitMaterialRequirementInput[];
}>;

export type UnsupportedCalculationItemInput = Readonly<{
  elementId: string;
  type: string;
  quantity?: number;
  commercialRules?: CommercialRulesSnapshot;
  manualOverride?: ManualOverrideInput;
}>;

export type CalculationItemInput =
  | FixedWindowElementInput
  | DoorElementInput
  | CatalogLineItemInput
  | CustomManualLineItemInput
  | UnsupportedCalculationItemInput;

export type GlassCalculation = Readonly<{
  widthMm: number | null;
  heightMm: number | null;
  areaM2: number | null;
  billableAreaM2: number | null;
  totalBillableAreaM2: number | null;
  deductionWidthMm: number | null;
  deductionHeightMm: number | null;
}>;

export type GlassCut = Readonly<{
  itemId: string;
  glassId: string;
  label: string;
  pane: string;
  widthMm: number;
  heightMm: number;
  areaM2: number;
  billableAreaM2: number;
  quantity: number;
  totalBillableAreaM2: number;
  sourceRule: string;
}>;

export type MaterialRequirement = Readonly<{
  itemId: string;
  materialType: MaterialRequirementType;
  catalogItemId: string;
  label: string;
  unit: CalculationUnit;
  quantity: number;
  unitPriceMinor: MoneyMinor | null;
  costMinor: MoneyMinor;
  sourceRule: string;
}>;

export type ProfileRequirement = Readonly<{
  itemId: string;
  profileId: string;
  label: string;
  profileType: "frame";
  linearMetersPerElement: number;
  totalLinearMeters: number;
  unitPriceMinorPerMeter: MoneyMinor | null;
  costMinor: MoneyMinor;
  sourceRule: string;
}>;

export type ProfileLinearMetersGroup = Readonly<{
  profileId: string;
  label: string;
  profileType: "frame";
  totalLinearMeters: number;
  unitPriceMinorPerMeter: MoneyMinor | null;
  costMinor: MoneyMinor;
  itemIds: readonly string[];
  sourceRule: string;
}>;

export type ElementTotals = Readonly<{
  glassCostMinor: MoneyMinor;
  profileCostMinor: MoneyMinor;
  explicitMaterialCostMinor: MoneyMinor;
  customLineCostMinor: MoneyMinor;
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
  type: string;
  quantity: number;
  glass: GlassCalculation | null;
  glassCuts: readonly GlassCut[];
  profiles: readonly ProfileRequirement[];
  profileLinearMeters: readonly ProfileRequirement[];
  materialRequirements: readonly MaterialRequirement[];
  totals: ElementTotals;
  warnings: readonly CalculationWarning[];
  trace: readonly CalculationTraceEntry[];
}>;

export type QuoteCalculationInput = CalculationContextSnapshot &
  Readonly<{
    quoteId: string;
    items?: readonly CalculationItemInput[];
    elements?: readonly CalculationItemInput[];
    quoteDiscount?: QuoteDiscountInput;
    manualOverride?: ManualOverrideInput;
  }>;

export type QuoteTotals = Readonly<{
  materialCostMinor: MoneyMinor;
  markupMinor: MoneyMinor;
  itemDiscountMinor: MoneyMinor;
  quoteDiscountMinor: MoneyMinor;
  discountMinor: MoneyMinor;
  subtotalAfterDiscountMinor: MoneyMinor;
  vatMinor: MoneyMinor;
  totalWithVatMinor: MoneyMinor;
  totalBeforeManualOverrideMinor: MoneyMinor;
  manualAdjustmentMinor: MoneyMinor;
}>;

export type QuoteCalculationResult = Readonly<{
  quoteId: string;
  items: readonly ElementCalculationResult[];
  elements: readonly ElementCalculationResult[];
  totals: QuoteTotals;
  materialRequirements: readonly MaterialRequirement[];
  glassCuts: readonly GlassCut[];
  profileLinearMeters: readonly ProfileLinearMetersGroup[];
  warnings: readonly CalculationWarning[];
  trace: readonly CalculationTraceEntry[];
}>;

const BASIS_POINTS_DENOMINATOR = 10_000;

const zeroCommercialRules: CommercialRulesSnapshot = Object.freeze({
  markupBasisPoints: 0,
  discountBasisPoints: 0,
  vatBasisPoints: 0,
});

const zeroTotals: ElementTotals = Object.freeze({
  glassCostMinor: 0,
  profileCostMinor: 0,
  explicitMaterialCostMinor: 0,
  customLineCostMinor: 0,
  materialCostMinor: 0,
  markupMinor: 0,
  discountMinor: 0,
  subtotalAfterDiscountMinor: 0,
  vatMinor: 0,
  totalWithVatMinor: 0,
  totalBeforeManualOverrideMinor: 0,
  manualAdjustmentMinor: 0,
});

export function calculateElement(input: FixedWindowElementInput): ElementCalculationResult {
  return calculateItem(input, input.commercialRules ?? zeroCommercialRules, "elements[0]");
}

export function calculateQuote(input: QuoteCalculationInput): QuoteCalculationResult {
  const quoteRules = input.commercialRules ?? zeroCommercialRules;
  const sourceItems = input.items ?? input.elements ?? [];
  const items = sourceItems.map((item, index) =>
    calculateItem(item, resolveCommercialRules(item, quoteRules), `items[${index}]`),
  );

  const baseTotals = sumElementTotals(items);
  const warnings: CalculationWarning[] = items.flatMap((item) => item.warnings);
  const trace: CalculationTraceEntry[] = items.flatMap((item) =>
    item.trace.map((entry) => ({
      ...entry,
      itemId: entry.itemId ?? item.elementId,
    })),
  );

  const discountResult = applyQuoteDiscount(
    baseTotals.subtotalAfterDiscountMinor,
    input.quoteDiscount,
    quoteRules,
    warnings,
    trace,
  );

  const hasQuoteDiscount = discountResult.quoteDiscountMinor > 0;
  const subtotalAfterDiscountMinor = hasQuoteDiscount
    ? discountResult.subtotalAfterDiscountMinor
    : baseTotals.subtotalAfterDiscountMinor;
  const vatMinor = hasQuoteDiscount
    ? applyBasisPoints(subtotalAfterDiscountMinor, quoteRules.vatBasisPoints)
    : baseTotals.vatMinor;
  const calculatedTotalAfterQuoteDiscountMinor = hasQuoteDiscount
    ? subtotalAfterDiscountMinor + vatMinor
    : baseTotals.totalBeforeManualOverrideMinor;
  const totalBeforeQuoteOverrideMinor =
    calculatedTotalAfterQuoteDiscountMinor + baseTotals.manualAdjustmentMinor;

  const overrideResult = applyManualOverride(
    totalBeforeQuoteOverrideMinor,
    input.manualOverride,
    true,
    "manualOverride",
    warnings,
    trace,
  );

  const quoteManualAdjustmentMinor =
    overrideResult.totalWithVatMinor - totalBeforeQuoteOverrideMinor;
  const totals = Object.freeze({
    materialCostMinor: baseTotals.materialCostMinor,
    markupMinor: baseTotals.markupMinor,
    itemDiscountMinor: baseTotals.discountMinor,
    quoteDiscountMinor: discountResult.quoteDiscountMinor,
    discountMinor: baseTotals.discountMinor + discountResult.quoteDiscountMinor,
    subtotalAfterDiscountMinor,
    vatMinor,
    totalWithVatMinor: overrideResult.totalWithVatMinor,
    totalBeforeManualOverrideMinor: totalBeforeQuoteOverrideMinor,
    manualAdjustmentMinor: baseTotals.manualAdjustmentMinor + quoteManualAdjustmentMinor,
  });

  const materialRequirements = Object.freeze(
    items.flatMap((item) => item.materialRequirements),
  );
  const glassCuts = Object.freeze(items.flatMap((item) => item.glassCuts));
  const profileLinearMeters = Object.freeze(
    groupProfileLinearMeters(items.flatMap((item) => item.profileLinearMeters)),
  );

  trace.push({
    step: "quoteTotals",
    inputs: {
      itemCount: items.length,
      quoteDiscountMinor: discountResult.quoteDiscountMinor,
      hasManualOverride: Boolean(input.manualOverride),
    },
    output: { totals },
  });

  return Object.freeze({
    quoteId: input.quoteId,
    items: Object.freeze(items),
    elements: Object.freeze(items),
    totals,
    materialRequirements,
    glassCuts,
    profileLinearMeters,
    warnings: Object.freeze(warnings),
    trace: Object.freeze(trace),
  });
}

function calculateItem(
  input: CalculationItemInput,
  commercialRules: CommercialRulesSnapshot,
  path: string,
): ElementCalculationResult {
  if (input.type === "fixed-window") {
    return calculateFixedWindow(input as FixedWindowElementInput, commercialRules, path);
  }

  if (input.type === "custom-line") {
    return calculateCustomLine(input as CustomManualLineItemInput, commercialRules, path);
  }

  if (input.type === "door") {
    return calculateDoor(input as DoorElementInput, commercialRules, path);
  }

  if (isCatalogLineItemType(input.type)) {
    return calculateCatalogLine(input as CatalogLineItemInput, commercialRules, path);
  }

  return unsupportedItem(input, path);
}

function calculateFixedWindow(
  input: FixedWindowElementInput,
  commercialRules: CommercialRulesSnapshot,
  path: string,
): ElementCalculationResult {
  const warnings: CalculationWarning[] = [];
  const trace: CalculationTraceEntry[] = [];
  const quantity = input.quantity;
  const hasValidWidth = isPositiveFinite(input.dimensions.widthMm);
  const hasValidHeight = isPositiveFinite(input.dimensions.heightMm);
  const hasValidDimensions = hasValidWidth && hasValidHeight;
  const hasValidQuantity = Number.isInteger(quantity) && quantity > 0;

  if (!hasValidWidth) {
    warnings.push(
      warning(
        "INVALID_DIMENSION",
        "Width must be a positive millimeter value.",
        `${path}.dimensions.widthMm`,
      ),
    );
  }

  if (!hasValidHeight) {
    warnings.push(
      warning(
        "INVALID_DIMENSION",
        "Height must be a positive millimeter value.",
        `${path}.dimensions.heightMm`,
      ),
    );
  }

  if (!hasValidQuantity) {
    warnings.push(
      warning("INVALID_QUANTITY", "Quantity must be a positive integer.", `${path}.quantity`),
    );
  }

  const glass = calculateGlass(input, hasValidDimensions, hasValidQuantity, path, warnings, trace);
  const profileRequirement = calculateFrameProfile(
    input,
    hasValidDimensions,
    hasValidQuantity,
    path,
    warnings,
    trace,
  );
  const glassCostMinor = calculateGlassCost(input, glass, path, warnings, trace);
  const explicitMaterials = calculateExplicitMaterialRequirements(
    input.elementId,
    input.explicitMaterialRequirements ?? [],
    path,
    warnings,
    trace,
  );
  const profileCostMinor = profileRequirement.costMinor;
  const explicitMaterialCostMinor = sumMoney(explicitMaterials.map((material) => material.costMinor));
  const materialCostMinor = glassCostMinor + profileCostMinor + explicitMaterialCostMinor;

  const totals = calculateCommercialTotals(
    materialCostMinor,
    commercialRules,
    input.manualOverride,
    hasValidDimensions && hasValidQuantity,
    `${path}.manualOverride`,
    warnings,
    trace,
    {
      glassCostMinor,
      profileCostMinor,
      explicitMaterialCostMinor,
      customLineCostMinor: 0,
    },
  );

  const glassCuts = glassCutFromCalculation(input, glass);
  const materialRequirements = Object.freeze([
    ...glassMaterialRequirementFromCalculation(input, glass, glassCostMinor),
    profileMaterialRequirementFromCalculation(input, profileRequirement),
    ...explicitMaterials,
  ]);

  return Object.freeze({
    elementId: input.elementId,
    type: input.type,
    quantity,
    glass,
    glassCuts,
    profiles: Object.freeze([profileRequirement]),
    profileLinearMeters: Object.freeze([profileRequirement]),
    materialRequirements,
    totals,
    warnings: Object.freeze(warnings),
    trace: Object.freeze(trace),
  });
}

function calculateCustomLine(
  input: CustomManualLineItemInput,
  commercialRules: CommercialRulesSnapshot,
  path: string,
): ElementCalculationResult {
  const warnings: CalculationWarning[] = [];
  const trace: CalculationTraceEntry[] = [];
  const quantity = input.quantity;
  const hasValidQuantity = Number.isFinite(quantity) && quantity > 0;
  const unit = input.unit ?? "each";

  if (!hasValidQuantity) {
    warnings.push(
      warning("INVALID_QUANTITY", "Quantity must be a positive value.", `${path}.quantity`),
    );
  }

  if (input.unitPriceMinor === undefined) {
    warnings.push(
      warning(
        "MISSING_CUSTOM_LINE_PRICE",
        "Custom manual line items require an explicit unit price snapshot.",
        `${path}.unitPriceMinor`,
      ),
    );
  }

  const customLineCostMinor =
    hasValidQuantity && input.unitPriceMinor !== undefined
      ? multiplyMoneyByMeasurement(input.unitPriceMinor, quantity)
      : 0;

  trace.push({
    step: "customLineCost",
    itemId: input.elementId,
    inputs: {
      quantity,
      unit,
      unitPriceMinor: input.unitPriceMinor,
    },
    output: { customLineCostMinor },
    note: "Custom line item uses explicit snapshot price only.",
  });

  const explicitMaterials = calculateExplicitMaterialRequirements(
    input.elementId,
    input.explicitMaterialRequirements ?? [],
    path,
    warnings,
    trace,
  );
  const explicitMaterialCostMinor = sumMoney(explicitMaterials.map((material) => material.costMinor));
  const materialCostMinor = customLineCostMinor + explicitMaterialCostMinor;

  const totals = calculateCommercialTotals(
    materialCostMinor,
    commercialRules,
    input.manualOverride,
    hasValidQuantity,
    `${path}.manualOverride`,
    warnings,
    trace,
    {
      glassCostMinor: 0,
      profileCostMinor: 0,
      explicitMaterialCostMinor,
      customLineCostMinor,
    },
  );

  const materialRequirements = Object.freeze([
    customLineMaterialRequirement(input, unit, customLineCostMinor),
    ...explicitMaterials,
  ]);

  return Object.freeze({
    elementId: input.elementId,
    type: input.type,
    quantity,
    glass: null,
    glassCuts: Object.freeze([]),
    profiles: Object.freeze([]),
    profileLinearMeters: Object.freeze([]),
    materialRequirements,
    totals,
    warnings: Object.freeze(warnings),
    trace: Object.freeze(trace),
  });
}

function calculateDoor(
  input: DoorElementInput,
  commercialRules: CommercialRulesSnapshot,
  path: string,
): ElementCalculationResult {
  const warnings: CalculationWarning[] = [];
  const trace: CalculationTraceEntry[] = [];
  const quantity = input.quantity;
  const hasValidWidth = isPositiveFinite(input.dimensions.widthMm);
  const hasValidHeight = isPositiveFinite(input.dimensions.heightMm);
  const hasValidDimensions = hasValidWidth && hasValidHeight;
  const hasValidQuantity = Number.isInteger(quantity) && quantity > 0;

  if (!hasValidWidth) {
    warnings.push(
      warning(
        "INVALID_DIMENSION",
        "Door width must be a positive millimeter value.",
        `${path}.dimensions.widthMm`,
      ),
    );
  }

  if (!hasValidHeight) {
    warnings.push(
      warning(
        "INVALID_DIMENSION",
        "Door height must be a positive millimeter value.",
        `${path}.dimensions.heightMm`,
      ),
    );
  }

  if (!hasValidQuantity) {
    warnings.push(
      warning("INVALID_QUANTITY", "Door quantity must be a positive integer.", `${path}.quantity`),
    );
  }

  warnings.push(
    warning(
      "MISSING_DOOR_FORMULA",
      "Door MVP uses explicit snapshot prices only; panel, lock, threshold, and reinforcement formulas are not validated.",
      path,
    ),
  );

  if (!hasValidDimensions) {
    warnings.push(
      warning(
        "CALCULATION_BLOCKED",
        "Door rough calculation was blocked because dimensions are invalid.",
        `${path}.dimensions`,
      ),
    );
  }

  const explicitMaterials = calculateExplicitMaterialRequirements(
    input.elementId,
    input.explicitMaterialRequirements ?? [],
    path,
    warnings,
    trace,
  );
  const explicitMaterialCostMinor = hasValidQuantity
    ? sumMoney(explicitMaterials.map((material) => material.costMinor))
    : 0;

  trace.push({
    step: "doorMvpCalculation",
    itemId: input.elementId,
    inputs: {
      widthMm: input.dimensions.widthMm,
      heightMm: input.dimensions.heightMm,
      quantity,
      explicitMaterialCount: explicitMaterials.length,
      panelDescription: input.panelDescription,
      glassLabel: input.glassLabel,
      hardwareLabel: input.hardwareLabel,
    },
    output: { explicitMaterialCostMinor },
    note: "Door MVP totals use explicit snapshot materials only; no production door formulas applied.",
  });

  const totals = calculateCommercialTotals(
    explicitMaterialCostMinor,
    commercialRules,
    input.manualOverride,
    hasValidDimensions && hasValidQuantity,
    `${path}.manualOverride`,
    warnings,
    trace,
    {
      glassCostMinor: 0,
      profileCostMinor: 0,
      explicitMaterialCostMinor,
      customLineCostMinor: 0,
    },
  );

  return Object.freeze({
    elementId: input.elementId,
    type: input.type,
    quantity,
    glass: null,
    glassCuts: Object.freeze([]),
    profiles: Object.freeze([]),
    profileLinearMeters: Object.freeze([]),
    materialRequirements: explicitMaterials,
    totals,
    warnings: Object.freeze(warnings),
    trace: Object.freeze(trace),
  });
}

function unsupportedItem(input: UnsupportedCalculationItemInput, path: string): ElementCalculationResult {
  const quantity = input.quantity ?? 0;
  const warnings = Object.freeze([
    warning(
      "UNSUPPORTED_ITEM_TYPE",
      `Item type "${input.type}" is not supported by the MVP calculation package.`,
      `${path}.type`,
    ),
  ]);
  const trace = Object.freeze([
    {
      step: "unsupportedItem",
      itemId: input.elementId,
      inputs: { type: input.type, quantity },
      output: { calculated: false },
      note: "Unsupported item types are returned with zero totals and a warning.",
    },
  ]);

  return Object.freeze({
    elementId: input.elementId,
    type: input.type,
    quantity,
    glass: null,
    glassCuts: Object.freeze([]),
    profiles: Object.freeze([]),
    profileLinearMeters: Object.freeze([]),
    materialRequirements: Object.freeze([]),
    totals: zeroTotals,
    warnings,
    trace,
  });
}

function calculateCatalogLine(
  input: CatalogLineItemInput,
  commercialRules: CommercialRulesSnapshot,
  path: string,
): ElementCalculationResult {
  const warnings: CalculationWarning[] = [];
  const trace: CalculationTraceEntry[] = [];
  const quantity = input.quantity;
  const hasValidQuantity = Number.isFinite(quantity) && quantity > 0;

  if (!hasValidQuantity) {
    warnings.push(
      warning("INVALID_QUANTITY", "Catalog line quantity must be a positive value.", `${path}.quantity`),
    );
  }

  const materialRequirement = calculateExplicitMaterialRequirements(
    input.elementId,
    [
      {
        materialType: materialTypeForCatalogLine(input.type),
        catalogItemId: input.catalogItemId,
        label: input.catalogItemLabel || input.description,
        unit: input.unit,
        quantity,
        unitPriceMinor: input.unitPriceMinor,
        sourceRule: `${input.type}-explicit-snapshot`,
      },
    ],
    path,
    warnings,
    trace,
  );
  const explicitMaterialCostMinor = hasValidQuantity
    ? sumMoney(materialRequirement.map((material) => material.costMinor))
    : 0;

  trace.push({
    step: "catalogLineCost",
    itemId: input.elementId,
    inputs: {
      lineType: input.type,
      catalogItemId: input.catalogItemId,
      quantity,
      unit: input.unit,
      unitPriceMinor: input.unitPriceMinor,
    },
    output: { explicitMaterialCostMinor },
    note: "Catalog accessory/service line uses explicit snapshot quantity and sale price only.",
  });

  const totals = calculateCommercialTotals(
    explicitMaterialCostMinor,
    commercialRules,
    input.manualOverride,
    hasValidQuantity,
    `${path}.manualOverride`,
    warnings,
    trace,
    {
      glassCostMinor: 0,
      profileCostMinor: 0,
      explicitMaterialCostMinor,
      customLineCostMinor: 0,
    },
  );

  return Object.freeze({
    elementId: input.elementId,
    type: input.type,
    quantity: hasValidQuantity ? quantity : 0,
    glass: null,
    glassCuts: Object.freeze([]),
    profiles: Object.freeze([]),
    profileLinearMeters: Object.freeze([]),
    materialRequirements: materialRequirement,
    totals,
    warnings: Object.freeze(warnings),
    trace: Object.freeze(trace),
  });
}

function calculateGlass(
  input: FixedWindowElementInput,
  hasValidDimensions: boolean,
  hasValidQuantity: boolean,
  path: string,
  warnings: CalculationWarning[],
  trace: CalculationTraceEntry[],
): GlassCalculation {
  const deductionWidthMm = input.glass.deductionWidthMm;
  const deductionHeightMm = input.glass.deductionHeightMm;

  if (deductionWidthMm === undefined) {
    warnings.push(
      warning(
        "MISSING_GLASS_DEDUCTION",
        "Glass width deduction is required.",
        `${path}.glass.deductionWidthMm`,
      ),
    );
  }

  if (deductionHeightMm === undefined) {
    warnings.push(
      warning(
        "MISSING_GLASS_DEDUCTION",
        "Glass height deduction is required.",
        `${path}.glass.deductionHeightMm`,
      ),
    );
  }

  if (!hasValidDimensions) {
    warnings.push(
      warning(
        "CALCULATION_BLOCKED",
        "Glass dimensions were not calculated because element dimensions are invalid.",
        `${path}.dimensions`,
      ),
    );
    const incompleteGlass = incompleteGlassCalculation(deductionWidthMm, deductionHeightMm);

    trace.push({
      step: "glassDimensions",
      itemId: input.elementId,
      inputs: {
        widthMm: input.dimensions.widthMm,
        heightMm: input.dimensions.heightMm,
        deductionWidthMm,
        deductionHeightMm,
      },
      output: { complete: false },
      note: "Glass dimensions were blocked because width or height is invalid.",
    });

    return incompleteGlass;
  }

  if (deductionWidthMm === undefined || deductionHeightMm === undefined) {
    const incompleteGlass = incompleteGlassCalculation(deductionWidthMm, deductionHeightMm);

    trace.push({
      step: "glassDimensions",
      itemId: input.elementId,
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
        `${path}.glass`,
      ),
    );
  }

  const areaM2 =
    widthMm > 0 && heightMm > 0 ? roundMeasurement((widthMm * heightMm) / 1_000_000) : null;
  const billableAreaM2 =
    areaM2 === null ? null : roundMeasurement(Math.max(areaM2, input.glass.minBillableAreaM2));
  const totalBillableAreaM2 =
    billableAreaM2 === null ? null : hasValidQuantity ? roundMeasurement(billableAreaM2 * input.quantity) : 0;

  trace.push({
    step: "glassDimensions",
    itemId: input.elementId,
    inputs: {
      widthMm: input.dimensions.widthMm,
      heightMm: input.dimensions.heightMm,
      deductionWidthMm,
      deductionHeightMm,
      minBillableAreaM2: input.glass.minBillableAreaM2,
      quantity: input.quantity,
    },
    output: { widthMm, heightMm, areaM2, billableAreaM2, totalBillableAreaM2 },
    note: hasValidQuantity
      ? "Configured glass deduction placeholder; not a supplier formula."
      : "Total billable glass area was zeroed because quantity is invalid.",
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
  path: string,
  warnings: CalculationWarning[],
  trace: CalculationTraceEntry[],
): MoneyMinor {
  if (input.glass.unitPriceMinorPerM2 === undefined) {
    warnings.push(
      warning(
        "MISSING_GLASS_PRICE",
        "Glass unit price is required.",
        `${path}.glass.unitPriceMinorPerM2`,
      ),
    );
    return 0;
  }

  if (glass.totalBillableAreaM2 === null) {
    return 0;
  }

  const costMinor = multiplyMoneyByMeasurement(
    input.glass.unitPriceMinorPerM2,
    glass.totalBillableAreaM2,
  );

  trace.push({
    step: "glassCost",
    itemId: input.elementId,
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
  hasValidDimensions: boolean,
  hasValidQuantity: boolean,
  path: string,
  warnings: CalculationWarning[],
  trace: CalculationTraceEntry[],
): ProfileRequirement {
  if (input.frameProfile.unitPriceMinorPerMeter === undefined) {
    warnings.push(
      warning(
        "MISSING_PROFILE_PRICE",
        "Frame profile unit price is required.",
        `${path}.frameProfile.unitPriceMinorPerMeter`,
      ),
    );
  }

  if (!hasValidDimensions || !hasValidQuantity) {
    if (!hasValidDimensions) {
      warnings.push(
        warning(
          "CALCULATION_BLOCKED",
          "Profile meters were zeroed because element dimensions are invalid.",
          `${path}.dimensions`,
        ),
      );
    }

    trace.push({
      step: "frameProfileLinearMeters",
      itemId: input.elementId,
      inputs: {
        widthMm: input.dimensions.widthMm,
        heightMm: input.dimensions.heightMm,
        quantity: input.quantity,
        profileId: input.frameProfile.id,
        unitPriceMinorPerMeter: input.frameProfile.unitPriceMinorPerMeter,
      },
      output: { linearMetersPerElement: 0, totalLinearMeters: 0, costMinor: 0 },
      note: hasValidDimensions
        ? "Total profile meters were zeroed because quantity is invalid."
        : "Profile meter calculation was blocked because width or height is invalid.",
    });

    return profileRequirement(input, 0, 0, 0);
  }

  const widthM = input.dimensions.widthMm / 1_000;
  const heightM = input.dimensions.heightMm / 1_000;
  const linearMetersPerElement = roundMeasurement(2 * widthM + 2 * heightM);
  const totalLinearMeters = roundMeasurement(linearMetersPerElement * input.quantity);
  const costMinor =
    input.frameProfile.unitPriceMinorPerMeter === undefined
      ? 0
      : multiplyMoneyByMeasurement(input.frameProfile.unitPriceMinorPerMeter, totalLinearMeters);

  trace.push({
    step: "frameProfileLinearMeters",
    itemId: input.elementId,
    inputs: {
      widthMm: input.dimensions.widthMm,
      heightMm: input.dimensions.heightMm,
      quantity: input.quantity,
      profileId: input.frameProfile.id,
      unitPriceMinorPerMeter: input.frameProfile.unitPriceMinorPerMeter,
    },
    output: { linearMetersPerElement, totalLinearMeters, costMinor },
    note: "Rectangular fixed-window frame perimeter only; not production cut optimization.",
  });

  return profileRequirement(input, linearMetersPerElement, totalLinearMeters, costMinor);
}

function calculateExplicitMaterialRequirements(
  itemId: string,
  explicitMaterials: readonly ExplicitMaterialRequirementInput[],
  path: string,
  warnings: CalculationWarning[],
  trace: CalculationTraceEntry[],
): readonly MaterialRequirement[] {
  return Object.freeze(
    explicitMaterials.map((material, index) => {
      if (material.unitPriceMinor === undefined) {
        warnings.push(
          warning(
            "MISSING_EXPLICIT_MATERIAL_PRICE",
            "Explicit material requirements need a unit price snapshot to contribute cost.",
            `${path}.explicitMaterialRequirements[${index}].unitPriceMinor`,
          ),
        );
      }

      const validQuantity = Number.isFinite(material.quantity) && material.quantity > 0;
      const costMinor =
        validQuantity && material.unitPriceMinor !== undefined
          ? multiplyMoneyByMeasurement(material.unitPriceMinor, material.quantity)
          : 0;

      trace.push({
        step: "explicitMaterialRequirement",
        itemId,
        inputs: {
          materialType: material.materialType,
          catalogItemId: material.catalogItemId,
          quantity: material.quantity,
          unit: material.unit,
          unitPriceMinor: material.unitPriceMinor,
        },
        output: { costMinor },
        note: material.sourceRule ?? "Explicit snapshot quantity; no automatic formula applied.",
      });

      return Object.freeze({
        itemId,
        materialType: material.materialType,
        catalogItemId: material.catalogItemId,
        label: material.label,
        unit: material.unit,
        quantity: validQuantity ? material.quantity : 0,
        unitPriceMinor: material.unitPriceMinor ?? null,
        costMinor,
        sourceRule: material.sourceRule ?? "explicit-snapshot",
      });
    }),
  );
}

function calculateCommercialTotals(
  materialCostMinor: MoneyMinor,
  commercialRules: CommercialRulesSnapshot,
  manualOverride: ManualOverrideInput | undefined,
  canApplyOverride: boolean,
  manualOverridePath: string,
  warnings: CalculationWarning[],
  trace: CalculationTraceEntry[],
  componentCosts: Readonly<{
    glassCostMinor: MoneyMinor;
    profileCostMinor: MoneyMinor;
    explicitMaterialCostMinor: MoneyMinor;
    customLineCostMinor: MoneyMinor;
  }>,
): ElementTotals {
  const markupMinor = applyBasisPoints(materialCostMinor, commercialRules.markupBasisPoints);
  const subtotalBeforeDiscountMinor = materialCostMinor + markupMinor;
  const discountMinor = applyBasisPoints(
    subtotalBeforeDiscountMinor,
    commercialRules.discountBasisPoints,
  );
  const subtotalAfterDiscountMinor = subtotalBeforeDiscountMinor - discountMinor;
  const vatMinor = applyBasisPoints(subtotalAfterDiscountMinor, commercialRules.vatBasisPoints);
  const totalBeforeManualOverrideMinor = subtotalAfterDiscountMinor + vatMinor;

  trace.push({
    step: "commercialTotals",
    inputs: {
      materialCostMinor,
      markupBasisPoints: commercialRules.markupBasisPoints,
      discountBasisPoints: commercialRules.discountBasisPoints,
      vatBasisPoints: commercialRules.vatBasisPoints,
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
    manualOverride,
    canApplyOverride,
    manualOverridePath,
    warnings,
    trace,
  );

  return Object.freeze({
    ...componentCosts,
    materialCostMinor,
    markupMinor,
    discountMinor,
    subtotalAfterDiscountMinor,
    vatMinor,
    totalWithVatMinor: overrideResult.totalWithVatMinor,
    totalBeforeManualOverrideMinor,
    manualAdjustmentMinor: overrideResult.manualAdjustmentMinor,
  });
}

function applyQuoteDiscount(
  subtotalAfterItemDiscountMinor: MoneyMinor,
  discount: QuoteDiscountInput | undefined,
  quoteRules: CommercialRulesSnapshot,
  warnings: CalculationWarning[],
  trace: CalculationTraceEntry[],
): Readonly<{ quoteDiscountMinor: MoneyMinor; subtotalAfterDiscountMinor: MoneyMinor }> {
  if (!discount) {
    return Object.freeze({
      quoteDiscountMinor: 0,
      subtotalAfterDiscountMinor: subtotalAfterItemDiscountMinor,
    });
  }

  const rawDiscountMinor =
    discount.amountMinor ?? applyBasisPoints(subtotalAfterItemDiscountMinor, discount.basisPoints ?? 0);
  const quoteDiscountMinor = Math.min(
    Math.max(0, Math.round(rawDiscountMinor)),
    subtotalAfterItemDiscountMinor,
  );
  const subtotalAfterDiscountMinor = subtotalAfterItemDiscountMinor - quoteDiscountMinor;

  warnings.push(
    warning("QUOTE_DISCOUNT_APPLIED", "Quote-level discount changed the quote subtotal.", "quoteDiscount"),
  );

  if (!discount.reason || discount.reason.trim().length === 0) {
    warnings.push(
      warning(
        "QUOTE_DISCOUNT_REASON_MISSING",
        "Quote-level discount should include an audit reason.",
        "quoteDiscount.reason",
      ),
    );
  }

  trace.push({
    step: "quoteDiscount",
    inputs: {
      subtotalAfterItemDiscountMinor,
      amountMinor: discount.amountMinor,
      basisPoints: discount.basisPoints,
      vatBasisPoints: quoteRules.vatBasisPoints,
      hasReason: Boolean(discount.reason?.trim()),
      actorId: discount.actorId,
      timestamp: discount.timestamp,
    },
    output: { quoteDiscountMinor, subtotalAfterDiscountMinor },
  });

  return Object.freeze({ quoteDiscountMinor, subtotalAfterDiscountMinor });
}

function applyManualOverride(
  totalBeforeManualOverrideMinor: MoneyMinor,
  override: ManualOverrideInput | undefined,
  canApplyOverride: boolean,
  path: string,
  warnings: CalculationWarning[],
  trace: CalculationTraceEntry[],
): Readonly<{ totalWithVatMinor: MoneyMinor; manualAdjustmentMinor: MoneyMinor }> {
  if (!override) {
    return Object.freeze({
      totalWithVatMinor: totalBeforeManualOverrideMinor,
      manualAdjustmentMinor: 0,
    });
  }

  if (!Number.isFinite(override.amountMinor) || override.amountMinor < 0) {
    warnings.push(
      warning("INVALID_MANUAL_OVERRIDE", "Manual override amount must be zero or greater.", path),
    );

    return Object.freeze({
      totalWithVatMinor: totalBeforeManualOverrideMinor,
      manualAdjustmentMinor: 0,
    });
  }

  if (!canApplyOverride) {
    warnings.push(
      warning(
        "CALCULATION_BLOCKED",
        "Manual override was ignored because the base calculation input is invalid.",
        path,
      ),
    );

    trace.push({
      step: "manualOverride",
      inputs: {
        target: override.target,
        amountMinor: override.amountMinor,
        hasReason: Boolean(override.reason?.trim()),
        actorId: override.actorId,
        timestamp: override.timestamp,
        auditReferenceId: override.auditReferenceId,
        totalBeforeManualOverrideMinor,
      },
      output: { totalWithVatMinor: totalBeforeManualOverrideMinor, manualAdjustmentMinor: 0 },
      note: "Manual override was not applied because base input is invalid.",
    });

    return Object.freeze({
      totalWithVatMinor: totalBeforeManualOverrideMinor,
      manualAdjustmentMinor: 0,
    });
  }

  warnings.push(
    warning("MANUAL_OVERRIDE_APPLIED", "Manual override changed the final total.", path),
  );

  if (!override.reason || override.reason.trim().length === 0) {
    warnings.push(
      warning(
        "MANUAL_OVERRIDE_REASON_MISSING",
        "Manual override should include an audit reason.",
        `${path}.reason`,
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
      auditReferenceId: override.auditReferenceId,
      totalBeforeManualOverrideMinor,
    },
    output: { totalWithVatMinor: override.amountMinor, manualAdjustmentMinor },
  });

  return Object.freeze({
    totalWithVatMinor: override.amountMinor,
    manualAdjustmentMinor,
  });
}

function incompleteGlassCalculation(
  deductionWidthMm: number | undefined,
  deductionHeightMm: number | undefined,
): GlassCalculation {
  return Object.freeze({
    widthMm: null,
    heightMm: null,
    areaM2: null,
    billableAreaM2: null,
    totalBillableAreaM2: null,
    deductionWidthMm: deductionWidthMm ?? null,
    deductionHeightMm: deductionHeightMm ?? null,
  });
}

function glassCutFromCalculation(
  input: FixedWindowElementInput,
  glass: GlassCalculation,
): readonly GlassCut[] {
  if (
    glass.widthMm === null ||
    glass.heightMm === null ||
    glass.areaM2 === null ||
    glass.billableAreaM2 === null ||
    glass.totalBillableAreaM2 === null
  ) {
    return Object.freeze([]);
  }

  return Object.freeze([
    Object.freeze({
      itemId: input.elementId,
      glassId: input.glass.id,
      label: input.glass.label,
      pane: "main",
      widthMm: glass.widthMm,
      heightMm: glass.heightMm,
      areaM2: glass.areaM2,
      billableAreaM2: glass.billableAreaM2,
      quantity: input.quantity > 0 ? input.quantity : 0,
      totalBillableAreaM2: glass.totalBillableAreaM2,
      sourceRule: "configured-glass-deduction",
    }),
  ]);
}

function glassMaterialRequirementFromCalculation(
  input: FixedWindowElementInput,
  glass: GlassCalculation,
  costMinor: MoneyMinor,
): readonly MaterialRequirement[] {
  if (glass.totalBillableAreaM2 === null) {
    return Object.freeze([]);
  }

  return Object.freeze([
    Object.freeze({
      itemId: input.elementId,
      materialType: "glass",
      catalogItemId: input.glass.id,
      label: input.glass.label,
      unit: "square-meter",
      quantity: glass.totalBillableAreaM2,
      unitPriceMinor: input.glass.unitPriceMinorPerM2 ?? null,
      costMinor,
      sourceRule: "configured-glass-deduction",
    }),
  ]);
}

function profileMaterialRequirementFromCalculation(
  input: FixedWindowElementInput,
  profile: ProfileRequirement,
): MaterialRequirement {
  return Object.freeze({
    itemId: input.elementId,
    materialType: "profile",
    catalogItemId: profile.profileId,
    label: profile.label,
    unit: "linear-meter",
    quantity: profile.totalLinearMeters,
    unitPriceMinor: profile.unitPriceMinorPerMeter,
    costMinor: profile.costMinor,
    sourceRule: profile.sourceRule,
  });
}

function customLineMaterialRequirement(
  input: CustomManualLineItemInput,
  unit: CalculationUnit,
  costMinor: MoneyMinor,
): MaterialRequirement {
  return Object.freeze({
    itemId: input.elementId,
    materialType: "custom-line",
    catalogItemId: input.elementId,
    label: input.description,
    unit,
    quantity: input.quantity > 0 ? input.quantity : 0,
    unitPriceMinor: input.unitPriceMinor ?? null,
    costMinor,
    sourceRule: "manual-line-item-snapshot",
  });
}

function profileRequirement(
  input: FixedWindowElementInput,
  linearMetersPerElement: number,
  totalLinearMeters: number,
  costMinor: MoneyMinor,
): ProfileRequirement {
  return Object.freeze({
    itemId: input.elementId,
    profileId: input.frameProfile.id,
    label: input.frameProfile.label,
    profileType: "frame",
    linearMetersPerElement,
    totalLinearMeters,
    unitPriceMinorPerMeter: input.frameProfile.unitPriceMinorPerMeter ?? null,
    costMinor,
    sourceRule: "rectangular-frame-perimeter",
  });
}

function sumElementTotals(elements: readonly ElementCalculationResult[]): ElementTotals {
  return Object.freeze(
    elements.reduce<ElementTotals>(
      (accumulator, element) => ({
        glassCostMinor: accumulator.glassCostMinor + element.totals.glassCostMinor,
        profileCostMinor: accumulator.profileCostMinor + element.totals.profileCostMinor,
        explicitMaterialCostMinor:
          accumulator.explicitMaterialCostMinor + element.totals.explicitMaterialCostMinor,
        customLineCostMinor:
          accumulator.customLineCostMinor + element.totals.customLineCostMinor,
        materialCostMinor: accumulator.materialCostMinor + element.totals.materialCostMinor,
        markupMinor: accumulator.markupMinor + element.totals.markupMinor,
        discountMinor: accumulator.discountMinor + element.totals.discountMinor,
        subtotalAfterDiscountMinor:
          accumulator.subtotalAfterDiscountMinor + element.totals.subtotalAfterDiscountMinor,
        vatMinor: accumulator.vatMinor + element.totals.vatMinor,
        totalWithVatMinor: accumulator.totalWithVatMinor + element.totals.totalWithVatMinor,
        totalBeforeManualOverrideMinor:
          accumulator.totalBeforeManualOverrideMinor +
          element.totals.totalBeforeManualOverrideMinor,
        manualAdjustmentMinor:
          accumulator.manualAdjustmentMinor + element.totals.manualAdjustmentMinor,
      }),
      zeroTotals,
    ),
  );
}

function groupProfileLinearMeters(
  profiles: readonly ProfileRequirement[],
): readonly ProfileLinearMetersGroup[] {
  const groups = new Map<string, ProfileLinearMetersGroup>();

  for (const profile of profiles) {
    const existing = groups.get(profile.profileId);

    if (!existing) {
      groups.set(
        profile.profileId,
        Object.freeze({
          profileId: profile.profileId,
          label: profile.label,
          profileType: profile.profileType,
          totalLinearMeters: profile.totalLinearMeters,
          unitPriceMinorPerMeter: profile.unitPriceMinorPerMeter,
          costMinor: profile.costMinor,
          itemIds: Object.freeze([profile.itemId]),
          sourceRule: profile.sourceRule,
        }),
      );
      continue;
    }

    groups.set(
      profile.profileId,
      Object.freeze({
        ...existing,
        totalLinearMeters: roundMeasurement(
          existing.totalLinearMeters + profile.totalLinearMeters,
        ),
        unitPriceMinorPerMeter:
          existing.unitPriceMinorPerMeter === profile.unitPriceMinorPerMeter
            ? existing.unitPriceMinorPerMeter
            : null,
        costMinor: existing.costMinor + profile.costMinor,
        itemIds: Object.freeze([...existing.itemIds, profile.itemId]),
      }),
    );
  }

  return Object.freeze([...groups.values()]);
}

function resolveCommercialRules(
  item: CalculationItemInput,
  quoteRules: CommercialRulesSnapshot,
): CommercialRulesSnapshot {
  return item.commercialRules ?? quoteRules;
}

function applyBasisPoints(amountMinor: MoneyMinor, basisPoints: BasisPoints): MoneyMinor {
  return Math.round((amountMinor * basisPoints) / BASIS_POINTS_DENOMINATOR);
}

function multiplyMoneyByMeasurement(amountMinor: MoneyMinor, measurement: number): MoneyMinor {
  return Math.round(amountMinor * measurement);
}

function sumMoney(values: readonly MoneyMinor[]): MoneyMinor {
  return values.reduce((sum, value) => sum + value, 0);
}

function roundMeasurement(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isCatalogLineItemType(value: string): value is CatalogLineItemType {
  return (
    value === "accessory-line" ||
    value === "service-line" ||
    value === "transport-line" ||
    value === "installation-line"
  );
}

function materialTypeForCatalogLine(
  value: CatalogLineItemType,
): Extract<MaterialRequirementType, "accessory" | "service"> {
  return value === "accessory-line" ? "accessory" : "service";
}

function warning(
  code: CalculationWarningCode,
  message: string,
  path: string,
): CalculationWarning {
  return Object.freeze({ code, message, path });
}
