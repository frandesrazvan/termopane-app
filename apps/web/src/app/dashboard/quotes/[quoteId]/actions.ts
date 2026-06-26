"use server";

import { ProfileItemType, QuoteItemType, QuoteVersionStatus } from "@prisma/client";
import { isQuotePdfTemplateKey } from "@termopane/pdf";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canApplyCommercialOverrides, canGeneratePdf, requireTenant } from "@/lib/auth";
import { recalculateTenantCurrentQuoteVersion } from "@/lib/calculation/quote-calculation-adapter";
import {
  buildDoorCatalogSnapshot,
  buildFixedWindowCatalogSnapshot,
  isSelectableCatalogRecord,
  selectActiveCatalogPriceList,
} from "@/lib/catalog/quote-item-catalog-snapshot";
import {
  applyTenantQuoteDiscount,
  applyTenantQuoteItemManualOverride,
  createTenantQuoteRevision,
  createTenantQuoteItem,
  deleteTenantQuoteItem,
  getTenantColorFinish,
  getTenantGlassPackage,
  getTenantHardwareKit,
  getTenantProfileItem,
  getTenantProfileSystem,
  getTenantQuoteItem,
  getTenantQuoteWithCurrentVersion,
  listTenantPriceListItems,
  listTenantPriceLists,
  lockTenantQuoteVersion,
  updateTenantQuoteItem,
  type TenantQuoteItemUpdateInput,
  type TenantQuoteItemWriteInput,
} from "@/lib/data";
import {
  customLineDrawingSnapshot,
  doorDrawingSnapshot,
  fixedWindowDrawingSnapshot,
} from "@/lib/drawing/quote-item-drawings";
import { generateTenantQuotePdf } from "@/lib/pdf/quote-pdf-generator";

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => (value.length > 0 ? value : null));

const quantitySchema = z.coerce.number().int().min(1).max(999);
const dimensionSchema = z.coerce.number().int().min(1).max(20_000);
const descriptionSchema = z.string().trim().min(1).max(400);
const catalogIdSchema = z.string().trim().min(1).max(191);
const optionalCatalogIdSchema = z
  .string()
  .trim()
  .max(191)
  .transform((value) => (value.length > 0 ? value : null));
const optionalMoneySchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value.length === 0) {
      return null;
    }

    if (!/^\d+(\.\d{1,2})?$/.test(value)) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid money amount.",
      });

      return z.NEVER;
    }

    return moneyToMinor(value);
  });

const fixedWindowSchema = z.object({
  quantity: quantitySchema,
  widthMm: dimensionSchema,
  heightMm: dimensionSchema,
  customerDescription: descriptionSchema,
  internalNotes: optionalText(1000),
  profileSystemId: catalogIdSchema,
  frameProfileId: catalogIdSchema,
  glassPackageId: catalogIdSchema,
  colorFinishId: catalogIdSchema,
  hardwareKitId: optionalCatalogIdSchema,
});

const doorSchema = z.object({
  quantity: quantitySchema,
  widthMm: dimensionSchema,
  heightMm: dimensionSchema,
  customerDescription: descriptionSchema,
  internalNotes: optionalText(1000),
  profileSystemId: catalogIdSchema,
  frameProfileId: optionalCatalogIdSchema,
  thresholdProfileId: optionalCatalogIdSchema,
  glassPackageId: optionalCatalogIdSchema,
  colorFinishId: catalogIdSchema,
  hardwareKitId: optionalCatalogIdSchema,
  hardwareDescription: optionalText(200),
  panelDescription: optionalText(400),
  manualPanelPriceMinor: optionalMoneySchema,
});

const customLineSchema = z.object({
  quantity: quantitySchema,
  customerDescription: descriptionSchema,
  internalNotes: optionalText(1000),
  unitPriceMinor: z
    .string()
    .trim()
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(value))
    .transform((value) => moneyToMinor(value)),
});

