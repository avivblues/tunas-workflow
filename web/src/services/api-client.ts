const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  errorCode: string;
  message: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export class ApiClientError extends Error {
  constructor(
    public errorCode: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export function getErrorMessage(err: unknown, fallback = 'Terjadi kesalahan'): string {
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

function getToken(): string | null {
  return localStorage.getItem('tunas_token');
}

export function getAuthToken(): string | null {
  return getToken();
}

export function setToken(token: string) {
  localStorage.setItem('tunas_token', token);
}

export function clearToken() {
  localStorage.removeItem('tunas_token');
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const rawText = await response.text();
  let body: ApiResponse<T>;
  try {
    body = JSON.parse(rawText) as ApiResponse<T>;
  } catch {
    const fallback =
      response.status === 502
        ? 'Server tidak tersedia (502). Backend mungkin sedang restart — coba beberapa saat lagi.'
        : response.status >= 500
          ? `Server error (${response.status})`
          : 'Respons server tidak valid';
    throw new ApiClientError('SERVER_ERROR', fallback, response.status);
  }

  if (body.success === false) {
    throw new ApiClientError(body.errorCode, body.message, response.status);
  }

  return body.data;
}
