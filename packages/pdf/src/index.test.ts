import { describe, expect, it } from "vitest";
import {
  buildQuoteHtml,
  buildQuotePdf,
  buildTemplateAPdf,
  buildTemplateAHtml,
  buildTemplateBPdf,
  buildTemplateBHtml,
  getPdfPackageInfo,
  type TemplateBOfferSnapshot,
  type TemplateAOfferSnapshot,
} from "./index.js";

const coreEnglishLabels = ["Offer summary", "Final total", "Items", "Customer"];
const coreRomanianLabels = ["Ofertă", "Client", "Total final", "Poziții ofertă"];

describe("Template A HTML preview", () => {
  it("renders company, customer, and quote fields", () => {
    const html = buildTemplateAHtml(templateSnapshot());

    expect(html).toContain("Termopane Demo");
    expect(html).toContain("Ana Popescu");
    expect(html).toContain("Q-2026-001");
    expect(html).toContain("Versiunea 2");
  });

  it("uses Romanian customer-facing labels without core English labels", () => {
    const html = buildTemplateAHtml(templateSnapshot());

    for (const label of coreRomanianLabels) {
      expect(html).toContain(label);
    }

    for (const label of coreEnglishLabels) {
      expect(html).not.toContain(label);
    }
  });

  it("renders multiple items in sort order", () => {
    const html = buildTemplateAHtml(
      templateSnapshot({
        items: [
          itemSnapshot({ id: "custom", sortOrder: 2, customerDescription: "Serviciu personalizat" }),
          itemSnapshot({ id: "window", sortOrder: 1, customerDescription: "Fereastră living" }),
        ],
      }),
    );

    expect(html.indexOf("Fereastră living")).toBeLessThan(
      html.indexOf("Serviciu personalizat"),
    );
  });

  it("hides internal costs and trace-like fields", () => {
    const html = buildTemplateAHtml(
      templateSnapshot({
        items: [
          {
            ...itemSnapshot(),
            internalMaterialCostMinor: 4_321_99,
            internalNotes: "Supplier cost must stay hidden",
            traceSummary: "secret margin trace",
          } as unknown as TemplateAOfferSnapshot["items"][number],
        ],
      }),
    );

    expect(html).not.toContain("Supplier cost");
    expect(html).not.toContain("secret margin");
    expect(html).not.toContain("4.321,99");
    expect(html).not.toContain("internalMaterialCostMinor");
  });

  it("uses the totals snapshot for visible totals", () => {
    const html = buildTemplateAHtml(
      templateSnapshot({
        totals: {
          subtotalMinor: 123_45,
          vatMinor: 23_45,
          totalMinor: 146_90,
          currency: "RON",
        },
      }),
    );

    expect(html).toContain('data-subtotal-minor="12345"');
    expect(html).toContain('data-vat-minor="2345"');
    expect(html).toContain('data-total-minor="14690"');
    expect(html).toContain("146,90 RON");
  });

  it("escapes long customer-facing text without injecting HTML", () => {
    const html = buildTemplateAHtml(
      templateSnapshot({
        items: [
          itemSnapshot({
            customerDescription:
              'Fereastră fixă supradimensionată <script>alert("x")</script> & descriere armată '.repeat(6),
          }),
        ],
      }),
    );

    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).toContain("&amp; descriere");
    expect(html).not.toContain("<script>");
  });

  it("uses a safe placeholder when drawing SVG is missing or unsafe", () => {
    const html = buildTemplateAHtml(
      templateSnapshot({
        items: [
          itemSnapshot({ id: "missing", drawingSvg: null }),
          itemSnapshot({
            id: "unsafe",
            sortOrder: 2,
            drawingSvg: '<svg onload="alert(1)"></svg>',
          }),
        ],
      }),
    );

    expect(html.match(/Schemă indisponibilă/g)).toHaveLength(2);
    expect(html).not.toContain("onload");
  });

  it("reports package support for quote-version-bound Template A previews", () => {
    const info = getPdfPackageInfo();

    expect(info.bindsToQuoteVersion).toBe(true);
    expect(info.supportedTemplates).toEqual(["template-a", "template-b"]);
    expect(info.supportedOutputs).toEqual(["html", "pdf"]);
  });

  it("renders a deterministic customer-facing PDF byte stream with Romanian labels", () => {
    const pdf = buildTemplateAPdf(templateSnapshot());
    const pdfText = new TextDecoder().decode(pdf);

    expect(pdfText.startsWith("%PDF-1.4")).toBe(true);
    expect(pdfText).toContain(pdfHexText("Q-2026-001"));
    expect(pdfText).toContain(pdfHexText("Termopane Demo"));
    expect(pdfText).toContain(pdfHexText("Fereastră fixă living"));
    expect(pdfText).toContain(pdfHexText("1.190,00 RON"));
    expect(pdfText).toContain(pdfHexText("Ofertă Template A"));
    expect(pdfText).toContain(pdfHexText("Total final"));
    expect(pdfText).not.toContain("Supplier cost");
    expect(pdfText).not.toContain("materialCostMinor");

    for (const label of coreEnglishLabels) {
      expect(pdfText).not.toContain(label);
    }
  });
});

