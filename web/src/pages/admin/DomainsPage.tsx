import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Badge } from '../../components/atoms/Badge';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';
import { ConfirmSaveModal } from '../../components/molecules/ConfirmSaveModal';
import { FormFeedback } from '../../components/molecules/FormFeedback';
import type { DomainNode } from '../../services/master.service';
import { createDomain, listDomains } from '../../services/master.service';
import { getErrorMessage } from '../../services/api-client';

export function DomainsPage() {
  const [domains, setDomains] = useState<DomainNode[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    domainCode: '',
    name: '',
    type: 'LOCATION' as 'LOCATION' | 'ZONE' | 'DEPARTMENT',
    parentId: '',
    latitude: '',
    longitude: '',
  });
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    setDomains(await listDomains());
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  function handleReview(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setConfirmOpen(true);
  }

  async function handleConfirmSave() {
    setLoading(true);
    setFormError('');
    try {
      await createDomain({
        domainCode: form.domainCode,
        name: form.name,
        type: form.type,
        parentId: form.parentId || undefined,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
      });
      setMessage(`Domain "${form.name}" berhasil dibuat`);
      setConfirmOpen(false);
      setShowForm(false);
      setForm({ domainCode: '', name: '', type: 'LOCATION', parentId: '', latitude: '', longitude: '' });
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Gagal membuat domain'));
    } finally {
      setLoading(false);
    }
  }

  const typeVariant: Record<string, 'info' | 'warning' | 'default'> = {
    LOCATION: 'info',
    ZONE: 'warning',
    DEPARTMENT: 'default',
  };

  const parentLabel = domains.find((d) => d.id === form.parentId);

  return (
    <div>
      <div className="page-header">
        <h1>Domain Hierarchy</h1>
        <p>Manage tenant locations and zones (domain_code)</p>
      </div>

      {message && <div className="alert alert-success">{message}</div>}

      <Card
        title="Domain Nodes"
        actions={
          <Button variant="secondary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Add Domain'}
          </Button>
        }
      >
        {showForm && (
          <form onSubmit={handleReview} className="form-grid" style={{ marginBottom: '1.5rem' }}>
            <FormFeedback error={formError} />
            <Input
              label="Domain Code"
              value={form.domainCode}
              onChange={(e) => setForm({ ...form, domainCode: e.target.value })}
              placeholder="01.L01.Z01"
              required
            />
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <div className="input-group">
              <label className="input-label">Type</label>
              <select
                className="input-field"
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as typeof form.type })
                }
              >
                <option value="LOCATION">Location</option>
                <option value="ZONE">Zone</option>
                <option value="DEPARTMENT">Department</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Parent Domain</label>
              <select
                className="input-field"
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              >
                <option value="">— No parent (root) —</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.domainCode} — {d.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Latitude (optional, for map)"
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              placeholder="-6.2088"
            />
            <Input
              label="Longitude (optional, for map)"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              placeholder="106.8456"
            />
            <div className="form-actions">
              <Button type="submit">Lanjut Konfirmasi →</Button>
            </div>
          </form>
        )}

        <table className="data-table">
          <thead>
            <tr>
              <th>Domain Code</th>
              <th>Name</th>
              <th>Type</th>
              <th>Coordinates</th>
            </tr>
          </thead>
          <tbody>
            {domains.map((d) => (
              <tr key={d.id}>
                <td>
                  <code>{d.domainCode}</code>
                </td>
                <td>{d.name}</td>
                <td>
                  <Badge variant={typeVariant[d.type] ?? 'default'}>{d.type}</Badge>
                </td>
                <td>
                  {d.latitude != null && d.longitude != null
                    ? `${d.latitude.toFixed(4)}, ${d.longitude.toFixed(4)}`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <ConfirmSaveModal
        open={confirmOpen}
        title="Buat Domain Baru"
        summary={
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            <li>
              Kode: <strong>{form.domainCode}</strong>
            </li>
            <li>
              Nama: <strong>{form.name}</strong>
            </li>
            <li>Tipe: {form.type}</li>
            {parentLabel && (
              <li>
                Parent: {parentLabel.domainCode} — {parentLabel.name}
              </li>
            )}
          </ul>
        }
        busy={loading}
        error={formError}
        onConfirm={() => void handleConfirmSave()}
        onCancel={() => {
          if (!loading) setConfirmOpen(false);
        }}
      />
    </div>
  );
}
