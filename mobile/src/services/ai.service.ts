import { apiRequest } from './api-client';

export interface AiStatus {
  enabled: boolean;
  llmConfigured: boolean;
  model: string | null;
  modes: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatResponse {
  reply: string;
  mode: 'chat' | 'report';
  llmUsed: boolean;
}

export function getAiStatus(token: string): Promise<AiStatus> {
  return apiRequest<AiStatus>('/ai/status', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function sendAiChat(
  token: string,
  input: { message: string; history?: ChatMessage[] },
): Promise<AiChatResponse> {
  return apiRequest<AiChatResponse>('/ai/chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}

export interface TechnicianSuggestions {
  trxNo: string;
  suggestions: {
    suggestedSteps: { step: string; seenInCases: number }[];
    estimatedResolutionHours: number | null;
    basedOnCases: number;
  };
  quickSummary: { cause: string; recommendation: string }[];
  narrative: string;
}

export function getTechnicianSuggestions(token: string, transactionId: string) {
  return apiRequest<TechnicianSuggestions>(`/ai/suggestions/${transactionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
