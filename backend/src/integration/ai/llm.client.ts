import { env } from '../../config/env.js';
import type { LlmProvider } from './ai.schema.js';
import { LLM_PROVIDER_DEFAULTS } from './ai.schema.js';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ResolvedLlmConfig {
  source: 'user' | 'platform';
  provider: LlmProvider;
  apiKey: string;
  model: string;
}

export function isPlatformLlmConfigured(): boolean {
  return Boolean(env.AI_ENABLED && env.OPENAI_API_KEY && env.OPENAI_API_KEY.length > 8);
}

export function getPlatformLlmConfig(): ResolvedLlmConfig | null {
  if (!isPlatformLlmConfigured()) return null;
  return {
    source: 'platform',
    provider: 'OPENAI',
    apiKey: env.OPENAI_API_KEY!,
    model: env.OPENAI_MODEL,
  };
}

export function isAnyLlmAvailable(userConfig: ResolvedLlmConfig | null): boolean {
  return Boolean(userConfig ?? getPlatformLlmConfig());
}

async function completeOpenAi(
  config: ResolvedLlmConfig,
  systemPrompt: string,
  messages: LlmMessage[],
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.3,
      max_tokens: 2000,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI error: ${response.status} ${errText.slice(0, 200)}`);
  }

  const body = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('OpenAI returned empty response');
  return text;
}

async function completeGemini(
  config: ResolvedLlmConfig,
  systemPrompt: string,
  messages: LlmMessage[],
): Promise<string> {
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2000,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini error: ${response.status} ${errText.slice(0, 200)}`);
  }

  const body = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string };
  };

  if (body.error?.message) {
    throw new Error(`Gemini error: ${body.error.message}`);
  }

  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  if (!text) throw new Error('Gemini returned empty response');
  return text;
}

export async function completeChatWithConfig(
  config: ResolvedLlmConfig,
  systemPrompt: string,
  messages: LlmMessage[],
): Promise<string | null> {
  if (!env.AI_ENABLED) return null;

  if (config.provider === 'GEMINI') {
    return completeGemini(config, systemPrompt, messages);
  }
  return completeOpenAi(config, systemPrompt, messages);
}

/** @deprecated use completeChatWithConfig with resolved config */
export function isLlmConfigured(): boolean {
  return isPlatformLlmConfigured();
}

/** @deprecated use completeChatWithConfig */
export async function completeChat(
  systemPrompt: string,
  messages: LlmMessage[],
): Promise<string | null> {
  const config = getPlatformLlmConfig();
  if (!config) return null;
  return completeChatWithConfig(config, systemPrompt, messages);
}

export function describeLlmConfig(config: ResolvedLlmConfig | null) {
  if (!config) return null;
  return {
    source: config.source,
    provider: config.provider,
    providerLabel: LLM_PROVIDER_DEFAULTS[config.provider].label,
    model: config.model,
  };
}
