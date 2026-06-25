import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../../lib/response.js';
import {
  createLogSchema,
  createTransactionSchema,
  listTransactionSchema,
  transactionActionSchema,
} from '../../core/transaction/transaction.schema.js';
import {
  addTransactionLog,
  createTransaction,
  getTransactionDetail,
  listPendingApprovals,
  listTransactions,
  performAction,
  updatePmChecklist,
} from '../../core/transaction/transaction.service.js';
import { updateChecklistSchema } from '../../core/transaction/transaction.schema.js';

export async function registerTransactionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.post('/transaction', async (request, reply) => {
    const input = createTransactionSchema.parse(request.body);
    const transaction = await createTransaction(request.authUser!, input);
    return sendSuccess(reply, transaction, 'Transaction created', 201);
  });

  app.get('/transaction', async (request, reply) => {
    const query = listTransactionSchema.parse(request.query);
    const result = await listTransactions(request.tenantId!, query);
    return sendSuccess(reply, result);
  });

  app.get('/transaction/pending-approval', async (request, reply) => {
    const items = await listPendingApprovals(request.authUser!);
    return sendSuccess(reply, items);
  });

  app.get('/transaction/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const transaction = await getTransactionDetail(request.tenantId!, id);
    return sendSuccess(reply, transaction);
  });

  app.patch('/transaction/:id/action', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = transactionActionSchema.parse(request.body);
    const transaction = await performAction(request.authUser!, id, input);
    return sendSuccess(reply, transaction, 'Action completed');
  });

  app.post('/transaction/:id/log', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = createLogSchema.parse(request.body);
    const transaction = await addTransactionLog(request.authUser!, id, input);
    return sendSuccess(reply, transaction, 'Log added', 201);
  });

  app.patch('/transaction/:id/checklist', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateChecklistSchema.parse(request.body);
    const transaction = await updatePmChecklist(request.authUser!, id, input);
    return sendSuccess(reply, transaction, 'Checklist updated');
  });
}
