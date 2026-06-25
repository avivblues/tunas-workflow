import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Badge } from '../../components/atoms/Badge';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';
import {
  getMenuPresetsForApp,
  SYSTEM_MENU_PRESETS,
  type MenuPathPreset,
} from '../../config/menu-presets';
import { listRoles, type Role } from '../../services/master.service';
import {
  createMenuItem,
  deleteMenuItem,
  listMenuAdmin,
  listNavMenu,
  reorderMenuItems,
  resetMenuDefaults,
  updateMenuItem,
  type NavMenuItem,
} from '../../services/menu.service';
import './admin-settings.css';

const emptyForm = {
  menuCode: '',
  label: '',
  path: '',
  icon: '',
  visible: true,
  showWeb: true,
  showMobile: false,
  roleCode: '',
};

interface AppMenuPanelProps {
  selectedApp: string;
  selectedLabel: string;
}

export function AppMenuPanel({ selectedApp, selectedLabel }: AppMenuPanelProps) {
  const [items, setItems] = useState<NavMenuItem[]>([]);
  const [webPreview, setWebPreview] = useState<NavMenuItem[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const presets = useMemo((): MenuPathPreset[] => {
    if (selectedApp === 'SYSTEM') return SYSTEM_MENU_PRESETS;
    return getMenuPresetsForApp(selectedApp);
  }, [selectedApp]);

  const existingCodes = useMemo(() => new Set(items.map((i) => i.menuCode)), [items]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [menuRows, previewRows, roleRows] = await Promise.all([
        listMenuAdmin(selectedApp),
        listNavMenu('WEB'),
        listRoles(),
      ]);
      setItems(menuRows);
      setWebPreview(previewRows);
      setRoles(roleRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat menu');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, [selectedApp]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await updateMenuItem(editingId, {
          label: form.label,
          path: form.path,
          icon: form.icon || null,
          visible: form.visible,
          showWeb: form.showWeb,
          showMobile: form.showMobile,
          roleCode: form.roleCode || null,
        });
        setMessage('Menu berhasil diperbarui');
      } else {
        await createMenuItem({
          appCode: selectedApp,
          menuCode: form.menuCode.toUpperCase(),
          label: form.label,
          path: form.path,
          icon: form.icon || null,
          sequence: items.length * 10 + 10,
          visible: form.visible,
          showWeb: form.showWeb,
          showMobile: form.showMobile,
          roleCode: form.roleCode || null,
        });
        setMessage('Menu berhasil ditambahkan');
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  function applyPreset(preset: MenuPathPreset) {
    if (existingCodes.has(preset.menuCode)) {
      const existing = items.find((i) => i.menuCode === preset.menuCode);
      if (existing) startEdit(existing);
      return;
    }
    setEditingId(null);
    setForm({
      menuCode: preset.menuCode,
      label: preset.label,
      path: preset.path,
      icon: preset.icon,
      visible: true,
      showWeb: preset.showWeb,
      showMobile: preset.showMobile,
      roleCode: '',
    });
    setShowForm(true);
  }

  function startEdit(item: NavMenuItem) {
    setEditingId(item.id);
    setForm({
      menuCode: item.menuCode,
      label: item.label,
      path: item.path,
      icon: item.icon ?? '',
      visible: item.visible,
      showWeb: item.showWeb,
      showMobile: item.showMobile,
      roleCode: item.roleCode ?? '',
    });
    setShowForm(true);
    setError('');
  }

  async function moveItem(item: NavMenuItem, direction: -1 | 1) {
    const sorted = [...items].sort((a, b) => a.sequence - b.sequence);
    const idx = sorted.findIndex((i) => i.id === item.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    await reorderMenuItems([
      { id: sorted[idx].id, sequence: sorted[swapIdx].sequence },
      { id: sorted[swapIdx].id, sequence: sorted[idx].sequence },
    ]);
    await load();
  }

  async function handleDelete(item: NavMenuItem) {
    if (!window.confirm(`Hapus menu "${item.label}"?\nTindakan ini tidak dapat dibatalkan.`)) return;
    await deleteMenuItem(item.id);
    setMessage('Menu dihapus');
    await load();
  }

  async function handleReset() {
    if (
      !window.confirm(
        `Kembalikan menu default untuk "${selectedLabel}"?\nPerubahan kustom pada aplikasi ini akan ditimpa.`,
      )
    ) {
      return;
    }
    await resetMenuDefaults(selectedApp);
    setMessage(`Menu default "${selectedLabel}" berhasil dipulihkan`);
    await load();
  }

  const sortedItems = [...items].sort((a, b) => a.sequence - b.sequence);

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
        <strong>Menu Navigasi — {selectedLabel}</strong>
        Atur item yang muncul di sidebar web dan menu mobile. Gunakan template cepat di bawah,
        atau tambah menu kustom. Item dengan <em>Show on Web</em> aktif akan tampil di sidebar.
      </div>

      <div className="admin-two-col">
        <div className="menu-preview-panel">
          <div className="menu-preview-title">Pratinjau Sidebar Web</div>
          <div className="menu-preview-brand">
            <span>🌱</span> Tunas Workflow
          </div>
          <div className="menu-preview-nav">
            {webPreview.length === 0 ? (
              <div className="menu-preview-empty">Belum ada menu web aktif</div>
            ) : (
              webPreview.map((item) => (
                <div
                  key={item.id}
                  className={`menu-preview-item ${item.appCode === selectedApp ? 'highlight' : ''}`}
                >
                  {item.icon ? `${item.icon} ` : ''}
                  {item.label}
                </div>
              ))
            )}
          </div>
          <p style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.75rem' }}>
            Item aplikasi terpilih ditandai hijau. Total {webPreview.length} menu web aktif.
          </p>
        </div>

        <div>
          {presets.length > 0 && selectedApp !== 'SYSTEM' && (
            <Card title="Template Cepat">
              <p className="field-hint" style={{ marginBottom: '0.75rem' }}>
                Klik template untuk mengisi form otomatis. Template yang sudah ada akan dibuka untuk
                diedit.
              </p>
              <div className="menu-preset-grid">
                {presets.map((preset) => (
                  <button
                    key={preset.menuCode}
                    type="button"
                    className="menu-preset-card"
                    onClick={() => applyPreset(preset)}
                  >
                    <div className="menu-preset-card-icon">{preset.icon}</div>
                    <div className="menu-preset-card-label">{preset.label}</div>
                    <div className="menu-preset-card-hint">{preset.hint}</div>
                    {existingCodes.has(preset.menuCode) && (
                      <div style={{ marginTop: '0.35rem' }}>
                        <Badge variant="success">Sudah ada</Badge>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </Card>
          )}

          <Card
            title={`Menu — ${selectedLabel}`}
            actions={
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Button variant="secondary" onClick={handleReset}>
                  Pulihkan Default
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                    setShowForm(!showForm);
                    setError('');
                  }}
                >
                  {showForm ? 'Tutup Form' : '+ Menu Kustom'}
                </Button>
              </div>
            }
          >
            {showForm && (
              <form onSubmit={handleSubmit} className="form-grid" style={{ marginBottom: '1.5rem', maxWidth: '100%' }}>
                <div style={{ gridColumn: '1 / -1', fontWeight: 600, color: '#0f766e' }}>
                  {editingId ? 'Edit Menu' : 'Tambah Menu Baru'}
                </div>

                {!editingId && (
                  <div>
                    <Input
                      label="Kode Menu"
                      value={form.menuCode}
                      onChange={(e) => setForm({ ...form, menuCode: e.target.value.toUpperCase() })}
                      placeholder="CUSTOM_REPORT"
                      required
                    />
                    <p className="field-hint">Identifier unik, huruf besar. Contoh: LIST, MAP, CUSTOM_REPORT</p>
                  </div>
                )}

                <Input
                  label="Label Tampilan"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="ISP Ticketing"
                  required
                />

                <div>
                  <Input
                    label="Path URL"
                    value={form.path}
                    onChange={(e) => setForm({ ...form, path: e.target.value })}
                    placeholder="/isp/tickets"
                    required
                  />
                  <p className="field-hint">Alamat halaman di web. Contoh: /isp/tickets, /admin/users</p>
                </div>

                <Input
                  label="Ikon (emoji)"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="📡"
                />

                <div className="input-group">
                  <label className="input-label">Batasi Role (opsional)</label>
                  <select
                    className="input-field"
                    value={form.roleCode}
                    onChange={(e) => setForm({ ...form, roleCode: e.target.value })}
                  >
                    <option value="">Semua role</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.code}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                  <p className="field-hint">Kosongkan agar semua user bisa melihat menu ini</p>
                </div>

                <div className="toggle-row" style={{ gridColumn: '1 / -1' }}>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={form.visible}
                      onChange={(e) => setForm({ ...form, visible: e.target.checked })}
                    />
                    Tampilkan (visible)
                  </label>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={form.showWeb}
                      onChange={(e) => setForm({ ...form, showWeb: e.target.checked })}
                    />
                    Sidebar Web
                  </label>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={form.showMobile}
                      onChange={(e) => setForm({ ...form, showMobile: e.target.checked })}
                    />
                    Aplikasi Mobile
                  </label>
                </div>

                <div className="form-actions">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Menu'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setForm(emptyForm);
                    }}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            )}

            {loading ? (
              <p style={{ color: 'var(--color-muted)' }}>Memuat menu...</p>
            ) : sortedItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <p>Belum ada menu untuk aplikasi ini.</p>
                <Button variant="secondary" onClick={handleReset} style={{ marginTop: '0.75rem' }}>
                  Muat Template Default
                </Button>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>Urutan</th>
                    <th>Menu</th>
                    <th>Path</th>
                    <th>Platform</th>
                    <th>Status</th>
                    <th style={{ width: 140 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => (
                    <tr key={item.id} style={{ opacity: item.visible ? 1 : 0.5 }}>
                      <td>
                        <div className="action-btn-group">
                          <Button variant="ghost" onClick={() => moveItem(item, -1)} title="Naik">
                            ↑
                          </Button>
                          <Button variant="ghost" onClick={() => moveItem(item, 1)} title="Turun">
                            ↓
                          </Button>
                        </div>
                      </td>
                      <td>
                        <div>
                          {item.icon && <span>{item.icon} </span>}
                          <strong>{item.label}</strong>
                        </div>
                        <code style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{item.menuCode}</code>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.8rem' }}>{item.path}</code>
                      </td>
                      <td>
                        {item.showWeb && <Badge variant="info">Web</Badge>}{' '}
                        {item.showMobile && <Badge variant="warning">Mobile</Badge>}
                        {!item.showWeb && !item.showMobile && (
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        <Badge variant={item.visible ? 'success' : 'default'}>
                          {item.visible ? 'Aktif' : 'Disembunyikan'}
                        </Badge>
                        {item.roleCode && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                            Role: {item.roleCode}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="action-btn-group">
                          <Button variant="ghost" onClick={() => startEdit(item)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() =>
                              updateMenuItem(item.id, { visible: !item.visible }).then(() => load())
                            }
                          >
                            {item.visible ? 'Sembunyi' : 'Tampil'}
                          </Button>
                          <Button variant="ghost" onClick={() => handleDelete(item)}>
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
