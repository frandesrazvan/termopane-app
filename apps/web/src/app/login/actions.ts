"use server";

import { TenantMemberStatus, TenantStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import { devLoginEnabled } from "@/lib/env/runtime";
import { logger } from "@/lib/logging/safe-logger";

export async function loginAction(formData: FormData) {
  if (!devLoginEnabled()) {
    logger.warn("auth.dev_login.blocked", {
      production: process.env.NODE_ENV === "production",
      reason: "disabled",
    });
    redirect("/login?error=disabled");
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email.endsWith("@example.test")) {
    logger.warn("auth.dev_login.rejected", { reason: "unsupported_domain" });
    redirect("/login?error=invalid");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      memberships: {
        where: {
          status: TenantMemberStatus.ACTIVE,
          tenant: {
            status: TenantStatus.ACTIVE,
          },
        },
        select: {
          tenantId: true,
        },
        orderBy: [{ joinedAt: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!user || user.memberships.length === 0) {
    logger.warn("auth.dev_login.rejected", { reason: "missing_membership" });
    redirect("/login?error=membership");
  }

  await setSessionCookie({
    userId: user.id,
    email: user.email,
    tenantId: user.memberships[0]?.tenantId,
  });

  redirect("/dashboard");
}
