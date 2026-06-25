import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/atoms/Badge';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';
import { FormFeedback } from '../../components/molecules/FormFeedback';
import { ConfirmSaveModal } from '../../components/molecules/ConfirmSaveModal';
import {
  disconnectLlm,
  getLlmConfig,
  saveLlmConfig,
  testLlmConnection,
  type LlmProvider,
  type LlmProviderInfo,
  type UserLlmConfig,
} from '../../services/ai.service';
import { getErrorMessage } from '../../services/api-client';
import './AiLlmSettingsPage.css';

const PROVIDER_META: Record<LlmProvider, { icon: string; description: string; keyHint: string; keyUrl: string }> = {
  OPENAI: {
    icon: '💬',
    description: 'Gunakan API key OpenAI untuk ChatGPT (gpt-4o-mini, gpt-4o, dll).',
    keyHint: 'API key dimulai dengan sk-...',
    keyUrl: 'https://platform.openai.com/api-keys',
  },
  GEMINI: {
    icon: '✨',
    description: 'Gunakan API key Google AI Studio untuk Gemini.',
    keyHint: 'API key dari Google AI Studio',
    keyUrl: 'https://aistudio.google.com/apikey',
  },
};

export function AiLlmSettingsPage() {
  const [providers, setProviders] = useState<LlmProviderInfo[]>([]);
  const [config, setConfig] = useState<UserLlmConfig | null>(null);
  const [provider, setProvider] = useState<LlmProvider>('OPENAI');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedProvider = providers.find((p) => p.code === provider);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (selectedProvider && !model) {
      setModel(selectedProvider.defaultModel);
    }
  }, [selectedProvider, model]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await getLlmConfig();
      setProviders(data.providers);
      setConfig(data.config);
      if (data.config) {
        setProvider(data.config.provider);
        setModel(data.config.model);
      } else if (data.providers[0]) {
        setProvider(data.providers[0].code);
        setModel(data.providers[0].defaultModel);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat konfigurasi');
    } finally {
      setLoading(false);
    }
  }

  function onReview(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setConfirmOpen(true);
  }

  async function onConfirmSave() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const saved = await saveLlmConfig({
        provider,
        api_key: apiKey || undefined,
        model: model || undefined,
      });
      setConfig(saved);
      setApiKey('');
      setMessage('Koneksi AI berhasil disimpan.');
      setConfirmOpen(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menyimpan'));
    } finally {
      setSaving(false);
    }
  }

  async function onTest() {
    setTesting(true);
    setError('');
    setMessage('');
    try {
      if (apiKey) {
        await saveLlmConfig({ provider, api_key: apiKey, model: model || undefined });
        setApiKey('');
        await load();
      }
      const result = await testLlmConnection();
      setMessage(`Koneksi OK — ${result.provider} / ${result.model}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tes koneksi gagal');
    } finally {
      setTesting(false);
    }
  }

  async function onDisconnect() {
    if (!window.confirm('Putuskan koneksi LLM Anda? AI Assistant akan kembali ke mode Smart Analytics.')) {
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await disconnectLlm();
      setConfig(null);
      setApiKey('');
      setMessage('Koneksi AI diputus.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memutus koneksi');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p>Memuat...</p>;
  }

  const meta = PROVIDER_META[provider];

  return (
    <div className="ai-llm-settings">
      <div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Koneksi AI</h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Hubungkan akun ChatGPT (OpenAI) atau Gemini Anda. API key disimpan aman per user dan hanya dipakai untuk AI Assistant Anda.
        </p>
      </div>

      {config?.connected && (
        <div className="ai-connected-banner">
          <strong>Terhubung:</strong> {config.providerLabel} · Model {config.model}
          {config.apiKeyMasked && <> · Key {config.apiKeyMasked}</>}
        </div>
      )}

      <Card title="Pilih Provider">
        <div className="ai-provider-grid">
          {(['OPENAI', 'GEMINI'] as LlmProvider[]).map((code) => {
            const info = PROVIDER_META[code];
            const providerInfo = providers.find((p) => p.code === code);
            return (
              <button
                key={code}
                type="button"
                className={`ai-provider-card ${provider === code ? 'selected' : ''}`}
                onClick={() => {
                  setProvider(code);
                  setModel(providerInfo?.defaultModel ?? '');
                  setApiKey('');
                }}
              >
                <div className="ai-provider-card-header">
                  <span className="ai-provider-icon">{info.icon}</span>
                  <div>
                    <div className="ai-provider-title">
                      {providerInfo?.label ?? code}
                    </div>
                    {config?.provider === code && <Badge variant="success">Aktif</Badge>}
                  </div>
                </div>
                <p className="ai-provider-desc">{info.description}</p>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="API Key & Model">
        <form onSubmit={onReview} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="API Key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={config?.hasApiKey ? 'Kosongkan jika tidak ingin mengubah key' : meta.keyHint}
            autoComplete="off"
          />

          <div className="input-group">
            <label className="input-label" htmlFor="llm-model">
              Model
            </label>
            <select
              id="llm-model"
              className="input-field"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {(selectedProvider?.models ?? [model]).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="ai-help-links">
            Dapatkan API key di{' '}
            <a href={meta.keyUrl} target="_blank" rel="noreferrer">
              {provider === 'OPENAI' ? 'OpenAI Platform' : 'Google AI Studio'}
            </a>
            . Key tidak dibagikan ke user lain dan dienkripsi di server.
          </div>

          <FormFeedback success={message} error={error && !confirmOpen ? error : ''} />

          <div className="ai-form-actions">
            <Button type="submit" loading={saving}>
              Lanjut Konfirmasi →
            </Button>
            <Button type="button" variant="secondary" loading={testing} onClick={() => void onTest()}>
              Tes Koneksi
            </Button>
            {config?.connected && (
              <Button type="button" variant="danger" disabled={saving} onClick={() => void onDisconnect()}>
                Putuskan
              </Button>
            )}
            <Link to="/ai-assistant" style={{ alignSelf: 'center', fontSize: '0.875rem', color: '#0f766e' }}>
              Ke AI Assistant →
            </Link>
          </div>
        </form>
      </Card>

      <ConfirmSaveModal
        open={confirmOpen}
        title="Simpan Koneksi AI"
        summary={
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            <li>
              Provider: <strong>{provider}</strong>
            </li>
            <li>Model: {model}</li>
            <li>API key: {apiKey ? 'Baru diisi' : config?.hasApiKey ? 'Tidak diubah' : '—'}</li>
          </ul>
        }
        busy={saving}
        error={confirmOpen ? error : ''}
        onConfirm={() => void onConfirmSave()}
        onCancel={() => {
          if (!saving) {
            setConfirmOpen(false);
            setError('');
          }
        }}
      />
    </div>
  );
}
