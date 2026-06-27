import { createHash, randomBytes } from "node:crypto";
import {
  TenantMemberStatus,
  TenantRole,
  TenantStatus,
  type TenantInvite,
  type TenantMember,
  type User,
} from "@prisma/client";
import { logger } from "../logging/safe-logger";
import { prisma } from "../prisma";
import { PermissionDeniedError } from "./errors";
import { canManageUsers } from "./permissions";
import type { TenantContext } from "./tenant-context";

export type TenantInviteErrorCode =
  | "invalid"
  | "expired"
  | "revoked"
  | "used"
  | "disabled_membership"
  | "unsupported_role";

export class TenantInviteError extends Error {
  readonly code: TenantInviteErrorCode;

  constructor(code: TenantInviteErrorCode, message = "Tenant invite is not valid.") {
    super(message);
    this.name = "TenantInviteError";
    this.code = code;
    Object.setPrototypeOf(this, TenantInviteError.prototype);
  }
}

export type TenantInviteActorContext = TenantContext & {
  user: {
    id: string;
  };
};

export type CreateTenantInviteInput = {
  email: string;
  role: TenantRole;
  expiresInDays?: number;
};

export type CreateTenantInviteResult = {
  invite: TenantInvite;
  rawToken: string;
};

export type AcceptTenantInviteInput = {
  email: string;
  tenantId: string;
  token: string;
};

export type AcceptTenantInviteResult = {
  membership: TenantMember;
  tenantId: string;
  user: User;
};

type TenantInviteWithTenant = TenantInvite & {
  tenant: {
    status: TenantStatus;
  };
};

type InviteClient = {
  tenantInvite: {
    create(args: { data: Record<string, unknown> }): Promise<TenantInvite>;
    findFirst(args: {
      where: Record<string, unknown>;
      include?: Record<string, unknown>;
    }): Promise<TenantInviteWithTenant | null>;
    findMany(args: {
      where: Record<string, unknown>;
      orderBy?: Array<Record<string, "asc" | "desc">>;
    }): Promise<TenantInvite[]>;
    updateMany(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }): Promise<{ count: number }>;
  };
  tenantMember: {
    create(args: { data: Record<string, unknown> }): Promise<TenantMember>;
    findUnique(args: {
      where: { tenantId_userId: { tenantId: string; userId: string } };
    }): Promise<TenantMember | null>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<TenantMember>;
  };
  user: {
    create(args: { data: Record<string, unknown> }): Promise<User>;
    findUnique(args: { where: { email: string } }): Promise<User | null>;
  };
  $transaction?: <TResult>(
    operation: (transactionClient: InviteClient) => Promise<TResult>,
  ) => Promise<TResult>;
};

const defaultInviteExpiryDays = 7;
const allowedInviteRoles = new Set<TenantRole>([
  TenantRole.OWNER,
  TenantRole.ADMIN,
  TenantRole.ESTIMATOR,
  TenantRole.DEALER,
]);

export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isSupportedInviteRole(role: TenantRole) {
  return allowedInviteRoles.has(role);
}

export function createInviteToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token.trim(), "utf8").digest("hex");
}

export function buildInviteAcceptPath(tenantId: string, rawToken: string) {
  const params = new URLSearchParams({
    tenantId,
    inviteToken: rawToken,
  });

  return `/login?${params.toString()}`;
}

