export type RuntimeEnvironmentIssueCode =
  | "auth_secret_missing"
  | "auth_secret_too_short"
  | "auth_secret_placeholder"
  | "auth_dev_login_enabled"
  | "database_url_missing"
  | "document_storage_provider_missing"
  | "document_storage_provider_unsupported"
  | "document_storage_local_in_production"
  | "document_storage_s3_missing";

export type RuntimeEnvironmentIssue = Readonly<{
  code: RuntimeEnvironmentIssueCode;
  message: string;
}>;

const minProductionAuthSecretLength = 32;
const unsafeAuthSecretFragments = [
  "change-me",
  "changeme",
  "development-secret",
  "example",
  "placeholder",
  "replace",
  "test-secret",
];
const supportedStorageProviders = new Set(["local", "s3"]);
const requiredS3EnvKeys = [
  "DOCUMENT_STORAGE_S3_ENDPOINT",
  "DOCUMENT_STORAGE_S3_REGION",
  "DOCUMENT_STORAGE_S3_BUCKET",
  "DOCUMENT_STORAGE_S3_ACCESS_KEY_ID",
  "DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY",
] as const;

export class RuntimeEnvironmentError extends Error {
  readonly issues: readonly RuntimeEnvironmentIssue[];

  constructor(message: string, issues: readonly RuntimeEnvironmentIssue[]) {
    super(message);
    this.name = "RuntimeEnvironmentError";
    this.issues = issues;
    Object.setPrototypeOf(this, RuntimeEnvironmentError.prototype);
  }
}

export function isProductionEnvironment(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV === "production";
}

export function devLoginEnabled(env: NodeJS.ProcessEnv = process.env) {
  return !isProductionEnvironment(env) && env.AUTH_DEV_LOGIN_ENABLED === "true";
}

export function readAuthSecret(env: NodeJS.ProcessEnv = process.env) {
  const strict = isProductionEnvironment(env);
  const issues = authSecretValidationIssues(env, { strict });

  if (issues.length > 0) {
    throw new RuntimeEnvironmentError(
      "AUTH_SECRET is not configured safely for the current runtime.",
      issues,
    );
  }

  return env.AUTH_SECRET as string;
}

export function authSecretValidationIssues(
  env: NodeJS.ProcessEnv = process.env,
  options: { strict?: boolean } = {},
): RuntimeEnvironmentIssue[] {
  const secret = env.AUTH_SECRET?.trim();

  if (!secret) {
    return [
      {
        code: "auth_secret_missing",
        message: "AUTH_SECRET must be configured.",
      },
    ];
  }

  if (!options.strict) {
    return [];
  }

  const issues: RuntimeEnvironmentIssue[] = [];

  if (secret.length < minProductionAuthSecretLength) {
    issues.push({
      code: "auth_secret_too_short",
      message: `AUTH_SECRET must be at least ${minProductionAuthSecretLength} characters in production.`,
    });
  }

  if (looksLikePlaceholderSecret(secret)) {
    issues.push({
      code: "auth_secret_placeholder",
      message: "AUTH_SECRET must be a real random secret in production.",
    });
  }

  return issues;
}

export function runtimeEnvironmentIssues(
  env: NodeJS.ProcessEnv = process.env,
): RuntimeEnvironmentIssue[] {
  if (!isProductionEnvironment(env)) {
    return [];
  }

  const issues: RuntimeEnvironmentIssue[] = [
    ...authSecretValidationIssues(env, { strict: true }),
  ];

  if (env.AUTH_DEV_LOGIN_ENABLED === "true") {
    issues.push({
      code: "auth_dev_login_enabled",
      message: "AUTH_DEV_LOGIN_ENABLED must be false in production.",
    });
  }

  if (!env.DATABASE_URL?.trim()) {
    issues.push({
      code: "database_url_missing",
      message: "DATABASE_URL must be configured in production.",
    });
  }

  issues.push(...documentStorageProductionIssues(env));

  return issues;
}

export function assertRuntimeEnvironmentSafe(env: NodeJS.ProcessEnv = process.env) {
  const issues = runtimeEnvironmentIssues(env);

  if (issues.length > 0) {
    throw new RuntimeEnvironmentError(
      "Production runtime environment is not safe to serve traffic.",
      issues,
    );
  }
}

function documentStorageProductionIssues(env: NodeJS.ProcessEnv): RuntimeEnvironmentIssue[] {
  const provider = env.DOCUMENT_STORAGE_PROVIDER?.trim().toLowerCase();
  const issues: RuntimeEnvironmentIssue[] = [];

  if (!provider) {
    return [
      {
        code: "document_storage_provider_missing",
        message: "DOCUMENT_STORAGE_PROVIDER must be configured in production.",
      },
    ];
  }

  if (!supportedStorageProviders.has(provider)) {
    return [
      {
        code: "document_storage_provider_unsupported",
        message: "DOCUMENT_STORAGE_PROVIDER must be local or s3.",
      },
    ];
  }

  if (provider === "local") {
    issues.push({
      code: "document_storage_local_in_production",
      message: "Use s3-compatible document storage for production pilot deployments.",
    });
  }

  if (provider === "s3") {
    const missing = requiredS3EnvKeys.filter((key) => !env[key]?.trim());

    if (missing.length > 0) {
      issues.push({
        code: "document_storage_s3_missing",
        message: `S3-compatible document storage is missing required values: ${missing.join(", ")}.`,
      });
    }
  }

  return issues;
}

function looksLikePlaceholderSecret(secret: string) {
  const normalized = secret.toLowerCase();

  return unsafeAuthSecretFragments.some((fragment) => normalized.includes(fragment));
}
