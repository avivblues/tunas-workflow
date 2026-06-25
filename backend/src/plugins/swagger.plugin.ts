import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from '../config/env.js';
import {
  apiError,
  apiSuccess,
  integrationSecurity,
  iotWorkOrderBody,
  ispPartnerAppCode,
  ispReportBundleQuery,
  ispReportQuery,
  ispTicketListQuery,
  ispTicketLogBody,
  ispTicketUpdateBody,
  ispWebhookBody,
  mqttTelemetryNote,
  tenantCodeParam,
  trxNoParam,
} from '../api/openapi/integration.openapi.js';

export async function registerSwagger(app: FastifyInstance) {
  await app.register(swagger as never, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Tunas Workflow — Integration API',
        description:
          'External API for **ISP Billing** and **Tunas IoT** partners.\n\n' +
          '- ISP: one webhook URL + one API key for `ISP_TICKET`, `ENG_PM`, `GA_SUPPORT`, `VEHICLE_BOOKING`\n' +
          '- IoT HTTP: operator-confirmed work orders\n' +
          '- IoT MQTT: auto WO from telemetry when threshold severity ≥ connector `min_severity` (production default: **CRITICAL** only)\n\n' +
          'Full guide: `docs/ISP-INTEGRATION-GUIDE.md`',
        version: '1.0.0',
      },
      servers: [
        { url: env.API_PREFIX, description: 'API prefix' },
        { url: 'http://103.94.238.207:3050/api', description: 'Production demo' },
        { url: 'http://localhost:3000/api', description: 'Local dev' },
      ],
      tags: [
        { name: 'ISP Partner', description: 'Webhook inbound + Partner API pull/push' },
        { name: 'Tunas IoT', description: 'HTTP work-order + MQTT telemetry (see MQTT note)' },
      ],
      components: {
        securitySchemes: integrationSecurity,
        schemas: {
          ApiSuccess: apiSuccess,
          ApiError: apiError,
          IspPartnerAppCode: ispPartnerAppCode,
          IspWebhookBody: ispWebhookBody,
          IspTicketListQuery: ispTicketListQuery,
          IspTicketUpdateBody: ispTicketUpdateBody,
          IspTicketLogBody: ispTicketLogBody,
          IspReportQuery: ispReportQuery,
          IspReportBundleQuery: ispReportBundleQuery,
          IotWorkOrderBody: iotWorkOrderBody,
          MqttTelemetryNote: mqttTelemetryNote,
        },
      },
    },
  });

  await app.register(swaggerUi as never, {
    routePrefix: `${env.API_PREFIX}/docs`,
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
  });
}

export const integrationRouteSchemas = {
  ispWebhook: {
    tags: ['ISP Partner'],
    summary: 'Inbound webhook — create transaction',
    description:
      'Single URL for all bundle apps. Set `app_code` in body (default `ISP_TICKET`). ' +
      'Auth: `X-Webhook-Secret` or `X-Api-Key`.',
    security: [{ WebhookSecret: [] }, { ApiKey: [] }],
    params: tenantCodeParam,
    body: ispWebhookBody,
    response: {
      201: apiSuccess,
      401: apiError,
      422: apiError,
    },
  },
  ispListTickets: {
    tags: ['ISP Partner'],
    summary: 'List tickets / work orders',
    security: [{ ApiKey: [] }, { WebhookSecret: [] }],
    params: tenantCodeParam,
    querystring: ispTicketListQuery,
    response: { 200: apiSuccess, 401: apiError },
  },
  ispGetTicket: {
    tags: ['ISP Partner'],
    summary: 'Get ticket detail + logs + transitions',
    security: [{ ApiKey: [] }, { WebhookSecret: [] }],
    params: trxNoParam,
    response: { 200: apiSuccess, 404: apiError },
  },
  ispPatchTicket: {
    tags: ['ISP Partner'],
    summary: 'Update ticket process (ADVANCE / ASSIGN / CLOSE)',
    security: [{ ApiKey: [] }, { WebhookSecret: [] }],
    params: trxNoParam,
    body: ispTicketUpdateBody,
    response: { 200: apiSuccess, 404: apiError },
  },
  ispAddLog: {
    tags: ['ISP Partner'],
    summary: 'Add note / log to ticket',
    security: [{ ApiKey: [] }, { WebhookSecret: [] }],
    params: trxNoParam,
    body: ispTicketLogBody,
    response: { 201: apiSuccess, 404: apiError },
  },
  ispReport: {
    tags: ['ISP Partner'],
    summary: 'Report per app (complaint / sla / asset_usage)',
    description: 'Use `period=month|year` with optional `year` and `month`.',
    security: [{ ApiKey: [] }, { WebhookSecret: [] }],
    params: tenantCodeParam,
    querystring: ispReportQuery,
    response: { 200: apiSuccess },
  },
  ispReportBundle: {
    tags: ['ISP Partner'],
    summary: 'All three reports in one call',
    security: [{ ApiKey: [] }, { WebhookSecret: [] }],
    params: tenantCodeParam,
    querystring: ispReportBundleQuery,
    response: { 200: apiSuccess },
  },
  ispProcesses: {
    tags: ['ISP Partner'],
    summary: 'Process flow per app bundle',
    security: [{ ApiKey: [] }, { WebhookSecret: [] }],
    params: tenantCodeParam,
    querystring: {
      type: 'object',
      properties: { app_code: ispPartnerAppCode },
    },
    response: { 200: apiSuccess },
  },
  iotWorkOrder: {
    tags: ['Tunas IoT'],
    summary: 'Create work order (operator confirmed)',
    description:
      'Manual path when operator confirms alert in Tunas IoT dashboard. ' +
      'MQTT auto-WO only fires for CRITICAL thresholds when `min_severity=CRITICAL`.',
    security: [{ WebhookSecret: [] }],
    params: tenantCodeParam,
    body: iotWorkOrderBody,
    response: { 201: apiSuccess, 200: apiSuccess, 404: apiError },
  },
  iotMqttInfo: {
    tags: ['Tunas IoT'],
    summary: 'MQTT telemetry reference (not HTTP)',
    description: 'Documentation-only. Telemetry is consumed via MQTT broker subscription.',
  },
} as const;
