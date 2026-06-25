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

  const body = (await response.json()) as ApiResponse<T>;

  if (body.success === false) {
    throw new ApiClientError(body.errorCode, body.message, response.status);
  }

  return body.data;
}
