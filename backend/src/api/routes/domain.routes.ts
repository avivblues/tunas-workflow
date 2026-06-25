import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../../lib/response.js';
import {
  createDomain,
  createDomainSchema,
  listDomains,
  updateDomain,
  updateDomainSchema,
} from '../../master/organization/domain.service.js';

export async function registerDomainRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/domain', async (request, reply) => {
    const { type } = request.query as { type?: string };
    const domains = await listDomains(request.tenantId!, type);
    return sendSuccess(reply, domains);
  });

  app.post('/domain', async (request, reply) => {
    const input = createDomainSchema.parse(request.body);
    const domain = await createDomain(request.tenantId!, input);
    return sendSuccess(reply, domain, 'Domain created', 201);
  });

  app.patch('/domain/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateDomainSchema.parse(request.body);
    const domain = await updateDomain(request.tenantId!, id, input);
    return sendSuccess(reply, domain, 'Domain updated');
  });
}
