"use server";

import { redirect } from "next/navigation";
import { requireUser, getTenantMembership, setSessionCookie } from "@/lib/auth";

export async function switchTenantAction(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId") ?? "");
  const membership = await getTenantMembership(user.id, tenantId);

  if (!membership) {
    redirect("/forbidden");
  }

  await setSessionCookie({
    userId: user.id,
    email: user.email,
    tenantId: membership.tenantId,
  });

  redirect("/dashboard");
}
