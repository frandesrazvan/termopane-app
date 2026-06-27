import { TenantMemberStatus, TenantRole, TenantStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import type { DocumentStorageProvider, DocumentStoragePutInput } from "../pdf/document-storage";
import {
  buildCompanyLogoStorageKey,
  CompanyLogoUploadError,
  companyLogoAssetPath,
  companyLogoMaxBytes,
  detectCompanyLogoMimeType,
  uploadTenantCompanyLogo,
  validateCompanyLogoFile,
  type CompanyLogoUploadContext,
} from "./company-logo";

const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]);
const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const webpBytes = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x01, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

describe("company logo upload", () => {
  it("allows owner and admin users to upload tenant company logos", async () => {
    for (const role of [TenantRole.OWNER, TenantRole.ADMIN]) {
      const storage = memoryStorageProvider();
      const persisted: unknown[] = [];
      const result = await uploadTenantCompanyLogo(
        context(role),
        fileLike(pngBytes, "image/png"),
        {
          nonce: () => `asset-${role.toLowerCase()}`,
          now: () => new Date("2026-06-27T12:00:00.000Z"),
          storageProvider: storage.provider,
          persistLogoAsset: async (_scope, data) => {
            persisted.push(data);
          },
        },
      );

      expect(result).toMatchObject({
        assetId: `asset-${role.toLowerCase()}`,
        logoUrl: companyLogoAssetPath(`asset-${role.toLowerCase()}`),
        mimeType: "image/png",
        byteSize: pngBytes.byteLength,
      });
      expect(storage.puts).toHaveLength(1);
      expect(storage.puts[0]?.storageKey).toContain("tenant-assets/tenant-a/company-logo/");
      expect(storage.puts[0]?.storageKey).not.toContain("customer");
      expect(storage.puts[0]?.contentType).toBe("image/png");
      expect(storage.puts[0]?.metadata).toEqual({
        assetKind: "company-logo",
        tenantId: "tenant-a",
      });
      expect(persisted).toHaveLength(1);
      expect(persisted[0]).toMatchObject({
        fallbackDisplayName: "Tenant A",
        fallbackLegalName: "Tenant A",
        logoUrl: result.logoUrl,
        mimeType: "image/png",
        uploadedById: "user-a",
      });
    }
  });

  it("blocks estimator and dealer logo mutations before storage", async () => {
    for (const role of [TenantRole.ESTIMATOR, TenantRole.DEALER]) {
      const storage = memoryStorageProvider();

      await expect(
        uploadTenantCompanyLogo(context(role), fileLike(pngBytes, "image/png"), {
          storageProvider: storage.provider,
          persistLogoAsset: async () => undefined,
        }),
      ).rejects.toMatchObject({
        code: "permission_denied",
      });
      expect(storage.puts).toHaveLength(0);
    }
  });

  it("rejects invalid MIME, SVG, and oversized files", async () => {
    await expect(
      validateCompanyLogoFile(fileLike(pngBytes, "text/plain")),
    ).rejects.toMatchObject({ code: "invalid_mime_type" });
    await expect(
      validateCompanyLogoFile(fileLike(new TextEncoder().encode("<svg />"), "image/svg+xml")),
    ).rejects.toMatchObject({ code: "svg_not_allowed" });
    await expect(
      validateCompanyLogoFile(fileLike(pngBytes, "image/png", companyLogoMaxBytes + 1)),
    ).rejects.toMatchObject({ code: "file_too_large" });
    await expect(
      validateCompanyLogoFile(fileLike(jpegBytes, "image/png")),
    ).rejects.toMatchObject({ code: "invalid_image_bytes" });
  });

  it("detects supported image signatures and sanitizes generated storage paths", () => {
    expect(detectCompanyLogoMimeType(pngBytes)).toBe("image/png");
    expect(detectCompanyLogoMimeType(jpegBytes)).toBe("image/jpeg");
    expect(detectCompanyLogoMimeType(webpBytes)).toBe("image/webp");

    const key = buildCompanyLogoStorageKey({
      assetId: "../asset/customer@example.test",
      checksum: "abcdef0123456789abcdef",
      mimeType: "image/webp",
      tenantId: "../tenant-a",
      uploadedAt: new Date("2026-06-27T12:00:00.000Z"),
    });

    expect(key).toBe(
      "tenant-assets/tenant-a/company-logo/2026-06-27T12-00-00-000Z-asset-customer-example-test-abcdef0123456789.webp",
    );
    expect(key).not.toContain("..");
  });

  it("cleans up stored bytes when metadata persistence fails", async () => {
    const storage = memoryStorageProvider();

    await expect(
      uploadTenantCompanyLogo(context(TenantRole.OWNER), fileLike(pngBytes, "image/png"), {
        nonce: () => "asset-cleanup",
        storageProvider: storage.provider,
        persistLogoAsset: async () => {
          throw new CompanyLogoUploadError("metadata_failed", "metadata failed");
        },
      }),
    ).rejects.toMatchObject({ code: "metadata_failed" });
    expect(storage.deletedKeys).toEqual([storage.puts[0]?.storageKey]);
  });
});

function context(role: TenantRole): CompanyLogoUploadContext {
  return {
    membership: {
      id: "member-a",
      tenantId: "tenant-a",
      userId: "user-a",
      role,
      status: TenantMemberStatus.ACTIVE,
      canViewInternalCosts: false,
      canApplyCommercialOverrides: false,
      tenant: {
        id: "tenant-a",
        name: "Tenant A",
        slug: "tenant-a",
        status: TenantStatus.ACTIVE,
      },
    },
    tenant: {
      id: "tenant-a",
      name: "Tenant A",
      slug: "tenant-a",
      status: TenantStatus.ACTIVE,
    },
    user: {
      id: "user-a",
    },
  };
}

function fileLike(bytes: Uint8Array, type: string, size = bytes.byteLength) {
  return {
    size,
    type,
    async arrayBuffer() {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    },
  };
}

function memoryStorageProvider() {
  const puts: DocumentStoragePutInput[] = [];
  const deletedKeys: string[] = [];
  const provider: DocumentStorageProvider = {
    kind: "local",
    async put(input) {
      puts.push(input);

      return {
        provider: "local",
        storageKey: input.storageKey,
      };
    },
    async get() {
      return pngBytes;
    },
    async delete(storageKey) {
      deletedKeys.push(storageKey);
    },
  };

  return {
    deletedKeys,
    provider,
    puts,
  };
}
