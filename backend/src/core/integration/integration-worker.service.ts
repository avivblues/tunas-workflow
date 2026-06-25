import { prisma } from '../../lib/prisma.js';
import { syncOdooAssets } from '../../integration/odoo/odoo.connector.js';
import { syncCustomApiAssets } from '../../integration/custom-api/custom-api.connector.js';
import { processPendingEvents, getEventQueueStats } from './event-queue.service.js';
import { getMqttBridgeStatus } from '../../integration/tunas-iot/mqtt-bridge.service.js';

const DEFAULT_ODOO_INTERVAL_MIN = 60;
const DEFAULT_WORKER_INTERVAL_MS = 120_000;

export async function runScheduledOdooSync(tenantId?: string) {
  const connectors = await prisma.connector.findMany({
    where: {
      type: 'ODOO',
      active: true,
      ...(tenantId ? { tenantId } : {}),
    },
  });

  const results: {
    connectorId: string;
    tenantId: string;
    ok: boolean;
    stats?: Awaited<ReturnType<typeof syncOdooAssets>>;
    error?: string;
  }[] = [];

  for (const connector of connectors) {
    const config = connector.config as {
      sync_interval_minutes?: number;
      last_sync_at?: string;
      auto_sync?: boolean;
    };

    if (config.auto_sync === false) continue;

    const intervalMin = config.sync_interval_minutes ?? DEFAULT_ODOO_INTERVAL_MIN;
    const lastSync = config.last_sync_at ? new Date(config.last_sync_at) : null;
    if (lastSync && Date.now() - lastSync.getTime() < intervalMin * 60_000) {
      continue;
    }

    try {
      const stats = await syncOdooAssets(connector.tenantId, connector);
      await prisma.connector.update({
        where: { id: connector.id },
        data: {
          config: {
            ...(connector.config as object),
            last_sync_at: new Date().toISOString(),
            last_sync_status: 'ok',
            last_sync_stats: stats,
          },
        },
      });
      results.push({ connectorId: connector.id, tenantId: connector.tenantId, ok: true, stats });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      await prisma.connector.update({
        where: { id: connector.id },
        data: {
          config: {
            ...(connector.config as object),
            last_sync_at: new Date().toISOString(),
            last_sync_status: 'error',
            last_sync_error: message,
          },
        },
      });
      results.push({ connectorId: connector.id, tenantId: connector.tenantId, ok: false, error: message });
    }
  }

  return { synced: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
}

export async function runScheduledCustomApiSync(tenantId?: string) {
  const connectors = await prisma.connector.findMany({
    where: {
      type: 'CUSTOM_API',
      active: true,
      ...(tenantId ? { tenantId } : {}),
    },
  });

  const results: { connectorId: string; ok: boolean; stats?: unknown; error?: string }[] = [];

  for (const connector of connectors) {
    const config = connector.config as { sync_interval_minutes?: number; last_sync_at?: string };
    const intervalMin = config.sync_interval_minutes ?? DEFAULT_ODOO_INTERVAL_MIN;
    const lastSync = config.last_sync_at ? new Date(config.last_sync_at) : null;
    if (lastSync && Date.now() - lastSync.getTime() < intervalMin * 60_000) continue;

    try {
      const stats = await syncCustomApiAssets(connector.tenantId, connector);
      await prisma.connector.update({
        where: { id: connector.id },
        data: {
          config: {
            ...(connector.config as object),
            last_sync_at: new Date().toISOString(),
            last_sync_status: 'ok',
            last_sync_stats: stats,
          },
        },
      });
      results.push({ connectorId: connector.id, ok: true, stats });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      results.push({ connectorId: connector.id, ok: false, error: message });
    }
  }

  return { synced: results.filter((r) => r.ok).length, results };
}

export async function runIntegrationWorkerCycle(tenantId?: string) {
  const [events, odoo, customApi] = await Promise.all([
    processPendingEvents(tenantId),
    runScheduledOdooSync(tenantId),
    runScheduledCustomApiSync(tenantId),
  ]);

  return { events, odoo, customApi, ranAt: new Date().toISOString() };
}

export async function getIntegrationStatus(tenantId: string) {
  const [connectors, queueStats] = await Promise.all([
    prisma.connector.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
    getEventQueueStats(tenantId),
  ]);

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { code: true } });

  return {
    tenantCode: tenant?.code ?? null,
    queue: queueStats,
    connectors: connectors.map((c) => {
      const config = c.config as Record<string, unknown>;
      return {
        id: c.id,
        type: c.type,
        name: c.name,
        active: c.active,
        lastSyncAt: config.last_sync_at ?? null,
        lastSyncStatus: config.last_sync_status ?? null,
        webhookSecret: typeof config.webhook_secret === 'string' ? config.webhook_secret : null,
      };
    }),
    webhookUrls: {
      isp: tenant?.code ? `/api/integration/isp/${tenant.code}/webhook` : null,
      iot: tenant?.code ? `/api/integration/iot/${tenant.code}/work-order` : null,
    },
    mqtt: getMqttBridgeStatus(),
  };
}

export function startIntegrationWorker(intervalMs = DEFAULT_WORKER_INTERVAL_MS) {
  const tick = () => {
    runIntegrationWorkerCycle().catch((err) => {
      console.error('[Integration Worker] Error:', err);
    });
  };

  tick();
  return setInterval(tick, intervalMs);
}