const commercialReasonSchema = z.string().trim().min(1).max(500);
const moneyInputSchema = z
  .string()
  .trim()
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value))
  .transform((value) => moneyToMinor(value));

const itemManualOverrideSchema = z.object({
  amountMinor: moneyInputSchema,
  reason: commercialReasonSchema,
});

const quoteDiscountSchema = z
  .object({
    discountType: z.enum(["amount", "percent"]),
    value: z.string().trim(),
    reason: commercialReasonSchema,
  })
  .transform((data, ctx) => {
    if (data.discountType === "amount") {
      if (!/^\d+(\.\d{1,2})?$/.test(data.value)) {
        ctx.addIssue({
          code: "custom",
          message: "Invalid money amount.",
          path: ["value"],
        });

        return z.NEVER;
      }

      const amountMinor = moneyToMinor(data.value);

      if (amountMinor <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "Discount amount must be positive.",
          path: ["value"],
        });

        return z.NEVER;
      }

      return {
        amountMinor,
        reason: data.reason,
      };
    }

    if (!/^\d+(\.\d{1,2})?$/.test(data.value)) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid percentage.",
        path: ["value"],
      });

      return z.NEVER;
    }

    const basisPoints = percentageToBasisPoints(data.value);

    if (basisPoints <= 0 || basisPoints > 10_000) {
      ctx.addIssue({
        code: "custom",
        message: "Discount percentage must be between 0 and 100.",
        path: ["value"],
      });

      return z.NEVER;
    }

    return {
      basisPoints,
      reason: data.reason,
    };
  });

type TenantActionContext = Awaited<ReturnType<typeof requireTenant>>;

function formText(formData: FormData, field: string) {
  const value = formData.get(field);

  return typeof value === "string" ? value : "";
}

export async function addFixedWindowItemAction(quoteId: string, formData: FormData) {
  const context = await requireTenant();
  const quoteState = await requireMutableCurrentQuote(context, quoteId);
  const parsed = fixedWindowSchema.safeParse({
    quantity: formText(formData, "quantity"),
    widthMm: formText(formData, "widthMm"),
    heightMm: formText(formData, "heightMm"),
    customerDescription: formText(formData, "customerDescription"),
    internalNotes: formText(formData, "internalNotes"),
    profileSystemId: formText(formData, "profileSystemId"),
    frameProfileId: formText(formData, "frameProfileId"),
    glassPackageId: formText(formData, "glassPackageId"),
    colorFinishId: formText(formData, "colorFinishId"),
    hardwareKitId: formText(formData, "hardwareKitId"),
  });

  if (!parsed.success) {
    redirectWithItemError(quoteId, "validation");
  }

  const catalogSnapshot = await resolveFixedWindowCatalogSnapshot(
    context,
    parsed.data,
    quoteState.quote.currency,
    quoteId,
  );
  const item = await createTenantQuoteItem(
    context,
    quoteId,
    fixedWindowInput(parsed.data, quoteState.quote.currency, catalogSnapshot),
  );

  if (!item) {
    redirectWithItemError(quoteId, "locked");
  }

  redirectToQuoteItems(quoteId);
}

export async function addDoorItemAction(quoteId: string, formData: FormData) {
  const context = await requireTenant();
  const quoteState = await requireMutableCurrentQuote(context, quoteId);
  const parsed = doorSchema.safeParse({
    quantity: formText(formData, "quantity"),
    widthMm: formText(formData, "widthMm"),
    heightMm: formText(formData, "heightMm"),
    customerDescription: formText(formData, "customerDescription"),
    internalNotes: formText(formData, "internalNotes"),
    profileSystemId: formText(formData, "profileSystemId"),
    frameProfileId: formText(formData, "frameProfileId"),
    thresholdProfileId: formText(formData, "thresholdProfileId"),
    glassPackageId: formText(formData, "glassPackageId"),
    colorFinishId: formText(formData, "colorFinishId"),
    hardwareKitId: formText(formData, "hardwareKitId"),
    hardwareDescription: formText(formData, "hardwareDescription"),
    panelDescription: formText(formData, "panelDescription"),
    manualPanelPriceMinor: formText(formData, "manualPanelPrice"),
  });

  if (!parsed.success) {
    redirectWithItemError(quoteId, "validation");
  }

  const catalogSnapshot = await resolveDoorCatalogSnapshot(
    context,
    parsed.data,
    quoteState.quote.currency,
    quoteId,
  );
  const item = await createTenantQuoteItem(
    context,
    quoteId,
    doorInput(parsed.data, quoteState.quote.currency, catalogSnapshot),
  );

  if (!item) {
    redirectWithItemError(quoteId, "locked");
  }

  redirectToQuoteItems(quoteId);
}

