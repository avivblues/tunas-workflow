import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';
import type { Connector } from '@prisma/client';
import { odooJsonRpc } from './odoo.client.js';

interface OdooRecord {
  id: number;
  name?: string;
  serial_no?: string | false;
  default_code?: string | false;
  display_name?: string;
}

export async function testOdooConnection(connector: Connector) {
  const config = connector.config as Record<string, string>;
  const model = config.asset_model ?? 'maintenance.equipment';

  await odooJsonRpc<OdooRecord[]>({
    url: config.url,
    database: config.database,
    username: config.username,
    apiKey: config.api_key,
    model,
    method: 'search_read',
    args: [[]],
    kwargs: { fields: ['name'], limit: 1 },
  });

  return { ok: true, model };
}

export async function syncOdooAssets(tenantId: string, connector: Connector) {
  const config = connector.config as Record<string, string>;
  const mapping = (connector.mapping ?? {}) as Record<string, string | null>;
  const model = config.asset_model ?? 'maintenance.equipment';
  const assetCodeField = mapping.assetCode ?? 'serial_no';
  const nameField = mapping.name ?? 'name';
  const defaultCategory = mapping.defaultCategory ?? 'FIXED_ASSET';

  const fields = ['id', nameField, assetCodeField];
  if (mapping.categoryField) fields.push(mapping.categoryField);

  const records = await odooJsonRpc<OdooRecord[]>({
    url: config.url,
    database: config.database,
    username: config.username,
    apiKey: config.api_key,
    model,
    method: 'search_read',
    args: [[]],
    kwargs: { fields, limit: 500 },
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const record of records) {
    const rawCode = record[assetCodeField as keyof OdooRecord];
    const code =
      (typeof rawCode === 'string' && rawCode) ||
      (typeof record.default_code === 'string' && record.default_code) ||
      `ODOO-${record.id}`;

    const rawName = record[nameField as keyof OdooRecord];
    const name =
      (typeof rawName === 'string' && rawName) ||
      (typeof record.display_name === 'string' && record.display_name) ||
      code;

    if (!code) {
      skipped++;
      continue;
    }

    const existing = await prisma.asset.findUnique({
      where: { tenantId_assetCode: { tenantId, assetCode: code } },
    });

    await prisma.asset.upsert({
      where: { tenantId_assetCode: { tenantId, assetCode: code } },
      update: {
        name,
        status: 'ACTIVE',
        metadata: { odoo_id: record.id, odoo_model: model },
      },
      create: {
        tenantId,
        assetCode: code,
        name,
        category: defaultCategory,
        status: 'ACTIVE',
        metadata: { odoo_id: record.id, odoo_model: model },
      },
    });

    if (existing) updated++;
    else created++;
  }

  return { total: records.length, created, updated, skipped, model };
}

export async function runOdooSync(tenantId: string) {
  const connector = await prisma.connector.findFirst({
    where: { tenantId, type: 'ODOO', active: true },
  });

  if (!connector) {
    throw new AppError(404, 'CONNECTOR_NOT_INSTALLED', 'Odoo connector not installed');
  }

  return syncOdooAssets(tenantId, connector);
}
