import { apiRequest } from './api-client';

export interface AppMaster {
  id: string;
  appCode: string;
  name: string;
  icon: string | null;
  dashboard: string | null;
  active: boolean;
}

export interface AppProcess {
  id: string;
  processCode: string;
  name: string;
  sequence: number;
  isFinal: boolean;
}

export interface AppRouting {
  id: string;
  fromProcess: string;
  toProcess: string;
  roleCode: string | null;
  condition: unknown;
  assignRule: unknown;
}

export interface AppDetail extends AppMaster {
  process: AppProcess[];
  routing: AppRouting[];
}

export function listApps() {
  return apiRequest<AppMaster[]>('/apps');
}

export function listAppConfig() {
  return apiRequest<AppDetail[]>('/app');
}

export function getApp(id: string) {
  return apiRequest<AppDetail>(`/app/${id}`);
}

export function createApp(data: {
  appCode: string;
  name: string;
  icon?: string;
  dashboard?: string;
}) {
  return apiRequest<AppMaster>('/app', { method: 'POST', body: JSON.stringify(data) });
}

export function addProcess(
  appId: string,
  data: { processCode: string; name: string; sequence: number; isFinal?: boolean },
) {
  return apiRequest<AppProcess>(`/app/${appId}/process`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function addRouting(
  appId: string,
  data: { fromProcess: string; toProcess: string; roleCode?: string },
) {
  return apiRequest<AppRouting>(`/app/${appId}/routing`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteProcess(appId: string, processId: string) {
  return apiRequest<null>(`/app/${appId}/process/${processId}`, { method: 'DELETE' });
}

export function deleteRouting(appId: string, routingId: string) {
  return apiRequest<null>(`/app/${appId}/routing/${routingId}`, { method: 'DELETE' });
}
