const DEFAULT_API_BASE = 'http://103.94.238.207:3050/api';

export function getApiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const body = (await response.json()) as ApiResponse<T>;
  if (!body.success) {
    throw new Error(body.message ?? 'Request failed');
  }
  return body.data;
}
