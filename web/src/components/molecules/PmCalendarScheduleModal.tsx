import { useEffect, useState } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { AssetSelector } from './AssetSelector';
import { listUsers, type User } from '../../services/master.service';
import {
  createPmSchedule,
  listPmSchedules,
  updatePmSchedule,
  type PmSchedule,
} from '../../services/pm-schedule.service';

export type PmCalendarModalMode =
  | { type: 'create'; day: number; month: number; year: number }
  | { type: 'reschedule'; scheduleId: string; day: number; month: number; year: number };

const DEFAULT_CHECKLIST = 'Inspect equipment\nCheck lubrication\nClean work area';

function toLocalDateTimeValue(year: number, month: number, day: number, hours = 8, minutes = 0) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}`;
}

function formatPreview(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PmCalendarScheduleModal({
  mode,
  onClose,
  onSuccess,
}: {
  mode: PmCalendarModalMode;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [existing, setExisting] = useState<PmSchedule | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'WEEKLY' | 'MONTHLY' | 'QUARTERLY'>('MONTHLY');
  const [assetId, setAssetId] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [checklistText, setChecklistText] = useState(DEFAULT_CHECKLIST);
  const [runAtLocal, setRunAtLocal] = useState('');
  const [catatan, setCatatan] = useState('');
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isCreate = mode.type === 'create';
  const isReschedule = mode.type === 'reschedule';

  useEffect(() => {
    listUsers().then(setUsers).catch(console.error);
  }, []);

  useEffect(() => {
    setStep('form');
    setError('');
    setCatatan('');
    setRunAtLocal(toLocalDateTimeValue(mode.year, mode.month, mode.day));

    if (mode.type === 'create') {
      setTitle('');
      setDescription('');
      setFrequency('MONTHLY');
      setAssetId('');
      setAssignTo('');
      setChecklistText(DEFAULT_CHECKLIST);
      setExisting(null);
      return;
    }

    listPmSchedules()
      .then((items) => {
        const schedule = items.find((s) => s.id === mode.scheduleId) ?? null;
        setExisting(schedule);
        if (schedule) {
          setTitle(schedule.title);
          setDescription(schedule.description ?? '');
          setFrequency(schedule.frequency as typeof frequency);
          setAssetId(schedule.assetId ?? '');
          setAssignTo(schedule.assignTo ?? '');
          setChecklistText(
            schedule.checklist?.length ? schedule.checklist.join('\n') : DEFAULT_CHECKLIST,
          );
          const current = new Date(schedule.nextRunAt);
          setRunAtLocal(
            toLocalDateTimeValue(
              mode.year,
              mode.month,
              mode.day,
              current.getHours(),
              current.getMinutes(),
            ),
          );
        }
      })
      .catch(console.error);
  }, [mode]);

  function validateForm(): string | null {
    if (isCreate && !title.trim()) return 'Judul wajib diisi';
    if (isCreate && !assetId) return 'Pilih asset terlebih dahulu';
    if (!runAtLocal) return 'Tanggal & waktu jadwal wajib diisi';
    const runDate = new Date(runAtLocal);
    if (Number.isNaN(runDate.getTime())) return 'Format tanggal tidak valid';
    if (isCreate) {
      const checklist = checklistText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      if (checklist.length === 0) return 'Minimal satu item checklist';
    }
    if (isReschedule && !catatan.trim()) return 'Catatan wajib diisi untuk reschedule';
    return null;
  }

  function handleReview() {
    const err = validateForm();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setStep('confirm');
  }

  async function handleConfirm() {
    const err = validateForm();
    if (err) {
      setError(err);
      setStep('form');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const nextRunAt = new Date(runAtLocal).toISOString();

      if (isCreate) {
        const checklist = checklistText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        await createPmSchedule({
          title: title.trim(),
          description: catatan.trim()
            ? `${description}\n\n[Catatan] ${catatan.trim()}`.trim()
            : description || undefined,
          asset_id: assetId,
          frequency,
          assign_to: assignTo || undefined,
          checklist,
          next_run_at: nextRunAt,
        });
        onSuccess(`Jadwal PM "${title}" dibuat untuk ${formatPreview(nextRunAt)}`);
      } else if (existing) {
        const note = `[Reschedule ${new Date().toLocaleDateString('id-ID')}] ${catatan.trim()}`;
        const mergedDescription = [existing.description, note].filter(Boolean).join('\n');
        await updatePmSchedule(existing.id, {
          next_run_at: nextRunAt,
          description: mergedDescription,
        });
        onSuccess(`"${existing.title}" dijadwalkan ulang ke ${formatPreview(nextRunAt)}`);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
      setStep('form');
    } finally {
      setBusy(false);
    }
  }

  const previewIso = runAtLocal ? new Date(runAtLocal).toISOString() : '';

  return (
    <div className="pm-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="pm-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pm-modal-title"
      >
        <h2 id="pm-modal-title" style={{ margin: '0 0 0.5rem' }}>
          {isCreate ? 'Tambah Jadwal PM' : 'Reschedule Jadwal PM'}
        </h2>
        <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.9rem' }}>
          {step === 'form'
            ? 'Isi data jadwal lalu lanjut ke konfirmasi.'
            : 'Periksa ringkasan sebelum menyimpan.'}
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        {step === 'form' ? (
          <div className="form-grid">
            {isCreate ? (
              <>
                <Input label="Judul PM" value={title} onChange={(e) => setTitle(e.target.value)} required />
                <AssetSelector
                  label="Asset"
                  value={assetId}
                  category="FIXED_ASSET"
                  required
                  onChange={setAssetId}
                />
                <label className="input-group">
                  <span className="input-label">Frekuensi</span>
                  <select
                    className="input-field"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as typeof frequency)}
                  >
                    <option value="WEEKLY">Mingguan</option>
                    <option value="MONTHLY">Bulanan</option>
                    <option value="QUARTERLY">Triwulan</option>
                  </select>
                </label>
                <label className="input-group">
                  <span className="input-label">Teknisi (opsional)</span>
                  <select
                    className="input-field"
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                  >
                    <option value="">— Pilih —</option>
                    {users
                      .filter((u) => u.role?.code === 'TECHNICIAN')
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="input-group">
                  <span className="input-label">Deskripsi</span>
                  <textarea
                    className="input-field"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>
                <label className="input-group">
                  <span className="input-label">Checklist (satu per baris)</span>
                  <textarea
                    className="input-field"
                    rows={4}
                    value={checklistText}
                    onChange={(e) => setChecklistText(e.target.value)}
                    required
                  />
                </label>
              </>
            ) : (
              <>
                <div className="input-group">
                  <span className="input-label">Jadwal</span>
                  <div style={{ fontWeight: 600 }}>{existing?.title ?? '…'}</div>
                  {existing?.asset && (
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {existing.asset.assetCode} — {existing.asset.name}
                    </div>
                  )}
                </div>
                <div className="input-group">
                  <span className="input-label">Jadwal sebelumnya</span>
                  <div style={{ fontSize: '0.9rem' }}>
                    {existing ? formatPreview(existing.nextRunAt) : '—'}
                  </div>
                </div>
              </>
            )}

            <Input
              label="Tanggal & waktu jadwal"
              type="datetime-local"
              value={runAtLocal}
              onChange={(e) => setRunAtLocal(e.target.value)}
              required
            />

            <label className="input-group">
              <span className="input-label">
                Catatan {isReschedule ? '*' : '(opsional)'}
              </span>
              <textarea
                className="input-field"
                rows={2}
                placeholder={
                  isReschedule
                    ? 'Alasan reschedule, mis. mesin belum siap, cuaca, dll.'
                    : 'Catatan tambahan untuk jadwal ini'
                }
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
              />
            </label>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <Button type="button" variant="secondary" onClick={onClose}>
                Batal
              </Button>
              <Button type="button" onClick={handleReview}>
                Lanjut Konfirmasi →
              </Button>
            </div>
          </div>
        ) : (
          <div className="form-grid">
            <div className="pm-confirm-box">
              <strong>Ringkasan</strong>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
                {isCreate ? (
                  <>
                    <li>
                      Judul: <strong>{title}</strong>
                    </li>
                    <li>Frekuensi: {frequency}</li>
                  </>
                ) : (
                  <li>
                    Jadwal: <strong>{existing?.title}</strong>
                  </li>
                )}
                <li>
                  Waktu baru: <strong>{previewIso ? formatPreview(previewIso) : '—'}</strong>
                </li>
                {catatan.trim() && (
                  <li>
                    Catatan: <em>{catatan.trim()}</em>
                  </li>
                )}
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <Button type="button" variant="secondary" onClick={() => setStep('form')} disabled={busy}>
                ← Ubah
              </Button>
              <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
                Batal
              </Button>
              <Button type="button" onClick={handleConfirm} disabled={busy}>
                {busy ? 'Menyimpan…' : 'Konfirmasi'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
