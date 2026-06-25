import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { AppError } from '../../lib/response.js';
import type { AuthUser } from '../../types/auth.js';

export const loginSchema = z.object({
  tenantCode: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

export async function login(input: LoginInput): Promise<{ user: AuthUser; token: string }> {
  const tenant = await prisma.tenant.findUnique({
    where: { code: input.tenantCode },
  });

  if (!tenant || !tenant.active) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid tenant code or credentials');
  }

  const user = await prisma.user.findUnique({
    where: {
      tenantId_username: {
        tenantId: tenant.id,
        username: input.username,
      },
    },
    include: { role: true },
  });

  if (!user || !user.active || !user.password) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid tenant code or credentials');
  }

  const valid = await verifyPassword(input.password, user.password);
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid tenant code or credentials');
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

  return { user: authUser, token: '' };
}

export async function getMe(userId: string, tenantId: string): Promise<AuthUser & { tenant: { id: string; code: string; name: string } }> {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId, active: true },
    include: { role: true, tenant: true },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  return {
    id: user.id,
    tenantId: user.tenantId,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    roleId: user.roleId,
    roleCode: user.role?.code ?? null,
    roleName: user.role?.name ?? null,
    tenant: {
      id: user.tenant.id,
      code: user.tenant.code,
      name: user.tenant.name,
    },
  };
}

export { hashPassword };
