import {
  DocumentStorageError,
  optionalEnvValue,
  type DocumentStorageProvider,
} from "./document-storage";
import {
  createLocalDocumentStorageProvider,
  type LocalDocumentStorageOptions,
} from "./local-document-storage";
import {
  createS3CompatibleDocumentStorageProvider,
  s3CompatibleDocumentStorageConfigFromEnv,
  type S3CompatibleDocumentStorageConfig,
} from "./s3-document-storage";

export type ConfiguredDocumentStorageProviderOptions = LocalDocumentStorageOptions & {
  env?: NodeJS.ProcessEnv;
  provider?: string;
  s3Config?: S3CompatibleDocumentStorageConfig;
};

export function createConfiguredDocumentStorageProvider(
  options: ConfiguredDocumentStorageProviderOptions = {},
): DocumentStorageProvider {
  const env = options.env ?? process.env;
  const provider = normalizeDocumentStorageProvider(
    options.provider ?? optionalEnvValue(env, "DOCUMENT_STORAGE_PROVIDER") ?? "local",
  );

  if (provider === "local") {
    return createLocalDocumentStorageProvider(options);
  }

  return createS3CompatibleDocumentStorageProvider(
    options.s3Config ?? s3CompatibleDocumentStorageConfigFromEnv(env),
  );
}

function normalizeDocumentStorageProvider(value: string) {
  const provider = value.trim().toLowerCase();

  if (provider === "local" || provider === "s3") {
    return provider;
  }

  throw new DocumentStorageError(
    "configuration",
    `Unsupported DOCUMENT_STORAGE_PROVIDER "${value}". Expected "local" or "s3".`,
  );
}
