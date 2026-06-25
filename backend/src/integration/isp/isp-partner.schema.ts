import { z } from 'zod';
import { ISP_PARTNER_APP_CODES } from './isp-partner.types.js';

const partnerAppCodeSchema = z.enum(ISP_PARTNER_APP_CODES);

export const ispPartnerListQuerySchema = z.object({
  app_code: partnerAppCodeSchema.optional(),
  status: z.enum(['OPEN', 'CLOSED', 'REJECTED']).optional(),
  process: z.string().optional(),
  area: z.string().optional(),
  customer_id: z.string().optional(),
  since: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const ispPartnerUpdateSchema = z.object({
  action: z.enum(['ADVANCE', 'ASSIGN', 'CLOSE', 'REJECT']).default('ADVANCE'),
  to_process: z.string().optional(),
  assign_to: z.string().uuid().optional().nullable(),
  comment: z.string().optional(),
  operator: z.string().optional(),
});

export const ispPartnerLogSchema = z.object({
  action: z.string().min(1).default('NOTE'),
  description: z.string().min(1),
  operator: z.string().optional(),
});

export const ispPartnerReportQuerySchema = z.object({
  app_code: partnerAppCodeSchema.default('ISP_TICKET'),
  type: z
    .enum(['complaint', 'sla', 'asset_usage', 'aging', 'technician', 'sparepart'])
    .default('complaint'),
  period: z.enum(['month', 'year']).default('month'),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  days: z.coerce.number().int().min(1).max(365).optional(),
});

export const ispPartnerReportBundleQuerySchema = z.object({
  app_code: partnerAppCodeSchema.default('ISP_TICKET'),
  period: z.enum(['month', 'year']).default('month'),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});
