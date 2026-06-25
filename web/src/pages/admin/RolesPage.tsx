import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';
import type { Role } from '../../services/master.service';
import { createRole, listRoles } from '../../services/master.service';

export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '' });
  const [message, setMessage] = useState('');

  async function load() {
    setRoles(await listRoles());
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await createRole({ name: form.name, code: form.code.toUpperCase() });
    setMessage('Role created');
    setShowForm(false);
    setForm({ name: '', code: '' });
    await load();
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
          <form onSubmit={handleSubmit} className="form-grid" style={{ marginBottom: '1.5rem' }}>
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
            <Button type="submit">Create Role</Button>
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
    </div>
  );
}
