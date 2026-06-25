-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainNode" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parentId" TEXT,
    "domainCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "permissions" JSONB,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "roleId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppMaster" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "dashboard" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AppMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppProcess" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "processCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AppProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppRouting" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "fromProcess" TEXT NOT NULL,
    "toProcess" TEXT NOT NULL,
    "condition" JSONB,
    "roleCode" TEXT,
    "assignRule" JSONB,

    CONSTRAINT "AppRouting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionHeader" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "trxNo" TEXT NOT NULL,
    "appCode" TEXT NOT NULL,
    "currentProcess" TEXT NOT NULL,
    "priority" TEXT,
    "status" TEXT NOT NULL,
    "requestBy" TEXT,
    "assignTo" TEXT,
    "slaStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "TransactionHeader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionDetail" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "fieldCode" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "TransactionDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionLog" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "process" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "serialNo" TEXT,
    "locationCode" TEXT,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionAsset" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "usageType" TEXT NOT NULL,
    "qty" DOUBLE PRECISION,

    CONSTRAINT "TransactionAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connector" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "mapping" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Connector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventQueue" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_code_key" ON "Tenant"("code");

-- CreateIndex
CREATE INDEX "DomainNode_tenantId_idx" ON "DomainNode"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "DomainNode_tenantId_domainCode_key" ON "DomainNode"("tenantId", "domainCode");

-- CreateIndex
CREATE INDEX "Role_tenantId_idx" ON "Role"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_tenantId_code_key" ON "Role"("tenantId", "code");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_username_key" ON "User"("tenantId", "username");

-- CreateIndex
CREATE INDEX "AppMaster_tenantId_idx" ON "AppMaster"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "AppMaster_tenantId_appCode_key" ON "AppMaster"("tenantId", "appCode");

-- CreateIndex
CREATE INDEX "AppProcess_appId_idx" ON "AppProcess"("appId");

-- CreateIndex
CREATE UNIQUE INDEX "AppProcess_appId_processCode_key" ON "AppProcess"("appId", "processCode");

-- CreateIndex
CREATE INDEX "AppRouting_appId_idx" ON "AppRouting"("appId");

-- CreateIndex
CREATE INDEX "TransactionHeader_tenantId_appCode_idx" ON "TransactionHeader"("tenantId", "appCode");

-- CreateIndex
CREATE INDEX "TransactionDetail_transactionId_idx" ON "TransactionDetail"("transactionId");

-- CreateIndex
CREATE INDEX "TransactionLog_transactionId_idx" ON "TransactionLog"("transactionId");

-- CreateIndex
CREATE INDEX "Asset_tenantId_idx" ON "Asset"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_tenantId_assetCode_key" ON "Asset"("tenantId", "assetCode");

-- CreateIndex
CREATE INDEX "TransactionAsset_transactionId_idx" ON "TransactionAsset"("transactionId");

-- CreateIndex
CREATE INDEX "Connector_tenantId_idx" ON "Connector"("tenantId");

-- CreateIndex
CREATE INDEX "EventQueue_tenantId_processed_idx" ON "EventQueue"("tenantId", "processed");

-- AddForeignKey
ALTER TABLE "DomainNode" ADD CONSTRAINT "DomainNode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainNode" ADD CONSTRAINT "DomainNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DomainNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppMaster" ADD CONSTRAINT "AppMaster_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppProcess" ADD CONSTRAINT "AppProcess_appId_fkey" FOREIGN KEY ("appId") REFERENCES "AppMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppRouting" ADD CONSTRAINT "AppRouting_appId_fkey" FOREIGN KEY ("appId") REFERENCES "AppMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionHeader" ADD CONSTRAINT "TransactionHeader_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionDetail" ADD CONSTRAINT "TransactionDetail_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "TransactionHeader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLog" ADD CONSTRAINT "TransactionLog_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "TransactionHeader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionAsset" ADD CONSTRAINT "TransactionAsset_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "TransactionHeader"("id") ON DELETE CASCADE ON UPDATE CASCADE;
