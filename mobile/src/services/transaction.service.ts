import { apiRequest } from './api-client';

export interface TransactionHeader {
  id: string;
  trxNo: string;
  appCode: string;
  domainCode: string | null;
  currentProcess: string;
  priority: string | null;
  status: string;
  assignTo: string | null;
  slaStatus: string | null;
  createdAt: string;
  details?: { fieldCode: string; value: unknown }[];
}

export interface TransactionFull extends TransactionHeader {
  details: { fieldCode: string; value: unknown }[];
  logs: {
    id: string;
    process: string;
    action: string;
    description: string | null;
    createdAt: string;
  }[];
  availableTransitions: string[];
}

export interface TransactionListResponse {
  items: TransactionHeader[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function listTransactions(
  token: string,
  params?: {
    app_code?: string;
    status?: string;
    with_details?: boolean;
    limit?: number;
  },
): Promise<TransactionListResponse> {
  const qs = new URLSearchParams();
  if (params?.app_code) qs.set('app_code', params.app_code);
  if (params?.status) qs.set('status', params.status);
  if (params?.with_details) qs.set('with_details', 'true');
  if (params?.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return apiRequest<TransactionListResponse>(`/transaction${query ? `?${query}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getTransaction(token: string, id: string): Promise<TransactionFull> {
  return apiRequest<TransactionFull>(`/transaction/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createTransaction(
  token: string,
  data: {
    app_code: string;
    domain_code?: string;
    priority?: string;
    data?: Record<string, unknown>;
    asset_links?: { asset_id: string; usage_type: 'AFFECTED' | 'SPAREPART' | 'TOOL'; qty?: number }[];
  },
): Promise<TransactionFull> {
  return apiRequest<TransactionFull>('/transaction', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export function transactionAction(
  token: string,
  id: string,
  data: {
    action: 'ADVANCE' | 'ASSIGN' | 'CLOSE' | 'REJECT';
    to_process?: string;
    assign_to?: string;
    comment?: string;
  },
): Promise<TransactionFull> {
  return apiRequest<TransactionFull>(`/transaction/${id}/action`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export function addTransactionLog(
  token: string,
  id: string,
  data: { action: string; description?: string },
): Promise<TransactionFull> {
  return apiRequest<TransactionFull>(`/transaction/${id}/log`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export function listPendingApprovals(token: string): Promise<TransactionHeader[]> {
  return apiRequest<TransactionHeader[]>('/transaction/pending-approval', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function detailValue(
  details: { fieldCode: string; value: unknown }[] | undefined,
  key: string,
): string {
  const row = details?.find((d) => d.fieldCode === key);
  if (!row?.value) return '—';
  return typeof row.value === 'string' ? row.value : String(row.value);
}
