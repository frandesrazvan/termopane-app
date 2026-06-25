import { describe, expect, it } from "vitest";
import {
  buildTemplateAPdf,
  buildTemplateAHtml,
  getPdfPackageInfo,
  type TemplateAOfferSnapshot,
} from "./index.js";

describe("Template A HTML preview", () => {
  it("renders company, customer, and quote fields", () => {
    const html = buildTemplateAHtml(templateSnapshot());

    expect(html).toContain("Termopane Demo");
    expect(html).toContain("Ana Popescu");
    expect(html).toContain("Q-2026-001");
    expect(html).toContain("Version 2");
  });

  it("renders multiple items in sort order", () => {
    const html = buildTemplateAHtml(
      templateSnapshot({
        items: [
          itemSnapshot({ id: "custom", sortOrder: 2, customerDescription: "Custom service" }),
          itemSnapshot({ id: "window", sortOrder: 1, customerDescription: "Living room window" }),
        ],
      }),
    );

    expect(html.indexOf("Living room window")).toBeLessThan(html.indexOf("Custom service"));
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
              'Oversized fixed window <script>alert("x")</script> & reinforced description '.repeat(6),
          }),
        ],
      }),
    );

    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).toContain("&amp; reinforced");
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

    expect(html.match(/No schematic available/g)).toHaveLength(2);
    expect(html).not.toContain("onload");
  });

  it("reports package support for quote-version-bound Template A previews", () => {
    const info = getPdfPackageInfo();

    expect(info.bindsToQuoteVersion).toBe(true);
    expect(info.supportedTemplates).toEqual(["template-a"]);
    expect(info.supportedOutputs).toEqual(["html", "pdf"]);
  });

  it("renders a deterministic customer-facing PDF byte stream", () => {
    const pdf = buildTemplateAPdf(templateSnapshot());
    const pdfText = new TextDecoder().decode(pdf);

    expect(pdfText.startsWith("%PDF-1.4")).toBe(true);
    expect(pdfText).toContain("Q-2026-001");
    expect(pdfText).toContain("Termopane Demo");
    expect(pdfText).toContain("Living room fixed window");
    expect(pdfText).toContain("1.190,00 RON");
    expect(pdfText).not.toContain("Supplier cost");
    expect(pdfText).not.toContain("materialCostMinor");
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
      quoteTitle: "Apartment windows",
      currency: "RON",
      issueDateIso: "2026-06-25T10:00:00.000Z",
    },
    company: {
      displayName: "Termopane Demo",
      legalName: "Termopane Demo SRL",
      taxIdentifier: "RO123456",
      addressLines: ["Strada Exemplu 1", "Bucuresti"],
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
      deliveryText: "Delivery after measurement confirmation.",
      paymentTermsText: "Payment by bank transfer.",
      warrantyText: "Warranty per signed contract.",
      validityText: "30 days",
    },
    ...overrides,
  };
}

function itemSnapshot(
  overrides: Partial<TemplateAOfferSnapshot["items"][number]> = {},
): TemplateAOfferSnapshot["items"][number] {
  return {
    id: "item-1",
    sortOrder: 1,
    itemTypeLabel: "Fixed window",
    customerDescription: "Living room fixed window",
    quantity: 2,
    widthMm: 1_200,
    heightMm: 1_400,
    surfaceAreaSquareMeters: 3.36,
    profileLabel: "Demo frame profile",
    glassLabel: "Demo glass package",
    hardwareLabel: "Fixed glazing",
    unitPriceMinor: 500_00,
    subtotalMinor: 1_000_00,
    vatMinor: 190_00,
    totalMinor: 1_190_00,
    drawingSvg:
      '<svg xmlns="http://www.w3.org/2000/svg" width="260" height="190" viewBox="0 0 260 190"><title>Safe drawing</title><rect width="260" height="190" fill="#fff"/></svg>',
    ...overrides,
  };
}
