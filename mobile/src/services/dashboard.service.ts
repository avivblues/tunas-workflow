import { apiRequest } from './api-client';

export interface AppDashboardData {
  appCode: string;
  appName: string;
  summary: {
    total: number;
    open: number;
    closed: number;
    rejected: number;
    slaBreachOpen: number;
    slaAtRisk: number;
    avgResolutionHours: number;
  };
  appMetrics?: { label: string; value: number | string; hint?: string }[];
}

export function getAppDashboard(token: string, appCode: string): Promise<AppDashboardData> {
  return apiRequest<AppDashboardData>(`/dashboard/${appCode}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
