import { TenantMemberStatus, TenantRole } from "@prisma/client";

export type PermissionMembership = {
  role: TenantRole;
  status: TenantMemberStatus;
  canViewInternalCosts: boolean;
  canApplyCommercialOverrides: boolean;
};

export function isActiveMembership(
  membership: PermissionMembership | null | undefined,
): membership is PermissionMembership {
  return membership?.status === TenantMemberStatus.ACTIVE;
}

export function canViewInternalCosts(
  membership: PermissionMembership | null | undefined,
) {
  if (!isActiveMembership(membership)) {
    return false;
  }

  return (
    membership.role === TenantRole.OWNER ||
    membership.role === TenantRole.ADMIN ||
    membership.canViewInternalCosts
  );
}

export function canManageCatalog(membership: PermissionMembership | null | undefined) {
  if (!isActiveMembership(membership)) {
    return false;
  }

  return membership.role === TenantRole.OWNER || membership.role === TenantRole.ADMIN;
}

export function canManageUsers(membership: PermissionMembership | null | undefined) {
  if (!isActiveMembership(membership)) {
    return false;
  }

  return membership.role === TenantRole.OWNER;
}

export function canApplyCommercialOverrides(
  membership: PermissionMembership | null | undefined,
) {
  if (!isActiveMembership(membership)) {
    return false;
  }

  return (
    membership.role === TenantRole.OWNER ||
    membership.role === TenantRole.ADMIN ||
    (membership.role === TenantRole.ESTIMATOR &&
      membership.canApplyCommercialOverrides)
  );
}

export function canGeneratePdf(membership: PermissionMembership | null | undefined) {
  if (!isActiveMembership(membership)) {
    return false;
  }

  return (
    membership.role === TenantRole.OWNER ||
    membership.role === TenantRole.ADMIN ||
    membership.role === TenantRole.ESTIMATOR ||
    membership.role === TenantRole.DEALER
  );
}
