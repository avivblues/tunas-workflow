import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../../lib/response.js';
import {
  createUser,
  createUserSchema,
  listUsers,
  updateUser,
  updateUserSchema,
} from '../../master/user/user.service.js';

export async function registerUserRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/user', async (request, reply) => {
    const users = await listUsers(request.tenantId!);
    return sendSuccess(reply, users);
  });

  app.post('/user', async (request, reply) => {
    const input = createUserSchema.parse(request.body);
    const user = await createUser(request.tenantId!, input);
    const { password: _, ...safe } = user;
    return sendSuccess(reply, safe, 'User created', 201);
  });

  app.patch('/user/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateUserSchema.parse(request.body);
    const user = await updateUser(request.tenantId!, id, input);
    const { password: _, ...safe } = user;
    return sendSuccess(reply, safe, 'User updated');
  });
}
