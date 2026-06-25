import { config } from 'dotenv';
import { resolve } from 'path';
import { z } from 'zod';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('/api'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  RABBITMQ_URL: z.string().optional(),
  JWT_SECRET: z.string().default('change-me-in-production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string().default('tunas'),
  MINIO_SECRET_KEY: z.string().default('tunas_secret'),
  MINIO_BUCKET: z.string().default('tunas-attachments'),
  MINIO_USE_SSL: z
    .string()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().default('https://api.openai.com/v1'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  AI_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v !== 'false' && v !== '0'),
  INTEGRATION_WORKER_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v !== 'false' && v !== '0'),
  INTEGRATION_WORKER_INTERVAL_MS: z.coerce.number().default(120_000),
  MQTT_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  MQTT_BROKER_URL: z.string().optional(),
  MQTT_USERNAME: z.string().optional(),
  MQTT_PASSWORD: z.string().optional(),
  MQTT_TOPIC_PATTERN: z.string().default('tunas/+/iot/alert'),
  MQTT_TOPIC_PATTERNS: z
    .string()
    .default(
      'tunas/+/+/+/telemetry,tunas/+/+/telemetry,tunas/+/iot/alert,tunas/+/+/+/iot/alert',
    )
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  DEPLOYMENT_REGION: z.string().default('default'),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