describe("Template B compact proposal", () => {
  it("renders compact item blocks with drawing, description, MU, quantity, and unit cost", () => {
    const html = buildTemplateBHtml(templateBSnapshot());

    expect(html).toContain('data-template-key="template-b"');
    expect(html).toContain("Propunere compactă");
    expect(html).toContain("Poziții ofertă");
    expect(html).toContain("UM");
    expect(html).toContain("Cant.");
    expect(html).toContain("Preț unitar");
    expect(html).toContain("Fereastră fixă living");
    expect(html).toContain("buc.");
    expect(html).toContain("500,00 RON");
    expect(html).toContain("Total poziție");
  });

  it("shows final total square meters and total document value", () => {
    const html = buildTemplateBHtml(
      templateBSnapshot({
        items: [
          itemSnapshot({ id: "window-a", sortOrder: 1, surfaceAreaSquareMeters: 3.36 }),
          itemSnapshot({
            id: "window-b",
            sortOrder: 2,
            customerDescription: "Fereastră dormitor",
            surfaceAreaSquareMeters: 1.44,
            subtotalMinor: 600_00,
            vatMinor: 114_00,
            totalMinor: 714_00,
          }),
        ],
        totals: {
          subtotalMinor: 1_600_00,
          vatMinor: 304_00,
          totalMinor: 1_904_00,
          currency: "RON",
        },
      }),
    );

    expect(html).toContain('data-total-area-square-meters="4.80"');
    expect(html).toContain("Total m²");
    expect(html).toContain("4.80 mp");
    expect(html).toContain("Valoare totală document");
    expect(html).toContain("1.904,00 RON");
  });

  it("keeps multi-item layout page-break safe", () => {
    const manyItems = Array.from({ length: 18 }, (_, index) =>
      itemSnapshot({
        id: `item-${index + 1}`,
        sortOrder: index + 1,
        customerDescription: `Poziție compactă ${index + 1}`,
      }),
    );
    const html = buildTemplateBHtml(templateBSnapshot({ items: manyItems }));

    expect(html.match(/class="proposal-item"/g)).toHaveLength(18);
    expect(html).toContain("break-inside: avoid");
    expect(html).toContain("page-break-inside: avoid");
  });

  it("hides internal costs and trace-like fields in compact customer output", () => {
    const html = buildTemplateBHtml(
      templateBSnapshot({
        items: [
          {
            ...itemSnapshot(),
            internalMaterialCostMinor: 4_321_99,
            internalNotes: "Supplier cost must stay hidden",
            traceSummary: "secret margin trace",
          } as unknown as TemplateBOfferSnapshot["items"][number],
        ],
      }),
    );

    expect(html).not.toContain("Supplier cost");
    expect(html).not.toContain("secret margin");
    expect(html).not.toContain("4.321,99");
    expect(html).not.toContain("internalMaterialCostMinor");
  });

  it("renders a deterministic Template B PDF with Romanian labels and multiple pages", () => {
    const pdf = buildTemplateBPdf(
      templateBSnapshot({
        items: Array.from({ length: 12 }, (_, index) =>
          itemSnapshot({
            id: `item-${index + 1}`,
            sortOrder: index + 1,
            customerDescription: `Poziție PDF compactă ${index + 1}`,
          }),
        ),
      }),
    );
    const pdfText = new TextDecoder().decode(pdf);

    expect(pdfText.startsWith("%PDF-1.4")).toBe(true);
    expect(pdfText).toContain(pdfHexText("Propunere comercială"));
    expect(pdfText).toContain(pdfHexText("Poziții ofertă"));
    expect(pdfText).toContain(pdfHexText("Total m²"));
    expect(pdfText).toContain(pdfHexText("Valoare totală document"));
    expect(pdfText).toContain("/Count 3");
    expect(pdfText).not.toContain("Supplier cost");
    expect(pdfText).not.toContain("materialCostMinor");
  });

  it("routes shared HTML/PDF builders by tenant-selected template key", () => {
    const snapshot = templateBSnapshot();
    const html = buildQuoteHtml(snapshot);
    const pdfText = new TextDecoder().decode(buildQuotePdf(snapshot));

    expect(html).toContain('data-template-key="template-b"');
    expect(pdfText).toContain(pdfHexText("Template B compact"));
  });
});

