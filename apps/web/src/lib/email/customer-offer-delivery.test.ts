import { QuoteVersionStatus, type QuoteVersion } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { customerOfferEmailInput } from "./customer-offer-delivery";

describe("customer offer delivery", () => {
  it("builds a Romanian customer-safe email from the quote company snapshot", () => {
    const input = customerOfferEmailInput(
      { tenantId: "tenant-a" },
      {
        bytes: new TextEncoder().encode("synthetic pdf"),
        documentId: "document-a",
        fileName: "OF-001-v1.pdf",
        mimeType: "application/pdf",
        quoteId: "quote-a",
        quoteNumber: "OF-001",
        quoteVersion: {
          id: "version-a",
          tenantId: "tenant-a",
          quoteId: "quote-a",
          versionNumber: 1,
          status: QuoteVersionStatus.LOCKED,
          isLocked: true,
          companySettingsSnapshot: {
            displayName: "Firma Sintetica",
            email: "office@example.test",
          },
          traceSummary: {
            supplierCostMinor: 12_345,
            internalTrace: "DO_NOT_EMAIL_TRACE",
          },
        } as unknown as QuoteVersion,
        recipientEmail: "client@example.test",
        recipientName: "Client Sintetic",
      },
    );

    expect(input).toMatchObject({
      replyToEmail: "office@example.test",
      senderEmail: "office@example.test",
      senderName: "Firma Sintetica",
      subject: "Oferta OF-001 - versiunea 1",
    });
    expect(input.bodyText).toContain("Va transmitem atasat oferta OF-001");
    expect(input.bodyText).not.toContain("DO_NOT_EMAIL_TRACE");
    expect(input.bodyText).not.toContain("supplierCostMinor");
  });
});
