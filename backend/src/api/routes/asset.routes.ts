import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../../lib/response.js';
import {
  createAsset,
  createAssetSchema,
  linkAssetSchema,
  linkTransactionAsset,
  listAssets,
} from '../../master/asset/asset.service.js';

export async function registerAssetRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/asset', async (request, reply) => {
    const { category } = request.query as { category?: string };
    const assets = await listAssets(request.tenantId!, category);
    return sendSuccess(reply, assets);
  });

  app.post('/asset', async (request, reply) => {
    const input = createAssetSchema.parse(request.body);
    const asset = await createAsset(request.tenantId!, input);
    return sendSuccess(reply, asset, 'Asset created', 201);
  });

  app.post('/transaction/:id/asset', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = linkAssetSchema.parse(request.body);
    const link = await linkTransactionAsset(request.tenantId!, id, input);
    return sendSuccess(reply, link, 'Asset linked', 201);
  });
}
