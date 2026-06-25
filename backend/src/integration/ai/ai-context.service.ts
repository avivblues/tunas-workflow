import { prisma } from '../../lib/prisma.js';
import { computeSlaStatus, getResolutionHours } from '../../core/sla/sla.service.js';
import type { ReportPeriod } from './ai.schema.js';

export interface PeriodRange {
  from: Date;
  to: Date;
  label: string;
}

export function getPeriodRange(period: ReportPeriod): PeriodRange {
  const to = new Date();
  const from = new Date(to);
  if (period === 'daily') {
    from.setHours(0, 0, 0, 0);
    return { from, to, label: 'Harian (hari ini)' };
  }
  if (period === 'weekly') {
    from.setDate(from.getDate() - 7);
    return { from, to, label: 'Mingguan (7 hari terakhir)' };
  }
  from.setDate(from.getDate() - 30);
  return { from, to, label: 'Bulanan (30 hari terakhir)' };
}

export async function buildTenantSnapshot(
  tenantId: string,
  options?: { appCode?: string; from?: Date; to?: Date },
) {
  const from = options?.from;
  const to = options?.to ?? new Date();

  const where = {
    tenantId,
    ...(options?.appCode ? { appCode: options.appCode.toUpperCase() } : {}),
    ...(from ? { createdAt: { gte: from, lte: to } } : {}),
  };

  const [transactions, apps, assets, logs] = await Promise.all([
    prisma.transactionHeader.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        details: true,
        logs: { orderBy: { createdAt: 'desc' }, take: 5 },
        assets: { include: { asset: true } },
      },
    }),
    prisma.appMaster.findMany({ where: { tenantId, active: true }, select: { appCode: true, name: true } }),
    prisma.asset.findMany({
      where: { tenantId },
      take: 50,
      orderBy: { name: 'asc' },
    }),
    prisma.transactionLog.findMany({
      where: {
        transaction: { tenantId, ...(options?.appCode ? { appCode: options.appCode } : {}) },
        ...(from ? { createdAt: { gte: from, lte: to } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        transaction: { select: { trxNo: true, appCode: true, currentProcess: true } },
      },
    }),
  ]);

  const open = transactions.filter((t) => t.status === 'OPEN');
  const closed = transactions.filter((t) => t.status === 'CLOSED');
  let slaBreach = 0;
  for (const t of open) {
    if (computeSlaStatus(t.createdAt, t.closedAt, t.priority, t.status) === 'BREACHED') {
      slaBreach++;
    }
  }

  const byApp = Object.entries(
    transactions.reduce<Record<string, number>>((acc, t) => {
      acc[t.appCode] = (acc[t.appCode] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([appCode, count]) => ({ appCode, count }));

  const workLogs = logs.filter((l) => l.action === 'WORK_LOG' || l.action === 'NOTE');
  const maintenanceAssets = transactions
    .flatMap((t) =>
      t.assets.map((a) => ({
        trxNo: t.trxNo,
        appCode: t.appCode,
        assetCode: a.asset?.assetCode,
        assetName: a.asset?.name,
        usageType: a.usageType,
        status: t.status,
        process: t.currentProcess,
      })),
    )
    .slice(0, 30);

  const avgResolution =
    closed.filter((t) => t.closedAt).length > 0
      ? Math.round(
          (closed
            .filter((t) => t.closedAt)
            .reduce((sum, t) => sum + getResolutionHours(t.createdAt, t.closedAt!), 0) /
            closed.filter((t) => t.closedAt).length) *
            10,
        ) / 10
      : 0;

  return {
    period: from ? { from: from.toISOString(), to: to.toISOString() } : null,
    apps,
    summary: {
      total: transactions.length,
      open: open.length,
      closed: closed.length,
      slaBreachOpen: slaBreach,
      avgResolutionHours: avgResolution,
      workLogCount: workLogs.length,
    },
    byApp,
    recentTransactions: transactions.slice(0, 15).map((t) => ({
      trxNo: t.trxNo,
      appCode: t.appCode,
      status: t.status,
      process: t.currentProcess,
      priority: t.priority,
      domainCode: t.domainCode,
      title: t.details.find((d) => d.fieldCode === 'title')?.value ?? null,
      createdAt: t.createdAt,
      closedAt: t.closedAt,
      logCount: t.logs.length,
    })),
    maintenanceHistory: maintenanceAssets,
    recentWorkLogs: workLogs.slice(0, 10).map((l) => ({
      trxNo: l.transaction.trxNo,
      appCode: l.transaction.appCode,
      action: l.action,
      description: l.description,
      createdAt: l.createdAt,
      metadata: l.metadata,
    })),
    assetCount: assets.length,
    assetsSample: assets.slice(0, 10).map((a) => ({
      code: a.assetCode,
      name: a.name,
      category: a.category,
      location: a.locationCode,
    })),
  };
}

export function snapshotToContextText(snapshot: Awaited<ReturnType<typeof buildTenantSnapshot>>): string {
  return JSON.stringify(snapshot, null, 2);
}
