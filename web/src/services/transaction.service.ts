import { apiRequest } from './api-client';

export interface TransactionHeader {
  id: string;
  trxNo: string;
  appCode: string;
  domainCode: string | null;
  currentProcess: string;
  priority: string | null;
  status: string;
  requestBy: string | null;
  assignTo: string | null;
  slaStatus: string | null;
  createdAt: string;
  closedAt: string | null;
  details?: TransactionDetail[];
}

export interface TransactionDetail {
  id: string;
  fieldCode: string;
  value: unknown;
}

export interface TransactionLog {
  id: string;
  process: string;
  userId: string | null;
  action: string;
  description: string | null;
  attachments: AttachmentMeta[] | null;
  metadata?: WorkLogMetadata | null;
  createdAt: string;
}

export interface WorkLogMetadata {
  spareparts?: { asset_id: string; asset_code?: string; name?: string; qty: number }[];
  tools?: { asset_id: string; asset_code?: string; name?: string }[];
  workers?: { user_id: string; full_name?: string }[];
}

export interface AttachmentMeta {
  key: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface TransactionAssetLink {
  id: string;
  assetId: string;
  usageType: string;
  qty: number | null;
  asset?: {
    id: string;
    assetCode: string;
    name: string;
    category: string;
    locationCode: string | null;
  };
}

export interface RemoteSupportInfo {
  provider: string;
  supportId: string;
  technicianId?: string;
  connectUrl: string;
  downloadUrl: string;
  message?: string;
}

export interface TransactionFull extends TransactionHeader {
  details: TransactionDetail[];
  logs: TransactionLog[];
  assets: TransactionAssetLink[];
  availableTransitions: string[];
  remoteSupport?: RemoteSupportInfo | null;
}

export interface TransactionListResponse {
  items: TransactionHeader[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function createTransaction(data: {
  app_code: string;
  domain_code?: string;
  priority?: string;
  data?: Record<string, unknown>;
  assign_to?: string;
  asset_links?: { asset_id: string; usage_type: 'AFFECTED' | 'SPAREPART' | 'TOOL'; qty?: number }[];
  attachments?: AttachmentMeta[];
}) {
  return apiRequest<TransactionFull>('/transaction', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function listTransactions(params?: {
  app_code?: string;
  status?: string;
  process?: string;
  page?: number;
  limit?: number;
  with_details?: boolean;
}) {
  const qs = new URLSearchParams();
  if (params?.app_code) qs.set('app_code', params.app_code);
  if (params?.status) qs.set('status', params.status);
  if (params?.process) qs.set('process', params.process);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.with_details) qs.set('with_details', 'true');
  const query = qs.toString();
  return apiRequest<TransactionListResponse>(`/transaction${query ? `?${query}` : ''}`);
}

export function getTransaction(id: string) {
  return apiRequest<TransactionFull>(`/transaction/${id}`);
}

export function transactionAction(
  id: string,
  data: {
    action: 'ADVANCE' | 'ASSIGN' | 'CLOSE' | 'REJECT';
    to_process?: string;
    assign_to?: string;
    comment?: string;
  },
) {
  return apiRequest<TransactionFull>(`/transaction/${id}/action`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function listPendingApprovals() {
  return apiRequest<TransactionHeader[]>('/transaction/pending-approval');
}

export function updatePmChecklist(
  id: string,
  checklist: { id: string; label: string; done: boolean }[],
) {
  return apiRequest<TransactionFull>(`/transaction/${id}/checklist`, {
    method: 'PATCH',
    body: JSON.stringify({ checklist }),
  });
}

export function addTransactionLog(
  id: string,
  data: {
    action: string;
    description?: string;
    attachments?: AttachmentMeta[];
    spareparts?: { asset_id: string; qty?: number }[];
    tools?: { asset_id: string }[];
    workers?: { user_id: string }[];
  },
) {
  return apiRequest<TransactionFull>(`/transaction/${id}/log`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
