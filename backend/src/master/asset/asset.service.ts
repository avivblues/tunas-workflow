import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';

export const createAssetSchema = z.object({
  asset_code: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(['FIXED_ASSET', 'SPAREPART', 'TOOL']),
  serial_no: z.string().optional(),
  location_code: z.string().optional(),
  status: z.string().default('ACTIVE'),
});

export const linkAssetSchema = z.object({
  asset_id: z.string().uuid(),
  usage_type: z.enum(['AFFECTED', 'SPAREPART', 'TOOL']),
  qty: z.number().optional(),
});

export async function listAssets(tenantId: string, category?: string) {
  return prisma.asset.findMany({
    where: { tenantId, ...(category ? { category } : {}) },
    orderBy: { name: 'asc' },
  });
}

export async function createAsset(tenantId: string, input: z.infer<typeof createAssetSchema>) {
  const existing = await prisma.asset.findUnique({
    where: { tenantId_assetCode: { tenantId, assetCode: input.asset_code } },
  });
  if (existing) {
    throw new AppError(409, 'ASSET_EXISTS', 'Asset code already exists');
  }

  return prisma.asset.create({
    data: {
      tenantId,
      assetCode: input.asset_code,
      name: input.name,
      category: input.category,
      serialNo: input.serial_no,
      locationCode: input.location_code,
      status: input.status,
    },
  });
}

export async function linkTransactionAsset(
  tenantId: string,
  transactionId: string,
  input: z.infer<typeof linkAssetSchema>,
) {
  const transaction = await prisma.transactionHeader.findFirst({
    where: { id: transactionId, tenantId },
  });
  if (!transaction) {
    throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
  }

  const asset = await prisma.asset.findFirst({
    where: { id: input.asset_id, tenantId },
  });
  if (!asset) {
    throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found');
  }

  return prisma.transactionAsset.create({
    data: {
      transactionId,
      assetId: input.asset_id,
      usageType: input.usage_type,
      qty: input.qty,
    },
  });
}
