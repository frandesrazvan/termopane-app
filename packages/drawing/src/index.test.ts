import { describe, expect, it } from "vitest";
import {
  createQuoteItemDrawingSnapshot,
  getDrawingPackageInfo,
  renderDoorSvg,
  renderFixedWindowSvg,
  renderQuoteItemSvg,
} from "./index.js";

describe("drawing package MVP renderer", () => {
  it("renders a fixed-window SVG with width and height labels", () => {
    const svg = renderFixedWindowSvg({
      type: "fixed-window",
      widthMm: 1_200,
      heightMm: 1_400,
    });

    expect(svg).toContain("<svg");
    expect(svg).toContain("1200 mm");
    expect(svg).toContain("1400 mm");
    expect(svg).toContain("FIXĂ");
    expect(svg).toContain("Schemă orientativă");
  });

  it("escapes SVG text safely", () => {
    const svg = renderFixedWindowSvg({
      type: "fixed-window",
      widthMm: 900,
      heightMm: 700,
      label: '"><script>alert(1)</script>',
    });

    expect(svg).not.toContain("<script>");
    expect(svg).not.toContain('aria-label=""><');
    expect(svg).toContain("&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("renders deterministic output for PDF reuse", () => {
    const input = {
      type: "fixed-window" as const,
      widthMm: 1_000,
      heightMm: 1_000,
      label: "Kitchen fixed window",
    };

    expect(renderQuoteItemSvg(input)).toBe(renderQuoteItemSvg(input));
  });

  it("renders a safe custom-line placeholder", () => {
    const svg = renderQuoteItemSvg({
      type: "custom-placeholder",
      label: "Manual service <unsafe>",
      note: "No CAD",
    });

    expect(svg).toContain("Manual service &lt;unsafe&gt;");
    expect(svg).toContain("No CAD");
    expect(svg).not.toContain("<unsafe>");
  });

  it("renders a Romanian-safe door schematic with panel and glass split", () => {
    const svg = renderDoorSvg({
      type: "door",
      widthMm: 900,
      heightMm: 2_100,
      label: 'Ușă <intrare>',
      split: "glass-panel",
      glassLabel: "Sticlă mată",
      panelLabel: "Panou plin",
    });

    expect(svg).toContain("<svg");
    expect(svg).toContain("900 mm");
    expect(svg).toContain("2100 mm");
    expect(svg).toContain("Sticlă mată");
    expect(svg).toContain("Panou plin");
    expect(svg).toContain("Schemă orientativă ușă");
    expect(svg).toContain("Ușă &lt;intrare&gt;");
    expect(svg).not.toContain("<intrare>");
  });

  it("creates a reusable drawing snapshot", () => {
    const snapshot = createQuoteItemDrawingSnapshot({
      type: "fixed-window",
      widthMm: 1_200,
      heightMm: 1_400,
    });

    expect(snapshot).toMatchObject({
      packageName: "@termopane/drawing",
      rendererVersion: "mvp-1",
      schematic: true,
      input: {
        type: "fixed-window",
        widthMm: 1_200,
        heightMm: 1_400,
      },
    });
    expect(snapshot.svg).toContain("1200 mm");
  });

  it("reports MVP package capabilities", () => {
    expect(getDrawingPackageInfo()).toMatchObject({
      status: "mvp",
      supportedOutputs: ["svg"],
      supportedItems: ["fixed-window", "door", "custom-placeholder"],
    });
  });
});
