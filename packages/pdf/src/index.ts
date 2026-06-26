export type PdfPackageInfo = Readonly<{
  packageName: "@termopane/pdf";
  status: "template-a-b-html-and-pdf";
  bindsToQuoteVersion: true;
  supportedTemplates: readonly QuotePdfTemplateKey[];
  supportedOutputs: readonly ["html", "pdf"];
}>;

export type PdfPlaceholder = PdfPackageInfo;

export const quotePdfTemplateKeys = ["template-a", "template-b"] as const;

export type QuotePdfTemplateKey = (typeof quotePdfTemplateKeys)[number];

export type TemplateAMoneyMinor = number | bigint;

export type TemplateAQuoteSnapshot = Readonly<{
  quoteNumber: string;
  versionNumber: number;
  versionStatus: string;
  quoteTitle?: string | null;
  currency: string;
  issueDateIso: string;
}>;

export type TemplateACompanySnapshot = Readonly<{
  displayName: string;
  legalName?: string | null;
  taxIdentifier?: string | null;
  registrationNumber?: string | null;
  addressLines?: readonly string[];
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
}>;

export type TemplateACustomerSnapshot = Readonly<{
  displayName: string;
  companyName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  taxIdentifier?: string | null;
  addressLines?: readonly string[];
}>;

export type TemplateATermsSnapshot = Readonly<{
  paymentTermsText?: string | null;
  warrantyText?: string | null;
  deliveryText?: string | null;
  advancePaymentText?: string | null;
  validityText?: string | null;
  footerText?: string | null;
}>;

export type TemplateAItemSnapshot = Readonly<{
  id: string;
  sortOrder: number;
  itemTypeLabel: string;
  customerDescription: string;
  unitLabel?: string | null;
  quantity: number;
  widthMm?: number | null;
  heightMm?: number | null;
  surfaceAreaSquareMeters?: number | null;
  profileLabel?: string | null;
  hardwareLabel?: string | null;
  glassLabel?: string | null;
  unitPriceMinor?: TemplateAMoneyMinor | null;
  subtotalMinor?: TemplateAMoneyMinor | null;
  vatMinor?: TemplateAMoneyMinor | null;
  totalMinor?: TemplateAMoneyMinor | null;
  totalsPending?: boolean;
  drawingSvg?: string | null;
}>;

export type TemplateATotalsSnapshot = Readonly<{
  subtotalMinor: TemplateAMoneyMinor;
  vatMinor: TemplateAMoneyMinor;
  totalMinor: TemplateAMoneyMinor;
  currency: string;
}>;

export type TemplateAOfferSnapshot = Readonly<{
  templateKey: "template-a";
  locale?: string;
  quote: TemplateAQuoteSnapshot;
  company: TemplateACompanySnapshot;
  customer: TemplateACustomerSnapshot;
  items: readonly TemplateAItemSnapshot[];
  totals: TemplateATotalsSnapshot;
  terms?: TemplateATermsSnapshot;
  isDraft?: boolean;
  warning?: string | null;
}>;

export type TemplateBOfferSnapshot = Readonly<
  Omit<TemplateAOfferSnapshot, "templateKey"> & {
    templateKey: "template-b";
  }
>;

export type QuotePdfOfferSnapshot = TemplateAOfferSnapshot | TemplateBOfferSnapshot;

export function getPdfPackageInfo(): PdfPackageInfo {
  return Object.freeze({
    packageName: "@termopane/pdf",
    status: "template-a-b-html-and-pdf",
    bindsToQuoteVersion: true,
    supportedTemplates: quotePdfTemplateKeys,
    supportedOutputs: ["html", "pdf"] as const,
  });
}

export function getPdfPlaceholder(): PdfPackageInfo {
  return getPdfPackageInfo();
}

export function isQuotePdfTemplateKey(value: string): value is QuotePdfTemplateKey {
  return (quotePdfTemplateKeys as readonly string[]).includes(value);
}

export function buildQuoteHtml(
  snapshot: QuotePdfOfferSnapshot,
  templateKey: QuotePdfTemplateKey = snapshot.templateKey,
): string {
  return templateKey === "template-b"
    ? buildTemplateBHtml(snapshot)
    : buildTemplateAHtml(toTemplateASnapshot(snapshot));
}

export function buildQuotePdf(
  snapshot: QuotePdfOfferSnapshot,
  templateKey: QuotePdfTemplateKey = snapshot.templateKey,
): Uint8Array {
  return templateKey === "template-b"
    ? buildTemplateBPdf(snapshot)
    : buildTemplateAPdf(toTemplateASnapshot(snapshot));
}

export function buildTemplateAHtml(snapshot: TemplateAOfferSnapshot): string {
  const currency = safeCurrency(snapshot.totals.currency || snapshot.quote.currency);
  const versionStatus = formatVersionStatus(snapshot.quote.versionStatus);
  const sortedItems = [...snapshot.items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.id.localeCompare(right.id);
  });

  return `<!doctype html>
<html lang="${escapeHtml(snapshot.locale ?? "ro")}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(snapshot.quote.quoteNumber)} previzualizare Template A</title>
    <style>
      :root {
        color: #18181b;
        background: #f5f5f4;
        font-family: Arial, Helvetica, sans-serif;
      }
      * { box-sizing: border-box; }
      body { margin: 0; background: #f5f5f4; color: #18181b; }
      .document {
        max-width: 960px;
        margin: 0 auto;
        min-height: 100vh;
        background: #ffffff;
        padding: 36px;
      }
      .draft-ribbon {
        margin-bottom: 18px;
        border: 1px solid #f59e0b;
        background: #fffbeb;
        color: #92400e;
        padding: 10px 12px;
        font-size: 13px;
        font-weight: 700;
      }
      .header, .summary-grid, .item-layout, .totals-grid {
        display: grid;
        gap: 18px;
      }
      .header { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); align-items: start; }
      .brand { display: flex; gap: 14px; align-items: flex-start; }
      .logo {
        width: 72px;
        height: 72px;
        object-fit: contain;
        border: 1px solid #e4e4e7;
      }
      h1, h2, h3, p { margin: 0; }
      h1 { font-size: 30px; line-height: 1.1; letter-spacing: 0; }
      h2 { font-size: 16px; }
      h3 { font-size: 15px; }
      .muted { color: #52525b; }
      .small { font-size: 12px; line-height: 1.5; }
      .meta { text-align: right; }
      .meta strong, .total-value { display: block; font-size: 20px; color: #0f766e; }
      .section { margin-top: 28px; }
      .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .box {
        border: 1px solid #e4e4e7;
        background: #fafafa;
        padding: 16px;
      }
      .item {
        border: 1px solid #d4d4d8;
        margin-top: 14px;
        break-inside: avoid;
      }
      .item-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 16px;
        border-bottom: 1px solid #e4e4e7;
        background: #f8fafc;
      }
      .item-layout { grid-template-columns: 280px minmax(0, 1fr); padding: 16px; }
      .drawing {
        min-height: 190px;
        display: grid;
        place-items: center;
        border: 1px solid #e4e4e7;
        background: #f8fafc;
        overflow: hidden;
      }
      .drawing svg { max-width: 100%; height: auto; display: block; }
      .specs, .money {
        display: grid;
        gap: 8px;
        margin-top: 14px;
      }
      .row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        border-bottom: 1px solid #f4f4f5;
        padding-bottom: 7px;
        font-size: 13px;
      }
      .row span:first-child { color: #52525b; }
      .row strong { text-align: right; }
      .totals {
        margin-left: auto;
        max-width: 420px;
        border: 1px solid #0f766e;
        padding: 16px;
        background: #f0fdfa;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 0;
      }
      .total-row.final {
        border-top: 2px solid #0f766e;
        margin-top: 8px;
        padding-top: 14px;
        font-size: 20px;
        font-weight: 800;
      }
      .terms {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .footer {
        margin-top: 28px;
        border-top: 1px solid #e4e4e7;
        padding-top: 14px;
        color: #52525b;
      }
      @media (max-width: 760px) {
        .document { padding: 20px; }
        .header, .summary-grid, .item-layout, .terms { grid-template-columns: 1fr; }
        .meta { text-align: left; }
      }
      @media print {
        body { background: #ffffff; }
        .document { padding: 22mm; max-width: none; }
      }
    </style>
  </head>
  <body>
    <main class="document">
      ${snapshot.isDraft ? draftRibbon(snapshot.warning) : ""}
      <header class="header">
        ${renderCompanyHeader(snapshot.company)}
        <div class="meta">
          <p class="small muted">Ofertă Template A</p>
          <h1>${escapeHtml(snapshot.quote.quoteNumber)}</h1>
          <p class="small">Versiunea ${escapeHtml(String(snapshot.quote.versionNumber))} - ${escapeHtml(versionStatus)}</p>
          <p class="small">Data ${escapeHtml(formatDate(snapshot.quote.issueDateIso))}</p>
        </div>
      </header>

      <section class="section summary-grid">
        ${renderCustomerBlock(snapshot.customer)}
        <div class="box">
          <h2>Sumar ofertă</h2>
          <p class="small muted">${escapeHtml(snapshot.quote.quoteTitle ?? "Ofertă client")}</p>
          <p class="small">Monedă: ${escapeHtml(currency)}</p>
          <p class="small">Poziții ofertă: ${escapeHtml(String(sortedItems.length))}</p>
          <p class="small total-value">${formatMoney(snapshot.totals.totalMinor, currency)}</p>
        </div>
      </section>

      <section class="section">
        <h2>Poziții ofertă</h2>
        ${sortedItems.length > 0 ? sortedItems.map((item, index) => renderItemBlock(item, index, currency)).join("") : emptyItemsBlock()}
      </section>

      <section
        class="section totals"
        data-subtotal-minor="${escapeHtml(String(minorToNumber(snapshot.totals.subtotalMinor)))}"
        data-vat-minor="${escapeHtml(String(minorToNumber(snapshot.totals.vatMinor)))}"
        data-total-minor="${escapeHtml(String(minorToNumber(snapshot.totals.totalMinor)))}"
      >
        <div class="total-row">
          <span>Subtotal</span>
          <strong>${formatMoney(snapshot.totals.subtotalMinor, currency)}</strong>
        </div>
        <div class="total-row">
          <span>TVA</span>
          <strong>${formatMoney(snapshot.totals.vatMinor, currency)}</strong>
        </div>
        <div class="total-row final">
          <span>Total final</span>
          <strong>${formatMoney(snapshot.totals.totalMinor, currency)}</strong>
        </div>
      </section>

      ${renderTerms(snapshot.terms)}
      ${snapshot.terms?.footerText ? `<footer class="footer small">${escapeHtml(snapshot.terms.footerText)}</footer>` : ""}
    </main>
  </body>
</html>`;
}