export async function addCustomLineItemAction(quoteId: string, formData: FormData) {
  const context = await requireTenant();
  const quoteState = await requireMutableCurrentQuote(context, quoteId);
  const parsed = customLineSchema.safeParse({
    quantity: formText(formData, "quantity"),
    customerDescription: formText(formData, "customerDescription"),
    internalNotes: formText(formData, "internalNotes"),
    unitPriceMinor: formText(formData, "unitPrice"),
  });

  if (!parsed.success) {
    redirectWithItemError(quoteId, "validation");
  }

  const item = await createTenantQuoteItem(
    context,
    quoteId,
    customLineInput(parsed.data, quoteState.quote.currency),
  );

  if (!item) {
    redirectWithItemError(quoteId, "locked");
  }

  redirectToQuoteItems(quoteId);
}

export async function updateQuoteItemAction(
  quoteId: string,
  quoteItemId: string,
  formData: FormData,
) {
  const context = await requireTenant();
  const quoteState = await requireMutableCurrentQuote(context, quoteId);
  const existingItem = await getTenantQuoteItem(context, quoteItemId);

  if (!existingItem || existingItem.quoteVersionId !== quoteState.currentVersion.id) {
    redirect("/forbidden");
  }

  const updateInput = await parseItemUpdateInput(
    context,
    formData,
    existingItem.type,
    quoteState.quote.currency,
    quoteId,
  );
  const item = await updateTenantQuoteItem(context, quoteItemId, updateInput);

  if (!item) {
    redirectWithItemError(quoteId, "locked");
  }

  redirectToQuoteItems(quoteId);
}

export async function deleteQuoteItemAction(
  quoteId: string,
  quoteItemId: string,
  formData: FormData,
) {
  void formData;

  const context = await requireTenant();
  const quoteState = await requireMutableCurrentQuote(context, quoteId);
  const existingItem = await getTenantQuoteItem(context, quoteItemId);

  if (!existingItem || existingItem.quoteVersionId !== quoteState.currentVersion.id) {
    redirect("/forbidden");
  }

  const item = await deleteTenantQuoteItem(context, quoteItemId);

  if (!item) {
    redirectWithItemError(quoteId, "locked");
  }

  redirectToQuoteItems(quoteId);
}

export async function recalculateCurrentQuoteVersionAction(
  quoteId: string,
  formData: FormData,
) {
  void formData;

  const context = await requireTenant();
  const result = await recalculateTenantCurrentQuoteVersion(context, quoteId);

  if (!result.ok) {
    if (result.reason === "locked") {
      redirectWithCalculationError(quoteId, "locked");
    }

    redirect("/forbidden");
  }

  redirectToCalculation(quoteId);
}

