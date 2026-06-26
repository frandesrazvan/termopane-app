import {
  DocumentStorageError,
  optionalEnvValue,
  type DocumentStorageProvider,
} from "./document-storage";

export type S3CompatibleDocumentStorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

export function s3CompatibleDocumentStorageConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): S3CompatibleDocumentStorageConfig {
  const config = {
    endpoint: optionalEnvValue(env, "DOCUMENT_STORAGE_S3_ENDPOINT"),
    region: optionalEnvValue(env, "DOCUMENT_STORAGE_S3_REGION"),
    bucket: optionalEnvValue(env, "DOCUMENT_STORAGE_S3_BUCKET"),
    accessKeyId: optionalEnvValue(env, "DOCUMENT_STORAGE_S3_ACCESS_KEY_ID"),
    secretAccessKey: optionalEnvValue(env, "DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY"),
    forcePathStyle: parseBooleanEnvValue(env.DOCUMENT_STORAGE_S3_FORCE_PATH_STYLE, true),
  };
  const missing = Object.entries(config)
    .filter(([key, value]) => key !== "forcePathStyle" && !value)
    .map(([key]) => s3ConfigEnvName(key));

  if (missing.length > 0) {
    throw new DocumentStorageError(
      "configuration",
      `S3-compatible document storage is missing required environment values: ${missing.join(", ")}.`,
    );
  }

  return config as S3CompatibleDocumentStorageConfig;
}

export function createS3CompatibleDocumentStorageProvider(
  config: S3CompatibleDocumentStorageConfig,
): DocumentStorageProvider {
  const safeConfig = {
    bucket: config.bucket,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    region: config.region,
  };

  return {
    kind: "s3",
    async put() {
      void safeConfig;
      throw s3StubError();
    },
    async get() {
      void safeConfig;
      throw s3StubError();
    },
    async delete() {
      void safeConfig;
      throw s3StubError();
    },
  };
}

function s3StubError() {
  return new DocumentStorageError(
    "not_implemented",
    "S3-compatible document storage is configured, but the SDK-backed adapter is not implemented yet.",
  );
}

function parseBooleanEnvValue(value: string | undefined, defaultValue: boolean) {
  if (!value?.trim()) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function s3ConfigEnvName(key: string) {
  return {
    accessKeyId: "DOCUMENT_STORAGE_S3_ACCESS_KEY_ID",
    bucket: "DOCUMENT_STORAGE_S3_BUCKET",
    endpoint: "DOCUMENT_STORAGE_S3_ENDPOINT",
    region: "DOCUMENT_STORAGE_S3_REGION",
    secretAccessKey: "DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY",
  }[key] ?? key;
}
