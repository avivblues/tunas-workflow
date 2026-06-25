import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';

export const createAppSchema = z.object({
  appCode: z.string().min(1).toUpperCase(),
  name: z.string().min(1),
  icon: z.string().optional(),
  dashboard: z.string().optional(),
  active: z.boolean().optional(),
});

export const updateAppSchema = createAppSchema.partial().omit({ appCode: true });

export const createProcessSchema = z.object({
  processCode: z.string().min(1).toUpperCase(),
  name: z.string().min(1),
  sequence: z.number().int().min(0),
  isFinal: z.boolean().optional(),
});

export const createRoutingSchema = z.object({
  fromProcess: z.string().min(1),
  toProcess: z.string().min(1),
  roleCode: z.string().optional(),
  condition: z.record(z.unknown()).optional(),
  assignRule: z.record(z.unknown()).optional(),
});

export async function listApps(tenantId: string, activeOnly = false) {
  return prisma.appMaster.findMany({
    where: { tenantId, ...(activeOnly ? { active: true } : {}) },
    orderBy: { name: 'asc' },
  });
}

export async function getAppDetail(tenantId: string, id: string) {
  const app = await prisma.appMaster.findFirst({
    where: { id, tenantId },
    include: {
      process: { orderBy: { sequence: 'asc' } },
      routing: true,
    },
  });
  if (!app) {
    throw new AppError(404, 'APP_NOT_FOUND', 'Application not found');
  }
  return app;
}

export async function createApp(tenantId: string, input: z.infer<typeof createAppSchema>) {
  const existing = await prisma.appMaster.findUnique({
    where: { tenantId_appCode: { tenantId, appCode: input.appCode } },
  });
  if (existing) {
    throw new AppError(409, 'APP_EXISTS', 'App code already exists');
  }

  return prisma.appMaster.create({ data: { tenantId, ...input } });
}

export async function updateApp(
  tenantId: string,
  id: string,
  input: z.infer<typeof updateAppSchema>,
) {
  const app = await prisma.appMaster.findFirst({ where: { id, tenantId } });
  if (!app) {
    throw new AppError(404, 'APP_NOT_FOUND', 'Application not found');
  }

  return prisma.appMaster.update({ where: { id }, data: input });
}

export async function addProcess(
  tenantId: string,
  appId: string,
  input: z.infer<typeof createProcessSchema>,
) {
  const app = await prisma.appMaster.findFirst({ where: { id: appId, tenantId } });
  if (!app) {
    throw new AppError(404, 'APP_NOT_FOUND', 'Application not found');
  }

  return prisma.appProcess.create({
    data: { appId, ...input, isFinal: input.isFinal ?? false },
  });
}

export async function deleteProcess(tenantId: string, appId: string, processId: string) {
  const app = await prisma.appMaster.findFirst({ where: { id: appId, tenantId } });
  if (!app) {
    throw new AppError(404, 'APP_NOT_FOUND', 'Application not found');
  }

  await prisma.appProcess.delete({ where: { id: processId } });
}

export async function addRouting(
  tenantId: string,
  appId: string,
  input: z.infer<typeof createRoutingSchema>,
) {
  const app = await prisma.appMaster.findFirst({ where: { id: appId, tenantId } });
  if (!app) {
    throw new AppError(404, 'APP_NOT_FOUND', 'Application not found');
  }

  return prisma.appRouting.create({
    data: {
      appId,
      fromProcess: input.fromProcess,
      toProcess: input.toProcess,
      roleCode: input.roleCode,
      condition: input.condition as Prisma.InputJsonValue | undefined,
      assignRule: input.assignRule as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function deleteRouting(tenantId: string, appId: string, routingId: string) {
  const app = await prisma.appMaster.findFirst({ where: { id: appId, tenantId } });
  if (!app) {
    throw new AppError(404, 'APP_NOT_FOUND', 'Application not found');
  }

  await prisma.appRouting.delete({ where: { id: routingId } });
}