export async function applyItemManualOverrideAction(
  quoteId: string,
  quoteItemId: string,
  formData: FormData,
) {
  const context = await requireTenant();

  if (!canApplyCommercialOverrides(context.membership)) {
    redirect("/forbidden");
  }

  const parsed = itemManualOverrideSchema.safeParse({
    amountMinor: formText(formData, "overrideTotal"),
    reason: formText(formData, "overrideReason"),
  });

  if (!parsed.success) {
    redirectWithCommercialError(quoteId, "validation", "items");
  }

  const result = await applyTenantQuoteItemManualOverride(context, quoteItemId, {
    amountMinor: parsed.data.amountMinor,
    reason: parsed.data.reason,
    actorUserId: context.user.id,
  });

  if (!result) {
    redirectWithCommercialError(quoteId, "locked", "items");
  }

  await recalculateAfterCommercialAdjustment(context, quoteId);
  redirectWithCommercialEvent(quoteId, "item-override", "items");
}

export async function applyQuoteDiscountAction(quoteId: string, formData: FormData) {
  const context = await requireTenant();

  if (!canApplyCommercialOverrides(context.membership)) {
    redirect("/forbidden");
  }

  const parsed = quoteDiscountSchema.safeParse({
    discountType: formText(formData, "discountType"),
    value: formText(formData, "discountValue"),
    reason: formText(formData, "discountReason"),
  });

  if (!parsed.success) {
    redirectWithCommercialError(quoteId, "validation", "calculation");
  }

  const result = await applyTenantQuoteDiscount(context, quoteId, {
    ...parsed.data,
    actorUserId: context.user.id,
  });

  if (!result) {
    redirectWithCommercialError(quoteId, "locked", "calculation");
  }

  await recalculateAfterCommercialAdjustment(context, quoteId);
  redirectWithCommercialEvent(quoteId, "quote-discount", "calculation");
}

export async function lockCurrentQuoteVersionAction(
  quoteId: string,
  formData: FormData,
) {
  void formData;

  const context = await requireTenant();
  const result = await lockTenantQuoteVersion(context, quoteId, {
    actorUserId: context.user.id,
  });

  if (!result) {
    redirectWithVersionError(quoteId, "lock");
  }

  redirectWithVersionEvent(quoteId, "locked");
}

export async function createQuoteRevisionAction(
  quoteId: string,
  formData: FormData,
) {
  void formData;

  const context = await requireTenant();
  const result = await createTenantQuoteRevision(context, quoteId, {
    actorUserId: context.user.id,
  });

  if (!result) {
    redirectWithVersionError(quoteId, "revision");
  }

  redirectWithVersionEvent(quoteId, "revision");
}

export async function generateQuotePdfAction(
  quoteId: string,
  quoteVersionId: string,
  formData: FormData,
) {
  const context = await requireTenant();

  if (!canGeneratePdf(context.membership)) {
    redirectWithDocumentError(quoteId, "generate");
  }

  const templateKeyValue = formText(formData, "templateKey");
  const templateKey = isQuotePdfTemplateKey(templateKeyValue)
    ? templateKeyValue
    : undefined;
  const result = await generateTenantQuotePdf(context, quoteId, quoteVersionId, {
    actorUserId: context.user.id,
    ...(templateKey ? { templateKey } : {}),
  });

  if (!result.ok) {
    if (result.reason === "not_locked") {
      redirectWithDocumentError(quoteId, "locked");
    }

    redirectWithDocumentError(quoteId, "generate");
  }

  redirectWithDocumentEvent(quoteId, "generated");
}

