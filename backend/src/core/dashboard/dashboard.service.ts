import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';
import { computeSlaStatus, getResolutionHours } from '../sla/sla.service.js';
import { getPmCompliance } from '../scheduler/pm-schedule.service.js';
import { buildAppSpecificMetrics } from './dashboard-metrics.js';

export async function getAppDashboard(tenantId: string, appCode: string) {
  const app = await prisma.appMaster.findUnique({
    where: { tenantId_appCode: { tenantId, appCode } },
  });

  if (!app?.active) {
    throw new AppError(404, 'APP_NOT_FOUND', 'Application not found');
  }

  const transactions = await prisma.transactionHeader.findMany({
    where: { tenantId, appCode },
    orderBy: { createdAt: 'desc' },
    include: {
      details: true,
      assets: { include: { asset: true } },
      logs: { orderBy: { createdAt: 'desc' }, take: 100 },
    },
  });

  const open = transactions.filter((t) => t.status === 'OPEN');
  const closed = transactions.filter((t) => t.status === 'CLOSED');

  let slaBreachOpen = 0;
  let slaAtRisk = 0;
  for (const t of open) {
    const status = computeSlaStatus(t.createdAt, t.closedAt, t.priority, t.status);
    if (status === 'BREACHED') slaBreachOpen++;
    if (status === 'AT_RISK') slaAtRisk++;
  }

  const closedWithSla = closed.map((t) => ({
    ...t,
    slaStatus:
      t.slaStatus ??
      computeSlaStatus(t.createdAt, t.closedAt, t.priority, t.status),
  }));

  const slaBreachedClosed = closedWithSla.filter((t) => t.slaStatus === 'BREACHED').length;

  const resolutionHours = closed
    .filter((t) => t.closedAt)
    .map((t) => getResolutionHours(t.createdAt, t.closedAt!));

  const avgResolutionHours =
    resolutionHours.length > 0
      ? Math.round((resolutionHours.reduce((a, b) => a + b, 0) / resolutionHours.length) * 10) / 10
      : 0;

  const byProcess = Object.entries(
    open.reduce<Record<string, number>>((acc, t) => {
      acc[t.currentProcess] = (acc[t.currentProcess] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([process, count]) => ({ process, count }));

  const byPriority = Object.entries(
    transactions.reduce<Record<string, number>>((acc, t) => {
      const p = t.priority ?? 'MEDIUM';
      acc[p] = (acc[p] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([priority, count]) => ({ priority, count }));

  const assigneeIds = [
    ...new Set(closed.map((t) => t.assignTo).filter((id): id is string => Boolean(id))),
  ];

  const users =
    assigneeIds.length > 0
      ? await prisma.user.findMany({
          where: { tenantId, id: { in: assigneeIds } },
          select: { id: true, fullName: true },
        })
      : [];

  const userMap = Object.fromEntries(users.map((u) => [u.id, u.fullName]));

  const technicianKpi = assigneeIds
    .map((userId) => {
      const assigned = closed.filter((t) => t.assignTo === userId && t.closedAt);
      const hours = assigned.map((t) => getResolutionHours(t.createdAt, t.closedAt!));
      const avgHours =
        hours.length > 0
          ? Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10
          : 0;
      return {
        userId,
        fullName: userMap[userId] ?? userId,
        completed: assigned.length,
        avgResolutionHours: avgHours,
      };
    })
    .sort((a, b) => b.completed - a.completed);

  const recentBreaches = [...open, ...closedWithSla]
    .filter((t) => {
      const s =
        t.status === 'OPEN'
          ? computeSlaStatus(t.createdAt, t.closedAt, t.priority, t.status)
          : t.slaStatus;
      return s === 'BREACHED';
    })
    .slice(0, 10)
    .map((t) => ({
      id: t.id,
      trxNo: t.trxNo,
      priority: t.priority,
      status: t.status,
      currentProcess: t.currentProcess,
      createdAt: t.createdAt,
    }));

  const pmCompliance =
    appCode === 'ENG_WO' || appCode === 'ENG_PM' ? await getPmCompliance(tenantId) : null;

  const appMetrics = await buildAppSpecificMetrics(appCode, transactions, pmCompliance);

  return {
    appCode,
    appName: app.name,
    summary: {
      total: transactions.length,
      open: open.length,
      closed: closed.length,
      rejected: transactions.filter((t) => t.status === 'REJECTED').length,
      slaBreachOpen,
      slaAtRisk,
      slaBreachedClosed,
      avgResolutionHours,
      mttrHours: avgResolutionHours,
    },
    byProcess,
    byPriority,
    technicianKpi,
    recentBreaches,
    appMetrics,
  };
}
