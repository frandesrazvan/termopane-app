-- CreateTable
CREATE TABLE "QuoteDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "quoteVersionId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "recipientEmailRedacted" TEXT,
    "recipientName" TEXT,
    "providerMessageId" TEXT,
    "errorCode" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteDelivery_tenantId_quoteVersionId_idx" ON "QuoteDelivery"("tenantId", "quoteVersionId");

-- CreateIndex
CREATE INDEX "QuoteDelivery_tenantId_documentId_idx" ON "QuoteDelivery"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "QuoteDelivery_tenantId_status_createdAt_idx" ON "QuoteDelivery"("tenantId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "QuoteDelivery" ADD CONSTRAINT "QuoteDelivery_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteDelivery" ADD CONSTRAINT "QuoteDelivery_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteDelivery" ADD CONSTRAINT "QuoteDelivery_quoteVersionId_fkey" FOREIGN KEY ("quoteVersionId") REFERENCES "QuoteVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteDelivery" ADD CONSTRAINT "QuoteDelivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
