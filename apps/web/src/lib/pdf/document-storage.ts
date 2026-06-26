export type DocumentStorageProviderKind = "local" | "s3";

export type DocumentStoragePutInput = {
  storageKey: string;
  bytes: Uint8Array;
  contentType: string;
  checksum?: string | null;
  metadata?: Record<string, string>;
};

export type DocumentStoragePutResult = {
  storageKey: string;
  provider: DocumentStorageProviderKind;
};

export type DocumentStorageProvider = {
  readonly kind: DocumentStorageProviderKind;
  put(input: DocumentStoragePutInput): Promise<DocumentStoragePutResult>;
  get(storageKey: string): Promise<Uint8Array>;
  delete(storageKey: string): Promise<void>;
};

export type DocumentStorageErrorCode =
  | "configuration"
  | "invalid_key"
  | "not_found"
  | "unavailable";

export class DocumentStorageError extends Error {
  readonly code: DocumentStorageErrorCode;
  readonly cause?: unknown;

  constructor(code: DocumentStorageErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "DocumentStorageError";
    this.code = code;
    this.cause = cause;
    Object.setPrototypeOf(this, DocumentStorageError.prototype);
  }
}

export function isDocumentStorageError(
  error: unknown,
  code?: DocumentStorageErrorCode,
): error is DocumentStorageError {
  return (
    error instanceof DocumentStorageError &&
    (code === undefined || error.code === code)
  );
}

export function optionalEnvValue(
  env: NodeJS.ProcessEnv,
  key: string,
): string | undefined {
  const value = env[key]?.trim();

  return value ? value : undefined;
}
