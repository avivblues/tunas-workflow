import type { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

interface ProcessDef {
  processCode: string;
  name: string;
  sequence: number;
  isFinal?: boolean;
}

interface RoutingDef {
  fromProcess: string;
  toProcess: string;
  roleCode?: string;
}

interface AppSeedConfig {
  appCode: string;
  name: string;
  icon: string;
  dashboard: string;
  processes: ProcessDef[];
  routing: RoutingDef[];
}

interface SampleAssetLink {
  assetCode: string;
  usageType: 'AFFECTED' | 'SPAREPART' | 'TOOL';
  qty?: number;
}

export async function seedAppConfig(prisma: PrismaClient, tenantId: string, config: AppSeedConfig) {
  const app = await prisma.appMaster.upsert({
    where: { tenantId_appCode: { tenantId, appCode: config.appCode } },
    update: { name: config.name, icon: config.icon, dashboard: config.dashboard, active: true },
    create: {
      tenantId,
      appCode: config.appCode,
      name: config.name,
      icon: config.icon,
      dashboard: config.dashboard,
      active: true,
    },
  });

  for (const p of config.processes) {
    await prisma.appProcess.upsert({
      where: { appId_processCode: { appId: app.id, processCode: p.processCode } },
      update: { name: p.name, sequence: p.sequence, isFinal: p.isFinal ?? false },
      create: { appId: app.id, ...p, isFinal: p.isFinal ?? false },
    });
  }

  const routingCount = await prisma.appRouting.count({ where: { appId: app.id } });
  if (routingCount === 0) {
    await prisma.appRouting.createMany({
      data: config.routing.map((r) => ({ appId: app.id, ...r })),
    });
  }

  return app;
}

export async function seedSampleTransaction(
  prisma: PrismaClient,
  tenantId: string,
  appCode: string,
  requestById: string,
  trxNo: string,
  details: Record<string, string>,
  options?: {
    currentProcess?: string;
    priority?: string;
    domainCode?: string;
    assetLinks?: SampleAssetLink[];
    extraDetails?: Record<string, unknown>;
  },
) {
  const existing = await prisma.transactionHeader.findFirst({
    where: { tenantId, trxNo },
    include: { assets: true },
  });

  if (existing) {
    if (options?.domainCode && existing.domainCode !== options.domainCode) {
      await prisma.transactionHeader.update({
        where: { id: existing.id },
        data: { domainCode: options.domainCode },
      });
    }
    return existing;
  }

  const initialProcess = options?.currentProcess ?? 'REQUEST';

  const header = await prisma.transactionHeader.create({
    data: {
      tenantId,
      trxNo,
      appCode,
      domainCode: options?.domainCode,
      currentProcess: initialProcess,
      priority: options?.priority ?? 'MEDIUM',
      status: 'OPEN',
      requestBy: requestById,
      slaStatus: 'ON_TRACK',
    },
  });

  await prisma.transactionDetail.createMany({
    data: [
      ...Object.entries(details).map(([fieldCode, value]) => ({
        transactionId: header.id,
        fieldCode,
        value,
      })),
      ...Object.entries(options?.extraDetails ?? {}).map(([fieldCode, value]) => ({
        transactionId: header.id,
        fieldCode,
        value: value as object,
      })),
    ],
  });

  if (options?.assetLinks?.length) {
    for (const link of options.assetLinks) {
      const asset = await prisma.asset.findUnique({
        where: { tenantId_assetCode: { tenantId, assetCode: link.assetCode } },
      });
      if (asset) {
        await prisma.transactionAsset.create({
          data: {
            transactionId: header.id,
            assetId: asset.id,
            usageType: link.usageType,
            qty: link.qty,
          },
        });
      }
    }
  }

  await prisma.transactionLog.create({
    data: {
      transactionId: header.id,
      process: initialProcess,
      userId: requestById,
      action: 'CREATE',
      description: `Sample ${appCode} transaction`,
    },
  });

  return header;
}

export async function seedAppMenus(prisma: PrismaClient, tenantId: string, appCode?: string) {
  const filePath = join(import.meta.dirname, 'menu-defaults.json');
  const { menus } = JSON.parse(readFileSync(filePath, 'utf8')) as {
    menus: {
      appCode: string;
      menuCode: string;
      label: string;
      path: string;
      icon?: string;
      sequence: number;
      showWeb?: boolean;
      showMobile?: boolean;
      roleCode?: string;
    }[];
  };

  const templates = appCode
    ? menus.filter((m) => m.appCode === appCode.toUpperCase())
    : menus;

  for (const template of templates) {
    await prisma.appMenu.upsert({
      where: {
        tenantId_appCode_menuCode: {
          tenantId,
          appCode: template.appCode,
          menuCode: template.menuCode,
        },
      },
      update: {
        label: template.label,
        path: template.path,
        icon: template.icon ?? null,
        sequence: template.sequence,
        showWeb: template.showWeb ?? true,
        showMobile: template.showMobile ?? false,
        roleCode: template.roleCode ?? null,
        visible: true,
      },
      create: {
        tenantId,
        appCode: template.appCode,
        menuCode: template.menuCode,
        label: template.label,
        path: template.path,
        icon: template.icon ?? null,
        sequence: template.sequence,
        showWeb: template.showWeb ?? true,
        showMobile: template.showMobile ?? false,
        roleCode: template.roleCode ?? null,
        visible: true,
      },
    });
  }
}
