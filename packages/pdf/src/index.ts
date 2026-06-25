export type PdfPackageInfo = Readonly<{
  packageName: "@termopane/pdf";
  status: "template-a-html-preview";
  bindsToQuoteVersion: true;
  supportedTemplates: readonly ["template-a"];
}>;

export type PdfPlaceholder = PdfPackageInfo;

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

export function getPdfPackageInfo(): PdfPackageInfo {
  return Object.freeze({
    packageName: "@termopane/pdf",
    status: "template-a-html-preview",
    bindsToQuoteVersion: true,
    supportedTemplates: ["template-a"] as const,
  });
}

export function getPdfPlaceholder(): PdfPackageInfo {
  return getPdfPackageInfo();
}

export function buildTemplateAHtml(snapshot: TemplateAOfferSnapshot): string {
  const currency = safeCurrency(snapshot.totals.currency || snapshot.quote.currency);
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
    <title>${escapeHtml(snapshot.quote.quoteNumber)} Template A preview</title>
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
          <p class="small muted">Template A offer</p>
          <h1>${escapeHtml(snapshot.quote.quoteNumber)}</h1>
          <p class="small">Version ${escapeHtml(String(snapshot.quote.versionNumber))} - ${escapeHtml(snapshot.quote.versionStatus)}</p>
          <p class="small">Date ${escapeHtml(formatDate(snapshot.quote.issueDateIso))}</p>
        </div>
      </header>

      <section class="section summary-grid">
        ${renderCustomerBlock(snapshot.customer)}
        <div class="box">
          <h2>Offer summary</h2>
          <p class="small muted">${escapeHtml(snapshot.quote.quoteTitle ?? "Customer offer")}</p>
          <p class="small">Currency: ${escapeHtml(currency)}</p>
          <p class="small">Items: ${escapeHtml(String(sortedItems.length))}</p>
          <p class="small total-value">${formatMoney(snapshot.totals.totalMinor, currency)}</p>
        </div>
      </section>

      <section class="section">
        <h2>Items</h2>
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
          <span>VAT</span>
          <strong>${formatMoney(snapshot.totals.vatMinor, currency)}</strong>
        </div>
        <div class="total-row final">
          <span>Final total</span>
          <strong>${formatMoney(snapshot.totals.totalMinor, currency)}</strong>
        </div>
      </section>

      ${renderTerms(snapshot.terms)}
      ${snapshot.terms?.footerText ? `<footer class="footer small">${escapeHtml(snapshot.terms.footerText)}</footer>` : ""}
    </main>
  </body>
</html>`;
}

function renderCompanyHeader(company: TemplateACompanySnapshot) {
  const logoUrl = safeUrl(company.logoUrl);
  const addressLines = cleanTextList(company.addressLines);
  const contactLines = cleanTextList([company.phone, company.email, company.website]);

  return `<div class="brand">
    ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(company.displayName)} logo">` : ""}
    <div>
      <h2>${escapeHtml(company.displayName)}</h2>
      ${company.legalName ? `<p class="small muted">${escapeHtml(company.legalName)}</p>` : ""}
      ${company.taxIdentifier ? `<p class="small">Tax ID: ${escapeHtml(company.taxIdentifier)}</p>` : ""}
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
    <h2>Customer</h2>
    <p><strong>${escapeHtml(customer.displayName)}</strong></p>
    ${customer.companyName ? `<p class="small muted">${escapeHtml(customer.companyName)}</p>` : ""}
    ${customer.taxIdentifier ? `<p class="small">Tax ID: ${escapeHtml(customer.taxIdentifier)}</p>` : ""}
    ${contactLines.map((line) => `<p class="small">${escapeHtml(line)}</p>`).join("")}
    ${addressLines.map((line) => `<p class="small">${escapeHtml(line)}</p>`).join("")}
  </div>`;
}

function renderItemBlock(item: TemplateAItemSnapshot, index: number, fallbackCurrency: string) {
  const title = item.customerDescription || item.itemTypeLabel || `Item ${index + 1}`;
  const drawing = safeDrawingSvg(item.drawingSvg, title);
  const dimensions = item.widthMm && item.heightMm
    ? `${formatDimension(item.widthMm)} x ${formatDimension(item.heightMm)} mm`
    : "Not specified";
  const specs: Array<readonly [string, string]> = [];

  addSpec(specs, "Quantity", String(item.quantity));
  addSpec(specs, "Dimensions", dimensions);
  addSpec(specs, "Surface", formatArea(item.surfaceAreaSquareMeters));
  addSpec(specs, "Profile", item.profileLabel);
  addSpec(specs, "Glass or panel", item.glassLabel);
  addSpec(specs, "Hardware", item.hardwareLabel);

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
          ${renderMoneyRow("Unit price", item.unitPriceMinor, fallbackCurrency, item.totalsPending)}
          ${renderMoneyRow("Subtotal", item.subtotalMinor, fallbackCurrency, item.totalsPending)}
          ${renderMoneyRow("VAT", item.vatMinor, fallbackCurrency, item.totalsPending)}
          ${renderMoneyRow("Item total", item.totalMinor, fallbackCurrency, item.totalsPending)}
        </div>
      </div>
    </div>
  </article>`;
}

function renderTerms(terms?: TemplateATermsSnapshot) {
  if (!terms) {
    return "";
  }

  const visibleTerms = [
    ["Delivery", terms.deliveryText],
    ["Advance payment", terms.advancePaymentText],
    ["Payment", terms.paymentTermsText],
    ["Warranty", terms.warrantyText],
    ["Validity", terms.validityText],
  ].filter(([, value]) => typeof value === "string" && value.trim().length > 0);

  if (visibleTerms.length === 0) {
    return "";
  }

  return `<section class="section">
    <h2>Terms</h2>
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
  return `<div class="draft-ribbon">${escapeHtml(warning ?? "Draft preview. Lock this quote version before sending it to a customer.")}</div>`;
}

function emptyItemsBlock() {
  return `<div class="box small muted">No customer-facing items are stored on this quote version.</div>`;
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
  const displayValue = pending ? "Pending" : value === null || value === undefined ? "Pending" : formatMoney(value, currency);

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
  const safeLabel = escapeHtml(label || "Quote item");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="190" viewBox="0 0 260 190" role="img" aria-label="${safeLabel}">
    <title>${safeLabel}</title>
    <rect x="0" y="0" width="260" height="190" rx="8" fill="#f8fafc"/>
    <rect x="38" y="44" width="184" height="86" rx="6" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2" stroke-dasharray="8 6"/>
    <text x="130" y="154" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#0f172a">No schematic available</text>
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

  return `${value.toFixed(2)} sqm`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
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
