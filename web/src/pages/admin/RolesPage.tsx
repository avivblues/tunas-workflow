import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';
import { ConfirmSaveModal } from '../../components/molecules/ConfirmSaveModal';
import { FormFeedback } from '../../components/molecules/FormFeedback';
import type { Role } from '../../services/master.service';
import { createRole, listRoles } from '../../services/master.service';
import { getErrorMessage } from '../../services/api-client';

export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '' });
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    setRoles(await listRoles());
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
      await createRole({ name: form.name, code: form.code.toUpperCase() });
      setMessage(`Role "${form.name}" berhasil dibuat`);
      setConfirmOpen(false);
      setShowForm(false);
      setForm({ name: '', code: '' });
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Gagal membuat role'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Roles</h1>
        <p>Define roles for approval routing and permissions</p>
      </div>

      {message && <div className="alert alert-success">{message}</div>}

      <Card
        title="Role List"
        actions={
          <Button variant="secondary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Add Role'}
          </Button>
        }
      >
        {showForm && (
          <form onSubmit={handleReview} className="form-grid" style={{ marginBottom: '1.5rem' }}>
            <FormFeedback error={formError} />
            <Input
              label="Role Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label="Role Code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="MANAGER"
              required
            />
            <div className="form-actions">
              <Button type="submit">Lanjut Konfirmasi →</Button>
            </div>
          </form>
        )}

        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id}>
                <td>
                  <code>{r.code}</code>
                </td>
                <td>{r.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <ConfirmSaveModal
        open={confirmOpen}
        title="Buat Role Baru"
        summary={
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            <li>
              Kode: <strong>{form.code.toUpperCase()}</strong>
            </li>
            <li>
              Nama: <strong>{form.name}</strong>
            </li>
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
