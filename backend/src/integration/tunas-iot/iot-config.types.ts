export type IotSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IotThresholdOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';

export type IotDomainLink = {
  domain_code: string;
  tunasiot_hierarchy: string;
  enabled: boolean;
  tunasiot_dashboard_url?: string;
};

export type IotThresholdRule = {
  id: string;
  field: string;
  operator: IotThresholdOperator;
  value: number;
  severity: IotSeverity;
  title_template?: string;
  enabled: boolean;
};

export type IotConnectorConfig = {
  webhook_secret?: string;
  tunasiot_base_url?: string;
  mqtt_auto_wo_enabled?: boolean;
  min_severity?: IotSeverity;
  cooldown_minutes?: number;
};

export type IotConnectorMapping = {
  domain_links?: IotDomainLink[];
  thresholds?: IotThresholdRule[];
};

export const SEVERITY_RANK: Record<IotSeverity, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export const DEFAULT_IOT_MAPPING: IotConnectorMapping = {
  domain_links: [],
  thresholds: [
    {
      id: 'temp-1-high',
      field: 'temperature_1',
      operator: 'gt',
      value: 45,
      severity: 'HIGH',
      title_template: 'High temperature sensor 1 — {asset_code}',
      enabled: true,
    },
    {
      id: 'humidity-1-high',
      field: 'humidity_1',
      operator: 'gt',
      value: 85,
      severity: 'MEDIUM',
      title_template: 'High humidity sensor 1 — {asset_code}',
      enabled: true,
    },
    {
      id: 'voltage-1-low',
      field: 'voltage_1',
      operator: 'lt',
      value: 200,
      severity: 'CRITICAL',
      title_template: 'Low voltage phase 1 — {asset_code}',
      enabled: true,
    },
  ],
};

export const DEFAULT_IOT_CONFIG: IotConnectorConfig = {
  tunasiot_base_url: 'https://app.tunasiot.com',
  mqtt_auto_wo_enabled: true,
  min_severity: 'MEDIUM',
  cooldown_minutes: 30,
};
