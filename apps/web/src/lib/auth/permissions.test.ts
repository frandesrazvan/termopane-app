import { TenantMemberStatus, TenantRole, TenantStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  canApplyCommercialOverrides,
  canGeneratePdf,
  canManageCatalog,
  canManageUsers,
  canViewInternalCosts,
} from "./permissions";
import { resolveTenantMembership, type TenantMembershipRecord } from "./tenant-context";

function membership(
  role: TenantRole,
  overrides: Partial<TenantMembershipRecord> = {},
): TenantMembershipRecord {
  return {
    id: `${role.toLowerCase()}-membership`,
    tenantId: "tenant-a",
    userId: "user-a",
    role,
    status: TenantMemberStatus.ACTIVE,
    canViewInternalCosts: false,
    canApplyCommercialOverrides: false,
    tenant: {
      id: "tenant-a",
      name: "Tenant A",
      slug: "tenant-a",
      status: TenantStatus.ACTIVE,
    },
    ...overrides,
  };
}

describe("tenant permission helpers", () => {
  it("does not resolve a tenant context without an active membership", () => {
    const memberships = [
      membership(TenantRole.OWNER, {
        tenantId: "tenant-a",
        tenant: {
          id: "tenant-a",
          name: "Tenant A",
          slug: "tenant-a",
          status: TenantStatus.ACTIVE,
        },
      }),
    ];

    expect(resolveTenantMembership(memberships, "tenant-b")).toBeNull();
  });

  it("does not let dealer users view internal costs by default", () => {
    const dealer = membership(TenantRole.DEALER);

    expect(canViewInternalCosts(dealer)).toBe(false);
    expect(canGeneratePdf(dealer)).toBe(true);
    expect(canManageCatalog(dealer)).toBe(false);
    expect(canApplyCommercialOverrides(dealer)).toBe(false);
  });

  it("allows explicit internal-cost visibility for restricted users", () => {
    const dealer = membership(TenantRole.DEALER, {
      canViewInternalCosts: true,
    });

    expect(canViewInternalCosts(dealer)).toBe(true);
  });

  it("allows owner and admin users to access tenant admin capabilities", () => {
    const owner = membership(TenantRole.OWNER);
    const admin = membership(TenantRole.ADMIN);

    expect(canViewInternalCosts(owner)).toBe(true);
    expect(canManageCatalog(owner)).toBe(true);
    expect(canManageUsers(owner)).toBe(true);
    expect(canGeneratePdf(owner)).toBe(true);
    expect(canApplyCommercialOverrides(owner)).toBe(true);

    expect(canViewInternalCosts(admin)).toBe(true);
    expect(canManageCatalog(admin)).toBe(true);
    expect(canManageUsers(admin)).toBe(false);
    expect(canGeneratePdf(admin)).toBe(true);
    expect(canApplyCommercialOverrides(admin)).toBe(true);
  });

  it("allows estimator commercial overrides only with explicit permission", () => {
    const estimator = membership(TenantRole.ESTIMATOR);
    const permittedEstimator = membership(TenantRole.ESTIMATOR, {
      canApplyCommercialOverrides: true,
    });

    expect(canApplyCommercialOverrides(estimator)).toBe(false);
    expect(canApplyCommercialOverrides(permittedEstimator)).toBe(true);
  });

  it("does not grant permissions to disabled memberships", () => {
    const owner = membership(TenantRole.OWNER, {
      status: TenantMemberStatus.DISABLED,
    });

    expect(canViewInternalCosts(owner)).toBe(false);
    expect(canManageCatalog(owner)).toBe(false);
    expect(canManageUsers(owner)).toBe(false);
    expect(canGeneratePdf(owner)).toBe(false);
    expect(canApplyCommercialOverrides(owner)).toBe(false);
  });
});
