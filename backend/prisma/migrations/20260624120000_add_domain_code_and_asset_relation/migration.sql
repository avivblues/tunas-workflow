-- AlterTable
ALTER TABLE "TransactionHeader" ADD COLUMN "domainCode" TEXT;

-- CreateIndex
CREATE INDEX "TransactionHeader_tenantId_domainCode_idx" ON "TransactionHeader"("tenantId", "domainCode");

-- AddForeignKey
ALTER TABLE "TransactionAsset" ADD CONSTRAINT "TransactionAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
