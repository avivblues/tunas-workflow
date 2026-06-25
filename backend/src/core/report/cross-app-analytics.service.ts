import { prisma } from '../../lib/prisma.js';
import { computeSlaStatus, getResolutionHours } from '../sla/sla.service.js';

export async function getCrossAppAnalytics(tenantId: string, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [apps, transactions] = await Promise.all([
    prisma.appMaster.findMany({
      where: { tenantId, active: true },
      select: { appCode: true, name: true },
      orderBy: { appCode: 'asc' },
    }),
    prisma.transactionHeader.findMany({
      where: { tenantId, createdAt: { gte: since } },
      include: {
        details: true,
        assets: { include: { asset: true } },
        logs: { where: { action: 'WORK_LOG' } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const perApp = apps.map((app) => {
    const appTx = transactions.filter((t) => t.appCode === app.appCode);
    const open = appTx.filter((t) => t.status === 'OPEN');
    const closed = appTx.filter((t) => t.status === 'CLOSED');
    let slaBreach = 0;
    let slaAtRisk = 0;
    for (const t of open) {
      const s = computeSlaStatus(t.createdAt, t.closedAt, t.priority, t.status);
      if (s === 'BREACHED') slaBreach++;
      if (s === 'AT_RISK') slaAtRisk++;
    }
    const resolutionHours = closed
      .filter((t) => t.closedAt)
      .map((t) => getResolutionHours(t.createdAt, t.closedAt!));
    const avgResolution =
      resolutionHours.length > 0
        ? Math.round((resolutionHours.reduce((a, b) => a + b, 0) / resolutionHours.length) * 10) / 10
        : 0;

    return {
      appCode: app.appCode,
      appName: app.name,
      total: appTx.length,
      open: open.length,
      closed: closed.length,
      rejected: appTx.filter((t) => t.status === 'REJECTED').length,
      slaBreachOpen: slaBreach,
      slaAtRisk,
      avgResolutionHours: avgResolution,
      workLogCount: appTx.reduce((sum, t) => sum + t.logs.length, 0),
    };
  });

  const assetFailures = new Map<
    string,
    { assetCode: string; name: string; count: number; apps: Set<string> }
  >();

  for (const tx of transactions) {
    for (const link of tx.assets) {
      if (!link.asset) continue;
      const key = link.asset.assetCode;
      const existing = assetFailures.get(key) ?? {
        assetCode: link.asset.assetCode,
        name: link.asset.name,
        count: 0,
        apps: new Set<string>(),
      };
      existing.count++;
      existing.apps.add(tx.appCode);
      assetFailures.set(key, existing);
    }
  }

  const topFailingAssets = [...assetFailures.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((a) => ({
      assetCode: a.assetCode,
      name: a.name,
      incidentCount: a.count,
      apps: [...a.apps],
    }));

  const weeklyTrend: { week: string; count: number }[] = [];
  for (let w = 3; w >= 0; w--) {
    const weekEnd = new Date(Date.now() - w * 7 * 24 * 60 * 60 * 1000);
    const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    const count = transactions.filter(
      (t) => t.createdAt >= weekStart && t.createdAt < weekEnd,
    ).length;
    weeklyTrend.push({
      week: weekStart.toISOString().slice(0, 10),
      count,
    });
  }

  const totals = {
    total: transactions.length,
    open: transactions.filter((t) => t.status === 'OPEN').length,
    closed: transactions.filter((t) => t.status === 'CLOSED').length,
    appsActive: apps.length,
  };

  return {
    periodDays: days,
    since: since.toISOString(),
    totals,
    perApp,
    topFailingAssets,
    weeklyTrend,
    generatedAt: new Date().toISOString(),
  };
}
