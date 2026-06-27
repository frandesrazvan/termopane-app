import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import { getTenantCompanyLogoAsset } from "@/lib/data";
import { isDocumentStorageError } from "@/lib/pdf/document-storage";
import { createConfiguredDocumentStorageProvider } from "@/lib/pdf/document-storage-provider";

export const dynamic = "force-dynamic";

type CompanyLogoRouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function GET(_request: Request, { params }: CompanyLogoRouteContext) {
  const context = await requireTenant();
  const { assetId } = await params;
  const asset = await getTenantCompanyLogoAsset(context, assetId);

  if (!asset) {
    notFound();
  }

  let file: Uint8Array;

  try {
    file = await createConfiguredDocumentStorageProvider().get(asset.storageKey);
  } catch (error) {
    if (isOperationalStorageError(error)) {
      return storageUnavailableResponse();
    }

    notFound();
  }

  return new Response(new Uint8Array(file), {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Length": String(file.byteLength),
      "Content-Type": asset.mimeType,
      "ETag": `"${asset.checksum}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isOperationalStorageError(error: unknown) {
  return (
    isDocumentStorageError(error, "configuration") ||
    isDocumentStorageError(error, "unavailable")
  );
}

function storageUnavailableResponse() {
  return new Response("Logo storage unavailable.", {
    status: 503,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
