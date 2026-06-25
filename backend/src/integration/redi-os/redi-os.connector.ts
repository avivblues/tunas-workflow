import type { Connector } from '@prisma/client';
import { AppError } from '../../lib/response.js';

interface RediOsConfig {
  base_url: string;
  api_key: string;
  tenant_code?: string;
}

function parseConfig(connector: Connector): RediOsConfig {
  return connector.config as unknown as RediOsConfig;
}

export async function testRediOsConnection(connector: Connector) {
  const config = parseConfig(connector);
  if (!config.base_url || !config.api_key) {
    throw new AppError(400, 'REDI_OS_CONFIG', 'base_url and api_key are required');
  }

  const url = `${config.base_url.replace(/\/$/, '')}/health`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.api_key}`,
      Accept: 'application/json',
    },
  }).catch(() => null);

  if (!response) {
    return {
      ok: false,
      reachable: false,
      message: 'REDI-OS endpoint not reachable — connector registered for future sync',
    };
  }

  return {
    ok: response.ok,
    reachable: true,
    status: response.status,
    message: response.ok
      ? 'REDI-OS platform reachable'
      : `REDI-OS responded with HTTP ${response.status}`,
  };
}

export async function syncRediOsTenantMapping(tenantId: string, connector: Connector) {
  const config = parseConfig(connector);
  return {
    tenantId,
    rediTenantCode: config.tenant_code ?? null,
    synced: false,
    message:
      'REDI-OS bidirectional sync is a compatibility stub — map tenant/domain/transaction when REDI-OS API is available',
  };
}
