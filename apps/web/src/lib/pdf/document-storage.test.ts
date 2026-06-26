import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DocumentStorageError } from "./document-storage";
import { createConfiguredDocumentStorageProvider } from "./document-storage-provider";
import {
  createLocalDocumentStorageProvider,
  resolveLocalDocumentPath,
} from "./local-document-storage";
import { s3CompatibleDocumentStorageConfigFromEnv } from "./s3-document-storage";

let storageRoot: string;

beforeEach(async () => {
  storageRoot = await mkdtemp(path.join(tmpdir(), "termopane-storage-test-"));
});

afterEach(async () => {
  await rm(storageRoot, { force: true, recursive: true });
});

describe("document storage providers", () => {
  it("writes, reads, and deletes documents through the local provider", async () => {
    const provider = createLocalDocumentStorageProvider({ rootDir: storageRoot });
    const storageKey = "documents/tenant-a/version-a/example.pdf";
    const bytes = new TextEncoder().encode("%PDF-1.4\nSynthetic PDF\n");

    await expect(
      provider.put({
        storageKey,
        bytes,
        contentType: "application/pdf",
      }),
    ).resolves.toEqual({
      storageKey,
      provider: "local",
    });
    await expect(provider.get(storageKey).then((file) => Array.from(file))).resolves.toEqual(
      Array.from(bytes),
    );
    await expect(
      readFile(resolveLocalDocumentPath(storageKey, { rootDir: storageRoot }), "utf8"),
    ).resolves.toContain("Synthetic PDF");

    await provider.delete(storageKey);

    await expect(provider.get(storageKey)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("uses local storage by default and ignores empty local root env values", async () => {
    const provider = createConfiguredDocumentStorageProvider({
      env: testEnv({
        DOCUMENT_STORAGE_PROVIDER: "",
        DOCUMENT_STORAGE_ROOT: "",
      }),
      rootDir: storageRoot,
    });

    expect(provider.kind).toBe("local");
    await expect(
      provider.put({
        storageKey: "documents/tenant-a/default-provider.pdf",
        bytes: new Uint8Array([1, 2, 3]),
        contentType: "application/pdf",
      }),
    ).resolves.toMatchObject({ provider: "local" });
  });

  it("validates S3-compatible storage configuration without exposing secret values", () => {
    expect(() =>
      s3CompatibleDocumentStorageConfigFromEnv(testEnv({
        DOCUMENT_STORAGE_S3_ACCESS_KEY_ID: "access-key",
        DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY: "secret-value",
      })),
    ).toThrow(DocumentStorageError);

    try {
      s3CompatibleDocumentStorageConfigFromEnv(testEnv({
        DOCUMENT_STORAGE_S3_ACCESS_KEY_ID: "access-key",
        DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY: "secret-value",
      }));
    } catch (error) {
      expect(error).toMatchObject({
        code: "configuration",
      });
      expect(String(error)).not.toContain("secret-value");
    }
  });

  it("returns a configured S3-compatible stub that fails clearly until implemented", async () => {
    const provider = createConfiguredDocumentStorageProvider({
      env: testEnv({
        DOCUMENT_STORAGE_PROVIDER: "s3",
        DOCUMENT_STORAGE_S3_ACCESS_KEY_ID: "access-key",
        DOCUMENT_STORAGE_S3_BUCKET: "termopane-documents",
        DOCUMENT_STORAGE_S3_ENDPOINT: "https://storage.example.test",
        DOCUMENT_STORAGE_S3_REGION: "eu-central-1",
        DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY: "secret-value",
      }),
    });

    expect(provider.kind).toBe("s3");
    await expect(
      provider.put({
        storageKey: "documents/tenant-a/version-a/example.pdf",
        bytes: new Uint8Array([1, 2, 3]),
        contentType: "application/pdf",
      }),
    ).rejects.toMatchObject({
      code: "not_implemented",
    });
  });
});

function testEnv(values: Record<string, string>): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    ...values,
  };
}