function templateSnapshot(
  overrides: Partial<TemplateAOfferSnapshot> = {},
): TemplateAOfferSnapshot {
  return {
    templateKey: "template-a",
    quote: {
      quoteNumber: "Q-2026-001",
      versionNumber: 2,
      versionStatus: "LOCKED",
      quoteTitle: "Ferestre apartament",
      currency: "RON",
      issueDateIso: "2026-06-25T10:00:00.000Z",
    },
    company: {
      displayName: "Termopane Demo",
      legalName: "Termopane Demo SRL",
      taxIdentifier: "RO123456",
      addressLines: ["Strada Exemplu 1", "București"],
      phone: "+40 700 000 000",
      email: "office@example.test",
    },
    customer: {
      displayName: "Ana Popescu",
      companyName: "Ana Popescu PFA",
      addressLines: ["Strada Client 10", "Cluj-Napoca"],
      email: "ana@example.test",
    },
    items: [itemSnapshot()],
    totals: {
      subtotalMinor: 1_000_00,
      vatMinor: 190_00,
      totalMinor: 1_190_00,
      currency: "RON",
    },
    terms: {
      deliveryText: "Livrare după confirmarea măsurătorilor.",
      paymentTermsText: "Plată prin transfer bancar.",
      warrantyText: "Garanție conform contractului semnat.",
      validityText: "30 de zile",
    },
    ...overrides,
  };
}

function templateBSnapshot(
  overrides: Partial<TemplateBOfferSnapshot> = {},
): TemplateBOfferSnapshot {
  return {
    ...templateSnapshot(),
    templateKey: "template-b",
    ...overrides,
  };
}

function itemSnapshot(
  overrides: Partial<TemplateAOfferSnapshot["items"][number]> = {},
): TemplateAOfferSnapshot["items"][number] {
  return {
    id: "item-1",
    sortOrder: 1,
    itemTypeLabel: "Fereastră fixă",
    customerDescription: "Fereastră fixă living",
    quantity: 2,
    widthMm: 1_200,
    heightMm: 1_400,
    surfaceAreaSquareMeters: 3.36,
    profileLabel: "Profil demo toc",
    glassLabel: "Pachet sticlă demo",
    hardwareLabel: "Vitraj fix",
    unitPriceMinor: 500_00,
    subtotalMinor: 1_000_00,
    vatMinor: 190_00,
    totalMinor: 1_190_00,
    drawingSvg:
      '<svg xmlns="http://www.w3.org/2000/svg" width="260" height="190" viewBox="0 0 260 190"><title>Desen sigur</title><rect width="260" height="190" fill="#fff"/></svg>',
    ...overrides,
  };
}

function pdfHexText(value: string) {
  let hex = "FEFF";

  for (let index = 0; index < value.length; index += 1) {
    hex += value.charCodeAt(index).toString(16).padStart(4, "0").toUpperCase();
  }

  return `<${hex}>`;
}
