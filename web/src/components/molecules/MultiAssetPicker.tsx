import { useEffect, useState } from 'react';
import { listAssets, type Asset } from '../../services/asset.service';
import { Button } from '../atoms/Button';

export interface AssetLineItem {
  assetId: string;
  qty: number;
}

interface MultiAssetPickerProps {
  label: string;
  category: 'SPAREPART' | 'TOOL';
  items: AssetLineItem[];
  onChange: (items: AssetLineItem[]) => void;
  withQty?: boolean;
}

export function MultiAssetPicker({
  label,
  category,
  items,
  onChange,
  withQty = false,
}: MultiAssetPickerProps) {
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    listAssets(category).then(setAssets).catch(console.error);
  }, [category]);

  function addRow() {
    onChange([...items, { assetId: '', qty: 1 }]);
  }

  function updateRow(index: number, patch: Partial<AssetLineItem>) {
    onChange(items.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      {items.length === 0 ? (
        <p className="field-hint" style={{ marginBottom: '0.5rem' }}>
          Belum ada {category === 'SPAREPART' ? 'sparepart' : 'alat'} dipilih.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.5rem' }}>
          {items.map((row, index) => (
            <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                className="input-field"
                style={{ flex: 1 }}
                value={row.assetId}
                onChange={(e) => updateRow(index, { assetId: e.target.value })}
              >
                <option value="">— Pilih —</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.assetCode} — {a.name}
                  </option>
                ))}
              </select>
              {withQty && (
                <input
                  className="input-field"
                  type="number"
                  min={1}
                  style={{ width: 72 }}
                  value={row.qty}
                  onChange={(e) => updateRow(index, { qty: Number(e.target.value) || 1 })}
                />
              )}
              <Button type="button" variant="ghost" onClick={() => removeRow(index)}>
                ✕
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="secondary" onClick={addRow}>
        + Tambah {category === 'SPAREPART' ? 'Sparepart' : 'Alat'}
      </Button>
    </div>
  );
}