export function buildTemplateBHtml(snapshot: TemplateAOfferSnapshot | TemplateBOfferSnapshot): string {
  const currency = safeCurrency(snapshot.totals.currency || snapshot.quote.currency);
  const sortedItems = sortTemplateItems(snapshot.items);
  const totalArea = totalSurfaceAreaSquareMeters(sortedItems);

  return `<!doctype html>
<html lang="${escapeHtml(snapshot.locale ?? "ro")}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(snapshot.quote.quoteNumber)} previzualizare Template B</title>
    <style>
      :root {
        color: #1f2937;
        background: #f4f4f5;
        font-family: Arial, Helvetica, sans-serif;
      }
      * { box-sizing: border-box; }
      body { margin: 0; background: #f4f4f5; color: #1f2937; }
      .document {
        max-width: 940px;
        margin: 0 auto;
        min-height: 100vh;
        background: #ffffff;
        padding: 26px;
      }
      .draft-ribbon {
        margin-bottom: 14px;
        border: 1px solid #f59e0b;
        background: #fffbeb;
        color: #92400e;
        padding: 9px 11px;
        font-size: 12px;
        font-weight: 700;
      }
      h1, h2, h3, p { margin: 0; }
      h1 { font-size: 24px; line-height: 1.12; letter-spacing: 0; text-transform: uppercase; }
      h2 { font-size: 15px; }
      h3 { font-size: 14px; line-height: 1.25; }
      .small { font-size: 12px; line-height: 1.45; }
      .muted { color: #5b6472; }
      .header {
        display: grid;
        grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.9fr);
        gap: 20px;
        align-items: start;
        border-bottom: 2px solid #1f2937;
        padding-bottom: 14px;
      }
      .brand { display: flex; gap: 12px; align-items: flex-start; }
      .logo {
        width: 60px;
        height: 60px;
        object-fit: contain;
        border: 1px solid #d4d4d8;
      }
      .meta { text-align: right; }
      .proposal-title { color: #0f766e; font-weight: 800; }
      .summary-line {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 14px;
        align-items: end;
        margin-top: 18px;
        padding: 12px 0;
        border-bottom: 1px solid #d4d4d8;
      }
      .section { margin-top: 18px; }
      .proposal-item {
        border: 1px solid #c8ccd2;
        margin-top: 10px;
        background: #ffffff;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .item-main {
        display: grid;
        grid-template-columns: 190px minmax(0, 1fr) 170px;
        min-height: 148px;
      }
      .item-drawing {
        display: grid;
        place-items: center;
        border-right: 1px solid #d4d4d8;
        background: #f8fafc;
        padding: 8px;
        overflow: hidden;
      }
      .item-drawing svg { max-width: 100%; height: auto; display: block; }
      .item-description {
        padding: 12px 14px;
        min-width: 0;
      }
      .item-commercial {
        display: grid;
        align-content: start;
        gap: 0;
        border-left: 1px solid #d4d4d8;
        background: #fafafa;
      }
      .commercial-row {
        display: grid;
        grid-template-columns: 64px minmax(0, 1fr);
        min-height: 36px;
        border-bottom: 1px solid #e4e4e7;
        font-size: 12px;
      }
      .commercial-row span,
      .commercial-row strong {
        padding: 9px 10px;
      }
      .commercial-row span {
        border-right: 1px solid #e4e4e7;
        color: #5b6472;
        font-weight: 700;
      }
      .commercial-row strong {
        text-align: right;
        overflow-wrap: anywhere;
      }
      .item-index {
        color: #0f766e;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
      }
      .specs {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 5px 12px;
        margin-top: 10px;
      }
      .spec-row {
        display: grid;
        grid-template-columns: 82px minmax(0, 1fr);
        gap: 6px;
        font-size: 11px;
        line-height: 1.35;
      }
      .spec-row span { color: #5b6472; }
      .spec-row strong { overflow-wrap: anywhere; }
      .item-total-band {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        background: #0f766e;
        color: #ffffff;
        padding: 8px 12px;
        font-size: 13px;
        font-weight: 800;
      }
      .final-summary {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        border: 2px solid #0f766e;
        margin-top: 18px;
      }
      .summary-cell {
        padding: 14px;
      }
      .summary-cell + .summary-cell { border-left: 1px solid #99f6e4; }
      .summary-cell span {
        display: block;
        color: #5b6472;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .summary-cell strong {
        display: block;
        margin-top: 5px;
        font-size: 20px;
        color: #0f766e;
      }
      .footer {
        margin-top: 22px;
        border-top: 1px solid #d4d4d8;
        padding-top: 12px;
        color: #5b6472;
      }
      @media (max-width: 760px) {
        .document { padding: 18px; }
        .header, .summary-line, .item-main, .final-summary { grid-template-columns: 1fr; }
        .meta { text-align: left; }
        .item-drawing, .item-commercial { border-left: 0; border-right: 0; border-top: 1px solid #d4d4d8; }
        .item-drawing { border-top: 0; min-height: 160px; }
        .summary-cell + .summary-cell { border-left: 0; border-top: 1px solid #99f6e4; }
      }
      @page { size: A4; margin: 14mm; }
      @media print {
        body { background: #ffffff; }
        .document { padding: 0; max-width: none; }
        .proposal-item { break-inside: avoid; page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <main class="document" data-template-key="template-b">
      ${snapshot.isDraft ? draftRibbon(snapshot.warning) : ""}
      <header class="header">
        ${renderCompanyHeader(snapshot.company)}
        <div class="meta">
          <p class="small muted">Propunere comercială · Template B</p>
          <h1>${escapeHtml(snapshot.quote.quoteNumber)}</h1>
          <p class="small">Versiunea ${escapeHtml(String(snapshot.quote.versionNumber))} - ${escapeHtml(formatVersionStatus(snapshot.quote.versionStatus))}</p>
          <p class="small">Data ${escapeHtml(formatDate(snapshot.quote.issueDateIso))}</p>
        </div>
      </header>

      <section class="summary-line">
        <div>
          <p class="proposal-title">Propunere compactă</p>
          <h2>${escapeHtml(snapshot.quote.quoteTitle ?? "Ofertă client")}</h2>
          <p class="small muted">Client: ${escapeHtml(snapshot.customer.displayName)}</p>
        </div>
        <div class="small">
          <strong>${formatMoney(snapshot.totals.totalMinor, currency)}</strong>
          <p class="muted">${escapeHtml(String(sortedItems.length))} poziții ofertă</p>
        </div>
      </section>

      <section class="section">
        <h2>Poziții ofertă</h2>
        ${sortedItems.length > 0 ? sortedItems.map((item, index) => renderTemplateBItemBlock(item, index, currency)).join("") : emptyItemsBlock()}
      </section>

      <section
        class="final-summary"
        data-total-area-square-meters="${escapeHtml(totalArea === null ? "" : totalArea.toFixed(2))}"
        data-total-document-minor="${escapeHtml(String(minorToNumber(snapshot.totals.totalMinor)))}"
      >
        <div class="summary-cell">
          <span>Total m²</span>
          <strong>${escapeHtml(formatAreaSummary(totalArea))}</strong>
        </div>
        <div class="summary-cell">
          <span>Valoare totală document</span>
          <strong>${formatMoney(snapshot.totals.totalMinor, currency)}</strong>
        </div>
      </section>

      ${snapshot.terms?.footerText ? `<footer class="footer small">${escapeHtml(snapshot.terms.footerText)}</footer>` : ""}
    </main>
  </body>
</html>`;
}

