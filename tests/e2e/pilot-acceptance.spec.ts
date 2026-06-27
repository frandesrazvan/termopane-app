import { randomUUID } from "node:crypto";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createConfiguredDocumentStorageProvider } from "../../apps/web/src/lib/pdf/document-storage-provider";

const prisma = new PrismaClient();
const tenantId = "seed_tenant_synthetic_termopane";
const acceptancePrefix = "Pilot acceptance E2E";
const runId =
  process.env.PILOT_ACCEPTANCE_RUN_ID ??
  new Date()
    .toISOString()
    .replaceAll(/[^0-9]/g, "")
    .slice(0, 14);
const storageRoot =
  process.env.DOCUMENT_STORAGE_ROOT ??
  path.resolve(
    process.cwd(),
    ".local-storage",
    "pilot-acceptance",
    "documents",
  );

test.describe("pilot acceptance commercial flow", () => {
  test.beforeAll(async () => {
    process.env.DOCUMENT_STORAGE_PROVIDER ??= "local";
    process.env.DOCUMENT_STORAGE_ROOT ??= storageRoot;
    await cleanupAcceptanceData();
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("proves the Romanian mobile MVP flow from login to sent offer", async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const customerName = `${acceptancePrefix} client ${runId}`;
    const projectName = `${acceptancePrefix} proiect ${runId}`;
    const quoteTitle = `${acceptancePrefix} oferta ${runId}`;
    const filterName = `${acceptancePrefix} trimise ${runId}`;
    const recipientEmail = `pilot.acceptance.${runId}@example.test`;

    await test.step("health check and storage smoke", async () => {
      const health = await page.request.get("/api/health");
      expect(health.ok()).toBe(true);
      await expect((await health.json()) as { status?: string }).toMatchObject({
        status: "ok",
      });

      await expectStorageRoundTrip();
    });

    await test.step("login and tenant selection", async () => {
      await page.goto("/login");
      await expect(
        page.getByRole("heading", { name: "Autentificare" }),
      ).toBeVisible();
      await expect(page.getByText("Acces pilot prin invitație")).toBeVisible();
      await page.getByLabel("Email seed").fill("owner@example.test");
      await page.getByRole("button", { name: "Continuă local" }).click();

      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(
        page.getByRole("heading", { name: "Panou tenant" }),
      ).toBeVisible();
      await expect(
        activeTenantLabel(page, "Synthetic Termopane Demo"),
      ).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "Navigare mobilă" }),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await page
        .getByLabel("Tenant curent")
        .selectOption({ label: "Synthetic Secondary Tenant" });
      await page.getByRole("button", { name: "Schimbă" }).click();
      await expect(
        activeTenantLabel(page, "Synthetic Secondary Tenant"),
      ).toBeVisible();

      await page
        .getByLabel("Tenant curent")
        .selectOption({ label: "Synthetic Termopane Demo" });
      await page.getByRole("button", { name: "Schimbă" }).click();
      await expect(
        activeTenantLabel(page, "Synthetic Termopane Demo"),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });

    await test.step("company settings and catalog admin", async () => {
      await page.goto("/dashboard/settings");
      await expect(page.getByRole("heading", { name: "Setări" })).toBeVisible();
      await page.getByLabel("Nume afișat").fill(`${acceptancePrefix} SRL`);
      await page
        .getByLabel("Footer PDF")
        .fill("Footer sintetic pentru acceptanța pilot.");
      await page.getByRole("button", { name: "Salvează compania" }).click();
      await expect(page.getByText("Setările au fost salvate.")).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await page.goto("/dashboard/catalog");
      await expect(
        page.getByRole("heading", { name: "Catalog", exact: true }),
      ).toBeVisible();
      await expect(page.getByText("Administrare catalog")).toBeVisible();
      await page.getByRole("link", { name: /Accesorii/ }).click();
      await expect(
        page.getByRole("heading", { name: "Accesorii" }),
      ).toBeVisible();
      await expect(page.getByText("Synthetic interior sill")).toBeVisible();
      await expect(
        page.getByText("necesită validare business").first(),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });

    let customerId = "";
    let projectId = "";

    await test.step("customer and project creation", async () => {
      await page.goto("/dashboard/customers/new");
      await expect(
        page.getByRole("heading", { name: "Client nou" }),
      ).toBeVisible();
      await page.getByLabel("Nume client").fill(customerName);
      await page.getByLabel("Companie").fill(`${acceptancePrefix} companie`);
      await page.getByLabel("Persoană de contact").fill("Contact sintetic");
      await page.getByLabel("Email").fill(`client.${runId}@example.test`);
      await page.getByLabel("Telefon").fill("+40000000002");
      await page.getByLabel("Oraș").fill("București");
      await page.getByLabel("Adresă 1").fill("Strada Sintetică 10");
      await page.getByLabel("Țară").fill("RO");
      await page.getByRole("button", { name: "Creează client" }).click();

      await expect(
        page.getByRole("heading", { name: customerName }),
      ).toBeVisible();
      customerId = idFromUrl(page.url(), "customers");
      expect(customerId).toBeTruthy();

      await page.getByRole("link", { name: "Proiect nou" }).click();
      await expect(
        page.getByRole("heading", { name: "Proiect nou" }),
      ).toBeVisible();
      await page.getByLabel("Nume proiect").fill(projectName);
      await page
        .getByLabel("Adresă șantier")
        .fill("Șantier sintetic, București");
      await page
        .getByLabel("Note")
        .fill("Note sintetice pentru acceptanța pilot.");
      await page.getByRole("button", { name: "Creează proiect" }).click();

      await expect(
        page.getByRole("heading", { name: projectName }),
      ).toBeVisible();
      projectId = idFromUrl(page.url(), "projects");
      expect(projectId).toBeTruthy();
      await expectNoHorizontalOverflow(page);
    });

    await test.step("quote creation and all MVP line types", async () => {
      await page.goto(
        `/dashboard/quotes/new?customerId=${customerId}&projectId=${projectId}`,
      );
      await expect(
        page.getByRole("heading", { name: "Ciornă ofertă nouă" }),
      ).toBeVisible();
      await page.locator('select[name="customerId"]').selectOption(customerId);
      await page.locator('select[name="projectId"]').selectOption(projectId);
      await page.getByLabel("Titlu").fill(quoteTitle);
      await page.getByRole("button", { name: "Creează ciornă" }).click();

      await expect(page.getByText(quoteTitle)).toBeVisible();
      await addFixedWindow(page, `${acceptancePrefix} fereastră ${runId}`);
      await addDoor(page, `${acceptancePrefix} ușă ${runId}`);
      await addCustomLine(page, `${acceptancePrefix} personalizat ${runId}`);
      await addCatalogLine(
        page,
        "Accesoriu",
        `${acceptancePrefix} accesoriu ${runId}`,
      );
      await addCatalogLine(
        page,
        "Serviciu",
        `${acceptancePrefix} serviciu ${runId}`,
      );
      await addCatalogLine(
        page,
        "Transport",
        `${acceptancePrefix} transport ${runId}`,
      );
      await addCatalogLine(
        page,
        "Montaj",
        `${acceptancePrefix} montaj ${runId}`,
      );

      await expect(page.getByText("7 poziții")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });

    await test.step("calculation and manual override", async () => {
      await page.getByRole("button", { name: "Recalculează" }).first().click();
      await expect(
        page.getByText("Snapshot-urile de calcul au fost actualizate."),
      ).toBeVisible();
      await expect(page.getByText("Verificare calcul")).toBeVisible();
      await expect(page.getByText("Avertizări", { exact: true })).toBeVisible();

      const firstOverridePanel = await openDetails(
        page,
        "Ajustare preț poziție",
      );
      await firstOverridePanel
        .getByLabel("Total final manual (RON)")
        .fill("2500.00");
      await firstOverridePanel
        .getByLabel("Motiv override")
        .fill("Negociere sintetică pentru acceptanța pilot.");
      await firstOverridePanel
        .getByRole("button", { name: "Aplică override" })
        .click();
      await expect(
        page.getByText(
          "Ajustarea manuală a poziției a fost auditată și recalculată.",
        ),
      ).toBeVisible();
      await expect(page.getByText("Override manual:")).toBeVisible();
    });

    await test.step("lock version, generate Template A and Template B PDFs", async () => {
      await page.getByRole("button", { name: "Blochează versiunea" }).click();
      await expect(
        page.getByText(
          "Versiunea curentă a fost blocată pentru generarea documentelor.",
        ),
      ).toBeVisible();
      await expect(
        page.getByText("Pozițiile sunt doar pentru citire"),
      ).toBeVisible();

      await page.goto(
        `${page.url().split("#")[0].split("?")[0]}/preview?template=template-a`,
      );
      await expect(
        page.getByRole("heading", { name: "Previzualizare ofertă" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Template A" }),
      ).toHaveAttribute("aria-current", "page");
      await page.getByRole("link", { name: "Template B" }).click();
      await expect(
        page.getByRole("link", { name: "Template B" }),
      ).toHaveAttribute("aria-current", "page");

      await page.getByRole("link", { name: "Înapoi la ofertă" }).click();
      const documents = page.locator("#documents");
      await documents
        .locator('select[name="templateKey"]')
        .selectOption("template-a");
      await documents.getByRole("button", { name: "Generează PDF" }).click();
      await expect(
        page.getByText(
          "Documentul PDF a fost generat și stocat pentru această versiune.",
        ),
      ).toBeVisible();
      await expect(
        documents
          .locator("p", { hasText: "Template A - ofertă detaliată" })
          .first(),
      ).toBeVisible();

      await documents
        .locator('select[name="templateKey"]')
        .selectOption("template-b");
      await documents.getByRole("button", { name: "Generează PDF" }).click();
      await expect(
        documents
          .locator("p", { hasText: "Template B - propunere compactă" })
          .first(),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });

    await test.step("send workflow and saved filters", async () => {
      const sendForm = page
        .locator("#documents form")
        .filter({ hasText: "Trimite către client" })
        .first();
      await sendForm.getByLabel("Email destinatar").fill(recipientEmail);
      await sendForm
        .getByLabel("Nume destinatar (opțional)")
        .fill("Client sintetic");
      await sendForm
        .getByRole("button", { name: "Trimite către client" })
        .click();

      await expect(
        page.getByRole("heading", { name: "Ofertă trimisă" }),
      ).toBeVisible();
      await expect(page.getByText("Livrare email:")).toBeVisible();
      await expect(page.getByText(recipientEmail)).toHaveCount(0);

      await page.goto("/dashboard/quotes?quickFilter=sent");
      await expect(
        page.getByRole("heading", { name: "Oferte salvate" }),
      ).toBeVisible();
      await expect(page.getByText(quoteTitle)).toBeVisible();
      await page.getByLabel("Nume filtru salvat").fill(filterName);
      await page.getByLabel("Nume filtru salvat").press("Enter");
      await expect(
        page.getByText("Filtrul a fost salvat pentru ofertele tale."),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: filterName })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  });
});

async function addFixedWindow(page: Page, description: string) {
  const panel = await openDetails(page, "Fereastră fixă");
  await panel.getByLabel("Cantitate").fill("2");
  await panel.getByLabel("Lățime mm").fill("1200");
  await panel.getByLabel("Înălțime mm").fill("1400");
  await panel.getByLabel("Descriere pentru client").fill(description);
  await selectFirstRealOption(panel.getByLabel("Sistem de profil"));
  await selectFirstRealOption(panel.getByLabel("Profil toc"));
  await selectFirstRealOption(panel.getByLabel("Pachet sticlă"));
  await selectFirstRealOption(panel.getByLabel("Culoare/finisaj"));
  await selectFirstRealOption(panel.locator('select[name="hardwareKitId"]'));
  await panel.getByRole("button", { name: "Adaugă fereastră fixă" }).click();
  await expectPersistedQuoteItem(page, description);
}

async function addDoor(page: Page, description: string) {
  const panel = await openDetails(page, "Ușă");
  await panel.getByLabel("Cantitate").fill("1");
  await panel.getByLabel("Lățime mm").fill("900");
  await panel.getByLabel("Înălțime mm").fill("2100");
  await panel.getByLabel("Descriere pentru client").fill(description);
  await selectFirstRealOption(panel.getByLabel("Sistem de profil"));
  await selectFirstRealOption(panel.getByLabel("Culoare/finisaj"));
  await selectFirstRealOption(panel.getByLabel("Profil toc ușă"));
  await selectFirstRealOption(panel.getByLabel("Profil prag"));
  await selectFirstRealOption(panel.getByLabel("Pachet sticlă opțional"));
  await selectFirstRealOption(panel.locator('select[name="hardwareKitId"]'));
  await panel
    .getByLabel("Descriere panou/manual")
    .fill("Panou sintetic explicit");
  await panel.getByLabel("Preț manual panou (RON)").fill("420.00");
  await panel
    .getByLabel("Feronerie placeholder")
    .fill("Mâner și yală sintetice");
  await panel.getByRole("button", { name: "Adaugă ușă" }).click();
  await expectPersistedQuoteItem(page, description);
}

async function addCustomLine(page: Page, description: string) {
  const panel = await openDetails(page, "Poziție personalizată");
  await panel.getByLabel("Cantitate").fill("1");
  await panel.getByLabel("Preț unitar (RON)").fill("350.00");
  await panel.getByLabel("Descriere pentru client").fill(description);
  await panel
    .getByRole("button", { name: "Adaugă poziție personalizată" })
    .click();
  await expectPersistedQuoteItem(page, description);
}

async function addCatalogLine(
  page: Page,
  summary: string,
  description: string,
) {
  const panel = await openDetails(page, summary);
  await selectFirstRealOption(
    panel.getByLabel(
      summary === "Transport"
        ? "Serviciu transport"
        : summary === "Montaj"
          ? "Serviciu montaj"
          : summary,
    ),
  );
  await panel
    .getByLabel("Cantitate")
    .fill(summary === "Accesoriu" ? "2.5" : "1");
  await panel.getByLabel("Descriere pentru client").fill(description);
  await panel
    .getByRole("button", { name: `Adaugă ${summary.toLowerCase()}` })
    .click();
  await expectPersistedQuoteItem(page, description);
}

async function openDetails(page: Page, summaryText: string) {
  const summary = page
    .locator("summary")
    .filter({ hasText: summaryText })
    .first();
  await expect(summary).toBeVisible();
  const panel = summary.locator("xpath=ancestor::details[1]");
  const isOpen = await panel.evaluate(
    (element) => (element as HTMLDetailsElement).open,
  );

  if (!isOpen) {
    await summary.click();
  }

  await expect(panel).toHaveAttribute("open", "");
  return panel;
}

async function selectFirstRealOption(select: Locator) {
  const value = await select.evaluate((element) => {
    const selectElement = element as HTMLSelectElement;
    return Array.from(selectElement.options).find(
      (option) => option.value.trim().length > 0,
    )?.value;
  });

  expect(value, "expected seeded synthetic catalog option").toBeTruthy();
  await select.selectOption(value!);
}

async function expectPersistedQuoteItem(page: Page, description: string) {
  await expect
    .poll(
      async () =>
        prisma.quoteItem.count({
          where: {
            customerDescription: description,
            tenantId,
          },
        }),
      {
        message: `quote item persisted: ${description}`,
        timeout: 45_000,
      },
    )
    .toBe(1);

  await page.reload();
  await expect(
    page.getByRole("heading", { name: description, exact: true }),
  ).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectStorageRoundTrip() {
  const provider = createConfiguredDocumentStorageProvider({
    env: {
      ...process.env,
      DOCUMENT_STORAGE_PROVIDER: "local",
      DOCUMENT_STORAGE_ROOT: storageRoot,
    },
  });
  const storageKey = `acceptance/pilot/${randomUUID()}.pdf`;
  const bytes = new TextEncoder().encode(
    "%PDF-1.4\n% Synthetic pilot acceptance storage smoke\n",
  );

  await provider.put({
    storageKey,
    bytes,
    contentType: "application/pdf",
    metadata: {
      pii: "none",
      purpose: "pilot-acceptance",
    },
  });

  try {
    const readBytes = await provider.get(storageKey);
    expect(Array.from(readBytes)).toEqual(Array.from(bytes));
  } finally {
    await provider.delete(storageKey);
  }
}

function activeTenantLabel(page: Page, name: string) {
  return page.locator("header").getByText(name).first();
}

function idFromUrl(url: string, segment: "customers" | "projects") {
  const parts = new URL(url).pathname.split("/");
  const index = parts.indexOf(segment);
  return index >= 0 ? (parts[index + 1] ?? "") : "";
}

async function cleanupAcceptanceData() {
  const quoteVersions = await prisma.quoteVersion.findMany({
    where: {
      tenantId,
      quote: {
        title: {
          startsWith: acceptancePrefix,
        },
      },
    },
    select: {
      id: true,
    },
  });
  const quoteVersionIds = quoteVersions.map((version) => version.id);

  if (quoteVersionIds.length > 0) {
    await prisma.quoteDelivery.deleteMany({
      where: {
        tenantId,
        quoteVersionId: {
          in: quoteVersionIds,
        },
      },
    });
    await prisma.document.deleteMany({
      where: {
        tenantId,
        quoteVersionId: {
          in: quoteVersionIds,
        },
      },
    });
  }

  await prisma.quote.deleteMany({
    where: {
      tenantId,
      title: {
        startsWith: acceptancePrefix,
      },
    },
  });
  await prisma.savedFilter.deleteMany({
    where: {
      tenantId,
      name: {
        startsWith: acceptancePrefix,
      },
    },
  });
  await prisma.project.deleteMany({
    where: {
      tenantId,
      name: {
        startsWith: acceptancePrefix,
      },
    },
  });
  await prisma.customer.deleteMany({
    where: {
      tenantId,
      displayName: {
        startsWith: acceptancePrefix,
      },
    },
  });
}
