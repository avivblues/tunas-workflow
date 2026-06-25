import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { createWorkOrderFromIot, iotWorkOrderSchema } from './iot.connector.js';
import {
  evaluateThresholds,
  getIotConnectorForTenant,
  isWithinCooldown,
  meetsMinSeverity,
  parseTunasMqttTopic,
  resolveDomainCodeFromPayload,
  resolveDomainLink,
} from './iot-config.service.js';
import type { IotSeverity } from './iot-config.types.js';

type MqttClient = {
  on(event: string, listener: (...args: unknown[]) => void): void;
  subscribe(topic: string): void;
  end(): void;
};

let mqttClient: MqttClient | null = null;
let mqttConnected = false;

export function getMqttBridgeStatus() {
  return {
    enabled: env.MQTT_ENABLED,
    connected: mqttConnected,
    brokerUrl: env.MQTT_BROKER_URL ?? null,
    topics: env.MQTT_TOPIC_PATTERNS,
  };
}

function parseMqttPayload(buf: Buffer): Record<string, unknown> | null {
  try {
    return JSON.parse(buf.toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseSeverity(raw: unknown): IotSeverity {
  const value = String(raw ?? 'HIGH').toUpperCase();
  if (value === 'LOW' || value === 'MEDIUM' || value === 'HIGH' || value === 'CRITICAL') {
    return value;
  }
  return 'HIGH';
}

async function handleMqttMessage(topic: string, payload: Buffer) {
  const parsedTopic = parseTunasMqttTopic(topic);
  if (!parsedTopic) return;

  const tenant = await prisma.tenant.findUnique({ where: { code: parsedTopic.tenantCode } });
  if (!tenant) {
    console.warn(`[MQTT] Unknown tenant code: ${parsedTopic.tenantCode}`);
    return;
  }

  const iot = await getIotConnectorForTenant(tenant.id);
  if (!iot) {
    console.warn(`[MQTT] IOT connector not installed for tenant ${parsedTopic.tenantCode}`);
    return;
  }

  const raw = parseMqttPayload(payload);
  if (!raw) {
    console.warn(`[MQTT] Invalid JSON on ${topic}`);
    return;
  }

  const domainCode = resolveDomainCodeFromPayload(raw, parsedTopic.domainCode, parsedTopic.tenantCode);
  const domainLink = resolveDomainLink(iot.mapping, domainCode, parsedTopic.tenantCode);
  if (!domainLink) {
    console.info(`[MQTT] Domain ${domainCode} not linked — skipped`);
    return;
  }

  const assetCode = String(raw.asset_code ?? raw.assetCode ?? raw.device_id ?? raw.deviceId ?? '');
  if (!assetCode) {
    console.warn(`[MQTT] Missing asset_code on ${topic}`);
    return;
  }

  if (parsedTopic.kind === 'telemetry') {
    if (!iot.config.mqtt_auto_wo_enabled) {
      return;
    }

    const match = evaluateThresholds(raw, iot.mapping.thresholds ?? [], {
      assetCode,
      domainCode,
    });
    if (!match) return;

    if (!meetsMinSeverity(match.severity, iot.config.min_severity ?? 'MEDIUM')) {
      return;
    }

    const cooldown = iot.config.cooldown_minutes ?? 30;
    if (await isWithinCooldown(tenant.id, assetCode, cooldown, match.rule.field)) {
      console.info(`[MQTT] Cooldown active for ${assetCode}/${match.rule.field}`);
      return;
    }

    const eventId = String(
      raw.event_id ??
        raw.eventId ??
        `mqtt-${domainCode}-${match.rule.id}-${Date.now()}`,
    );

    try {
      const input = iotWorkOrderSchema.parse({
        event_id: eventId,
        asset_code: assetCode,
        title: match.title,
        description: match.description,
        severity: match.severity,
        domain_code: domainCode,
        operator: 'MQTT_THRESHOLD',
        metadata: {
          ...raw,
          mqtt_topic: topic,
          threshold_rule: match.rule.id,
          threshold_field: match.rule.field,
          threshold_value: match.actual,
          tunasiot_hierarchy: domainLink.tunasiot_hierarchy,
        },
      });
      const result = await createWorkOrderFromIot(tenant.id, input, { source: 'MQTT' });
      if (!result.duplicate) {
        console.info(`[MQTT] WO ${result.trx_no} created for ${assetCode} (${match.rule.field})`);
      }
    } catch (err) {
      console.error(`[MQTT] Failed threshold WO for ${topic}:`, err);
    }
    return;
  }

  const severity = parseSeverity(raw.severity);
  if (!meetsMinSeverity(severity, iot.config.min_severity ?? 'MEDIUM')) {
    return;
  }

  const normalized = {
    event_id: String(raw.event_id ?? raw.eventId ?? `mqtt-alert-${Date.now()}`),
    asset_code: assetCode,
    title: String(raw.title ?? 'IoT Alert'),
    description: String(raw.description ?? raw.message ?? 'Sensor alert'),
    severity,
    domain_code: domainCode,
    operator: raw.operator ? String(raw.operator) : 'MQTT',
    metadata: {
      ...(raw.metadata && typeof raw.metadata === 'object' ? (raw.metadata as Record<string, unknown>) : raw),
      mqtt_topic: topic,
      tunasiot_hierarchy: domainLink.tunasiot_hierarchy,
    },
  };

  try {
    const input = iotWorkOrderSchema.parse(normalized);
    await createWorkOrderFromIot(tenant.id, input, { source: 'MQTT' });
  } catch (err) {
    console.error(`[MQTT] Failed to create WO for ${topic}:`, err);
  }
}

export async function startMqttBridge() {
  if (!env.MQTT_ENABLED || !env.MQTT_BROKER_URL) {
    return null;
  }

  try {
    const mqtt = await import('mqtt');
    const topics = env.MQTT_TOPIC_PATTERNS;

    const client = mqtt.connect(env.MQTT_BROKER_URL, {
      username: env.MQTT_USERNAME || undefined,
      password: env.MQTT_PASSWORD || undefined,
      reconnectPeriod: 5000,
    }) as unknown as MqttClient;

    client.on('connect', () => {
      mqttConnected = true;
      console.info(`[MQTT] Connected — subscribing: ${topics.join(', ')}`);
      for (const topic of topics) {
        client.subscribe(topic);
      }
    });

    client.on('close', () => {
      mqttConnected = false;
    });

    client.on('message', (topic: unknown, payload: unknown) => {
      if (typeof topic === 'string' && Buffer.isBuffer(payload)) {
        void handleMqttMessage(topic, payload);
      }
    });

    client.on('error', (err: unknown) => {
      console.error('[MQTT] Error:', err);
    });

    mqttClient = client;
    return client;
  } catch (err) {
    console.error('[MQTT] Bridge not started (mqtt package or broker unavailable):', err);
    return null;
  }
}

export function stopMqttBridge() {
  mqttClient?.end();
  mqttClient = null;
  mqttConnected = false;
}
