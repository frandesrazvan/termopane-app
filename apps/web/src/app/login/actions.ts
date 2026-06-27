"use server";

import { TenantMemberStatus, TenantStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { acceptTenantInvite, setSessionCookie, TenantInviteError } from "@/lib/auth";
import { isSyntheticDevLoginEmail, normalizeAuthEmail } from "@/lib/auth/dev-login";
import { devLoginEnabled } from "@/lib/env/runtime";
import { logger } from "@/lib/logging/safe-logger";
import { prisma } from "@/lib/prisma";

const inviteLoginSchema = z.object({
  email: z.string().trim().email(),
  inviteToken: z.string().trim().min(20).max(200),
  tenantId: z.string().trim().min(1).max(191),
});

export async function loginAction(formData: FormData) {
  if (!devLoginEnabled()) {
    logger.warn("auth.dev_login.blocked", {
      production: process.env.NODE_ENV === "production",
      reason: "disabled",
    });
    redirect("/login?error=disabled");
  }

  const email = normalizeAuthEmail(String(formData.get("email") ?? ""));

  if (!isSyntheticDevLoginEmail(email)) {
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

export async function acceptInviteLoginAction(formData: FormData) {
  const parsed = inviteLoginSchema.safeParse({
    email: formText(formData, "email"),
    inviteToken: formText(formData, "inviteToken"),
    tenantId: formText(formData, "tenantId"),
  });

  if (!parsed.success) {
    logger.warn("auth.invite_login.rejected", { reason: "invalid_input" });
    redirect("/login?error=invite");
  }

  let result;

  try {
    result = await acceptTenantInvite({
      email: parsed.data.email,
      tenantId: parsed.data.tenantId,
      token: parsed.data.inviteToken,
    });
  } catch (error) {
    logger.warn("auth.invite_login.rejected", {
      reason: error instanceof TenantInviteError ? error.code : "unknown",
    });
    redirect("/login?error=invite");
  }

  await setSessionCookie({
    userId: result.user.id,
    email: result.user.email,
    tenantId: result.tenantId,
  });

  redirect("/dashboard");
}

function formText(formData: FormData, field: string) {
  const value = formData.get(field);

  return typeof value === "string" ? value : "";
}
