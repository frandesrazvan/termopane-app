"use server";

import { TenantMemberStatus, TenantStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";

function devLoginEnabled() {
  return process.env.AUTH_DEV_LOGIN_ENABLED === "true";
}

export async function loginAction(formData: FormData) {
  if (!devLoginEnabled()) {
    redirect("/login?error=disabled");
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email.endsWith("@example.test")) {
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
    redirect("/login?error=membership");
  }

  await setSessionCookie({
    userId: user.id,
    email: user.email,
    tenantId: user.memberships[0]?.tenantId,
  });

  redirect("/dashboard");
}
