import { apiRequest } from './api-client';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';
export type LlmProvider = 'OPENAI' | 'GEMINI';

export interface LlmProviderInfo {
  code: LlmProvider;
  label: string;
  defaultModel: string;
  models: string[];
}

export interface UserLlmConfig {
  provider: LlmProvider;
  providerLabel: string;
  model: string;
  hasApiKey: boolean;
  apiKeyMasked: string | null;
  active: boolean;
  connected: boolean;
  updatedAt: string;
}

export interface AiStatus {
  enabled: boolean;
  llmConfigured: boolean;
  model: string | null;
  userLlm: UserLlmConfig | null;
  platformLlm: { provider: string; model: string; source: 'platform' } | null;
  modes: string[];
  reportPeriods: ReportPeriod[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatResponse {
  reply: string;
  mode: 'chat' | 'report';
  llmUsed: boolean;
  llmSource?: 'user' | 'platform' | null;
  llmProvider?: {
    source: string;
    provider: LlmProvider;
    providerLabel: string;
    model: string;
  } | null;
  report?: {
    period: ReportPeriod;
    appCode: string | null;
    range: { from: string; to: string };
  };
  contextSummary?: {
    total: number;
    open: number;
    closed: number;
    slaBreachOpen: number;
    avgResolutionHours: number;
    workLogCount: number;
  };
}

export interface AiReportResponse {
  markdown: string;
  period: ReportPeriod;
  appCode: string | null;
  range: { from: string; to: string };
}

export interface LlmConfigResponse {
  config: UserLlmConfig | null;
  providers: LlmProviderInfo[];
}

export interface SaveLlmConfigInput {
  provider: LlmProvider;
  api_key?: string;
  model?: string;
}

export function getAiStatus() {
  return apiRequest<AiStatus>('/ai/status');
}

export function getLlmConfig() {
  return apiRequest<LlmConfigResponse>('/ai/llm-config');
}

export function saveLlmConfig(input: SaveLlmConfigInput) {
  return apiRequest<UserLlmConfig>('/ai/llm-config', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function disconnectLlm() {
  return apiRequest<{ disconnected: boolean }>('/ai/llm-config', {
    method: 'DELETE',
  });
}

export function testLlmConnection() {
  return apiRequest<{ ok: boolean; provider: string; model: string; sampleReply: string }>(
    '/ai/llm-config/test',
    { method: 'POST' },
  );
}

export function sendAiChat(message: string, history?: ChatMessage[], appCode?: string) {
  return apiRequest<AiChatResponse>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history, app_code: appCode }),
  });
}

export function generateAiReport(period: ReportPeriod, appCode?: string) {
  return apiRequest<AiReportResponse>('/ai/report', {
    method: 'POST',
    body: JSON.stringify({ period, app_code: appCode }),
  });
}

export interface RootCauseAnalysis {
  transactionId: string;
  trxNo: string;
  appCode: string;
  rootCauses: { cause: string; recommendation: string; confidence: string }[];
  similarCases: {
    id: string;
    trxNo: string;
    score: number;
    resolutionHours: number | null;
    workLogSummary: string[];
  }[];
  technicianSuggestions: {
    suggestedSteps: { step: string; seenInCases: number }[];
    estimatedResolutionHours: number | null;
    basedOnCases: number;
  };
  narrative: string;
  llmUsed: boolean;
}

export interface TechnicianSuggestions {
  transactionId: string;
  trxNo: string;
  suggestions: RootCauseAnalysis['technicianSuggestions'];
  similarCases: RootCauseAnalysis['similarCases'];
  quickSummary: { cause: string; recommendation: string; confidence: string }[];
  narrative: string;
  llmUsed: boolean;
}

export function getTechnicianSuggestions(transactionId: string) {
  return apiRequest<TechnicianSuggestions>(`/ai/suggestions/${transactionId}`);
}

export function analyzeRootCause(transactionId: string) {
  return apiRequest<RootCauseAnalysis>(`/ai/rca/${transactionId}`, { method: 'POST' });
}
