import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { useAuth } from '../context/AuthContext';
import { ApiClientError } from '../services/api-client';
import './LoginPage.css';

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const [tenantCode, setTenantCode] = useState('01');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login({ tenantCode, username, password });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

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
            label="Tenant Code"
            value={tenantCode}
            onChange={(e) => setTenantCode(e.target.value)}
            placeholder="01"
            required
          />
          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" loading={submitting} className="login-btn">
            Sign In
          </Button>
        </form>

        <div className="login-hint">
          <p>Demo: tenant <strong>01</strong> · admin / admin123</p>
        </div>
      </div>
    </div>
  );
}
