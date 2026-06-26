import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
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
import {
  createS3CompatibleDocumentStorageProvider,
  s3CompatibleDocumentStorageConfigFromEnv,
  type S3CompatibleDocumentStorageClient,
  type S3CompatibleDocumentStorageConfig,
} from "./s3-document-storage";

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

  it("writes documents through an S3-compatible client with content type and metadata", async () => {
    const client = mockS3Client();
    const provider = createS3CompatibleDocumentStorageProvider(s3Config(), { client });
    const bytes = new Uint8Array([1, 2, 3]);

    await expect(
      provider.put({
        storageKey: "/documents/tenant-a/version-a/example.pdf",
        bytes,
        contentType: "application/pdf",
        checksum: "abc123",
        metadata: {
          quoteVersionId: "version-a",
          templateKey: "template-a",
          tenantId: "tenant-a",
        },
      }),
    ).resolves.toEqual({
      storageKey: "documents/tenant-a/version-a/example.pdf",
      provider: "s3",
    });

    expect(client.commands).toHaveLength(1);
    expect(client.commands[0]).toBeInstanceOf(PutObjectCommand);
    expect((client.commands[0] as PutObjectCommand).input).toMatchObject({
      Bucket: "termopane-documents",
      Key: "documents/tenant-a/version-a/example.pdf",
      Body: bytes,
      ContentType: "application/pdf",
      Metadata: {
        checksum: "abc123",
        "quote-version-id": "version-a",
        "template-key": "template-a",
        "tenant-id": "tenant-a",
      },
    });
  });

  it("reads document bytes through an S3-compatible client", async () => {
    const expectedBytes = new Uint8Array([37, 80, 68, 70]);
    const client = mockS3Client({
      getBody: {
        async transformToByteArray() {
          return expectedBytes;
        },
      },
    });
    const provider = createS3CompatibleDocumentStorageProvider(s3Config(), { client });

    await expect(provider.get("documents/tenant-a/version-a/example.pdf")).resolves.toEqual(
      expectedBytes,
    );
    expect(client.commands).toHaveLength(1);
    expect(client.commands[0]).toBeInstanceOf(GetObjectCommand);
    expect((client.commands[0] as GetObjectCommand).input).toMatchObject({
      Bucket: "termopane-documents",
      Key: "documents/tenant-a/version-a/example.pdf",
    });
  });

  it("deletes documents through an S3-compatible client", async () => {
    const client = mockS3Client();
    const provider = createS3CompatibleDocumentStorageProvider(s3Config(), { client });

    await expect(provider.delete("documents/tenant-a/version-a/example.pdf")).resolves.toBeUndefined();
    expect(client.commands).toHaveLength(1);
    expect(client.commands[0]).toBeInstanceOf(DeleteObjectCommand);
    expect((client.commands[0] as DeleteObjectCommand).input).toMatchObject({
      Bucket: "termopane-documents",
      Key: "documents/tenant-a/version-a/example.pdf",
    });
  });

  it("maps missing S3-compatible objects to not_found", async () => {
    const client = mockS3Client({
      getError: Object.assign(new Error("missing object"), {
        name: "NoSuchKey",
        $metadata: { httpStatusCode: 404 },
      }),
    });
    const provider = createS3CompatibleDocumentStorageProvider(s3Config(), { client });

    await expect(provider.get("documents/tenant-a/version-a/missing.pdf")).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("maps S3-compatible auth/config failures without exposing secret values", async () => {
    const client = mockS3Client({
      putError: Object.assign(new Error("secret-value should not leak"), {
        name: "InvalidAccessKeyId",
        $metadata: { httpStatusCode: 403 },
      }),
    });
    const provider = createS3CompatibleDocumentStorageProvider(s3Config(), { client });

    try {
      await provider.put({
        storageKey: "documents/tenant-a/version-a/example.pdf",
        bytes: new Uint8Array([1]),
        contentType: "application/pdf",
      });
      throw new Error("Expected S3 put to fail.");
    } catch (error) {
      expect(error).toMatchObject({
        code: "configuration",
      });
      expect(String(error)).not.toContain("secret-value");
    }
  });

  it("rejects invalid S3-compatible storage keys before sending SDK commands", async () => {
    const client = mockS3Client();
    const provider = createS3CompatibleDocumentStorageProvider(s3Config(), { client });

    await expect(
      provider.put({
        storageKey: "../escape.pdf",
        bytes: new Uint8Array([1]),
        contentType: "application/pdf",
      }),
    ).rejects.toMatchObject({
      code: "invalid_key",
    });
    expect(client.commands).toHaveLength(0);
  });
});

function testEnv(values: Record<string, string>): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    ...values,
  };
}

function s3Config(overrides: Partial<S3CompatibleDocumentStorageConfig> = {}) {
  return {
    accessKeyId: "access-key",
    bucket: "termopane-documents",
    endpoint: "https://storage.example.test",
    forcePathStyle: true,
    region: "eu-central-1",
    secretAccessKey: "secret-value",
    ...overrides,
  };
}

function mockS3Client(
  options: {
    deleteError?: Error;
    getBody?: unknown;
    getError?: Error;
    putError?: Error;
  } = {},
) {
  const commands: Array<PutObjectCommand | GetObjectCommand | DeleteObjectCommand> = [];
  const client: S3CompatibleDocumentStorageClient = {
    async send(command: PutObjectCommand | GetObjectCommand | DeleteObjectCommand) {
      commands.push(command);

      if (command instanceof PutObjectCommand) {
        if (options.putError) {
          throw options.putError;
        }

        return {};
      }

      if (command instanceof GetObjectCommand) {
        if (options.getError) {
          throw options.getError;
        }

        return {
          Body: options.getBody ?? new Uint8Array([1, 2, 3]),
        };
      }

      if (options.deleteError) {
        throw options.deleteError;
      }

      return {};
    },
  };

  return Object.assign(client, { commands });
}