export function buildTemplateAPdf(snapshot: TemplateAOfferSnapshot): Uint8Array {
  const renderer = new TemplateAPdfRenderer(snapshot);

  return renderer.render();
}

export function buildTemplateBPdf(snapshot: TemplateAOfferSnapshot | TemplateBOfferSnapshot): Uint8Array {
  const renderer = new TemplateBPdfRenderer(snapshot);

  return renderer.render();
}

const PDF_PAGE_WIDTH = 595.28;
const PDF_PAGE_HEIGHT = 841.89;
const PDF_MARGIN = 42;
const PDF_CONTENT_WIDTH = PDF_PAGE_WIDTH - PDF_MARGIN * 2;

class TemplateAPdfRenderer {
  private currentPage = new PdfPageCanvas();
  private readonly pages: PdfPageCanvas[] = [this.currentPage];
  private cursorTop = PDF_MARGIN;
  private readonly currency: string;
  private readonly sortedItems: TemplateAItemSnapshot[];

  constructor(private readonly snapshot: TemplateAOfferSnapshot) {
    this.currency = safeCurrency(snapshot.totals.currency || snapshot.quote.currency);
    this.sortedItems = [...snapshot.items].sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.id.localeCompare(right.id);
    });
  }

  render() {
    this.renderHeader();
    this.renderCustomerSummary();
    this.renderItems();
    this.renderTotalsAndTerms();
    this.renderFooters();

    return writePdfDocument(this.pages.map((page) => page.toString()));
  }

  private renderHeader() {
    if (this.snapshot.isDraft) {
      this.currentPage.fillRect(PDF_MARGIN, this.cursorTop, PDF_CONTENT_WIDTH, 24, 1, 0.97, 0.86);
      this.currentPage.text(
        PDF_MARGIN + 8,
        this.cursorTop + 15,
        this.snapshot.warning ?? "PDF de test/ciornă. Blochează versiunea înainte de trimitere.",
        9,
        "bold",
      );
      this.cursorTop += 38;
    }

    this.currentPage.text(PDF_MARGIN, this.cursorTop, this.snapshot.company.displayName, 18, "bold");
    this.currentPage.textRight(
      PDF_MARGIN + PDF_CONTENT_WIDTH,
      this.cursorTop,
      this.snapshot.quote.quoteNumber,
      18,
      "bold",
    );
    this.cursorTop += 18;

    const companyLines = cleanTextList([
      this.snapshot.company.legalName,
      this.snapshot.company.taxIdentifier
        ? `CUI: ${this.snapshot.company.taxIdentifier}`
        : null,
      this.snapshot.company.registrationNumber
        ? `Reg.: ${this.snapshot.company.registrationNumber}`
        : null,
      ...(this.snapshot.company.addressLines ?? []),
      this.snapshot.company.phone,
      this.snapshot.company.email,
      this.snapshot.company.website,
    ]);

    const metaLines = [
      "Ofertă Template A",
      `Versiunea ${this.snapshot.quote.versionNumber} - ${formatVersionStatus(this.snapshot.quote.versionStatus)}`,
      `Data ${formatDate(this.snapshot.quote.issueDateIso)}`,
    ];

    const lines = Math.max(companyLines.length, metaLines.length);

    for (let index = 0; index < lines; index += 1) {
      const top = this.cursorTop + index * 12;
      const companyLine = companyLines[index];
      const metaLine = metaLines[index];

      if (companyLine) {
        this.currentPage.text(PDF_MARGIN, top, companyLine, 9);
      }

      if (metaLine) {
        this.currentPage.textRight(PDF_MARGIN + PDF_CONTENT_WIDTH, top, metaLine, 9);
      }
    }

    this.cursorTop += lines * 12 + 18;
    this.currentPage.line(PDF_MARGIN, this.cursorTop, PDF_MARGIN + PDF_CONTENT_WIDTH, this.cursorTop);
    this.cursorTop += 18;
  }

  private renderCustomerSummary() {
    const boxWidth = (PDF_CONTENT_WIDTH - 16) / 2;
    const boxHeight = 118;

    this.ensureSpace(boxHeight + 20);
    this.currentPage.strokeRect(PDF_MARGIN, this.cursorTop, boxWidth, boxHeight);
    this.currentPage.strokeRect(PDF_MARGIN + boxWidth + 16, this.cursorTop, boxWidth, boxHeight);
    this.currentPage.text(PDF_MARGIN + 10, this.cursorTop + 16, "Client", 12, "bold");
    this.currentPage.text(
      PDF_MARGIN + boxWidth + 26,
      this.cursorTop + 16,
      "Sumar ofertă",
      12,
      "bold",
    );

    const customerLines = cleanTextList([
      this.snapshot.customer.displayName,
      this.snapshot.customer.companyName,
      this.snapshot.customer.contactName,
      this.snapshot.customer.taxIdentifier
        ? `CUI: ${this.snapshot.customer.taxIdentifier}`
        : null,
      this.snapshot.customer.email,
      this.snapshot.customer.phone,
      ...(this.snapshot.customer.addressLines ?? []),
    ]);
    this.currentPage.textBlock(PDF_MARGIN + 10, this.cursorTop + 34, boxWidth - 20, customerLines, 9);

    const summaryLines = [
      this.snapshot.quote.quoteTitle ?? "Ofertă client",
      `Monedă: ${this.currency}`,
      `Poziții ofertă: ${this.sortedItems.length}`,
      `Total final: ${formatMoney(this.snapshot.totals.totalMinor, this.currency)}`,
    ];
    this.currentPage.textBlock(
      PDF_MARGIN + boxWidth + 26,
      this.cursorTop + 34,
      boxWidth - 20,
      summaryLines,
      9,
    );

    this.cursorTop += boxHeight + 24;
  }

  private renderItems() {
    this.currentPage.text(PDF_MARGIN, this.cursorTop, "Poziții ofertă", 14, "bold");
    this.cursorTop += 20;

    if (this.sortedItems.length === 0) {
      this.ensureSpace(48);
      this.currentPage.strokeRect(PDF_MARGIN, this.cursorTop, PDF_CONTENT_WIDTH, 38);
      this.currentPage.text(
        PDF_MARGIN + 10,
        this.cursorTop + 22,
        "Nu există poziții pentru client pe această versiune de ofertă.",
        9,
      );
      this.cursorTop += 54;
      return;
    }

    this.sortedItems.forEach((item, index) => this.renderItem(item, index));
  }

  private renderItem(item: TemplateAItemSnapshot, index: number) {
    const itemHeight = 156;

    this.ensureSpace(itemHeight + 18);
    this.currentPage.strokeRect(PDF_MARGIN, this.cursorTop, PDF_CONTENT_WIDTH, itemHeight);
    this.currentPage.fillRect(PDF_MARGIN, this.cursorTop, PDF_CONTENT_WIDTH, 28, 0.97, 0.98, 1);
    this.currentPage.text(
      PDF_MARGIN + 10,
      this.cursorTop + 17,
      `#${index + 1} ${item.itemTypeLabel}`,
      9,
      "bold",
    );
    this.currentPage.textRight(
      PDF_MARGIN + PDF_CONTENT_WIDTH - 10,
      this.cursorTop + 17,
      formatMoneyOrPending(item.totalMinor, this.currency, item.totalsPending),
      9,
      "bold",
    );

    const drawingLeft = PDF_MARGIN + 10;
    const drawingTop = this.cursorTop + 42;
    this.renderItemSchematic(item, drawingLeft, drawingTop, 150, 88);

    const textLeft = drawingLeft + 166;
    const textWidth = PDF_CONTENT_WIDTH - 186;
    this.currentPage.text(textLeft, drawingTop, item.customerDescription, 11, "bold");

    const specs = cleanTextList([
      `Cantitate: ${item.quantity}`,
      item.widthMm && item.heightMm
        ? `Dimensiuni: ${formatDimension(item.widthMm)} x ${formatDimension(item.heightMm)} mm`
        : "Dimensiuni: Nespecificat",
      item.surfaceAreaSquareMeters
        ? `Suprafață: ${item.surfaceAreaSquareMeters.toFixed(2)} mp`
        : null,
      item.profileLabel ? `Profil: ${item.profileLabel}` : null,
      item.glassLabel ? `Sticlă/panou: ${item.glassLabel}` : null,
      item.hardwareLabel ? `Feronerie: ${item.hardwareLabel}` : null,
      `Preț unitar: ${formatMoneyOrPending(item.unitPriceMinor, this.currency, item.totalsPending)}`,
      `Subtotal: ${formatMoneyOrPending(item.subtotalMinor, this.currency, item.totalsPending)}`,
      `TVA: ${formatMoneyOrPending(item.vatMinor, this.currency, item.totalsPending)}`,
    ]);

    this.currentPage.textBlock(textLeft, drawingTop + 18, textWidth, specs, 8.5);
    this.cursorTop += itemHeight + 16;
  }

  private renderItemSchematic(
    item: TemplateAItemSnapshot,
    left: number,
    top: number,
    width: number,
    height: number,
  ) {
    this.currentPage.strokeRect(left, top, width, height);
    this.currentPage.fillRect(left + 6, top + 6, width - 12, height - 12, 0.94, 0.98, 1);
    this.currentPage.strokeRect(left + 20, top + 16, width - 40, height - 34);

    if (item.widthMm && item.heightMm) {
      this.currentPage.textCenter(
        left + width / 2,
        top + height - 10,
        `${formatDimension(item.widthMm)} mm`,
        7.5,
      );
      this.currentPage.textRight(
        left + width - 6,
        top + height / 2,
        `${formatDimension(item.heightMm)} mm`,
        7.5,
      );
    } else {
      this.currentPage.textCenter(left + width / 2, top + height / 2, "Schemă indisponibilă", 8);
    }
  }

  private renderTotalsAndTerms() {
    this.ensureSpace(170);
    const totalsWidth = 230;
    const totalsLeft = PDF_MARGIN + PDF_CONTENT_WIDTH - totalsWidth;

    this.currentPage.strokeRect(totalsLeft, this.cursorTop, totalsWidth, 88);
    this.currentPage.text(totalsLeft + 10, this.cursorTop + 18, "Totaluri", 12, "bold");
    this.currentPage.text(totalsLeft + 10, this.cursorTop + 38, "Subtotal", 9);
    this.currentPage.textRight(
      totalsLeft + totalsWidth - 10,
      this.cursorTop + 38,
      formatMoney(this.snapshot.totals.subtotalMinor, this.currency),
      9,
      "bold",
    );
    this.currentPage.text(totalsLeft + 10, this.cursorTop + 54, "TVA", 9);
    this.currentPage.textRight(
      totalsLeft + totalsWidth - 10,
      this.cursorTop + 54,
      formatMoney(this.snapshot.totals.vatMinor, this.currency),
      9,
      "bold",
    );
    this.currentPage.line(totalsLeft + 10, this.cursorTop + 64, totalsLeft + totalsWidth - 10, this.cursorTop + 64);
    this.currentPage.text(totalsLeft + 10, this.cursorTop + 78, "Total final", 11, "bold");
    this.currentPage.textRight(
      totalsLeft + totalsWidth - 10,
      this.cursorTop + 78,
      formatMoney(this.snapshot.totals.totalMinor, this.currency),
      11,
      "bold",
    );

    this.cursorTop += 112;

    const terms = cleanTextList([
      this.snapshot.terms?.deliveryText ? `Livrare: ${this.snapshot.terms.deliveryText}` : null,
      this.snapshot.terms?.advancePaymentText
        ? `Avans: ${this.snapshot.terms.advancePaymentText}`
        : null,
      this.snapshot.terms?.paymentTermsText
        ? `Plată: ${this.snapshot.terms.paymentTermsText}`
        : null,
      this.snapshot.terms?.warrantyText ? `Garanție: ${this.snapshot.terms.warrantyText}` : null,
      this.snapshot.terms?.validityText ? `Valabilitate: ${this.snapshot.terms.validityText}` : null,
    ]);

    if (terms.length > 0) {
      this.ensureSpace(90);
      this.currentPage.text(PDF_MARGIN, this.cursorTop, "Termeni", 12, "bold");
      this.currentPage.textBlock(PDF_MARGIN, this.cursorTop + 18, PDF_CONTENT_WIDTH, terms, 9);
      this.cursorTop += 28 + terms.length * 13;
    }

    if (this.snapshot.terms?.footerText) {
      this.ensureSpace(42);
      this.currentPage.line(PDF_MARGIN, this.cursorTop, PDF_MARGIN + PDF_CONTENT_WIDTH, this.cursorTop);
      this.currentPage.textBlock(
        PDF_MARGIN,
        this.cursorTop + 14,
        PDF_CONTENT_WIDTH,
        [this.snapshot.terms.footerText],
        8,
      );
    }
  }

  private renderFooters() {
    const pageCount = this.pages.length;

    this.pages.forEach((page, index) => {
      page.line(PDF_MARGIN, PDF_PAGE_HEIGHT - 34, PDF_MARGIN + PDF_CONTENT_WIDTH, PDF_PAGE_HEIGHT - 34);
      page.text(PDF_MARGIN, PDF_PAGE_HEIGHT - 20, "Generat din snapshot-ul versiunii ofertei", 7.5);
      page.textRight(
        PDF_MARGIN + PDF_CONTENT_WIDTH,
        PDF_PAGE_HEIGHT - 20,
        `Pagina ${index + 1} din ${pageCount}`,
        7.5,
      );
    });
  }

  private ensureSpace(height: number) {
    if (this.cursorTop + height <= PDF_PAGE_HEIGHT - PDF_MARGIN) {
      return;
    }

    this.currentPage = new PdfPageCanvas();
    this.pages.push(this.currentPage);
    this.cursorTop = PDF_MARGIN;
  }
}

