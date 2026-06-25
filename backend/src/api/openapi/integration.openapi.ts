/** OpenAPI component schemas for external Integration API (ISP + IoT). */

export const integrationSecurity = {
  WebhookSecret: {
    type: 'apiKey' as const,
    name: 'X-Webhook-Secret',
    in: 'header' as const,
    description: 'Webhook secret from Integration Marketplace (connector config)',
  },
  ApiKey: {
    type: 'apiKey' as const,
    name: 'X-Api-Key',
    in: 'header' as const,
    description: 'Partner API key (defaults to webhook secret if not set separately)',
  },
};

export const apiSuccess = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: { type: 'object', additionalProperties: true },
    message: { type: 'string' },
  },
};

export const apiError = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    errorCode: { type: 'string' },
    message: { type: 'string' },
  },
};

export const tenantCodeParam = {
  type: 'object',
  required: ['tenantCode'],
  properties: {
    tenantCode: { type: 'string', description: 'Tenant code' },
  },
};

export const trxNoParam = {
  type: 'object',
  required: ['tenantCode', 'trxNo'],
  properties: {
    tenantCode: { type: 'string' },
    trxNo: { type: 'string' },
  },
};

export const ispPartnerAppCode = {
  type: 'string',
  enum: ['ISP_TICKET', 'ENG_PM', 'GA_SUPPORT', 'VEHICLE_BOOKING'],
};

export const ispWebhookBody = {
  type: 'object',
  required: ['description'],
  properties: {
    app_code: { ...ispPartnerAppCode, default: 'ISP_TICKET' },
    event: {
      type: 'string',
      enum: ['CUSTOMER_COMPLAINT', 'DEVICE_OFFLINE', 'PACKAGE_ISSUE'],
    },
    customer_id: { type: 'string' },
    customer_name: { type: 'string' },
    area: { type: 'string' },
    device_serial: { type: 'string' },
    description: { type: 'string' },
    priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    title: { type: 'string' },
    domain_code: { type: 'string' },
    details: { type: 'object', additionalProperties: true },
  },
};

export const ispTicketListQuery = {
  type: 'object',
  properties: {
    app_code: ispPartnerAppCode,
    status: { type: 'string', enum: ['OPEN', 'CLOSED', 'REJECTED'] },
    process: { type: 'string' },
    area: { type: 'string' },
    customer_id: { type: 'string' },
    since: { type: 'string', format: 'date-time' },
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  },
};

export const ispTicketUpdateBody = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ['ADVANCE', 'ASSIGN', 'CLOSE', 'REJECT'],
      default: 'ADVANCE',
    },
    to_process: { type: 'string' },
    assign_to: { type: 'string', format: 'uuid', nullable: true },
    comment: { type: 'string' },
    operator: { type: 'string' },
  },
};

export const ispTicketLogBody = {
  type: 'object',
  required: ['description'],
  properties: {
    action: { type: 'string', default: 'NOTE' },
    description: { type: 'string' },
    operator: { type: 'string' },
  },
};

export const ispReportQuery = {
  type: 'object',
  properties: {
    app_code: { ...ispPartnerAppCode, default: 'ISP_TICKET' },
    type: {
      type: 'string',
      enum: ['complaint', 'sla', 'asset_usage'],
      default: 'complaint',
    },
    period: { type: 'string', enum: ['month', 'year'], default: 'month' },
    year: { type: 'integer', minimum: 2020, maximum: 2100 },
    month: { type: 'integer', minimum: 1, maximum: 12 },
  },
};

export const ispReportBundleQuery = {
  type: 'object',
  properties: {
    app_code: { ...ispPartnerAppCode, default: 'ISP_TICKET' },
    period: { type: 'string', enum: ['month', 'year'], default: 'month' },
    year: { type: 'integer', minimum: 2020, maximum: 2100 },
    month: { type: 'integer', minimum: 1, maximum: 12 },
  },
};

export const iotWorkOrderBody = {
  type: 'object',
  required: ['event_id', 'asset_code', 'title', 'description'],
  properties: {
    event_id: { type: 'string' },
    asset_code: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    domain_code: { type: 'string' },
    operator: { type: 'string' },
    metadata: {
      type: 'object',
      additionalProperties: true,
      description: 'Raw sensor payload (temperature_1, voltage_1, …)',
    },
  },
};

export const mqttTelemetryNote = {
  type: 'object',
  description:
    'MQTT telemetry is not an HTTP endpoint. Subscribe topic tunas/{tenant}/…/telemetry. ' +
    'Auto WO only when threshold severity >= connector min_severity (default CRITICAL). ' +
    'Use POST /integration/iot/{tenant}/work-order for manual operator confirmation.',
  properties: {
    transport: { type: 'string' },
    topics: { type: 'array', items: { type: 'string' } },
    payload_example: { type: 'object', additionalProperties: true },
  },
};