async function parseItemUpdateInput(
  context: TenantActionContext,
  formData: FormData,
  itemType: string,
  currency: string,
  quoteId: string,
): Promise<TenantQuoteItemUpdateInput> {
  if (itemType === QuoteItemType.WINDOW) {
    const parsed = fixedWindowSchema.safeParse({
      quantity: formText(formData, "quantity"),
      widthMm: formText(formData, "widthMm"),
      heightMm: formText(formData, "heightMm"),
      customerDescription: formText(formData, "customerDescription"),
      internalNotes: formText(formData, "internalNotes"),
      profileSystemId: formText(formData, "profileSystemId"),
      frameProfileId: formText(formData, "frameProfileId"),
      glassPackageId: formText(formData, "glassPackageId"),
      colorFinishId: formText(formData, "colorFinishId"),
      hardwareKitId: formText(formData, "hardwareKitId"),
    });

    if (!parsed.success) {
      redirectWithItemError(quoteId, "validation");
    }

    const catalogSnapshot = await resolveFixedWindowCatalogSnapshot(
      context,
      parsed.data,
      currency,
      quoteId,
    );

    return fixedWindowInput(parsed.data, currency, catalogSnapshot);
  }

  if (itemType === QuoteItemType.DOOR) {
    const parsed = doorSchema.safeParse({
      quantity: formText(formData, "quantity"),
      widthMm: formText(formData, "widthMm"),
      heightMm: formText(formData, "heightMm"),
      customerDescription: formText(formData, "customerDescription"),
      internalNotes: formText(formData, "internalNotes"),
      profileSystemId: formText(formData, "profileSystemId"),
      frameProfileId: formText(formData, "frameProfileId"),
      thresholdProfileId: formText(formData, "thresholdProfileId"),
      glassPackageId: formText(formData, "glassPackageId"),
      colorFinishId: formText(formData, "colorFinishId"),
      hardwareKitId: formText(formData, "hardwareKitId"),
      hardwareDescription: formText(formData, "hardwareDescription"),
      panelDescription: formText(formData, "panelDescription"),
      manualPanelPriceMinor: formText(formData, "manualPanelPrice"),
    });

    if (!parsed.success) {
      redirectWithItemError(quoteId, "validation");
    }

    const catalogSnapshot = await resolveDoorCatalogSnapshot(
      context,
      parsed.data,
      currency,
      quoteId,
    );

    return doorInput(parsed.data, currency, catalogSnapshot);
  }

  if (itemType === QuoteItemType.CUSTOM) {
    const parsed = customLineSchema.safeParse({
      quantity: formText(formData, "quantity"),
      customerDescription: formText(formData, "customerDescription"),
      internalNotes: formText(formData, "internalNotes"),
      unitPriceMinor: formText(formData, "unitPrice"),
    });

    if (!parsed.success) {
      redirectWithItemError(quoteId, "validation");
    }

    return customLineInput(parsed.data, currency);
  }

  redirectWithItemError(quoteId, "validation");
}

async function requireMutableCurrentQuote(context: TenantActionContext, quoteId: string) {
  const quoteState = await getTenantQuoteWithCurrentVersion(context, quoteId);

  if (!quoteState?.currentVersion) {
    redirect("/forbidden");
  }

  if (!isDraftVersionMutable(quoteState.currentVersion)) {
    redirectWithItemError(quoteId, "locked");
  }

  return {
    quote: quoteState.quote,
    currentVersion: quoteState.currentVersion,
  };
}

async function resolveFixedWindowCatalogSnapshot(
  context: TenantActionContext,
  data: z.infer<typeof fixedWindowSchema>,
  currency: string,
  quoteId: string,
) {
  const [
    profileSystem,
    frameProfile,
    glassPackage,
    colorFinish,
    hardwareKit,
    priceLists,
  ] = await Promise.all([
    getTenantProfileSystem(context, data.profileSystemId),
    getTenantProfileItem(context, data.frameProfileId),
    getTenantGlassPackage(context, data.glassPackageId),
    getTenantColorFinish(context, data.colorFinishId),
    data.hardwareKitId ? getTenantHardwareKit(context, data.hardwareKitId) : Promise.resolve(null),
    listTenantPriceLists(context),
  ]);

  if (
    !profileSystem ||
    !frameProfile ||
    !glassPackage ||
    !colorFinish ||
    !isSelectableCatalogRecord(profileSystem) ||
    !isSelectableCatalogRecord(frameProfile) ||
    !isSelectableCatalogRecord(glassPackage) ||
    !isSelectableCatalogRecord(colorFinish) ||
    frameProfile.type !== ProfileItemType.FRAME ||
    frameProfile.profileSystemId !== profileSystem.id ||
    (colorFinish.profileSystemId && colorFinish.profileSystemId !== profileSystem.id)
  ) {
    redirectWithItemError(quoteId, "validation");
  }

  if (data.hardwareKitId && (!hardwareKit || !isSelectableCatalogRecord(hardwareKit))) {
    redirectWithItemError(quoteId, "validation");
  }

  const priceList = selectActiveCatalogPriceList(priceLists, currency);
  const priceListItems = priceList
    ? await listTenantPriceListItems(context, { priceListId: priceList.id })
    : [];

  return buildFixedWindowCatalogSnapshot({
    profileSystem,
    frameProfile,
    glassPackage,
    colorFinish,
    hardwareKit,
    priceList,
    priceListItems,
  });
}