class TemplateBPdfRenderer {
  private currentPage = new PdfPageCanvas();
  private readonly pages: PdfPageCanvas[] = [this.currentPage];
  private cursorTop = PDF_MARGIN;
  private readonly currency: string;
  private readonly sortedItems: TemplateAItemSnapshot[];

  constructor(private readonly snapshot: TemplateAOfferSnapshot | TemplateBOfferSnapshot) {
    this.currency = safeCurrency(snapshot.totals.currency || snapshot.quote.currency);
    this.sortedItems = sortTemplateItems(snapshot.items);
  }

  render() {
    this.renderHeader();
    this.renderCustomerSummary();
    this.renderItems();
    this.renderFinalSummary();
    this.renderFooters();

    return writePdfDocument(this.pages.map((page) => page.toString()));
  }

  private renderHeader() {
    if (this.snapshot.isDraft) {
      this.currentPage.fillRect(PDF_MARGIN, this.cursorTop, PDF_CONTENT_WIDTH, 22, 1, 0.97, 0.86);
      this.currentPage.text(
        PDF_MARGIN + 8,
        this.cursorTop + 14,
        this.snapshot.warning ?? "PDF de test/ciornă. Blochează versiunea înainte de trimitere.",
        8.5,
        "bold",
      );
      this.cursorTop += 34;
    }

    this.currentPage.text(PDF_MARGIN, this.cursorTop, this.snapshot.company.displayName, 17, "bold");
    this.currentPage.textRight(
      PDF_MARGIN + PDF_CONTENT_WIDTH,
      this.cursorTop,
      "Propunere comercială",
      15,
      "bold",
    );
    this.cursorTop += 17;

    const companyLines = cleanTextList([
      this.snapshot.company.legalName,
      this.snapshot.company.taxIdentifier
        ? `CUI: ${this.snapshot.company.taxIdentifier}`
        : null,
      this.snapshot.company.registrationNumber
        ? `Reg.: ${this.snapshot.company.registrationNumber}`
        : null,
      ...(this.snapshot.company.addressLines ?? []),
      this.snapshot.company.phone,
      this.snapshot.company.email,
      this.snapshot.company.website,
    ]);

    const metaLines = [
      `Ofertă ${this.snapshot.quote.quoteNumber}`,
      `Versiunea ${this.snapshot.quote.versionNumber} - ${formatVersionStatus(this.snapshot.quote.versionStatus)}`,
      `Data ${formatDate(this.snapshot.quote.issueDateIso)}`,
      "Template B compact",
    ];
    const lines = Math.max(companyLines.length, metaLines.length);

    for (let index = 0; index < lines; index += 1) {
      const top = this.cursorTop + index * 11;
      const companyLine = companyLines[index];
      const metaLine = metaLines[index];

      if (companyLine) {
        this.currentPage.text(PDF_MARGIN, top, companyLine, 8.3);
      }

      if (metaLine) {
        this.currentPage.textRight(PDF_MARGIN + PDF_CONTENT_WIDTH, top, metaLine, 8.3);
      }
    }

    this.cursorTop += lines * 11 + 14;
    this.currentPage.line(PDF_MARGIN, this.cursorTop, PDF_MARGIN + PDF_CONTENT_WIDTH, this.cursorTop);
    this.cursorTop += 16;
  }

