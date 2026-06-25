import {
  QuoteStatus,
  QuoteVersionStatus,
  type CompanySettings,
  type Customer,
  type Project,
  type Quote,
  type QuoteVersion,
} from "@prisma/client";
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
  quote: TenantWritableModelDelegate<Quote>;
  quoteVersion: TenantWritableModelDelegate<QuoteVersion>;
  companySettings: TenantModelDelegate<CompanySettings>;
  $transaction?: <TResult>(
    operation: (transactionClient: TenantDataClient) => Promise<TResult>,
  ) => Promise<TResult>;
};

export type CreateTenantDataAccessOptions = {
  quoteNumberGenerator?: () => string;
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

export type ListTenantQuotesOptions = {
  customerId?: string | null;
  status?: QuoteStatus | null;
  createdById?: string | null;
  createdFrom?: Date | null;
  createdTo?: Date | null;
};

export type TenantQuoteDraftInput = {
  customerId: string;
  projectId?: string | null;
  title?: string | null;
  currency?: string;
  quoteNumber?: string;
  createdById?: string | null;
  assignedToId?: string | null;
};

export type TenantQuoteDraftResult = {
  quote: Quote;
  currentVersion: QuoteVersion;
};

export class QuoteNumberCollisionError extends Error {
  constructor(message = "Could not create a unique quote number for this tenant.") {
    super(message);
    this.name = "QuoteNumberCollisionError";
    Object.setPrototypeOf(this, QuoteNumberCollisionError.prototype);
  }
}

const GENERATED_QUOTE_NUMBER_MAX_ATTEMPTS = 3;

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

function quoteFilterWhere(options: ListTenantQuotesOptions = {}) {
  const where: Record<string, unknown> = {};

  if (options.customerId) {
    where.customerId = options.customerId;
  }

  if (options.status) {
    where.status = options.status;
  }

  if (options.createdById) {
    where.createdById = options.createdById;
  }

  if (options.createdFrom || options.createdTo) {
    where.createdAt = {
      ...(options.createdFrom ? { gte: options.createdFrom } : {}),
      ...(options.createdTo ? { lte: options.createdTo } : {}),
    };
  }

  return where;
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
  options: CreateTenantDataAccessOptions = {},
) {
  const quoteNumberGenerator = options.quoteNumberGenerator ?? generateQuoteNumber;

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

    listTenantQuotes(scope: TenantDataScope, options: ListTenantQuotesOptions = {}) {
      return client.quote.findMany({
        where: tenantWhere(scope, quoteFilterWhere(options)),
        orderBy: [{ createdAt: "desc" }],
      });
    },

    async createTenantQuoteDraft(
      scope: TenantDataScope,
      data: TenantQuoteDraftInput,
    ): Promise<TenantQuoteDraftResult | null> {
      const tenantId = tenantIdFromScope(scope);
      const customer = await access.getTenantCustomer(scope, data.customerId);

      if (!customer) {
        return null;
      }

      if (data.projectId) {
        const project = await access.getTenantProject(scope, data.projectId);

        if (!project || project.customerId !== customer.id) {
          return null;
        }
      }

      const currency = data.currency ?? "RON";
      const requestedQuoteNumber = data.quoteNumber?.trim() || null;
      const attemptCount = requestedQuoteNumber ? 1 : GENERATED_QUOTE_NUMBER_MAX_ATTEMPTS;

      for (let attempt = 0; attempt < attemptCount; attempt += 1) {
        const quoteNumber = requestedQuoteNumber ?? quoteNumberGenerator();

        try {
          return await runTenantDataTransaction(client, async (transactionClient) => {
            const companySettings = await transactionClient.companySettings.findFirst({
              where: tenantWhere(scope),
            });
            const quote = await transactionClient.quote.create({
              data: {
                tenantId,
                customerId: customer.id,
                projectId: data.projectId ?? null,
                quoteNumber,
                status: QuoteStatus.DRAFT,
                title: data.title ?? null,
                currency,
                createdById: data.createdById ?? null,
                assignedToId: data.assignedToId ?? null,
                tags: ["draft"],
              },
            });
            const currentVersion = await transactionClient.quoteVersion.create({
              data: {
                tenantId,
                quoteId: quote.id,
                versionNumber: 1,
                status: QuoteVersionStatus.DRAFT,
                isLocked: false,
                currency,
                customerSnapshot: customerSnapshot(customer),
                companySettingsSnapshot: companySettingsSnapshot(companySettings),
                itemSnapshot: {
                  items: [],
                },
                totalsSnapshot: {
                  subtotalMinor: 0,
                  vatMinor: 0,
                  totalMinor: 0,
                },
                warningsSnapshot: [],
                traceSummary: {
                  source: "quote-shell",
                },
                subtotalMinor: 0,
                vatMinor: 0,
                totalMinor: 0,
                createdById: data.createdById ?? null,
              },
            });
            const updatedQuote = await transactionClient.quote.update({
              where: { id: quote.id },
              data: {
                currentVersionId: currentVersion.id,
              },
            });

            return {
              quote: updatedQuote,
              currentVersion,
            };
          });
        } catch (error) {
          if (!isQuoteNumberUniqueCollision(error)) {
            throw error;
          }

          if (requestedQuoteNumber) {
            throw new QuoteNumberCollisionError(
              `Quote number "${requestedQuoteNumber}" already exists for this tenant.`,
            );
          }
        }
      }

      throw new QuoteNumberCollisionError(
        `Could not generate a unique quote number after ${GENERATED_QUOTE_NUMBER_MAX_ATTEMPTS} attempts.`,
      );
    },

    getTenantQuoteVersion(scope: TenantDataScope, quoteVersionId: string) {
      return client.quoteVersion.findFirst({
        where: tenantWhere(scope, { id: quoteVersionId }),
      });
    },

    async listTenantQuoteVersions(scope: TenantDataScope, quoteId: string) {
      const quote = await access.getTenantQuote(scope, quoteId);

      if (!quote) {
        return [];
      }

      return client.quoteVersion.findMany({
        where: tenantWhere(scope, { quoteId }),
        orderBy: [{ versionNumber: "desc" }],
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

export function listTenantQuotes(scope: TenantDataScope, options?: ListTenantQuotesOptions) {
  return tenantDataAccess.listTenantQuotes(scope, options);
}

export function createTenantQuoteDraft(scope: TenantDataScope, data: TenantQuoteDraftInput) {
  return tenantDataAccess.createTenantQuoteDraft(scope, data);
}

export function getTenantQuoteVersion(scope: TenantDataScope, quoteVersionId: string) {
  return tenantDataAccess.getTenantQuoteVersion(scope, quoteVersionId);
}

export function listTenantQuoteVersions(scope: TenantDataScope, quoteId: string) {
  return tenantDataAccess.listTenantQuoteVersions(scope, quoteId);
}

function customerSnapshot(customer: Customer) {
  return {
    id: customer.id,
    displayName: customer.displayName,
    companyName: customer.companyName,
    contactName: customer.contactName,
    email: customer.email,
    phone: customer.phone,
    addressLine1: customer.addressLine1,
    addressLine2: customer.addressLine2,
    city: customer.city,
    country: customer.country,
  };
}

function companySettingsSnapshot(companySettings: CompanySettings | null) {
  if (!companySettings) {
    return {
      missing: true,
      note: "Company settings were not configured when the draft quote was created.",
    };
  }

  return {
    id: companySettings.id,
    displayName: companySettings.displayName,
    legalName: companySettings.legalName,
    defaultCurrency: companySettings.defaultCurrency,
    vatRateBasisPoints: companySettings.vatRateBasisPoints,
    offerValidityDays: companySettings.offerValidityDays,
    paymentTermsText: companySettings.paymentTermsText,
    warrantyText: companySettings.warrantyText,
    deliveryText: companySettings.deliveryText,
    advancePaymentText: companySettings.advancePaymentText,
    pdfFooterText: companySettings.pdfFooterText,
  };
}

function runTenantDataTransaction<TResult>(
  client: TenantDataClient,
  operation: (transactionClient: TenantDataClient) => Promise<TResult>,
) {
  if (client.$transaction) {
    return client.$transaction(operation);
  }

  return operation(client);
}

function isQuoteNumberUniqueCollision(error: unknown) {
  if (!isPrismaUniqueConstraintError(error)) {
    return false;
  }

  const target = error.meta?.target;

  if (Array.isArray(target)) {
    return target.includes("quoteNumber");
  }

  if (typeof target === "string") {
    return target.includes("quoteNumber");
  }

  return true;
}

function isPrismaUniqueConstraintError(
  error: unknown,
): error is { code: "P2002"; meta?: { target?: unknown } } {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002",
  );
}

function generateQuoteNumber() {
  // Temporary until tenant-configurable quote numbering exists. The database unique index remains
  // the final guard and createTenantQuoteDraft retries generated collisions a few times.
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `Q-${datePart}-${randomPart}`;
}
