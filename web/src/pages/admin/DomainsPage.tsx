import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Badge } from '../../components/atoms/Badge';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';
import type { DomainNode } from '../../services/master.service';
import { createDomain, listDomains } from '../../services/master.service';

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

  async function load() {
    setDomains(await listDomains());
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await createDomain({
      domainCode: form.domainCode,
      name: form.name,
      type: form.type,
      parentId: form.parentId || undefined,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
    });
    setMessage('Domain created');
    setShowForm(false);
    setForm({ domainCode: '', name: '', type: 'LOCATION', parentId: '', latitude: '', longitude: '' });
    await load();
  }

  const typeVariant: Record<string, 'info' | 'warning' | 'default'> = {
    LOCATION: 'info',
    ZONE: 'warning',
    DEPARTMENT: 'default',
  };

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
          <form onSubmit={handleSubmit} className="form-grid" style={{ marginBottom: '1.5rem' }}>
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
            <Button type="submit">Create Domain</Button>
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
    </div>
  );
}
