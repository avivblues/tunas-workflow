import { prisma } from '../../lib/prisma.js';
import { findExistingIotTransaction, iotWorkOrderSchema } from '../../integration/tunas-iot/iot.connector.js';

export async function processPendingEvents(tenantId?: string) {
  const events = await prisma.eventQueue.findMany({
    where: {
      processed: false,
      ...(tenantId ? { tenantId } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const event of events) {
    try {
      if (event.source === 'IOT' && event.eventType === 'CREATE_WORK_ORDER') {
        const payload = event.payload as Record<string, unknown>;
        const eventId = typeof payload.event_id === 'string' ? payload.event_id : null;
        if (eventId) {
          const existing = await findExistingIotTransaction(event.tenantId, eventId);
          if (existing) {
            await prisma.eventQueue.update({
              where: { id: event.id },
              data: { processed: true },
            });
            processed++;
            continue;
          }
        }
        skipped++;
        continue;
      }

      if (event.source === 'ISP') {
        await prisma.eventQueue.update({
          where: { id: event.id },
          data: { processed: true },
        });
        processed++;
        continue;
      }

      if (event.source === 'MQTT' && event.eventType === 'CREATE_WORK_ORDER') {
        const input = iotWorkOrderSchema.parse(event.payload);
        const { createWorkOrderFromIot } = await import('../../integration/tunas-iot/iot.connector.js');
        await createWorkOrderFromIot(event.tenantId, input);
        await prisma.eventQueue.update({
          where: { id: event.id },
          data: { processed: true },
        });
        processed++;
        continue;
      }

      skipped++;
    } catch (err) {
      failed++;
      console.error(`[event-queue] Failed event ${event.id}:`, err);
    }
  }

  return { total: events.length, processed, skipped, failed };
}

export async function getEventQueueStats(tenantId?: string) {
  const where = tenantId ? { tenantId } : {};
  const [pending, processedToday] = await Promise.all([
    prisma.eventQueue.count({ where: { ...where, processed: false } }),
    prisma.eventQueue.count({
      where: {
        ...where,
        processed: true,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);
  return { pending, processedLast24h: processedToday };
}
