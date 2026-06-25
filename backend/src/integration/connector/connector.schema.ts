import { z } from 'zod';

export const installConnectorSchema = z.object({
  type: z.enum([
    'ODOO',
    'ISP',
    'IOT',
    'GOOGLE',
    'GOOGLE_CALENDAR',
    'AZURE_AD',
    'WHATSAPP',
    'ZAPIER',
    'CUSTOM_API',
    'SLACK',
    'TEAMS',
    'ANYDESK',
  ]),
  name: z.string().min(1),
  config: z.record(z.unknown()).default({}),
  mapping: z.record(z.unknown()).optional(),
});

export const updateConnectorSchema = z.object({
  name: z.string().min(1).optional(),
  config: z.record(z.unknown()).optional(),
  mapping: z.record(z.unknown()).optional(),
  active: z.boolean().optional(),
});
