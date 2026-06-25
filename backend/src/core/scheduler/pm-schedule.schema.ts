import { z } from 'zod';

export const PM_FREQUENCIES = ['WEEKLY', 'MONTHLY', 'QUARTERLY'] as const;

export const createPmScheduleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  asset_id: z.string().uuid().optional(),
  domain_code: z.string().optional(),
  frequency: z.enum(PM_FREQUENCIES),
  next_run_at: z.string().datetime().optional(),
  assign_to: z.string().uuid().optional(),
  checklist: z.array(z.string().min(1)).min(1),
  active: z.boolean().optional(),
});

export const updatePmScheduleSchema = createPmScheduleSchema.partial();

export const calendarQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
