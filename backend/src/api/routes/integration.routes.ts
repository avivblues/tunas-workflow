import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../../lib/response.js';
import { verifyIspPartnerAuth, verifyWebhookSecret } from '../../integration/connector/connector.service.js';
import { ispWebhookSchema, processIspWebhook } from '../../integration/isp/isp.connector.js';
import {
  ispPartnerListQuerySchema,
  ispPartnerLogSchema,
  ispPartnerReportBundleQuerySchema,
  ispPartnerReportQuerySchema,
  ispPartnerUpdateSchema,
} from '../../integration/isp/isp-partner.schema.js';
import {
  addIspPartnerTicketLog,
  getIspPartnerProcessFlow,
  getIspPartnerReport,
  getIspPartnerReportBundle,
  getIspPartnerTicket,
  listIspPartnerTickets,
  updateIspPartnerTicket,
} from '../../integration/isp/isp-partner.service.js';
import { isIspPartnerAppCode } from '../../integration/isp/isp-partner.types.js';
import {
  createWorkOrderFromIot,
  iotWorkOrderSchema,
} from '../../integration/tunas-iot/iot.connector.js';
import {
  getIntegrationStatus,
  runIntegrationWorkerCycle,
} from '../../core/integration/integration-worker.service.js';
import { processPendingEvents } from '../../core/integration/event-queue.service.js';
import { integrationRouteSchemas } from '../../plugins/swagger.plugin.js';
import { mqttTelemetryNote } from '../openapi/integration.openapi.js';

function getWebhookSecret(request: { headers: Record<string, unknown> }) {
  const raw = request.headers['x-webhook-secret'];
  return typeof raw === 'string' ? raw : undefined;
}

function getPartnerApiKey(request: { headers: Record<string, unknown> }) {
  const apiKey = request.headers['x-api-key'];
  if (typeof apiKey === 'string') return apiKey;
  return getWebhookSecret(request);
}

