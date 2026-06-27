-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('OWNER', 'ADMIN', 'ESTIMATOR', 'DEALER', 'SUPPORT');

-- CreateEnum
CREATE TYPE "TenantMemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'REVISED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuoteVersionStatus" AS ENUM ('DRAFT', 'LOCKED', 'SENT', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "QuoteItemType" AS ENUM ('WINDOW', 'DOOR', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('QUOTE_PDF', 'QUOTE_PREVIEW', 'OTHER');

-- CreateEnum
CREATE TYPE "QuoteNumberDatePattern" AS ENUM ('NONE', 'YEAR', 'YEAR_MONTH');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('AUTH_LOGIN', 'AUTH_LOGOUT', 'SETTINGS_UPDATED', 'QUOTE_NUMBERING_UPDATED', 'PRICING_UPDATED', 'PRICING_OVERRIDE_APPLIED', 'CATALOG_CREATED', 'CATALOG_UPDATED', 'CATALOG_ARCHIVED', 'QUOTE_CREATED', 'QUOTE_UPDATED', 'QUOTE_VERSION_CREATED', 'QUOTE_VERSION_LOCKED', 'QUOTE_SENT', 'DOCUMENT_GENERATED', 'DOCUMENT_DELETED');

-- CreateEnum
CREATE TYPE "CatalogMaterialType" AS ENUM ('PVC', 'ALUMINIUM', 'OTHER');

-- CreateEnum
CREATE TYPE "ProfileItemType" AS ENUM ('FRAME', 'SASH', 'MULLION', 'TRANSOM', 'THRESHOLD', 'REINFORCEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "CatalogUnit" AS ENUM ('EACH', 'LINEAR_METER', 'SQUARE_METER', 'HOUR', 'FIXED');

-- CreateEnum
CREATE TYPE "PriceListStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PriceListItemType" AS ENUM ('PROFILE_ITEM', 'GLASS_PACKAGE', 'HARDWARE_KIT', 'COLOR_FINISH', 'ACCESSORY', 'SERVICE_ITEM', 'TAX_RATE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PricingRuleType" AS ENUM ('MARKUP', 'DISCOUNT', 'ROUNDING', 'SERVICE_ADDITION', 'TAX', 'OVERRIDE', 'OTHER');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "authProvider" TEXT,
    "authProviderSubject" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL,
    "status" "TenantMemberStatus" NOT NULL DEFAULT 'INVITED',
    "canViewInternalCosts" BOOLEAN NOT NULL DEFAULT false,
    "canApplyCommercialOverrides" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "invitedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3),

    CONSTRAINT "TenantMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "taxIdentifier" TEXT,
    "registrationNumber" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'RON',
    "defaultPdfTemplate" TEXT NOT NULL DEFAULT 'template-a',
    "vatRateBasisPoints" INTEGER,
    "offerValidityDays" INTEGER,
    "paymentTermsText" TEXT,
    "warrantyText" TEXT,
    "deliveryText" TEXT,
    "advancePaymentText" TEXT,
    "pdfFooterText" TEXT,
    "commercialDefaults" JSONB,
    "calculationDefaults" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteNumberSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT 'OF',
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "datePattern" "QuoteNumberDatePattern" NOT NULL DEFAULT 'YEAR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteNumberSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultPdfTemplate" TEXT,
    "dashboardShortcuts" JSONB,
    "language" TEXT NOT NULL DEFAULT 'ro',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileSystem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "materialType" "CatalogMaterialType" NOT NULL,
    "description" TEXT,
    "configuration" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "profileSystemId" TEXT NOT NULL,
    "supplierId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" "ProfileItemType" NOT NULL,
    "unit" "CatalogUnit" NOT NULL DEFAULT 'LINEAR_METER',
    "description" TEXT,
    "deductionRule" JSONB,
    "wasteRule" JSONB,
    "configuration" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlassPackage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "compositionLabel" TEXT,
    "unit" "CatalogUnit" NOT NULL DEFAULT 'SQUARE_METER',
    "minBillableAreaSquareMm" INTEGER,
    "deductionRule" JSONB,
    "configuration" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlassPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardwareKit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" TEXT,
    "openingType" TEXT,
    "unit" "CatalogUnit" NOT NULL DEFAULT 'EACH',
    "quantityRule" JSONB,
    "configuration" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HardwareKit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColorFinish" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "profileSystemId" TEXT,
    "supplierId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "surface" TEXT,
    "configuration" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColorFinish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Accessory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" TEXT,
    "unit" "CatalogUnit" NOT NULL DEFAULT 'EACH',
    "quantityRule" JSONB,
    "configuration" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Accessory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" TEXT,
    "unit" "CatalogUnit" NOT NULL DEFAULT 'FIXED',
    "configuration" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "rateBasisPoints" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "configuration" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceList" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "status" "PriceListStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceListItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,
    "itemType" "PriceListItemType" NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "unit" "CatalogUnit" NOT NULL,
    "costMinor" BIGINT,
    "saleMinor" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "priceListId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "ruleType" "PricingRuleType" NOT NULL,
    "appliesTo" "PriceListItemType",
    "priority" INTEGER NOT NULL DEFAULT 0,
    "configuration" JSONB NOT NULL,
    "requiresBusinessValidation" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "companyName" TEXT,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "taxIdentifier" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siteAddress" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "projectId" TEXT,
    "quoteNumber" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "createdById" TEXT,
    "assignedToId" TEXT,
    "currentVersionId" TEXT,
    "tags" JSONB,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "QuoteVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "customerSnapshot" JSONB NOT NULL,
    "companySettingsSnapshot" JSONB NOT NULL,
    "priceSnapshot" JSONB,
    "itemSnapshot" JSONB,
    "totalsSnapshot" JSONB,
    "warningsSnapshot" JSONB,
    "traceSummary" JSONB,
    "subtotalMinor" BIGINT NOT NULL DEFAULT 0,
    "vatMinor" BIGINT NOT NULL DEFAULT 0,
    "totalMinor" BIGINT NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "lockedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quoteVersionId" TEXT NOT NULL,
    "type" "QuoteItemType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "widthMm" INTEGER,
    "heightMm" INTEGER,
    "customerDescription" TEXT,
    "internalNotes" TEXT,
    "configurationSnapshot" JSONB NOT NULL,
    "catalogSnapshot" JSONB,
    "calculationSnapshot" JSONB,
    "totalsSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteCalculationResult" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quoteVersionId" TEXT NOT NULL,
    "calculatorVersion" TEXT,
    "inputHash" TEXT,
    "inputSnapshot" JSONB NOT NULL,
    "outputSnapshot" JSONB NOT NULL,
    "warnings" JSONB,
    "trace" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteCalculationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quoteVersionId" TEXT,
    "type" "DocumentType" NOT NULL,
    "templateKey" TEXT,
    "fileName" TEXT,
    "storageKey" TEXT,
    "mimeType" TEXT,
    "checksum" TEXT,
    "visibleTotalsSnapshot" JSONB,
    "generatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "beforeSnapshot" JSONB,
    "afterSnapshot" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedFilter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "entityType" TEXT NOT NULL DEFAULT 'Quote',
    "filter" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedFilter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "TenantMember_tenantId_role_idx" ON "TenantMember"("tenantId", "role");

-- CreateIndex
CREATE INDEX "TenantMember_tenantId_status_idx" ON "TenantMember"("tenantId", "status");

-- CreateIndex
CREATE INDEX "TenantMember_userId_idx" ON "TenantMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMember_tenantId_userId_key" ON "TenantMember"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySettings_tenantId_key" ON "CompanySettings"("tenantId");

-- CreateIndex
CREATE INDEX "CompanySettings_tenantId_idx" ON "CompanySettings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteNumberSettings_tenantId_key" ON "QuoteNumberSettings"("tenantId");

-- CreateIndex
CREATE INDEX "QuoteNumberSettings_tenantId_idx" ON "QuoteNumberSettings"("tenantId");

-- CreateIndex
CREATE INDEX "UserPreference_tenantId_userId_idx" ON "UserPreference"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_tenantId_userId_key" ON "UserPreference"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_isActive_idx" ON "Supplier"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_deletedAt_idx" ON "Supplier"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_tenantId_name_key" ON "Supplier"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_tenantId_code_key" ON "Supplier"("tenantId", "code");

-- CreateIndex
CREATE INDEX "ProfileSystem_tenantId_materialType_isActive_idx" ON "ProfileSystem"("tenantId", "materialType", "isActive");

-- CreateIndex
CREATE INDEX "ProfileSystem_tenantId_supplierId_idx" ON "ProfileSystem"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "ProfileSystem_tenantId_deletedAt_idx" ON "ProfileSystem"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileSystem_tenantId_code_key" ON "ProfileSystem"("tenantId", "code");

-- CreateIndex
CREATE INDEX "ProfileItem_tenantId_profileSystemId_idx" ON "ProfileItem"("tenantId", "profileSystemId");

-- CreateIndex
CREATE INDEX "ProfileItem_tenantId_type_idx" ON "ProfileItem"("tenantId", "type");

-- CreateIndex
CREATE INDEX "ProfileItem_tenantId_isActive_idx" ON "ProfileItem"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "ProfileItem_tenantId_deletedAt_idx" ON "ProfileItem"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileItem_tenantId_code_key" ON "ProfileItem"("tenantId", "code");

-- CreateIndex
CREATE INDEX "GlassPackage_tenantId_isActive_idx" ON "GlassPackage"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "GlassPackage_tenantId_supplierId_idx" ON "GlassPackage"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "GlassPackage_tenantId_deletedAt_idx" ON "GlassPackage"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GlassPackage_tenantId_code_key" ON "GlassPackage"("tenantId", "code");

-- CreateIndex
CREATE INDEX "HardwareKit_tenantId_category_idx" ON "HardwareKit"("tenantId", "category");

-- CreateIndex
CREATE INDEX "HardwareKit_tenantId_isActive_idx" ON "HardwareKit"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "HardwareKit_tenantId_supplierId_idx" ON "HardwareKit"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "HardwareKit_tenantId_deletedAt_idx" ON "HardwareKit"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HardwareKit_tenantId_code_key" ON "HardwareKit"("tenantId", "code");

-- CreateIndex
CREATE INDEX "ColorFinish_tenantId_profileSystemId_idx" ON "ColorFinish"("tenantId", "profileSystemId");

-- CreateIndex
CREATE INDEX "ColorFinish_tenantId_isActive_idx" ON "ColorFinish"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "ColorFinish_tenantId_deletedAt_idx" ON "ColorFinish"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ColorFinish_tenantId_code_key" ON "ColorFinish"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Accessory_tenantId_category_idx" ON "Accessory"("tenantId", "category");

-- CreateIndex
CREATE INDEX "Accessory_tenantId_isActive_idx" ON "Accessory"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "Accessory_tenantId_supplierId_idx" ON "Accessory"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "Accessory_tenantId_deletedAt_idx" ON "Accessory"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Accessory_tenantId_code_key" ON "Accessory"("tenantId", "code");

-- CreateIndex
CREATE INDEX "ServiceItem_tenantId_category_idx" ON "ServiceItem"("tenantId", "category");

-- CreateIndex
CREATE INDEX "ServiceItem_tenantId_isActive_idx" ON "ServiceItem"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "ServiceItem_tenantId_deletedAt_idx" ON "ServiceItem"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceItem_tenantId_code_key" ON "ServiceItem"("tenantId", "code");

-- CreateIndex
CREATE INDEX "TaxRate_tenantId_isDefault_idx" ON "TaxRate"("tenantId", "isDefault");

-- CreateIndex
CREATE INDEX "TaxRate_tenantId_isActive_idx" ON "TaxRate"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "TaxRate_tenantId_deletedAt_idx" ON "TaxRate"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TaxRate_tenantId_code_key" ON "TaxRate"("tenantId", "code");

-- CreateIndex
CREATE INDEX "PriceList_tenantId_status_idx" ON "PriceList"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PriceList_tenantId_effectiveFrom_idx" ON "PriceList"("tenantId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "PriceList_tenantId_deletedAt_idx" ON "PriceList"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PriceList_tenantId_name_version_key" ON "PriceList"("tenantId", "name", "version");

-- CreateIndex
CREATE INDEX "PriceListItem_tenantId_itemType_catalogItemId_idx" ON "PriceListItem"("tenantId", "itemType", "catalogItemId");

-- CreateIndex
CREATE INDEX "PriceListItem_priceListId_itemType_idx" ON "PriceListItem"("priceListId", "itemType");

-- CreateIndex
CREATE INDEX "PriceListItem_tenantId_deletedAt_idx" ON "PriceListItem"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PriceListItem_priceListId_itemType_catalogItemId_key" ON "PriceListItem"("priceListId", "itemType", "catalogItemId");

-- CreateIndex
CREATE INDEX "PricingRule_tenantId_priceListId_idx" ON "PricingRule"("tenantId", "priceListId");

-- CreateIndex
CREATE INDEX "PricingRule_tenantId_ruleType_idx" ON "PricingRule"("tenantId", "ruleType");

-- CreateIndex
CREATE INDEX "PricingRule_tenantId_isActive_idx" ON "PricingRule"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "PricingRule_tenantId_deletedAt_idx" ON "PricingRule"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_tenantId_code_key" ON "PricingRule"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Customer_tenantId_displayName_idx" ON "Customer"("tenantId", "displayName");

-- CreateIndex
CREATE INDEX "Customer_tenantId_email_idx" ON "Customer"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Customer_tenantId_phone_idx" ON "Customer"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "Project_tenantId_customerId_idx" ON "Project"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "Project_tenantId_name_idx" ON "Project"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_currentVersionId_key" ON "Quote"("currentVersionId");

-- CreateIndex
CREATE INDEX "Quote_tenantId_status_idx" ON "Quote"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Quote_tenantId_customerId_idx" ON "Quote"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "Quote_tenantId_projectId_idx" ON "Quote"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "Quote_tenantId_createdAt_idx" ON "Quote"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_tenantId_quoteNumber_key" ON "Quote"("tenantId", "quoteNumber");

-- CreateIndex
CREATE INDEX "QuoteVersion_tenantId_quoteId_idx" ON "QuoteVersion"("tenantId", "quoteId");

-- CreateIndex
CREATE INDEX "QuoteVersion_tenantId_status_idx" ON "QuoteVersion"("tenantId", "status");

-- CreateIndex
CREATE INDEX "QuoteVersion_tenantId_createdAt_idx" ON "QuoteVersion"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteVersion_quoteId_versionNumber_key" ON "QuoteVersion"("quoteId", "versionNumber");

-- CreateIndex
CREATE INDEX "QuoteItem_tenantId_quoteVersionId_idx" ON "QuoteItem"("tenantId", "quoteVersionId");

-- CreateIndex
CREATE INDEX "QuoteItem_quoteVersionId_sortOrder_idx" ON "QuoteItem"("quoteVersionId", "sortOrder");

-- CreateIndex
CREATE INDEX "QuoteItem_tenantId_type_idx" ON "QuoteItem"("tenantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteCalculationResult_quoteVersionId_key" ON "QuoteCalculationResult"("quoteVersionId");

-- CreateIndex
CREATE INDEX "QuoteCalculationResult_tenantId_quoteVersionId_idx" ON "QuoteCalculationResult"("tenantId", "quoteVersionId");

-- CreateIndex
CREATE INDEX "QuoteCalculationResult_tenantId_createdAt_idx" ON "QuoteCalculationResult"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Document_tenantId_quoteVersionId_idx" ON "Document"("tenantId", "quoteVersionId");

-- CreateIndex
CREATE INDEX "Document_tenantId_type_idx" ON "Document"("tenantId", "type");

-- CreateIndex
CREATE INDEX "Document_tenantId_createdAt_idx" ON "Document"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_action_createdAt_idx" ON "AuditLog"("tenantId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_entityType_entityId_idx" ON "AuditLog"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "SavedFilter_tenantId_entityType_idx" ON "SavedFilter"("tenantId", "entityType");

-- CreateIndex
CREATE INDEX "SavedFilter_tenantId_userId_idx" ON "SavedFilter"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedFilter_tenantId_userId_name_key" ON "SavedFilter"("tenantId", "userId", "name");

-- AddForeignKey
ALTER TABLE "TenantMember" ADD CONSTRAINT "TenantMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMember" ADD CONSTRAINT "TenantMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySettings" ADD CONSTRAINT "CompanySettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteNumberSettings" ADD CONSTRAINT "QuoteNumberSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileSystem" ADD CONSTRAINT "ProfileSystem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileSystem" ADD CONSTRAINT "ProfileSystem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileItem" ADD CONSTRAINT "ProfileItem_profileSystemId_fkey" FOREIGN KEY ("profileSystemId") REFERENCES "ProfileSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileItem" ADD CONSTRAINT "ProfileItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileItem" ADD CONSTRAINT "ProfileItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlassPackage" ADD CONSTRAINT "GlassPackage_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlassPackage" ADD CONSTRAINT "GlassPackage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardwareKit" ADD CONSTRAINT "HardwareKit_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardwareKit" ADD CONSTRAINT "HardwareKit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColorFinish" ADD CONSTRAINT "ColorFinish_profileSystemId_fkey" FOREIGN KEY ("profileSystemId") REFERENCES "ProfileSystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColorFinish" ADD CONSTRAINT "ColorFinish_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColorFinish" ADD CONSTRAINT "ColorFinish_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accessory" ADD CONSTRAINT "Accessory_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accessory" ADD CONSTRAINT "Accessory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceItem" ADD CONSTRAINT "ServiceItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRate" ADD CONSTRAINT "TaxRate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceList" ADD CONSTRAINT "PriceList_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceList" ADD CONSTRAINT "PriceList_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListItem" ADD CONSTRAINT "PriceListItem_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListItem" ADD CONSTRAINT "PriceListItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "QuoteVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteVersion" ADD CONSTRAINT "QuoteVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteVersion" ADD CONSTRAINT "QuoteVersion_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteVersion" ADD CONSTRAINT "QuoteVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteVersionId_fkey" FOREIGN KEY ("quoteVersionId") REFERENCES "QuoteVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteCalculationResult" ADD CONSTRAINT "QuoteCalculationResult_quoteVersionId_fkey" FOREIGN KEY ("quoteVersionId") REFERENCES "QuoteVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteCalculationResult" ADD CONSTRAINT "QuoteCalculationResult_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_quoteVersionId_fkey" FOREIGN KEY ("quoteVersionId") REFERENCES "QuoteVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedFilter" ADD CONSTRAINT "SavedFilter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedFilter" ADD CONSTRAINT "SavedFilter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
