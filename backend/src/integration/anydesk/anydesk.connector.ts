import type { Connector } from '@prisma/client';
import { getConnectorByType } from '../connector/connector.service.js';

export interface AnyDeskConfig {
  support_anydesk_id: string;
  technician_anydesk_id?: string;
  custom_message?: string;
  append_to_assign?: boolean;
}

export interface RemoteSupportInfo {
  provider: 'ANYDESK';
  supportId: string;
  technicianId?: string;
  connectUrl: string;
  downloadUrl: string;
  message?: string;
}

function parseConfig(connector: Connector): AnyDeskConfig {
  return connector.config as unknown as AnyDeskConfig;
}

export function formatAnyDeskId(id: string) {
  return id.replace(/\s+/g, '');
}

export function buildAnyDeskConnectUrl(anydeskId: string) {
  const clean = formatAnyDeskId(anydeskId);
  return `anydesk:${clean}`;
}

export function buildAnyDeskDownloadUrl() {
  return 'https://anydesk.com/en/downloads';
}

export async function getAnyDeskRemoteSupport(tenantId: string): Promise<RemoteSupportInfo | null> {
  const connector = await getConnectorByType(tenantId, 'ANYDESK');
  if (!connector) return null;

  const config = parseConfig(connector);
  if (!config.support_anydesk_id) return null;

  return {
    provider: 'ANYDESK',
    supportId: config.support_anydesk_id,
    technicianId: config.technician_anydesk_id,
    connectUrl: buildAnyDeskConnectUrl(config.support_anydesk_id),
    downloadUrl: buildAnyDeskDownloadUrl(),
    message:
      config.custom_message ??
      'Remote support available via AnyDesk. Open AnyDesk and enter the Support ID.',
  };
}

export function appendAnyDeskToMessage(tenantId: string, message: string) {
  return getAnyDeskRemoteSupport(tenantId).then((info) => {
    if (!info) return message;
    return `${message}\n\n🖥️ AnyDesk Support ID: ${info.supportId}`;
  });
}

export async function testAnyDeskConnection(connector: Connector) {
  const config = parseConfig(connector);
  if (!config.support_anydesk_id) {
    throw new Error('AnyDesk Support ID not configured');
  }

  return {
    ok: true,
    supportId: config.support_anydesk_id,
    connectUrl: buildAnyDeskConnectUrl(config.support_anydesk_id),
    downloadUrl: buildAnyDeskDownloadUrl(),
  };
}
