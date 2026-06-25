import type { FastifyInstance } from 'fastify';

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({
    success: true,
    data: {
      status: 'ok',
      service: 'tunas-workflow-api',
      version: '1.0.0',
    },
    message: 'Service is healthy',
  }));
}
