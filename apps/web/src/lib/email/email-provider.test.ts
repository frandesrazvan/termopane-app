import { describe, expect, it } from "vitest";
import { createSafeLogger, type LogLevel } from "../logging/safe-logger";
import {
  createConfiguredEmailProvider,
  createLocalEmailProvider,
  EmailDeliveryProviderError,
  type CustomerOfferEmailInput,
} from "./email-provider";

describe("email provider", () => {
  it("local provider logs only a synthetic redacted delivery event", async () => {
    const entries: Array<{
      event: string;
      level: LogLevel;
      metadata?: Record<string, unknown>;
    }> = [];
    const provider = createLocalEmailProvider({
      logger: createSafeLogger((level, entry) => {
        entries.push({ event: entry.event, level, metadata: entry.metadata });
      }),
    });

    const result = await provider.sendCustomerOffer(
      customerOfferEmailInput({
        recipientEmail: "client.secret@example.test",
      }),
    );
    const serialized = JSON.stringify(entries);

    expect(result).toMatchObject({
      provider: "local",
      status: "logged",
    });
    expect(serialized).not.toContain("client.secret@example.test");
    expect(serialized).toContain("c***@e***.test");
    expect(entries).toMatchObject([
      {
        event: "email.customer_offer.local_delivery",
        level: "info",
        metadata: {
          maskedTo: "c***@e***.test",
          provider: "local",
          synthetic: true,
        },
      },
    ]);
  });

  it("configures Resend delivery with Romanian offer text and PDF attachment", async () => {
    const requests: Array<{
      body: Record<string, unknown>;
      headers: Record<string, string>;
      url: string;
    }> = [];
    const provider = createConfiguredEmailProvider({
      env: env({
        EMAIL_PROVIDER: "resend",
        EMAIL_FROM: "fallback@example.test",
        RESEND_API_KEY: "resend-test-key",
      }),
      fetchImpl: async (url, init) => {
        requests.push({
          body: JSON.parse(init.body) as Record<string, unknown>,
          headers: init.headers,
          url,
        });

        return {
          ok: true,
          status: 200,
          async json() {
            return { id: "email_123" };
          },
        };
      },
    });

    const result = await provider.sendCustomerOffer(
      customerOfferEmailInput({
        senderEmail: "tenant@example.test",
      }),
    );

    expect(result).toMatchObject({
      provider: "resend",
      providerMessageId: "email_123",
      status: "sent",
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.headers.Authorization).toBe(
      "Bearer resend-test-key",
    );
    expect(requests[0]?.body).toMatchObject({
      attachments: [
        {
          content: Buffer.from("synthetic pdf").toString("base64"),
          content_type: "application/pdf",
          filename: "OF-001-v1.pdf",
        },
      ],
      from: "Tenant Sintetic <tenant@example.test>",
      reply_to: ["tenant@example.test"],
      subject: "Oferta OF-001 - versiunea 1",
      text: expect.stringContaining("Va transmitem atasat oferta OF-001"),
      to: ["Client Sintetic <client@example.test>"],
    });
  });

  it("rejects incomplete Resend configuration", () => {
    expect(() =>
      createConfiguredEmailProvider({
        env: env({
          EMAIL_PROVIDER: "resend",
          EMAIL_FROM: "",
          RESEND_API_KEY: "",
        }),
      }),
    ).toThrow(EmailDeliveryProviderError);
  });
});

function customerOfferEmailInput(
  overrides: Partial<CustomerOfferEmailInput> = {},
): CustomerOfferEmailInput {
  return {
    attachments: [
      {
        bytes: new TextEncoder().encode("synthetic pdf"),
        contentType: "application/pdf",
        fileName: "OF-001-v1.pdf",
      },
    ],
    bodyText: "Buna ziua,\nVa transmitem atasat oferta OF-001.",
    documentId: "document-a",
    quoteId: "quote-a",
    quoteNumber: "OF-001",
    quoteVersionId: "version-a",
    recipientEmail: "client@example.test",
    recipientName: "Client Sintetic",
    replyToEmail: "tenant@example.test",
    senderEmail: "tenant@example.test",
    senderName: "Tenant Sintetic",
    subject: "Oferta OF-001 - versiunea 1",
    tenantId: "tenant-a",
    ...overrides,
  };
}

function env(values: Partial<NodeJS.ProcessEnv>): NodeJS.ProcessEnv {
  return values as NodeJS.ProcessEnv;
}
