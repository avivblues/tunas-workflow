import fp from 'fastify-plugin';
import fjwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';
import { AppError } from '../lib/response.js';
import { prisma } from '../lib/prisma.js';
import type { AuthUser } from '../types/auth.js';

async function authPlugin(app: FastifyInstance) {
  await app.register(fjwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  app.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token');
    }

    const payload = request.user;
    const user = await prisma.user.findFirst({
      where: { id: payload.sub, tenantId: payload.tenantId, active: true },
      include: { role: true },
    });

    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not found or inactive');
    }

    const authUser: AuthUser = {
      id: user.id,
      tenantId: user.tenantId,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      roleId: user.roleId,
      roleCode: user.role?.code ?? null,
      roleName: user.role?.name ?? null,
    };

    request.authUser = authUser;
    request.tenantId = user.tenantId;
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(authPlugin);
