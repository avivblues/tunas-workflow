import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../../lib/response.js';
import { getTenant, updateTenant, updateTenantSchema } from '../../master/tenant/tenant.service.js';

export async function registerTenantRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/tenant', async (request, reply) => {
    const tenant = await getTenant(request.tenantId!);
    return sendSuccess(reply, tenant);
  });

  app.patch('/tenant', async (request, reply) => {
    const input = updateTenantSchema.parse(request.body);
    const tenant = await updateTenant(request.tenantId!, input);
    return sendSuccess(reply, tenant, 'Tenant updated');
  });
}
