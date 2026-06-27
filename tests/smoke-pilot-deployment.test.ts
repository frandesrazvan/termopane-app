import assert from "node:assert/strict";
import {
  buildSyntheticSmokeStorageKey,
  healthUrlFromBaseUrl,
  isPdfLike,
  seedPresenceResult,
  smokeEnvironmentIssueCodes,
  summarizeHealthPayload,
} from "../scripts/smoke-pilot-deployment";

try {
  assert.deepEqual(
    smokeEnvironmentIssueCodes({
      NODE_ENV: "production",
      AUTH_SECRET: "replace-with-a-long-random-development-secret",
      AUTH_DEV_LOGIN_ENABLED: "true",
      DATABASE_URL: "",
      DOCUMENT_STORAGE_PROVIDER: "local",
    } as NodeJS.ProcessEnv),
    [
      "auth_secret_placeholder",
      "auth_dev_login_enabled",
      "database_url_missing",
      "document_storage_local_in_production",
      "email_provider_missing",
    ],
  );

  assert.deepEqual(
    smokeEnvironmentIssueCodes({
      NODE_ENV: "development",
      AUTH_SECRET: "short-local-secret",
      DATABASE_URL: "",
      DOCUMENT_STORAGE_PROVIDER: "local",
    } as NodeJS.ProcessEnv),
    ["smoke_database_url_missing"],
  );

  assert.deepEqual(healthUrlFromBaseUrl(undefined), { ok: true, url: null });
  assert.deepEqual(healthUrlFromBaseUrl("https://pilot.example.test/app"), {
    ok: true,
    url: "https://pilot.example.test/api/health",
  });
  assert.deepEqual(healthUrlFromBaseUrl("file:///tmp/app"), {
    ok: false,
    reason: "base_url_protocol",
  });

  const healthSummary = summarizeHealthPayload({
    status: "fail",
    secret: "do-not-print-this-value",
    checks: [
      {
        name: "runtime-config",
        issueCodes: ["auth_secret_placeholder"],
      },
    ],
  });

  assert.deepEqual(healthSummary, {
    status: "fail",
    issueCodes: ["auth_secret_placeholder"],
  });
  assert.ok(!JSON.stringify(healthSummary).includes("do-not-print-this-value"));

  assert.equal(
    buildSyntheticSmokeStorageKey(
      new Date("2026-06-27T12:00:00.000Z"),
      "unsafe/customer@example.test token",
    ),
    "smoke-tests/pilot-deployment/2026-06-27/unsafe-customer-example.test-token.pdf",
  );

  assert.deepEqual(
    seedPresenceResult({ activeMemberships: 0, tenants: 1, users: 0 }),
    {
      name: "tenant-user-presence",
      status: "fail",
      detail: "Database does not contain the minimum tenant/user bootstrap records.",
      issueCodes: ["missing_user", "missing_active_tenant_member"],
    },
  );
  assert.equal(
    seedPresenceResult({ activeMemberships: 1, tenants: 1, users: 1 }).status,
    "ok",
  );

  assert.equal(isPdfLike(new TextEncoder().encode("%PDF-1.4\n")), true);
  assert.equal(isPdfLike(new TextEncoder().encode("not a pdf")), false);

  console.info("Pilot smoke helper tests passed.");
} catch (error) {
  console.error(error);
  process.exit(1);
}
