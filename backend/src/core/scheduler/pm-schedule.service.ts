import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';
import type { z } from 'zod';
import type { createPmScheduleSchema, updatePmScheduleSchema } from './pm-schedule.schema.js';
import { triggerPmScheduleCalendarSync } from '../../integration/google/google-calendar.connector.js';

export function advanceNextRun(from: Date, frequency: string): Date {
  const next = new Date(from);
  switch (frequency) {
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export async function listPmSchedules(tenantId: string) {
  return prisma.pmSchedule.findMany({
    where: { tenantId },
    include: { asset: true },
    orderBy: { nextRunAt: 'asc' },
  });
}

export async function createPmSchedule(
  tenantId: string,
  input: z.infer<typeof createPmScheduleSchema>,
) {
  if (input.asset_id) {
    const asset = await prisma.asset.findFirst({
      where: { id: input.asset_id, tenantId },
    });
    if (!asset) {
      throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found');
    }
  }

  const nextRunAt = input.next_run_at ? new Date(input.next_run_at) : new Date();

  const schedule = await prisma.pmSchedule.create({
    data: {
      tenantId,
      title: input.title,
      description: input.description,
      assetId: input.asset_id,
      domainCode: input.domain_code,
      frequency: input.frequency,
      nextRunAt,
      assignTo: input.assign_to,
      checklist: input.checklist,
      active: input.active ?? true,
    },
    include: { asset: true },
  });

  triggerPmScheduleCalendarSync(tenantId, schedule.id);
  return schedule;
}

export async function updatePmSchedule(
  tenantId: string,
  id: string,
  input: z.infer<typeof updatePmScheduleSchema>,
) {
  const existing = await prisma.pmSchedule.findFirst({ where: { id, tenantId } });
  if (!existing) {
    throw new AppError(404, 'PM_SCHEDULE_NOT_FOUND', 'PM schedule not found');
  }

  const schedule = await prisma.pmSchedule.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.asset_id !== undefined ? { assetId: input.asset_id } : {}),
      ...(input.domain_code !== undefined ? { domainCode: input.domain_code } : {}),
      ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
      ...(input.next_run_at !== undefined ? { nextRunAt: new Date(input.next_run_at) } : {}),
      ...(input.assign_to !== undefined ? { assignTo: input.assign_to } : {}),
      ...(input.checklist !== undefined ? { checklist: input.checklist } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
    include: { asset: true },
  });

  triggerPmScheduleCalendarSync(tenantId, schedule.id);
  return schedule;
}

export async function getPmCalendar(
  tenantId: string,
  from?: string,
  to?: string,
) {
  const fromDate = from ? new Date(from) : new Date();
  const toDate = to
    ? new Date(to)
    : new Date(fromDate.getFullYear(), fromDate.getMonth() + 2, 0);

  const schedules = await prisma.pmSchedule.findMany({
    where: {
      tenantId,
      active: true,
      nextRunAt: { gte: fromDate, lte: toDate },
    },
    include: { asset: true },
    orderBy: { nextRunAt: 'asc' },
  });

  const pmTransactions = await prisma.transactionHeader.findMany({
    where: {
      tenantId,
      appCode: 'ENG_PM',
      createdAt: { gte: fromDate, lte: toDate },
    },
    orderBy: { createdAt: 'asc' },
  });

  return {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    schedules: schedules.map((s) => ({
      id: s.id,
      title: s.title,
      frequency: s.frequency,
      nextRunAt: s.nextRunAt,
      assetCode: s.asset?.assetCode ?? null,
      assetName: s.asset?.name ?? null,
      domainCode: s.domainCode,
    })),
    pmTasks: pmTransactions.map((t) => ({
      id: t.id,
      trxNo: t.trxNo,
      status: t.status,
      currentProcess: t.currentProcess,
      scheduledAt: t.createdAt,
      domainCode: t.domainCode,
    })),
  };
}

export async function getPmCompliance(tenantId: string) {
  const schedules = await prisma.pmSchedule.findMany({
    where: { tenantId, active: true },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const pmClosed = await prisma.transactionHeader.count({
    where: {
      tenantId,
      appCode: 'ENG_PM',
      status: 'CLOSED',
      closedAt: { gte: monthStart },
    },
  });

  const pmOpen = await prisma.transactionHeader.count({
    where: { tenantId, appCode: 'ENG_PM', status: 'OPEN' },
  });

  const overdueSchedules = schedules.filter((s) => s.nextRunAt < now).length;
  const dueThisMonth = schedules.filter(
    (s) => s.nextRunAt >= monthStart && s.nextRunAt <= now,
  ).length;

  const complianceRate =
    dueThisMonth + pmClosed > 0
      ? Math.round((pmClosed / (dueThisMonth + pmClosed)) * 100)
      : 100;

  return {
    activeSchedules: schedules.length,
    overdueSchedules,
    pmOpen,
    pmCompletedThisMonth: pmClosed,
    complianceRate,
  };
}
