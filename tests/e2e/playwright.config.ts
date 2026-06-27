import path from "node:path";
import { defineConfig } from "@playwright/test";

const repoRoot = process.cwd();
const webAppDir = path.join(repoRoot, "apps", "web");
const port = Number(process.env.PILOT_ACCEPTANCE_PORT ?? 3020);
const baseURL =
  process.env.PILOT_ACCEPTANCE_BASE_URL ?? `http://127.0.0.1:${port}`;
const storageRoot =
  process.env.DOCUMENT_STORAGE_ROOT ??
  path.resolve(repoRoot, ".local-storage", "pilot-acceptance", "documents");

export default defineConfig({
  testDir: ".",
  testMatch: /pilot-acceptance\.spec\.ts/,
  timeout: 300_000,
  expect: {
    timeout: 45_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
  webServer: {
    command: `corepack pnpm --dir "${webAppDir}" dev --hostname 127.0.0.1 --port ${port}`,
    cwd: repoRoot,
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      AUTH_DEV_LOGIN_ENABLED: "true",
      AUTH_SECRET:
        process.env.AUTH_SECRET ??
        "pilot-acceptance-local-auth-secret-0000000000",
      DOCUMENT_STORAGE_PROVIDER:
        process.env.DOCUMENT_STORAGE_PROVIDER ?? "local",
      DOCUMENT_STORAGE_ROOT: storageRoot,
      EMAIL_PROVIDER: process.env.EMAIL_PROVIDER ?? "local",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
