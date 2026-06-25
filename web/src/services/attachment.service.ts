const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export interface AttachmentMeta {
  key: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

function getToken(): string | null {
  return localStorage.getItem('tunas_token');
}

export async function uploadAttachment(file: File): Promise<AttachmentMeta> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/attachment/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const body = await response.json();
  if (!body.success) {
    throw new Error(body.message ?? 'Upload failed');
  }

  return body.data as AttachmentMeta;
}

export function resolveAttachmentUrl(url: string): string {
  if (url.startsWith('http')) return url;
  if (url.startsWith('/api')) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? url.slice(4) : url}`;
}
