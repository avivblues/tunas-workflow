import { z } from 'zod';

export const aiChatSchema = z.object({
  message: z.string().min(1).max(4000),
  app_code: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .optional(),
});

export const aiReportSchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly']),
  app_code: z.string().optional(),
});

export const userLlmConfigSchema = z.object({
  provider: z.enum(['OPENAI', 'GEMINI']),
  api_key: z.string().min(8).max(500).optional(),
  model: z.string().max(100).optional(),
});

export type LlmProvider = z.infer<typeof userLlmConfigSchema>['provider'];
export type ReportPeriod = z.infer<typeof aiReportSchema>['period'];

export const LLM_PROVIDER_DEFAULTS: Record<
  LlmProvider,
  { label: string; model: string; models: string[] }
> = {
  OPENAI: {
    label: 'ChatGPT (OpenAI)',
    model: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
  },
  GEMINI: {
    label: 'Google Gemini',
    model: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  },
};
