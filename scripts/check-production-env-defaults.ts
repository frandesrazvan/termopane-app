import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const envExamplePath = path.join(repoRoot, ".env.example");
const defaults = parseEnvFile(readFileSync(envExamplePath, "utf8"));
const failures: string[] = [];

if (defaults.NODE_ENV === "production") {
  failures.push(".env.example must not default NODE_ENV to production.");
}

if (defaults.AUTH_DEV_LOGIN_ENABLED === "true") {
  failures.push("AUTH_DEV_LOGIN_ENABLED must not be enabled by default.");
}

if (!looksLikePlaceholder(defaults.AUTH_SECRET)) {
  failures.push("AUTH_SECRET in .env.example must stay a placeholder, not a real secret.");
}

for (const [key, value] of Object.entries(defaults)) {
  if (!key.startsWith("NEXT_PUBLIC_")) {
    continue;
  }

  if (/(secret|token|password|credential|access_key|private_key)/i.test(key)) {
    failures.push(`Browser-exposed env var ${key} must not contain a secret-like name.`);
  }

  if (/(secret|token|password|credential|access-key|private-key)/i.test(value)) {
    failures.push(`Browser-exposed env var ${key} must not contain a secret-like value.`);
  }
}

for (const key of [
  "DOCUMENT_STORAGE_S3_ACCESS_KEY_ID",
  "DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY",
  "RESEND_API_KEY",
]) {
  const value = defaults[key]?.trim();

  if (value && !looksLikePlaceholder(value)) {
    failures.push(`${key} in .env.example must be empty or placeholder text.`);
  }
}

if (failures.length > 0) {
  console.error("Production env default check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.info("Production env defaults are safe.");
}

function parseEnvFile(contents: string) {
  const values: Record<string, string> = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");

    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();

    values[key] = rawValue.replace(/^["']|["']$/g, "");
  }

  return values;
}

function looksLikePlaceholder(value: string | undefined) {
  if (!value?.trim()) {
    return true;
  }

  return /(replace|placeholder|example|change-me|changeme)/i.test(value);
}
