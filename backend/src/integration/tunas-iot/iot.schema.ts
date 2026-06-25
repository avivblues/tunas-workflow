import { z } from 'zod';

export const iotSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const iotThresholdOperatorSchema = z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'neq']);

export const iotDomainLinkSchema = z.object({
  domain_code: z.string().min(1),
  tunasiot_hierarchy: z.string().optional(),
  enabled: z.boolean(),
  tunasiot_dashboard_url: z.string().optional(),
});

export const iotThresholdRuleSchema = z.object({
  id: z.string().min(1),
  field: z.string().min(1),
  operator: iotThresholdOperatorSchema,
  value: z.number(),
  severity: iotSeveritySchema,
  title_template: z.string().optional(),
  enabled: z.boolean(),
});

export const updateIotSettingsSchema = z.object({
  config: z
    .object({
      tunasiot_base_url: z.string().url().optional(),
      mqtt_auto_wo_enabled: z.boolean().optional(),
      min_severity: iotSeveritySchema.optional(),
      cooldown_minutes: z.coerce.number().min(0).max(1440).optional(),
    })
    .optional(),
  mapping: z
    .object({
      domain_links: z.array(iotDomainLinkSchema).optional(),
      thresholds: z.array(iotThresholdRuleSchema).optional(),
    })
    .optional(),
});
