import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';

export const createRoleSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).toUpperCase(),
  permissions: z.record(z.unknown()).optional(),
});

export const updateRoleSchema = createRoleSchema.partial();

export async function listRoles(tenantId: string) {
  return prisma.role.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });
}

export async function createRole(tenantId: string, input: z.infer<typeof createRoleSchema>) {
  const existing = await prisma.role.findUnique({
    where: { tenantId_code: { tenantId, code: input.code } },
  });
  if (existing) {
    throw new AppError(409, 'ROLE_EXISTS', 'Role code already exists');
  }

  return prisma.role.create({
    data: {
      tenantId,
      name: input.name,
      code: input.code,
      permissions: input.permissions as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function updateRole(
  tenantId: string,
  id: string,
  input: z.infer<typeof updateRoleSchema>,
) {
  const role = await prisma.role.findFirst({ where: { id, tenantId } });
  if (!role) {
    throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found');
  }

  return prisma.role.update({
    where: { id },
    data: {
      ...input,
      permissions: input.permissions as Prisma.InputJsonValue | undefined,
    },
  });
}
