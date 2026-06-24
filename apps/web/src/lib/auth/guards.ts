import { TenantRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "./session";
import { resolveCurrentTenant, type TenantContext } from "./tenant-context";

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
};

export async function requireUser(): Promise<CurrentUser> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireTenant(requestedTenantId?: string | null): Promise<
  TenantContext & {
    user: CurrentUser;
  }
> {
  const user = await requireUser();
  const session = await getSession();
  const tenantContext = await resolveCurrentTenant(
    user.id,
    requestedTenantId ?? session?.tenantId,
  );

  if (!tenantContext) {
    redirect("/forbidden");
  }

  return {
    ...tenantContext,
    user,
  };
}

export async function requireTenantRole(
  roles: TenantRole[],
  requestedTenantId?: string | null,
) {
  const context = await requireTenant(requestedTenantId);

  if (!roles.includes(context.membership.role)) {
    redirect("/forbidden");
  }

  return context;
}
