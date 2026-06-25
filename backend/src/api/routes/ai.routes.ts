import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../../lib/response.js';
import { aiChatSchema, aiReportSchema } from '../../integration/ai/ai.schema.js';
import { chatWithAssistant, getAssistantStatus } from '../../integration/ai/ai-chat.service.js';
import { generateOperationsReport } from '../../integration/ai/ai-report.service.js';
import {
  analyzeRootCause,
  findSimilarCases,
  getTechnicianSuggestions,
} from '../../integration/ai/ai-intelligence.service.js';
import {
  disconnectUserLlm,
  getUserLlmConfigView,
  listLlmProviders,
  saveUserLlmConfig,
  testUserLlmConnection,
} from '../../integration/ai/user-llm.service.js';

export async function registerAiRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/ai/status', async (request, reply) => {
    return sendSuccess(reply, await getAssistantStatus(request.authUser!.id));
  });

  app.get('/ai/providers', async (_request, reply) => {
    return sendSuccess(reply, listLlmProviders());
  });

  app.get('/ai/llm-config', async (request, reply) => {
    const config = await getUserLlmConfigView(request.authUser!.id);
    return sendSuccess(reply, { config, providers: listLlmProviders() });
  });

  app.put('/ai/llm-config', async (request, reply) => {
    const config = await saveUserLlmConfig(
      request.authUser!.id,
      request.authUser!.tenantId,
      request.body,
    );
    return sendSuccess(reply, config, 'Koneksi AI berhasil disimpan');
  });

  app.delete('/ai/llm-config', async (request, reply) => {
    const result = await disconnectUserLlm(request.authUser!.id);
    return sendSuccess(reply, result, 'Koneksi AI diputus');
  });

  app.post('/ai/llm-config/test', async (request, reply) => {
    const result = await testUserLlmConnection(request.authUser!.id);
    return sendSuccess(reply, result, 'Koneksi berhasil');
  });

  app.post('/ai/chat', async (request, reply) => {
    const input = aiChatSchema.parse(request.body);
    const result = await chatWithAssistant(
      request.tenantId!,
      request.authUser!.id,
      input.message,
      {
        appCode: input.app_code,
        history: input.history,
      },
    );
    return sendSuccess(reply, result);
  });

  app.post('/ai/report', async (request, reply) => {
    const input = aiReportSchema.parse(request.body);
    const report = await generateOperationsReport(
      request.tenantId!,
      input.period,
      input.app_code,
    );
    return sendSuccess(reply, {
      markdown: report.markdown,
      period: report.period,
      appCode: report.appCode,
      range: report.range,
    });
  });

  app.get('/ai/similar/:transactionId', async (request, reply) => {
    const { transactionId } = request.params as { transactionId: string };
    const cases = await findSimilarCases(request.tenantId!, transactionId);
    return sendSuccess(reply, { similarCases: cases });
  });

  app.post('/ai/rca/:transactionId', async (request, reply) => {
    const { transactionId } = request.params as { transactionId: string };
    const result = await analyzeRootCause(
      request.tenantId!,
      request.authUser!.id,
      transactionId,
    );
    return sendSuccess(reply, result, 'Root cause analysis completed');
  });

  app.get('/ai/suggestions/:transactionId', async (request, reply) => {
    const { transactionId } = request.params as { transactionId: string };
    const result = await getTechnicianSuggestions(
      request.tenantId!,
      request.authUser!.id,
      transactionId,
    );
    return sendSuccess(reply, result);
  });
}
