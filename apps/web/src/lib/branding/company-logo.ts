import { createHash, randomUUID } from "node:crypto";
import type { TenantContext } from "../auth/tenant-context";
import { canManageCompanySettings } from "../auth/permissions";
import {
  updateTenantCompanyLogoAsset,
  type TenantCompanyLogoAssetWriteInput,
  type TenantDataScope,
} from "../data";
import {
  isDocumentStorageError,
  type DocumentStorageProvider,
} from "../pdf/document-storage";
import { createConfiguredDocumentStorageProvider } from "../pdf/document-storage-provider";

export const companyLogoMaxBytes = 2 * 1024 * 1024;
export const companyLogoAllowedMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type CompanyLogoMimeType = (typeof companyLogoAllowedMimeTypes)[number];

export type CompanyLogoUploadErrorCode =
  | "file_missing"
  | "file_too_large"
  | "invalid_image_bytes"
  | "invalid_mime_type"
  | "permission_denied"
  | "storage_failed"
  | "svg_not_allowed"
  | "metadata_failed";

export class CompanyLogoUploadError extends Error {
  readonly code: CompanyLogoUploadErrorCode;

  constructor(code: CompanyLogoUploadErrorCode, message: string) {
    super(message);
    this.name = "CompanyLogoUploadError";
    this.code = code;
    Object.setPrototypeOf(this, CompanyLogoUploadError.prototype);
  }
}

export type CompanyLogoUploadContext = TenantContext & {
  user: {
    id: string;
  };
};

export type CompanyLogoUploadOptions = {
  now?: () => Date;
  nonce?: () => string;
  persistLogoAsset?: (
    scope: TenantDataScope,
    data: TenantCompanyLogoAssetWriteInput,
  ) => Promise<unknown>;
  storageProvider?: DocumentStorageProvider;
};

export type CompanyLogoUploadResult = {
  assetId: string;
  byteSize: number;
  checksum: string;
  logoUrl: string;
  mimeType: CompanyLogoMimeType;
  uploadedAt: Date;
};

