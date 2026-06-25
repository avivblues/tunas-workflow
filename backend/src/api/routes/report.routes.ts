import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../../lib/response.js';
import { reportQuerySchema } from '../../core/report/report.schema.js';
import { getAppReport } from '../../core/report/report.service.js';
import { crossAppReportQuerySchema } from '../../core/report/cross-app.schema.js';
import { getCrossAppAnalytics } from '../../core/report/cross-app-analytics.service.js';

export async function registerReportRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/report/:appCode', async (request, reply) => {
    const { appCode } = request.params as { appCode: string };
    const query = reportQuerySchema.parse(request.query);
    const data = await getAppReport(
      request.tenantId!,
      appCode.toUpperCase(),
      query.type,
      {
        days: query.days,
        period: query.period,
        year: query.year,
        month: query.month,
      },
    );
    return sendSuccess(reply, data);
  });

  app.get('/report/cross-app', async (request, reply) => {
    const query = crossAppReportQuerySchema.parse(request.query);
    const data = await getCrossAppAnalytics(request.tenantId!, query.days);
    return sendSuccess(reply, data);
  });
}
