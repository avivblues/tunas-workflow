import { apiRequest } from './api-client';

export interface DomainNode {
  id: string;
  domainCode: string;
  name: string;
  type: string;
  parentCode: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export function listDomains(token: string, type?: string): Promise<DomainNode[]> {
  const qs = type ? `?type=${encodeURIComponent(type)}` : '';
  return apiRequest<DomainNode[]>(`/domain${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
