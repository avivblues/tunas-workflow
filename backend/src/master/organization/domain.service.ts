import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';

export const createDomainSchema = z.object({
  parentId: z.string().uuid().optional().nullable(),
  domainCode: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['LOCATION', 'ZONE', 'DEPARTMENT']),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export const updateDomainSchema = createDomainSchema.partial();

export async function listDomains(tenantId: string, type?: string) {
  return prisma.domainNode.findMany({
    where: { tenantId, ...(type ? { type } : {}) },
    orderBy: { domainCode: 'asc' },
  });
}

export async function createDomain(tenantId: string, input: z.infer<typeof createDomainSchema>) {
  const existing = await prisma.domainNode.findUnique({
    where: { tenantId_domainCode: { tenantId, domainCode: input.domainCode } },
  });
  if (existing) {
    throw new AppError(409, 'DOMAIN_EXISTS', 'Domain code already exists');
  }

  if (input.parentId) {
    const parent = await prisma.domainNode.findFirst({
      where: { id: input.parentId, tenantId },
    });
    if (!parent) {
      throw new AppError(404, 'PARENT_NOT_FOUND', 'Parent domain not found');
    }
  }

  return prisma.domainNode.create({
    data: {
      tenantId,
      parentId: input.parentId ?? null,
      domainCode: input.domainCode,
      name: input.name,
      type: input.type,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    },
  });
}

export async function updateDomain(
  tenantId: string,
  id: string,
  input: z.infer<typeof updateDomainSchema>,
) {
  const domain = await prisma.domainNode.findFirst({ where: { id, tenantId } });
  if (!domain) {
    throw new AppError(404, 'DOMAIN_NOT_FOUND', 'Domain not found');
  }

  return prisma.domainNode.update({
    where: { id },
    data: input,
  });
}
