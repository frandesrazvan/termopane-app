"use server";

import { QuoteNumberDatePattern } from "@prisma/client";
import { isQuotePdfTemplateKey } from "@termopane/pdf";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  canManageCompanySettings,
  canManageQuoteNumbering,
  requireTenant,
} from "@/lib/auth";
import {
  updateTenantCompanySettings,
  updateTenantQuoteNumberSettings,
  upsertTenantUserPreference,
} from "@/lib/data";

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => (value.length > 0 ? value : null));

const requiredText = (maxLength: number) => z.string().trim().min(1).max(maxLength);
const templateKeySchema = z.enum(["template-a", "template-b"]);

const percentSchema = z
  .string()
  .trim()
  .transform((value) => (value ? Number(value.replace(",", ".")) : null))
  .refine((value) => value === null || (Number.isFinite(value) && value >= 0 && value <= 100))
  .transform((value) => (value === null ? null : Math.round(value * 100)));

const optionalPositiveIntSchema = z
  .string()
  .trim()
  .transform((value) => (value ? Number(value) : null))
  .refine((value) => value === null || (Number.isInteger(value) && value > 0 && value <= 3650));

const companySettingsSchema = z.object({
  settingsId: optionalText(191),
  legalName: requiredText(160),
  displayName: requiredText(160),
  taxIdentifier: optionalText(80),
  registrationNumber: optionalText(80),
  addressLine1: optionalText(180),
  addressLine2: optionalText(180),
  city: optionalText(100),
  country: optionalText(100),
  phone: optionalText(60),
  email: optionalText(160),
  website: optionalText(180),
  defaultCurrency: z.string().trim().regex(/^[A-Za-z]{3}$/),
  defaultPdfTemplate: templateKeySchema,
  vatRateBasisPoints: percentSchema,
  offerValidityDays: optionalPositiveIntSchema,
  paymentTermsText: optionalText(1000),
  warrantyText: optionalText(1000),
  deliveryText: optionalText(1000),
  advancePaymentText: optionalText(1000),
  pdfFooterText: optionalText(1000),
});

const quoteNumberSettingsSchema = z.object({
  settingsId: optionalText(191),
  prefix: requiredText(20),
  nextNumber: z.coerce.number().int().min(1).max(9_999_999),
  datePattern: z.nativeEnum(QuoteNumberDatePattern),
});

const shortcutValues = ["new-quote", "quotes", "customers", "catalog", "settings"];

function formText(formData: FormData, field: string) {
  const value = formData.get(field);

  return typeof value === "string" ? value : "";
}

export async function updateCompanySettingsAction(formData: FormData) {
  const context = await requireTenant();

  if (!canManageCompanySettings(context.membership)) {
    redirect("/forbidden");
  }

  const parsed = companySettingsSchema.safeParse({
    settingsId: formText(formData, "settingsId"),
    legalName: formText(formData, "legalName"),
    displayName: formText(formData, "displayName"),
    taxIdentifier: formText(formData, "taxIdentifier"),
    registrationNumber: formText(formData, "registrationNumber"),
    addressLine1: formText(formData, "addressLine1"),
    addressLine2: formText(formData, "addressLine2"),
    city: formText(formData, "city"),
    country: formText(formData, "country"),
    phone: formText(formData, "phone"),
    email: formText(formData, "email"),
    website: formText(formData, "website"),
    defaultCurrency: formText(formData, "defaultCurrency"),
    defaultPdfTemplate: formText(formData, "defaultPdfTemplate"),
    vatRateBasisPoints: formText(formData, "vatRatePercent"),
    offerValidityDays: formText(formData, "offerValidityDays"),
    paymentTermsText: formText(formData, "paymentTermsText"),
    warrantyText: formText(formData, "warrantyText"),
    deliveryText: formText(formData, "deliveryText"),
    advancePaymentText: formText(formData, "advancePaymentText"),
    pdfFooterText: formText(formData, "pdfFooterText"),
  });

  if (!parsed.success) {
    redirect("/dashboard/settings?error=company");
  }

  const result = await updateTenantCompanySettings(
    context,
    parsed.data.settingsId,
    {
      ...parsed.data,
      actorUserId: context.user.id,
    },
  );

  if (!result) {
    redirect("/forbidden");
  }

  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?saved=company");
}

export async function updateQuoteNumberSettingsAction(formData: FormData) {
  const context = await requireTenant();

  if (!canManageQuoteNumbering(context.membership)) {
    redirect("/forbidden");
  }

  const parsed = quoteNumberSettingsSchema.safeParse({
    settingsId: formText(formData, "settingsId"),
    prefix: formText(formData, "prefix"),
    nextNumber: formText(formData, "nextNumber"),
    datePattern: formText(formData, "datePattern"),
  });

  if (!parsed.success) {
    redirect("/dashboard/settings?error=numbering");
  }

  const result = await updateTenantQuoteNumberSettings(
    context,
    parsed.data.settingsId,
    {
      prefix: parsed.data.prefix,
      nextNumber: parsed.data.nextNumber,
      datePattern: parsed.data.datePattern,
      actorUserId: context.user.id,
    },
  );

  if (!result) {
    redirect("/forbidden");
  }

  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?saved=numbering");
}

export async function updateUserPreferencesAction(formData: FormData) {
  const context = await requireTenant();
  const templateValue = formText(formData, "defaultPdfTemplate");
  const dashboardShortcuts = formData
    .getAll("dashboardShortcuts")
    .flatMap((value) => (typeof value === "string" && shortcutValues.includes(value) ? [value] : []));

  await upsertTenantUserPreference(context, {
    userId: context.user.id,
    defaultPdfTemplate: isQuotePdfTemplateKey(templateValue) ? templateValue : null,
    dashboardShortcuts,
    language: "ro",
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  redirect("/dashboard/settings?saved=preferences");
}
