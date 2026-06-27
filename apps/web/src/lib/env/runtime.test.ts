import { describe, expect, it } from "vitest";
import {
  authSecretValidationIssues,
  devLoginEnabled,
  readAuthSecret,
  runtimeEnvironmentIssues,
} from "./runtime";

describe("runtime environment validation", () => {
  it("allows development login only outside production", () => {
    expect(devLoginEnabled(env({ NODE_ENV: "development", AUTH_DEV_LOGIN_ENABLED: "true" }))).toBe(true);
    expect(devLoginEnabled(env({ NODE_ENV: "production", AUTH_DEV_LOGIN_ENABLED: "true" }))).toBe(false);
    expect(devLoginEnabled(env({ NODE_ENV: "development", AUTH_DEV_LOGIN_ENABLED: "false" }))).toBe(false);
  });

  it("rejects missing, short, and placeholder auth secrets in strict mode", () => {
    expect(authSecretValidationIssues(env({}), { strict: true }).map((issue) => issue.code)).toEqual([
      "auth_secret_missing",
    ]);
    expect(
      authSecretValidationIssues(env({ AUTH_SECRET: "short" }), { strict: true }).map(
        (issue) => issue.code,
      ),
    ).toEqual(["auth_secret_too_short"]);
    expect(
      authSecretValidationIssues(
        env({ AUTH_SECRET: "replace-with-a-long-random-development-secret" }),
        { strict: true },
      ).map((issue) => issue.code),
    ).toEqual(["auth_secret_placeholder"]);
  });

  it("reads a production auth secret only when it is strong enough", () => {
    expect(
      readAuthSecret(
        env({
          NODE_ENV: "production",
          AUTH_SECRET: "real-random-pilot-auth-value-0123456789",
        }),
      ),
    ).toBe("real-random-pilot-auth-value-0123456789");

    expect(() =>
      readAuthSecret(
        env({
          NODE_ENV: "production",
          AUTH_SECRET: "replace-with-a-long-random-development-secret",
        }),
      ),
    ).toThrow("AUTH_SECRET is not configured safely");
  });

  it("reports production-only unsafe settings without exposing secret values", () => {
    const issues = runtimeEnvironmentIssues(
      env({
        NODE_ENV: "production",
        AUTH_DEV_LOGIN_ENABLED: "true",
        AUTH_SECRET: "replace-with-a-long-random-development-secret",
        DATABASE_URL: "",
        DOCUMENT_STORAGE_PROVIDER: "local",
        EMAIL_PROVIDER: "local",
      }),
    );

    expect(issues.map((issue) => issue.code)).toEqual([
      "auth_secret_placeholder",
      "auth_dev_login_enabled",
      "database_url_missing",
      "document_storage_local_in_production",
      "email_local_in_production",
    ]);
    expect(JSON.stringify(issues)).not.toContain("replace-with-a-long-random-development-secret");
  });

  it("accepts a production pilot environment with s3 document storage configured", () => {
    expect(
      runtimeEnvironmentIssues(
        env({
          NODE_ENV: "production",
          AUTH_DEV_LOGIN_ENABLED: "false",
          AUTH_SECRET: "real-random-pilot-auth-value-0123456789",
          DATABASE_URL: "postgresql://pilot.example/termopane",
          DOCUMENT_STORAGE_PROVIDER: "s3",
          DOCUMENT_STORAGE_S3_ENDPOINT: "https://storage.example.test",
          DOCUMENT_STORAGE_S3_REGION: "eu-central-1",
          DOCUMENT_STORAGE_S3_BUCKET: "termopane-documents",
          DOCUMENT_STORAGE_S3_ACCESS_KEY_ID: "access-key",
          DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY: "secret-key",
          EMAIL_PROVIDER: "resend",
          EMAIL_FROM: "oferte@example.test",
          RESEND_API_KEY: "resend-key",
        }),
      ),
    ).toEqual([]);
  });

  it("reports missing Resend email configuration in production", () => {
    expect(
      runtimeEnvironmentIssues(
        env({
          NODE_ENV: "production",
          AUTH_DEV_LOGIN_ENABLED: "false",
          AUTH_SECRET: "real-random-pilot-auth-value-0123456789",
          DATABASE_URL: "postgresql://pilot.example/termopane",
          DOCUMENT_STORAGE_PROVIDER: "s3",
          DOCUMENT_STORAGE_S3_ENDPOINT: "https://storage.example.test",
          DOCUMENT_STORAGE_S3_REGION: "eu-central-1",
          DOCUMENT_STORAGE_S3_BUCKET: "termopane-documents",
          DOCUMENT_STORAGE_S3_ACCESS_KEY_ID: "access-key",
          DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY: "secret-key",
          EMAIL_PROVIDER: "resend",
        }),
      ).map((issue) => issue.code),
    ).toEqual(["email_resend_missing"]);
  });
});

function env(values: Partial<NodeJS.ProcessEnv>): NodeJS.ProcessEnv {
  return values as NodeJS.ProcessEnv;
}
