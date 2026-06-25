import { useEffect, useState } from 'react';
import { listAssets, type Asset } from '../../services/asset.service';

interface AssetSelectorProps {
  label: string;
  value: string;
  onChange: (assetId: string, asset?: Asset) => void;
  category?: 'FIXED_ASSET' | 'SPAREPART' | 'TOOL';
  required?: boolean;
  placeholder?: string;
}

export function AssetSelector({
  label,
  value,
  onChange,
  category,
  required,
  placeholder = '— Select asset —',
}: AssetSelectorProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAssets(category)
      .then(setAssets)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="input-group">
      <label className="input-label">
        {label}
        {required && ' *'}
      </label>
      <select
        className="input-field"
        value={value}
        onChange={(e) => {
          const selected = assets.find((a) => a.id === e.target.value);
          onChange(e.target.value, selected);
        }}
        required={required}
        disabled={loading}
      >
        <option value="">{loading ? 'Loading...' : placeholder}</option>
        {assets.map((a) => (
          <option key={a.id} value={a.id}>
            {a.assetCode} — {a.name}
            {a.locationCode ? ` (${a.locationCode})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
