import { apiRequest } from './api-client';

export interface PmSchedule {
  id: string;
  title: string;
  description: string | null;
  assetId: string | null;
  domainCode: string | null;
  frequency: string;
  nextRunAt: string;
  lastRunAt: string | null;
  assignTo: string | null;
  checklist: string[];
  active: boolean;
  asset?: {
    id: string;
    assetCode: string;
    name: string;
  } | null;
}

export interface PmCalendar {
  from: string;
  to: string;
  schedules: {
    id: string;
    title: string;
    frequency: string;
    nextRunAt: string;
    assetCode: string | null;
    assetName: string | null;
    domainCode: string | null;
  }[];
  pmTasks: {
    id: string;
    trxNo: string;
    status: string;
    currentProcess: string;
    scheduledAt: string;
    domainCode: string | null;
  }[];
}

export interface PmCompliance {
  activeSchedules: number;
  overdueSchedules: number;
  pmOpen: number;
  pmCompletedThisMonth: number;
  complianceRate: number;
}

export function listPmSchedules() {
  return apiRequest<PmSchedule[]>('/pm-schedule');
}

export function createPmSchedule(data: {
  title: string;
  description?: string;
  asset_id?: string;
  domain_code?: string;
  frequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  next_run_at?: string;
  assign_to?: string;
  checklist: string[];
}) {
  return apiRequest<PmSchedule>('/pm-schedule', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updatePmSchedule(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    active: boolean;
    next_run_at: string;
    checklist: string[];
  }>,
) {
  return apiRequest<PmSchedule>(`/pm-schedule/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function getPmCalendar(from?: string, to?: string) {
  const qs = new URLSearchParams();
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  const query = qs.toString();
  return apiRequest<PmCalendar>(`/pm-schedule/calendar${query ? `?${query}` : ''}`);
}

export function getPmCompliance() {
  return apiRequest<PmCompliance>('/pm-schedule/compliance');
}

export function runDuePmSchedules() {
  return apiRequest<{ processed: number }>('/pm-schedule/run-due', { method: 'POST' });
}
