import { z } from 'zod';

export const reportTypeSchema = z.enum([
  'complaint',
  'sla',
  'asset_usage',
  'aging',
  'technician',
  'sparepart',
]);

export const reportQuerySchema = z.object({
  type: reportTypeSchema,
  period: z.enum(['month', 'year']).default('month'),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  days: z.coerce.number().int().min(1).max(365).optional(),
});

export type ReportType = z.infer<typeof reportTypeSchema>;
