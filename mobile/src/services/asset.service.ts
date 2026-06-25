import { apiRequest } from './api-client';

export interface AssetItem {
  id: string;
  assetCode: string;
  name: string;
  category: string;
  locationCode: string | null;
  status: string;
}

export function listAssets(token: string, category?: string): Promise<AssetItem[]> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  return apiRequest<AssetItem[]>(`/asset${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
