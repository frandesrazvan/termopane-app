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

type CreateArgs = {
  data: Record<string, unknown>;
};

type UpdateArgs = {
  where: {
    id: string;
  };
  data: Record<string, unknown>;
};

type TenantModelDelegate<TRecord> = {
  findFirst(args: FindFirstArgs): Promise<TRecord | null>;
  findMany(args: FindManyArgs): Promise<TRecord[]>;
};

type TenantWritableModelDelegate<TRecord> = TenantModelDelegate<TRecord> & {
  create(args: CreateArgs): Promise<TRecord>;
  update(args: UpdateArgs): Promise<TRecord>;
};

export type TenantDataClient = {
  customer: TenantWritableModelDelegate<Customer>;
  project: TenantWritableModelDelegate<Project>;
  quote: TenantModelDelegate<Quote>;
  quoteVersion: TenantModelDelegate<QuoteVersion>;
};

export type TenantCustomerWriteInput = {
  displayName: string;
  companyName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  taxIdentifier?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  country?: string | null;
  notes?: string | null;
};

export type TenantProjectWriteInput = {
  customerId: string;
  name: string;
  siteAddress?: string | null;
  notes?: string | null;
};

export type TenantProjectUpdateInput = {
  customerId?: string;
  name: string;
  siteAddress?: string | null;
  notes?: string | null;
};

export type ListTenantCustomersOptions = {
  search?: string | null;
};

export type ListTenantProjectsOptions = {
  customerId?: string;
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

function customerSearchWhere(search: string) {
  return {
    OR: ["displayName", "companyName", "contactName", "email", "phone"].map((field) => ({
      [field]: {
        contains: search,
        mode: "insensitive",
      },
    })),
  };
}

export function createTenantDataAccess(
  client: TenantDataClient = prisma as unknown as TenantDataClient,
) {
  const access = {
    getTenantCustomer(scope: TenantDataScope, customerId: string) {
      return client.customer.findFirst({
        where: tenantWhere(scope, { id: customerId }),
      });
    },

    listTenantCustomers(scope: TenantDataScope, options: ListTenantCustomersOptions = {}) {
      const search = options.search?.trim();

      return client.customer.findMany({
        where: tenantWhere(scope, search ? customerSearchWhere(search) : undefined),
        orderBy: [{ displayName: "asc" }, { createdAt: "desc" }],
      });
    },

    createTenantCustomer(scope: TenantDataScope, data: TenantCustomerWriteInput) {
      return client.customer.create({
        data: {
          ...data,
          tenantId: tenantIdFromScope(scope),
        },
      });
    },

    async updateTenantCustomer(
      scope: TenantDataScope,
      customerId: string,
      data: TenantCustomerWriteInput,
    ) {
      const existingCustomer = await access.getTenantCustomer(scope, customerId);

      if (!existingCustomer) {
        return null;
      }

      return client.customer.update({
        where: { id: customerId },
        data,
      });
    },

    getTenantProject(scope: TenantDataScope, projectId: string) {
      return client.project.findFirst({
        where: tenantWhere(scope, { id: projectId }),
      });
    },

    listTenantProjects(scope: TenantDataScope, options: ListTenantProjectsOptions = {}) {
      return client.project.findMany({
        where: tenantWhere(scope, options.customerId ? { customerId: options.customerId } : undefined),
        orderBy: [{ createdAt: "desc" }],
      });
    },

    async createTenantProject(scope: TenantDataScope, data: TenantProjectWriteInput) {
      const customer = await access.getTenantCustomer(scope, data.customerId);

      if (!customer) {
        return null;
      }

      return client.project.create({
        data: {
          ...data,
          tenantId: tenantIdFromScope(scope),
        },
      });
    },

    async updateTenantProject(
      scope: TenantDataScope,
      projectId: string,
      data: TenantProjectUpdateInput,
    ) {
      const existingProject = await access.getTenantProject(scope, projectId);

      if (!existingProject) {
        return null;
      }

      if (data.customerId) {
        const customer = await access.getTenantCustomer(scope, data.customerId);

        if (!customer) {
          return null;
        }
      }

      return client.project.update({
        where: { id: projectId },
        data,
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

  return access;
}

const tenantDataAccess = createTenantDataAccess();

export function getTenantCustomer(scope: TenantDataScope, customerId: string) {
  return tenantDataAccess.getTenantCustomer(scope, customerId);
}

export function listTenantCustomers(
  scope: TenantDataScope,
  options?: ListTenantCustomersOptions,
) {
  return tenantDataAccess.listTenantCustomers(scope, options);
}

export function createTenantCustomer(scope: TenantDataScope, data: TenantCustomerWriteInput) {
  return tenantDataAccess.createTenantCustomer(scope, data);
}

export function updateTenantCustomer(
  scope: TenantDataScope,
  customerId: string,
  data: TenantCustomerWriteInput,
) {
  return tenantDataAccess.updateTenantCustomer(scope, customerId, data);
}

export function getTenantProject(scope: TenantDataScope, projectId: string) {
  return tenantDataAccess.getTenantProject(scope, projectId);
}

export function listTenantProjects(scope: TenantDataScope, options?: ListTenantProjectsOptions) {
  return tenantDataAccess.listTenantProjects(scope, options);
}

export function createTenantProject(scope: TenantDataScope, data: TenantProjectWriteInput) {
  return tenantDataAccess.createTenantProject(scope, data);
}

export function updateTenantProject(
  scope: TenantDataScope,
  projectId: string,
  data: TenantProjectUpdateInput,
) {
  return tenantDataAccess.updateTenantProject(scope, projectId, data);
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
