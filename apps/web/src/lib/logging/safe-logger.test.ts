import { describe, expect, it } from "vitest";
import { createSafeLogger, sanitizeLogMetadata, type LogLevel } from "./safe-logger";

describe("safe logger", () => {
  it("redacts PII and secrets from nested metadata", () => {
    expect(
      sanitizeLogMetadata({
        email: "client@example.test",
        phone: "+40 700 000 000",
        safeStatus: "ok",
        nested: {
          accessKeyId: "secret-access-key",
          message: "Contact user@example.test",
        },
      }),
    ).toEqual({
      email: "[redacted]",
      phone: "[redacted]",
      safeStatus: "ok",
      nested: {
        accessKeyId: "[redacted]",
        message: "[redacted]",
      },
    });
  });

  it("writes structured events through an injectable sink", () => {
    const entries: Array<{ level: LogLevel; event: string; metadata?: Record<string, unknown> }> = [];
    const logger = createSafeLogger((level, entry) => {
      entries.push({ level, event: entry.event, metadata: entry.metadata });
    });

    logger.warn("auth.dev_login.rejected", {
      reason: "unsupported_domain",
      attemptedEmail: "client@example.test",
    });

    expect(entries).toEqual([
      {
        level: "warn",
        event: "auth.dev_login.rejected",
        metadata: {
          reason: "unsupported_domain",
          attemptedEmail: "[redacted]",
        },
      },
    ]);
  });
});
