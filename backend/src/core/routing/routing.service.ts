import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';

export interface RoutingContext {
  tenantId: string;
  appCode: string;
  fromProcess: string;
  roleCode: string | null;
}

export async function getAvailableTransitions(ctx: RoutingContext) {
  const app = await prisma.appMaster.findUnique({
    where: { tenantId_appCode: { tenantId: ctx.tenantId, appCode: ctx.appCode } },
    include: { routing: true },
  });

  if (!app) {
    throw new AppError(404, 'APP_NOT_FOUND', `Application ${ctx.appCode} not found`);
  }

  return app.routing.filter((r) => {
    if (r.fromProcess !== ctx.fromProcess) return false;
    if (r.roleCode && ctx.roleCode && r.roleCode !== ctx.roleCode) return false;
    if (r.roleCode && !ctx.roleCode) return false;
    return true;
  });
}

export async function resolveNextProcess(
  ctx: RoutingContext,
  requestedToProcess?: string,
): Promise<{ toProcess: string; routingId: string | null }> {
  const transitions = await getAvailableTransitions(ctx);

  if (transitions.length === 0) {
    throw new AppError(400, 'NO_ROUTING', `No routing defined from process ${ctx.fromProcess}`);
  }

  if (requestedToProcess) {
    const match = transitions.find((t) => t.toProcess === requestedToProcess);
    if (!match) {
      throw new AppError(400, 'INVALID_TRANSITION', `Cannot transition to ${requestedToProcess}`);
    }
    return { toProcess: match.toProcess, routingId: match.id };
  }

  if (transitions.length > 1) {
    throw new AppError(
      400,
      'AMBIGUOUS_ROUTING',
      'Multiple transitions available — specify toProcess',
    );
  }

  return { toProcess: transitions[0].toProcess, routingId: transitions[0].id };
}

export async function getInitialProcess(tenantId: string, appCode: string): Promise<string> {
  const app = await prisma.appMaster.findUnique({
    where: { tenantId_appCode: { tenantId, appCode } },
    include: { process: { orderBy: { sequence: 'asc' } } },
  });

  if (!app || app.process.length === 0) {
    throw new AppError(404, 'APP_NOT_CONFIGURED', `No process configured for ${appCode}`);
  }

  return app.process[0].processCode;
}

export async function isFinalProcess(
  tenantId: string,
  appCode: string,
  processCode: string,
): Promise<boolean> {
  const app = await prisma.appMaster.findUnique({
    where: { tenantId_appCode: { tenantId, appCode } },
    include: { process: true },
  });

  const step = app?.process.find((p) => p.processCode === processCode);
  return step?.isFinal ?? false;
}
