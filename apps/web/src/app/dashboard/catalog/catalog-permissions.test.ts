import { TenantMemberStatus, TenantRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { canMutateCatalog } from "./catalog-permissions";

const activeMembership = {
  role: TenantRole.ADMIN,
  status: TenantMemberStatus.ACTIVE,
  canViewInternalCosts: false,
  canApplyCommercialOverrides: false,
};

describe("catalog mutation permissions", () => {
  it("allows only active owner and admin memberships to mutate catalog records", () => {
    expect(canMutateCatalog({ ...activeMembership, role: TenantRole.OWNER })).toBe(true);
    expect(canMutateCatalog({ ...activeMembership, role: TenantRole.ADMIN })).toBe(true);
    expect(canMutateCatalog({ ...activeMembership, role: TenantRole.ESTIMATOR })).toBe(false);
    expect(canMutateCatalog({ ...activeMembership, role: TenantRole.DEALER })).toBe(false);
    expect(
      canMutateCatalog({
        ...activeMembership,
        role: TenantRole.OWNER,
        status: TenantMemberStatus.DISABLED,
      }),
    ).toBe(false);
  });
});