export async function registerIntegrationRoutes(app: FastifyInstance) {
  app.post('/integration/isp/:tenantCode/webhook', {
    schema: integrationRouteSchemas.ispWebhook,
    handler: async (request, reply) => {
      const { tenantCode } = request.params as { tenantCode: string };
      const { tenant } = await verifyWebhookSecret(tenantCode, 'ISP', getWebhookSecret(request));
      const input = ispWebhookSchema.parse(request.body);
      const result = await processIspWebhook(tenant.id, input);
      return sendSuccess(reply, result, 'ISP ticket created', 201);
    },
  });

  app.get('/integration/isp/:tenantCode/tickets', {
    schema: integrationRouteSchemas.ispListTickets,
    handler: async (request, reply) => {
      const { tenantCode } = request.params as { tenantCode: string };
      const { tenant } = await verifyIspPartnerAuth(tenantCode, getPartnerApiKey(request));
      const query = ispPartnerListQuerySchema.parse(request.query);
      const result = await listIspPartnerTickets(tenant.id, query);
      return sendSuccess(reply, result);
    },
  });

  app.get('/integration/isp/:tenantCode/tickets/:trxNo', {
    schema: integrationRouteSchemas.ispGetTicket,
    handler: async (request, reply) => {
      const { tenantCode, trxNo } = request.params as { tenantCode: string; trxNo: string };
      const { tenant } = await verifyIspPartnerAuth(tenantCode, getPartnerApiKey(request));
      const result = await getIspPartnerTicket(tenant.id, trxNo);
      return sendSuccess(reply, result);
    },
  });

  app.patch('/integration/isp/:tenantCode/tickets/:trxNo', {
    schema: integrationRouteSchemas.ispPatchTicket,
    handler: async (request, reply) => {
      const { tenantCode, trxNo } = request.params as { tenantCode: string; trxNo: string };
      const { tenant } = await verifyIspPartnerAuth(tenantCode, getPartnerApiKey(request));
      const input = ispPartnerUpdateSchema.parse(request.body);
      const result = await updateIspPartnerTicket(tenant.id, trxNo, input);
      return sendSuccess(reply, result, 'Ticket updated');
    },
  });

  app.post('/integration/isp/:tenantCode/tickets/:trxNo/logs', {
    schema: integrationRouteSchemas.ispAddLog,
    handler: async (request, reply) => {
      const { tenantCode, trxNo } = request.params as { tenantCode: string; trxNo: string };
      const { tenant } = await verifyIspPartnerAuth(tenantCode, getPartnerApiKey(request));
      const input = ispPartnerLogSchema.parse(request.body);
      const result = await addIspPartnerTicketLog(tenant.id, trxNo, input);
      return sendSuccess(reply, result, 'Log added', 201);
    },
  });

  app.get('/integration/isp/:tenantCode/report', {
    schema: integrationRouteSchemas.ispReport,
    handler: async (request, reply) => {
      const { tenantCode } = request.params as { tenantCode: string };
      const { tenant } = await verifyIspPartnerAuth(tenantCode, getPartnerApiKey(request));
      const query = ispPartnerReportQuerySchema.parse(request.query);
      const result = await getIspPartnerReport(tenant.id, query);
      return sendSuccess(reply, result);
    },
  });

  app.get('/integration/isp/:tenantCode/reports/bundle', {
    schema: integrationRouteSchemas.ispReportBundle,
    handler: async (request, reply) => {
      const { tenantCode } = request.params as { tenantCode: string };
      const { tenant } = await verifyIspPartnerAuth(tenantCode, getPartnerApiKey(request));
      const query = ispPartnerReportBundleQuerySchema.parse(request.query);
      const result = await getIspPartnerReportBundle(tenant.id, query);
      return sendSuccess(reply, result);
    },
  });

  app.get('/integration/isp/:tenantCode/processes', {
    schema: integrationRouteSchemas.ispProcesses,
    handler: async (request, reply) => {
      const { tenantCode } = request.params as { tenantCode: string };
      await verifyIspPartnerAuth(tenantCode, getPartnerApiKey(request));
      const { app_code } = request.query as { app_code?: string };
      const result = app_code && isIspPartnerAppCode(app_code)
        ? getIspPartnerProcessFlow(app_code)
        : getIspPartnerProcessFlow();
      return sendSuccess(reply, result);
    },
  });

  app.get('/integration/iot/:tenantCode/mqtt', {
    schema: {
      ...integrationRouteSchemas.iotMqttInfo,
      response: { 200: mqttTelemetryNote },
    },
    handler: async (_request, reply) => {
      return sendSuccess(reply, {
        transport: 'MQTT',
        topics: [
          'tunas/{tenant}/telemetry',
          'tunas/{tenant}/{location}/{zone}/telemetry',
          'tunas/{tenant}/iot/alert',
        ],
        auth: 'Broker credentials (not HTTP header)',
        auto_wo:
          'Only when threshold rule severity >= connector min_severity (production default: CRITICAL)',
        manual_wo: 'POST /integration/iot/{tenant}/work-order with X-Webhook-Secret',
        payload_example: {
          device_id: 'TUNAS-POWER',
          hierarchy_code: '01.L01.Z01',
          temperature_1: 32.7,
          voltage_1: 221.8,
        },
      });
    },
  });

  app.post('/integration/iot/:tenantCode/work-order', {
    schema: integrationRouteSchemas.iotWorkOrder,
    handler: async (request, reply) => {
      const { tenantCode } = request.params as { tenantCode: string };
      const { tenant } = await verifyWebhookSecret(tenantCode, 'IOT', getWebhookSecret(request));
      const input = iotWorkOrderSchema.parse(request.body);
      const result = await createWorkOrderFromIot(tenant.id, input);
      const status = result.duplicate ? 200 : 201;
      const message = result.duplicate ? 'Work order already exists' : 'Work order created';
      return sendSuccess(reply, result, message, status);
    },
  });

  await app.register(async (secured) => {
    secured.addHook('preHandler', app.authenticate);

    secured.get('/integration/status', async (request, reply) => {
      const status = await getIntegrationStatus(request.tenantId!);
      return sendSuccess(reply, status);
    });

    secured.post('/integration/worker/run', async (request, reply) => {
      const result = await runIntegrationWorkerCycle(request.tenantId!);
      return sendSuccess(reply, result, 'Integration worker cycle completed');
    });

    secured.post('/integration/events/process', async (request, reply) => {
      const result = await processPendingEvents(request.tenantId!);
      return sendSuccess(reply, result, 'Event queue processed');
    });
  });
}
