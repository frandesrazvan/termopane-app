import { DocumentType, QuoteStatus, QuoteVersionStatus } from "@prisma/client";
import type { Document, Quote, QuoteVersion } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuoteSendConfirmationView } from "./send-confirmation-view";

describe("QuoteSendConfirmationView", () => {
  it("renders a Romanian customer-safe confirmation without internal cost fields", () => {
    const markup = renderToStaticMarkup(
      <QuoteSendConfirmationView
        quote={
          {
            id: "quote-safe",
            quoteNumber: "OF-SAFE-001",
            status: QuoteStatus.SENT,
          } as unknown as Quote
        }
        quoteVersion={
          {
            id: "version-safe",
            tenantId: "tenant-a",
            quoteId: "quote-safe",
            versionNumber: 2,
            status: QuoteVersionStatus.SENT,
            isLocked: true,
            currency: "RON",
            subtotalMinor: 100_000,
            vatMinor: 19_000,
            totalMinor: 119_000,
            lockedAt: new Date("2026-06-26T08:00:00.000Z"),
            sentAt: new Date("2026-06-26T09:00:00.000Z"),
            updatedAt: new Date("2026-06-26T09:00:00.000Z"),
          } as unknown as QuoteVersion
        }
        document={
          {
            id: "document-safe",
            tenantId: "tenant-a",
            quoteVersionId: "version-safe",
            type: DocumentType.QUOTE_PDF,
            fileName: "OF-SAFE-001-v2.pdf",
            templateKey: "template-a",
            createdAt: new Date("2026-06-26T08:30:00.000Z"),
            visibleTotalsSnapshot: {
              subtotalMinor: 100_000,
              vatMinor: 19_000,
              totalMinor: 119_000,
              currency: "RON",
              internalCostMinor: 66_666,
              supplierMargin: "DO_NOT_SHOW_MARGIN",
              traceSummary: "DO_NOT_SHOW_TRACE",
            },
          } as unknown as Document
        }
      />,
    );

    expect(markup).toContain("Ofertă trimisă");
    expect(markup).toContain("Descarcă PDF");
    expect(markup).toContain("OF-SAFE-001-v2.pdf");
    expect(markup).not.toContain("internalCostMinor");
    expect(markup).not.toContain("DO_NOT_SHOW_MARGIN");
    expect(markup).not.toContain("DO_NOT_SHOW_TRACE");
    expect(markup).not.toContain("66.666");
  });
});
