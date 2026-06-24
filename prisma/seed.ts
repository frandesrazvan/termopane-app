import {
  AuditAction,
  DocumentType,
  PrismaClient,
  QuoteItemType,
  QuoteStatus,
  QuoteVersionStatus,
  TenantMemberStatus,
  TenantRole,
  TenantStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const tenantId = "seed_tenant_synthetic_termopane";
const secondTenantId = "seed_tenant_secondary_termopane";
const ownerUserId = "seed_user_owner";
const adminUserId = "seed_user_admin";
const estimatorUserId = "seed_user_estimator";
const dealerUserId = "seed_user_dealer";
const quoteId = "seed_quote_001";
const quoteVersionId = "seed_quote_001_v1";

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "synthetic-termopane-demo" },
    update: {
      name: "Synthetic Termopane Demo",
      status: TenantStatus.ACTIVE,
    },
    create: {
      id: tenantId,
      name: "Synthetic Termopane Demo",
      slug: "synthetic-termopane-demo",
      status: TenantStatus.ACTIVE,
    },
  });

  const secondTenant = await prisma.tenant.upsert({
    where: { slug: "synthetic-termopane-secondary" },
    update: {
      name: "Synthetic Secondary Tenant",
      status: TenantStatus.ACTIVE,
    },
    create: {
      id: secondTenantId,
      name: "Synthetic Secondary Tenant",
      slug: "synthetic-termopane-secondary",
      status: TenantStatus.ACTIVE,
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: "owner@example.test" },
    update: {
      displayName: "Synthetic Owner",
    },
    create: {
      id: ownerUserId,
      email: "owner@example.test",
      displayName: "Synthetic Owner",
      authProvider: "seed",
      authProviderSubject: "synthetic-owner",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.test" },
    update: {
      displayName: "Synthetic Admin",
    },
    create: {
      id: adminUserId,
      email: "admin@example.test",
      displayName: "Synthetic Admin",
      authProvider: "seed",
      authProviderSubject: "synthetic-admin",
    },
  });

  const estimator = await prisma.user.upsert({
    where: { email: "estimator@example.test" },
    update: {
      displayName: "Synthetic Estimator",
    },
    create: {
      id: estimatorUserId,
      email: "estimator@example.test",
      displayName: "Synthetic Estimator",
      authProvider: "seed",
      authProviderSubject: "synthetic-estimator",
    },
  });

  const dealer = await prisma.user.upsert({
    where: { email: "dealer@example.test" },
    update: {
      displayName: "Synthetic Dealer",
    },
    create: {
      id: dealerUserId,
      email: "dealer@example.test",
      displayName: "Synthetic Dealer",
      authProvider: "seed",
      authProviderSubject: "synthetic-dealer",
    },
  });

  await prisma.tenantMember.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: owner.id,
      },
    },
    update: {
      role: TenantRole.OWNER,
      status: TenantMemberStatus.ACTIVE,
      canViewInternalCosts: true,
      joinedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    create: {
      id: "seed_member_owner",
      tenantId: tenant.id,
      userId: owner.id,
      role: TenantRole.OWNER,
      status: TenantMemberStatus.ACTIVE,
      canViewInternalCosts: true,
      joinedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  });

  await prisma.tenantMember.upsert({
    where: {
      tenantId_userId: {
        tenantId: secondTenant.id,
        userId: owner.id,
      },
    },
    update: {
      role: TenantRole.OWNER,
      status: TenantMemberStatus.ACTIVE,
      canViewInternalCosts: true,
      joinedAt: new Date("2026-01-02T00:00:00.000Z"),
    },
    create: {
      id: "seed_member_owner_secondary",
      tenantId: secondTenant.id,
      userId: owner.id,
      role: TenantRole.OWNER,
      status: TenantMemberStatus.ACTIVE,
      canViewInternalCosts: true,
      joinedAt: new Date("2026-01-02T00:00:00.000Z"),
    },
  });

  await prisma.tenantMember.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: admin.id,
      },
    },
    update: {
      role: TenantRole.ADMIN,
      status: TenantMemberStatus.ACTIVE,
      canViewInternalCosts: true,
      joinedAt: new Date("2026-01-03T00:00:00.000Z"),
    },
    create: {
      id: "seed_member_admin",
      tenantId: tenant.id,
      userId: admin.id,
      role: TenantRole.ADMIN,
      status: TenantMemberStatus.ACTIVE,
      canViewInternalCosts: true,
      joinedAt: new Date("2026-01-03T00:00:00.000Z"),
    },
  });

  await prisma.tenantMember.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: estimator.id,
      },
    },
    update: {
      role: TenantRole.ESTIMATOR,
      status: TenantMemberStatus.ACTIVE,
      canViewInternalCosts: false,
      joinedAt: new Date("2026-01-04T00:00:00.000Z"),
    },
    create: {
      id: "seed_member_estimator",
      tenantId: tenant.id,
      userId: estimator.id,
      role: TenantRole.ESTIMATOR,
      status: TenantMemberStatus.ACTIVE,
      canViewInternalCosts: false,
      joinedAt: new Date("2026-01-04T00:00:00.000Z"),
    },
  });

  await prisma.tenantMember.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: dealer.id,
      },
    },
    update: {
      role: TenantRole.DEALER,
      status: TenantMemberStatus.ACTIVE,
      canViewInternalCosts: false,
      joinedAt: new Date("2026-01-05T00:00:00.000Z"),
    },
    create: {
      id: "seed_member_dealer",
      tenantId: tenant.id,
      userId: dealer.id,
      role: TenantRole.DEALER,
      status: TenantMemberStatus.ACTIVE,
      canViewInternalCosts: false,
      joinedAt: new Date("2026-01-05T00:00:00.000Z"),
    },
  });

  const companySettings = await prisma.companySettings.upsert({
    where: { tenantId: tenant.id },
    update: {
      legalName: "Synthetic Termopane SRL",
      displayName: "Synthetic Termopane",
      defaultCurrency: "RON",
      vatRateBasisPoints: 1900,
      offerValidityDays: 14,
      paymentTermsText: "Synthetic payment terms for local development only.",
      warrantyText: "Synthetic warranty text. Requires business validation before production use.",
      deliveryText: "Synthetic delivery text. Requires business validation before production use.",
      pdfFooterText: "Synthetic footer for generated offer previews.",
      commercialDefaults: {
        note: "Placeholder commercial defaults; no production pricing formula is encoded.",
      },
      calculationDefaults: {
        note: "Calculation settings require business validation before production use.",
      },
    },
    create: {
      id: "seed_company_settings",
      tenantId: tenant.id,
      legalName: "Synthetic Termopane SRL",
      displayName: "Synthetic Termopane",
      addressLine1: "Synthetic Business Street 1",
      city: "Bucharest",
      country: "RO",
      email: "office@example.test",
      phone: "+40000000000",
      defaultCurrency: "RON",
      vatRateBasisPoints: 1900,
      offerValidityDays: 14,
      paymentTermsText: "Synthetic payment terms for local development only.",
      warrantyText: "Synthetic warranty text. Requires business validation before production use.",
      deliveryText: "Synthetic delivery text. Requires business validation before production use.",
      pdfFooterText: "Synthetic footer for generated offer previews.",
      commercialDefaults: {
        note: "Placeholder commercial defaults; no production pricing formula is encoded.",
      },
      calculationDefaults: {
        note: "Calculation settings require business validation before production use.",
      },
    },
  });

  const customer = await prisma.customer.upsert({
    where: { id: "seed_customer_demo" },
    update: {
      displayName: "Synthetic Residential Customer",
      contactName: "Synthetic Contact",
      email: "customer@example.test",
      phone: "+40000000001",
    },
    create: {
      id: "seed_customer_demo",
      tenantId: tenant.id,
      displayName: "Synthetic Residential Customer",
      contactName: "Synthetic Contact",
      email: "customer@example.test",
      phone: "+40000000001",
      addressLine1: "Synthetic Site Street 10",
      city: "Bucharest",
      country: "RO",
      notes: "Synthetic customer used only for local seed data.",
    },
  });

  const project = await prisma.project.upsert({
    where: { id: "seed_project_demo" },
    update: {
      name: "Synthetic Apartment Renovation",
      siteAddress: "Synthetic Site Street 10",
    },
    create: {
      id: "seed_project_demo",
      tenantId: tenant.id,
      customerId: customer.id,
      name: "Synthetic Apartment Renovation",
      siteAddress: "Synthetic Site Street 10",
      notes: "Synthetic project used only for local seed data.",
    },
  });

  const quote = await prisma.quote.upsert({
    where: {
      tenantId_quoteNumber: {
        tenantId: tenant.id,
        quoteNumber: "SYN-0001",
      },
    },
    update: {
      customerId: customer.id,
      projectId: project.id,
      status: QuoteStatus.DRAFT,
      title: "Synthetic fixed-window offer",
      assignedToId: owner.id,
    },
    create: {
      id: quoteId,
      tenantId: tenant.id,
      customerId: customer.id,
      projectId: project.id,
      quoteNumber: "SYN-0001",
      status: QuoteStatus.DRAFT,
      title: "Synthetic fixed-window offer",
      currency: "RON",
      createdById: owner.id,
      assignedToId: owner.id,
      tags: ["seed", "synthetic"],
      internalNotes: "Synthetic quote. Do not use as production pricing guidance.",
    },
  });

  const quoteVersion = await prisma.quoteVersion.upsert({
    where: {
      quoteId_versionNumber: {
        quoteId: quote.id,
        versionNumber: 1,
      },
    },
    update: {
      status: QuoteVersionStatus.DRAFT,
      isLocked: false,
      customerSnapshot: {
        displayName: customer.displayName,
        contactName: customer.contactName,
        email: customer.email,
      },
      companySettingsSnapshot: {
        displayName: companySettings.displayName,
        defaultCurrency: companySettings.defaultCurrency,
        vatRateBasisPoints: companySettings.vatRateBasisPoints,
      },
      priceSnapshot: {
        note: "Synthetic placeholder. Real price lists are outside this task.",
      },
      totalsSnapshot: {
        materialCostMinor: 0,
        totalWithVatMinor: 0,
        note: "Calculation placeholder only.",
      },
    },
    create: {
      id: quoteVersionId,
      tenantId: tenant.id,
      quoteId: quote.id,
      versionNumber: 1,
      status: QuoteVersionStatus.DRAFT,
      isLocked: false,
      currency: "RON",
      customerSnapshot: {
        displayName: customer.displayName,
        contactName: customer.contactName,
        email: customer.email,
      },
      companySettingsSnapshot: {
        displayName: companySettings.displayName,
        defaultCurrency: companySettings.defaultCurrency,
        vatRateBasisPoints: companySettings.vatRateBasisPoints,
      },
      priceSnapshot: {
        note: "Synthetic placeholder. Real price lists are outside this task.",
      },
      itemSnapshot: {
        note: "Quote item snapshots are stored on each QuoteItem.",
      },
      totalsSnapshot: {
        materialCostMinor: 0,
        totalWithVatMinor: 0,
        note: "Calculation placeholder only.",
      },
      warningsSnapshot: [
        {
          code: "REQUIRES_BUSINESS_VALIDATION",
          message: "Seed values are synthetic and must not be treated as production formulas.",
        },
      ],
      traceSummary: {
        note: "No production calculation trace is seeded.",
      },
      subtotalMinor: 0,
      vatMinor: 0,
      totalMinor: 0,
      createdById: owner.id,
    },
  });

  await prisma.quoteItem.upsert({
    where: { id: "seed_quote_item_window" },
    update: {
      quoteVersionId: quoteVersion.id,
      type: QuoteItemType.WINDOW,
      quantity: 1,
      widthMm: 1200,
      heightMm: 1400,
      customerDescription: "Synthetic fixed-window item",
      configurationSnapshot: {
        type: "fixed-window",
        note: "Synthetic configuration only.",
      },
      catalogSnapshot: {
        note: "No catalog model is implemented in COD-004.",
      },
      calculationSnapshot: {
        note: "No pricing formula is seeded.",
      },
      totalsSnapshot: {
        totalWithVatMinor: 0,
      },
    },
    create: {
      id: "seed_quote_item_window",
      tenantId: tenant.id,
      quoteVersionId: quoteVersion.id,
      type: QuoteItemType.WINDOW,
      sortOrder: 1,
      quantity: 1,
      widthMm: 1200,
      heightMm: 1400,
      customerDescription: "Synthetic fixed-window item",
      internalNotes: "Synthetic item for local seed data only.",
      configurationSnapshot: {
        type: "fixed-window",
        note: "Synthetic configuration only.",
      },
      catalogSnapshot: {
        note: "No catalog model is implemented in COD-004.",
      },
      calculationSnapshot: {
        note: "No pricing formula is seeded.",
      },
      totalsSnapshot: {
        totalWithVatMinor: 0,
      },
    },
  });

  await prisma.quoteCalculationResult.upsert({
    where: { quoteVersionId: quoteVersion.id },
    update: {
      calculatorVersion: "seed-placeholder",
      inputSnapshot: {
        quoteVersionId: quoteVersion.id,
        source: "synthetic-seed",
      },
      outputSnapshot: {
        totals: {
          totalWithVatMinor: 0,
        },
      },
      warnings: [
        {
          code: "REQUIRES_BUSINESS_VALIDATION",
          message: "Synthetic seed result is not a production calculation.",
        },
      ],
      trace: [
        {
          step: "seed",
          note: "Placeholder calculation result created without pricing formulas.",
        },
      ],
    },
    create: {
      id: "seed_quote_calculation_result",
      tenantId: tenant.id,
      quoteVersionId: quoteVersion.id,
      calculatorVersion: "seed-placeholder",
      inputHash: "synthetic-seed",
      inputSnapshot: {
        quoteVersionId: quoteVersion.id,
        source: "synthetic-seed",
      },
      outputSnapshot: {
        totals: {
          totalWithVatMinor: 0,
        },
      },
      warnings: [
        {
          code: "REQUIRES_BUSINESS_VALIDATION",
          message: "Synthetic seed result is not a production calculation.",
        },
      ],
      trace: [
        {
          step: "seed",
          note: "Placeholder calculation result created without pricing formulas.",
        },
      ],
    },
  });

  await prisma.document.upsert({
    where: { id: "seed_document_quote_pdf" },
    update: {
      quoteVersionId: quoteVersion.id,
      type: DocumentType.QUOTE_PDF,
      templateKey: "template-a",
      visibleTotalsSnapshot: {
        totalWithVatMinor: 0,
      },
    },
    create: {
      id: "seed_document_quote_pdf",
      tenantId: tenant.id,
      quoteVersionId: quoteVersion.id,
      type: DocumentType.QUOTE_PDF,
      templateKey: "template-a",
      fileName: "synthetic-offer.pdf",
      storageKey: "seed/synthetic-offer.pdf",
      mimeType: "application/pdf",
      checksum: "synthetic-placeholder",
      visibleTotalsSnapshot: {
        totalWithVatMinor: 0,
      },
      generatedById: owner.id,
    },
  });

  await prisma.savedFilter.upsert({
    where: { id: "seed_saved_filter_drafts" },
    update: {
      name: "Synthetic draft quotes",
      filter: {
        status: [QuoteStatus.DRAFT],
      },
      isDefault: true,
    },
    create: {
      id: "seed_saved_filter_drafts",
      tenantId: tenant.id,
      userId: owner.id,
      name: "Synthetic draft quotes",
      entityType: "Quote",
      filter: {
        status: [QuoteStatus.DRAFT],
      },
      isDefault: true,
    },
  });

  await prisma.auditLog.upsert({
    where: { id: "seed_audit_quote_created" },
    update: {
      action: AuditAction.QUOTE_CREATED,
      entityType: "Quote",
      entityId: quote.id,
      metadata: {
        source: "synthetic-seed",
      },
    },
    create: {
      id: "seed_audit_quote_created",
      tenantId: tenant.id,
      actorUserId: owner.id,
      action: AuditAction.QUOTE_CREATED,
      entityType: "Quote",
      entityId: quote.id,
      afterSnapshot: {
        quoteNumber: quote.quoteNumber,
        status: quote.status,
      },
      metadata: {
        source: "synthetic-seed",
      },
    },
  });

  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      currentVersionId: quoteVersion.id,
    },
  });

  console.info(
    "Seeded synthetic tenants, owner/admin/estimator/dealer users, quote, quote version, item, calculation, document, saved filter, and audit log.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
