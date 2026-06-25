import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../../lib/response.js';
import { getAppDashboard } from '../../core/dashboard/dashboard.service.js';

export async function registerDashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/dashboard/:appCode', async (request, reply) => {
    const { appCode } = request.params as { appCode: string };
    const data = await getAppDashboard(request.tenantId!, appCode.toUpperCase());
    return sendSuccess(reply, data);
  });
}
