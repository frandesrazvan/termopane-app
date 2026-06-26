import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import {
  DocumentStorageError,
  optionalEnvValue,
  type DocumentStorageProvider,
  type DocumentStoragePutInput,
} from "./document-storage";

export type S3CompatibleDocumentStorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

export type S3CompatibleDocumentStorageClient = {
  send(
    command: PutObjectCommand | GetObjectCommand | DeleteObjectCommand,
  ): Promise<unknown>;
};

export type S3CompatibleDocumentStorageProviderOptions = {
  client?: S3CompatibleDocumentStorageClient;
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
  options: S3CompatibleDocumentStorageProviderOptions = {},
): DocumentStorageProvider {
  const client: S3CompatibleDocumentStorageClient = options.client ?? createS3Client(config);

  return {
    kind: "s3",
    async put(input) {
      const storageKey = normalizeStorageKey(input.storageKey);

      try {
        await client.send(
          new PutObjectCommand({
            Bucket: config.bucket,
            Key: storageKey,
            Body: input.bytes,
            ContentType: input.contentType,
            Metadata: documentMetadata(input),
          }),
        );
      } catch (error) {
        throw mapS3Error(error, "write");
      }

      return {
        storageKey,
        provider: "s3",
      };
    },
    async get(storageKey) {
      const normalizedStorageKey = normalizeStorageKey(storageKey);

      try {
        const result = await client.send(
          new GetObjectCommand({
            Bucket: config.bucket,
            Key: normalizedStorageKey,
          }),
        );

        return await bodyToUint8Array((result as GetObjectCommandOutput).Body);
      } catch (error) {
        throw mapS3Error(error, "read");
      }
    },
    async delete(storageKey) {
      const normalizedStorageKey = normalizeStorageKey(storageKey);

      try {
        await client.send(
          new DeleteObjectCommand({
            Bucket: config.bucket,
            Key: normalizedStorageKey,
          }),
        );
      } catch (error) {
        throw mapS3Error(error, "delete");
      }
    },
  };
}

function createS3Client(config: S3CompatibleDocumentStorageConfig): S3CompatibleDocumentStorageClient {
  const client = new S3Client({
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    send(command) {
      return client.send(command as never);
    },
  };
}

function documentMetadata(input: DocumentStoragePutInput) {
  return compactMetadata({
    ...input.metadata,
    checksum: input.checksum ?? undefined,
  });
}

function compactMetadata(metadata: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(metadata)
      .map(([key, value]) => [metadataKey(key), value?.trim()] as const)
      .filter((entry): entry is [string, string] => Boolean(entry[0] && entry[1])),
  );
}

function metadataKey(value: string) {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function normalizeStorageKey(storageKey: string) {
  const normalized = storageKey.replaceAll("\\", "/").replace(/^\/+/, "");

  if (!normalized || normalized.split("/").some((part) => part === "..")) {
    throw new DocumentStorageError("invalid_key", "Invalid document storage key.");
  }

  return normalized;
}

async function bodyToUint8Array(body: unknown): Promise<Uint8Array> {
  if (body instanceof Uint8Array) {
    return body;
  }

  if (typeof body === "string") {
    return new TextEncoder().encode(body);
  }

  if (hasTransformToByteArray(body)) {
    return body.transformToByteArray();
  }

  if (isAsyncIterable(body)) {
    const chunks: Uint8Array[] = [];

    for await (const chunk of body) {
      chunks.push(chunkToUint8Array(chunk));
    }

    return concatUint8Arrays(chunks);
  }

  throw new DocumentStorageError(
    "unavailable",
    "S3-compatible document body could not be read.",
  );
}

function hasTransformToByteArray(
  value: unknown,
): value is { transformToByteArray(): Promise<Uint8Array> } {
  return Boolean(
    value &&
      typeof value === "object" &&
      "transformToByteArray" in value &&
      typeof (value as { transformToByteArray?: unknown }).transformToByteArray === "function",
  );
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      Symbol.asyncIterator in value &&
      typeof (value as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] ===
        "function",
  );
}

function chunkToUint8Array(chunk: unknown) {
  if (chunk instanceof Uint8Array) {
    return chunk;
  }

  if (typeof chunk === "string") {
    return new TextEncoder().encode(chunk);
  }

  if (chunk instanceof ArrayBuffer) {
    return new Uint8Array(chunk);
  }

  throw new DocumentStorageError(
    "unavailable",
    "S3-compatible document chunk could not be read.",
  );
}

function concatUint8Arrays(chunks: Uint8Array[]) {
  const length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const result = new Uint8Array(length);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return result;
}

function mapS3Error(error: unknown, operation: "delete" | "read" | "write") {
  if (error instanceof DocumentStorageError) {
    return error;
  }

  if (isMissingObjectError(error)) {
    return new DocumentStorageError(
      "not_found",
      "Document was not found in S3-compatible storage.",
    );
  }

  if (isConfigurationError(error)) {
    return new DocumentStorageError(
      "configuration",
      "S3-compatible document storage is not configured correctly.",
    );
  }

  return new DocumentStorageError(
    "unavailable",
    `Could not ${operation} document in S3-compatible storage.`,
  );
}

function isMissingObjectError(error: unknown) {
  const statusCode = sdkStatusCode(error);
  const name = sdkErrorName(error);
  const code = sdkErrorCode(error);

  return (
    statusCode === 404 ||
    name === "NoSuchKey" ||
    name === "NotFound" ||
    code === "NoSuchKey" ||
    code === "NotFound"
  );
}

function isConfigurationError(error: unknown) {
  const name = sdkErrorName(error);
  const code = sdkErrorCode(error);

  return (
    name === "CredentialsProviderError" ||
    name === "InvalidAccessKeyId" ||
    name === "InvalidEndpoint" ||
    name === "InvalidRegion" ||
    name === "SignatureDoesNotMatch" ||
    code === "CredentialsProviderError" ||
    code === "InvalidAccessKeyId" ||
    code === "InvalidEndpoint" ||
    code === "InvalidRegion" ||
    code === "SignatureDoesNotMatch"
  );
}

function sdkStatusCode(error: unknown) {
  return error && typeof error === "object" && "$metadata" in error
    ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
    : undefined;
}

function sdkErrorName(error: unknown) {
  return error && typeof error === "object" && "name" in error
    ? (error as { name?: unknown }).name
    : undefined;
}

function sdkErrorCode(error: unknown) {
  return error && typeof error === "object" && "Code" in error
    ? (error as { Code?: unknown }).Code
    : undefined;
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
