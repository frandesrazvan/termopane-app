export type DrawingPackageInfo = Readonly<{
  packageName: "@termopane/drawing";
  status: "mvp";
  supportedOutputs: readonly ["svg"];
  supportedItems: readonly ["fixed-window", "custom-placeholder"];
}>;

export type FixedWindowDrawingJson = Readonly<{
  type: "fixed-window";
  widthMm: number;
  heightMm: number;
  label?: string;
  marker?: "fixed" | "none";
}>;

export type CustomPlaceholderDrawingJson = Readonly<{
  type: "custom-placeholder";
  label?: string;
  note?: string;
}>;

export type QuoteItemDrawingJson =
  | FixedWindowDrawingJson
  | CustomPlaceholderDrawingJson;

export type QuoteItemDrawingSnapshot = Readonly<{
  packageName: "@termopane/drawing";
  rendererVersion: "mvp-1";
  input: QuoteItemDrawingJson;
  svg: string;
  schematic: true;
}>;

const RENDERER_VERSION = "mvp-1";
const SVG_WIDTH = 260;
const SVG_HEIGHT = 190;
const DRAWING_LEFT = 44;
const DRAWING_TOP = 22;
const DRAWING_WIDTH = 154;
const DRAWING_HEIGHT = 116;
const FRAME_STROKE = 8;

export function getDrawingPackageInfo(): DrawingPackageInfo {
  return Object.freeze({
    packageName: "@termopane/drawing",
    status: "mvp",
    supportedOutputs: ["svg"] as const,
    supportedItems: ["fixed-window", "custom-placeholder"] as const,
  });
}

export function getDrawingPlaceholder(): DrawingPackageInfo {
  return getDrawingPackageInfo();
}

export function createQuoteItemDrawingSnapshot(
  input: QuoteItemDrawingJson,
): QuoteItemDrawingSnapshot {
  return Object.freeze({
    packageName: "@termopane/drawing",
    rendererVersion: RENDERER_VERSION,
    input: Object.freeze({ ...input }),
    svg: renderQuoteItemSvg(input),
    schematic: true,
  });
}

export function renderQuoteItemSvg(input: QuoteItemDrawingJson): string {
  if (input.type === "fixed-window") {
    return renderFixedWindowSvg(input);
  }

  return renderCustomPlaceholderSvg(input);
}

export function renderFixedWindowSvg(input: FixedWindowDrawingJson): string {
  const widthMm = safePositiveNumber(input.widthMm);
  const heightMm = safePositiveNumber(input.heightMm);
  const widthLabel = `${formatDimension(widthMm)} mm`;
  const heightLabel = `${formatDimension(heightMm)} mm`;
  const title = input.label?.trim() || `Fereastră fixă ${widthLabel} x ${heightLabel}`;
  const marker = input.marker ?? "fixed";
  const paneInset = FRAME_STROKE;
  const paneX = DRAWING_LEFT + paneInset;
  const paneY = DRAWING_TOP + paneInset;
  const paneWidth = DRAWING_WIDTH - paneInset * 2;
  const paneHeight = DRAWING_HEIGHT - paneInset * 2;

  return compactSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="${escapeXml(title)}">
      <title>${escapeXml(title)}</title>
      <rect x="0" y="0" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" rx="8" fill="#f8fafc"/>
      <rect x="${DRAWING_LEFT}" y="${DRAWING_TOP}" width="${DRAWING_WIDTH}" height="${DRAWING_HEIGHT}" fill="#e0f2fe" stroke="#1f2937" stroke-width="${FRAME_STROKE}"/>
      <rect x="${paneX}" y="${paneY}" width="${paneWidth}" height="${paneHeight}" fill="#f0f9ff" stroke="#64748b" stroke-width="1"/>
      ${marker === "fixed" ? fixedMarker() : ""}
      <line x1="${DRAWING_LEFT}" y1="158" x2="${DRAWING_LEFT + DRAWING_WIDTH}" y2="158" stroke="#475569" stroke-width="1.5"/>
      <line x1="${DRAWING_LEFT}" y1="153" x2="${DRAWING_LEFT}" y2="163" stroke="#475569" stroke-width="1.5"/>
      <line x1="${DRAWING_LEFT + DRAWING_WIDTH}" y1="153" x2="${DRAWING_LEFT + DRAWING_WIDTH}" y2="163" stroke="#475569" stroke-width="1.5"/>
      <text x="${DRAWING_LEFT + DRAWING_WIDTH / 2}" y="178" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#0f172a">${escapeXml(widthLabel)}</text>
      <line x1="222" y1="${DRAWING_TOP}" x2="222" y2="${DRAWING_TOP + DRAWING_HEIGHT}" stroke="#475569" stroke-width="1.5"/>
      <line x1="217" y1="${DRAWING_TOP}" x2="227" y2="${DRAWING_TOP}" stroke="#475569" stroke-width="1.5"/>
      <line x1="217" y1="${DRAWING_TOP + DRAWING_HEIGHT}" x2="227" y2="${DRAWING_TOP + DRAWING_HEIGHT}" stroke="#475569" stroke-width="1.5"/>
      <text x="245" y="${DRAWING_TOP + DRAWING_HEIGHT / 2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#0f172a" transform="rotate(90 245 ${DRAWING_TOP + DRAWING_HEIGHT / 2})">${escapeXml(heightLabel)}</text>
      <text x="${DRAWING_LEFT + DRAWING_WIDTH / 2}" y="18" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#334155">Schemă orientativă</text>
    </svg>
  `);
}

export function renderCustomPlaceholderSvg(input: CustomPlaceholderDrawingJson): string {
  const label = input.label?.trim() || "Poziție personalizată";
  const note = input.note?.trim() || "Fără geometrie";

  return compactSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="${escapeXml(label)}">
      <title>${escapeXml(label)}</title>
      <rect x="0" y="0" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" rx="8" fill="#f8fafc"/>
      <rect x="42" y="36" width="176" height="92" rx="6" fill="#f1f5f9" stroke="#64748b" stroke-width="2" stroke-dasharray="8 6"/>
      <line x1="68" y1="72" x2="192" y2="72" stroke="#94a3b8" stroke-width="2"/>
      <line x1="68" y1="92" x2="166" y2="92" stroke="#94a3b8" stroke-width="2"/>
      <text x="130" y="154" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#0f172a">${escapeXml(label)}</text>
      <text x="130" y="172" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#475569">${escapeXml(note)}</text>
    </svg>
  `);
}

function fixedMarker() {
  return `
    <line x1="${DRAWING_LEFT + 24}" y1="${DRAWING_TOP + 24}" x2="${DRAWING_LEFT + DRAWING_WIDTH - 24}" y2="${DRAWING_TOP + DRAWING_HEIGHT - 24}" stroke="#0f766e" stroke-width="2"/>
    <line x1="${DRAWING_LEFT + DRAWING_WIDTH - 24}" y1="${DRAWING_TOP + 24}" x2="${DRAWING_LEFT + 24}" y2="${DRAWING_TOP + DRAWING_HEIGHT - 24}" stroke="#0f766e" stroke-width="2"/>
    <text x="${DRAWING_LEFT + DRAWING_WIDTH / 2}" y="${DRAWING_TOP + DRAWING_HEIGHT / 2 + 5}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#0f766e">FIXĂ</text>
  `;
}

function safePositiveNumber(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function formatDimension(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function compactSvg(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("");
}
