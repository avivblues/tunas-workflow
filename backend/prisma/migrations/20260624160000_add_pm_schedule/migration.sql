-- CreateTable
CREATE TABLE "PmSchedule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assetId" TEXT,
    "domainCode" TEXT,
    "frequency" TEXT NOT NULL,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "assignTo" TEXT,
    "checklist" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PmSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PmSchedule_tenantId_active_nextRunAt_idx" ON "PmSchedule"("tenantId", "active", "nextRunAt");

-- AddForeignKey
ALTER TABLE "PmSchedule" ADD CONSTRAINT "PmSchedule_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
