import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../../lib/response.js';
import { AppError } from '../../lib/response.js';
import {
  installConnector,
  listInstalledConnectors,
  listMarketplaceWithStats,
  getIotConnectorSettings,
  updateIotConnectorSettings,
  updateConnector,
  uninstallConnector,
} from '../../integration/connector/connector.service.js';
import {
  installConnectorSchema,
  updateConnectorSchema,
} from '../../integration/connector/connector.schema.js';
import { updateIotSettingsSchema } from '../../integration/tunas-iot/iot.schema.js';
import { runOdooSync, testOdooConnection } from '../../integration/odoo/odoo.connector.js';
import { testSlackConnection } from '../../integration/slack/slack.connector.js';
import { testTeamsConnection } from '../../integration/microsoft/teams.connector.js';
import { testAnyDeskConnection } from '../../integration/anydesk/anydesk.connector.js';
import {
  syncAllPmSchedulesToGoogle,
  testGoogleCalendarConnection,
} from '../../integration/google/google-calendar.connector.js';
import { testCustomApiConnection, runCustomApiSync } from '../../integration/custom-api/custom-api.connector.js';
import { testRediOsConnection } from '../../integration/redi-os/redi-os.connector.js';
import { prisma } from '../../lib/prisma.js';

export async function registerConnectorRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/connector/marketplace', async (_request, reply) => {
    const marketplace = await listMarketplaceWithStats();
    return sendSuccess(reply, marketplace);
  });

  app.get('/connector', async (request, reply) => {
    const connectors = await listInstalledConnectors(request.tenantId!);
    return sendSuccess(reply, connectors);
  });

  app.post('/connector', async (request, reply) => {
    const input = installConnectorSchema.parse(request.body);
    const connector = await installConnector(request.tenantId!, input);
    return sendSuccess(reply, connector, 'Connector installed', 201);
  });

  app.patch('/connector/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateConnectorSchema.parse(request.body);
    const connector = await updateConnector(request.tenantId!, id, input);
    return sendSuccess(reply, connector, 'Connector updated');
  });

  app.delete('/connector/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await uninstallConnector(request.tenantId!, id);
    return sendSuccess(reply, result, 'Connector uninstalled');
  });

  app.post('/connector/:id/test', async (request, reply) => {
    const { id } = request.params as { id: string };
    const connector = await prisma.connector.findFirst({
      where: { id, tenantId: request.tenantId! },
    });
    if (!connector) {
      throw new AppError(404, 'CONNECTOR_NOT_FOUND', 'Connector not found');
    }
    if (connector.type === 'ODOO') {
      const result = await testOdooConnection(connector);
      return sendSuccess(reply, result, 'Connection successful');
    }
    if (connector.type === 'SLACK') {
      const result = await testSlackConnection(connector);
      return sendSuccess(reply, result, 'Test message sent to Slack');
    }
    if (connector.type === 'TEAMS') {
      const result = await testTeamsConnection(connector);
      return sendSuccess(reply, result, 'Test message sent to Microsoft Teams');
    }
    if (connector.type === 'GOOGLE_CALENDAR') {
      const result = await testGoogleCalendarConnection(connector);
      return sendSuccess(reply, result, 'Google Calendar connected');
    }
    if (connector.type === 'ANYDESK') {
      const result = await testAnyDeskConnection(connector);
      return sendSuccess(reply, result, 'AnyDesk configuration valid');
    }
    if (connector.type === 'CUSTOM_API') {
      const result = await testCustomApiConnection(connector);
      return sendSuccess(reply, result, 'Custom API connected');
    }
    if (connector.type === 'REDI_OS') {
      const result = await testRediOsConnection(connector);
      return sendSuccess(reply, result, 'REDI-OS connection checked');
    }
    throw new AppError(400, 'INVALID_CONNECTOR', 'Test not available for this connector');
  });

  app.get('/connector/:id/iot-settings', async (request, reply) => {
    const { id } = request.params as { id: string };
    const connector = await prisma.connector.findFirst({
      where: { id, tenantId: request.tenantId!, type: 'IOT' },
    });
    if (!connector) {
      throw new AppError(404, 'CONNECTOR_NOT_FOUND', 'Tunas IoT connector not found');
    }
    const settings = await getIotConnectorSettings(request.tenantId!);
    return sendSuccess(reply, settings);
  });

  app.patch('/connector/:id/iot-settings', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateIotSettingsSchema.parse(request.body);
    const settings = await updateIotConnectorSettings(request.tenantId!, id, input);
    return sendSuccess(reply, settings, 'IoT settings updated');
  });

  app.post('/connector/:id/sync-assets', async (request, reply) => {
    const { id } = request.params as { id: string };
    const connector = await prisma.connector.findFirst({
      where: { id, tenantId: request.tenantId!, type: 'ODOO' },
    });
    if (!connector) {
      throw new AppError(404, 'CONNECTOR_NOT_FOUND', 'Odoo connector not found');
    }
    const result = await runOdooSync(request.tenantId!);
    return sendSuccess(reply, result, 'Asset sync completed');
  });

  app.post('/connector/:id/sync-calendar', async (request, reply) => {
    const { id } = request.params as { id: string };
    const connector = await prisma.connector.findFirst({
      where: { id, tenantId: request.tenantId!, type: 'GOOGLE_CALENDAR' },
    });
    if (!connector) {
      throw new AppError(404, 'CONNECTOR_NOT_FOUND', 'Google Calendar connector not found');
    }
    const result = await syncAllPmSchedulesToGoogle(request.tenantId!);
    return sendSuccess(reply, result, 'PM calendar sync completed');
  });

  app.post('/connector/:id/sync-custom', async (request, reply) => {
    const { id } = request.params as { id: string };
    const connector = await prisma.connector.findFirst({
      where: { id, tenantId: request.tenantId!, type: 'CUSTOM_API' },
    });
    if (!connector) {
      throw new AppError(404, 'CONNECTOR_NOT_FOUND', 'Custom API connector not found');
    }
    const result = await runCustomApiSync(request.tenantId!);
    return sendSuccess(reply, result, 'Custom API asset sync completed');
  });
}