export async function listTenantInvites(
  context: TenantInviteActorContext,
  client: InviteClient = prisma as unknown as InviteClient,
) {
  if (!canManageUsers(context.membership)) {
    throw new PermissionDeniedError("Only tenant owners can list invites.");
  }

  return client.tenantInvite.findMany({
    where: { tenantId: context.tenant.id },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function createTenantInvite(
  context: TenantInviteActorContext,
  input: CreateTenantInviteInput,
  client: InviteClient = prisma as unknown as InviteClient,
  now: Date = new Date(),
): Promise<CreateTenantInviteResult> {
  if (!canManageUsers(context.membership)) {
    throw new PermissionDeniedError("Only tenant owners can create invites.");
  }

  if (!isSupportedInviteRole(input.role)) {
    throw new TenantInviteError("unsupported_role", "Invite role is not supported.");
  }

  const email = normalizeInviteEmail(input.email);

  if (!looksLikeEmail(email)) {
    throw new TenantInviteError("invalid", "Invite email is not valid.");
  }

  const rawToken = createInviteToken();
  const tokenHash = hashInviteToken(rawToken);
  const expiresAt = new Date(
    now.getTime() + inviteExpiryDays(input.expiresInDays) * 24 * 60 * 60 * 1000,
  );
  const invite = await client.tenantInvite.create({
    data: {
      tenantId: context.tenant.id,
      email,
      role: input.role,
      tokenHash,
      expiresAt,
      acceptedAt: null,
      acceptedById: null,
      revokedAt: null,
      createdById: context.user.id,
    },
  });

  logger.info("auth.invite.created", {
    tenantId: context.tenant.id,
    inviteId: invite.id,
    role: invite.role,
    delivery: "stub_manual",
  });

  return {
    invite,
    rawToken,
  };
}

export async function acceptTenantInvite(
  input: AcceptTenantInviteInput,
  client: InviteClient = prisma as unknown as InviteClient,
  now: Date = new Date(),
): Promise<AcceptTenantInviteResult> {
  const email = normalizeInviteEmail(input.email);
  const tenantId = input.tenantId.trim();
  const token = input.token.trim();

  if (!tenantId || !token || !looksLikeEmail(email)) {
    throw new TenantInviteError("invalid");
  }

  const invite = await client.tenantInvite.findFirst({
    where: {
      tenantId,
      tokenHash: hashInviteToken(token),
    },
    include: {
      tenant: {
        select: {
          status: true,
        },
      },
    },
  });

  validateInviteForAcceptance(invite, email, now);

  return runInviteTransaction(client, async (transactionClient) => {
    const user = await findOrCreateInviteUser(transactionClient, email, now);
    const existingMembership = await transactionClient.tenantMember.findUnique({
      where: {
        tenantId_userId: {
          tenantId: invite.tenantId,
          userId: user.id,
        },
      },
    });

    if (existingMembership?.status === TenantMemberStatus.DISABLED) {
      throw new TenantInviteError("disabled_membership");
    }

    const acceptedInvite = await transactionClient.tenantInvite.updateMany({
      where: {
        id: invite.id,
        tenantId: invite.tenantId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      data: {
        acceptedAt: now,
        acceptedById: user.id,
      },
    });

    if (acceptedInvite.count !== 1) {
      throw new TenantInviteError("used");
    }

    const membership = existingMembership
      ? await transactionClient.tenantMember.update({
          where: { id: existingMembership.id },
          data: {
            role: invite.role,
            status: TenantMemberStatus.ACTIVE,
            invitedAt: existingMembership.invitedAt ?? invite.createdAt,
            joinedAt: now,
          },
        })
      : await transactionClient.tenantMember.create({
          data: {
            tenantId: invite.tenantId,
            userId: user.id,
            role: invite.role,
            status: TenantMemberStatus.ACTIVE,
            canViewInternalCosts: false,
            canApplyCommercialOverrides: false,
            invitedAt: invite.createdAt,
            joinedAt: now,
          },
        });

    logger.info("auth.invite.accepted", {
      tenantId: invite.tenantId,
      inviteId: invite.id,
      userId: user.id,
      role: invite.role,
    });

    return {
      membership,
      tenantId: invite.tenantId,
      user,
    };
  });
}

function validateInviteForAcceptance(
  invite: TenantInviteWithTenant | null,
  email: string,
  now: Date,
): asserts invite is TenantInviteWithTenant {
  if (!invite || invite.tenant.status !== TenantStatus.ACTIVE || invite.email !== email) {
    throw new TenantInviteError("invalid");
  }

  if (!isSupportedInviteRole(invite.role)) {
    throw new TenantInviteError("unsupported_role");
  }

  if (invite.revokedAt) {
    throw new TenantInviteError("revoked");
  }

  if (invite.acceptedAt) {
    throw new TenantInviteError("used");
  }

  if (invite.expiresAt <= now) {
    throw new TenantInviteError("expired");
  }
}

async function findOrCreateInviteUser(client: InviteClient, email: string, now: Date) {
  const existingUser = await client.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return existingUser;
  }

  return client.user.create({
    data: {
      email,
      displayName: displayNameFromEmail(email),
      authProvider: "invite-link",
      authProviderSubject: email,
      createdAt: now,
      updatedAt: now,
    },
  });
}

function displayNameFromEmail(email: string) {
  const localPart = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();

  return localPart || "Utilizator invitat";
}

function inviteExpiryDays(value: number | undefined) {
  if (!value || !Number.isFinite(value)) {
    return defaultInviteExpiryDays;
  }

  return Math.min(30, Math.max(1, Math.trunc(value)));
}

function looksLikeEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function runInviteTransaction<TResult>(
  client: InviteClient,
  operation: (transactionClient: InviteClient) => Promise<TResult>,
) {
  if (client.$transaction) {
    return client.$transaction(operation);
  }

  return operation(client);
}
