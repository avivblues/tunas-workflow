import { z } from 'zod';

const attachmentMetaSchema = z.object({
  key: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
  url: z.string().min(1),
});

const assetLinkSchema = z.object({
  asset_id: z.string().uuid(),
  usage_type: z.enum(['AFFECTED', 'SPAREPART', 'TOOL']),
  qty: z.number().optional(),
});

export const createTransactionSchema = z.object({
  app_code: z.string().min(1).toUpperCase(),
  domain_code: z.string().min(1).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  data: z.record(z.unknown()).default({}),
  assign_to: z.string().uuid().optional(),
  asset_links: z.array(assetLinkSchema).optional(),
  attachments: z.array(attachmentMetaSchema).optional(),
});

export const listTransactionSchema = z.object({
  app_code: z.string().optional(),
  domain_code: z.string().optional(),
  status: z.string().optional(),
  process: z.string().optional(),
  assign_to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  with_details: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export const transactionActionSchema = z.object({
  action: z.enum(['ADVANCE', 'ASSIGN', 'CLOSE', 'REJECT']),
  to_process: z.string().optional(),
  assign_to: z.string().uuid().optional().nullable(),
  comment: z.string().optional(),
});

export const updateChecklistSchema = z.object({
  checklist: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      done: z.boolean(),
    }),
  ),
});

export const createLogSchema = z.object({
  action: z.string().min(1),
  description: z.string().optional(),
  attachments: z
    .array(
      z.object({
        key: z.string(),
        filename: z.string(),
        mimeType: z.string(),
        size: z.number(),
        url: z.string(),
      }),
    )
    .optional(),
  spareparts: z
    .array(
      z.object({
        asset_id: z.string().uuid(),
        qty: z.number().positive().optional(),
      }),
    )
    .optional(),
  tools: z.array(z.object({ asset_id: z.string().uuid() })).optional(),
  workers: z.array(z.object({ user_id: z.string().uuid() })).optional(),
});