  private renderCustomerSummary() {
    const boxHeight = 68;

    this.ensureSpace(boxHeight + 18);
    this.currentPage.strokeRect(PDF_MARGIN, this.cursorTop, PDF_CONTENT_WIDTH, boxHeight);
    this.currentPage.fillRect(PDF_MARGIN, this.cursorTop, PDF_CONTENT_WIDTH, 22, 0.94, 0.98, 0.97);
    this.currentPage.text(PDF_MARGIN + 10, this.cursorTop + 14, "Client", 10, "bold");
    this.currentPage.textRight(
      PDF_MARGIN + PDF_CONTENT_WIDTH - 10,
      this.cursorTop + 14,
      `${this.sortedItems.length} poziții ofertă`,
      9,
      "bold",
    );

    const summaryLines = cleanTextList([
      this.snapshot.customer.displayName,
      this.snapshot.quote.quoteTitle ?? "Ofertă client",
      this.snapshot.customer.contactName,
      this.snapshot.customer.email,
      this.snapshot.customer.phone,
    ]);
    this.currentPage.textBlock(PDF_MARGIN + 10, this.cursorTop + 36, PDF_CONTENT_WIDTH - 20, summaryLines, 8.5);
    this.cursorTop += boxHeight + 18;
  }

  private renderItems() {
    this.currentPage.text(PDF_MARGIN, this.cursorTop, "Poziții ofertă", 12, "bold");
    this.cursorTop += 16;

    if (this.sortedItems.length === 0) {
      this.ensureSpace(46);
      this.currentPage.strokeRect(PDF_MARGIN, this.cursorTop, PDF_CONTENT_WIDTH, 34);
      this.currentPage.text(
        PDF_MARGIN + 10,
        this.cursorTop + 20,
        "Nu există poziții pentru client pe această versiune de ofertă.",
        8.5,
      );
      this.cursorTop += 46;
      return;
    }

    this.sortedItems.forEach((item, index) => this.renderItem(item, index));
  }

  private renderItem(item: TemplateAItemSnapshot, index: number) {
    const itemHeight = 126;
    const drawingWidth = 118;
    const commercialWidth = 126;
    const gap = 10;
    const textLeft = PDF_MARGIN + drawingWidth + gap * 2;
    const commercialLeft = PDF_MARGIN + PDF_CONTENT_WIDTH - commercialWidth - 10;
    const textWidth = commercialLeft - textLeft - gap;
    const title = item.customerDescription || item.itemTypeLabel || `Poziția ${index + 1}`;

    this.ensureSpace(itemHeight + 14);
    this.currentPage.strokeRect(PDF_MARGIN, this.cursorTop, PDF_CONTENT_WIDTH, itemHeight);
    this.currentPage.fillRect(PDF_MARGIN, this.cursorTop + itemHeight - 22, PDF_CONTENT_WIDTH, 22, 0.06, 0.46, 0.43);
    this.currentPage.text(
      PDF_MARGIN + 10,
      this.cursorTop + itemHeight - 8,
      "Total poziție",
      8.5,
      "bold",
    );
    this.currentPage.textRight(
      PDF_MARGIN + PDF_CONTENT_WIDTH - 10,
      this.cursorTop + itemHeight - 8,
      formatMoneyOrPending(item.totalMinor, this.currency, item.totalsPending),
      8.5,
      "bold",
    );

    this.renderItemSchematic(item, PDF_MARGIN + 10, this.cursorTop + 18, drawingWidth, 76);
    this.currentPage.text(textLeft, this.cursorTop + 18, `Poziția ${index + 1} · ${item.itemTypeLabel}`, 7.8, "bold");
    this.currentPage.textBlock(textLeft, this.cursorTop + 32, textWidth, [title], 9.2);

    const specs = cleanTextList([
      item.widthMm && item.heightMm
        ? `Dimensiuni: ${formatDimension(item.widthMm)} x ${formatDimension(item.heightMm)} mm`
        : "Dimensiuni: Nespecificat",
      item.surfaceAreaSquareMeters ? `Suprafață: ${item.surfaceAreaSquareMeters.toFixed(2)} mp` : null,
      item.profileLabel ? `Profil: ${item.profileLabel}` : null,
      item.glassLabel ? `Sticlă/panou: ${item.glassLabel}` : null,
      item.hardwareLabel ? `Feronerie: ${item.hardwareLabel}` : null,
    ]);
    this.currentPage.textBlock(textLeft, this.cursorTop + 58, textWidth, specs, 7.6);

    this.currentPage.line(commercialLeft, this.cursorTop, commercialLeft, this.cursorTop + itemHeight - 22);
    this.currentPage.text(commercialLeft + 8, this.cursorTop + 20, "UM", 8, "bold");
    this.currentPage.textRight(commercialLeft + commercialWidth - 8, this.cursorTop + 20, itemUnitLabel(item), 8, "bold");
    this.currentPage.line(commercialLeft, this.cursorTop + 30, commercialLeft + commercialWidth, this.cursorTop + 30);
    this.currentPage.text(commercialLeft + 8, this.cursorTop + 48, "Cant.", 8, "bold");
    this.currentPage.textRight(commercialLeft + commercialWidth - 8, this.cursorTop + 48, formatQuantity(item.quantity), 8, "bold");
    this.currentPage.line(commercialLeft, this.cursorTop + 58, commercialLeft + commercialWidth, this.cursorTop + 58);
    this.currentPage.text(commercialLeft + 8, this.cursorTop + 76, "Preț unitar", 8, "bold");
    this.currentPage.textRight(
      commercialLeft + commercialWidth - 8,
      this.cursorTop + 76,
      formatMoneyOrPending(itemUnitCostMinor(item), this.currency, item.totalsPending),
      8,
      "bold",
    );

    this.cursorTop += itemHeight + 12;
  }

