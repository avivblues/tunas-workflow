import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/atoms/Badge';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';
import { AssetSelector } from '../../components/molecules/AssetSelector';
import { ConfirmSaveModal } from '../../components/molecules/ConfirmSaveModal';
import { FormFeedback } from '../../components/molecules/FormFeedback';
import {
  createPmSchedule,
  listPmSchedules,
  runDuePmSchedules,
  type PmSchedule,
} from '../../services/pm-schedule.service';
import { listUsers, type User } from '../../services/master.service';
import { getErrorMessage } from '../../services/api-client';

export function PmScheduleListPage() {
  const [schedules, setSchedules] = useState<PmSchedule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'WEEKLY' | 'MONTHLY' | 'QUARTERLY'>('MONTHLY');
  const [assetId, setAssetId] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [checklistText, setChecklistText] = useState(
    'Inspect equipment\nCheck lubrication\nClean work area',
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function load() {
    const [s, u] = await Promise.all([listPmSchedules(), listUsers()]);
    setSchedules(s);
    setUsers(u);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  function handleReview(e: FormEvent) {
    e.preventDefault();
    setError('');
    const checklist = checklistText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (checklist.length === 0) {
      setError('Minimal satu item checklist');
      return;
    }
    setConfirmOpen(true);
  }

  async function handleConfirmCreate() {
    setLoading(true);
    setError('');
    try {
      const checklist = checklistText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      await createPmSchedule({
        title,
        description,
        asset_id: assetId || undefined,
        frequency,
        assign_to: assignTo || undefined,
        checklist,
        next_run_at: new Date().toISOString(),
      });
      setMessage(`Jadwal PM "${title}" berhasil dibuat`);
      setConfirmOpen(false);
      setShowForm(false);
      setTitle('');
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal membuat jadwal'));
    } finally {
      setLoading(false);
    }
  }

  async function handleRunDue() {
    const result = await runDuePmSchedules();
    setMessage(`Processed ${result.processed} due schedule(s)`);
    await load();
  }

  return (
    <div>
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div>
          <h1>📋 PM Schedules</h1>
          <p>Configure preventive maintenance recurring schedules</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/engineering/pm-calendar">
            <Button variant="secondary">PM Calendar</Button>
          </Link>
          <Button variant="secondary" onClick={handleRunDue}>
            Run Due Now
          </Button>
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : 'New Schedule'}
          </Button>
        </div>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <Card title="Create PM Schedule">
          <form onSubmit={handleReview} className="form-grid">
            <FormFeedback error={error && !confirmOpen ? error : ''} />
            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <AssetSelector
              label="Asset"
              value={assetId}
              category="FIXED_ASSET"
              required
              onChange={(id) => setAssetId(id)}
            />
            <div className="input-group">
              <label className="input-label">Frequency</label>
              <select
                className="input-field"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as typeof frequency)}
              >
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Assign Technician</label>
              <select
                className="input-field"
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
              >
                <option value="">— Optional —</option>
                {users
                  .filter((u) => u.role?.code === 'TECHNICIAN')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName}
                    </option>
                  ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Description</label>
              <textarea
                className="input-field"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Checklist Items (one per line)</label>
              <textarea
                className="input-field"
                rows={5}
                value={checklistText}
                onChange={(e) => setChecklistText(e.target.value)}
                required
              />
            </div>
            <div className="form-actions">
              <Button type="submit">Lanjut Konfirmasi →</Button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Active Schedules">
        {schedules.length === 0 ? (
          <p style={{ color: '#64748b' }}>No PM schedules yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Asset</th>
                <th>Frequency</th>
                <th>Next Run</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td>{s.title}</td>
                  <td>{s.asset?.assetCode ?? '—'}</td>
                  <td>{s.frequency}</td>
                  <td>{new Date(s.nextRunAt).toLocaleString()}</td>
                  <td>
                    <Badge variant={s.active ? 'success' : 'default'}>
                      {s.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <ConfirmSaveModal
        open={confirmOpen}
        title="Buat Jadwal PM"
        summary={
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            <li>
              Judul: <strong>{title}</strong>
            </li>
            <li>Frekuensi: {frequency}</li>
            {description && <li>Deskripsi: {description}</li>}
          </ul>
        }
        busy={loading}
        error={error}
        onConfirm={() => void handleConfirmCreate()}
        onCancel={() => {
          if (!loading) setConfirmOpen(false);
        }}
      />
    </div>
  );
}
