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

export interface MenuAppGroup {
  appCode: string;
  label: string;
}

export function listNavMenu(platform: 'WEB' | 'MOBILE' = 'WEB', appCode?: string) {
  const qs = new URLSearchParams({ platform });
  if (appCode) qs.set('app_code', appCode);
  return apiRequest<NavMenuItem[]>(`/menu?${qs.toString()}`);
}

export function listMenuAdmin(appCode?: string) {
  const qs = appCode ? `?app_code=${appCode}` : '';
  return apiRequest<NavMenuItem[]>(`/menu/admin${qs}`);
}

export function listMenuGroups() {
  return apiRequest<MenuAppGroup[]>('/menu/groups');
}

export function createMenuItem(data: {
  appCode: string;
  menuCode: string;
  label: string;
  path: string;
  icon?: string | null;
  sequence?: number;
  visible?: boolean;
  showWeb?: boolean;
  showMobile?: boolean;
  roleCode?: string | null;
}) {
  return apiRequest<NavMenuItem>('/menu', { method: 'POST', body: JSON.stringify(data) });
}

export function updateMenuItem(
  id: string,
  data: Partial<{
    label: string;
    path: string;
    icon: string | null;
    sequence: number;
    visible: boolean;
    showWeb: boolean;
    showMobile: boolean;
    roleCode: string | null;
  }>,
) {
  return apiRequest<NavMenuItem>(`/menu/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteMenuItem(id: string) {
  return apiRequest<null>(`/menu/${id}`, { method: 'DELETE' });
}

export function reorderMenuItems(items: { id: string; sequence: number }[]) {
  return apiRequest<NavMenuItem[]>('/menu/reorder', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export function resetMenuDefaults(appCode?: string) {
  return apiRequest<NavMenuItem[]>('/menu/reset-defaults', {
    method: 'POST',
    body: JSON.stringify(appCode ? { appCode } : {}),
  });
}
