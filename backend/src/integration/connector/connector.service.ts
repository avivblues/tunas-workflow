import { randomBytes } from 'crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';
import type { z } from 'zod';
import {
  DEFAULT_IOT_CONFIG,
  DEFAULT_IOT_MAPPING,
} from '../tunas-iot/iot-config.types.js';
import {
  buildTunasIotDashboardUrl,
  domainCodeToHierarchy,
  listIotDomainLinks,
  normalizeIotConfig,
  normalizeIotMapping,
} from '../tunas-iot/iot-config.service.js';
import type { updateIotSettingsSchema } from '../tunas-iot/iot.schema.js';
import { CONNECTOR_CATALOG, MARKETPLACE_APP_FILTERS } from './connector-catalog.js';
import type { installConnectorSchema, updateConnectorSchema } from './connector.schema.js';

function generateWebhookSecret() {
  return randomBytes(24).toString('hex');
}

export function listMarketplace() {
  return CONNECTOR_CATALOG;
}

export async function listMarketplaceWithStats() {
  const installCounts = await prisma.connector.groupBy({
    by: ['type'],
    _count: { type: true },
  });

  const liveCounts = Object.fromEntries(
    installCounts.map((row) => [row.type, row._count.type]),
  );

  const items = CONNECTOR_CATALOG.map((item) => ({
    ...item,
    liveInstalls: liveCounts[item.type] ?? 0,
    installCount: item.installCountBase + (liveCounts[item.type] ?? 0),
  })).sort((a, b) => b.installCount - a.installCount);

  return {
    items,
    appFilters: MARKETPLACE_APP_FILTERS,
    categories: ['ALL', ...new Set(CONNECTOR_CATALOG.map((c) => c.category))],
    pricingFilters: ['ALL', 'FREE', 'PAID', 'COMING_SOON'],
  };
}

export async function listInstalledConnectors(tenantId: string) {
  return prisma.connector.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });
}

export async function installConnector(
  tenantId: string,
  input: z.infer<typeof installConnectorSchema>,
) {
  const catalog = CONNECTOR_CATALOG.find((c) => c.type === input.type);
  if (!catalog) {
    throw new AppError(400, 'INVALID_CONNECTOR', 'Unknown connector type');
  }
  if (catalog.pricing === 'COMING_SOON') {
    throw new AppError(400, 'CONNECTOR_UNAVAILABLE', 'Connector not available yet');
  }

  const config = { ...input.config };
  if (catalog.webhook && !config.webhook_secret) {
    config.webhook_secret = generateWebhookSecret();
  }
  if (input.type === 'ODOO' && !config.asset_model) {
    config.asset_model = 'maintenance.equipment';
  }
  if (input.type === 'ODOO') {
    config.sync_interval_minutes = config.sync_interval_minutes ?? 60;
    config.auto_sync = config.auto_sync ?? true;
  }
  if (input.type === 'CUSTOM_API') {
    config.sync_interval_minutes = config.sync_interval_minutes ?? 120;
    config.assets_path = config.assets_path ?? '/assets';
  }
  if (input.type === 'GOOGLE_CALENDAR' && !config.calendar_id) {
    config.calendar_id = 'primary';
  }
  if (input.type === 'ANYDESK') {
    config.append_to_assign = config.append_to_assign ?? true;
  }
  if (input.type === 'ISP') {
    config.callback_events = config.callback_events ?? [
      'TICKET_CREATED',
      'TICKET_STATUS_CHANGED',
      'TICKET_CLOSED',
      'TICKET_LOG_ADDED',
    ];
    config.enabled_apps = config.enabled_apps ?? [
      'ISP_TICKET',
      'ENG_PM',
      'GA_SUPPORT',
      'VEHICLE_BOOKING',
    ];
  }
  if (input.type === 'IOT') {
    config.tunasiot_base_url = config.tunasiot_base_url ?? DEFAULT_IOT_CONFIG.tunasiot_base_url;
    config.mqtt_auto_wo_enabled = config.mqtt_auto_wo_enabled ?? DEFAULT_IOT_CONFIG.mqtt_auto_wo_enabled;
    config.min_severity = config.min_severity ?? DEFAULT_IOT_CONFIG.min_severity;
    config.cooldown_minutes = config.cooldown_minutes ?? DEFAULT_IOT_CONFIG.cooldown_minutes;
  }

  return prisma.connector.create({
    data: {
      tenantId,
      name: input.name,
      type: input.type,
      config: config as Prisma.InputJsonValue,
      mapping: (input.mapping ?? defaultMapping(input.type)) as Prisma.InputJsonValue,
      active: true,
    },
  });
}

function defaultMapping(type: string) {
  if (type === 'ODOO') {
    return {
      assetCode: 'serial_no',
      name: 'name',
      categoryField: null,
      defaultCategory: 'FIXED_ASSET',
    };
  }
  if (type === 'SLACK' || type === 'TEAMS') {
    return {
      notify_on: [
        'TRANSACTION_CREATED',
        'TRANSACTION_ASSIGNED',
        'TRANSACTION_CLOSED',
        'SLA_BREACHED',
      ],
    };
  }
  if (type === 'GOOGLE_CALENDAR') {
    return { google_events: {} };
  }
  if (type === 'CUSTOM_API') {
    return {
      assetCode: 'code',
      name: 'name',
      category: 'category',
      defaultCategory: 'FIXED_ASSET',
      recordsPath: 'data',
    };
  }
  if (type === 'IOT') {
    return DEFAULT_IOT_MAPPING;
  }
  return {};
}

