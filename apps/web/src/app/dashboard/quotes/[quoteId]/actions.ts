"use server";

import { QuoteItemType, QuoteVersionStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenant } from "@/lib/auth";
import { recalculateTenantCurrentQuoteVersion } from "@/lib/calculation/quote-calculation-adapter";
import {
  createTenantQuoteItem,
  deleteTenantQuoteItem,
  getTenantQuoteItem,
  getTenantQuoteWithCurrentVersion,
  updateTenantQuoteItem,
  type TenantQuoteItemUpdateInput,
  type TenantQuoteItemWriteInput,
} from "@/lib/data";

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => (value.length > 0 ? value : null));

const quantitySchema = z.coerce.number().int().min(1).max(999);
const dimensionSchema = z.coerce.number().int().min(1).max(20_000);
const descriptionSchema = z.string().trim().min(1).max(400);

const fixedWindowSchema = z.object({
  quantity: quantitySchema,
  widthMm: dimensionSchema,
  heightMm: dimensionSchema,
  customerDescription: descriptionSchema,
  internalNotes: optionalText(1000),
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
  });

  if (!parsed.success) {
    redirectWithItemError(quoteId, "validation");
  }

  const item = await createTenantQuoteItem(
    context,
    quoteId,
    fixedWindowInput(parsed.data, quoteState.quote.currency),
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

  const updateInput = parseItemUpdateInput(
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

function parseItemUpdateInput(
  formData: FormData,
  itemType: string,
  currency: string,
  quoteId: string,
): TenantQuoteItemUpdateInput {
  if (itemType === QuoteItemType.WINDOW) {
    const parsed = fixedWindowSchema.safeParse({
      quantity: formText(formData, "quantity"),
      widthMm: formText(formData, "widthMm"),
      heightMm: formText(formData, "heightMm"),
      customerDescription: formText(formData, "customerDescription"),
      internalNotes: formText(formData, "internalNotes"),
    });

    if (!parsed.success) {
      redirectWithItemError(quoteId, "validation");
    }

    return fixedWindowInput(parsed.data, currency);
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

function fixedWindowInput(
  data: z.infer<typeof fixedWindowSchema>,
  currency: string,
): TenantQuoteItemWriteInput {
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
      source: "quote-item-draft-editor",
      requiresCalculation: true,
    },
    catalogSnapshot: draftCatalogPlaceholder("Catalog selection is deferred for this fixed-window draft item."),
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
    },
    catalogSnapshot: {
      ...draftCatalogPlaceholder("Custom-line price is an explicit manual snapshot, not a formula."),
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