async function resolveDoorCatalogSnapshot(
  context: TenantActionContext,
  data: z.infer<typeof doorSchema>,
  currency: string,
  quoteId: string,
) {
  const [
    profileSystem,
    frameProfile,
    thresholdProfile,
    glassPackage,
    colorFinish,
    hardwareKit,
    priceLists,
  ] = await Promise.all([
    getTenantProfileSystem(context, data.profileSystemId),
    data.frameProfileId ? getTenantProfileItem(context, data.frameProfileId) : Promise.resolve(null),
    data.thresholdProfileId
      ? getTenantProfileItem(context, data.thresholdProfileId)
      : Promise.resolve(null),
    data.glassPackageId ? getTenantGlassPackage(context, data.glassPackageId) : Promise.resolve(null),
    getTenantColorFinish(context, data.colorFinishId),
    data.hardwareKitId ? getTenantHardwareKit(context, data.hardwareKitId) : Promise.resolve(null),
    listTenantPriceLists(context),
  ]);

  if (
    !profileSystem ||
    !colorFinish ||
    !isSelectableCatalogRecord(profileSystem) ||
    !isSelectableCatalogRecord(colorFinish) ||
    (colorFinish.profileSystemId && colorFinish.profileSystemId !== profileSystem.id)
  ) {
    redirectWithItemError(quoteId, "validation");
  }

  if (
    data.frameProfileId &&
    (!frameProfile ||
      !isSelectableCatalogRecord(frameProfile) ||
      frameProfile.type !== ProfileItemType.FRAME ||
      frameProfile.profileSystemId !== profileSystem.id)
  ) {
    redirectWithItemError(quoteId, "validation");
  }

  if (
    data.thresholdProfileId &&
    (!thresholdProfile ||
      !isSelectableCatalogRecord(thresholdProfile) ||
      thresholdProfile.type !== ProfileItemType.THRESHOLD ||
      thresholdProfile.profileSystemId !== profileSystem.id)
  ) {
    redirectWithItemError(quoteId, "validation");
  }

  if (
    data.glassPackageId &&
    (!glassPackage || !isSelectableCatalogRecord(glassPackage))
  ) {
    redirectWithItemError(quoteId, "validation");
  }

  if (data.hardwareKitId && (!hardwareKit || !isSelectableCatalogRecord(hardwareKit))) {
    redirectWithItemError(quoteId, "validation");
  }

  const priceList = selectActiveCatalogPriceList(priceLists, currency);
  const priceListItems = priceList
    ? await listTenantPriceListItems(context, { priceListId: priceList.id })
    : [];

  return buildDoorCatalogSnapshot({
    profileSystem,
    frameProfile,
    thresholdProfile,
    glassPackage,
    colorFinish,
    hardwareKit,
    panelDescription: data.panelDescription,
    manualPanelPriceMinor: data.manualPanelPriceMinor,
    currency,
    priceList,
    priceListItems,
  });
}

