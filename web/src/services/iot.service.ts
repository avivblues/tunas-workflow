import { apiRequest } from './api-client';

export type IotSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IotThresholdRule = {
  id: string;
  field: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  value: number;
  severity: IotSeverity;
  title_template?: string;
  enabled: boolean;
};

export type IotDomainLinkRow = {
  domain_id: string;
  domain_code: string;
  domain_name: string;
  domain_type: string;
  enabled: boolean;
  tunasiot_hierarchy: string;
  tunasiot_dashboard_url: string;
  mqtt_topic: string;
};

export type IotConnectorSettings = {
  connector_id: string;
  active: boolean;
  config: {
    tunasiot_base_url?: string;
    mqtt_auto_wo_enabled?: boolean;
    min_severity?: IotSeverity;
    cooldown_minutes?: number;
    webhook_secret?: string;
  };
  mapping: {
    domain_links?: { domain_code: string; tunasiot_hierarchy?: string; enabled: boolean }[];
    thresholds?: IotThresholdRule[];
  };
  domain_links: IotDomainLinkRow[];
};

export function getIotSettings(connectorId: string) {
  return apiRequest<IotConnectorSettings>(`/connector/${connectorId}/iot-settings`);
}

export function updateIotSettings(
  connectorId: string,
  input: {
    config?: Partial<IotConnectorSettings['config']>;
    mapping?: Partial<IotConnectorSettings['mapping']>;
  },
) {
  return apiRequest<IotConnectorSettings>(`/connector/${connectorId}/iot-settings`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
