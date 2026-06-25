import { apiRequest } from './api-client';

export interface IntegrationStatus {
  tenantCode: string | null;
  queue: {
    pending: number;
    processedLast24h: number;
  };
  connectors: {
    id: string;
    type: string;
    name: string;
    active: boolean;
    lastSyncAt: string | null;
    lastSyncStatus: string | null;
    webhookSecret: string | null;
  }[];
  webhookUrls: {
    isp: string | null;
    iot: string | null;
  };
  mqtt?: {
    enabled: boolean;
    connected: boolean;
    brokerUrl: string | null;
    topics: string[];
  };
}

export interface WorkerRunResult {
  events: { total: number; processed: number; skipped: number; failed: number };
  odoo: { synced: number; failed: number; results: unknown[] };
  customApi: { synced: number; results: unknown[] };
  ranAt: string;
}

export function getIntegrationStatus() {
  return apiRequest<IntegrationStatus>('/integration/status');
}

export function runIntegrationWorker() {
  return apiRequest<WorkerRunResult>('/integration/worker/run', { method: 'POST' });
}

export function processEventQueue() {
  return apiRequest<{ total: number; processed: number; skipped: number; failed: number }>(
    '/integration/events/process',
    { method: 'POST' },
  );
}
