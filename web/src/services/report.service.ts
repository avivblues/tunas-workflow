import { apiRequest } from './api-client';

export type ReportType =
  | 'complaint'
  | 'sla'
  | 'asset_usage'
  | 'aging'
  | 'technician'
  | 'sparepart';

export type ReportPeriod = 'month' | 'year';

export interface AppReport {
  appCode: string;
  reportType: ReportType;
  period?: ReportPeriod;
  periodLabel?: string;
  year?: number;
  month?: number | null;
  generatedAt: string;
  summary: Record<string, number>;
  buckets?: { label: string; count: number }[];
  byPriority?: { priority: string; count: number }[];
  byProcess?: { process: string; count: number }[];
  monthlyBreakdown?: Record<string, unknown>[];
  items: unknown[];
}

export interface ReportQuery {
  type: ReportType;
  period?: ReportPeriod;
  year?: number;
  month?: number;
  days?: number;
}

export function getAppReport(appCode: string, query: ReportQuery) {
  const params = new URLSearchParams({ type: query.type });
  if (query.period) params.set('period', query.period);
  if (query.year) params.set('year', String(query.year));
  if (query.month) params.set('month', String(query.month));
  if (query.days) params.set('days', String(query.days));
  return apiRequest<AppReport>(`/report/${appCode}?${params.toString()}`);
}
