import { randomUUID } from "node:crypto";
import {
  Accessory,
  AuditAction,
  CatalogMaterialType,
  CatalogUnit,
  ColorFinish,
  DocumentType,
  GlassPackage,
  HardwareKit,
  PriceList,
  PriceListItem,
  PriceListItemType,
  PricingRule,
  ProfileItem,
  ProfileItemType,
  ProfileSystem,
  QuoteStatus,
  QuoteItemType,
  QuoteNumberDatePattern,
  QuoteVersionStatus,
  Supplier,
  TaxRate,
  ServiceItem,
  type AuditLog,
  type CompanySettings,
  type Customer,
  type Document,
  type Project,
  type Quote,
  type QuoteCalculationResult,
  type QuoteItem,
  type QuoteNumberSettings,
  type QuoteVersion,
  type SavedFilter,
  type UserPreference,
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

type DeleteArgs = {
  where: {
    id: string;
  };
};

type TenantModelDelegate<TRecord> = {
  findFirst(args: FindFirstArgs): Promise<TRecord | null>;
  findMany(args: FindManyArgs): Promise<TRecord[]>;
};

type TenantWritableModelDelegate<TRecord> = TenantModelDelegate<TRecord> & {
  create(args: CreateArgs): Promise<TRecord>;
  update(args: UpdateArgs): Promise<TRecord>;
};

type TenantDeletableModelDelegate<TRecord> = TenantWritableModelDelegate<TRecord> & {
  delete(args: DeleteArgs): Promise<TRecord>;
};

export type TenantDataClient = {
  accessory: TenantWritableModelDelegate<Accessory>;
  colorFinish: TenantWritableModelDelegate<ColorFinish>;
  customer: TenantWritableModelDelegate<Customer>;
  glassPackage: TenantWritableModelDelegate<GlassPackage>;
  hardwareKit: TenantWritableModelDelegate<HardwareKit>;
  priceList: TenantWritableModelDelegate<PriceList>;
  priceListItem: TenantWritableModelDelegate<PriceListItem>;
  pricingRule: TenantWritableModelDelegate<PricingRule>;
  profileItem: TenantWritableModelDelegate<ProfileItem>;
  profileSystem: TenantWritableModelDelegate<ProfileSystem>;
  project: TenantWritableModelDelegate<Project>;
  quote: TenantWritableModelDelegate<Quote>;
  quoteVersion: TenantWritableModelDelegate<QuoteVersion>;
  quoteItem: TenantDeletableModelDelegate<QuoteItem>;
  quoteCalculationResult: TenantWritableModelDelegate<QuoteCalculationResult>;
  document: TenantWritableModelDelegate<Document>;
  auditLog: TenantWritableModelDelegate<AuditLog>;
  companySettings: TenantWritableModelDelegate<CompanySettings>;
  quoteNumberSettings: TenantWritableModelDelegate<QuoteNumberSettings>;
  savedFilter: TenantWritableModelDelegate<SavedFilter>;
  serviceItem: TenantWritableModelDelegate<ServiceItem>;
  supplier: TenantWritableModelDelegate<Supplier>;
  taxRate: TenantWritableModelDelegate<TaxRate>;
  userPreference: TenantWritableModelDelegate<UserPreference>;
  $transaction?: <TResult>(
    operation: (transactionClient: TenantDataClient) => Promise<TResult>,
  ) => Promise<TResult>;
};

export type CreateTenantDataAccessOptions = {
  now?: () => Date;
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

export type ListTenantSavedFiltersOptions = {
  entityType?: string;
  userId?: string | null;
};

export type TenantSavedFilterWriteInput = {
  userId?: string | null;
  name: string;
  entityType?: string;
  filter: Record<string, unknown>;
  isDefault?: boolean;
};

export type TenantCompanySettingsWriteInput = {
  legalName: string;
  displayName: string;
  taxIdentifier?: string | null;
  registrationNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  defaultCurrency: string;
  defaultPdfTemplate: string;
  vatRateBasisPoints?: number | null;
  offerValidityDays?: number | null;
  paymentTermsText?: string | null;
  warrantyText?: string | null;
  deliveryText?: string | null;
  advancePaymentText?: string | null;
  pdfFooterText?: string | null;
  actorUserId?: string | null;
};

export type TenantQuoteNumberSettingsWriteInput = {
  prefix: string;
  nextNumber: number;
  datePattern: QuoteNumberDatePattern;
  actorUserId?: string | null;
};

export type TenantUserPreferenceWriteInput = {
  userId: string;
  defaultPdfTemplate?: string | null;
  dashboardShortcuts?: string[];
  language?: string;
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

export type TenantQuoteWithCurrentVersionResult = {
  quote: Quote;
  currentVersion: QuoteVersion | null;
};

export type TenantQuoteItemWriteInput = {
  type: QuoteItemType;
  quantity: number;
  widthMm?: number | null;
  heightMm?: number | null;
  customerDescription?: string | null;
  internalNotes?: string | null;
  configurationSnapshot: Record<string, unknown>;
  catalogSnapshot?: Record<string, unknown> | null;
  totalsSnapshot?: Record<string, unknown> | null;
  sortOrder?: number;
};

export type TenantQuoteItemUpdateInput = Partial<TenantQuoteItemWriteInput>;

export type TenantQuoteVersionCalculationUpdateInput = {
  subtotalMinor: bigint | number;
  vatMinor: bigint | number;
  totalMinor: bigint | number;
  totalsSnapshot: Record<string, unknown>;
  warningsSnapshot: readonly unknown[];
  traceSummary: Record<string, unknown>;
  itemSnapshot?: Record<string, unknown> | null;
};

export type TenantQuoteItemCalculationUpdateInput = {
  calculationSnapshot: Record<string, unknown>;
  totalsSnapshot: Record<string, unknown>;
};

export type TenantQuoteItemManualOverrideInput = {
  amountMinor: bigint | number;
  reason: string;
  actorUserId?: string | null;
};

export type TenantQuoteDiscountInput = {
  amountMinor?: bigint | number | null;
  basisPoints?: number | null;
  reason: string;
  actorUserId?: string | null;
};

export type TenantCommercialAdjustmentResult<TRecord> = {
  record: TRecord;
  auditLog: AuditLog;
};

export type TenantAuditedSettingsResult<TRecord> = {
  record: TRecord;
  auditLog: AuditLog;
};

export type TenantQuoteCalculationResultWriteInput = {
  calculatorVersion?: string | null;
  inputHash?: string | null;
  inputSnapshot: Record<string, unknown>;
  outputSnapshot: Record<string, unknown>;
  warnings?: readonly unknown[] | null;
  trace?: readonly unknown[] | null;
};

export type TenantSupplierWriteInput = {
  name: string;
  code?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

export type TenantProfileSystemWriteInput = {
  supplierId?: string | null;
  name: string;
  code?: string | null;
  materialType: CatalogMaterialType;
  description?: string | null;
  configuration?: Record<string, unknown> | null;
  isActive?: boolean;
};

export type TenantProfileItemWriteInput = {
  profileSystemId: string;
  supplierId?: string | null;
  name: string;
  code?: string | null;
  type: ProfileItemType;
  unit: CatalogUnit;
  description?: string | null;
  deductionRule?: Record<string, unknown> | null;
  wasteRule?: Record<string, unknown> | null;
  configuration?: Record<string, unknown> | null;
  isActive?: boolean;
};

export type TenantGlassPackageWriteInput = {
  supplierId?: string | null;
  name: string;
  code?: string | null;
  compositionLabel?: string | null;
  unit: CatalogUnit;
  minBillableAreaSquareMm?: number | null;
  deductionRule?: Record<string, unknown> | null;
  configuration?: Record<string, unknown> | null;
  isActive?: boolean;
};

export type TenantHardwareKitWriteInput = {
  supplierId?: string | null;
  name: string;
  code?: string | null;
  category?: string | null;
  openingType?: string | null;
  unit: CatalogUnit;
  quantityRule?: Record<string, unknown> | null;
  configuration?: Record<string, unknown> | null;
  isActive?: boolean;
};

export type TenantColorFinishWriteInput = {
  profileSystemId?: string | null;
  supplierId?: string | null;
  name: string;
  code?: string | null;
  surface?: string | null;
  configuration?: Record<string, unknown> | null;
  isActive?: boolean;
};

export type TenantAccessoryWriteInput = {
  supplierId?: string | null;
  name: string;
  code?: string | null;
  category?: string | null;
  unit: CatalogUnit;
  quantityRule?: Record<string, unknown> | null;
  configuration?: Record<string, unknown> | null;
  isActive?: boolean;
};

export type TenantServiceItemWriteInput = {
  name: string;
  code?: string | null;
  category?: string | null;
  unit: CatalogUnit;
  configuration?: Record<string, unknown> | null;
  isActive?: boolean;
};

export type TenantTaxRateWriteInput = {
  name: string;
  code?: string | null;
  rateBasisPoints: number;
  isDefault?: boolean;
  validFrom?: Date | null;
  validTo?: Date | null;
  configuration?: Record<string, unknown> | null;
  isActive?: boolean;
};

export type TenantPriceListItemWriteInput = {
  priceListId: string;
  itemType: PriceListItemType;
  catalogItemId: string;
  sku?: string | null;
  description?: string | null;
  unit: CatalogUnit;
  costMinor?: bigint | number | null;
  saleMinor?: bigint | number | null;
  currency?: string;
  metadata?: Record<string, unknown> | null;
  isActive?: boolean;
};

export type ListTenantPriceListItemsOptions = {
  priceListId?: string | null;
};

export type ListTenantPricingRulesOptions = {
  priceListId?: string | null;
};

export type TenantQuoteLockInput = {
  actorUserId?: string | null;
  status?: QuoteVersionStatus;
};

export type TenantQuoteRevisionInput = {
  actorUserId?: string | null;
};

export type TenantQuoteLifecycleResult = {
  quote: Quote;
  currentVersion: QuoteVersion;
};

export type TenantQuoteRevisionResult = TenantQuoteLifecycleResult & {
  sourceVersion: QuoteVersion;
  items: QuoteItem[];
};

export type TenantQuoteDocumentWriteInput = {
  actorUserId?: string | null;
  templateKey: string;
  fileName: string;
  storageKey: string;
  mimeType: string;
  checksum: string;
  visibleTotalsSnapshot: Record<string, unknown>;
};

export class QuoteNumberCollisionError extends Error {
  constructor(message = "Could not create a unique quote number for this tenant.") {
    super(message);
    this.name = "QuoteNumberCollisionError";
    Object.setPrototypeOf(this, QuoteNumberCollisionError.prototype);
  }
}

const GENERATED_QUOTE_NUMBER_MAX_ATTEMPTS = 3;
const defaultQuoteNumberPrefix = "OF";
const quoteNumberPadding = 4;

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
  const now = options.now ?? (() => new Date());

  const access = {
    listTenantSuppliers(scope: TenantDataScope) {
      return client.supplier.findMany({
        where: tenantWhere(scope),
        orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      });
    },

    getTenantSupplier(scope: TenantDataScope, supplierId: string) {
      return client.supplier.findFirst({
        where: tenantWhere(scope, { id: supplierId }),
      });
    },

    createTenantSupplier(scope: TenantDataScope, data: TenantSupplierWriteInput) {
      return client.supplier.create({
        data: {
          ...data,
          tenantId: tenantIdFromScope(scope),
          isActive: data.isActive ?? true,
          deletedAt: null,
        },
      });
    },

    async updateTenantSupplier(
      scope: TenantDataScope,
      supplierId: string,
      data: TenantSupplierWriteInput,
    ) {
      const existingSupplier = await access.getTenantSupplier(scope, supplierId);

      if (!existingSupplier) {
        return null;
      }

      return client.supplier.update({
        where: { id: supplierId },
        data: compactRecord(data),
      });
    },

    async archiveTenantSupplier(scope: TenantDataScope, supplierId: string) {
      const existingSupplier = await access.getTenantSupplier(scope, supplierId);

      if (!existingSupplier) {
        return null;
      }

      return client.supplier.update({
        where: { id: supplierId },
        data: archiveCatalogRecordData(),
      });
    },

    listTenantProfileSystems(scope: TenantDataScope) {
      return client.profileSystem.findMany({
        where: tenantWhere(scope),
        orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      });
    },

    getTenantProfileSystem(scope: TenantDataScope, profileSystemId: string) {
      return client.profileSystem.findFirst({
        where: tenantWhere(scope, { id: profileSystemId }),
      });
    },

    async createTenantProfileSystem(
      scope: TenantDataScope,
      data: TenantProfileSystemWriteInput,
    ) {
      if (!(await supplierBelongsToTenant(scope, data.supplierId))) {
        return null;
      }

      return client.profileSystem.create({
        data: {
          ...data,
          tenantId: tenantIdFromScope(scope),
          supplierId: data.supplierId ?? null,
          configuration: data.configuration ?? null,
          isActive: data.isActive ?? true,
          deletedAt: null,
        },
      });
    },

    async updateTenantProfileSystem(
      scope: TenantDataScope,
      profileSystemId: string,
      data: TenantProfileSystemWriteInput,
    ) {
      const existingProfileSystem = await access.getTenantProfileSystem(scope, profileSystemId);

      if (!existingProfileSystem || !(await supplierBelongsToTenant(scope, data.supplierId))) {
        return null;
      }

      return client.profileSystem.update({
        where: { id: profileSystemId },
        data: compactRecord({
          ...data,
          supplierId: data.supplierId ?? null,
          configuration: data.configuration ?? null,
        }),
      });
    },

    async archiveTenantProfileSystem(scope: TenantDataScope, profileSystemId: string) {
      const existingProfileSystem = await access.getTenantProfileSystem(scope, profileSystemId);

      if (!existingProfileSystem) {
        return null;
      }

      return client.profileSystem.update({
        where: { id: profileSystemId },
        data: archiveCatalogRecordData(),
      });
    },

    listTenantProfileItems(scope: TenantDataScope) {
      return client.profileItem.findMany({
        where: tenantWhere(scope),
        orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      });
    },

    getTenantProfileItem(scope: TenantDataScope, profileItemId: string) {
      return client.profileItem.findFirst({
        where: tenantWhere(scope, { id: profileItemId }),
      });
    },

    async createTenantProfileItem(scope: TenantDataScope, data: TenantProfileItemWriteInput) {
      if (
        !(await profileSystemBelongsToTenant(scope, data.profileSystemId)) ||
        !(await supplierBelongsToTenant(scope, data.supplierId))
      ) {
        return null;
      }

      return client.profileItem.create({
        data: {
          ...data,
          tenantId: tenantIdFromScope(scope),
          supplierId: data.supplierId ?? null,
          deductionRule: data.deductionRule ?? null,
          wasteRule: data.wasteRule ?? null,
          configuration: data.configuration ?? null,
          isActive: data.isActive ?? true,
          deletedAt: null,
        },
      });
    },

    async updateTenantProfileItem(
      scope: TenantDataScope,
      profileItemId: string,
      data: TenantProfileItemWriteInput,
    ) {
      const existingProfileItem = await access.getTenantProfileItem(scope, profileItemId);

      if (
        !existingProfileItem ||
        !(await profileSystemBelongsToTenant(scope, data.profileSystemId)) ||
        !(await supplierBelongsToTenant(scope, data.supplierId))
      ) {
        return null;
      }

      return client.profileItem.update({
        where: { id: profileItemId },
        data: compactRecord({
          ...data,
          supplierId: data.supplierId ?? null,
          deductionRule: data.deductionRule ?? null,
          wasteRule: data.wasteRule ?? null,
          configuration: data.configuration ?? null,
        }),
      });
    },

    async archiveTenantProfileItem(scope: TenantDataScope, profileItemId: string) {
      const existingProfileItem = await access.getTenantProfileItem(scope, profileItemId);

      if (!existingProfileItem) {
        return null;
      }

      return client.profileItem.update({
        where: { id: profileItemId },
        data: archiveCatalogRecordData(),
      });
    },

    listTenantGlassPackages(scope: TenantDataScope) {
      return client.glassPackage.findMany({
        where: tenantWhere(scope),
        orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      });
    },

    getTenantGlassPackage(scope: TenantDataScope, glassPackageId: string) {
      return client.glassPackage.findFirst({
        where: tenantWhere(scope, { id: glassPackageId }),
      });
    },

    async createTenantGlassPackage(scope: TenantDataScope, data: TenantGlassPackageWriteInput) {
      if (!(await supplierBelongsToTenant(scope, data.supplierId))) {
        return null;
      }

      return client.glassPackage.create({
        data: {
          ...data,
          tenantId: tenantIdFromScope(scope),
          supplierId: data.supplierId ?? null,
          deductionRule: data.deductionRule ?? null,
          configuration: data.configuration ?? null,
          isActive: data.isActive ?? true,
          deletedAt: null,
        },
      });
    },

    async updateTenantGlassPackage(
      scope: TenantDataScope,
      glassPackageId: string,
      data: TenantGlassPackageWriteInput,
    ) {
      const existingGlassPackage = await access.getTenantGlassPackage(scope, glassPackageId);

      if (!existingGlassPackage || !(await supplierBelongsToTenant(scope, data.supplierId))) {
        return null;
      }

      return client.glassPackage.update({
        where: { id: glassPackageId },
        data: compactRecord({
          ...data,
          supplierId: data.supplierId ?? null,
          deductionRule: data.deductionRule ?? null,
          configuration: data.configuration ?? null,
        }),
      });
    },

    async archiveTenantGlassPackage(scope: TenantDataScope, glassPackageId: string) {
      const existingGlassPackage = await access.getTenantGlassPackage(scope, glassPackageId);

      if (!existingGlassPackage) {
        return null;
      }

      return client.glassPackage.update({
        where: { id: glassPackageId },
        data: archiveCatalogRecordData(),
      });
    },

    listTenantHardwareKits(scope: TenantDataScope) {
      return client.hardwareKit.findMany({
        where: tenantWhere(scope),
        orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      });
    },

    getTenantHardwareKit(scope: TenantDataScope, hardwareKitId: string) {
      return client.hardwareKit.findFirst({
        where: tenantWhere(scope, { id: hardwareKitId }),
      });
    },

    async createTenantHardwareKit(scope: TenantDataScope, data: TenantHardwareKitWriteInput) {
      if (!(await supplierBelongsToTenant(scope, data.supplierId))) {
        return null;
      }

      return client.hardwareKit.create({
        data: {
          ...data,
          tenantId: tenantIdFromScope(scope),
          supplierId: data.supplierId ?? null,
          quantityRule: data.quantityRule ?? null,
          configuration: data.configuration ?? null,
          isActive: data.isActive ?? true,
          deletedAt: null,
        },
      });
    },

    async updateTenantHardwareKit(
      scope: TenantDataScope,
      hardwareKitId: string,
      data: TenantHardwareKitWriteInput,
    ) {
      const existingHardwareKit = await access.getTenantHardwareKit(scope, hardwareKitId);

      if (!existingHardwareKit || !(await supplierBelongsToTenant(scope, data.supplierId))) {
        return null;
      }

      return client.hardwareKit.update({
        where: { id: hardwareKitId },
        data: compactRecord({
          ...data,
          supplierId: data.supplierId ?? null,
          quantityRule: data.quantityRule ?? null,
          configuration: data.configuration ?? null,
        }),
      });
    },

    async archiveTenantHardwareKit(scope: TenantDataScope, hardwareKitId: string) {
      const existingHardwareKit = await access.getTenantHardwareKit(scope, hardwareKitId);

      if (!existingHardwareKit) {
        return null;
      }

      return client.hardwareKit.update({
        where: { id: hardwareKitId },
        data: archiveCatalogRecordData(),
      });
    },

    listTenantColorFinishes(scope: TenantDataScope) {
      return client.colorFinish.findMany({
        where: tenantWhere(scope),
        orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      });
    },

    getTenantColorFinish(scope: TenantDataScope, colorFinishId: string) {
      return client.colorFinish.findFirst({
        where: tenantWhere(scope, { id: colorFinishId }),
      });
    },

    async createTenantColorFinish(scope: TenantDataScope, data: TenantColorFinishWriteInput) {
      if (
        !(await profileSystemBelongsToTenant(scope, data.profileSystemId)) ||
        !(await supplierBelongsToTenant(scope, data.supplierId))
      ) {
        return null;
      }

      return client.colorFinish.create({
        data: {
          ...data,
          tenantId: tenantIdFromScope(scope),
          profileSystemId: data.profileSystemId ?? null,
          supplierId: data.supplierId ?? null,
          configuration: data.configuration ?? null,
          isActive: data.isActive ?? true,
          deletedAt: null,
        },
      });
    },

    async updateTenantColorFinish(
      scope: TenantDataScope,
      colorFinishId: string,
      data: TenantColorFinishWriteInput,
    ) {
      const existingColorFinish = await access.getTenantColorFinish(scope, colorFinishId);

      if (
        !existingColorFinish ||
        !(await profileSystemBelongsToTenant(scope, data.profileSystemId)) ||
        !(await supplierBelongsToTenant(scope, data.supplierId))
      ) {
        return null;
      }

      return client.colorFinish.update({
        where: { id: colorFinishId },
        data: compactRecord({
          ...data,
          profileSystemId: data.profileSystemId ?? null,
          supplierId: data.supplierId ?? null,
          configuration: data.configuration ?? null,
        }),
      });
    },

    async archiveTenantColorFinish(scope: TenantDataScope, colorFinishId: string) {
      const existingColorFinish = await access.getTenantColorFinish(scope, colorFinishId);

      if (!existingColorFinish) {
        return null;
      }

      return client.colorFinish.update({
        where: { id: colorFinishId },
        data: archiveCatalogRecordData(),
      });
    },

    listTenantAccessories(scope: TenantDataScope) {
      return client.accessory.findMany({
        where: tenantWhere(scope),
        orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      });
    },

    getTenantAccessory(scope: TenantDataScope, accessoryId: string) {
      return client.accessory.findFirst({
        where: tenantWhere(scope, { id: accessoryId }),
      });
    },

    async createTenantAccessory(scope: TenantDataScope, data: TenantAccessoryWriteInput) {
      if (!(await supplierBelongsToTenant(scope, data.supplierId))) {
        return null;
      }

      return client.accessory.create({
        data: {
          ...data,
          tenantId: tenantIdFromScope(scope),
          supplierId: data.supplierId ?? null,
          quantityRule: data.quantityRule ?? null,
          configuration: data.configuration ?? null,
          isActive: data.isActive ?? true,
          deletedAt: null,
        },
      });
    },

    async updateTenantAccessory(
      scope: TenantDataScope,
      accessoryId: string,
      data: TenantAccessoryWriteInput,
    ) {
      const existingAccessory = await access.getTenantAccessory(scope, accessoryId);

      if (!existingAccessory || !(await supplierBelongsToTenant(scope, data.supplierId))) {
        return null;
      }

      return client.accessory.update({
        where: { id: accessoryId },
        data: compactRecord({
          ...data,
          supplierId: data.supplierId ?? null,
          quantityRule: data.quantityRule ?? null,
          configuration: data.configuration ?? null,
        }),
      });
    },

    async archiveTenantAccessory(scope: TenantDataScope, accessoryId: string) {
      const existingAccessory = await access.getTenantAccessory(scope, accessoryId);

      if (!existingAccessory) {
        return null;
      }

      return client.accessory.update({
        where: { id: accessoryId },
        data: archiveCatalogRecordData(),
      });
    },

    listTenantServiceItems(scope: TenantDataScope) {
      return client.serviceItem.findMany({
        where: tenantWhere(scope),
        orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      });
    },

    getTenantServiceItem(scope: TenantDataScope, serviceItemId: string) {
      return client.serviceItem.findFirst({
        where: tenantWhere(scope, { id: serviceItemId }),
      });
    },

    createTenantServiceItem(scope: TenantDataScope, data: TenantServiceItemWriteInput) {
      return client.serviceItem.create({
        data: {
          ...data,
          tenantId: tenantIdFromScope(scope),
          configuration: data.configuration ?? null,
          isActive: data.isActive ?? true,
          deletedAt: null,
        },
      });
    },

    async updateTenantServiceItem(
      scope: TenantDataScope,
      serviceItemId: string,
      data: TenantServiceItemWriteInput,
    ) {
      const existingServiceItem = await access.getTenantServiceItem(scope, serviceItemId);

      if (!existingServiceItem) {
        return null;
      }

      return client.serviceItem.update({
        where: { id: serviceItemId },
        data: compactRecord({
          ...data,
          configuration: data.configuration ?? null,
        }),
      });
    },

    async archiveTenantServiceItem(scope: TenantDataScope, serviceItemId: string) {
      const existingServiceItem = await access.getTenantServiceItem(scope, serviceItemId);

      if (!existingServiceItem) {
        return null;
      }

      return client.serviceItem.update({
        where: { id: serviceItemId },
        data: archiveCatalogRecordData(),
      });
    },

    listTenantTaxRates(scope: TenantDataScope) {
      return client.taxRate.findMany({
        where: tenantWhere(scope),
        orderBy: [{ isDefault: "desc" }, { name: "asc" }, { createdAt: "desc" }],
      });
    },

    getTenantTaxRate(scope: TenantDataScope, taxRateId: string) {
      return client.taxRate.findFirst({
        where: tenantWhere(scope, { id: taxRateId }),
      });
    },

    createTenantTaxRate(scope: TenantDataScope, data: TenantTaxRateWriteInput) {
      return client.taxRate.create({
        data: {
          ...data,
          tenantId: tenantIdFromScope(scope),
          isDefault: data.isDefault ?? false,
          configuration: data.configuration ?? null,
          isActive: data.isActive ?? true,
          deletedAt: null,
        },
      });
    },

    async updateTenantTaxRate(
      scope: TenantDataScope,
      taxRateId: string,
      data: TenantTaxRateWriteInput,
    ) {
      const existingTaxRate = await access.getTenantTaxRate(scope, taxRateId);

      if (!existingTaxRate) {
        return null;
      }

      return client.taxRate.update({
        where: { id: taxRateId },
        data: compactRecord({
          ...data,
          configuration: data.configuration ?? null,
        }),
      });
    },

    async archiveTenantTaxRate(scope: TenantDataScope, taxRateId: string) {
      const existingTaxRate = await access.getTenantTaxRate(scope, taxRateId);

      if (!existingTaxRate) {
        return null;
      }

      return client.taxRate.update({
        where: { id: taxRateId },
        data: archiveCatalogRecordData(),
      });
    },

    listTenantPriceLists(scope: TenantDataScope) {
      return client.priceList.findMany({
        where: tenantWhere(scope),
        orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
      });
    },

    getTenantPriceList(scope: TenantDataScope, priceListId: string) {
      return client.priceList.findFirst({
        where: tenantWhere(scope, { id: priceListId }),
      });
    },

    listTenantPriceListItems(
      scope: TenantDataScope,
      options: ListTenantPriceListItemsOptions = {},
    ) {
      return client.priceListItem.findMany({
        where: tenantWhere(
          scope,
          options.priceListId ? { priceListId: options.priceListId } : undefined,
        ),
        orderBy: [{ itemType: "asc" }, { createdAt: "desc" }],
      });
    },

    getTenantPriceListItem(scope: TenantDataScope, priceListItemId: string) {
      return client.priceListItem.findFirst({
        where: tenantWhere(scope, { id: priceListItemId }),
      });
    },

    async createTenantPriceListItem(
      scope: TenantDataScope,
      data: TenantPriceListItemWriteInput,
    ) {
      if (
        !(await priceListBelongsToTenant(scope, data.priceListId)) ||
        !(await catalogItemBelongsToTenant(scope, data.itemType, data.catalogItemId))
      ) {
        return null;
      }

      return client.priceListItem.create({
        data: {
          ...data,
          tenantId: tenantIdFromScope(scope),
          currency: data.currency ?? "RON",
          metadata: data.metadata ?? null,
          isActive: data.isActive ?? true,
          deletedAt: null,
        },
      });
    },

    async updateTenantPriceListItem(
      scope: TenantDataScope,
      priceListItemId: string,
      data: TenantPriceListItemWriteInput,
    ) {
      const existingPriceListItem = await access.getTenantPriceListItem(scope, priceListItemId);

      if (
        !existingPriceListItem ||
        !(await priceListBelongsToTenant(scope, data.priceListId)) ||
        !(await catalogItemBelongsToTenant(scope, data.itemType, data.catalogItemId))
      ) {
        return null;
      }

      return client.priceListItem.update({
        where: { id: priceListItemId },
        data: compactRecord({
          ...data,
          currency: data.currency ?? "RON",
          metadata: data.metadata ?? null,
        }),
      });
    },

    async archiveTenantPriceListItem(scope: TenantDataScope, priceListItemId: string) {
      const existingPriceListItem = await access.getTenantPriceListItem(scope, priceListItemId);

      if (!existingPriceListItem) {
        return null;
      }

      return client.priceListItem.update({
        where: { id: priceListItemId },
        data: archiveCatalogRecordData(),
      });
    },

    listTenantPricingRules(
      scope: TenantDataScope,
      options: ListTenantPricingRulesOptions = {},
    ) {
      return client.pricingRule.findMany({
        where: tenantWhere(
          scope,
          options.priceListId ? { priceListId: options.priceListId } : undefined,
        ),
        orderBy: [{ priority: "asc" }, { name: "asc" }],
      });
    },

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

    async getTenantQuoteWithCurrentVersion(
      scope: TenantDataScope,
      quoteId: string,
    ): Promise<TenantQuoteWithCurrentVersionResult | null> {
      const quote = await access.getTenantQuote(scope, quoteId);

      if (!quote) {
        return null;
      }

      const customer = await access.getTenantCustomer(scope, quote.customerId);

      if (!customer) {
        return null;
      }

      if (quote.projectId) {
        const project = await access.getTenantProject(scope, quote.projectId);

        if (!project || project.customerId !== quote.customerId) {
          return null;
        }
      }

      const currentVersion = quote.currentVersionId
        ? await access.getTenantQuoteVersion(scope, quote.currentVersionId)
        : null;

      if (quote.currentVersionId && (!currentVersion || currentVersion.quoteId !== quote.id)) {
        return null;
      }

      return {
        quote,
        currentVersion,
      };
    },

    listTenantQuotes(scope: TenantDataScope, options: ListTenantQuotesOptions = {}) {
      return client.quote.findMany({
        where: tenantWhere(scope, quoteFilterWhere(options)),
        orderBy: [{ createdAt: "desc" }],
      });
    },

    getTenantCompanySettings(scope: TenantDataScope) {
      return client.companySettings.findFirst({
        where: tenantWhere(scope),
      });
    },

    getTenantCompanySettingsById(scope: TenantDataScope, settingsId: string) {
      return client.companySettings.findFirst({
        where: tenantWhere(scope, { id: settingsId }),
      });
    },

    async updateTenantCompanySettings(
      scope: TenantDataScope,
      settingsId: string | null,
      data: TenantCompanySettingsWriteInput,
    ): Promise<TenantAuditedSettingsResult<CompanySettings> | null> {
      return runTenantDataTransaction(client, async (transactionClient) => {
        const transactionAccess = createTenantDataAccess(transactionClient, options);
        const existing = settingsId
          ? await transactionAccess.getTenantCompanySettingsById(scope, settingsId)
          : await transactionAccess.getTenantCompanySettings(scope);

        if (settingsId && !existing) {
          return null;
        }

        const writeData = companySettingsWriteData(data);
        const record = existing
          ? await transactionClient.companySettings.update({
              where: { id: existing.id },
              data: writeData,
            })
          : await transactionClient.companySettings.create({
              data: {
                tenantId: tenantIdFromScope(scope),
                ...writeData,
              },
            });

        const auditLog = await transactionClient.auditLog.create({
          data: {
            tenantId: tenantIdFromScope(scope),
            actorUserId: data.actorUserId ?? null,
            action: AuditAction.SETTINGS_UPDATED,
            entityType: "CompanySettings",
            entityId: record.id,
            beforeSnapshot: existing ? companySettingsAuditSnapshot(existing) : null,
            afterSnapshot: companySettingsAuditSnapshot(record),
            metadata: {
              settingsType: "company",
              defaultPdfTemplate: record.defaultPdfTemplate,
            },
          },
        });

        return { record, auditLog };
      });
    },

    getTenantQuoteNumberSettings(scope: TenantDataScope) {
      return client.quoteNumberSettings.findFirst({
        where: tenantWhere(scope),
      });
    },

    getTenantQuoteNumberSettingsById(scope: TenantDataScope, settingsId: string) {
      return client.quoteNumberSettings.findFirst({
        where: tenantWhere(scope, { id: settingsId }),
      });
    },

    async updateTenantQuoteNumberSettings(
      scope: TenantDataScope,
      settingsId: string | null,
      data: TenantQuoteNumberSettingsWriteInput,
    ): Promise<TenantAuditedSettingsResult<QuoteNumberSettings> | null> {
      return runTenantDataTransaction(client, async (transactionClient) => {
        const transactionAccess = createTenantDataAccess(transactionClient, options);
        const existing = settingsId
          ? await transactionAccess.getTenantQuoteNumberSettingsById(scope, settingsId)
          : await transactionAccess.getTenantQuoteNumberSettings(scope);

        if (settingsId && !existing) {
          return null;
        }

        const writeData = quoteNumberSettingsWriteData(data);
        const record = existing
          ? await transactionClient.quoteNumberSettings.update({
              where: { id: existing.id },
              data: writeData,
            })
          : await transactionClient.quoteNumberSettings.create({
              data: {
                tenantId: tenantIdFromScope(scope),
                ...writeData,
              },
            });

        const auditLog = await transactionClient.auditLog.create({
          data: {
            tenantId: tenantIdFromScope(scope),
            actorUserId: data.actorUserId ?? null,
            action: AuditAction.QUOTE_NUMBERING_UPDATED,
            entityType: "QuoteNumberSettings",
            entityId: record.id,
            beforeSnapshot: existing ? quoteNumberSettingsAuditSnapshot(existing) : null,
            afterSnapshot: quoteNumberSettingsAuditSnapshot(record),
            metadata: {
              settingsType: "quote-numbering",
              nextQuoteNumberPreview: previewTenantQuoteNumber(record, now()),
            },
          },
        });

        return { record, auditLog };
      });
    },

    getTenantUserPreference(scope: TenantDataScope, userId: string) {
      return client.userPreference.findFirst({
        where: tenantWhere(scope, { userId }),
      });
    },

    async upsertTenantUserPreference(
      scope: TenantDataScope,
      data: TenantUserPreferenceWriteInput,
    ) {
      const existing = await access.getTenantUserPreference(scope, data.userId);
      const writeData = userPreferenceWriteData(data);

      if (existing) {
        return client.userPreference.update({
          where: { id: existing.id },
          data: writeData,
        });
      }

      return client.userPreference.create({
        data: {
          tenantId: tenantIdFromScope(scope),
          userId: data.userId,
          ...writeData,
        },
      });
    },

    listTenantSavedFilters(
      scope: TenantDataScope,
      options: ListTenantSavedFiltersOptions = {},
    ) {
      return client.savedFilter.findMany({
        where: tenantWhere(scope, {
          entityType: options.entityType ?? "Quote",
          ...(options.userId !== undefined ? { userId: options.userId } : {}),
        }),
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      });
    },

    getTenantSavedFilter(scope: TenantDataScope, savedFilterId: string) {
      return client.savedFilter.findFirst({
        where: tenantWhere(scope, { id: savedFilterId }),
      });
    },

    async upsertTenantSavedFilter(
      scope: TenantDataScope,
      data: TenantSavedFilterWriteInput,
    ) {
      const entityType = data.entityType ?? "Quote";
      const userId = data.userId ?? null;
      const existing = await client.savedFilter.findFirst({
        where: tenantWhere(scope, {
          entityType,
          userId,
          name: data.name,
        }),
      });

      if (existing) {
        return client.savedFilter.update({
          where: { id: existing.id },
          data: {
            filter: data.filter,
            isDefault: data.isDefault ?? existing.isDefault,
          },
        });
      }

      return client.savedFilter.create({
        data: {
          tenantId: tenantIdFromScope(scope),
          userId,
          name: data.name,
          entityType,
          filter: data.filter,
          isDefault: data.isDefault ?? false,
        },
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

      const requestedQuoteNumber = data.quoteNumber?.trim() || null;
      const attemptCount = requestedQuoteNumber ? 1 : GENERATED_QUOTE_NUMBER_MAX_ATTEMPTS;

      for (let attempt = 0; attempt < attemptCount; attempt += 1) {
        try {
          return await runTenantDataTransaction(client, async (transactionClient) => {
            const quoteNumberSettings = requestedQuoteNumber
              ? null
              : await getOrCreateTenantQuoteNumberSettings(transactionClient, scope);
            const generatedSequenceNumber = quoteNumberSettings
              ? quoteNumberSettings.nextNumber + attempt
              : null;
            const quoteNumber =
              requestedQuoteNumber ??
              previewTenantQuoteNumber({
                datePattern: quoteNumberSettings?.datePattern ?? QuoteNumberDatePattern.YEAR,
                nextNumber: generatedSequenceNumber ?? 1,
                prefix: quoteNumberSettings?.prefix ?? defaultQuoteNumberPrefix,
              }, now());
            const companySettings = await transactionClient.companySettings.findFirst({
              where: tenantWhere(scope),
            });
            const currency = data.currency ?? companySettings?.defaultCurrency ?? "RON";
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

            if (quoteNumberSettings && generatedSequenceNumber) {
              await transactionClient.quoteNumberSettings.update({
                where: { id: quoteNumberSettings.id },
                data: {
                  nextNumber: generatedSequenceNumber + 1,
                },
              });
            }

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

    async listTenantQuoteItems(scope: TenantDataScope, quoteVersionId: string) {
      const quoteVersion = await access.getTenantQuoteVersion(scope, quoteVersionId);

      if (!quoteVersion) {
        return [];
      }

      return client.quoteItem.findMany({
        where: tenantWhere(scope, { quoteVersionId }),
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
    },

    getTenantQuoteItem(scope: TenantDataScope, quoteItemId: string) {
      return client.quoteItem.findFirst({
        where: tenantWhere(scope, { id: quoteItemId }),
      });
    },

    async getTenantQuoteCalculationResult(scope: TenantDataScope, quoteVersionId: string) {
      const quoteVersion = await access.getTenantQuoteVersion(scope, quoteVersionId);

      if (!quoteVersion) {
        return null;
      }

      return client.quoteCalculationResult.findFirst({
        where: tenantWhere(scope, { quoteVersionId }),
      });
    },

    getTenantDocument(scope: TenantDataScope, documentId: string) {
      return client.document.findFirst({
        where: tenantWhere(scope, { id: documentId }),
      });
    },

    async getTenantQuoteDocument(
      scope: TenantDataScope,
      quoteId: string,
      documentId: string,
    ) {
      const document = await access.getTenantDocument(scope, documentId);

      if (!document?.quoteVersionId) {
        return null;
      }

      const quoteVersion = await access.getTenantQuoteVersion(scope, document.quoteVersionId);

      if (!quoteVersion || quoteVersion.quoteId !== quoteId) {
        return null;
      }

      const quote = await access.getTenantQuote(scope, quoteId);

      if (!quote) {
        return null;
      }

      return {
        document,
        quote,
        quoteVersion,
      };
    },

    async listTenantQuoteDocuments(scope: TenantDataScope, quoteVersionId: string) {
      const quoteVersion = await access.getTenantQuoteVersion(scope, quoteVersionId);

      if (!quoteVersion) {
        return [];
      }

      return client.document.findMany({
        where: tenantWhere(scope, {
          quoteVersionId,
          type: DocumentType.QUOTE_PDF,
        }),
        orderBy: [{ createdAt: "desc" }],
      });
    },

    async createTenantQuoteItem(
      scope: TenantDataScope,
      quoteId: string,
      data: TenantQuoteItemWriteInput,
    ) {
      const quoteState = await access.getTenantQuoteWithCurrentVersion(scope, quoteId);

      if (!quoteState?.currentVersion || !isDraftVersionMutable(quoteState.currentVersion)) {
        return null;
      }

      const tenantId = tenantIdFromScope(scope);
      const existingItems = await access.listTenantQuoteItems(scope, quoteState.currentVersion.id);
      const nextSortOrder =
        existingItems.reduce((highest, item) => Math.max(highest, item.sortOrder), -1) + 1;

      return client.quoteItem.create({
        data: {
          tenantId,
          quoteVersionId: quoteState.currentVersion.id,
          type: data.type,
          sortOrder: data.sortOrder ?? nextSortOrder,
          quantity: data.quantity,
          widthMm: data.widthMm ?? null,
          heightMm: data.heightMm ?? null,
          customerDescription: data.customerDescription ?? null,
          internalNotes: data.internalNotes ?? null,
          configurationSnapshot: data.configurationSnapshot,
          catalogSnapshot: data.catalogSnapshot ?? null,
          calculationSnapshot: null,
          totalsSnapshot: data.totalsSnapshot ?? emptyDraftItemTotalsSnapshot(),
        },
      });
    },

    async updateTenantQuoteItem(
      scope: TenantDataScope,
      quoteItemId: string,
      data: TenantQuoteItemUpdateInput,
    ) {
      const existingItem = await access.getTenantQuoteItem(scope, quoteItemId);

      if (!existingItem) {
        return null;
      }

      const quoteState = await getMutableCurrentQuoteStateForItem(scope, existingItem);

      if (!quoteState) {
        return null;
      }

      return client.quoteItem.update({
        where: { id: quoteItemId },
        data: compactRecord({
          type: data.type,
          sortOrder: data.sortOrder,
          quantity: data.quantity,
          widthMm: data.widthMm,
          heightMm: data.heightMm,
          customerDescription: data.customerDescription,
          internalNotes: data.internalNotes,
          configurationSnapshot: data.configurationSnapshot,
          catalogSnapshot: data.catalogSnapshot,
          totalsSnapshot: data.totalsSnapshot,
          calculationSnapshot: null,
        }),
      });
    },

    async deleteTenantQuoteItem(scope: TenantDataScope, quoteItemId: string) {
      const existingItem = await access.getTenantQuoteItem(scope, quoteItemId);

      if (!existingItem) {
        return null;
      }

      const quoteState = await getMutableCurrentQuoteStateForItem(scope, existingItem);

      if (!quoteState) {
        return null;
      }

      return client.quoteItem.delete({
        where: { id: quoteItemId },
      });
    },

    async applyTenantQuoteItemManualOverride(
      scope: TenantDataScope,
      quoteItemId: string,
      data: TenantQuoteItemManualOverrideInput,
    ): Promise<TenantCommercialAdjustmentResult<QuoteItem> | null> {
      if (!hasCommercialReason(data.reason) || !isValidMinorAmount(data.amountMinor)) {
        return null;
      }

      return runTenantDataTransaction(client, async (transactionClient) => {
        const transactionAccess = createTenantDataAccess(transactionClient, options);
        const existingItem = await transactionAccess.getTenantQuoteItem(scope, quoteItemId);

        if (!existingItem) {
          return null;
        }

        const quoteVersion = await transactionAccess.getTenantQuoteVersion(
          scope,
          existingItem.quoteVersionId,
        );
        const quoteState = quoteVersion
          ? await transactionAccess.getTenantQuoteWithCurrentVersion(scope, quoteVersion.quoteId)
          : null;

        if (
          !quoteVersion ||
          !quoteState ||
          quoteState.currentVersion?.id !== existingItem.quoteVersionId ||
          !isDraftVersionMutable(quoteState.currentVersion)
        ) {
          return null;
        }

        const auditId = commercialAuditId();
        const timestamp = new Date();
        const beforeSnapshot = quoteItemCommercialAuditSnapshot(existingItem);
        const configurationSnapshot = {
          ...jsonRecord(existingItem.configurationSnapshot),
          manualOverride: {
            target: "totalWithVat",
            amountMinor: minorValueAuditString(data.amountMinor),
            reason: data.reason.trim(),
            actorId: data.actorUserId ?? null,
            timestamp: timestamp.toISOString(),
            auditReferenceId: auditId,
          },
        };
        const updatedItem = await transactionClient.quoteItem.update({
          where: { id: existingItem.id },
          data: {
            configurationSnapshot,
            calculationSnapshot: null,
            totalsSnapshot: {
              ...jsonRecord(existingItem.totalsSnapshot),
              pendingCalculation: true,
              source: "manual-commercial-adjustment",
            },
          },
        });
        const afterSnapshot = quoteItemCommercialAuditSnapshot(updatedItem);
        const auditLog = await transactionClient.auditLog.create({
          data: {
            id: auditId,
            tenantId: tenantIdFromScope(scope),
            actorUserId: data.actorUserId ?? null,
            action: AuditAction.PRICING_OVERRIDE_APPLIED,
            entityType: "QuoteItem",
            entityId: updatedItem.id,
            beforeSnapshot,
            afterSnapshot,
            metadata: {
              adjustmentType: "item-manual-override",
              field: "configurationSnapshot.manualOverride",
              quoteId: quoteState.quote.id,
              quoteVersionId: quoteVersion.id,
              quoteNumber: quoteState.quote.quoteNumber,
              amountMinor: minorValueAuditString(data.amountMinor),
              reason: data.reason.trim(),
            },
          },
        });

        return {
          record: updatedItem,
          auditLog,
        };
      });
    },

    async applyTenantQuoteDiscount(
      scope: TenantDataScope,
      quoteId: string,
      data: TenantQuoteDiscountInput,
    ): Promise<TenantCommercialAdjustmentResult<QuoteVersion> | null> {
      if (
        !hasCommercialReason(data.reason) ||
        !hasValidQuoteDiscountValue(data.amountMinor, data.basisPoints)
      ) {
        return null;
      }

      return runTenantDataTransaction(client, async (transactionClient) => {
        const transactionAccess = createTenantDataAccess(transactionClient, options);
        const quoteState = await transactionAccess.getTenantQuoteWithCurrentVersion(scope, quoteId);

        if (!quoteState?.currentVersion || !isDraftVersionMutable(quoteState.currentVersion)) {
          return null;
        }

        const auditId = commercialAuditId();
        const timestamp = new Date();
        const beforeSnapshot = quoteVersionCommercialAuditSnapshot(quoteState.currentVersion);
        const priceSnapshot = {
          ...jsonRecord(quoteState.currentVersion.priceSnapshot),
          quoteDiscount: {
            ...(data.amountMinor !== null && data.amountMinor !== undefined
              ? { amountMinor: minorValueAuditString(data.amountMinor) }
              : {}),
            ...(data.basisPoints !== null && data.basisPoints !== undefined
              ? { basisPoints: data.basisPoints }
              : {}),
            reason: data.reason.trim(),
            actorId: data.actorUserId ?? null,
            timestamp: timestamp.toISOString(),
            auditReferenceId: auditId,
          },
        };
        const updatedVersion = await transactionClient.quoteVersion.update({
          where: { id: quoteState.currentVersion.id },
          data: {
            priceSnapshot,
            totalsSnapshot: {
              ...jsonRecord(quoteState.currentVersion.totalsSnapshot),
              pendingCalculation: true,
              source: "manual-commercial-adjustment",
            },
          },
        });
        const afterSnapshot = quoteVersionCommercialAuditSnapshot(updatedVersion);
        const auditLog = await transactionClient.auditLog.create({
          data: {
            id: auditId,
            tenantId: tenantIdFromScope(scope),
            actorUserId: data.actorUserId ?? null,
            action: AuditAction.PRICING_OVERRIDE_APPLIED,
            entityType: "QuoteVersion",
            entityId: updatedVersion.id,
            beforeSnapshot,
            afterSnapshot,
            metadata: {
              adjustmentType: "quote-discount",
              field: "priceSnapshot.quoteDiscount",
              quoteId: quoteState.quote.id,
              quoteVersionId: updatedVersion.id,
              quoteNumber: quoteState.quote.quoteNumber,
              amountMinor:
                data.amountMinor === null || data.amountMinor === undefined
                  ? null
                  : minorValueAuditString(data.amountMinor),
              basisPoints: data.basisPoints ?? null,
              reason: data.reason.trim(),
            },
          },
        });

        return {
          record: updatedVersion,
          auditLog,
        };
      });
    },

    async updateTenantQuoteVersionCalculation(
      scope: TenantDataScope,
      quoteVersionId: string,
      data: TenantQuoteVersionCalculationUpdateInput,
    ) {
      const quoteState = await getMutableCurrentQuoteStateForVersion(scope, quoteVersionId);

      if (!quoteState) {
        return null;
      }

      return client.quoteVersion.update({
        where: { id: quoteVersionId },
        data: compactRecord({
          subtotalMinor: data.subtotalMinor,
          vatMinor: data.vatMinor,
          totalMinor: data.totalMinor,
          totalsSnapshot: data.totalsSnapshot,
          warningsSnapshot: data.warningsSnapshot,
          traceSummary: data.traceSummary,
          itemSnapshot: data.itemSnapshot,
        }),
      });
    },

    async updateTenantQuoteItemCalculation(
      scope: TenantDataScope,
      quoteItemId: string,
      data: TenantQuoteItemCalculationUpdateInput,
    ) {
      const existingItem = await access.getTenantQuoteItem(scope, quoteItemId);

      if (!existingItem) {
        return null;
      }

      const quoteState = await getMutableCurrentQuoteStateForItem(scope, existingItem);

      if (!quoteState) {
        return null;
      }

      return client.quoteItem.update({
        where: { id: quoteItemId },
        data,
      });
    },

    async upsertTenantQuoteCalculationResult(
      scope: TenantDataScope,
      quoteVersionId: string,
      data: TenantQuoteCalculationResultWriteInput,
    ) {
      const quoteState = await getMutableCurrentQuoteStateForVersion(scope, quoteVersionId);

      if (!quoteState) {
        return null;
      }

      const existingResult = await access.getTenantQuoteCalculationResult(scope, quoteVersionId);
      const resultData = {
        calculatorVersion: data.calculatorVersion ?? null,
        inputHash: data.inputHash ?? null,
        inputSnapshot: data.inputSnapshot,
        outputSnapshot: data.outputSnapshot,
        warnings: data.warnings ?? null,
        trace: data.trace ?? null,
      };

      if (existingResult) {
        return client.quoteCalculationResult.update({
          where: { id: existingResult.id },
          data: resultData,
        });
      }

      return client.quoteCalculationResult.create({
        data: {
          tenantId: tenantIdFromScope(scope),
          quoteVersionId,
          ...resultData,
        },
      });
    },

    async createTenantQuoteDocument(
      scope: TenantDataScope,
      quoteVersionId: string,
      data: TenantQuoteDocumentWriteInput,
    ) {
      return runTenantDataTransaction(client, async (transactionClient) => {
        const transactionAccess = createTenantDataAccess(transactionClient, options);
        const quoteVersion = await transactionAccess.getTenantQuoteVersion(scope, quoteVersionId);

        if (!quoteVersion) {
          return null;
        }

        const document = await transactionClient.document.create({
          data: {
            tenantId: tenantIdFromScope(scope),
            quoteVersionId,
            type: DocumentType.QUOTE_PDF,
            templateKey: data.templateKey,
            fileName: data.fileName,
            storageKey: data.storageKey,
            mimeType: data.mimeType,
            checksum: data.checksum,
            visibleTotalsSnapshot: data.visibleTotalsSnapshot,
            generatedById: data.actorUserId ?? null,
          },
        });

        await transactionClient.auditLog.create({
          data: {
            tenantId: tenantIdFromScope(scope),
            actorUserId: data.actorUserId ?? null,
            action: AuditAction.DOCUMENT_GENERATED,
            entityType: "Document",
            entityId: document.id,
            afterSnapshot: documentAuditSnapshot(document),
            metadata: {
              quoteId: quoteVersion.quoteId,
              quoteVersionId,
              templateKey: data.templateKey,
              fileName: data.fileName,
              storageKey: data.storageKey,
              checksum: data.checksum,
            },
          },
        });

        return document;
      });
    },

    async lockTenantQuoteVersion(
      scope: TenantDataScope,
      quoteId: string,
      data: TenantQuoteLockInput = {},
    ): Promise<TenantQuoteLifecycleResult | null> {
      return runTenantDataTransaction(client, async (transactionClient) => {
        const transactionAccess = createTenantDataAccess(transactionClient, options);
        const quoteState = await transactionAccess.getTenantQuoteWithCurrentVersion(scope, quoteId);

        if (!quoteState?.currentVersion || !isDraftVersionMutable(quoteState.currentVersion)) {
          return null;
        }

        const lockedAt = new Date();
        const targetStatus =
          data.status === QuoteVersionStatus.SENT
            ? QuoteVersionStatus.SENT
            : QuoteVersionStatus.LOCKED;
        const updatedVersion = await transactionClient.quoteVersion.update({
          where: { id: quoteState.currentVersion.id },
          data: {
            status: targetStatus,
            isLocked: true,
            lockedAt,
            sentAt: targetStatus === QuoteVersionStatus.SENT ? lockedAt : quoteState.currentVersion.sentAt,
          },
        });
        const updatedQuote =
          targetStatus === QuoteVersionStatus.SENT
            ? await transactionClient.quote.update({
                where: { id: quoteState.quote.id },
                data: {
                  status: QuoteStatus.SENT,
                },
              })
            : quoteState.quote;

        await transactionClient.auditLog.create({
          data: {
            tenantId: tenantIdFromScope(scope),
            actorUserId: data.actorUserId ?? null,
            action:
              targetStatus === QuoteVersionStatus.SENT
                ? AuditAction.QUOTE_SENT
                : AuditAction.QUOTE_VERSION_LOCKED,
            entityType: "QuoteVersion",
            entityId: updatedVersion.id,
            beforeSnapshot: quoteVersionAuditSnapshot(quoteState.currentVersion),
            afterSnapshot: quoteVersionAuditSnapshot(updatedVersion),
            metadata: {
              quoteId: quoteState.quote.id,
              quoteNumber: quoteState.quote.quoteNumber,
              targetStatus,
            },
          },
        });

        return {
          quote: updatedQuote,
          currentVersion: updatedVersion,
        };
      });
    },

    async createTenantQuoteRevision(
      scope: TenantDataScope,
      quoteId: string,
      data: TenantQuoteRevisionInput = {},
    ): Promise<TenantQuoteRevisionResult | null> {
      return runTenantDataTransaction(client, async (transactionClient) => {
        const transactionAccess = createTenantDataAccess(transactionClient, options);
        const quoteState = await transactionAccess.getTenantQuoteWithCurrentVersion(scope, quoteId);

        if (!quoteState) {
          return null;
        }

        const versions = await transactionAccess.listTenantQuoteVersions(scope, quoteState.quote.id);
        const sourceVersion = quoteState.currentVersion ?? latestQuoteVersion(versions);

        if (!sourceVersion || isDraftVersionMutable(sourceVersion)) {
          return null;
        }

        const sourceItems = await transactionAccess.listTenantQuoteItems(scope, sourceVersion.id);
        const nextVersionNumber =
          versions.reduce((highest, version) => Math.max(highest, version.versionNumber), 0) + 1;
        const newVersion = await transactionClient.quoteVersion.create({
          data: {
            tenantId: tenantIdFromScope(scope),
            quoteId: quoteState.quote.id,
            versionNumber: nextVersionNumber,
            status: QuoteVersionStatus.DRAFT,
            isLocked: false,
            currency: sourceVersion.currency,
            customerSnapshot: cloneJsonValue(sourceVersion.customerSnapshot),
            companySettingsSnapshot: cloneJsonValue(sourceVersion.companySettingsSnapshot),
            priceSnapshot: cloneNullableJsonValue(sourceVersion.priceSnapshot),
            itemSnapshot: cloneNullableJsonValue(sourceVersion.itemSnapshot),
            totalsSnapshot: cloneNullableJsonValue(sourceVersion.totalsSnapshot),
            warningsSnapshot: cloneNullableJsonValue(sourceVersion.warningsSnapshot),
            traceSummary: cloneNullableJsonValue(sourceVersion.traceSummary),
            subtotalMinor: sourceVersion.subtotalMinor,
            vatMinor: sourceVersion.vatMinor,
            totalMinor: sourceVersion.totalMinor,
            createdById: data.actorUserId ?? sourceVersion.createdById ?? null,
            lockedAt: null,
            sentAt: null,
          },
        });
        const copiedItems: QuoteItem[] = [];

        for (const item of sourceItems) {
          const copiedItem = await transactionClient.quoteItem.create({
            data: {
              tenantId: tenantIdFromScope(scope),
              quoteVersionId: newVersion.id,
              type: item.type,
              sortOrder: item.sortOrder,
              quantity: item.quantity,
              widthMm: item.widthMm,
              heightMm: item.heightMm,
              customerDescription: item.customerDescription,
              internalNotes: item.internalNotes,
              configurationSnapshot: cloneJsonValue(item.configurationSnapshot),
              catalogSnapshot: cloneNullableJsonValue(item.catalogSnapshot),
              calculationSnapshot: cloneNullableJsonValue(item.calculationSnapshot),
              totalsSnapshot: cloneNullableJsonValue(item.totalsSnapshot),
            },
          });

          copiedItems.push(copiedItem);
        }

        const updatedQuote = await transactionClient.quote.update({
          where: { id: quoteState.quote.id },
          data: {
            currentVersionId: newVersion.id,
            status: QuoteStatus.REVISED,
          },
        });

        await transactionClient.auditLog.create({
          data: {
            tenantId: tenantIdFromScope(scope),
            actorUserId: data.actorUserId ?? null,
            action: AuditAction.QUOTE_VERSION_CREATED,
            entityType: "QuoteVersion",
            entityId: newVersion.id,
            beforeSnapshot: quoteVersionAuditSnapshot(sourceVersion),
            afterSnapshot: quoteVersionAuditSnapshot(newVersion),
            metadata: {
              quoteId: quoteState.quote.id,
              quoteNumber: quoteState.quote.quoteNumber,
              sourceVersionId: sourceVersion.id,
              sourceVersionNumber: sourceVersion.versionNumber,
              newVersionNumber: newVersion.versionNumber,
              copiedItemCount: copiedItems.length,
              reason: "quote-revision",
            },
          },
        });

        return {
          quote: updatedQuote,
          sourceVersion,
          currentVersion: newVersion,
          items: copiedItems,
        };
      });
    },
  };

  async function supplierBelongsToTenant(scope: TenantDataScope, supplierId?: string | null) {
    return !supplierId || Boolean(await access.getTenantSupplier(scope, supplierId));
  }

  async function profileSystemBelongsToTenant(
    scope: TenantDataScope,
    profileSystemId?: string | null,
  ) {
    return !profileSystemId || Boolean(await access.getTenantProfileSystem(scope, profileSystemId));
  }

  async function priceListBelongsToTenant(scope: TenantDataScope, priceListId: string) {
    return Boolean(await access.getTenantPriceList(scope, priceListId));
  }

  async function catalogItemBelongsToTenant(
    scope: TenantDataScope,
    itemType: PriceListItemType,
    catalogItemId: string,
  ) {
    if (!catalogItemId.trim()) {
      return false;
    }

    switch (itemType) {
      case PriceListItemType.PROFILE_ITEM:
        return Boolean(await access.getTenantProfileItem(scope, catalogItemId));
      case PriceListItemType.GLASS_PACKAGE:
        return Boolean(await access.getTenantGlassPackage(scope, catalogItemId));
      case PriceListItemType.HARDWARE_KIT:
        return Boolean(await access.getTenantHardwareKit(scope, catalogItemId));
      case PriceListItemType.COLOR_FINISH:
        return Boolean(await access.getTenantColorFinish(scope, catalogItemId));
      case PriceListItemType.ACCESSORY:
        return Boolean(await access.getTenantAccessory(scope, catalogItemId));
      case PriceListItemType.SERVICE_ITEM:
        return Boolean(await access.getTenantServiceItem(scope, catalogItemId));
      case PriceListItemType.TAX_RATE:
        return Boolean(await access.getTenantTaxRate(scope, catalogItemId));
      case PriceListItemType.CUSTOM:
        return true;
      default:
        return false;
    }
  }

  async function getMutableCurrentQuoteStateForVersion(
    scope: TenantDataScope,
    quoteVersionId: string,
  ) {
    const quoteVersion = await access.getTenantQuoteVersion(scope, quoteVersionId);

    if (!quoteVersion) {
      return null;
    }

    const quoteState = await access.getTenantQuoteWithCurrentVersion(scope, quoteVersion.quoteId);

    if (
      !quoteState?.currentVersion ||
      quoteState.currentVersion.id !== quoteVersionId ||
      !isDraftVersionMutable(quoteState.currentVersion)
    ) {
      return null;
    }

    return quoteState;
  }

  async function getMutableCurrentQuoteStateForItem(
    scope: TenantDataScope,
    item: QuoteItem,
  ) {
    return getMutableCurrentQuoteStateForVersion(scope, item.quoteVersionId);
  }

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

export function getTenantQuoteWithCurrentVersion(scope: TenantDataScope, quoteId: string) {
  return tenantDataAccess.getTenantQuoteWithCurrentVersion(scope, quoteId);
}

export function listTenantQuotes(scope: TenantDataScope, options?: ListTenantQuotesOptions) {
  return tenantDataAccess.listTenantQuotes(scope, options);
}

export function listTenantSavedFilters(
  scope: TenantDataScope,
  options?: ListTenantSavedFiltersOptions,
) {
  return tenantDataAccess.listTenantSavedFilters(scope, options);
}

export function getTenantSavedFilter(scope: TenantDataScope, savedFilterId: string) {
  return tenantDataAccess.getTenantSavedFilter(scope, savedFilterId);
}

export function upsertTenantSavedFilter(
  scope: TenantDataScope,
  data: TenantSavedFilterWriteInput,
) {
  return tenantDataAccess.upsertTenantSavedFilter(scope, data);
}

export function getTenantCompanySettings(scope: TenantDataScope) {
  return tenantDataAccess.getTenantCompanySettings(scope);
}

export function getTenantCompanySettingsById(scope: TenantDataScope, settingsId: string) {
  return tenantDataAccess.getTenantCompanySettingsById(scope, settingsId);
}

export function updateTenantCompanySettings(
  scope: TenantDataScope,
  settingsId: string | null,
  data: TenantCompanySettingsWriteInput,
) {
  return tenantDataAccess.updateTenantCompanySettings(scope, settingsId, data);
}

export function getTenantQuoteNumberSettings(scope: TenantDataScope) {
  return tenantDataAccess.getTenantQuoteNumberSettings(scope);
}

export function getTenantQuoteNumberSettingsById(scope: TenantDataScope, settingsId: string) {
  return tenantDataAccess.getTenantQuoteNumberSettingsById(scope, settingsId);
}

export function updateTenantQuoteNumberSettings(
  scope: TenantDataScope,
  settingsId: string | null,
  data: TenantQuoteNumberSettingsWriteInput,
) {
  return tenantDataAccess.updateTenantQuoteNumberSettings(scope, settingsId, data);
}

export function getTenantUserPreference(scope: TenantDataScope, userId: string) {
  return tenantDataAccess.getTenantUserPreference(scope, userId);
}

export function upsertTenantUserPreference(
  scope: TenantDataScope,
  data: TenantUserPreferenceWriteInput,
) {
  return tenantDataAccess.upsertTenantUserPreference(scope, data);
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

export function listTenantQuoteItems(scope: TenantDataScope, quoteVersionId: string) {
  return tenantDataAccess.listTenantQuoteItems(scope, quoteVersionId);
}

export function getTenantQuoteItem(scope: TenantDataScope, quoteItemId: string) {
  return tenantDataAccess.getTenantQuoteItem(scope, quoteItemId);
}

export function getTenantQuoteCalculationResult(
  scope: TenantDataScope,
  quoteVersionId: string,
) {
  return tenantDataAccess.getTenantQuoteCalculationResult(scope, quoteVersionId);
}

export function getTenantDocument(scope: TenantDataScope, documentId: string) {
  return tenantDataAccess.getTenantDocument(scope, documentId);
}

export function getTenantQuoteDocument(
  scope: TenantDataScope,
  quoteId: string,
  documentId: string,
) {
  return tenantDataAccess.getTenantQuoteDocument(scope, quoteId, documentId);
}

export function listTenantQuoteDocuments(scope: TenantDataScope, quoteVersionId: string) {
  return tenantDataAccess.listTenantQuoteDocuments(scope, quoteVersionId);
}

export function createTenantQuoteItem(
  scope: TenantDataScope,
  quoteId: string,
  data: TenantQuoteItemWriteInput,
) {
  return tenantDataAccess.createTenantQuoteItem(scope, quoteId, data);
}

export function updateTenantQuoteItem(
  scope: TenantDataScope,
  quoteItemId: string,
  data: TenantQuoteItemUpdateInput,
) {
  return tenantDataAccess.updateTenantQuoteItem(scope, quoteItemId, data);
}

export function deleteTenantQuoteItem(scope: TenantDataScope, quoteItemId: string) {
  return tenantDataAccess.deleteTenantQuoteItem(scope, quoteItemId);
}

export function applyTenantQuoteItemManualOverride(
  scope: TenantDataScope,
  quoteItemId: string,
  data: TenantQuoteItemManualOverrideInput,
) {
  return tenantDataAccess.applyTenantQuoteItemManualOverride(scope, quoteItemId, data);
}

export function applyTenantQuoteDiscount(
  scope: TenantDataScope,
  quoteId: string,
  data: TenantQuoteDiscountInput,
) {
  return tenantDataAccess.applyTenantQuoteDiscount(scope, quoteId, data);
}

export function updateTenantQuoteVersionCalculation(
  scope: TenantDataScope,
  quoteVersionId: string,
  data: TenantQuoteVersionCalculationUpdateInput,
) {
  return tenantDataAccess.updateTenantQuoteVersionCalculation(scope, quoteVersionId, data);
}

export function updateTenantQuoteItemCalculation(
  scope: TenantDataScope,
  quoteItemId: string,
  data: TenantQuoteItemCalculationUpdateInput,
) {
  return tenantDataAccess.updateTenantQuoteItemCalculation(scope, quoteItemId, data);
}

export function upsertTenantQuoteCalculationResult(
  scope: TenantDataScope,
  quoteVersionId: string,
  data: TenantQuoteCalculationResultWriteInput,
) {
  return tenantDataAccess.upsertTenantQuoteCalculationResult(scope, quoteVersionId, data);
}

export function createTenantQuoteDocument(
  scope: TenantDataScope,
  quoteVersionId: string,
  data: TenantQuoteDocumentWriteInput,
) {
  return tenantDataAccess.createTenantQuoteDocument(scope, quoteVersionId, data);
}

export function lockTenantQuoteVersion(
  scope: TenantDataScope,
  quoteId: string,
  data?: TenantQuoteLockInput,
) {
  return tenantDataAccess.lockTenantQuoteVersion(scope, quoteId, data);
}

export function createTenantQuoteRevision(
  scope: TenantDataScope,
  quoteId: string,
  data?: TenantQuoteRevisionInput,
) {
  return tenantDataAccess.createTenantQuoteRevision(scope, quoteId, data);
}

export function listTenantSuppliers(scope: TenantDataScope) {
  return tenantDataAccess.listTenantSuppliers(scope);
}

export function getTenantSupplier(scope: TenantDataScope, supplierId: string) {
  return tenantDataAccess.getTenantSupplier(scope, supplierId);
}

export function createTenantSupplier(scope: TenantDataScope, data: TenantSupplierWriteInput) {
  return tenantDataAccess.createTenantSupplier(scope, data);
}

export function updateTenantSupplier(
  scope: TenantDataScope,
  supplierId: string,
  data: TenantSupplierWriteInput,
) {
  return tenantDataAccess.updateTenantSupplier(scope, supplierId, data);
}

export function archiveTenantSupplier(scope: TenantDataScope, supplierId: string) {
  return tenantDataAccess.archiveTenantSupplier(scope, supplierId);
}

export function listTenantProfileSystems(scope: TenantDataScope) {
  return tenantDataAccess.listTenantProfileSystems(scope);
}

export function getTenantProfileSystem(scope: TenantDataScope, profileSystemId: string) {
  return tenantDataAccess.getTenantProfileSystem(scope, profileSystemId);
}

export function createTenantProfileSystem(
  scope: TenantDataScope,
  data: TenantProfileSystemWriteInput,
) {
  return tenantDataAccess.createTenantProfileSystem(scope, data);
}

export function updateTenantProfileSystem(
  scope: TenantDataScope,
  profileSystemId: string,
  data: TenantProfileSystemWriteInput,
) {
  return tenantDataAccess.updateTenantProfileSystem(scope, profileSystemId, data);
}

export function archiveTenantProfileSystem(
  scope: TenantDataScope,
  profileSystemId: string,
) {
  return tenantDataAccess.archiveTenantProfileSystem(scope, profileSystemId);
}

export function listTenantProfileItems(scope: TenantDataScope) {
  return tenantDataAccess.listTenantProfileItems(scope);
}

export function getTenantProfileItem(scope: TenantDataScope, profileItemId: string) {
  return tenantDataAccess.getTenantProfileItem(scope, profileItemId);
}

export function createTenantProfileItem(
  scope: TenantDataScope,
  data: TenantProfileItemWriteInput,
) {
  return tenantDataAccess.createTenantProfileItem(scope, data);
}

export function updateTenantProfileItem(
  scope: TenantDataScope,
  profileItemId: string,
  data: TenantProfileItemWriteInput,
) {
  return tenantDataAccess.updateTenantProfileItem(scope, profileItemId, data);
}

export function archiveTenantProfileItem(scope: TenantDataScope, profileItemId: string) {
  return tenantDataAccess.archiveTenantProfileItem(scope, profileItemId);
}

export function listTenantGlassPackages(scope: TenantDataScope) {
  return tenantDataAccess.listTenantGlassPackages(scope);
}

export function getTenantGlassPackage(scope: TenantDataScope, glassPackageId: string) {
  return tenantDataAccess.getTenantGlassPackage(scope, glassPackageId);
}

export function createTenantGlassPackage(
  scope: TenantDataScope,
  data: TenantGlassPackageWriteInput,
) {
  return tenantDataAccess.createTenantGlassPackage(scope, data);
}

export function updateTenantGlassPackage(
  scope: TenantDataScope,
  glassPackageId: string,
  data: TenantGlassPackageWriteInput,
) {
  return tenantDataAccess.updateTenantGlassPackage(scope, glassPackageId, data);
}

export function archiveTenantGlassPackage(scope: TenantDataScope, glassPackageId: string) {
  return tenantDataAccess.archiveTenantGlassPackage(scope, glassPackageId);
}

export function listTenantHardwareKits(scope: TenantDataScope) {
  return tenantDataAccess.listTenantHardwareKits(scope);
}

export function getTenantHardwareKit(scope: TenantDataScope, hardwareKitId: string) {
  return tenantDataAccess.getTenantHardwareKit(scope, hardwareKitId);
}

export function createTenantHardwareKit(
  scope: TenantDataScope,
  data: TenantHardwareKitWriteInput,
) {
  return tenantDataAccess.createTenantHardwareKit(scope, data);
}

export function updateTenantHardwareKit(
  scope: TenantDataScope,
  hardwareKitId: string,
  data: TenantHardwareKitWriteInput,
) {
  return tenantDataAccess.updateTenantHardwareKit(scope, hardwareKitId, data);
}

export function archiveTenantHardwareKit(scope: TenantDataScope, hardwareKitId: string) {
  return tenantDataAccess.archiveTenantHardwareKit(scope, hardwareKitId);
}

export function listTenantColorFinishes(scope: TenantDataScope) {
  return tenantDataAccess.listTenantColorFinishes(scope);
}

export function getTenantColorFinish(scope: TenantDataScope, colorFinishId: string) {
  return tenantDataAccess.getTenantColorFinish(scope, colorFinishId);
}

export function createTenantColorFinish(
  scope: TenantDataScope,
  data: TenantColorFinishWriteInput,
) {
  return tenantDataAccess.createTenantColorFinish(scope, data);
}

export function updateTenantColorFinish(
  scope: TenantDataScope,
  colorFinishId: string,
  data: TenantColorFinishWriteInput,
) {
  return tenantDataAccess.updateTenantColorFinish(scope, colorFinishId, data);
}

export function archiveTenantColorFinish(scope: TenantDataScope, colorFinishId: string) {
  return tenantDataAccess.archiveTenantColorFinish(scope, colorFinishId);
}

export function listTenantAccessories(scope: TenantDataScope) {
  return tenantDataAccess.listTenantAccessories(scope);
}

export function getTenantAccessory(scope: TenantDataScope, accessoryId: string) {
  return tenantDataAccess.getTenantAccessory(scope, accessoryId);
}

export function createTenantAccessory(scope: TenantDataScope, data: TenantAccessoryWriteInput) {
  return tenantDataAccess.createTenantAccessory(scope, data);
}

export function updateTenantAccessory(
  scope: TenantDataScope,
  accessoryId: string,
  data: TenantAccessoryWriteInput,
) {
  return tenantDataAccess.updateTenantAccessory(scope, accessoryId, data);
}

export function archiveTenantAccessory(scope: TenantDataScope, accessoryId: string) {
  return tenantDataAccess.archiveTenantAccessory(scope, accessoryId);
}

export function listTenantServiceItems(scope: TenantDataScope) {
  return tenantDataAccess.listTenantServiceItems(scope);
}

export function getTenantServiceItem(scope: TenantDataScope, serviceItemId: string) {
  return tenantDataAccess.getTenantServiceItem(scope, serviceItemId);
}

export function createTenantServiceItem(scope: TenantDataScope, data: TenantServiceItemWriteInput) {
  return tenantDataAccess.createTenantServiceItem(scope, data);
}

export function updateTenantServiceItem(
  scope: TenantDataScope,
  serviceItemId: string,
  data: TenantServiceItemWriteInput,
) {
  return tenantDataAccess.updateTenantServiceItem(scope, serviceItemId, data);
}

export function archiveTenantServiceItem(scope: TenantDataScope, serviceItemId: string) {
  return tenantDataAccess.archiveTenantServiceItem(scope, serviceItemId);
}

export function listTenantTaxRates(scope: TenantDataScope) {
  return tenantDataAccess.listTenantTaxRates(scope);
}

export function getTenantTaxRate(scope: TenantDataScope, taxRateId: string) {
  return tenantDataAccess.getTenantTaxRate(scope, taxRateId);
}

export function createTenantTaxRate(scope: TenantDataScope, data: TenantTaxRateWriteInput) {
  return tenantDataAccess.createTenantTaxRate(scope, data);
}

export function updateTenantTaxRate(
  scope: TenantDataScope,
  taxRateId: string,
  data: TenantTaxRateWriteInput,
) {
  return tenantDataAccess.updateTenantTaxRate(scope, taxRateId, data);
}

export function archiveTenantTaxRate(scope: TenantDataScope, taxRateId: string) {
  return tenantDataAccess.archiveTenantTaxRate(scope, taxRateId);
}

export function listTenantPriceLists(scope: TenantDataScope) {
  return tenantDataAccess.listTenantPriceLists(scope);
}

export function listTenantPriceListItems(
  scope: TenantDataScope,
  options?: ListTenantPriceListItemsOptions,
) {
  return tenantDataAccess.listTenantPriceListItems(scope, options);
}

export function getTenantPriceListItem(scope: TenantDataScope, priceListItemId: string) {
  return tenantDataAccess.getTenantPriceListItem(scope, priceListItemId);
}

export function createTenantPriceListItem(
  scope: TenantDataScope,
  data: TenantPriceListItemWriteInput,
) {
  return tenantDataAccess.createTenantPriceListItem(scope, data);
}

export function updateTenantPriceListItem(
  scope: TenantDataScope,
  priceListItemId: string,
  data: TenantPriceListItemWriteInput,
) {
  return tenantDataAccess.updateTenantPriceListItem(scope, priceListItemId, data);
}

export function archiveTenantPriceListItem(scope: TenantDataScope, priceListItemId: string) {
  return tenantDataAccess.archiveTenantPriceListItem(scope, priceListItemId);
}

export function listTenantPricingRules(
  scope: TenantDataScope,
  options?: ListTenantPricingRulesOptions,
) {
  return tenantDataAccess.listTenantPricingRules(scope, options);
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

function companySettingsWriteData(data: TenantCompanySettingsWriteInput) {
  return {
    legalName: data.legalName,
    displayName: data.displayName,
    taxIdentifier: data.taxIdentifier ?? null,
    registrationNumber: data.registrationNumber ?? null,
    addressLine1: data.addressLine1 ?? null,
    addressLine2: data.addressLine2 ?? null,
    city: data.city ?? null,
    country: data.country ?? null,
    phone: data.phone ?? null,
    email: data.email ?? null,
    website: data.website ?? null,
    defaultCurrency: normalizedCurrency(data.defaultCurrency),
    defaultPdfTemplate: normalizedTemplateKey(data.defaultPdfTemplate),
    vatRateBasisPoints: data.vatRateBasisPoints ?? null,
    offerValidityDays: data.offerValidityDays ?? null,
    paymentTermsText: data.paymentTermsText ?? null,
    warrantyText: data.warrantyText ?? null,
    deliveryText: data.deliveryText ?? null,
    advancePaymentText: data.advancePaymentText ?? null,
    pdfFooterText: data.pdfFooterText ?? null,
  };
}

function quoteNumberSettingsWriteData(data: TenantQuoteNumberSettingsWriteInput) {
  return {
    prefix: normalizedQuoteNumberPrefix(data.prefix),
    nextNumber: Math.max(1, Math.trunc(data.nextNumber)),
    datePattern: data.datePattern,
  };
}

function userPreferenceWriteData(data: TenantUserPreferenceWriteInput) {
  return {
    defaultPdfTemplate: data.defaultPdfTemplate
      ? normalizedTemplateKey(data.defaultPdfTemplate)
      : null,
    dashboardShortcuts: data.dashboardShortcuts ?? [],
    language: data.language === "ro" ? "ro" : "ro",
  };
}

async function getOrCreateTenantQuoteNumberSettings(
  client: TenantDataClient,
  scope: TenantDataScope,
) {
  const existing = await client.quoteNumberSettings.findFirst({
    where: tenantWhere(scope),
  });

  if (existing) {
    return existing;
  }

  return client.quoteNumberSettings.create({
    data: {
      tenantId: tenantIdFromScope(scope),
      prefix: defaultQuoteNumberPrefix,
      nextNumber: 1,
      datePattern: QuoteNumberDatePattern.YEAR,
    },
  });
}

export function previewTenantQuoteNumber(
  settings: Pick<QuoteNumberSettings, "datePattern" | "nextNumber" | "prefix">,
  date: Date = new Date(),
) {
  const sequenceNumber = Math.max(1, Math.trunc(settings.nextNumber));
  const parts = [
    normalizedQuoteNumberPrefix(settings.prefix),
    quoteNumberDateSegment(settings.datePattern, date),
    String(sequenceNumber).padStart(quoteNumberPadding, "0"),
  ].filter(Boolean);

  return parts.join("-");
}

function quoteNumberDateSegment(pattern: QuoteNumberDatePattern, date: Date) {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");

  switch (pattern) {
    case QuoteNumberDatePattern.NONE:
      return null;
    case QuoteNumberDatePattern.YEAR_MONTH:
      return `${year}${month}`;
    case QuoteNumberDatePattern.YEAR:
    default:
      return year;
  }
}

function normalizedQuoteNumberPrefix(value: string) {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20)
      .toUpperCase() || defaultQuoteNumberPrefix
  );
}

function normalizedCurrency(value: string) {
  return value.trim().toUpperCase().slice(0, 3) || "RON";
}

function normalizedTemplateKey(value: string) {
  return value === "template-b" ? "template-b" : "template-a";
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
    taxIdentifier: companySettings.taxIdentifier,
    registrationNumber: companySettings.registrationNumber,
    addressLine1: companySettings.addressLine1,
    addressLine2: companySettings.addressLine2,
    city: companySettings.city,
    country: companySettings.country,
    phone: companySettings.phone,
    email: companySettings.email,
    website: companySettings.website,
    logoUrl: companySettings.logoUrl,
    defaultCurrency: companySettings.defaultCurrency,
    defaultPdfTemplate: companySettings.defaultPdfTemplate,
    vatRateBasisPoints: companySettings.vatRateBasisPoints,
    offerValidityDays: companySettings.offerValidityDays,
    paymentTermsText: companySettings.paymentTermsText,
    warrantyText: companySettings.warrantyText,
    deliveryText: companySettings.deliveryText,
    advancePaymentText: companySettings.advancePaymentText,
    pdfFooterText: companySettings.pdfFooterText,
  };
}

function isDraftVersionMutable(quoteVersion: QuoteVersion) {
  return (
    quoteVersion.status === QuoteVersionStatus.DRAFT &&
    !quoteVersion.isLocked &&
    !quoteVersion.lockedAt &&
    !quoteVersion.sentAt
  );
}

function emptyDraftItemTotalsSnapshot() {
  return {
    subtotalMinor: 0,
    vatMinor: 0,
    totalMinor: 0,
    pendingCalculation: true,
    source: "quote-item-draft-editor",
  };
}

function compactRecord(record: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );
}

function archiveCatalogRecordData() {
  return {
    isActive: false,
    deletedAt: new Date(),
  };
}

function latestQuoteVersion(versions: QuoteVersion[]) {
  return versions.reduce<QuoteVersion | null>(
    (latest, version) =>
      !latest || version.versionNumber > latest.versionNumber ? version : latest,
    null,
  );
}

function cloneJsonValue<TValue>(value: TValue): TValue {
  if (value === undefined) {
    return null as TValue;
  }

  return JSON.parse(JSON.stringify(value)) as TValue;
}

function cloneNullableJsonValue<TValue>(value: TValue | null | undefined): TValue | null {
  return value === null || value === undefined ? null : cloneJsonValue(value);
}

function quoteVersionAuditSnapshot(quoteVersion: QuoteVersion) {
  return {
    id: quoteVersion.id,
    tenantId: quoteVersion.tenantId,
    quoteId: quoteVersion.quoteId,
    versionNumber: quoteVersion.versionNumber,
    status: quoteVersion.status,
    isLocked: quoteVersion.isLocked,
    lockedAt: quoteVersion.lockedAt?.toISOString() ?? null,
    sentAt: quoteVersion.sentAt?.toISOString() ?? null,
    subtotalMinor: minorValueAuditString(quoteVersion.subtotalMinor),
    vatMinor: minorValueAuditString(quoteVersion.vatMinor),
    totalMinor: minorValueAuditString(quoteVersion.totalMinor),
  };
}

function documentAuditSnapshot(document: Document) {
  return {
    id: document.id,
    tenantId: document.tenantId,
    quoteVersionId: document.quoteVersionId,
    type: document.type,
    templateKey: document.templateKey,
    fileName: document.fileName,
    storageKey: document.storageKey,
    mimeType: document.mimeType,
    checksum: document.checksum,
    generatedById: document.generatedById,
    createdAt: document.createdAt?.toISOString() ?? null,
  };
}

function companySettingsAuditSnapshot(companySettings: CompanySettings) {
  return {
    id: companySettings.id,
    tenantId: companySettings.tenantId,
    legalName: companySettings.legalName,
    displayName: companySettings.displayName,
    taxIdentifier: companySettings.taxIdentifier,
    registrationNumber: companySettings.registrationNumber,
    addressLine1: companySettings.addressLine1,
    addressLine2: companySettings.addressLine2,
    city: companySettings.city,
    country: companySettings.country,
    phone: companySettings.phone,
    email: companySettings.email,
    website: companySettings.website,
    defaultCurrency: companySettings.defaultCurrency,
    defaultPdfTemplate: companySettings.defaultPdfTemplate,
    vatRateBasisPoints: companySettings.vatRateBasisPoints,
    offerValidityDays: companySettings.offerValidityDays,
    paymentTermsText: companySettings.paymentTermsText,
    warrantyText: companySettings.warrantyText,
    deliveryText: companySettings.deliveryText,
    advancePaymentText: companySettings.advancePaymentText,
    pdfFooterText: companySettings.pdfFooterText,
  };
}

function quoteNumberSettingsAuditSnapshot(settings: QuoteNumberSettings) {
  return {
    id: settings.id,
    tenantId: settings.tenantId,
    prefix: settings.prefix,
    nextNumber: settings.nextNumber,
    datePattern: settings.datePattern,
  };
}

function quoteItemCommercialAuditSnapshot(item: QuoteItem) {
  const configuration = jsonRecord(item.configurationSnapshot);

  return {
    id: item.id,
    tenantId: item.tenantId,
    quoteVersionId: item.quoteVersionId,
    type: item.type,
    quantity: item.quantity,
    manualOverride: cloneNullableJsonValue(configuration.manualOverride),
    totalsSnapshot: cloneNullableJsonValue(item.totalsSnapshot),
  };
}

function quoteVersionCommercialAuditSnapshot(quoteVersion: QuoteVersion) {
  const priceSnapshot = jsonRecord(quoteVersion.priceSnapshot);

  return {
    id: quoteVersion.id,
    tenantId: quoteVersion.tenantId,
    quoteId: quoteVersion.quoteId,
    versionNumber: quoteVersion.versionNumber,
    status: quoteVersion.status,
    isLocked: quoteVersion.isLocked,
    quoteDiscount: cloneNullableJsonValue(priceSnapshot.quoteDiscount),
    subtotalMinor: minorValueAuditString(quoteVersion.subtotalMinor),
    vatMinor: minorValueAuditString(quoteVersion.vatMinor),
    totalMinor: minorValueAuditString(quoteVersion.totalMinor),
    totalsSnapshot: cloneNullableJsonValue(quoteVersion.totalsSnapshot),
  };
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function hasCommercialReason(reason: string) {
  return reason.trim().length > 0 && reason.trim().length <= 500;
}

function isValidMinorAmount(value: bigint | number | null | undefined) {
  if (typeof value === "bigint") {
    return value >= BigInt(0);
  }

  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function hasValidQuoteDiscountValue(
  amountMinor: bigint | number | null | undefined,
  basisPoints: number | null | undefined,
) {
  const hasAmount = amountMinor !== null && amountMinor !== undefined;
  const hasBasisPoints = basisPoints !== null && basisPoints !== undefined;

  if (hasAmount === hasBasisPoints) {
    return false;
  }

  if (hasAmount) {
    if (typeof amountMinor === "bigint") {
      return amountMinor > BigInt(0);
    }

    return typeof amountMinor === "number" && Number.isInteger(amountMinor) && amountMinor > 0;
  }

  return (
    typeof basisPoints === "number" &&
    Number.isInteger(basisPoints) &&
    basisPoints > 0 &&
    basisPoints <= 10_000
  );
}

function commercialAuditId() {
  return `commercial_${randomUUID()}`;
}

function minorValueAuditString(value: bigint | number | null | undefined) {
  return value === null || value === undefined ? "0" : value.toString();
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
