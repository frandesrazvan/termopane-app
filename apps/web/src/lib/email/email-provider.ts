import {
  createSafeLogger,
  logger as defaultLogger,
  type SafeLogMetadata,
} from "../logging/safe-logger";
import { optionalEnvValue } from "../pdf/document-storage";
import { looksLikeEmailAddress, redactEmailAddress } from "../privacy/redaction";

export type EmailProviderKind = "local" | "resend";

export type EmailAttachment = Readonly<{
  bytes: Uint8Array;
  contentType: string;
  fileName: string;
}>;

export type CustomerOfferEmailInput = Readonly<{
  attachments: readonly EmailAttachment[];
  bodyText: string;
  documentId: string;
  quoteId: string;
  quoteNumber: string;
  quoteVersionId: string;
  recipientEmail: string;
  recipientName?: string | null;
  replyToEmail?: string | null;
  senderEmail?: string | null;
  senderName: string;
  subject: string;
  tenantId: string;
}>;

export type EmailDeliveryProviderResult = Readonly<{
  completedAt: Date;
  provider: EmailProviderKind;
  providerMessageId?: string | null;
  status: "logged" | "sent";
}>;

export type EmailProvider = Readonly<{
  kind: EmailProviderKind;
  sendCustomerOffer(
    input: CustomerOfferEmailInput,
  ): Promise<EmailDeliveryProviderResult>;
}>;

export type ResendEmailProviderConfig = Readonly<{
  apiKey: string;
  apiUrl?: string;
  defaultFromEmail: string;
  defaultReplyToEmail?: string | null;
}>;

export type CreateConfiguredEmailProviderOptions = Readonly<{
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
  logger?: ReturnType<typeof createSafeLogger>;
  provider?: string;
  resendConfig?: ResendEmailProviderConfig;
}>;

type FetchLike = (
  input: string,
  init: {
    body: string;
    headers: Record<string, string>;
    method: "POST";
  },
) => Promise<{
  json(): Promise<unknown>;
  ok: boolean;
  status: number;
}>;

export type EmailDeliveryProviderErrorCode =
  | "configuration"
  | "send_failed";

export class EmailDeliveryProviderError extends Error {
  readonly code: EmailDeliveryProviderErrorCode;
  readonly cause?: unknown;

  constructor(
    code: EmailDeliveryProviderErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = "EmailDeliveryProviderError";
    this.code = code;
    this.cause = cause;
    Object.setPrototypeOf(this, EmailDeliveryProviderError.prototype);
  }
}

export function createConfiguredEmailProvider(
  options: CreateConfiguredEmailProviderOptions = {},
): EmailProvider {
  const env = options.env ?? process.env;
  const provider = normalizeEmailProvider(
    options.provider ?? optionalEnvValue(env, "EMAIL_PROVIDER") ?? "local",
  );

  if (provider === "local") {
    return createLocalEmailProvider({
      logger: options.logger,
    });
  }

  return createResendEmailProvider(
    options.resendConfig ?? resendEmailProviderConfigFromEnv(env),
    {
      fetchImpl: options.fetchImpl,
    },
  );
}

export function createLocalEmailProvider(
  options: { logger?: ReturnType<typeof createSafeLogger> } = {},
): EmailProvider {
  const safeLogger = options.logger ?? defaultLogger;

  return {
    kind: "local",
    async sendCustomerOffer(input) {
      const attachmentBytes = input.attachments.reduce(
        (total, attachment) => total + attachment.bytes.byteLength,
        0,
      );

      safeLogger.info("email.customer_offer.local_delivery", {
        attachmentBytes,
        attachmentCount: input.attachments.length,
        documentId: input.documentId,
        maskedTo: redactEmailAddress(input.recipientEmail),
        provider: "local",
        quoteId: input.quoteId,
        quoteVersionId: input.quoteVersionId,
        synthetic: true,
        tenantId: input.tenantId,
      } satisfies SafeLogMetadata);

      return {
        completedAt: new Date(),
        provider: "local",
        providerMessageId: null,
        status: "logged",
      };
    },
  };
}

