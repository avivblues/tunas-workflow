import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../../lib/response.js';
import {
  addProcess,
  addRouting,
  createApp,
  createAppSchema,
  createProcessSchema,
  createRoutingSchema,
  deleteProcess,
  deleteRouting,
  getAppDetail,
  listApps,
  updateApp,
  updateAppSchema,
} from '../../master/tenant/app-config.service.js';

export async function registerAppRoutes(app: FastifyInstance) {
  // Public menu for authenticated users
  app.get('/apps', { preHandler: [app.authenticate] }, async (request, reply) => {
    const apps = await listApps(request.tenantId!, true);
    return sendSuccess(reply, apps);
  });

  // Admin app configuration
  app.register(async (adminApp) => {
    adminApp.addHook('preHandler', app.authenticate);

    adminApp.get('/app', async (request, reply) => {
      const apps = await listApps(request.tenantId!);
      const detailed = await Promise.all(
        apps.map((a) => getAppDetail(request.tenantId!, a.id)),
      );
      return sendSuccess(reply, detailed);
    });

    adminApp.get('/app/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const appDetail = await getAppDetail(request.tenantId!, id);
      return sendSuccess(reply, appDetail);
    });

    adminApp.post('/app', async (request, reply) => {
      const input = createAppSchema.parse(request.body);
      const created = await createApp(request.tenantId!, input);
      return sendSuccess(reply, created, 'Application created', 201);
    });

    adminApp.patch('/app/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateAppSchema.parse(request.body);
      const updated = await updateApp(request.tenantId!, id, input);
      return sendSuccess(reply, updated, 'Application updated');
    });

    adminApp.post('/app/:id/process', async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = createProcessSchema.parse(request.body);
      const process = await addProcess(request.tenantId!, id, input);
      return sendSuccess(reply, process, 'Process added', 201);
    });

    adminApp.delete('/app/:id/process/:processId', async (request, reply) => {
      const { id, processId } = request.params as { id: string; processId: string };
      await deleteProcess(request.tenantId!, id, processId);
      return sendSuccess(reply, null, 'Process deleted');
    });

    adminApp.post('/app/:id/routing', async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = createRoutingSchema.parse(request.body);
      const routing = await addRouting(request.tenantId!, id, input);
      return sendSuccess(reply, routing, 'Routing added', 201);
    });

    adminApp.delete('/app/:id/routing/:routingId', async (request, reply) => {
      const { id, routingId } = request.params as { id: string; routingId: string };
      await deleteRouting(request.tenantId!, id, routingId);
      return sendSuccess(reply, null, 'Routing deleted');
    });
  });
}
