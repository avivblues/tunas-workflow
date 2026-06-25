import { apiRequest } from './api-client';

export interface CrossAppAnalytics {
  periodDays: number;
  since: string;
  totals: {
    total: number;
    open: number;
    closed: number;
    appsActive: number;
  };
  perApp: {
    appCode: string;
    appName: string;
    total: number;
    open: number;
    closed: number;
    rejected: number;
    slaBreachOpen: number;
    slaAtRisk: number;
    avgResolutionHours: number;
    workLogCount: number;
  }[];
  topFailingAssets: {
    assetCode: string;
    name: string;
    incidentCount: number;
    apps: string[];
  }[];
  weeklyTrend: { week: string; count: number }[];
  generatedAt: string;
}

export function getCrossAppAnalytics(days = 30) {
  return apiRequest<CrossAppAnalytics>(`/report/cross-app?days=${days}`);
}
