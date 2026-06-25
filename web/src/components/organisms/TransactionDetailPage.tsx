import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { AuthImage } from '../molecules/AuthImage';
import { MultiAssetPicker, type AssetLineItem } from '../molecules/MultiAssetPicker';
import { PhotoUpload } from '../molecules/PhotoUpload';
import { SLABadge } from '../molecules/SLABadge';
import { APP_UI_CONFIG, getAppIcon } from '../../config/apps';
import { useAuth } from '../../context/AuthContext';
import type { AttachmentMeta, TransactionFull, WorkLogMetadata } from '../../services/transaction.service';
import { uploadAttachment } from '../../services/attachment.service';
import {
  addTransactionLog,
  getTransaction,
  transactionAction,
  updatePmChecklist,
} from '../../services/transaction.service';
import { listUsers, type User } from '../../services/master.service';
import { AiInsightsPanel } from './AiInsightsPanel';

type DetailTab = 'overview' | 'timeline' | 'actions' | 'handover' | 'worklog' | 'ai';

function detailValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function collectAttachments(logs: TransactionFull['logs']): AttachmentMeta[] {
  const items: AttachmentMeta[] = [];
  for (const log of logs) {
    if (Array.isArray(log.attachments)) {
      for (const att of log.attachments) {
        if (att && typeof att === 'object' && 'url' in att) {
          items.push(att as AttachmentMeta);
        }
      }
    }
  }
  return items;
}

function resolveViewMode(
  roleCode: string | null | undefined,
  ticket: TransactionFull,
  userId?: string,
): 'client' | 'technician' | 'manager' {
  if (roleCode === 'TENANT_ADMIN' || roleCode === 'MANAGER') return 'manager';
  if (roleCode === 'TECHNICIAN' || ticket.assignTo === userId) return 'technician';
  return 'client';
}