export function createResendEmailProvider(
  config: ResendEmailProviderConfig,
  options: { fetchImpl?: FetchLike } = {},
): EmailProvider {
  validateResendConfig(config);
  const fetchImpl = options.fetchImpl ?? fetch;
  const apiUrl = config.apiUrl?.trim() || "https://api.resend.com/emails";

  return {
    kind: "resend",
    async sendCustomerOffer(input) {
      const response = await fetchImpl(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attachments: input.attachments.map((attachment) => ({
            content: Buffer.from(attachment.bytes).toString("base64"),
            content_type: attachment.contentType,
            filename: attachment.fileName,
          })),
          from: mailbox(
            input.senderName,
            validEmailOrFallback(input.senderEmail, config.defaultFromEmail),
          ),
          reply_to: replyToAddresses(input, config),
          subject: input.subject,
          text: input.bodyText,
          to: [mailbox(input.recipientName, input.recipientEmail)],
        }),
      });

      if (!response.ok) {
        throw new EmailDeliveryProviderError(
          "send_failed",
          `Email provider returned HTTP ${response.status}.`,
        );
      }

      const payload = await safeJson(response);

      return {
        completedAt: new Date(),
        provider: "resend",
        providerMessageId: stringField(payload, "id"),
        status: "sent",
      };
    },
  };
}

export function resendEmailProviderConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ResendEmailProviderConfig {
  return {
    apiKey: optionalEnvValue(env, "RESEND_API_KEY") ?? "",
    apiUrl: optionalEnvValue(env, "RESEND_API_URL"),
    defaultFromEmail: optionalEnvValue(env, "EMAIL_FROM") ?? "",
    defaultReplyToEmail: optionalEnvValue(env, "EMAIL_REPLY_TO") ?? null,
  };
}

function normalizeEmailProvider(value: string): EmailProviderKind {
  const provider = value.trim().toLowerCase();

  if (provider === "local" || provider === "resend") {
    return provider;
  }

  throw new EmailDeliveryProviderError(
    "configuration",
    `Unsupported EMAIL_PROVIDER "${value}". Expected "local" or "resend".`,
  );
}

function validateResendConfig(config: ResendEmailProviderConfig) {
  if (!config.apiKey.trim()) {
    throw new EmailDeliveryProviderError(
      "configuration",
      "RESEND_API_KEY must be configured when EMAIL_PROVIDER is resend.",
    );
  }

  if (!looksLikeEmailAddress(config.defaultFromEmail)) {
    throw new EmailDeliveryProviderError(
      "configuration",
      "EMAIL_FROM must be a valid sender email when EMAIL_PROVIDER is resend.",
    );
  }

  if (
    config.defaultReplyToEmail &&
    !looksLikeEmailAddress(config.defaultReplyToEmail)
  ) {
    throw new EmailDeliveryProviderError(
      "configuration",
      "EMAIL_REPLY_TO must be a valid email when configured.",
    );
  }
}

function validEmailOrFallback(
  value: string | null | undefined,
  fallback: string,
) {
  return looksLikeEmailAddress(value) ? value!.trim() : fallback;
}

function replyToAddresses(
  input: CustomerOfferEmailInput,
  config: ResendEmailProviderConfig,
) {
  const replyToEmail = validEmailOrFallback(
    input.replyToEmail,
    config.defaultReplyToEmail ?? "",
  );

  return looksLikeEmailAddress(replyToEmail) ? [replyToEmail] : undefined;
}

function mailbox(name: string | null | undefined, email: string) {
  const cleanName = name
    ?.replaceAll(/[<>"\r\n]/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();

  if (!cleanName) {
    return email.trim();
  }

  return `${cleanName} <${email.trim()}>`;
}

async function safeJson(response: { json(): Promise<unknown> }) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function stringField(value: unknown, field: string) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const fieldValue = (value as Record<string, unknown>)[field];

  return typeof fieldValue === "string" && fieldValue.trim().length > 0
    ? fieldValue
    : null;
}
