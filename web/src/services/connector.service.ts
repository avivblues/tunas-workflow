import { apiRequest } from './api-client';

export interface ConnectorCatalogItem {
  type: string;
  name: string;
  vendor: string;
  description: string;
  category: string;
  pricing: string;
  icon: string;
  supportedApps: string[];
  features: string[];
  configFields: { key: string; label: string; type: string; required?: boolean }[];
  webhook?: boolean;
  sync?: boolean;
  outbound?: boolean;
  rating: number;
  installCount: number;
  installCountBase?: number;
  liveInstalls?: number;
  popular?: boolean;
}

export interface MarketplaceResponse {
  items: ConnectorCatalogItem[];
  appFilters: { code: string; label: string }[];
  categories: string[];
  pricingFilters: string[];
}

export interface InstalledConnector {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  mapping?: Record<string, unknown> | null;
  active: boolean;
}

export function listMarketplace() {
  return apiRequest<MarketplaceResponse>('/connector/marketplace');
}

export function listInstalledConnectors() {
  return apiRequest<InstalledConnector[]>('/connector');
}

export function installConnector(input: {
  type: string;
  name: string;
  config?: Record<string, unknown>;
}) {
  return apiRequest<InstalledConnector>('/connector', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateConnector(
  id: string,
  input: Partial<{ name: string; config: Record<string, unknown>; active: boolean }>,
) {
  return apiRequest<InstalledConnector>(`/connector/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function uninstallConnector(id: string) {
  return apiRequest<{ id: string }>(`/connector/${id}`, { method: 'DELETE' });
}

export function testConnector(id: string) {
  return apiRequest<{ ok: boolean; model?: string; channel?: string | null }>(
    `/connector/${id}/test`,
    { method: 'POST' },
  );
}

export function syncOdooAssets(id: string) {
  return apiRequest<{
    total: number;
    created: number;
    updated: number;
    skipped: number;
    model: string;
  }>(`/connector/${id}/sync-assets`, { method: 'POST' });
}

export function syncGoogleCalendar(id: string) {
  return apiRequest<{
    total: number;
    created: number;
    updated: number;
    deleted: number;
    failed: number;
  }>(`/connector/${id}/sync-calendar`, { method: 'POST' });
}

export function syncCustomApiAssets(id: string) {
  return apiRequest<{
    total: number;
    created: number;
    updated: number;
    skipped: number;
  }>(`/connector/${id}/sync-custom`, { method: 'POST' });
}

function formatInstallCount(count: number) {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

export function getInstallLabel(count: number) {
  return `${formatInstallCount(count)} installs`;
}

export function getRatingStars(rating: number) {
  return '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '');
}

export function formatSupportedApps(apps: string[]) {
  if (apps.includes('ALL')) return 'All apps';
  if (apps.length <= 2) return apps.join(', ');
  return `${apps[0]} +${apps.length - 1}`;
}