type FileLike = {
  readonly size: number;
  readonly type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export async function uploadTenantCompanyLogo(
  context: CompanyLogoUploadContext,
  file: unknown,
  options: CompanyLogoUploadOptions = {},
): Promise<CompanyLogoUploadResult> {
  if (!canManageCompanySettings(context.membership)) {
    throw new CompanyLogoUploadError(
      "permission_denied",
      "Current membership cannot upload company logos.",
    );
  }

  const validated = await validateCompanyLogoFile(file);
  const uploadedAt = options.now?.() ?? new Date();
  const assetId = safeAssetId(options.nonce?.() ?? randomUUID());
  const checksum = sha256(validated.bytes);
  const storageKey = buildCompanyLogoStorageKey({
    assetId,
    checksum,
    mimeType: validated.mimeType,
    tenantId: context.tenant.id,
    uploadedAt,
  });
  const logoUrl = companyLogoAssetPath(assetId);
  const provider = options.storageProvider ?? createConfiguredDocumentStorageProvider();
  let storedStorageKey: string | null = null;

  try {
    const stored = await provider.put({
      storageKey,
      bytes: validated.bytes,
      contentType: validated.mimeType,
      checksum,
      metadata: {
        assetKind: "company-logo",
        tenantId: context.tenant.id,
      },
    });

    storedStorageKey = stored.storageKey;
  } catch (error) {
    throw new CompanyLogoUploadError(
      "storage_failed",
      isDocumentStorageError(error)
        ? "Company logo could not be stored."
        : "Company logo storage failed.",
    );
  }

  try {
    await (options.persistLogoAsset ?? updateTenantCompanyLogoAsset)(context, {
      assetId,
      byteSize: validated.bytes.byteLength,
      checksum,
      fallbackDisplayName: context.tenant.name,
      fallbackLegalName: context.tenant.name,
      logoUrl,
      mimeType: validated.mimeType,
      storageKey: storedStorageKey,
      uploadedAt,
      uploadedById: context.user.id,
    });
  } catch (error) {
    await cleanupStoredLogo(provider, storedStorageKey);

    if (error instanceof CompanyLogoUploadError) {
      throw error;
    }

    throw new CompanyLogoUploadError(
      "metadata_failed",
      "Company logo metadata could not be saved.",
    );
  }

  return {
    assetId,
    byteSize: validated.bytes.byteLength,
    checksum,
    logoUrl,
    mimeType: validated.mimeType,
    uploadedAt,
  };
}

export async function validateCompanyLogoFile(file: unknown): Promise<{
  bytes: Uint8Array;
  mimeType: CompanyLogoMimeType;
}> {
  if (!isFileLike(file) || file.size <= 0) {
    throw new CompanyLogoUploadError("file_missing", "Logo file is missing.");
  }

  if (file.size > companyLogoMaxBytes) {
    throw new CompanyLogoUploadError("file_too_large", "Logo file is too large.");
  }

  const mimeType = normalizeMimeType(file.type);

  if (mimeType === "image/svg+xml") {
    throw new CompanyLogoUploadError("svg_not_allowed", "SVG logos are not accepted.");
  }

  if (!isAllowedCompanyLogoMimeType(mimeType)) {
    throw new CompanyLogoUploadError(
      "invalid_mime_type",
      "Logo file must be PNG, JPEG, or WebP.",
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (detectCompanyLogoMimeType(bytes) !== mimeType) {
    throw new CompanyLogoUploadError(
      "invalid_image_bytes",
      "Logo bytes do not match the declared image type.",
    );
  }

  return {
    bytes,
    mimeType,
  };
}

export function companyLogoAssetPath(assetId: string) {
  return `/dashboard/settings/logo/${encodeURIComponent(assetId)}`;
}

export function buildCompanyLogoStorageKey({
  assetId,
  checksum,
  mimeType,
  tenantId,
  uploadedAt,
}: {
  assetId: string;
  checksum: string;
  mimeType: CompanyLogoMimeType;
  tenantId: string;
  uploadedAt: Date;
}) {
  const datePart = uploadedAt.toISOString().replace(/[:.]/g, "-");

  return [
    "tenant-assets",
    safeStorageSegment(tenantId),
    "company-logo",
    `${datePart}-${safeStorageSegment(assetId)}-${checksum.slice(0, 16)}.${extensionForMimeType(mimeType)}`,
  ].join("/");
}

export function detectCompanyLogoMimeType(bytes: Uint8Array): CompanyLogoMimeType | null {
  if (isPng(bytes)) {
    return "image/png";
  }

  if (isJpeg(bytes)) {
    return "image/jpeg";
  }

  if (isWebp(bytes)) {
    return "image/webp";
  }

  return null;
}

function isFileLike(value: unknown): value is FileLike {
  return Boolean(
    value &&
      typeof value === "object" &&
      "size" in value &&
      "type" in value &&
      "arrayBuffer" in value &&
      typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function" &&
      typeof (value as { size?: unknown }).size === "number" &&
      typeof (value as { type?: unknown }).type === "string",
  );
}

function isAllowedCompanyLogoMimeType(value: string): value is CompanyLogoMimeType {
  return (companyLogoAllowedMimeTypes as readonly string[]).includes(value);
}

function normalizeMimeType(value: string) {
  return value.trim().toLowerCase();
}

function isPng(bytes: Uint8Array) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  return signature.every((value, index) => bytes[index] === value);
}

function isJpeg(bytes: Uint8Array) {
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isWebp(bytes: Uint8Array) {
  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

function extensionForMimeType(mimeType: CompanyLogoMimeType) {
  return {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }[mimeType];
}

function safeAssetId(value: string) {
  return safeStorageSegment(value).slice(0, 80) || randomUUID();
}

function safeStorageSegment(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function cleanupStoredLogo(provider: DocumentStorageProvider, storageKey: string) {
  try {
    await provider.delete(storageKey);
  } catch {
    // Preserve the metadata failure as the actionable error.
  }
}
