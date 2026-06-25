import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';
import { hashPassword } from './auth.service.js';

export const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  fullName: z.string().min(1),
  email: z.string().email().optional(),
  roleId: z.string().uuid().optional(),
  active: z.boolean().optional(),
});

export const updateUserSchema = createUserSchema.partial().omit({ username: true }).extend({
  username: z.string().min(3).optional(),
});

export async function listUsers(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId },
    include: { role: { select: { id: true, code: true, name: true } } },
    orderBy: { fullName: 'asc' },
  });
}

export async function createUser(tenantId: string, input: z.infer<typeof createUserSchema>) {
  const existing = await prisma.user.findUnique({
    where: { tenantId_username: { tenantId, username: input.username } },
  });
  if (existing) {
    throw new AppError(409, 'USER_EXISTS', 'Username already exists in this tenant');
  }

  const password = await hashPassword(input.password);
  return prisma.user.create({
    data: {
      tenantId,
      username: input.username,
      password,
      fullName: input.fullName,
      email: input.email,
      roleId: input.roleId,
      active: input.active ?? true,
    },
    include: { role: { select: { id: true, code: true, name: true } } },
  });
}

export async function updateUser(
  tenantId: string,
  id: string,
  input: z.infer<typeof updateUserSchema>,
) {
  const user = await prisma.user.findFirst({ where: { id, tenantId } });
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  const data: Record<string, unknown> = { ...input };
  if (input.password) {
    data.password = await hashPassword(input.password);
  }

  return prisma.user.update({
    where: { id },
    data,
    include: { role: { select: { id: true, code: true, name: true } } },
  });
}
