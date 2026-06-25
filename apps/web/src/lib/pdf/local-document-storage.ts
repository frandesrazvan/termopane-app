import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type LocalDocumentStorageOptions = {
  rootDir?: string;
};

export function localDocumentStorageRoot(options: LocalDocumentStorageOptions = {}) {
  const defaultRoot = path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    ".local-storage",
    "documents",
  );

  return path.resolve(
    options.rootDir ?? process.env.DOCUMENT_STORAGE_ROOT ?? defaultRoot,
  );
}

export async function writeLocalDocument(
  storageKey: string,
  bytes: Uint8Array,
  options: LocalDocumentStorageOptions = {},
) {
  const targetPath = resolveLocalDocumentPath(storageKey, options);

  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, bytes);

  return targetPath;
}

export async function readLocalDocument(
  storageKey: string,
  options: LocalDocumentStorageOptions = {},
) {
  return readFile(resolveLocalDocumentPath(storageKey, options));
}

export function resolveLocalDocumentPath(
  storageKey: string,
  options: LocalDocumentStorageOptions = {},
) {
  const root = localDocumentStorageRoot(options);
  const normalizedStorageKey = normalizeStorageKey(storageKey);
  const targetPath = path.resolve(/*turbopackIgnore: true*/ root, normalizedStorageKey);

  if (!targetPath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Document storage key escapes the local storage root.");
  }

  return targetPath;
}

export function normalizeStorageKey(storageKey: string) {
  const normalized = storageKey.replaceAll("\\", "/").replace(/^\/+/, "");

  if (!normalized || normalized.split("/").some((part) => part === "..")) {
    throw new Error("Invalid document storage key.");
  }

  return normalized;
}
