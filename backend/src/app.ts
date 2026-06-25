import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { env } from './config/env.js';
import authPlugin from './plugins/auth.plugin.js';
import { registerErrorHandler } from './plugins/error-handler.plugin.js';
import { registerHealthRoutes } from './api/routes/health.routes.js';
import { registerAuthRoutes } from './api/routes/auth.routes.js';
import { registerTenantRoutes } from './api/routes/tenant.routes.js';
import { registerDomainRoutes } from './api/routes/domain.routes.js';
import { registerUserRoutes } from './api/routes/user.routes.js';
import { registerRoleRoutes } from './api/routes/role.routes.js';
import { registerAppRoutes } from './api/routes/app.routes.js';
import { registerTransactionRoutes } from './api/routes/transaction.routes.js';
import { registerAssetRoutes } from './api/routes/asset.routes.js';
import { registerAttachmentRoutes } from './api/routes/attachment.routes.js';
import { registerDashboardRoutes } from './api/routes/dashboard.routes.js';
import { registerNotificationRoutes } from './api/routes/notification.routes.js';
import { registerPmScheduleRoutes } from './api/routes/pm-schedule.routes.js';
import { registerConnectorRoutes } from './api/routes/connector.routes.js';
import { registerIntegrationRoutes } from './api/routes/integration.routes.js';
import { registerMenuRoutes } from './api/routes/menu.routes.js';
import { registerAiRoutes } from './api/routes/ai.routes.js';
import { registerReportRoutes } from './api/routes/report.routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV === 'development',
  });

  registerErrorHandler(app);

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 5,
    },
  });

  await app.register(authPlugin);

  await app.register(registerHealthRoutes, { prefix: env.API_PREFIX });
  await app.register(registerAuthRoutes, { prefix: env.API_PREFIX });
  await app.register(registerTenantRoutes, { prefix: env.API_PREFIX });
  await app.register(registerDomainRoutes, { prefix: env.API_PREFIX });
  await app.register(registerUserRoutes, { prefix: env.API_PREFIX });
  await app.register(registerRoleRoutes, { prefix: env.API_PREFIX });
  await app.register(registerAppRoutes, { prefix: env.API_PREFIX });
  await app.register(registerMenuRoutes, { prefix: env.API_PREFIX });
  await app.register(registerTransactionRoutes, { prefix: env.API_PREFIX });
  await app.register(registerAssetRoutes, { prefix: env.API_PREFIX });
  await app.register(registerAttachmentRoutes, { prefix: env.API_PREFIX });
  await app.register(registerDashboardRoutes, { prefix: env.API_PREFIX });
  await app.register(registerNotificationRoutes, { prefix: env.API_PREFIX });
  await app.register(registerPmScheduleRoutes, { prefix: env.API_PREFIX });
  await app.register(registerIntegrationRoutes, { prefix: env.API_PREFIX });
  await app.register(registerConnectorRoutes, { prefix: env.API_PREFIX });
  await app.register(registerAiRoutes, { prefix: env.API_PREFIX });
  await app.register(registerReportRoutes, { prefix: env.API_PREFIX });

  return app;
}