  private renderItemSchematic(
    item: TemplateAItemSnapshot,
    left: number,
    top: number,
    width: number,
    height: number,
  ) {
    this.currentPage.strokeRect(left, top, width, height);
    this.currentPage.fillRect(left + 5, top + 5, width - 10, height - 10, 0.96, 0.98, 1);
    this.currentPage.strokeRect(left + 16, top + 13, width - 32, height - 28);

    if (item.widthMm && item.heightMm) {
      this.currentPage.textCenter(left + width / 2, top + height - 8, `${formatDimension(item.widthMm)} mm`, 7);
      this.currentPage.textRight(left + width - 5, top + height / 2, `${formatDimension(item.heightMm)} mm`, 7);
      return;
    }

    this.currentPage.textCenter(left + width / 2, top + height / 2, "Schemă indisponibilă", 7.5);
  }

  private renderFinalSummary() {
    const boxHeight = 58;
    const totalArea = totalSurfaceAreaSquareMeters(this.sortedItems);

    this.ensureSpace(boxHeight + 28);
    this.currentPage.strokeRect(PDF_MARGIN, this.cursorTop, PDF_CONTENT_WIDTH, boxHeight);
    this.currentPage.fillRect(PDF_MARGIN, this.cursorTop, PDF_CONTENT_WIDTH, boxHeight, 0.94, 0.99, 0.98);
    this.currentPage.text(PDF_MARGIN + 12, this.cursorTop + 18, "Total m²", 9, "bold");
    this.currentPage.text(PDF_MARGIN + 12, this.cursorTop + 40, formatAreaSummary(totalArea), 14, "bold");
    this.currentPage.textRight(
      PDF_MARGIN + PDF_CONTENT_WIDTH - 12,
      this.cursorTop + 18,
      "Valoare totală document",
      9,
      "bold",
    );
    this.currentPage.textRight(
      PDF_MARGIN + PDF_CONTENT_WIDTH - 12,
      this.cursorTop + 40,
      formatMoney(this.snapshot.totals.totalMinor, this.currency),
      14,
      "bold",
    );
    this.cursorTop += boxHeight + 18;

    if (this.snapshot.terms?.footerText) {
      this.ensureSpace(38);
      this.currentPage.line(PDF_MARGIN, this.cursorTop, PDF_MARGIN + PDF_CONTENT_WIDTH, this.cursorTop);
      this.currentPage.textBlock(
        PDF_MARGIN,
        this.cursorTop + 12,
        PDF_CONTENT_WIDTH,
        [this.snapshot.terms.footerText],
        7.5,
      );
    }
  }

  private renderFooters() {
    const pageCount = this.pages.length;

    this.pages.forEach((page, index) => {
      page.line(PDF_MARGIN, PDF_PAGE_HEIGHT - 34, PDF_MARGIN + PDF_CONTENT_WIDTH, PDF_PAGE_HEIGHT - 34);
      page.text(PDF_MARGIN, PDF_PAGE_HEIGHT - 20, "Propunere generată din snapshot-ul versiunii ofertei", 7.2);
      page.textRight(
        PDF_MARGIN + PDF_CONTENT_WIDTH,
        PDF_PAGE_HEIGHT - 20,
        `Pagina ${index + 1} din ${pageCount}`,
        7.2,
      );
    });
  }

  private ensureSpace(height: number) {
    if (this.cursorTop + height <= PDF_PAGE_HEIGHT - PDF_MARGIN) {
      return;
    }

    this.currentPage = new PdfPageCanvas();
    this.pages.push(this.currentPage);
    this.cursorTop = PDF_MARGIN;
  }
}

class PdfPageCanvas {
  private readonly operations: string[] = [];

  text(
    x: number,
    top: number,
    value: string,
    size: number,
    font: "regular" | "bold" = "regular",
  ) {
    this.operations.push(
      `BT /${font === "bold" ? "F2" : "F1"} ${formatPdfNumber(size)} Tf 1 0 0 1 ${formatPdfNumber(x)} ${formatPdfNumber(topToPdfY(top))} Tm ${pdfTextHex(value)} Tj ET`,
    );
  }

  textRight(
    x: number,
    top: number,
    value: string,
    size: number,
    font: "regular" | "bold" = "regular",
  ) {
    const width = estimateTextWidth(value, size);

    this.text(x - width, top, value, size, font);
  }

  textCenter(x: number, top: number, value: string, size: number) {
    this.text(x - estimateTextWidth(value, size) / 2, top, value, size);
  }

  textBlock(
    x: number,
    top: number,
    width: number,
    lines: readonly string[],
    size: number,
  ) {
    let currentTop = top;

    for (const line of lines) {
      for (const wrappedLine of wrapText(line, width, size)) {
        this.text(x, currentTop, wrappedLine, size);
        currentTop += size + 4;
      }
    }
  }

  line(left: number, top: number, right: number, bottom: number) {
    this.operations.push(
      `${formatPdfNumber(left)} ${formatPdfNumber(topToPdfY(top))} m ${formatPdfNumber(right)} ${formatPdfNumber(topToPdfY(bottom))} l S`,
    );
  }

  strokeRect(left: number, top: number, width: number, height: number) {
    this.operations.push(
      `${formatPdfNumber(left)} ${formatPdfNumber(topToPdfY(top + height))} ${formatPdfNumber(width)} ${formatPdfNumber(height)} re S`,
    );
  }

  fillRect(
    left: number,
    top: number,
    width: number,
    height: number,
    red: number,
    green: number,
    blue: number,
  ) {
    this.operations.push(
      `q ${formatPdfNumber(red)} ${formatPdfNumber(green)} ${formatPdfNumber(blue)} rg ${formatPdfNumber(left)} ${formatPdfNumber(topToPdfY(top + height))} ${formatPdfNumber(width)} ${formatPdfNumber(height)} re f Q`,
    );
  }

  toString() {
    return this.operations.join("\n");
  }
}

class PdfObjectWriter {
  private readonly objects: string[] = [];

  reserveObject() {
    this.objects.push("");

    return this.objects.length;
  }

  addObject(content: string) {
    const id = this.reserveObject();

    this.setObject(id, content);

    return id;
  }

  setObject(id: number, content: string) {
    this.objects[id - 1] = content;
  }

