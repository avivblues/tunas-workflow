export type ConnectorCategory =
  | 'ERP'
  | 'ISP'
  | 'IOT'
  | 'PRODUCTIVITY'
  | 'IDENTITY'
  | 'AUTOMATION'
  | 'REMOTE_SUPPORT'
  | 'CUSTOM';

export interface ConnectorCatalogItem {
  type: string;
  name: string;
  vendor: string;
  description: string;
  category: ConnectorCategory;
  pricing: 'FREE' | 'PAID' | 'COMING_SOON';
  icon: string;
  supportedApps: string[];
  features: string[];
  configFields: {
    key: string;
    label: string;
    type: 'text' | 'password' | 'url' | 'textarea';
    required?: boolean;
  }[];
  webhook?: boolean;
  sync?: boolean;
  outbound?: boolean;
  rating: number;
  installCountBase: number;
  popular?: boolean;
}

export const CONNECTOR_CATALOG: ConnectorCatalogItem[] = [
  {
    type: 'SLACK',
    name: 'Slack',
    vendor: 'Slack',
    description:
      'Notify your team channel when tickets or work orders are created, assigned, closed, or SLA breached.',
    category: 'PRODUCTIVITY',
    pricing: 'FREE',
    icon: '💬',
    supportedApps: ['IT_SUPPORT', 'ENG_WO', 'ENG_PM', 'ISP_TICKET', 'GA_SUPPORT'],
    features: ['Create alerts', 'Assignment alerts', 'Close alerts', 'SLA breach alerts'],
    outbound: true,
    rating: 4.8,
    installCountBase: 4200,
    popular: true,
    configFields: [
      { key: 'webhook_url', label: 'Incoming Webhook URL', type: 'url', required: true },
      { key: 'channel_label', label: 'Channel Label (display only)', type: 'text' },
    ],
  },
  {
    type: 'TEAMS',
    name: 'Microsoft Teams',
    vendor: 'Microsoft',
    description:
      'Send rich MessageCard notifications to Microsoft Teams channels for all workflow events.',
    category: 'PRODUCTIVITY',
    pricing: 'FREE',
    icon: '🟦',
    supportedApps: ['IT_SUPPORT', 'ENG_WO', 'ENG_PM', 'ISP_TICKET', 'GA_SUPPORT'],
    features: ['MessageCard alerts', 'Assignment alerts', 'Close alerts', 'SLA breach alerts'],
    outbound: true,
    rating: 4.7,
    installCountBase: 3800,
    popular: true,
    configFields: [
      { key: 'webhook_url', label: 'Incoming Webhook URL', type: 'url', required: true },
      { key: 'channel_label', label: 'Channel Label (display only)', type: 'text' },
    ],
  },
  {
    type: 'ODOO',
    name: 'Odoo ERP',
    vendor: 'Odoo',
    description:
      'Sync fixed assets and spareparts from Odoo into Tunas Workflow master asset registry.',
    category: 'ERP',
    pricing: 'FREE',
    icon: '📦',
    supportedApps: ['ENG_WO', 'ENG_PM', 'IT_SUPPORT'],
    features: ['Asset sync', 'Sparepart sync', 'Scheduled pull'],
    sync: true,
    rating: 4.6,
    installCountBase: 2100,
    popular: true,
    configFields: [
      { key: 'url', label: 'Odoo URL', type: 'url', required: true },
      { key: 'database', label: 'Database', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'api_key', label: 'API Key / Password', type: 'password', required: true },
      { key: 'asset_model', label: 'Asset Model', type: 'text' },
    ],
  },
  {
    type: 'ISP',
    name: 'ISP Billing',
    vendor: 'Custom / PC24',
    description:
      'ISP Partner API — ticketing, PM, GA support, vehicle booking; push/pull sync and outbound callbacks.',
    category: 'ISP',
    pricing: 'FREE',
    icon: '📡',
    supportedApps: ['ISP_TICKET', 'ENG_PM', 'GA_SUPPORT', 'VEHICLE_BOOKING'],
    features: [
      'Partner API pull/push',
      'Process flow sync',
      'Outbound callbacks',
      'Reporting export',
    ],
    webhook: true,
    rating: 4.9,
    installCountBase: 1500,
    popular: true,
    configFields: [
      { key: 'callback_url', label: 'ISP Callback URL (push status)', type: 'text' },
      { key: 'callback_secret', label: 'Callback Secret (optional)', type: 'password' },
      { key: 'api_key', label: 'Partner API Key (optional, defaults to webhook secret)', type: 'password' },
    ],
  },
  {
    type: 'IOT',
    name: 'Tunas IoT',
    vendor: 'Tunas',
    description:
      'Auto-create engineering work orders from Tunas IoT alerts (HTTP webhook + MQTT telemetry thresholds).',
    category: 'IOT',
    pricing: 'FREE',
    icon: '🛰️',
    supportedApps: ['ENG_WO'],
    features: ['MQTT threshold → WO', 'Domain link', 'Confirmed alert → WO', 'Asset link'],
    webhook: true,
    rating: 4.9,
    installCountBase: 980,
    popular: true,
    configFields: [
      {
        key: 'tunasiot_base_url',
        label: 'Tunas IoT Dashboard URL',
        type: 'text',
        required: false,
      },
    ],
  },
  {
    type: 'GOOGLE_CALENDAR',
    name: 'Google Calendar',
    vendor: 'Google',
    description:
      'Sync PM schedules to Google Calendar. Events update automatically when schedules change.',
    category: 'PRODUCTIVITY',
    pricing: 'FREE',
    icon: '📅',
    supportedApps: ['ENG_PM', 'VEHICLE_BOOKING'],
    features: ['PM schedule sync', 'Auto update on change', 'Service account'],
    sync: true,
    rating: 4.6,
    installCountBase: 3200,
    popular: true,
    configFields: [
      { key: 'calendar_id', label: 'Calendar ID (email or primary)', type: 'text', required: true },
      {
        key: 'service_account_json',
        label: 'Service Account JSON (paste full file)',
        type: 'textarea',
        required: true,
      },
    ],
  },
  {
    type: 'ANYDESK',
    name: 'AnyDesk',
    vendor: 'AnyDesk',
    description:
      'Show AnyDesk remote support ID on tickets and include it in assignment notifications.',
    category: 'REMOTE_SUPPORT',
    pricing: 'FREE',
    icon: '🖥️',
    supportedApps: ['IT_SUPPORT', 'ISP_TICKET', 'ENG_WO', 'GA_SUPPORT'],
    features: ['Support ID on ticket', 'Assign notification', 'Download link'],
    outbound: true,
    rating: 4.5,
    installCountBase: 1100,
    popular: true,
    configFields: [
      { key: 'support_anydesk_id', label: 'Support Team AnyDesk ID', type: 'text', required: true },
      { key: 'technician_anydesk_id', label: 'Default Technician AnyDesk ID', type: 'text' },
      { key: 'custom_message', label: 'Custom message for technicians', type: 'text' },
    ],
  },
  {
    type: 'GOOGLE',
    name: 'Google Workspace',
    vendor: 'Google',
    description: 'Gmail notifications and Google Directory user sync for enterprise tenants.',
    category: 'PRODUCTIVITY',
    pricing: 'COMING_SOON',
    icon: '📧',
    supportedApps: ['IT_SUPPORT', 'GA_SUPPORT'],
    features: ['Gmail alerts', 'Directory sync', 'SSO ready'],
    rating: 4.4,
    installCountBase: 2800,
    configFields: [],
  },
  {
    type: 'AZURE_AD',
    name: 'Azure Active Directory',
    vendor: 'Microsoft',
    description: 'Provision and sync users from Azure AD into Tunas Workflow tenant directory.',
    category: 'IDENTITY',
    pricing: 'COMING_SOON',
    icon: '🔐',
    supportedApps: ['ALL'],
    features: ['User provisioning', 'Group mapping', 'SSO'],
    rating: 4.6,
    installCountBase: 1900,
    configFields: [],
  },
  {
    type: 'WHATSAPP',
    name: 'WhatsApp Business',
    vendor: 'Meta / Twilio',
    description: 'Send SLA and assignment alerts to technicians via WhatsApp.',
    category: 'PRODUCTIVITY',
    pricing: 'COMING_SOON',
    icon: '📱',
    supportedApps: ['IT_SUPPORT', 'ISP_TICKET', 'ENG_WO'],
    features: ['Assignment alerts', 'SLA warnings', 'Customer updates'],
    outbound: true,
    rating: 4.3,
    installCountBase: 870,
    configFields: [],
  },
  {
    type: 'ZAPIER',
    name: 'Zapier',
    vendor: 'Zapier',
    description: 'Connect Tunas Workflow to 5,000+ apps with no-code automation workflows.',
    category: 'AUTOMATION',
    pricing: 'COMING_SOON',
    icon: '⚡',
    supportedApps: ['ALL'],
    features: ['Triggers', 'Actions', 'Multi-step Zaps'],
    rating: 4.7,
    installCountBase: 2400,
    configFields: [],
  },
  {
    type: 'CUSTOM_API',
    name: 'Custom API',
    vendor: 'Generic',
    description:
      'Connect any external asset system via REST API with configurable field mapping and scheduled pull sync.',
    category: 'CUSTOM',
    pricing: 'FREE',
    icon: '🔌',
    supportedApps: ['ALL'],
    features: ['Field mapping', 'Bearer auth', 'Scheduled pull'],
    sync: true,
    rating: 4.2,
    installCountBase: 650,
    configFields: [
      { key: 'base_url', label: 'Base URL', type: 'url', required: true },
      { key: 'token', label: 'Bearer Token', type: 'password', required: true },
      { key: 'assets_path', label: 'Assets Path', type: 'text' },
      { key: 'sync_interval_minutes', label: 'Sync Interval (minutes)', type: 'text' },
    ],
  },
  {
    type: 'REDI_OS',
    name: 'REDI-OS Platform',
    vendor: 'REDI',
    description:
      'Future-compatible connector for REDI-OS — tenant, domain, and transaction mapping (compatibility stub).',
    category: 'CUSTOM',
    pricing: 'FREE',
    icon: '🔗',
    supportedApps: ['ALL'],
    features: ['Tenant mapping', 'Health check', 'Transaction bridge (stub)'],
    rating: 4.0,
    installCountBase: 120,
    configFields: [
      { key: 'base_url', label: 'REDI-OS API URL', type: 'url', required: true },
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'tenant_code', label: 'REDI Tenant Code', type: 'text' },
    ],
  },
];

export const MARKETPLACE_APP_FILTERS = [
  { code: 'ALL', label: 'All Products' },
  { code: 'IT_SUPPORT', label: 'IT Support' },
  { code: 'ENG_WO', label: 'Engineering WO' },
  { code: 'ENG_PM', label: 'Preventive Maintenance' },
  { code: 'ISP_TICKET', label: 'ISP Ticketing' },
  { code: 'GA_SUPPORT', label: 'GA Support' },
  { code: 'VEHICLE_BOOKING', label: 'Vehicle Booking' },
  { code: 'BUILDING_MGMT', label: 'Building Management' },
];

export function getCatalogItem(type: string) {
  return CONNECTOR_CATALOG.find((c) => c.type === type);
}
