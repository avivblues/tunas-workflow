import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';

export const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

export async function getTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw new AppError(404, 'TENANT_NOT_FOUND', 'Tenant not found');
  }
  return tenant;
}

export async function updateTenant(tenantId: string, input: z.infer<typeof updateTenantSchema>) {
  return prisma.tenant.update({
    where: { id: tenantId },
    data: input,
  });
}
