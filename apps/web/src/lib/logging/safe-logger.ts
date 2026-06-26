export type LogLevel = "info" | "warn" | "error";

export type SafeLogMetadata = Record<string, unknown>;

export type SafeLogSink = (
  level: LogLevel,
  entry: Readonly<{
    event: string;
    metadata?: SafeLogMetadata;
    timestamp: string;
  }>,
) => void;

const sensitiveKeyPattern =
  /(authorization|cookie|credential|password|privatekey|secret|token|accesskey|email|phone|address|customer|contactname|companyname|displayname|legalname|recipient|taxidentifier|cui|cnp)/i;
const emailValuePattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const phoneValuePattern = /(?:\+?\d[\s().-]*){8,}/;

export function createSafeLogger(sink: SafeLogSink = consoleSink) {
  function write(level: LogLevel, event: string, metadata?: SafeLogMetadata) {
    sink(level, {
      event,
      metadata: metadata ? sanitizeLogMetadata(metadata) : undefined,
      timestamp: new Date().toISOString(),
    });
  }

  return {
    info(event: string, metadata?: SafeLogMetadata) {
      write("info", event, metadata);
    },
    warn(event: string, metadata?: SafeLogMetadata) {
      write("warn", event, metadata);
    },
    error(event: string, metadata?: SafeLogMetadata) {
      write("error", event, metadata);
    },
  };
}

export function sanitizeLogMetadata(metadata: SafeLogMetadata): SafeLogMetadata {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, sanitizeLogValue(key, value)]),
  );
}

export const logger = createSafeLogger();

function sanitizeLogValue(key: string, value: unknown): unknown {
  if (isSensitiveKey(key)) {
    return "[redacted]";
  }

  if (typeof value === "string") {
    return isSensitiveString(value) ? "[redacted]" : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogValue(key, item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([nestedKey, nestedValue]) => [
        nestedKey,
        sanitizeLogValue(nestedKey, nestedValue),
      ]),
    );
  }

  return value;
}

function isSensitiveKey(key: string) {
  return sensitiveKeyPattern.test(key.replaceAll(/[-_\s]/g, ""));
}

function isSensitiveString(value: string) {
  return emailValuePattern.test(value) || hasUnsafePhoneLikeText(value);
}

function hasUnsafePhoneLikeText(value: string) {
  const match = value.match(phoneValuePattern);

  if (!match) {
    return false;
  }

  const digits = match[0].replace(/\D/g, "");

  return digits.length >= 8;
}

function consoleSink(level: LogLevel, entry: Parameters<SafeLogSink>[1]) {
  const serialized = JSON.stringify(entry);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}
