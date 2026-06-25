import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Badge } from '../../components/atoms/Badge';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';
import { ConfirmSaveModal } from '../../components/molecules/ConfirmSaveModal';
import type { AppDetail } from '../../services/app.service';
import {
  addProcess,
  addRouting,
  deleteProcess,
  deleteRouting,
  listAppConfig,
} from '../../services/app.service';
import { listRoles, type Role } from '../../services/master.service';
import { getErrorMessage } from '../../services/api-client';
import './admin-settings.css';

interface AppProcessPanelProps {
  selectedAppId: string | null;
}

export function AppProcessPanel({ selectedAppId }: AppProcessPanelProps) {
  const [apps, setApps] = useState<AppDetail[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showProcessForm, setShowProcessForm] = useState(false);
  const [showRoutingForm, setShowRoutingForm] = useState(false);
  const [processForm, setProcessForm] = useState({
    processCode: '',
    name: '',
    sequence: 0,
    isFinal: false,
  });
  const [routingForm, setRoutingForm] = useState({
    fromProcess: '',
    toProcess: '',
    roleCode: '',
  });
  const [confirmKind, setConfirmKind] = useState<'process' | 'routing' | null>(null);
  const [saving, setSaving] = useState(false);

  const selected = apps.find((a) => a.id === selectedAppId);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [appData, roleRows] = await Promise.all([listAppConfig(), listRoles()]);
      setApps(appData);
      setRoles(roleRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat konfigurasi');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  useEffect(() => {
    if (selected) {
      const nextSeq =
        selected.process.length > 0
          ? Math.max(...selected.process.map((p) => p.sequence)) + 10
          : 10;
      setProcessForm((f) => ({ ...f, sequence: nextSeq }));
    }
  }, [selectedAppId, selected?.process.length]);

  function handleAddProcess(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError('');
    setConfirmKind('process');
  }

  function handleAddRouting(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError('');
    setConfirmKind('routing');
  }

  async function handleConfirmSave() {
    if (!selected || !confirmKind) return;
    setSaving(true);
    setError('');
    try {
      if (confirmKind === 'process') {
        await addProcess(selected.id, processForm);
        setMessage('Langkah proses berhasil ditambahkan');
        setProcessForm({ processCode: '', name: '', sequence: processForm.sequence + 10, isFinal: false });
        setShowProcessForm(false);
      } else {
        await addRouting(selected.id, {
          fromProcess: routingForm.fromProcess,
          toProcess: routingForm.toProcess,
          roleCode: routingForm.roleCode || undefined,
        });
        setMessage('Aturan routing berhasil ditambahkan');
        setRoutingForm({ fromProcess: '', toProcess: '', roleCode: '' });
        setShowRoutingForm(false);
      }
      setConfirmKind(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menyimpan'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProcess(processId: string, name: string) {
    if (!selected) return;
    if (!window.confirm(`Hapus langkah proses "${name}"?`)) return;
    await deleteProcess(selected.id, processId);
    setMessage('Proses dihapus');
    await load();
  }

  async function handleDeleteRouting(routingId: string) {
    if (!selected) return;
    if (!window.confirm('Hapus aturan routing ini?')) return;
    await deleteRouting(selected.id, routingId);
    setMessage('Routing dihapus');
    await load();
  }

  if (loading) {
    return <p style={{ color: '#64748b' }}>Memuat konfigurasi aplikasi...</p>;
  }

  if (!selected) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
        Pilih aplikasi di atas untuk mengatur proses dan routing.
      </div>
    );
  }

  const sortedProcess = [...selected.process].sort((a, b) => a.sequence - b.sequence);
  const processCodes = sortedProcess.map((p) => p.processCode);

  return (
    <div>
      {message && (
        <div className="alert alert-success" role="status">
          {message}
          <button
            type="button"
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setMessage('')}
          >
            ✕
          </button>
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="admin-help-box">
        <strong>Proses & Routing — {selected.name}</strong>
        <p style={{ margin: '0.35rem 0 0' }}>
          <strong>Proses</strong> adalah tahapan alur kerja (mis. REQUEST → ASSIGN → CLOSE).{' '}
          <strong>Routing</strong> menentukan transisi antar tahap dan role yang diizinkan. Jangan
          hardcode approval di kode — semua aturan dikonfigurasi di sini.
        </p>
      </div>

      <Card title={`Info Aplikasi — ${selected.appCode}`}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Badge variant={selected.active ? 'success' : 'default'}>
            {selected.active ? 'Aktif' : 'Nonaktif'}
          </Badge>
          {selected.dashboard && <Badge variant="info">Dashboard: {selected.dashboard}</Badge>}
          {selected.icon && <Badge variant="default">Ikon: {selected.icon}</Badge>}
        </div>
      </Card>

      <Card
        title="Alur Proses"
        actions={
          <Button variant="secondary" onClick={() => setShowProcessForm(!showProcessForm)}>
            {showProcessForm ? 'Tutup' : '+ Tambah Langkah'}
          </Button>
        }
      >
        {sortedProcess.length > 0 && (
          <div className="process-flow">
            {sortedProcess.map((p, i) => (
              <span key={p.id} style={{ display: 'contents' }}>
                {i > 0 && <span className="process-flow-arrow">→</span>}
                <span className={`process-flow-step ${p.isFinal ? 'final' : ''}`}>
                  <code>{p.processCode}</code>
                  <span>{p.name}</span>
                  {p.isFinal && <span title="Proses akhir">🏁</span>}
                </span>
              </span>
            ))}
          </div>
        )}

        {showProcessForm && (
          <form onSubmit={handleAddProcess} className="form-grid" style={{ marginBottom: '1.25rem', maxWidth: '100%' }}>
            <div>
              <Input
                label="Kode Proses"
                value={processForm.processCode}
                onChange={(e) =>
                  setProcessForm({ ...processForm, processCode: e.target.value.toUpperCase() })
                }
                placeholder="VERIFY"
                required
              />
              <p className="field-hint">Huruf besar, unik. Contoh: REQUEST, ASSIGN, CLOSE</p>
            </div>
            <Input
              label="Nama Tampilan"
              value={processForm.name}
              onChange={(e) => setProcessForm({ ...processForm, name: e.target.value })}
              placeholder="Verifikasi Manager"
              required
            />
            <Input
              label="Urutan"
              type="number"
              value={processForm.sequence}
              onChange={(e) =>
                setProcessForm({ ...processForm, sequence: Number(e.target.value) })
              }
            />
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={processForm.isFinal}
                onChange={(e) => setProcessForm({ ...processForm, isFinal: e.target.checked })}
              />
              Proses akhir (final) — transaksi bisa ditutup di tahap ini
            </label>
            <div className="form-actions">
              <Button type="submit">Lanjut Konfirmasi →</Button>
              <Button type="button" variant="secondary" onClick={() => setShowProcessForm(false)}>
                Batal
              </Button>
            </div>
          </form>
        )}

        <table className="data-table">
          <thead>
            <tr>
              <th>Urutan</th>
              <th>Kode</th>
              <th>Nama</th>
              <th>Final</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedProcess.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ color: '#64748b' }}>
                  Belum ada langkah proses.
                </td>
              </tr>
            ) : (
              sortedProcess.map((p) => (
                <tr key={p.id}>
                  <td>{p.sequence}</td>
                  <td>
                    <code>{p.processCode}</code>
                  </td>
                  <td>{p.name}</td>
                  <td>{p.isFinal ? '✓ Akhir' : '—'}</td>
                  <td>
                    <Button
                      variant="ghost"
                      onClick={() => handleDeleteProcess(p.id, p.name)}
                    >
                      Hapus
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Card
        title="Aturan Routing (Transisi)"
        actions={
          <Button
            variant="secondary"
            onClick={() => setShowRoutingForm(!showRoutingForm)}
            disabled={processCodes.length < 2}
          >
            {showRoutingForm ? 'Tutup' : '+ Tambah Routing'}
          </Button>
        }
      >
        {processCodes.length < 2 && (
          <p className="field-hint" style={{ marginBottom: '1rem' }}>
            Tambahkan minimal 2 langkah proses sebelum membuat routing.
          </p>
        )}

        {selected.routing.length > 0 && (
          <div className="routing-visual">
            {selected.routing.map((r) => (
              <div key={r.id} className="routing-row">
                <code>{r.fromProcess}</code>
                <span className="routing-arrow">→</span>
                <code>{r.toProcess}</code>
                {r.roleCode && (
                  <span style={{ marginLeft: 'auto' }}>
                    <Badge variant="warning">Role: {r.roleCode}</Badge>
                  </span>
                )}
                <Button variant="ghost" onClick={() => handleDeleteRouting(r.id)}>
                  Hapus
                </Button>
              </div>
            ))}
          </div>
        )}

        {showRoutingForm && (
          <form onSubmit={handleAddRouting} className="form-grid" style={{ marginBottom: '1.25rem', maxWidth: '100%' }}>
            <div className="input-group">
              <label className="input-label">Dari Proses</label>
              <select
                className="input-field"
                value={routingForm.fromProcess}
                onChange={(e) => setRoutingForm({ ...routingForm, fromProcess: e.target.value })}
                required
              >
                <option value="">— Pilih —</option>
                {processCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Ke Proses</label>
              <select
                className="input-field"
                value={routingForm.toProcess}
                onChange={(e) => setRoutingForm({ ...routingForm, toProcess: e.target.value })}
                required
              >
                <option value="">— Pilih —</option>
                {processCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Role Wajib (opsional)</label>
              <select
                className="input-field"
                value={routingForm.roleCode}
                onChange={(e) => setRoutingForm({ ...routingForm, roleCode: e.target.value })}
              >
                <option value="">Semua role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.code}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
              <p className="field-hint">
                Jika diisi, hanya user dengan role ini yang bisa melakukan transisi
              </p>
            </div>
            <div className="form-actions">
              <Button type="submit">Lanjut Konfirmasi →</Button>
              <Button type="button" variant="secondary" onClick={() => setShowRoutingForm(false)}>
                Batal
              </Button>
            </div>
          </form>
        )}

        <table className="data-table">
          <thead>
            <tr>
              <th>Dari</th>
              <th>Ke</th>
              <th>Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {selected.routing.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ color: '#64748b' }}>
                  Belum ada aturan routing.
                </td>
              </tr>
            ) : (
              selected.routing.map((r) => (
                <tr key={r.id}>
                  <td>
                    <code>{r.fromProcess}</code>
                  </td>
                  <td>
                    <code>{r.toProcess}</code>
                  </td>
                  <td>{r.roleCode ?? 'Semua role'}</td>
                  <td>
                    <Button variant="ghost" onClick={() => handleDeleteRouting(r.id)}>
                      Hapus
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <ConfirmSaveModal
        open={confirmKind !== null}
        title={confirmKind === 'process' ? 'Tambah Langkah Proses' : 'Tambah Aturan Routing'}
        summary={
          confirmKind === 'process' ? (
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              <li>
                Kode: <strong>{processForm.processCode}</strong>
              </li>
              <li>
                Nama: <strong>{processForm.name}</strong>
              </li>
              <li>Urutan: {processForm.sequence}</li>
              <li>Final: {processForm.isFinal ? 'Ya' : 'Tidak'}</li>
            </ul>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              <li>
                {routingForm.fromProcess} → {routingForm.toProcess}
              </li>
              <li>Role: {routingForm.roleCode || 'Semua role'}</li>
            </ul>
          )
        }
        busy={saving}
        error={confirmKind !== null ? error : ''}
        onConfirm={() => void handleConfirmSave()}
        onCancel={() => {
          if (!saving) {
            setConfirmKind(null);
            setError('');
          }
        }}
      />
    </div>
  );
}
