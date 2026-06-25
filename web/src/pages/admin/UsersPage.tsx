import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Badge } from '../../components/atoms/Badge';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';
import { ConfirmSaveModal } from '../../components/molecules/ConfirmSaveModal';
import { FormFeedback } from '../../components/molecules/FormFeedback';
import type { User, Role } from '../../services/master.service';
import { createUser, listRoles, listUsers } from '../../services/master.service';
import { getErrorMessage } from '../../services/api-client';

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    roleId: '',
  });
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    const [u, r] = await Promise.all([listUsers(), listRoles()]);
    setUsers(u);
    setRoles(r);
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
      await createUser({
        username: form.username,
        password: form.password,
        fullName: form.fullName,
        email: form.email || undefined,
        roleId: form.roleId || undefined,
      });
      setMessage(`User "${form.fullName}" berhasil dibuat`);
      setConfirmOpen(false);
      setShowForm(false);
      setForm({ username: '', password: '', fullName: '', email: '', roleId: '' });
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Gagal membuat user'));
    } finally {
      setLoading(false);
    }
  }

  const selectedRole = roles.find((r) => r.id === form.roleId);

  return (
    <div>
      <div className="page-header">
        <h1>Users</h1>
        <p>Manage users within your tenant</p>
      </div>

      {message && <div className="alert alert-success">{message}</div>}

      <Card
        title="User List"
        actions={
          <Button variant="secondary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Add User'}
          </Button>
        }
      >
        {showForm && (
          <form onSubmit={handleReview} className="form-grid" style={{ marginBottom: '1.5rem' }}>
            <FormFeedback error={formError} />
            <Input
              label="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <Input
              label="Full Name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <div className="input-group">
              <label className="input-label">Role</label>
              <select
                className="input-field"
                value={form.roleId}
                onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              >
                <option value="">— Select role —</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <Button type="submit">Lanjut Konfirmasi →</Button>
            </div>
          </form>
        )}

        <table className="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Full Name</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.fullName}</td>
                <td>{u.role?.name ?? '—'}</td>
                <td>
                  <Badge variant={u.active ? 'success' : 'default'}>
                    {u.active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <ConfirmSaveModal
        open={confirmOpen}
        title="Buat User Baru"
        summary={
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            <li>
              Username: <strong>{form.username}</strong>
            </li>
            <li>
              Nama: <strong>{form.fullName}</strong>
            </li>
            {form.email && <li>Email: {form.email}</li>}
            {selectedRole && (
              <li>
                Role: {selectedRole.name} ({selectedRole.code})
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
