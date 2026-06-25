import type { Connector, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';

interface CustomApiRecord {
  [key: string]: unknown;
}

export async function testCustomApiConnection(connector: Connector) {
  const config = connector.config as { base_url: string; token: string; assets_path?: string };
  const path = config.assets_path ?? '/assets';
  const url = `${config.base_url.replace(/\/$/, '')}${path}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new AppError(502, 'CUSTOM_API_ERROR', `HTTP ${response.status}`);
  }

  const body = await response.json();
  const count = Array.isArray(body) ? body.length : Array.isArray((body as { data?: unknown }).data) ? (body as { data: unknown[] }).data.length : 0;

  return { ok: true, url, sampleCount: count };
}

export async function syncCustomApiAssets(tenantId: string, connector: Connector) {
  const config = connector.config as {
    base_url: string;
    token: string;
    assets_path?: string;
  };
  const mapping = (connector.mapping ?? {}) as {
    assetCode?: string;
    name?: string;
    category?: string;
    defaultCategory?: string;
    recordsPath?: string;
  };

  const path = config.assets_path ?? '/assets';
  const url = `${config.base_url.replace(/\/$/, '')}${path}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new AppError(502, 'CUSTOM_API_ERROR', `HTTP ${response.status} from ${url}`);
  }

  const body = await response.json();
  let records: CustomApiRecord[] = [];

  if (Array.isArray(body)) {
    records = body as CustomApiRecord[];
  } else if (body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)) {
    records = (body as { data: CustomApiRecord[] }).data;
  } else if (mapping.recordsPath) {
    const nested = mapping.recordsPath.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object' && key in (acc as object)) {
        return (acc as Record<string, unknown>)[key];
      }
      return null;
    }, body);
    if (Array.isArray(nested)) records = nested as CustomApiRecord[];
  }

  const codeField = mapping.assetCode ?? 'code';
  const nameField = mapping.name ?? 'name';
  const categoryField = mapping.category ?? 'category';
  const defaultCategory = mapping.defaultCategory ?? 'FIXED_ASSET';

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const record of records) {
    const rawCode = record[codeField];
    const code = typeof rawCode === 'string' || typeof rawCode === 'number' ? String(rawCode) : '';
    if (!code) {
      skipped++;
      continue;
    }

    const rawName = record[nameField];
    const name = typeof rawName === 'string' ? rawName : code;
    const rawCategory = record[categoryField];
    const category =
      typeof rawCategory === 'string' && ['FIXED_ASSET', 'SPAREPART', 'TOOL'].includes(rawCategory)
        ? rawCategory
        : defaultCategory;

    const existing = await prisma.asset.findUnique({
      where: { tenantId_assetCode: { tenantId, assetCode: code } },
    });

    const metadata = { custom_api: record } as Prisma.InputJsonValue;

    await prisma.asset.upsert({
      where: { tenantId_assetCode: { tenantId, assetCode: code } },
      update: { name, category, status: 'ACTIVE', metadata },
      create: {
        tenantId,
        assetCode: code,
        name,
        category,
        status: 'ACTIVE',
        metadata,
      },
    });

    if (existing) updated++;
    else created++;
  }

  return { total: records.length, created, updated, skipped, url };
}

export async function runCustomApiSync(tenantId: string) {
  const connector = await prisma.connector.findFirst({
    where: { tenantId, type: 'CUSTOM_API', active: true },
  });
  if (!connector) {
    throw new AppError(404, 'CONNECTOR_NOT_INSTALLED', 'Custom API connector not installed');
  }
  return syncCustomApiAssets(tenantId, connector);
}
