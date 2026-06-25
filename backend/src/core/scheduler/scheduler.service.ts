import { prisma } from '../../lib/prisma.js';
import { getInitialProcess } from '../routing/routing.service.js';
import { advanceNextRun } from './pm-schedule.service.js';

async function generateTrxNo(tenantId: string): Promise<string> {
  const count = await prisma.transactionHeader.count({ where: { tenantId } });
  return `TW${String(count + 1).padStart(5, '0')}`;
}

export async function processDuePmSchedules(tenantId?: string) {
  const now = new Date();
  const where = {
    active: true,
    nextRunAt: { lte: now },
    ...(tenantId ? { tenantId } : {}),
  };

  const dueSchedules = await prisma.pmSchedule.findMany({
    where,
    include: { asset: true },
  });

  const results: { scheduleId: string; transactionId?: string; skipped?: boolean }[] = [];

  for (const schedule of dueSchedules) {
    const existingToday = await prisma.transactionHeader.findFirst({
      where: {
        tenantId: schedule.tenantId,
        appCode: 'ENG_PM',
        status: 'OPEN',
        details: {
          some: {
            fieldCode: 'pm_schedule_id',
            value: { equals: schedule.id },
          },
        },
      },
    });

    if (existingToday) {
      results.push({ scheduleId: schedule.id, skipped: true });
      continue;
    }

    const initialProcess = await getInitialProcess(schedule.tenantId, 'ENG_PM');
    const trxNo = await generateTrxNo(schedule.tenantId);
    const checklist = Array.isArray(schedule.checklist)
      ? (schedule.checklist as string[])
      : [];

    const checklistState = checklist.map((item, index) => ({
      id: `item-${index + 1}`,
      label: item,
      done: false,
    }));

    const transaction = await prisma.$transaction(async (tx) => {
      const header = await tx.transactionHeader.create({
        data: {
          tenantId: schedule.tenantId,
          trxNo,
          appCode: 'ENG_PM',
          domainCode: schedule.domainCode ?? schedule.asset?.locationCode ?? null,
          currentProcess: initialProcess,
          priority: 'MEDIUM',
          status: 'OPEN',
          assignTo: schedule.assignTo,
          slaStatus: 'ON_TRACK',
        },
      });

      await tx.transactionDetail.createMany({
        data: [
          { transactionId: header.id, fieldCode: 'title', value: schedule.title },
          {
            transactionId: header.id,
            fieldCode: 'description',
            value: schedule.description ?? 'Scheduled preventive maintenance',
          },
          { transactionId: header.id, fieldCode: 'pm_schedule_id', value: schedule.id },
          { transactionId: header.id, fieldCode: 'frequency', value: schedule.frequency },
          {
            transactionId: header.id,
            fieldCode: 'scheduled_at',
            value: schedule.nextRunAt.toISOString(),
          },
          { transactionId: header.id, fieldCode: 'checklist', value: checklistState },
          ...(schedule.asset
            ? [
                {
                  transactionId: header.id,
                  fieldCode: 'affected_asset',
                  value: schedule.asset.assetCode,
                },
              ]
            : []),
        ],
      });

      if (schedule.assetId) {
        await tx.transactionAsset.create({
          data: {
            transactionId: header.id,
            assetId: schedule.assetId,
            usageType: 'AFFECTED',
          },
        });
      }

      await tx.transactionLog.create({
        data: {
          transactionId: header.id,
          process: initialProcess,
          action: 'AUTO_SCHEDULE',
          description: `PM auto-generated from schedule: ${schedule.title}`,
        },
      });

      const nextRun = advanceNextRun(schedule.nextRunAt, schedule.frequency);
      await tx.pmSchedule.update({
        where: { id: schedule.id },
        data: { lastRunAt: now, nextRunAt: nextRun },
      });

      return header;
    });

    results.push({ scheduleId: schedule.id, transactionId: transaction.id });
  }

  return { processed: results.length, results };
}

export function startPmScheduler(intervalMs = 60_000) {
  const tick = () => {
    processDuePmSchedules().catch((err) => {
      console.error('[PM Scheduler] Error:', err);
    });
  };

  tick();
  return setInterval(tick, intervalMs);
}
