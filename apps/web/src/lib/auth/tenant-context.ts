import { TenantMemberStatus, TenantStatus, type TenantRole } from "@prisma/client";
import { prisma } from "../prisma";

export type TenantMembershipRecord = {
  id: string;
  tenantId: string;
  userId: string;
  role: TenantRole;
  status: TenantMemberStatus;
  canViewInternalCosts: boolean;
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: TenantStatus;
  };
};

export type TenantContext = {
  membership: TenantMembershipRecord;
  tenant: TenantMembershipRecord["tenant"];
};

export function resolveTenantMembership(
  memberships: TenantMembershipRecord[],
  requestedTenantId?: string | null,
) {
  const activeMemberships = memberships.filter(
    (membership) =>
      membership.status === TenantMemberStatus.ACTIVE &&
      membership.tenant.status === TenantStatus.ACTIVE,
  );

  if (requestedTenantId) {
    return activeMemberships.find((membership) => membership.tenantId === requestedTenantId) ?? null;
  }

  return activeMemberships[0] ?? null;
}

export async function listTenantMemberships(userId: string): Promise<TenantMembershipRecord[]> {
  return prisma.tenantMember.findMany({
    where: {
      userId,
      status: TenantMemberStatus.ACTIVE,
      tenant: {
        status: TenantStatus.ACTIVE,
      },
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      },
    },
    orderBy: [{ joinedAt: "asc" }, { createdAt: "asc" }],
  });
}

export async function getTenantMembership(
  userId: string,
  tenantId: string,
): Promise<TenantMembershipRecord | null> {
  return prisma.tenantMember.findFirst({
    where: {
      userId,
      tenantId,
      status: TenantMemberStatus.ACTIVE,
      tenant: {
        status: TenantStatus.ACTIVE,
      },
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      },
    },
  });
}

export async function resolveCurrentTenant(
  userId: string,
  requestedTenantId?: string | null,
): Promise<TenantContext | null> {
  const memberships = await listTenantMemberships(userId);
  const membership = resolveTenantMembership(memberships, requestedTenantId);

  if (!membership) {
    return null;
  }

  return {
    membership,
    tenant: membership.tenant,
  };
}
