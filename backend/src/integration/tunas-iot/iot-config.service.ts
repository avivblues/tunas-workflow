import { prisma } from '../../lib/prisma.js';
import type {
  IotConnectorConfig,
  IotConnectorMapping,
  IotDomainLink,
  IotSeverity,
  IotThresholdRule,
} from './iot-config.types.js';
import {
  DEFAULT_IOT_CONFIG,
  DEFAULT_IOT_MAPPING,
  SEVERITY_RANK,
} from './iot-config.types.js';

export function hierarchyToDomainCode(tenantCode: string, hierarchyPath?: string): string {
  if (!hierarchyPath) return tenantCode;
  const segments = hierarchyPath.split('/').filter(Boolean);
  if (segments.length === 0) return tenantCode;
  return [tenantCode, ...segments].join('.');
}

export function domainCodeToHierarchy(domainCode: string, tenantCode: string): string {
  if (domainCode === tenantCode) return '';
  const prefix = `${tenantCode}.`;
  if (domainCode.startsWith(prefix)) {
    return domainCode.slice(prefix.length).replace(/\./g, '/');
  }
  return domainCode.replace(/\./g, '/');
}

/** Prefer domain/hierarchy from payload; fallback to MQTT topic domain. */
export function resolveDomainCodeFromPayload(
  raw: Record<string, unknown>,
  topicDomainCode: string,
  tenantCode: string,
): string {
  const fromPayload = String(
    raw.hierarchy_code ?? raw.hierarchyCode ?? raw.domain_code ?? raw.domainCode ?? '',
  ).trim();
  if (!fromPayload) return topicDomainCode;

  if (fromPayload.startsWith(`${tenantCode}.`) || fromPayload === tenantCode) {
    return fromPayload;
  }

  if (fromPayload.includes('.')) {
    return fromPayload;
  }

  return hierarchyToDomainCode(tenantCode, fromPayload.replace(/\./g, '/'));
}

export function buildTunasIotDashboardUrl(
  baseUrl: string,
  hierarchy: string,
): string {
  const normalized = baseUrl.replace(/\/$/, '');
  if (!hierarchy) return normalized;
  return `${normalized}/dashboard?hierarchy=${encodeURIComponent(hierarchy.replace(/\//g, '.'))}`;
}

export function parseTunasMqttTopic(topic: string): {
  tenantCode: string;
  hierarchyPath?: string;
  domainCode: string;
  kind: 'telemetry' | 'alert';
} | null {
  const telemetryMatch = topic.match(/^tunas\/([^/]+)(?:\/(.+))?\/telemetry$/);
  if (telemetryMatch) {
    const tenantCode = telemetryMatch[1];
    const hierarchyPath = telemetryMatch[2];
    return {
      tenantCode,
      hierarchyPath,
      domainCode: hierarchyToDomainCode(tenantCode, hierarchyPath),
      kind: 'telemetry',
    };
  }

  const alertMatch = topic.match(/^tunas\/([^/]+)(?:\/(.+))?\/iot\/(?:alert|work-order)$/);
  if (alertMatch) {
    const tenantCode = alertMatch[1];
    const hierarchyPath = alertMatch[2];
    return {
      tenantCode,
      hierarchyPath,
      domainCode: hierarchyToDomainCode(tenantCode, hierarchyPath),
      kind: 'alert',
    };
  }

  return null;
}

export function normalizeIotConfig(raw: unknown): IotConnectorConfig {
  const config = (raw && typeof raw === 'object' ? raw : {}) as IotConnectorConfig;
  return {
    ...DEFAULT_IOT_CONFIG,
    ...config,
  };
}

export function normalizeIotMapping(raw: unknown): IotConnectorMapping {
  const mapping = (raw && typeof raw === 'object' ? raw : {}) as IotConnectorMapping;
  return {
    domain_links: mapping.domain_links ?? DEFAULT_IOT_MAPPING.domain_links ?? [],
    thresholds: mapping.thresholds?.length
      ? mapping.thresholds
      : (DEFAULT_IOT_MAPPING.thresholds ?? []),
  };
}

export async function getIotConnectorForTenant(tenantId: string) {
  const connector = await prisma.connector.findFirst({
    where: { tenantId, type: 'IOT', active: true },
  });
  if (!connector) return null;

  return {
    connector,
    config: normalizeIotConfig(connector.config),
    mapping: normalizeIotMapping(connector.mapping),
  };
}

export function resolveDomainLink(
  mapping: IotConnectorMapping,
  domainCode: string,
  tenantCode: string,
): IotDomainLink | null {
  const links = mapping.domain_links ?? [];
  if (links.length === 0) {
    return {
      domain_code: domainCode,
      tunasiot_hierarchy: domainCodeToHierarchy(domainCode, tenantCode),
      enabled: true,
    };
  }

  const match = links.find((link) => link.domain_code === domainCode && link.enabled);
  return match ?? null;
}

export function meetsMinSeverity(severity: IotSeverity, minSeverity: IotSeverity): boolean {
  return SEVERITY_RANK[severity] >= SEVERITY_RANK[minSeverity];
}