export async function updateConnector(
  tenantId: string,
  id: string,
  input: z.infer<typeof updateConnectorSchema>,
) {
  const existing = await prisma.connector.findFirst({ where: { id, tenantId } });
  if (!existing) {
    throw new AppError(404, 'CONNECTOR_NOT_FOUND', 'Connector not found');
  }

  return prisma.connector.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.config !== undefined
        ? { config: input.config as Prisma.InputJsonValue }
        : {}),
      ...(input.mapping !== undefined
        ? { mapping: input.mapping as Prisma.InputJsonValue }
        : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
  });
}

export async function uninstallConnector(tenantId: string, id: string) {
  const existing = await prisma.connector.findFirst({ where: { id, tenantId } });
  if (!existing) {
    throw new AppError(404, 'CONNECTOR_NOT_FOUND', 'Connector not found');
  }

  await prisma.connector.delete({ where: { id } });
  return { id };
}

export async function getConnectorByType(tenantId: string, type: string) {
  return prisma.connector.findFirst({
    where: { tenantId, type, active: true },
  });
}

export async function verifyWebhookSecret(
  tenantCode: string,
  connectorType: string,
  secret: string | undefined,
) {
  const tenant = await prisma.tenant.findUnique({ where: { code: tenantCode } });
  if (!tenant) {
    throw new AppError(404, 'TENANT_NOT_FOUND', 'Tenant not found');
  }

  const connector = await prisma.connector.findFirst({
    where: { tenantId: tenant.id, type: connectorType, active: true },
  });

  if (!connector) {
    throw new AppError(404, 'CONNECTOR_NOT_INSTALLED', 'Connector not installed');
  }

  const config = connector.config as { webhook_secret?: string };
  if (!secret || config.webhook_secret !== secret) {
    throw new AppError(401, 'WEBHOOK_UNAUTHORIZED', 'Invalid webhook secret');
  }

  return { tenant, connector };
}

export async function verifyIspPartnerAuth(
  tenantCode: string,
  secret: string | undefined,
) {
  const tenant = await prisma.tenant.findUnique({ where: { code: tenantCode } });
  if (!tenant) {
    throw new AppError(404, 'TENANT_NOT_FOUND', 'Tenant not found');
  }

  const connector = await prisma.connector.findFirst({
    where: { tenantId: tenant.id, type: 'ISP', active: true },
  });

  if (!connector) {
    throw new AppError(404, 'CONNECTOR_NOT_INSTALLED', 'ISP connector not installed');
  }

  const config = connector.config as { webhook_secret?: string; api_key?: string };
  const expected = config.api_key ?? config.webhook_secret;
  if (!secret || !expected || secret !== expected) {
    throw new AppError(401, 'API_UNAUTHORIZED', 'Invalid API key');
  }

  return { tenant, connector };
}

export async function enqueueEvent(
  tenantId: string,
  source: string,
  eventType: string,
  payload: Record<string, unknown>,
) {
  return prisma.eventQueue.create({
    data: { tenantId, source, eventType, payload: payload as Prisma.InputJsonValue },
  });
}

export async function getIotConnectorSettings(tenantId: string) {
  const connector = await prisma.connector.findFirst({
    where: { tenantId, type: 'IOT' },
  });
  if (!connector) {
    throw new AppError(404, 'CONNECTOR_NOT_FOUND', 'Tunas IoT connector not installed');
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { code: true } });
  const config = normalizeIotConfig(connector.config);
  const mapping = normalizeIotMapping(connector.mapping);
  const domainLinks = tenant?.code
    ? await listIotDomainLinks(tenantId, tenant.code)
    : [];

  return {
    connector_id: connector.id,
    active: connector.active,
    config,
    mapping,
    domain_links: domainLinks,
  };
}

export async function updateIotConnectorSettings(
  tenantId: string,
  connectorId: string,
  input: z.infer<typeof updateIotSettingsSchema>,
) {
  const connector = await prisma.connector.findFirst({
    where: { id: connectorId, tenantId, type: 'IOT' },
  });
  if (!connector) {
    throw new AppError(404, 'CONNECTOR_NOT_FOUND', 'Tunas IoT connector not found');
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { code: true } });
  const currentConfig = normalizeIotConfig(connector.config);
  const currentMapping = normalizeIotMapping(connector.mapping);
  const baseUrl = input.config?.tunasiot_base_url ?? currentConfig.tunasiot_base_url ?? DEFAULT_IOT_CONFIG.tunasiot_base_url!;

  const nextConfig = {
    ...(connector.config as object),
    ...currentConfig,
    ...(input.config ?? {}),
  };

  let nextMapping = {
    ...currentMapping,
    ...(input.mapping ?? {}),
  };

  if (input.mapping?.domain_links && tenant?.code) {
    nextMapping = {
      ...nextMapping,
      domain_links: input.mapping.domain_links.map((link) => {
        const hierarchy =
          link.tunasiot_hierarchy ??
          domainCodeToHierarchy(link.domain_code, tenant.code);
        return {
          ...link,
          tunasiot_hierarchy: hierarchy,
          tunasiot_dashboard_url:
            link.tunasiot_dashboard_url ||
            buildTunasIotDashboardUrl(baseUrl, hierarchy),
        };
      }),
    };
  }

  const updated = await prisma.connector.update({
    where: { id: connectorId },
    data: {
      config: nextConfig as Prisma.InputJsonValue,
      mapping: nextMapping as Prisma.InputJsonValue,
    },
  });

  const config = normalizeIotConfig(updated.config);
  const mapping = normalizeIotMapping(updated.mapping);
  const domainLinks = tenant?.code
    ? await listIotDomainLinks(tenantId, tenant.code)
    : [];

  return {
    connector_id: updated.id,
    active: updated.active,
    config,
    mapping,
    domain_links: domainLinks,
  };
}