  write(rootObjectId: number) {
    const chunks = ["%PDF-1.4\n"];
    const offsets = [0];
    let offset = chunks[0]?.length ?? 0;

    this.objects.forEach((content, index) => {
      offsets.push(offset);
      const objectText = `${index + 1} 0 obj\n${content}\nendobj\n`;

      chunks.push(objectText);
      offset += objectText.length;
    });

    const xrefOffset = offset;
    const xref = [
      "xref",
      `0 ${this.objects.length + 1}`,
      "0000000000 65535 f ",
      ...offsets.slice(1).map((entry) => `${String(entry).padStart(10, "0")} 00000 n `),
      "trailer",
      `<< /Size ${this.objects.length + 1} /Root ${rootObjectId} 0 R >>`,
      "startxref",
      String(xrefOffset),
      "%%EOF",
      "",
    ].join("\n");

    chunks.push(xref);

    return new TextEncoder().encode(chunks.join(""));
  }
}

function writePdfDocument(pageContents: readonly string[]) {
  const writer = new PdfObjectWriter();
  const pagesObjectId = writer.reserveObject();
  const fontObjectId = writer.addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldFontObjectId = writer.addObject(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  );
  const pageObjectIds = pageContents.map((content) => {
    const streamObjectId = writer.addObject(
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    );

    return writer.addObject(
      `<< /Type /Page /Parent ${pagesObjectId} 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontObjectId} 0 R /F2 ${boldFontObjectId} 0 R >> >> /Contents ${streamObjectId} 0 R >>`,
    );
  });
  writer.setObject(
    pagesObjectId,
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`,
  );
  const catalogObjectId = writer.addObject(`<< /Type /Catalog /Pages ${pagesObjectId} 0 R >>`);

  return writer.write(catalogObjectId);
}

function topToPdfY(top: number) {
  return PDF_PAGE_HEIGHT - top;
}

function wrapText(value: string, width: number, size: number) {
  const sanitized = value.replace(/\s+/g, " ").trim();
  const maxCharacters = Math.max(12, Math.floor(width / (size * 0.52)));

  if (sanitized.length <= maxCharacters) {
    return [sanitized];
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of sanitized.split(" ")) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (candidate.length <= maxCharacters) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    if (word.length <= maxCharacters) {
      currentLine = word;
      continue;
    }

    for (let index = 0; index < word.length; index += maxCharacters) {
      lines.push(word.slice(index, index + maxCharacters));
    }

    currentLine = "";
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function estimateTextWidth(value: string, size: number) {
  return value.length * size * 0.52;
}

function formatPdfNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function pdfTextHex(value: string) {
  let hex = "FEFF";

  for (let index = 0; index < value.length; index += 1) {
    hex += value.charCodeAt(index).toString(16).padStart(4, "0").toUpperCase();
  }

  return `<${hex}>`;
}

function renderCompanyHeader(company: TemplateACompanySnapshot) {
  const logoUrl = safeUrl(company.logoUrl);
  const addressLines = cleanTextList(company.addressLines);
  const contactLines = cleanTextList([company.phone, company.email, company.website]);

  return `<div class="brand">
      ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="Logo ${escapeHtml(company.displayName)}">` : ""}
    <div>
      <h2>${escapeHtml(company.displayName)}</h2>
      ${company.legalName ? `<p class="small muted">${escapeHtml(company.legalName)}</p>` : ""}
      ${company.taxIdentifier ? `<p class="small">CUI: ${escapeHtml(company.taxIdentifier)}</p>` : ""}
      ${company.registrationNumber ? `<p class="small">Reg.: ${escapeHtml(company.registrationNumber)}</p>` : ""}
      ${addressLines.map((line) => `<p class="small">${escapeHtml(line)}</p>`).join("")}
      ${contactLines.map((line) => `<p class="small">${escapeHtml(line)}</p>`).join("")}
    </div>
  </div>`;
}

function renderCustomerBlock(customer: TemplateACustomerSnapshot) {
  const addressLines = cleanTextList(customer.addressLines);
  const contactLines = cleanTextList([customer.contactName, customer.email, customer.phone]);

  return `<div class="box">
    <h2>Client</h2>
    <p><strong>${escapeHtml(customer.displayName)}</strong></p>
    ${customer.companyName ? `<p class="small muted">${escapeHtml(customer.companyName)}</p>` : ""}
    ${customer.taxIdentifier ? `<p class="small">CUI: ${escapeHtml(customer.taxIdentifier)}</p>` : ""}
    ${contactLines.map((line) => `<p class="small">${escapeHtml(line)}</p>`).join("")}
    ${addressLines.map((line) => `<p class="small">${escapeHtml(line)}</p>`).join("")}
  </div>`;
}

function renderItemBlock(item: TemplateAItemSnapshot, index: number, fallbackCurrency: string) {
  const title = item.customerDescription || item.itemTypeLabel || `Poziția ${index + 1}`;
  const drawing = safeDrawingSvg(item.drawingSvg, title);
  const dimensions = item.widthMm && item.heightMm
    ? `${formatDimension(item.widthMm)} x ${formatDimension(item.heightMm)} mm`
    : "Nespecificat";
  const specs: Array<readonly [string, string]> = [];

  addSpec(specs, "Cantitate", String(item.quantity));
  addSpec(specs, "Dimensiuni", dimensions);
  addSpec(specs, "Suprafață", formatArea(item.surfaceAreaSquareMeters));
  addSpec(specs, "Profil", item.profileLabel);
  addSpec(specs, "Sticlă/panou", item.glassLabel);
  addSpec(specs, "Feronerie", item.hardwareLabel);

  return `<article class="item">
    <div class="item-head">
      <div>
        <p class="small muted">${escapeHtml(item.itemTypeLabel)}</p>
        <h3>${escapeHtml(title)}</h3>
      </div>
      <strong>#${escapeHtml(String(index + 1))}</strong>
    </div>
    <div class="item-layout">
      <div class="drawing">${drawing}</div>
      <div>
        <p class="small">${escapeHtml(item.customerDescription)}</p>
        <div class="specs">
          ${specs.map(([label, value]) => renderRow(label, String(value))).join("")}
        </div>
        <div class="money">
          ${renderMoneyRow("Preț unitar", item.unitPriceMinor, fallbackCurrency, item.totalsPending)}
          ${renderMoneyRow("Subtotal", item.subtotalMinor, fallbackCurrency, item.totalsPending)}
          ${renderMoneyRow("TVA", item.vatMinor, fallbackCurrency, item.totalsPending)}
          ${renderMoneyRow("Total poziție", item.totalMinor, fallbackCurrency, item.totalsPending)}
        </div>
      </div>
    </div>
  </article>`;
}

function renderTemplateBItemBlock(
  item: TemplateAItemSnapshot,
  index: number,
  fallbackCurrency: string,
) {
  const title = item.customerDescription || item.itemTypeLabel || `Poziția ${index + 1}`;
  const drawing = safeDrawingSvg(item.drawingSvg, title);
  const dimensions = item.widthMm && item.heightMm
    ? `${formatDimension(item.widthMm)} x ${formatDimension(item.heightMm)} mm`
    : "Nespecificat";
  const specs: Array<readonly [string, string]> = [];

  addSpec(specs, "Dimensiuni", dimensions);
  addSpec(specs, "Suprafață", formatArea(item.surfaceAreaSquareMeters));
  addSpec(specs, "Profil", item.profileLabel);
  addSpec(specs, "Sticlă/panou", item.glassLabel);
  addSpec(specs, "Feronerie", item.hardwareLabel);

  return `<article class="proposal-item">
    <div class="item-main">
      <div class="item-drawing">${drawing}</div>
      <div class="item-description">
        <p class="item-index">Poziția ${escapeHtml(String(index + 1))} · ${escapeHtml(item.itemTypeLabel)}</p>
        <h3>${escapeHtml(title)}</h3>
        <p class="small muted">${escapeHtml(item.customerDescription)}</p>
        <div class="specs">
          ${specs.map(([label, value]) => `<div class="spec-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
        </div>
      </div>
      <div class="item-commercial">
        ${renderTemplateBCommercialRow("UM", itemUnitLabel(item))}
        ${renderTemplateBCommercialRow("Cant.", formatQuantity(item.quantity))}
        ${renderTemplateBCommercialRow(
          "Preț unitar",
          formatMoneyOrPending(itemUnitCostMinor(item), fallbackCurrency, item.totalsPending),
        )}
      </div>
    </div>
    <div class="item-total-band">
      <span>Total poziție</span>
      <strong>${formatMoneyOrPending(item.totalMinor, fallbackCurrency, item.totalsPending)}</strong>
    </div>
  </article>`;
}

function renderTemplateBCommercialRow(label: string, value: string) {
  return `<div class="commercial-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderTerms(terms?: TemplateATermsSnapshot) {
  if (!terms) {
    return "";
  }

  const visibleTerms = [
    ["Livrare", terms.deliveryText],
    ["Avans", terms.advancePaymentText],
    ["Plată", terms.paymentTermsText],
    ["Garanție", terms.warrantyText],
    ["Valabilitate", terms.validityText],
  ].filter(([, value]) => typeof value === "string" && value.trim().length > 0);

  if (visibleTerms.length === 0) {
    return "";
  }

  return `<section class="section">
    <h2>Termeni</h2>
    <div class="terms">
      ${visibleTerms.map(([label, value]) => `<div class="box"><h3>${escapeHtml(label ?? "")}</h3><p class="small">${escapeHtml(value ?? "")}</p></div>`).join("")}
    </div>
  </section>`;
}

function addSpec(
  specs: Array<readonly [string, string]>,
  label: string,
  value: string | null | undefined,
) {
  if (value) {
    specs.push([label, value]);
  }
}

function draftRibbon(warning?: string | null) {
  return `<div class="draft-ribbon">${escapeHtml(warning ?? "Previzualizare ciornă. Blochează versiunea înainte de trimiterea către client.")}</div>`;
}

function emptyItemsBlock() {
  return `<div class="box small muted">Nu există poziții pentru client pe această versiune de ofertă.</div>`;
}

function toTemplateASnapshot(snapshot: QuotePdfOfferSnapshot): TemplateAOfferSnapshot {
  if (snapshot.templateKey === "template-a") {
    return snapshot;
  }

  return {
    ...snapshot,
    templateKey: "template-a",
  };
}

function sortTemplateItems(items: readonly TemplateAItemSnapshot[]) {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.id.localeCompare(right.id);
  });
}

