import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';
import type { Prisma } from '@prisma/client';
import { computeSlaStatus, getResolutionHours } from '../sla/sla.service.js';
import {
  monthKeyForDate,
  monthKeysInRange,
  resolveReportDateRange,
  type ReportDateRange,
} from './report-period.js';
import type { ReportType } from './report.schema.js';

type TxFull = Prisma.TransactionHeaderGetPayload<{
  include: { details: true; logs: true; assets: { include: { asset: true } } };
}>;

function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function detailString(details: { fieldCode: string; value: unknown }[], fieldCode: string) {
  const row = details.find((d) => d.fieldCode === fieldCode);
  return typeof row?.value === 'string' ? row.value : null;
}

function emptyMonthlyBreakdown(range: ReportDateRange) {
  return monthKeysInRange(range).map((month) => ({ month }));
}

export async function getAppReport(
  tenantId: string,
  appCode: string,
  type: ReportType,
  options?: {
    days?: number;
    period?: 'month' | 'year';
    year?: number;
    month?: number;
  },
) {
  const app = await prisma.appMaster.findUnique({
    where: { tenantId_appCode: { tenantId, appCode } },
  });
  if (!app?.active) {
    throw new AppError(404, 'APP_NOT_FOUND', 'Application not found');
  }

  const range = resolveReportDateRange({
    period: options?.period,
    year: options?.year,
    month: options?.month,
    days: options?.days,
  });

  const transactions = await prisma.transactionHeader.findMany({
    where: {
      tenantId,
      appCode,
      createdAt: { gte: range.from, lt: range.to },
    },
    include: {
      details: true,
      logs: true,
      assets: { include: { asset: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const normalizedType = type === 'sparepart' ? 'asset_usage' : type;

  switch (normalizedType) {
    case 'complaint':
      return buildComplaintReport(appCode, transactions, range);
    case 'sla':
      return buildSlaReport(appCode, transactions, range);
    case 'asset_usage':
      return buildAssetUsageReport(appCode, transactions, range);
    case 'aging':
      return buildAgingReport(appCode, transactions, range);
    case 'technician':
      return buildTechnicianReport(appCode, transactions, tenantId, range);
    default:
      throw new AppError(400, 'INVALID_REPORT_TYPE', 'Unknown report type');
  }
}

export async function getAppReportBundle(
  tenantId: string,
  appCode: string,
  options?: {
    period?: 'month' | 'year';
    year?: number;
    month?: number;
  },
) {
  const [complaint, sla, asset_usage] = await Promise.all([
    getAppReport(tenantId, appCode, 'complaint', options),
    getAppReport(tenantId, appCode, 'sla', options),
    getAppReport(tenantId, appCode, 'asset_usage', options),
  ]);
  return { complaint, sla, asset_usage };
}

function buildComplaintReport(appCode: string, transactions: TxFull[], range: ReportDateRange) {
  const byStatus = { OPEN: 0, CLOSED: 0, REJECTED: 0 };
  const byPriority: Record<string, number> = {};
  const byProcess: Record<string, number> = {};

  const monthlyMap = new Map(
    emptyMonthlyBreakdown(range).map((row) => [
      row.month,
      { month: row.month, created: 0, closed: 0, open: 0, rejected: 0 },
    ]),
  );

  for (const t of transactions) {
    if (t.status in byStatus) byStatus[t.status as keyof typeof byStatus] += 1;
    const pri = t.priority ?? 'UNKNOWN';
    byPriority[pri] = (byPriority[pri] ?? 0) + 1;
    byProcess[t.currentProcess] = (byProcess[t.currentProcess] ?? 0) + 1;

    const key = monthKeyForDate(t.createdAt);
    const bucket = monthlyMap.get(key);
    if (bucket) {
      bucket.created += 1;
      if (t.status === 'CLOSED') bucket.closed += 1;
      if (t.status === 'OPEN') bucket.open += 1;
      if (t.status === 'REJECTED') bucket.rejected += 1;
    }
  }

  const items = transactions.slice(0, 100).map((t) => ({
    id: t.id,
    trxNo: t.trxNo,
    title: detailString(t.details, 'title') ?? detailString(t.details, 'complaint'),
    status: t.status,
    priority: t.priority,
    currentProcess: t.currentProcess,
    area: detailString(t.details, 'area'),
    category: detailString(t.details, 'category'),
    customerName: detailString(t.details, 'customer_name'),
    createdAt: t.createdAt,
    closedAt: t.closedAt,
  }));

  return {
    appCode,
    reportType: 'complaint' as const,
    period: range.period,
    periodLabel: range.label,
    year: range.year,
    month: range.month ?? null,
    generatedAt: new Date().toISOString(),
    summary: {
      total: transactions.length,
      open: byStatus.OPEN,
      closed: byStatus.CLOSED,
      rejected: byStatus.REJECTED,
    },
    byPriority: Object.entries(byPriority).map(([priority, count]) => ({ priority, count })),
    byProcess: Object.entries(byProcess).map(([process, count]) => ({ process, count })),
    monthlyBreakdown: [...monthlyMap.values()],
    items,
  };
}

function buildSlaReport(appCode: string, transactions: TxFull[], range: ReportDateRange) {
  let breachOpen = 0;
  let atRisk = 0;
  let met = 0;
  let breachedClosed = 0;
  let onTrack = 0;
  const resolutionHours: number[] = [];

  const monthlyMap = new Map(
    emptyMonthlyBreakdown(range).map((row) => [
      row.month,
      {
        month: row.month,
        total: 0,
        met: 0,
        breached: 0,
        atRisk: 0,
        avgResolutionHours: 0,
      },
    ]),
  );

  const details = transactions.map((t) => {
    const sla = computeSlaStatus(t.createdAt, t.closedAt, t.priority, t.status);
    if (t.status === 'OPEN') {
      if (sla === 'BREACHED') breachOpen += 1;
      else if (sla === 'AT_RISK') atRisk += 1;
      else onTrack += 1;
    } else if (t.status === 'CLOSED') {
      if (sla === 'BREACHED') breachedClosed += 1;
      else met += 1;
      const hours = getResolutionHours(t.createdAt, t.closedAt!);
      resolutionHours.push(hours);
    }

    const key = monthKeyForDate(t.createdAt);
    const bucket = monthlyMap.get(key);
    if (bucket) {
      bucket.total += 1;
      if (sla === 'MET' || sla === 'ON_TRACK') bucket.met += 1;
      if (sla === 'BREACHED') bucket.breached += 1;
      if (sla === 'AT_RISK') bucket.atRisk += 1;
      if (t.closedAt) {
        const h = getResolutionHours(t.createdAt, t.closedAt);
        bucket.avgResolutionHours =
          bucket.avgResolutionHours === 0
            ? h
            : Math.round(((bucket.avgResolutionHours + h) / 2) * 10) / 10;
      }
    }

    return {
      id: t.id,
      trxNo: t.trxNo,
      status: t.status,
      priority: t.priority,
      slaStatus: sla,
      currentProcess: t.currentProcess,
      resolutionHours: t.closedAt ? getResolutionHours(t.createdAt, t.closedAt) : null,
      createdAt: t.createdAt,
      closedAt: t.closedAt,
    };
  });

  const closedCount = met + breachedClosed;
  const compliancePct =
    closedCount > 0 ? Math.round((met / closedCount) * 1000) / 10 : 100;
  const avgResolutionHours =
    resolutionHours.length > 0
      ? Math.round((resolutionHours.reduce((a, b) => a + b, 0) / resolutionHours.length) * 10) / 10
      : 0;

  return {
    appCode,
    reportType: 'sla' as const,
    period: range.period,
    periodLabel: range.label,
    year: range.year,
    month: range.month ?? null,
    generatedAt: new Date().toISOString(),
    summary: {
      total: transactions.length,
      breachOpen,
      atRisk,
      onTrack,
      met,
      breachedClosed,
      compliancePct,
      avgResolutionHours,
    },
    monthlyBreakdown: [...monthlyMap.values()],
    items: details
      .filter((d) => d.slaStatus === 'BREACHED' || d.slaStatus === 'AT_RISK')
      .slice(0, 100),
  };
}

function buildAssetUsageReport(appCode: string, transactions: TxFull[], range: ReportDateRange) {
  const usageMap = new Map<
    string,
    {
      assetCode: string;
      assetName: string;
      usageType: string;
      category: string;
      qty: number;
      trxNos: string[];
    }
  >();

  const monthlyMap = new Map(
    emptyMonthlyBreakdown(range).map((row) => [
      row.month,
      { month: row.month, sparepartQty: 0, toolQty: 0, transactions: 0 },
    ]),
  );

  for (const t of transactions) {
    const monthKey = monthKeyForDate(t.createdAt);
    const monthBucket = monthlyMap.get(monthKey);
    let hadUsage = false;

    for (const link of t.assets) {
      if (link.usageType !== 'SPAREPART' && link.usageType !== 'TOOL') continue;
      hadUsage = true;
      const code = link.asset.assetCode;
      const existing = usageMap.get(code) ?? {
        assetCode: code,
        assetName: link.asset.name,
        usageType: link.usageType,
        category: link.asset.category,
        qty: 0,
        trxNos: [],
      };
      existing.qty += link.qty ?? 1;
      if (!existing.trxNos.includes(t.trxNo)) existing.trxNos.push(t.trxNo);
      usageMap.set(code, existing);

      if (monthBucket) {
        if (link.usageType === 'SPAREPART') monthBucket.sparepartQty += link.qty ?? 1;
        if (link.usageType === 'TOOL') monthBucket.toolQty += link.qty ?? 1;
      }
    }

    for (const log of t.logs) {
      const meta = log.metadata as {
        spareparts?: { asset_code?: string; qty: number }[];
        tools?: { asset_code?: string; qty: number }[];
      } | null;

      for (const sp of meta?.spareparts ?? []) {
        hadUsage = true;
        const code = sp.asset_code ?? 'UNKNOWN';
        const existing = usageMap.get(code) ?? {
          assetCode: code,
          assetName: code,
          usageType: 'SPAREPART',
          category: 'SPAREPART',
          qty: 0,
          trxNos: [],
        };
        existing.qty += sp.qty ?? 1;
        if (!existing.trxNos.includes(t.trxNo)) existing.trxNos.push(t.trxNo);
        usageMap.set(code, existing);
        if (monthBucket) monthBucket.sparepartQty += sp.qty ?? 1;
      }

      for (const tool of meta?.tools ?? []) {
        hadUsage = true;
        const code = tool.asset_code ?? 'UNKNOWN';
        const existing = usageMap.get(code) ?? {
          assetCode: code,
          assetName: code,
          usageType: 'TOOL',
          category: 'TOOL',
          qty: 0,
          trxNos: [],
        };
        existing.qty += tool.qty ?? 1;
        if (!existing.trxNos.includes(t.trxNo)) existing.trxNos.push(t.trxNo);
        usageMap.set(code, existing);
        if (monthBucket) monthBucket.toolQty += tool.qty ?? 1;
      }
    }

    if (hadUsage && monthBucket) monthBucket.transactions += 1;
  }

  const items = [...usageMap.values()]
    .sort((a, b) => b.qty - a.qty)
    .map((row) => ({ ...row, ticketCount: row.trxNos.length }));

  const sparepartQty = items
    .filter((i) => i.usageType === 'SPAREPART')
    .reduce((s, i) => s + i.qty, 0);
  const toolQty = items.filter((i) => i.usageType === 'TOOL').reduce((s, i) => s + i.qty, 0);

  return {
    appCode,
    reportType: 'asset_usage' as const,
    period: range.period,
    periodLabel: range.label,
    year: range.year,
    month: range.month ?? null,
    generatedAt: new Date().toISOString(),
    summary: {
      uniqueAssets: items.length,
      sparepartQty,
      toolQty,
      totalQty: sparepartQty + toolQty,
    },
    monthlyBreakdown: [...monthlyMap.values()],
    items,
  };
}

function buildAgingReport(appCode: string, transactions: TxFull[], range: ReportDateRange) {
  const now = new Date();
  const openItems = transactions
    .filter((t) => t.status === 'OPEN')
    .map((t) => {
      const title = detailString(t.details, 'title');
      return {
        id: t.id,
        trxNo: t.trxNo,
        title,
        priority: t.priority,
        currentProcess: t.currentProcess,
        daysOpen: daysBetween(t.createdAt, now),
        createdAt: t.createdAt,
      };
    })
    .sort((a, b) => b.daysOpen - a.daysOpen);

  const buckets = [
    { label: '0–3 hari', count: openItems.filter((i) => i.daysOpen <= 3).length },
    { label: '4–7 hari', count: openItems.filter((i) => i.daysOpen >= 4 && i.daysOpen <= 7).length },
    { label: '8–14 hari', count: openItems.filter((i) => i.daysOpen >= 8 && i.daysOpen <= 14).length },
    { label: '>14 hari', count: openItems.filter((i) => i.daysOpen > 14).length },
  ];

  return {
    appCode,
    reportType: 'aging' as const,
    period: range.period,
    periodLabel: range.label,
    year: range.year,
    month: range.month ?? null,
    generatedAt: now.toISOString(),
    summary: { totalOpen: openItems.length, oldestDays: openItems[0]?.daysOpen ?? 0 },
    buckets,
    items: openItems.slice(0, 50),
  };
}

async function buildTechnicianReport(
  appCode: string,
  transactions: TxFull[],
  tenantId: string,
  range: ReportDateRange,
) {
  const closed = transactions.filter((t) => t.status === 'CLOSED' && t.assignTo && t.closedAt);
  const userIds = [...new Set(closed.map((t) => t.assignTo!).filter(Boolean))];
  const users = await prisma.user.findMany({
    where: { tenantId, id: { in: userIds } },
    select: { id: true, fullName: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.fullName]));

  const byTech = userIds
    .map((userId) => {
      const items = closed.filter((t) => t.assignTo === userId);
      const hours = items.map((t) => getResolutionHours(t.createdAt, t.closedAt!));
      const avg = hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : 0;
      return {
        userId,
        fullName: userMap[userId] ?? userId,
        completed: items.length,
        avgResolutionHours: Math.round(avg * 10) / 10,
        fastestHours: hours.length ? Math.round(Math.min(...hours) * 10) / 10 : 0,
        slowestHours: hours.length ? Math.round(Math.max(...hours) * 10) / 10 : 0,
      };
    })
    .sort((a, b) => b.completed - a.completed);

  return {
    appCode,
    reportType: 'technician' as const,
    period: range.period,
    periodLabel: range.label,
    year: range.year,
    month: range.month ?? null,
    generatedAt: new Date().toISOString(),
    summary: { technicians: byTech.length, totalCompleted: closed.length },
    items: byTech,
  };
}
