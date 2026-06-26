import { runtimeEnvironmentIssues } from "../env/runtime";

export type HealthCheckStatus = "ok" | "fail";

export type HealthCheckEntry = Readonly<{
  name: "database" | "runtime-config";
  status: HealthCheckStatus;
  issueCodes?: readonly string[];
}>;

export type HealthCheckResult = Readonly<{
  service: "termopane-web";
  status: HealthCheckStatus;
  timestamp: string;
  checks: readonly HealthCheckEntry[];
}>;

export type HealthCheckDependencies = Readonly<{
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
  pingDatabase: () => Promise<unknown>;
}>;

export async function runHealthCheck({
  env = process.env,
  now = () => new Date(),
  pingDatabase,
}: HealthCheckDependencies): Promise<HealthCheckResult> {
  const configIssues = runtimeEnvironmentIssues(env);
  const checks: HealthCheckEntry[] = [
    {
      name: "runtime-config",
      status: configIssues.length > 0 ? "fail" : "ok",
      ...(configIssues.length > 0
        ? { issueCodes: configIssues.map((issue) => issue.code) }
        : {}),
    },
  ];

  try {
    await pingDatabase();
    checks.push({ name: "database", status: "ok" });
  } catch {
    checks.push({
      name: "database",
      status: "fail",
      issueCodes: ["database_unavailable"],
    });
  }

  return Object.freeze({
    service: "termopane-web",
    status: checks.every((check) => check.status === "ok") ? "ok" : "fail",
    timestamp: now().toISOString(),
    checks: Object.freeze(checks),
  });
}
