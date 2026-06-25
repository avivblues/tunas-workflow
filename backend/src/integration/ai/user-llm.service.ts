import { AppError } from '../../lib/response.js';
import { decryptSecret, encryptSecret, maskApiKey } from '../../lib/crypto.util.js';
import { prisma } from '../../lib/prisma.js';
import {
  LLM_PROVIDER_DEFAULTS,
  type LlmProvider,
  userLlmConfigSchema,
} from './ai.schema.js';
import { completeChatWithConfig, type ResolvedLlmConfig } from './llm.client.js';

export interface UserLlmConfigView {
  provider: LlmProvider;
  providerLabel: string;
  model: string;
  hasApiKey: boolean;
  apiKeyMasked: string | null;
  active: boolean;
  connected: boolean;
  updatedAt: string;
}

function toView(row: {
  provider: string;
  model: string | null;
  apiKeyEnc: string;
  active: boolean;
  updatedAt: Date;
}): UserLlmConfigView {
  const provider = row.provider as LlmProvider;
  const defaults = LLM_PROVIDER_DEFAULTS[provider];
  let masked: string | null = null;
  try {
    masked = maskApiKey(decryptSecret(row.apiKeyEnc));
  } catch {
    masked = '••••••••';
  }
  return {
    provider,
    providerLabel: defaults.label,
    model: row.model ?? defaults.model,
    hasApiKey: true,
    apiKeyMasked: masked,
    active: row.active,
    connected: row.active,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getUserLlmConfigView(userId: string): Promise<UserLlmConfigView | null> {
  const row = await prisma.userLlmConfig.findUnique({ where: { userId } });
  if (!row || !row.active) return null;
  return toView(row);
}

export async function resolveUserLlmConfig(userId: string): Promise<ResolvedLlmConfig | null> {
  const row = await prisma.userLlmConfig.findUnique({ where: { userId } });
  if (!row || !row.active) return null;

  const provider = row.provider as LlmProvider;
  const defaults = LLM_PROVIDER_DEFAULTS[provider];

  try {
    const apiKey = decryptSecret(row.apiKeyEnc);
    return {
      source: 'user',
      provider,
      apiKey,
      model: row.model ?? defaults.model,
    };
  } catch {
    return null;
  }
}

export async function saveUserLlmConfig(
  userId: string,
  tenantId: string,
  input: unknown,
) {
  const data = userLlmConfigSchema.parse(input);
  const defaults = LLM_PROVIDER_DEFAULTS[data.provider];
  const model = data.model ?? defaults.model;

  const existing = await prisma.userLlmConfig.findUnique({ where: { userId } });

  let apiKeyEnc: string;
  if (data.api_key) {
    apiKeyEnc = encryptSecret(data.api_key);
  } else if (existing) {
    apiKeyEnc = existing.apiKeyEnc;
  } else {
    throw new AppError(400, 'API_KEY_REQUIRED', 'API key wajib diisi untuk koneksi pertama');
  }

  const row = await prisma.userLlmConfig.upsert({
    where: { userId },
    create: {
      userId,
      tenantId,
      provider: data.provider,
      apiKeyEnc,
      model,
      active: true,
    },
    update: {
      provider: data.provider,
      apiKeyEnc,
      model,
      active: true,
    },
  });

  return toView(row);
}

export async function disconnectUserLlm(userId: string) {
  await prisma.userLlmConfig.deleteMany({ where: { userId } });
  return { disconnected: true };
}

export async function testUserLlmConnection(userId: string) {
  const config = await resolveUserLlmConfig(userId);
  if (!config) {
    throw new AppError(400, 'LLM_NOT_CONFIGURED', 'Belum ada koneksi LLM. Simpan API key terlebih dahulu.');
  }

  const reply = await completeChatWithConfig(
    config,
    'You are a connection test assistant. Reply with exactly: OK',
    [{ role: 'user', content: 'ping' }],
  );

  if (!reply) {
    throw new AppError(502, 'LLM_TEST_FAILED', 'Koneksi gagal — tidak ada respons dari provider');
  }

  return {
    ok: true,
    provider: config.provider,
    model: config.model,
    sampleReply: reply.slice(0, 80),
  };
}

export function listLlmProviders() {
  return Object.entries(LLM_PROVIDER_DEFAULTS).map(([code, meta]) => ({
    code,
    label: meta.label,
    defaultModel: meta.model,
    models: meta.models,
  }));
}
