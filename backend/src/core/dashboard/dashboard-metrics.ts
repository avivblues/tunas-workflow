import type { Prisma } from '@prisma/client';
import { getResolutionHours } from '../sla/sla.service.js';

type TxWithRelations = Prisma.TransactionHeaderGetPayload<{
  include: { details: true; assets: { include: { asset: true } }; logs: true };
}>;

function detailValue(tx: TxWithRelations, fieldCode: string): string | null {
  const row = tx.details.find((d) => d.fieldCode === fieldCode);
  if (!row?.value) return null;
  const v = row.value;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v).replace(/^"|"$/g, '');
}

function daysOpen(createdAt: Date): number {
  return Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
}

function groupCount(items: string[]): { label: string; count: number }[] {
  const map = items.reduce<Record<string, number>>((acc, label) => {
    if (!label) return acc;
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(map)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export async function buildItSupportMetrics(transactions: TxWithRelations[]) {
  const open = transactions.filter((t) => t.status === 'OPEN');
  const criticalOpen = open.filter(
    (t) => t.priority === 'CRITICAL' || t.priority === 'HIGH',
  ).length;

  const categories = transactions.map((t) => detailValue(t, 'category') ?? 'UNCATEGORIZED');
  const topProblems = groupCount(categories).slice(0, 8);

  const assetFailures = groupCount(
    transactions.flatMap((t) =>
      t.assets
        .filter((a) => a.usageType === 'AFFECTED' && a.asset)
        .map((a) => `${a.asset!.assetCode} — ${a.asset!.name}`),
    ),
  ).slice(0, 8);

  return {
    criticalOpen,
    topProblems,
    assetFailures,
    avgAgeOpenDays:
      open.length > 0
        ? Math.round((open.reduce((s, t) => s + daysOpen(t.createdAt), 0) / open.length) * 10) / 10
        : 0,
  };
}

export async function buildEngineeringMetrics(
  transactions: TxWithRelations[],
  pmCompliance: {
    complianceRate: number;
    overdueSchedules: number;
    pmOpen: number;
    pmCompletedThisMonth: number;
  } | null,
) {
  const open = transactions.filter((t) => t.status === 'OPEN');
  const closed = transactions.filter((t) => t.status === 'CLOSED' && t.closedAt);

  const downtimeHours = Math.round(
    open.reduce((s, t) => s + getResolutionHours(t.createdAt, new Date()), 0) * 10,
  ) / 10;

  const assetLastClosed = new Map<string, Date>();
  for (const t of [...closed].sort(
    (a, b) => a.closedAt!.getTime() - b.closedAt!.getTime(),
  )) {
    for (const link of t.assets.filter((a) => a.usageType === 'AFFECTED')) {
      if (link.asset) assetLastClosed.set(link.asset.assetCode, t.closedAt!);
    }
  }

  let mtbfHours = 0;
  const mtbfSamples: number[] = [];
  for (const t of closed) {
    for (const link of t.assets.filter((a) => a.usageType === 'AFFECTED' && a.asset)) {
      const prev = assetLastClosed.get(link.asset!.assetCode);
      if (prev && t.closedAt && t.closedAt > prev) {
        mtbfSamples.push(getResolutionHours(prev, t.closedAt));
      }
    }
  }
  if (mtbfSamples.length > 0) {
    mtbfHours = Math.round((mtbfSamples.reduce((a, b) => a + b, 0) / mtbfSamples.length) * 10) / 10;
  }

  const sparepartUsage = groupCount(
    transactions.flatMap((t) =>
      t.logs.flatMap((log) => {
        const meta = log.metadata as { spareparts?: { asset_code?: string; qty: number }[] } | null;
        return (meta?.spareparts ?? []).map((s) => `${s.asset_code}×${s.qty}`);
      }),
    ),
  ).slice(0, 10);

  return {
    openBreakdowns: open.length,
    downtimeHours,
    mtbfHours,
    sparepartUsage,
    pmCompliance: pmCompliance ?? {
      complianceRate: 0,
      overdueSchedules: 0,
      pmOpen: 0,
      pmCompletedThisMonth: 0,
    },
  };
}

export async function buildIspMetrics(transactions: TxWithRelations[]) {
  const open = transactions.filter((t) => t.status === 'OPEN');
  const customerDown = open.filter((t) => t.priority === 'HIGH' || t.priority === 'CRITICAL').length;

  const byArea = groupCount(transactions.map((t) => detailValue(t, 'area') ?? 'Unknown')).slice(
    0,
    8,
  );

  const customerCounts = transactions.reduce<Record<string, number>>((acc, t) => {
    const id = detailValue(t, 'customer_id') ?? detailValue(t, 'customer_name');
    if (!id) return acc;
    acc[id] = (acc[id] ?? 0) + 1;
    return acc;
  }, {});

  const repeatedComplaints = Object.entries(customerCounts)
    .filter(([, count]) => count > 1)
    .map(([customer, count]) => ({ customer, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const avgResolution =
    transactions.filter((t) => t.closedAt).length > 0
      ? Math.round(
          (transactions
            .filter((t) => t.closedAt)
            .reduce((s, t) => s + getResolutionHours(t.createdAt, t.closedAt!), 0) /
            transactions.filter((t) => t.closedAt).length) *
            10,
        ) / 10
      : 0;

  return { customerDown, byArea, repeatedComplaints, avgResolutionHours: avgResolution };
}

export function buildGaMetrics(transactions: TxWithRelations[]) {
  const byCategory = groupCount(
    transactions.map((t) => detailValue(t, 'category') ?? 'OTHER'),
  ).slice(0, 8);

  const closed = transactions.filter((t) => t.closedAt);
  const avgResponseHours =
    closed.length > 0
      ? Math.round(
          (closed.reduce((s, t) => s + getResolutionHours(t.createdAt, t.closedAt!), 0) /
            closed.length) *
            10,
        ) / 10
      : 0;

  return { byCategory, avgResponseHours, openRequests: transactions.filter((t) => t.status === 'OPEN').length };
}

export function buildVehicleMetrics(transactions: TxWithRelations[]) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = transactions.filter((t) => t.createdAt >= monthStart);
  const upcoming = transactions.filter(
    (t) => t.status === 'OPEN' && detailValue(t, 'start_datetime'),
  ).length;

  const byDestination = groupCount(
    transactions.map((t) => detailValue(t, 'destination') ?? '—'),
  ).slice(0, 6);

  return {
    bookingsThisMonth: thisMonth.length,
    upcomingBookings: upcoming,
    utilizationRate:
      thisMonth.length > 0
        ? Math.min(100, Math.round((thisMonth.filter((t) => t.status === 'CLOSED').length / thisMonth.length) * 100))
        : 0,
    byDestination,
  };
}

export function buildBuildingMetrics(transactions: TxWithRelations[]) {
  const byIssueType = groupCount(
    transactions.map((t) => detailValue(t, 'issue_type') ?? 'OTHER'),
  ).slice(0, 8);

  const emergencyOpen = transactions.filter(
    (t) => t.status === 'OPEN' && detailValue(t, 'urgency') === 'EMERGENCY',
  ).length;

  return {
    byIssueType,
    emergencyOpen,
    openIssues: transactions.filter((t) => t.status === 'OPEN').length,
  };
}

export async function buildAppSpecificMetrics(
  appCode: string,
  transactions: TxWithRelations[],
  pmCompliance: {
    complianceRate: number;
    overdueSchedules: number;
    pmOpen: number;
    pmCompletedThisMonth: number;
    activeSchedules: number;
  } | null,
) {
  switch (appCode) {
    case 'IT_SUPPORT':
      return { type: 'IT_SUPPORT', metrics: await buildItSupportMetrics(transactions) };
    case 'ENG_WO':
    case 'ENG_PM':
      return {
        type: 'ENGINEERING',
        metrics: await buildEngineeringMetrics(transactions, pmCompliance),
      };
    case 'ISP_TICKET':
      return { type: 'ISP_TICKET', metrics: await buildIspMetrics(transactions) };
    case 'GA_SUPPORT':
      return { type: 'GA_SUPPORT', metrics: buildGaMetrics(transactions) };
    case 'VEHICLE_BOOKING':
      return { type: 'VEHICLE_BOOKING', metrics: buildVehicleMetrics(transactions) };
    case 'BUILDING_MGMT':
      return { type: 'BUILDING_MGMT', metrics: buildBuildingMetrics(transactions) };
    default:
      return null;
  }
}