function fixedWindowInput(
  data: z.infer<typeof fixedWindowSchema>,
  currency: string,
  catalogSnapshot: Record<string, unknown>,
): TenantQuoteItemWriteInput {
  const selectedCatalogSnapshot = (legacyPlaceholderNote: string) => {
    void legacyPlaceholderNote;

    return catalogSnapshot;
  };

  return {
    type: QuoteItemType.WINDOW,
    quantity: data.quantity,
    widthMm: data.widthMm,
    heightMm: data.heightMm,
    customerDescription: data.customerDescription,
    internalNotes: data.internalNotes,
    configurationSnapshot: {
      kind: "fixed-window",
      quantity: data.quantity,
      widthMm: data.widthMm,
      heightMm: data.heightMm,
      currency,
      catalogSelection: {
        profileSystemId: data.profileSystemId,
        frameProfileId: data.frameProfileId,
        glassPackageId: data.glassPackageId,
        colorFinishId: data.colorFinishId,
        hardwareKitId: data.hardwareKitId,
      },
      drawing: fixedWindowDrawingSnapshot({
        widthMm: data.widthMm,
        heightMm: data.heightMm,
        label: data.customerDescription,
      }),
      source: "quote-item-draft-editor",
      requiresCalculation: true,
    },
    catalogSnapshot: selectedCatalogSnapshot(
      "Selecția de catalog este amânată pentru această fereastră fixă în ciornă.",
    ),
    totalsSnapshot: emptyTotalsSnapshot(),
  };
}

function doorInput(
  data: z.infer<typeof doorSchema>,
  currency: string,
  catalogSnapshot: Record<string, unknown>,
): TenantQuoteItemWriteInput {
  return {
    type: QuoteItemType.DOOR,
    quantity: data.quantity,
    widthMm: data.widthMm,
    heightMm: data.heightMm,
    customerDescription: data.customerDescription,
    internalNotes: data.internalNotes,
    configurationSnapshot: {
      kind: "door",
      quantity: data.quantity,
      widthMm: data.widthMm,
      heightMm: data.heightMm,
      currency,
      catalogSelection: {
        profileSystemId: data.profileSystemId,
        frameProfileId: data.frameProfileId,
        thresholdProfileId: data.thresholdProfileId,
        glassPackageId: data.glassPackageId,
        colorFinishId: data.colorFinishId,
        hardwareKitId: data.hardwareKitId,
      },
      panel: {
        description: data.panelDescription,
        manualPricing:
          data.manualPanelPriceMinor === null
            ? null
            : {
                unitPriceMinor: data.manualPanelPriceMinor,
                currency,
                source: "explicit-manual-panel-snapshot",
              },
      },
      hardware: {
        description: data.hardwareDescription,
      },
      drawing: doorDrawingSnapshot({
        widthMm: data.widthMm,
        heightMm: data.heightMm,
        label: data.customerDescription,
        split: doorDrawingSplit(data.glassPackageId, data.panelDescription),
        panelLabel: data.panelDescription,
      }),
      source: "quote-item-draft-editor",
      requiresCalculation: true,
      calculationMode: "rough-explicit-snapshot-only",
    },
    catalogSnapshot,
    totalsSnapshot: emptyTotalsSnapshot(),
  };
}

function customLineInput(
  data: z.infer<typeof customLineSchema>,
  currency: string,
): TenantQuoteItemWriteInput {
  return {
    type: QuoteItemType.CUSTOM,
    quantity: data.quantity,
    widthMm: null,
    heightMm: null,
    customerDescription: data.customerDescription,
    internalNotes: data.internalNotes,
    configurationSnapshot: {
      kind: "custom-line",
      quantity: data.quantity,
      currency,
      manualPricing: {
        unitPriceMinor: data.unitPriceMinor,
        currency,
        source: "explicit-manual-snapshot",
      },
      source: "quote-item-draft-editor",
      requiresCalculation: false,
      drawing: customLineDrawingSnapshot({
        label: data.customerDescription,
      }),
    },
    catalogSnapshot: {
      ...draftCatalogPlaceholder(
        "Prețul poziției personalizate este un snapshot manual explicit, nu o formulă.",
      ),
      manualPricing: {
        unitPriceMinor: data.unitPriceMinor,
        currency,
        isFormula: false,
      },
    },
    totalsSnapshot: emptyTotalsSnapshot(),
  };
}

