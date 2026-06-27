-- CreateTable
CREATE TABLE "TenantAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantAsset_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN "logoAssetId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TenantAsset_tenantId_storageKey_key" ON "TenantAsset"("tenantId", "storageKey");

-- CreateIndex
CREATE INDEX "TenantAsset_tenantId_kind_uploadedAt_idx" ON "TenantAsset"("tenantId", "kind", "uploadedAt");

-- CreateIndex
CREATE INDEX "TenantAsset_tenantId_checksum_idx" ON "TenantAsset"("tenantId", "checksum");

-- CreateIndex
CREATE INDEX "TenantAsset_uploadedById_idx" ON "TenantAsset"("uploadedById");

-- AddForeignKey
ALTER TABLE "TenantAsset" ADD CONSTRAINT "TenantAsset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantAsset" ADD CONSTRAINT "TenantAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
