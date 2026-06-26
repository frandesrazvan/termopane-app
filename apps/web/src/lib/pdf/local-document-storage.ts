import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DocumentStorageError,
  optionalEnvValue,
  type DocumentStorageProvider,
} from "./document-storage";

export type LocalDocumentStorageOptions = {
  env?: NodeJS.ProcessEnv;
  rootDir?: string;
};

export function localDocumentStorageRoot(options: LocalDocumentStorageOptions = {}) {
  const env = options.env ?? process.env;
  const configuredRoot = options.rootDir ?? optionalEnvValue(env, "DOCUMENT_STORAGE_ROOT");
  const defaultRoot = path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    ".local-storage",
    "documents",
  );

  return configuredRoot
    ? path.resolve(/*turbopackIgnore: true*/ configuredRoot)
    : defaultRoot;
}

export function createLocalDocumentStorageProvider(
  options: LocalDocumentStorageOptions = {},
): DocumentStorageProvider {
  return {
    kind: "local",
    async put({ storageKey, bytes }) {
      const normalizedStorageKey = normalizeStorageKey(storageKey);
      const targetPath = resolveLocalDocumentPath(normalizedStorageKey, options);

      try {
        await mkdir(path.dirname(targetPath), { recursive: true });
        await writeFile(targetPath, bytes);
      } catch (error) {
        throw new DocumentStorageError(
          "unavailable",
          "Could not write document to local storage.",
          error,
        );
      }

      return {
        storageKey: normalizedStorageKey,
        provider: "local",
      };
    },
    async get(storageKey) {
      try {
        return await readFile(resolveLocalDocumentPath(storageKey, options));
      } catch (error) {
        if (isNodeErrorCode(error, "ENOENT")) {
          throw new DocumentStorageError(
            "not_found",
            "Document was not found in local storage.",
            error,
          );
        }

        if (error instanceof DocumentStorageError) {
          throw error;
        }

        throw new DocumentStorageError(
          "unavailable",
          "Could not read document from local storage.",
          error,
        );
      }
    },
    async delete(storageKey) {
      try {
        await rm(resolveLocalDocumentPath(storageKey, options), { force: true });
      } catch (error) {
        if (error instanceof DocumentStorageError) {
          throw error;
        }

        throw new DocumentStorageError(
          "unavailable",
          "Could not delete document from local storage.",
          error,
        );
      }
    },
  };
}

export async function writeLocalDocument(
  storageKey: string,
  bytes: Uint8Array,
  options: LocalDocumentStorageOptions = {},
) {
  const provider = createLocalDocumentStorageProvider(options);
  await provider.put({
    storageKey,
    bytes,
    contentType: "application/octet-stream",
  });

  return resolveLocalDocumentPath(storageKey, options);
}

export async function readLocalDocument(
  storageKey: string,
  options: LocalDocumentStorageOptions = {},
) {
  return createLocalDocumentStorageProvider(options).get(storageKey);
}

export function resolveLocalDocumentPath(
  storageKey: string,
  options: LocalDocumentStorageOptions = {},
) {
  const root = localDocumentStorageRoot(options);
  const normalizedStorageKey = normalizeStorageKey(storageKey);
  const targetPath = path.resolve(/*turbopackIgnore: true*/ root, normalizedStorageKey);
  const relativePath = path.relative(root, targetPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new DocumentStorageError(
      "invalid_key",
      "Document storage key escapes the local storage root.",
    );
  }

  return targetPath;
}

export function normalizeStorageKey(storageKey: string) {
  const normalized = storageKey.replaceAll("\\", "/").replace(/^\/+/, "");

  if (!normalized || normalized.split("/").some((part) => part === "..")) {
    throw new DocumentStorageError("invalid_key", "Invalid document storage key.");
  }

  return normalized;
}

function isNodeErrorCode(error: unknown, code: string) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === code,
  );
}
