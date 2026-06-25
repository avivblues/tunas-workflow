import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { useAuth } from '../context/AuthContext';
import { ApiClientError } from '../services/api-client';
import {
  lookupTenantsForUsername,
  type TenantLoginOption,
} from '../services/auth.service';
import './LoginPage.css';

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const [username, setUsername] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [tenants, setTenants] = useState<TenantLoginOption[]>([]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tenantResolved, setTenantResolved] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleLookup() {
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Masukkan username terlebih dahulu');
      return;
    }

    setError('');
    setLookupLoading(true);
    setTenantResolved(false);
    setTenantCode('');
    setTenants([]);
    setPassword('');

    try {
      const result = await lookupTenantsForUsername(trimmed);
      if (result.tenants.length === 0) {
        setError('Username tidak ditemukan di organisasi manapun');
        return;
      }
      setTenants(result.tenants);
      setTenantResolved(true);
      if (result.tenants.length === 1) {
        setTenantCode(result.tenants[0].tenantCode);
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal mencari organisasi');
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!tenantResolved) {
      await handleLookup();
      return;
    }

    if (!tenantCode) {
      setError('Pilih organisasi / domain untuk login');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await login({ tenantCode, username: username.trim(), password });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Login gagal');
    } finally {
      setSubmitting(false);
    }
  }

  function handleUsernameChange(value: string) {
    setUsername(value);
    if (tenantResolved) {
      setTenantResolved(false);
      setTenants([]);
      setTenantCode('');
      setPassword('');
    }
  }

  const selectedTenant = tenants.find((t) => t.tenantCode === tenantCode);

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-icon">🌱</span>
          <h1>Tunas Workflow</h1>
          <p>Configuration-driven work management platform</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <Input
            label="Username"
            value={username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            placeholder="admin"
            autoComplete="username"
            required
            disabled={lookupLoading || submitting}
          />

          {!tenantResolved ? (
            <Button
              type="submit"
              loading={lookupLoading}
              className="login-btn"
              disabled={!username.trim()}
            >
              Lanjut
            </Button>
          ) : (
            <>
              <div className="input-group">
                <label htmlFor="tenant-select" className="input-label">
                  Organisasi / Domain
                </label>
                <select
                  id="tenant-select"
                  className="input-field login-select"
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value)}
                  required
                  disabled={submitting}
                >
                  <option value="">— Pilih organisasi —</option>
                  {tenants.map((t) => (
                    <option key={t.tenantCode} value={t.tenantCode}>
                      {t.tenantName} ({t.tenantCode})
                      {t.roleName ? ` · ${t.roleName}` : ''}
                    </option>
                  ))}
                </select>
                {selectedTenant && (
                  <span className="login-tenant-hint">
                    Login sebagai <strong>{selectedTenant.fullName}</strong>
                  </span>
                )}
              </div>

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={submitting || !tenantCode}
              />

              <Button
                type="submit"
                loading={submitting}
                className="login-btn"
                disabled={!tenantCode || !password}
              >
                Sign In
              </Button>

              <button
                type="button"
                className="login-back-link"
                onClick={() => {
                  setTenantResolved(false);
                  setTenants([]);
                  setTenantCode('');
                  setPassword('');
                  setError('');
                }}
              >
                Ganti username
              </button>
            </>
          )}
        </form>

        <div className="login-hint">
          <p>Demo: username <strong>admin</strong> · password <strong>admin123</strong></p>
        </div>
      </div>
    </div>
  );
}
