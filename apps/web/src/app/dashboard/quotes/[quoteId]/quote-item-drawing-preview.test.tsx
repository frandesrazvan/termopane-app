import { QuoteItemType, type QuoteItem } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuoteItemDrawingPreview } from "./quote-item-drawing-preview";

describe("QuoteItemDrawingPreview", () => {
  it("renders a fixed-window item preview with dimensions", () => {
    const markup = renderToStaticMarkup(
      <QuoteItemDrawingPreview item={quoteItem()} />,
    );

    expect(markup).toContain("<svg");
    expect(markup).toContain("1200 mm");
    expect(markup).toContain("1400 mm");
    expect(markup).toContain("FIXED");
  });

  it("uses a safe placeholder for custom-line items", () => {
    const markup = renderToStaticMarkup(
      <QuoteItemDrawingPreview
        item={quoteItem({
          id: "item-custom",
          type: QuoteItemType.CUSTOM,
          widthMm: null,
          heightMm: null,
          customerDescription: "Manual <script>alert(1)</script>",
          configurationSnapshot: {
            kind: "custom-line",
            drawing: {
              input: {
                type: "custom-placeholder",
                label: "Manual <script>alert(1)</script>",
                note: "Custom manual line",
              },
            },
          },
        })}
      />,
    );

    expect(markup).toContain("Custom manual line");
    expect(markup).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(markup).not.toContain("<script>");
  });
});

function quoteItem(overrides: Partial<QuoteItem> = {}) {
  return {
    id: "item-fixed",
    tenantId: "tenant-a",
    quoteVersionId: "version-a",
    type: QuoteItemType.WINDOW,
    sortOrder: 0,
    quantity: 1,
    widthMm: 1_200,
    heightMm: 1_400,
    customerDescription: "Kitchen fixed window",
    internalNotes: null,
    configurationSnapshot: {
      kind: "fixed-window",
      drawing: {
        input: {
          type: "fixed-window",
          widthMm: 1_200,
          heightMm: 1_400,
          label: "Kitchen fixed window",
        },
      },
    },
    catalogSnapshot: null,
    calculationSnapshot: null,
    totalsSnapshot: null,
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
    ...overrides,
  } as unknown as QuoteItem;
}
