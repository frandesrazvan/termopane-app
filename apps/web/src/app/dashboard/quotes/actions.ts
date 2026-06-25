"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenant } from "@/lib/auth";
import { createTenantQuoteDraft, QuoteNumberCollisionError } from "@/lib/data";

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => (value.length > 0 ? value : null));

const quoteSchema = z.object({
  customerId: z.string().trim().min(1),
  projectId: optionalText(120),
  title: optionalText(160),
});

function formText(formData: FormData, field: string) {
  const value = formData.get(field);

  return typeof value === "string" ? value : "";
}

export async function createQuoteAction(formData: FormData) {
  const context = await requireTenant();
  const parsed = quoteSchema.safeParse({
    customerId: formText(formData, "customerId"),
    projectId: formText(formData, "projectId"),
    title: formText(formData, "title"),
  });

  if (!parsed.success) {
    redirect("/dashboard/quotes/new?error=validation");
  }

  const result = await createDraftOrRedirectOnNumberCollision(context, parsed.data);

  if (!result) {
    redirect("/forbidden");
  }

  redirect(`/dashboard/quotes/${result.quote.id}`);
}

async function createDraftOrRedirectOnNumberCollision(
  context: Awaited<ReturnType<typeof requireTenant>>,
  data: z.infer<typeof quoteSchema>,
) {
  try {
    return await createTenantQuoteDraft(context, {
      customerId: data.customerId,
      projectId: data.projectId,
      title: data.title,
      createdById: context.user.id,
      assignedToId: context.user.id,
    });
  } catch (error) {
    if (error instanceof QuoteNumberCollisionError) {
      redirect("/dashboard/quotes/new?error=quote-number");
    }

    throw error;
  }
}
