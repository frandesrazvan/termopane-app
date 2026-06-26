import { describe, expect, it } from "vitest";
import { runHealthCheck } from "./health-check";

describe("health check", () => {
  it("returns ok when runtime config and database ping pass", async () => {
    await expect(
      runHealthCheck({
        env: { NODE_ENV: "development" },
        now: () => new Date("2026-06-26T12:00:00.000Z"),
        async pingDatabase() {
          return 1;
        },
      }),
    ).resolves.toEqual({
      service: "termopane-web",
      status: "ok",
      timestamp: "2026-06-26T12:00:00.000Z",
      checks: [
        {
          name: "runtime-config",
          status: "ok",
        },
        {
          name: "database",
          status: "ok",
        },
      ],
    });
  });

  it("returns fail with issue codes but no secret values", async () => {
    const result = await runHealthCheck({
      env: {
        NODE_ENV: "production",
        AUTH_SECRET: "replace-with-a-long-random-development-secret",
        AUTH_DEV_LOGIN_ENABLED: "true",
        DATABASE_URL: "",
        DOCUMENT_STORAGE_PROVIDER: "local",
      },
      now: () => new Date("2026-06-26T12:00:00.000Z"),
      async pingDatabase() {
        throw new Error("connection failed");
      },
    });

    expect(result.status).toBe("fail");
    expect(result.checks).toEqual([
      {
        name: "runtime-config",
        status: "fail",
        issueCodes: [
          "auth_secret_placeholder",
          "auth_dev_login_enabled",
          "database_url_missing",
          "document_storage_local_in_production",
        ],
      },
      {
        name: "database",
        status: "fail",
        issueCodes: ["database_unavailable"],
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("replace-with-a-long-random-development-secret");
  });
});
