import { apiRequest } from './api-client';

export interface NavMenuItem {
  id: string;
  appCode: string;
  menuCode: string;
  label: string;
  path: string;
  icon: string | null;
  sequence: number;
  visible: boolean;
  showWeb: boolean;
  showMobile: boolean;
  roleCode: string | null;
}

export function listNavMenu(token: string, appCode?: string): Promise<NavMenuItem[]> {
  const qs = new URLSearchParams({ platform: 'MOBILE' });
  if (appCode) qs.set('app_code', appCode);
  return apiRequest<NavMenuItem[]>(`/menu?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