function draftCatalogPlaceholder(note: string) {
  return {
    placeholder: true,
    note,
    source: "quote-item-draft-editor",
  };
}

function emptyTotalsSnapshot() {
  return {
    subtotalMinor: 0,
    vatMinor: 0,
    totalMinor: 0,
    pendingCalculation: true,
    source: "quote-item-draft-editor",
  };
}

function doorDrawingSplit(
  glassPackageId: string | null,
  panelDescription: string | null,
) {
  if (glassPackageId && panelDescription) {
    return "glass-panel" as const;
  }

  if (glassPackageId) {
    return "glass" as const;
  }

  if (panelDescription) {
    return "panel" as const;
  }

  return "none" as const;
}

function isDraftVersionMutable(quoteVersion: {
  status: QuoteVersionStatus;
  isLocked: boolean;
  lockedAt: Date | null;
  sentAt: Date | null;
}) {
  return (
    quoteVersion.status === QuoteVersionStatus.DRAFT &&
    !quoteVersion.isLocked &&
    !quoteVersion.lockedAt &&
    !quoteVersion.sentAt
  );
}

function moneyToMinor(value: string) {
  const [majorPart, minorPart = ""] = value.split(".");
  const major = Number.parseInt(majorPart, 10);
  const minor = Number.parseInt(minorPart.padEnd(2, "0"), 10) || 0;

  return major * 100 + minor;
}

function percentageToBasisPoints(value: string) {
  return Math.round(Number(value) * 100);
}

async function recalculateAfterCommercialAdjustment(
  context: TenantActionContext,
  quoteId: string,
) {
  const result = await recalculateTenantCurrentQuoteVersion(context, quoteId);

  if (!result.ok) {
    if (result.reason === "locked") {
      redirectWithCommercialError(quoteId, "locked", "calculation");
    }

    redirect("/forbidden");
  }
}

function quotePath(quoteId: string) {
  return `/dashboard/quotes/${quoteId}`;
}

function redirectToQuoteItems(quoteId: string): never {
  redirect(`${quotePath(quoteId)}#items`);
}

function redirectToCalculation(quoteId: string): never {
  redirect(`${quotePath(quoteId)}?calculated=1#calculation`);
}

function redirectWithItemError(quoteId: string, error: "locked" | "validation"): never {
  redirect(`${quotePath(quoteId)}?itemError=${error}#items`);
}

function redirectWithCalculationError(quoteId: string, error: "locked"): never {
  redirect(`${quotePath(quoteId)}?calculationError=${error}#calculation`);
}

function redirectWithCommercialEvent(
  quoteId: string,
  event: "item-override" | "quote-discount",
  anchor: "items" | "calculation",
): never {
  redirect(`${quotePath(quoteId)}?calculated=1&commercialEvent=${event}#${anchor}`);
}

function redirectWithCommercialError(
  quoteId: string,
  error: "locked" | "validation",
  anchor: "items" | "calculation",
): never {
  redirect(`${quotePath(quoteId)}?commercialError=${error}#${anchor}`);
}

function redirectWithVersionEvent(quoteId: string, event: "locked" | "revision"): never {
  redirect(`${quotePath(quoteId)}?versionEvent=${event}#versions`);
}

function redirectWithVersionError(quoteId: string, error: "lock" | "revision"): never {
  redirect(`${quotePath(quoteId)}?versionError=${error}#versions`);
}

function redirectWithDocumentEvent(quoteId: string, event: "generated"): never {
  redirect(`${quotePath(quoteId)}?documentEvent=${event}#documents`);
}

function redirectWithDocumentError(quoteId: string, error: "locked" | "generate"): never {
  redirect(`${quotePath(quoteId)}?documentError=${error}#documents`);
}
