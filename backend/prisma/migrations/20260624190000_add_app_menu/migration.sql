-- CreateTable
CREATE TABLE "AppMenu" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appCode" TEXT NOT NULL,
    "menuCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "icon" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "showWeb" BOOLEAN NOT NULL DEFAULT true,
    "showMobile" BOOLEAN NOT NULL DEFAULT false,
    "roleCode" TEXT,

    CONSTRAINT "AppMenu_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppMenu_tenantId_appCode_menuCode_key" ON "AppMenu"("tenantId", "appCode", "menuCode");

-- CreateIndex
CREATE INDEX "AppMenu_tenantId_sequence_idx" ON "AppMenu"("tenantId", "sequence");

-- AddForeignKey
ALTER TABLE "AppMenu" ADD CONSTRAINT "AppMenu_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
