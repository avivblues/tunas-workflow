import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { AssetSelector } from '../molecules/AssetSelector';
import { DomainPicker } from '../molecules/DomainPicker';
import { PhotoUpload } from '../molecules/PhotoUpload';
import type { AppUiConfig } from '../../config/apps';
import { uploadAttachment } from '../../services/attachment.service';
import { createTransaction } from '../../services/transaction.service';

interface FormMeta {
  labels: Record<string, string>;
  assetLocations: Record<string, string | null>;
}

export function CreateTransactionPage({ config }: { config: AppUiConfig }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<Record<string, string>>({});
  const [meta, setMeta] = useState<FormMeta>({ labels: {}, assetLocations: {} });
  const [priority, setPriority] = useState('MEDIUM');
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let domain_code: string | undefined;
      const asset_links: {
        asset_id: string;
        usage_type: 'AFFECTED' | 'SPAREPART' | 'TOOL';
      }[] = [];
      const data: Record<string, unknown> = {};

      for (const field of config.fields) {
        if (field.type === 'domain-picker') {
          const code = form[field.key];
          if (code) {
            domain_code = code;
            data[field.key] = meta.labels[field.key] ?? code;
          }
        } else if (field.type === 'asset-picker') {
          const assetId = form[field.key];
          if (assetId) {
            asset_links.push({
              asset_id: assetId,
              usage_type: field.usageType ?? 'AFFECTED',
            });
            data[field.key] = meta.labels[field.key] ?? assetId;
          }
        } else {
          const raw = form[field.key];
          if (field.type === 'datetime' && raw) {
            data[field.key] = new Date(raw).toISOString();
          } else {
            data[field.key] = raw;
          }
        }
      }

      if (!domain_code && config.autoDomainFromAsset) {
        const firstAssetField = config.fields.find((f) => f.type === 'asset-picker');
        if (firstAssetField) {
          const loc = meta.assetLocations[firstAssetField.key];
          if (loc) domain_code = loc;
        }
      }

      const uploadedAttachments =
        photos.length > 0
          ? await Promise.all(photos.map((file) => uploadAttachment(file)))
          : [];

      const trx = await createTransaction({
        app_code: config.appCode,
        priority,
        domain_code,
        data,
        asset_links: asset_links.length > 0 ? asset_links : undefined,
        attachments:
          uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      });
      navigate(`/transactions/${trx.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>{config.createTitle}</h1>
        <p>{config.createSubtitle}</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <Card title="Details">
        <form onSubmit={handleSubmit} className="form-grid">
          {config.fields.map((field) => {
            if (field.type === 'domain-picker') {
              return (
                <DomainPicker
                  key={field.key}
                  label={field.label}
                  value={form[field.key] ?? ''}
                  domainType={field.domainType}
                  required={field.required}
                  placeholder={field.placeholder}
                  onChange={(code, domain) => {
                    setField(field.key, code);
                    if (domain) {
                      setMeta((prev) => ({
                        ...prev,
                        labels: { ...prev.labels, [field.key]: domain.name },
                      }));
                    }
                  }}
                />
              );
            }

            if (field.type === 'asset-picker') {
              return (
                <AssetSelector
                  key={field.key}
                  label={field.label}
                  value={form[field.key] ?? ''}
                  category={field.assetCategory}
                  required={field.required}
                  placeholder={field.placeholder}
                  onChange={(assetId, asset) => {
                    setField(field.key, assetId);
                    if (asset) {
                      setMeta((prev) => ({
                        labels: {
                          ...prev.labels,
                          [field.key]: asset.assetCode,
                        },
                        assetLocations: {
                          ...prev.assetLocations,
                          [field.key]: asset.locationCode,
                        },
                      }));
                    }
                  }}
                />
              );
            }

            if (field.type === 'textarea') {
              return (
                <div key={field.key} className="input-group">
                  <label className="input-label">{field.label}</label>
                  <textarea
                    className="input-field"
                    rows={4}
                    value={form[field.key] ?? ''}
                    onChange={(e) => setField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                </div>
              );
            }

            if (field.type === 'datetime') {
              return (
                <Input
                  key={field.key}
                  label={field.label}
                  type="datetime-local"
                  value={form[field.key] ?? ''}
                  onChange={(e) => setField(field.key, e.target.value)}
                  required={field.required}
                />
              );
            }

            if (field.type === 'select') {
              return (
                <div key={field.key} className="input-group">
                  <label className="input-label">{field.label}</label>
                  <select
                    className="input-field"
                    value={form[field.key] ?? field.options?.[0]?.value ?? ''}
                    onChange={(e) => setField(field.key, e.target.value)}
                    required={field.required}
                  >
                    {field.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            return (
              <Input
                key={field.key}
                label={field.label}
                value={form[field.key] ?? ''}
                onChange={(e) => setField(field.key, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
              />
            );
          })}
          <PhotoUpload files={photos} onChange={setPhotos} label="Request Photos" />
          <div className="input-group">
            <label className="input-label">Priority</label>
            <select
              className="input-field"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
          <div className="form-actions">
            <Button type="submit" loading={loading}>
              Submit
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(config.listPath)}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