function readNumericField(payload: Record<string, unknown>, field: string): number | null {
  const direct = payload[field];
  if (typeof direct === 'number' && Number.isFinite(direct)) return direct;
  if (typeof direct === 'string' && direct.trim() !== '') {
    const parsed = Number(direct);
    if (Number.isFinite(parsed)) return parsed;
  }

  const sensors = payload.sensors;
  if (sensors && typeof sensors === 'object') {
    const sensorVal = (sensors as Record<string, unknown>)[field];
    if (typeof sensorVal === 'number' && Number.isFinite(sensorVal)) return sensorVal;
    if (typeof sensorVal === 'string' && sensorVal.trim() !== '') {
      const parsed = Number(sensorVal);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  const readings = payload.readings;
  if (readings && typeof readings === 'object') {
    const readingVal = (readings as Record<string, unknown>)[field];
    if (typeof readingVal === 'number' && Number.isFinite(readingVal)) return readingVal;
  }

  return null;
}

function evaluateOperator(actual: number, operator: IotThresholdRule['operator'], expected: number) {
  switch (operator) {
    case 'gt':
      return actual > expected;
    case 'gte':
      return actual >= expected;
    case 'lt':
      return actual < expected;
    case 'lte':
      return actual <= expected;
    case 'eq':
      return actual === expected;
    case 'neq':
      return actual !== expected;
    default:
      return false;
  }
}

export type ThresholdMatch = {
  rule: IotThresholdRule;
  actual: number;
  severity: IotSeverity;
  title: string;
  description: string;
};

export function evaluateThresholds(
  payload: Record<string, unknown>,
  rules: IotThresholdRule[],
  context: { assetCode: string; domainCode: string },
): ThresholdMatch | null {
  let best: ThresholdMatch | null = null;

  for (const rule of rules) {
    if (!rule.enabled) continue;
    const actual = readNumericField(payload, rule.field);
    if (actual === null) continue;
    if (!evaluateOperator(actual, rule.operator, rule.value)) continue;

    const titleTemplate = rule.title_template ?? '{field} threshold exceeded — {asset_code}';
    const title = titleTemplate
      .replace('{asset_code}', context.assetCode)
      .replace('{domain_code}', context.domainCode)
      .replace('{field}', rule.field)
      .replace('{value}', String(actual));

    const description = `${rule.field}=${actual} (${rule.operator} ${rule.value}) at domain ${context.domainCode}`;
    const candidate: ThresholdMatch = {
      rule,
      actual,
      severity: rule.severity,
      title,
      description,
    };

    if (!best || SEVERITY_RANK[candidate.severity] > SEVERITY_RANK[best.severity]) {
      best = candidate;
    }
  }

  return best;
}

export async function isWithinCooldown(
  tenantId: string,
  assetCode: string,
  cooldownMinutes: number,
  field?: string,
): Promise<boolean> {
  if (cooldownMinutes <= 0) return false;

  const since = new Date(Date.now() - cooldownMinutes * 60_000);
  const recent = await prisma.transactionHeader.findFirst({
    where: {
      tenantId,
      appCode: 'ENG_WO',
      createdAt: { gte: since },
      details: {
        some: {
          fieldCode: 'affected_asset',
          value: { equals: assetCode },
        },
      },
    },
    include: {
      details: {
        where: { fieldCode: { in: ['iot_metadata', 'title'] } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!recent) return false;
  if (!field) return true;

  const metaDetail = recent.details.find((d) => d.fieldCode === 'iot_metadata');
  const meta = metaDetail?.value as { threshold_field?: string } | undefined;
  return meta?.threshold_field === field;
}

export async function listIotDomainLinks(tenantId: string, tenantCode: string) {
  const iot = await getIotConnectorForTenant(tenantId);
  const config = iot?.config ?? DEFAULT_IOT_CONFIG;
  const mapping = iot?.mapping ?? DEFAULT_IOT_MAPPING;

  const domains = await prisma.domainNode.findMany({
    where: { tenantId },
    orderBy: { domainCode: 'asc' },
  });

  const links = mapping.domain_links ?? [];
  const hasConfiguredLinks = links.length > 0;

  const linkByDomain = new Map(links.map((link) => [link.domain_code, link]));

  return domains.map((domain) => {
    const existing = linkByDomain.get(domain.domainCode);
    const hierarchy = domainCodeToHierarchy(domain.domainCode, tenantCode);
    const tunasiotHierarchy = existing?.tunasiot_hierarchy ?? hierarchy;
    return {
      domain_id: domain.id,
      domain_code: domain.domainCode,
      domain_name: domain.name,
      domain_type: domain.type,
      enabled: hasConfiguredLinks ? (existing?.enabled ?? false) : true,
      tunasiot_hierarchy: tunasiotHierarchy,
      tunasiot_dashboard_url:
        existing?.tunasiot_dashboard_url ??
        buildTunasIotDashboardUrl(config.tunasiot_base_url ?? DEFAULT_IOT_CONFIG.tunasiot_base_url!, tunasiotHierarchy),
      mqtt_topic: hierarchy
        ? `tunas/${tenantCode}/${hierarchy}/telemetry`
        : `tunas/${tenantCode}/telemetry`,
    };
  });
}
