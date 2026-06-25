import { z } from 'zod';

export const crossAppReportQuerySchema = z.object({
  days: z.coerce.number().min(7).max(365).default(30),
});
