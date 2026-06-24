import {
  AuditAction,
  DocumentType,
  PrismaClient,
  QuoteItemType,
  QuoteStatus,
  QuoteVersionStatus,
  TenantRole,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-termopane" },
    update: {
      name: "Demo Termopane SRL",
      status: "ACTIVE",
    },
    create: {
      name: "Demo Termopane SRL",
      slug: "demo-termopane",
      status: "ACTIVE",
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: "owner.demo@example.test" },
    update: {
      displayName: "Owner Demo",
    },
    create: {
      email: "owner.demo@example.test",
      displayName: "Owner Demo",
      authProvider: "synthetic",
      authProviderId: "synthetic-owner-demo",
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
      status: "ACTIVE",
      canViewInternalCosts: true,
    },
    create: {
      tenantId: tenant.id,
      userId: owner.id,
      role: TenantRole.OWNER,
      status: "ACTIVE",
      canViewInternalCosts: true,
    },
  });

  await prisma.companySettings.upsert({
    where: { tenantId: tenant.id },
    update: {
      companyName: "Demo Termopane SRL",
      defaultCurrency: "RON",
      defaultVatRate: "19.00",
    },
    create: {
      tenantId: tenant.id,
      companyName: "Demo Termopane SRL",
      legalName: "Demo Termopane SRL",
      taxId: "RO00000000",
      registrationNumber: "J40/0000/2026",
      addressLine1: "Strada Exemplu 1",
      city: "Bucuresti",
      country: "RO",
      phone: "+40 700 000 000",
      email: "contact@example.test",
      defaultCurrency: "RON",
      defaultVatRate: "19.00",
      offerValidityDays: 30,
      warrantyText: "Garantie sintetica pentru date demo.",
      deliveryText: "Termen de livrare demo, fara angajament comercial.",
      paymentTermsText: "Conditii de plata demo.",
      advancePaymentText: "Avans demo configurabil.",
      pdfFooterText: "Oferta demo generata cu date sintetice.",
      commercialDefaults: {
        requiresBusinessValidation: true,
      },
      calculationDefaults: {
        requiresBusinessValidation: true,
      },
      documentTemplateDefaults: {
        quoteTemplate: "template-a",
      },
    },
  });

  let customer = await prisma.customer.findFirst({
    where: {
      tenantId: tenant.id,
      email: "client.demo@example.test",
    },
  });

  customer ??= await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      displayName: "Client Demo",
      companyName: "Client Demo SRL",
      contactName: "Client Demo",
      email: "client.demo@example.test",
      phone: "+40 711 111 111",
      addressLine1: "Strada Clientului 10",
      city: "Brasov",
      country: "RO",
      notes: "Date sintetice pentru seed.",
    },
  });

  let project = await prisma.project.findFirst({
    where: {
      tenantId: tenant.id,
      customerId: customer.id,
      name: "Casa Demo",
    },
  });

  project ??= await prisma.project.create({
    data: {
      tenantId: tenant.id,
      customerId: customer.id,
      name: "Casa Demo",
      siteAddressLine1: "Strada Santierului 5",
      city: "Brasov",
      country: "RO",
      notes: "Proiect sintetic pentru fluxul comercial MVP.",
    },
  });

  const quote = await prisma.quote.upsert({
    where: {
      tenantId_quoteNumber: {
        tenantId: tenant.id,
        quoteNumber: "DEMO-2026-0001",
      },
    },
    update: {
      customerId: customer.id,
      projectId: project.id,
      status: QuoteStatus.DRAFT,
      assignedToId: owner.id,
    },
    create: {
      tenantId: tenant.id,
      customerId: customer.id,
      projectId: project.id,
      quoteNumber: "DEMO-2026-0001",
      status: QuoteStatus.DRAFT,
      title: "Oferta demo termopane",
      notes: "Oferta sintetica pentru validarea schemei Prisma.",
      tags: ["demo", "synthetic"],
      createdById: owner.id,
      assignedToId: owner.id,
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
      subtotalAmount: "1200.00",
      taxAmount: "228.00",
      totalAmount: "1428.00",
    },
    create: {
      tenantId: tenant.id,
      quoteId: quote.id,
      versionNumber: 1,
      status: QuoteVersionStatus.DRAFT,
      createdById: owner.id,
      currency: "RON",
      customerSnapshot: {
        displayName: customer.displayName,
        companyName: customer.companyName,
        city: customer.city,
        country: customer.country,
      },
      companySettingsSnapshot: {
        companyName: "Demo Termopane SRL",
        defaultCurrency: "RON",
        defaultVatRate: "19.00",
      },
      catalogSnapshot: {
        note: "Catalog models are intentionally out of scope for COD-004.",
      },
      priceListSnapshot: {
        note: "Synthetic placeholder; no production pricing formulas.",
      },
      commercialSnapshot: {
        requiresBusinessValidation: true,
      },
      calculationWarnings: [
        {
          code: "requires_business_validation",
          message: "Synthetic seed data does not encode production formulas.",
        },
      ],
      traceSummary: {
        source: "seed",
      },
      subtotalAmount: "1200.00",
      discountAmount: "0.00",
      taxAmount: "228.00",
      totalAmount: "1428.00",
    },
  });

  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      currentVersionId: quoteVersion.id,
    },
  });

  const existingItem = await prisma.quoteItem.findFirst({
    where: {
      tenantId: tenant.id,
      quoteVersionId: quoteVersion.id,
      sortOrder: 1,
    },
  });

  const quoteItem =
    existingItem ??
    (await prisma.quoteItem.create({
      data: {
        tenantId: tenant.id,
        quoteVersionId: quoteVersion.id,
        type: QuoteItemType.WINDOW,
        sortOrder: 1,
        quantity: 2,
        widthMm: 1200,
        heightMm: 1400,
        customerDescription: "Fereastra PVC demo 1200x1400 mm",
        internalNotes: "Linie sintetica, fara formula de productie.",
        configurationSnapshot: {
          itemKind: "window",
          openingStyle: "demo",
          requiresBusinessValidation: true,
        },
        catalogSnapshot: {
          profileSystem: "Demo PVC",
          glassUnit: "Demo glass",
        },
        pricingSnapshot: {
          note: "Placeholder synthetic values only.",
        },
        unitPrice: "600.00",
        lineSubtotal: "1200.00",
        discountAmount: "0.00",
        taxAmount: "228.00",
        lineTotal: "1428.00",
      },
    }));

  await prisma.quoteCalculationResult.upsert({
    where: { quoteVersionId: quoteVersion.id },
    update: {
      outputSnapshot: {
        totals: {
          subtotalAmount: "1200.00",
          taxAmount: "228.00",
          totalAmount: "1428.00",
        },
      },
    },
    create: {
      tenantId: tenant.id,
      quoteVersionId: quoteVersion.id,
      createdById: owner.id,
      calculationVersion: "seed-placeholder-v1",
      inputSnapshot: {
        quoteVersionId: quoteVersion.id,
        frozen: true,
      },
      outputSnapshot: {
        totals: {
          subtotalAmount: "1200.00",
          taxAmount: "228.00",
          totalAmount: "1428.00",
        },
      },
      warnings: [
        {
          code: "placeholder_calculation",
          message: "No production formulas are implemented in seed data.",
        },
      ],
      trace: {
        note: "Synthetic placeholder trace.",
      },
      inputHash: "synthetic-seed-placeholder",
    },
  });

  await prisma.document.upsert({
    where: {
      tenantId_storageKey: {
        tenantId: tenant.id,
        storageKey: "demo/quotes/DEMO-2026-0001-v1.pdf",
      },
    },
    update: {
      quoteVersionId: quoteVersion.id,
      generatedById: owner.id,
    },
    create: {
      tenantId: tenant.id,
      quoteVersionId: quoteVersion.id,
      type: DocumentType.QUOTE_PDF,
      fileName: "DEMO-2026-0001-v1.pdf",
      storageKey: "demo/quotes/DEMO-2026-0001-v1.pdf",
      mimeType: "application/pdf",
      byteSize: 0,
      checksum: "synthetic-placeholder",
      templateKey: "template-a",
      generatedById: owner.id,
    },
  });

  await prisma.savedFilter.upsert({
    where: {
      tenantId_userId_entityType_name: {
        tenantId: tenant.id,
        userId: owner.id,
        entityType: "quote",
        name: "Draft demo quotes",
      },
    },
    update: {
      filterConfig: {
        status: [QuoteStatus.DRAFT],
      },
      isDefault: true,
    },
    create: {
      tenantId: tenant.id,
      userId: owner.id,
      entityType: "quote",
      name: "Draft demo quotes",
      filterConfig: {
        status: [QuoteStatus.DRAFT],
      },
      isDefault: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      action: AuditAction.QUOTE_CREATED,
      actorUserId: owner.id,
      quoteId: quote.id,
      quoteVersionId: quoteVersion.id,
      quoteItemId: quoteItem.id,
      targetType: "Quote",
      targetId: quote.id,
      reason: "Synthetic seed data for COD-004.",
      metadata: {
        source: "prisma/seed.ts",
        containsCustomerPii: false,
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
