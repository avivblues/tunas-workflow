import { apiRequest } from './api-client';

export interface Asset {
  id: string;
  assetCode: string;
  name: string;
  category: string;
  serialNo: string | null;
  locationCode: string | null;
  status: string;
}

export function listAssets(category?: string) {
  const qs = category ? `?category=${category}` : '';
  return apiRequest<Asset[]>(`/asset${qs}`);
}

export function linkTransactionAsset(
  transactionId: string,
  data: { asset_id: string; usage_type: 'AFFECTED' | 'SPAREPART' | 'TOOL'; qty?: number },
) {
  return apiRequest<unknown>(`/transaction/${transactionId}/asset`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
