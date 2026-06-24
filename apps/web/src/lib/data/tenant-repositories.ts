import type { Customer, Project, Quote, QuoteVersion } from "@prisma/client";
import type { TenantContext } from "../auth/tenant-context";
import { prisma } from "../prisma";

export type ExplicitTenantScope = {
  tenantId: string;
};

export type TenantDataScope = ExplicitTenantScope | Pick<TenantContext, "tenant">;

type FindFirstArgs = {
  where: Record<string, unknown>;
};

type FindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, "asc" | "desc"> | Array<Record<string, "asc" | "desc">>;
};

type TenantModelDelegate<TRecord> = {
  findFirst(args: FindFirstArgs): Promise<TRecord | null>;
  findMany(args: FindManyArgs): Promise<TRecord[]>;
};

export type TenantDataClient = {
  customer: TenantModelDelegate<Customer>;
  project: TenantModelDelegate<Project>;
  quote: TenantModelDelegate<Quote>;
  quoteVersion: TenantModelDelegate<QuoteVersion>;
};

export function tenantIdFromScope(scope: TenantDataScope) {
  const tenantId = "tenantId" in scope ? scope.tenantId : scope.tenant.id;

  if (!tenantId) {
    throw new Error("Tenant-scoped data access requires a tenantId.");
  }

  return tenantId;
}

function tenantWhere(scope: TenantDataScope, where: Record<string, unknown> = {}) {
  return {
    ...where,
    tenantId: tenantIdFromScope(scope),
  };
}

export function createTenantDataAccess(
  client: TenantDataClient = prisma as unknown as TenantDataClient,
) {
  return {
    getTenantCustomer(scope: TenantDataScope, customerId: string) {
      return client.customer.findFirst({
        where: tenantWhere(scope, { id: customerId }),
      });
    },

    listTenantCustomers(scope: TenantDataScope) {
      return client.customer.findMany({
        where: tenantWhere(scope),
        orderBy: [{ displayName: "asc" }, { createdAt: "desc" }],
      });
    },

    getTenantProject(scope: TenantDataScope, projectId: string) {
      return client.project.findFirst({
        where: tenantWhere(scope, { id: projectId }),
      });
    },

    listTenantProjects(scope: TenantDataScope) {
      return client.project.findMany({
        where: tenantWhere(scope),
        orderBy: [{ createdAt: "desc" }],
      });
    },

    getTenantQuote(scope: TenantDataScope, quoteId: string) {
      return client.quote.findFirst({
        where: tenantWhere(scope, { id: quoteId }),
      });
    },

    listTenantQuotes(scope: TenantDataScope) {
      return client.quote.findMany({
        where: tenantWhere(scope),
        orderBy: [{ createdAt: "desc" }],
      });
    },

    getTenantQuoteVersion(scope: TenantDataScope, quoteVersionId: string) {
      return client.quoteVersion.findFirst({
        where: tenantWhere(scope, { id: quoteVersionId }),
      });
    },
  };
}

const tenantDataAccess = createTenantDataAccess();

export function getTenantCustomer(scope: TenantDataScope, customerId: string) {
  return tenantDataAccess.getTenantCustomer(scope, customerId);
}

export function listTenantCustomers(scope: TenantDataScope) {
  return tenantDataAccess.listTenantCustomers(scope);
}

export function getTenantProject(scope: TenantDataScope, projectId: string) {
  return tenantDataAccess.getTenantProject(scope, projectId);
}

export function listTenantProjects(scope: TenantDataScope) {
  return tenantDataAccess.listTenantProjects(scope);
}

export function getTenantQuote(scope: TenantDataScope, quoteId: string) {
  return tenantDataAccess.getTenantQuote(scope, quoteId);
}

export function listTenantQuotes(scope: TenantDataScope) {
  return tenantDataAccess.listTenantQuotes(scope);
}

export function getTenantQuoteVersion(scope: TenantDataScope, quoteVersionId: string) {
  return tenantDataAccess.getTenantQuoteVersion(scope, quoteVersionId);
}
