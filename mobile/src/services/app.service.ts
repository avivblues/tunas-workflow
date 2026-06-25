import { apiRequest } from './api-client';

export interface AppMenuItem {
  id: string;
  appCode: string;
  name: string;
  icon: string | null;
  active: boolean;
}

export function fetchApps(token: string): Promise<AppMenuItem[]> {
  return apiRequest<AppMenuItem[]>('/apps', {
    headers: { Authorization: `Bearer ${token}` },
  });
}
