import { QuoteItemType, type QuoteItem } from "@prisma/client";
import {
  createQuoteItemDrawingSnapshot,
  type CustomPlaceholderDrawingJson,
  type FixedWindowDrawingJson,
  type QuoteItemDrawingJson,
  type QuoteItemDrawingSnapshot,
} from "@termopane/drawing";

type JsonRecord = Record<string, unknown>;

export function fixedWindowDrawingSnapshot(input: {
  heightMm: number;
  label?: string | null;
  widthMm: number;
}): QuoteItemDrawingSnapshot {
  return createQuoteItemDrawingSnapshot({
    type: "fixed-window",
    widthMm: input.widthMm,
    heightMm: input.heightMm,
    label: input.label ?? undefined,
  });
}

export function customLineDrawingSnapshot(input: {
  label?: string | null;
}): QuoteItemDrawingSnapshot {
  return createQuoteItemDrawingSnapshot({
    type: "custom-placeholder",
    label: input.label ?? "Custom line",
    note: "Custom manual line",
  });
}

export function quoteItemDrawingSnapshot(item: QuoteItem): QuoteItemDrawingSnapshot {
  const storedInput = drawingInputFromConfiguration(item.configurationSnapshot);

  if (storedInput) {
    return createQuoteItemDrawingSnapshot(storedInput);
  }

  if (item.type === QuoteItemType.WINDOW) {
    return fixedWindowDrawingSnapshot({
      widthMm: item.widthMm ?? numberFromConfiguration(item.configurationSnapshot, "widthMm") ?? 0,
      heightMm: item.heightMm ?? numberFromConfiguration(item.configurationSnapshot, "heightMm") ?? 0,
      label: item.customerDescription,
    });
  }

  return customLineDrawingSnapshot({
    label: item.customerDescription,
  });
}

function drawingInputFromConfiguration(value: unknown): QuoteItemDrawingJson | null {
  const configuration = asRecord(value);
  const drawing = asRecord(configuration?.drawing);
  const input = asRecord(drawing?.input);

  if (!input) {
    return null;
  }

  if (input.type === "fixed-window") {
    return fixedWindowDrawingInput(input);
  }

  if (input.type === "custom-placeholder") {
    return customPlaceholderDrawingInput(input);
  }

  return null;
}

function fixedWindowDrawingInput(input: JsonRecord): FixedWindowDrawingJson | null {
  const widthMm = numberFrom(input.widthMm);
  const heightMm = numberFrom(input.heightMm);

  if (widthMm === undefined || heightMm === undefined) {
    return null;
  }

  return {
    type: "fixed-window",
    widthMm,
    heightMm,
    label: stringFrom(input.label),
    marker: input.marker === "none" ? "none" : "fixed",
  };
}

function customPlaceholderDrawingInput(input: JsonRecord): CustomPlaceholderDrawingJson {
  return {
    type: "custom-placeholder",
    label: stringFrom(input.label) ?? "Custom line",
    note: stringFrom(input.note) ?? "Custom manual line",
  };
}

function numberFromConfiguration(value: unknown, key: string) {
  return numberFrom(asRecord(value)?.[key]);
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function numberFrom(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringFrom(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}
