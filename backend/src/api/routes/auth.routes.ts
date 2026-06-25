import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../../lib/response.js';
import { getMe, login, loginSchema } from '../../master/user/auth.service.js';

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const result = await login(input);

    const token = await reply.jwtSign({
      sub: result.user.id,
      tenantId: result.user.tenantId,
      username: result.user.username,
      roleCode: result.user.roleCode,
    });

    return sendSuccess(reply, { ...result, token }, 'Login successful');
  });

  app.get('/auth/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const me = await getMe(request.authUser!.id, request.authUser!.tenantId);
    return sendSuccess(reply, me);
  });
}
