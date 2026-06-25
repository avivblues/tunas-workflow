import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../../lib/response.js';
import {
  createRole,
  createRoleSchema,
  listRoles,
  updateRole,
  updateRoleSchema,
} from '../../master/user/role.service.js';

export async function registerRoleRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/role', async (request, reply) => {
    const roles = await listRoles(request.tenantId!);
    return sendSuccess(reply, roles);
  });

  app.post('/role', async (request, reply) => {
    const input = createRoleSchema.parse(request.body);
    const role = await createRole(request.tenantId!, input);
    return sendSuccess(reply, role, 'Role created', 201);
  });

  app.patch('/role/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateRoleSchema.parse(request.body);
    const role = await updateRole(request.tenantId!, id, input);
    return sendSuccess(reply, role, 'Role updated');
  });
}