function LogMetadataView({ metadata }: { metadata: WorkLogMetadata }) {
  return (
    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
      {metadata.workers && metadata.workers.length > 0 && (
        <div>
          <strong>Teknisi:</strong>{' '}
          {metadata.workers.map((w) => w.full_name ?? w.user_id).join(', ')}
        </div>
      )}
      {metadata.spareparts && metadata.spareparts.length > 0 && (
        <div>
          <strong>Sparepart:</strong>{' '}
          {metadata.spareparts
            .map((s) => `${s.asset_code ?? s.name} (×${s.qty})`)
            .join(', ')}
        </div>
      )}
      {metadata.tools && metadata.tools.length > 0 && (
        <div>
          <strong>Alat:</strong>{' '}
          {metadata.tools.map((t) => t.asset_code ?? t.name).join(', ')}
        </div>
      )}
    </div>
  );
}

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<TransactionFull | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [comment, setComment] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [handoverTo, setHandoverTo] = useState('');
  const [handoverNote, setHandoverNote] = useState('');
  const [workNote, setWorkNote] = useState('');
  const [workPhotos, setWorkPhotos] = useState<File[]>([]);
  const [spareparts, setSpareparts] = useState<AssetLineItem[]>([]);
  const [tools, setTools] = useState<AssetLineItem[]>([]);
  const [workerIds, setWorkerIds] = useState<string[]>([]);
  const [checklist, setChecklist] = useState<{ id: string; label: string; done: boolean }[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    if (!id) return;
    const [t, u] = await Promise.all([getTransaction(id), listUsers()]);
    setTicket(t);
    setUsers(u);
    if (user?.id && workerIds.length === 0) {
      setWorkerIds([user.id]);
    }
    const checklistDetail = t.details.find((d) => d.fieldCode === 'checklist');
    if (Array.isArray(checklistDetail?.value)) {
      setChecklist(checklistDetail.value as { id: string; label: string; done: boolean }[]);
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, [id]);

  const viewMode = ticket ? resolveViewMode(user?.roleCode, ticket, user?.id) : 'client';
  const isOpen = ticket?.status === 'OPEN';
  const technicians = users.filter((u) => u.role?.code === 'TECHNICIAN' && u.active);

  const tabs = useMemo(() => {
    const list: { id: DetailTab; label: string; hint: string }[] = [
      { id: 'overview', label: 'Ringkasan', hint: 'Detail tiket & aset' },
      { id: 'timeline', label: 'Timeline', hint: 'Riwayat aktivitas' },
    ];
    if (viewMode !== 'client' && isOpen) {
      if (ticket?.availableTransitions.length) {
        list.push({ id: 'actions', label: 'Aksi Proses', hint: 'Lanjutkan workflow' });
      }
      if (viewMode === 'technician' || viewMode === 'manager') {
        list.push({ id: 'handover', label: 'Handover', hint: 'Serah ke teknisi lain' });
        list.push({ id: 'worklog', label: 'Catatan Kerja', hint: 'Log pekerjaan lapangan' });
        list.push({ id: 'ai', label: 'AI Insights', hint: 'Root cause & saran perbaikan' });
      }
    }
    if (viewMode === 'manager' && isOpen && ticket?.currentProcess === 'REQUEST') {
      if (!list.some((t) => t.id === 'actions')) {
        list.push({ id: 'actions', label: 'Approval', hint: 'Assign & approve' });
      }
    }
    return list;
  }, [viewMode, isOpen, ticket?.availableTransitions.length, ticket?.currentProcess]);

  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTab)) {
      setActiveTab('overview');
    }
  }, [tabs, activeTab]);

  async function handleAdvance(toProcess?: string) {
    if (!id) return;
    setError('');
    try {
      await transactionAction(id, {
        action: 'ADVANCE',
        to_process: toProcess,
        comment: comment || undefined,
        assign_to: assignTo || undefined,
      });
      setMessage('Proses berhasil diperbarui');
      setComment('');
      setAssignTo('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aksi gagal');
    }
  }

  async function handleHandover() {
    if (!id || !handoverTo) return;
    setError('');
    try {
      await transactionAction(id, {
        action: 'ASSIGN',
        assign_to: handoverTo,
        comment: handoverNote || 'Handover ke teknisi lain',
      });
      setMessage('Handover berhasil');
      setHandoverTo('');
      setHandoverNote('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Handover gagal');
    }
  }

  async function handleWorkLog(e: FormEvent) {
    e.preventDefault();
    if (!id || !workNote) return;
    setError('');
    try {
      const attachments =
        workPhotos.length > 0
          ? await Promise.all(workPhotos.map((file) => uploadAttachment(file)))
          : undefined;

      const validSpareparts = spareparts.filter((s) => s.assetId);
      const validTools = tools.filter((t) => t.assetId);

      await addTransactionLog(id, {
        action: 'WORK_LOG',
        description: workNote,
        attachments,
        spareparts: validSpareparts.map((s) => ({ asset_id: s.assetId, qty: s.qty })),
        tools: validTools.map((t) => ({ asset_id: t.assetId })),
        workers: workerIds.map((user_id) => ({ user_id })),
      });

      setWorkNote('');
      setWorkPhotos([]);
      setSpareparts([]);
      setTools([]);
      setWorkerIds(user?.id ? [user.id] : []);
      setMessage('Catatan kerja berhasil ditambahkan');
      setActiveTab('timeline');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah catatan');
    }
  }

  function toggleWorker(userId: string) {
    setWorkerIds((prev) =>
      prev.includes(userId) ? prev.filter((wid) => wid !== userId) : [...prev, userId],
    );
  }

  async function handleChecklistToggle(itemId: string) {
    if (!id) return;
    const updated = checklist.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item,
    );
    setChecklist(updated);
    try {
      await updatePmChecklist(id, updated);
      setMessage('Checklist diperbarui');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui checklist');
    }
  }

  if (!ticket) {
    return <p>Memuat...</p>;
  }

  const appConfig = APP_UI_CONFIG[ticket.appCode];
  const listPath = appConfig?.listPath ?? '/';
  const titleDetail = ticket.details.find((d) => d.fieldCode === 'title');
  const allAttachments = collectAttachments(ticket.logs);

  return (
    <div>
      <div className="page-header">
        <Link to={listPath} style={{ fontSize: '0.875rem', color: '#0d9488' }}>
          ← Kembali ke {appConfig?.label ?? ticket.appCode}
        </Link>
        <h1>
          {getAppIcon(ticket.appCode)} {String(titleDetail?.value ?? ticket.trxNo)}
        </h1>
        <p>
          <code>{ticket.trxNo}</code> · {ticket.currentProcess} ·{' '}
          <Badge variant="info">{ticket.status}</Badge>
          <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#64748b' }}>
            Mode:{' '}
            {viewMode === 'client'
              ? 'Pelanggan / User'
              : viewMode === 'technician'
                ? 'Teknisi'
                : 'Manager'}
          </span>
        </p>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="trx-detail-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`trx-detail-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.hint}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: '1.5rem', marginTop: '1rem' }}>
        {activeTab === 'overview' && (
          <>
            <Card title="Detail Tiket">
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {ticket.domainCode && (
                  <p>
                    <strong>Lokasi:</strong> <code>{ticket.domainCode}</code>
                  </p>
                )}
                {ticket.details.map((d) => (
                  <p key={d.id}>
                    <strong>{d.fieldCode}:</strong> {detailValue(d.value)}
                  </p>
                ))}
              </div>
              {ticket.assets.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <strong>Aset Terkait</strong>
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                    {ticket.assets.map((link) => (
                      <li key={link.id}>
                        {link.asset?.assetCode ?? link.assetId} — {link.asset?.name ?? 'Asset'}{' '}
                        <Badge variant="default">{link.usageType}</Badge>
                        {link.qty != null && link.qty > 1 ? ` ×${link.qty}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p style={{ marginTop: '0.75rem' }}>
                <strong>Prioritas:</strong> {ticket.priority} ·{' '}
                <SLABadge
                  slaStatus={ticket.slaStatus}
                  createdAt={ticket.createdAt}
                  closedAt={ticket.closedAt}
                  priority={ticket.priority}
                  status={ticket.status}
                />
              </p>
            </Card>

            {ticket.remoteSupport && (
              <Card title="Remote Support (AnyDesk)">
                <p style={{ margin: '0 0 0.5rem' }}>
                  <strong>Support ID:</strong>{' '}
                  <code style={{ fontSize: '1.1rem' }}>{ticket.remoteSupport.supportId}</code>
                </p>
                <a href={ticket.remoteSupport.downloadUrl} target="_blank" rel="noreferrer">
                  <Button variant="secondary" type="button">
                    Download AnyDesk
                  </Button>
                </a>
              </Card>
            )}

            {allAttachments.length > 0 && (
              <Card title="Foto">
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {allAttachments.map((att) => (
                    <AuthImage
                      key={att.key}
                      url={att.url}
                      alt={att.filename}
                      style={{
                        width: 120,
                        height: 120,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                      }}
                    />
                  ))}
                </div>
              </Card>
            )}

            {ticket.appCode === 'ENG_PM' && checklist.length > 0 && (
              <Card title="PM Checklist">
                {checklist.map((item) => (
                  <label key={item.id} className="checklist-item">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => handleChecklistToggle(item.id)}
                      disabled={ticket.status !== 'OPEN' || viewMode === 'client'}
                    />
                    <span style={{ textDecoration: item.done ? 'line-through' : 'none' }}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </Card>
            )}

            {viewMode === 'client' && isOpen && (
              <div className="admin-help-box">
                Anda melihat tiket sebagai <strong>Pelanggan/User</strong>. Tab teknisi
                (Handover, Catatan Kerja) hanya tampil untuk teknisi atau assignee.
              </div>
            )}
          </>
        )}

        {activeTab === 'timeline' && (
          <Card title="Timeline Aktivitas">
            {ticket.logs.length === 0 ? (
              <p style={{ color: '#64748b' }}>Belum ada aktivitas</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {ticket.logs.map((log) => (
                  <div
                    key={log.id}
                    style={{ borderLeft: '3px solid #0d9488', paddingLeft: '1rem' }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {new Date(log.createdAt).toLocaleString('id-ID')} · {log.process} ·{' '}
                      {log.action}
                    </div>
                    <div style={{ fontSize: '0.875rem' }}>{log.description}</div>
                    {log.metadata && <LogMetadataView metadata={log.metadata} />}
                    {Array.isArray(log.attachments) && log.attachments.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.5rem',
                          marginTop: '0.5rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        {(log.attachments as AttachmentMeta[]).map((att) => (
                          <AuthImage
                            key={att.key}
                            url={att.url}
                            alt={att.filename}
                            style={{
                              width: 72,
                              height: 72,
                              objectFit: 'cover',
                              borderRadius: 6,
                              border: '1px solid #e2e8f0',
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'actions' && (
          <>
            {viewMode === 'manager' && isOpen && ticket.currentProcess === 'REQUEST' && (
              <Card title="Manager — Approve & Assign">
                <p className="field-hint" style={{ marginBottom: '1rem' }}>
                  Setujui tiket dan assign ke teknisi untuk mulai dikerjakan.
                </p>
                <div className="form-grid">
                  <div className="input-group">
                    <label className="input-label">Assign ke Teknisi</label>
                    <select
                      className="input-field"
                      value={assignTo}
                      onChange={(e) => setAssignTo(e.target.value)}
                    >
                      <option value="">— Pilih teknisi —</option>
                      {technicians.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Catatan"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <Button onClick={() => handleAdvance()}>Approve & Forward</Button>
                </div>
              </Card>
            )}

            {isOpen && ticket.availableTransitions.length > 0 && (
              <Card title="Lanjutkan Proses">
                <p className="field-hint" style={{ marginBottom: '1rem' }}>
                  Pindahkan tiket ke tahap workflow berikutnya.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {ticket.availableTransitions.map((p) => (
                    <Button key={p} variant="secondary" onClick={() => handleAdvance(p)}>
                      → {p}
                    </Button>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {activeTab === 'handover' && (
          <Card title="Handover ke Teknisi Lain">
            <p className="field-hint" style={{ marginBottom: '1rem' }}>
              Serahkan pekerjaan ke teknisi lain tanpa menutup tiket. Assignee akan berubah.
            </p>
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">Teknisi Penerima</label>
                <select
                  className="input-field"
                  value={handoverTo}
                  onChange={(e) => setHandoverTo(e.target.value)}
                >
                  <option value="">— Pilih teknisi —</option>
                  {technicians
                    .filter((u) => u.id !== user?.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}
                      </option>
                    ))}
                </select>
              </div>
              <Input
                label="Catatan Handover"
                value={handoverNote}
                onChange={(e) => setHandoverNote(e.target.value)}
                placeholder="Kondisi saat ini, yang sudah dikerjakan..."
              />
              <Button variant="secondary" onClick={handleHandover} disabled={!handoverTo}>
                Serahkan Tiket
              </Button>
            </div>
          </Card>
        )}

        {activeTab === 'worklog' && (
          <Card title="Catatan Kerja Lapangan">
            <p className="field-hint" style={{ marginBottom: '1rem' }}>
              Catat progress, sparepart yang dipakai, alat yang digunakan, dan siapa saja yang
              mengerjakan.
            </p>
            <form onSubmit={handleWorkLog} className="form-grid" style={{ maxWidth: '100%' }}>
              <div className="input-group">
                <label className="input-label">Deskripsi Pekerjaan *</label>
                <textarea
                  className="input-field"
                  rows={4}
                  value={workNote}
                  onChange={(e) => setWorkNote(e.target.value)}
                  placeholder="Temuan, tindakan, kondisi setelah perbaikan..."
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Teknisi yang Mengerjakan</label>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    padding: '0.5rem 0',
                  }}
                >
                  {technicians.map((tech) => (
                    <label key={tech.id} className="toggle-label">
                      <input
                        type="checkbox"
                        checked={workerIds.includes(tech.id)}
                        onChange={() => toggleWorker(tech.id)}
                      />
                      {tech.fullName}
                    </label>
                  ))}
                </div>
                <p className="field-hint">
                  Centang semua teknisi yang terlibat dalam pekerjaan ini
                </p>
              </div>

              <MultiAssetPicker
                label="Sparepart Digunakan"
                category="SPAREPART"
                items={spareparts}
                onChange={setSpareparts}
                withQty
              />

              <MultiAssetPicker
                label="Alat / Tools"
                category="TOOL"
                items={tools}
                onChange={setTools}
              />

              <PhotoUpload
                label="Foto Pekerjaan"
                files={workPhotos}
                onChange={setWorkPhotos}
                maxFiles={3}
              />

              <Button type="submit">Simpan Catatan Kerja</Button>
            </form>
          </Card>
        )}

        {activeTab === 'ai' && id && <AiInsightsPanel transactionId={id} />}
      </div>
    </div>
  );
}
