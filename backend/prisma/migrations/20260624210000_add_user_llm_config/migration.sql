-- CreateTable
CREATE TABLE "UserLlmConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKeyEnc" TEXT NOT NULL,
    "model" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLlmConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserLlmConfig_userId_key" ON "UserLlmConfig"("userId");

-- CreateIndex
CREATE INDEX "UserLlmConfig_tenantId_idx" ON "UserLlmConfig"("tenantId");

-- AddForeignKey
ALTER TABLE "UserLlmConfig" ADD CONSTRAINT "UserLlmConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
