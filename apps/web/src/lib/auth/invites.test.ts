import {
  TenantMemberStatus,
  TenantRole,
  TenantStatus,
  type TenantInvite,
  type TenantMember,
  type User,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import { PermissionDeniedError } from "./errors";
import {
  acceptTenantInvite,
  createTenantInvite,
  hashInviteToken,
  TenantInviteError,
  type TenantInviteActorContext,
} from "./invites";

const now = new Date("2026-06-27T09:00:00.000Z");
type InviteClientArg = NonNullable<Parameters<typeof createTenantInvite>[2]>;
type TestInviteClient = InviteClientArg & {
  state: {
    invites: TenantInvite[];
    memberships: TenantMember[];
    users: User[];
  };
};

describe("tenant invite auth flow", () => {
  it("allows an owner to create an invite while storing only the token hash", async () => {
    const client = testClient();
    const result = await createTenantInvite(
      context(TenantRole.OWNER),
      {
        email: "Pilot.User@Example.Test",
        role: TenantRole.ESTIMATOR,
      },
      client,
      now,
    );
    const [storedInvite] = client.state.invites;

    expect(storedInvite).toMatchObject({
      tenantId: "tenant-a",
      email: "pilot.user@example.test",
      role: TenantRole.ESTIMATOR,
      createdById: "owner-user",
    });
    expect(storedInvite?.tokenHash).toBe(hashInviteToken(result.rawToken));
    expect(storedInvite?.tokenHash).not.toContain(result.rawToken);
  });

  it("rejects invite creation for unauthorized tenant roles", async () => {
    await expect(
      createTenantInvite(
        context(TenantRole.ESTIMATOR),
        {
          email: "pilot@example.test",
          role: TenantRole.DEALER,
        },
        testClient(),
        now,
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("rejects expired revoked and already used invite tokens", async () => {
    const client = testClient({
      invites: [
        inviteRecord("expired-token", {
          id: "expired",
          expiresAt: new Date("2026-06-26T09:00:00.000Z"),
        }),
        inviteRecord("revoked-token", {
          id: "revoked",
          revokedAt: new Date("2026-06-27T08:00:00.000Z"),
        }),
        inviteRecord("used-token", {
          id: "used",
          acceptedAt: new Date("2026-06-27T08:30:00.000Z"),
        }),
      ],
    });

    await expect(
      acceptTenantInvite(
        { email: "pilot@example.test", tenantId: "tenant-a", token: "expired-token" },
        client,
        now,
      ),
    ).rejects.toMatchObject({ code: "expired" });
    await expect(
      acceptTenantInvite(
        { email: "pilot@example.test", tenantId: "tenant-a", token: "revoked-token" },
        client,
        now,
      ),
    ).rejects.toMatchObject({ code: "revoked" });
    await expect(
      acceptTenantInvite(
        { email: "pilot@example.test", tenantId: "tenant-a", token: "used-token" },
        client,
        now,
      ),
    ).rejects.toMatchObject({ code: "used" });
  });

  it("accepts an invite by creating an active membership in the invited tenant", async () => {
    const client = testClient({
      invites: [inviteRecord("valid-token", { role: TenantRole.ADMIN })],
    });
    const result = await acceptTenantInvite(
      { email: "pilot@example.test", tenantId: "tenant-a", token: "valid-token" },
      client,
      now,
    );

    expect(result.user).toMatchObject({
      email: "pilot@example.test",
      authProvider: "invite-link",
    });
    expect(result.membership).toMatchObject({
      tenantId: "tenant-a",
      userId: result.user.id,
      role: TenantRole.ADMIN,
      status: TenantMemberStatus.ACTIVE,
      joinedAt: now,
    });
    expect(client.state.invites[0]).toMatchObject({
      acceptedAt: now,
      acceptedById: result.user.id,
    });
  });

  it("rejects cross-tenant invite acceptance", async () => {
    const client = testClient({
      invites: [inviteRecord("valid-token")],
    });

    await expect(
      acceptTenantInvite(
        { email: "pilot@example.test", tenantId: "tenant-b", token: "valid-token" },
        client,
        now,
      ),
    ).rejects.toBeInstanceOf(TenantInviteError);
    expect(client.state.memberships).toHaveLength(0);
  });

  it("does not reactivate a disabled membership through invite acceptance", async () => {
    const client = testClient({
      invites: [inviteRecord("valid-token")],
      users: [userRecord("disabled-user", "pilot@example.test")],
      memberships: [
        membershipRecord("disabled-member", {
          status: TenantMemberStatus.DISABLED,
          userId: "disabled-user",
        }),
      ],
    });

    await expect(
      acceptTenantInvite(
        { email: "pilot@example.test", tenantId: "tenant-a", token: "valid-token" },
        client,
        now,
      ),
    ).rejects.toMatchObject({ code: "disabled_membership" });
    expect(client.state.memberships[0]?.status).toBe(TenantMemberStatus.DISABLED);
  });
});

function context(role: TenantRole): TenantInviteActorContext {
  return {
    user: {
      id: "owner-user",
    },
    tenant: {
      id: "tenant-a",
      name: "Tenant A",
      slug: "tenant-a",
      status: TenantStatus.ACTIVE,
    },
    membership: {
      id: `${role.toLowerCase()}-membership`,
      tenantId: "tenant-a",
      userId: "owner-user",
      role,
      status: TenantMemberStatus.ACTIVE,
      canViewInternalCosts: role === TenantRole.OWNER,
      canApplyCommercialOverrides: false,
      tenant: {
        id: "tenant-a",
        name: "Tenant A",
        slug: "tenant-a",
        status: TenantStatus.ACTIVE,
      },
    },
  };
}

function inviteRecord(rawToken: string, overrides: Partial<TenantInvite> = {}): TenantInvite {
  return {
    id: "invite-a",
    tenantId: "tenant-a",
    email: "pilot@example.test",
    role: TenantRole.ESTIMATOR,
    tokenHash: hashInviteToken(rawToken),
    expiresAt: new Date("2026-06-28T09:00:00.000Z"),
    acceptedAt: null,
    acceptedById: null,
    revokedAt: null,
    createdById: "owner-user",
    createdAt: new Date("2026-06-27T08:00:00.000Z"),
    updatedAt: new Date("2026-06-27T08:00:00.000Z"),
    ...overrides,
  };
}

function userRecord(id: string, email: string): User {
  return {
    id,
    email,
    displayName: "Pilot User",
    authProvider: "invite-link",
    authProviderSubject: email,
    createdAt: now,
    updatedAt: now,
  };
}

function membershipRecord(id: string, overrides: Partial<TenantMember> = {}): TenantMember {
  return {
    id,
    tenantId: "tenant-a",
    userId: "pilot-user",
    role: TenantRole.ESTIMATOR,
    status: TenantMemberStatus.ACTIVE,
    canViewInternalCosts: false,
    canApplyCommercialOverrides: false,
    createdAt: now,
    updatedAt: now,
    invitedAt: now,
    joinedAt: now,
    ...overrides,
  };
}

function testClient(
  initial: {
    invites?: TenantInvite[];
    memberships?: TenantMember[];
    users?: User[];
  } = {},
) {
  const state = {
    invites: [...(initial.invites ?? [])],
    memberships: [...(initial.memberships ?? [])],
    users: [...(initial.users ?? [])],
  };
  const client = {} as TestInviteClient;

  Object.assign(client, {
    state,
    tenantInvite: {
      async create({ data }: { data: Record<string, unknown> }) {
        const record = {
          id: `invite-${state.invites.length + 1}`,
          acceptedAt: null,
          acceptedById: null,
          revokedAt: null,
          createdAt: now,
          updatedAt: now,
          ...data,
        } as TenantInvite;

        state.invites.push(record);

        return record;
      },
      async findFirst({ where }: { where: Record<string, unknown> }) {
        const invite = state.invites.find((record) => matchesWhere(record, where));

        return invite
          ? {
              ...invite,
              tenant: {
                status: TenantStatus.ACTIVE,
              },
            }
          : null;
      },
      async findMany({ where }: { where: Record<string, unknown> }) {
        return state.invites.filter((record) => matchesWhere(record, where));
      },
      async updateMany({
        data,
        where,
      }: {
        data: Record<string, unknown>;
        where: Record<string, unknown>;
      }) {
        const matching = state.invites.filter((record) => matchesWhere(record, where));

        for (const record of matching) {
          Object.assign(record, data);
        }

        return { count: matching.length };
      },
    },
    tenantMember: {
      async create({ data }: { data: Record<string, unknown> }) {
        const record = {
          id: `member-${state.memberships.length + 1}`,
          createdAt: now,
          updatedAt: now,
          ...data,
        } as TenantMember;

        state.memberships.push(record);

        return record;
      },
      async findUnique({
        where,
      }: {
        where: { tenantId_userId: { tenantId: string; userId: string } };
      }) {
        return (
          state.memberships.find(
            (record) =>
              record.tenantId === where.tenantId_userId.tenantId &&
              record.userId === where.tenantId_userId.userId,
          ) ?? null
        );
      },
      async update({
        data,
        where,
      }: {
        data: Record<string, unknown>;
        where: { id: string };
      }) {
        const membership = state.memberships.find((record) => record.id === where.id);

        if (!membership) {
          throw new Error("Membership not found.");
        }

        Object.assign(membership, data);

        return membership;
      },
    },
    user: {
      async create({ data }: { data: Record<string, unknown> }) {
        const record = {
          id: `user-${state.users.length + 1}`,
          ...data,
        } as User;

        state.users.push(record);

        return record;
      },
      async findUnique({ where }: { where: { email: string } }) {
        return state.users.find((record) => record.email === where.email) ?? null;
      },
    },
    async $transaction<TResult>(operation: (transactionClient: typeof client) => Promise<TResult>) {
      return operation(client);
    },
  });

  return client;
}

function matchesWhere(record: Record<string, unknown>, where: Record<string, unknown>) {
  return Object.entries(where).every(([key, value]) => {
    const recordValue = record[key];

    if (value === null) {
      return recordValue === null;
    }

    if (value instanceof Date) {
      return recordValue instanceof Date && recordValue.getTime() === value.getTime();
    }

    if (value && typeof value === "object" && "gt" in value) {
      const gt = value.gt;

      return recordValue instanceof Date && gt instanceof Date && recordValue > gt;
    }

    return recordValue === value;
  });
}