function itemUnitLabel(item: TemplateAItemSnapshot) {
  const unit = item.unitLabel?.trim();

  return unit && unit.length > 0 ? unit : "buc.";
}

function itemUnitCostMinor(item: TemplateAItemSnapshot): TemplateAMoneyMinor | null {
  if (item.unitPriceMinor !== null && item.unitPriceMinor !== undefined) {
    return item.unitPriceMinor;
  }

  const quantity = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : null;

  if (!quantity) {
    return null;
  }

  if (item.subtotalMinor !== null && item.subtotalMinor !== undefined) {
    return Math.round(minorToNumber(item.subtotalMinor) / quantity);
  }

  if (item.totalMinor !== null && item.totalMinor !== undefined) {
    return Math.round(minorToNumber(item.totalMinor) / quantity);
  }

  return null;
}

function totalSurfaceAreaSquareMeters(items: readonly TemplateAItemSnapshot[]) {
  let total = 0;
  let hasArea = false;

  for (const item of items) {
    if (
      item.surfaceAreaSquareMeters !== null &&
      item.surfaceAreaSquareMeters !== undefined &&
      Number.isFinite(item.surfaceAreaSquareMeters)
    ) {
      total += item.surfaceAreaSquareMeters;
      hasArea = true;
    }
  }

  return hasArea ? Math.round(total * 100) / 100 : null;
}

function formatAreaSummary(value: number | null) {
  return value === null ? "Nespecificat" : `${value.toFixed(2)} mp`;
}

function formatQuantity(value: number) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function renderRow(label: string, value: string) {
  return `<div class="row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderMoneyRow(
  label: string,
  value: TemplateAMoneyMinor | null | undefined,
  currency: string,
  pending?: boolean,
) {
  const displayValue = pending ? "În așteptare" : value === null || value === undefined ? "În așteptare" : formatMoney(value, currency);

  return `<div class="row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(displayValue)}</strong></div>`;
}

function safeDrawingSvg(value: string | null | undefined, label: string) {
  const trimmed = value?.trim();

  if (!trimmed || !isAllowedInlineSvg(trimmed)) {
    return drawingPlaceholderSvg(label);
  }

  return trimmed;
}

function isAllowedInlineSvg(value: string) {
  const svgOpenCount = value.match(/<svg[\s>]/gi)?.length ?? 0;

  return (
    svgOpenCount === 1 &&
    /^<svg[\s>]/i.test(value) &&
    /<\/svg>$/i.test(value) &&
    !/<script[\s>]/i.test(value) &&
    !/\son[a-z]+\s*=/i.test(value) &&
    !/javascript:/i.test(value) &&
    !/<foreignObject[\s>]/i.test(value) &&
    !/<iframe[\s>]/i.test(value) &&
    !/<object[\s>]/i.test(value) &&
    !/<embed[\s>]/i.test(value) &&
    !/<link[\s>]/i.test(value) &&
    !/<style[\s>]/i.test(value) &&
    !/<meta[\s>]/i.test(value) &&
    !/<base[\s>]/i.test(value) &&
    !/<a[\s>]/i.test(value)
  );
}

function drawingPlaceholderSvg(label: string) {
  const safeLabel = escapeHtml(label || "Poziție ofertă");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="190" viewBox="0 0 260 190" role="img" aria-label="${safeLabel}">
    <title>${safeLabel}</title>
    <rect x="0" y="0" width="260" height="190" rx="8" fill="#f8fafc"/>
    <rect x="38" y="44" width="184" height="86" rx="6" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2" stroke-dasharray="8 6"/>
    <text x="130" y="154" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#0f172a">Schemă indisponibilă</text>
  </svg>`;
}

function formatMoney(value: TemplateAMoneyMinor, currency: string) {
  const minor = minorToNumber(value);
  const sign = minor < 0 ? "-" : "";
  const absolute = Math.abs(Math.round(minor));
  const whole = Math.floor(absolute / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimals = String(absolute % 100).padStart(2, "0");

  return `${sign}${whole},${decimals} ${safeCurrency(currency)}`;
}

function formatMoneyOrPending(
  value: TemplateAMoneyMinor | null | undefined,
  currency: string,
  pending?: boolean,
) {
  return pending || value === null || value === undefined ? "În așteptare" : formatMoney(value, currency);
}

function minorToNumber(value: TemplateAMoneyMinor) {
  return typeof value === "bigint" ? Number(value) : Math.round(value);
}

function formatDimension(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatArea(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return `${value.toFixed(2)} mp`;
}

function formatVersionStatus(value: string) {
  const statuses: Record<string, string> = {
    DRAFT: "Ciornă",
    LOCKED: "Blocată",
    SENT: "Trimisă",
    SUPERSEDED: "Înlocuită",
  };

  return statuses[value] ?? value;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ro-RO", { timeZone: "UTC" }).format(date);
}

function safeCurrency(value: string) {
  return /^[A-Z]{3}$/.test(value) ? value : "RON";
}

function safeUrl(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return /^https?:\/\//i.test(trimmed) || trimmed.startsWith("/") ? trimmed : null;
}

function cleanTextList(values: readonly (string | null | undefined)[] | undefined) {
  return (values ?? []).flatMap((value) => {
    const trimmed = value?.trim();

    return trimmed ? [trimmed] : [];
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
