import type { ReactNode } from 'react';
import { Button } from '../atoms/Button';
import { FormFeedback } from './FormFeedback';

interface ConfirmSaveModalProps {
  open: boolean;
  title?: string;
  description?: string;
  summary?: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSaveModal({
  open,
  title = 'Konfirmasi Simpan',
  description = 'Periksa ringkasan sebelum menyimpan.',
  summary,
  confirmLabel = 'Konfirmasi',
  busy = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmSaveModalProps) {
  if (!open) return null;

  return (
    <div className="pm-modal-overlay" onClick={onCancel} role="presentation">
      <div
        className="pm-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-save-title"
      >
        <h2 id="confirm-save-title" style={{ margin: '0 0 0.5rem' }}>
          {title}
        </h2>
        <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.9rem' }}>{description}</p>

        {summary && <div className="pm-confirm-box">{summary}</div>}

        <div style={{ marginTop: '1rem' }}>
          <FormFeedback error={error} />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            Batal
          </Button>
          <Button type="button" onClick={onConfirm} disabled={busy}>
            {busy ? 'Menyimpan…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
