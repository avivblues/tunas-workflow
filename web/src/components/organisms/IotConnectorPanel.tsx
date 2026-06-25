import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { ConfirmSaveModal } from '../molecules/ConfirmSaveModal';
import { FormFeedback } from '../molecules/FormFeedback';
import { getErrorMessage } from '../../services/api-client';
import {
  getIotSettings,
  updateIotSettings,
  type IotConnectorSettings,
  type IotDomainLinkRow,
  type IotSeverity,
  type IotThresholdRule,
} from '../../services/iot.service';

const SEVERITIES: IotSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const OPERATORS = ['gt', 'gte', 'lt', 'lte', 'eq', 'neq'] as const;

const OPERATOR_LABELS: Record<(typeof OPERATORS)[number], string> = {
  gt: '> (lebih dari)',
  gte: '≥ (lebih dari/sama)',
  lt: '< (kurang dari)',
  lte: '≤ (kurang dari/sama)',
  eq: '= (sama dengan)',
  neq: '≠ (tidak sama)',
};

function newThreshold(): IotThresholdRule {
  return {
    id: `rule-${Date.now()}`,
    field: 'temperature_1',
    operator: 'gt',
    value: 45,
    severity: 'HIGH',
    title_template: 'Alert — {asset_code}',
    enabled: true,
  };
}

export function IotConnectorPanel({
  connectorId,
  mqttConnected,
  onSaved,
}: {
  connectorId: string;
  mqttConnected?: boolean;
  onSaved?: (message: string) => void | Promise<void>;
}) {
  const [settings, setSettings] = useState<IotConnectorSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState<'mqtt' | 'thresholds'>('mqtt');

  async function load() {
    const data = await getIotSettings(connectorId);
    setSettings(data);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Load failed'));
  }, [connectorId]);

  async function save(partial: Parameters<typeof updateIotSettings>[1], successMsg: string) {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const updated = await updateIotSettings(connectorId, partial);
      setSettings(updated);
      setSuccess(successMsg);
      setConfirmOpen(false);
      await onSaved?.(successMsg);
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menyimpan'));
    } finally {
      setBusy(false);
    }
  }

  function handleConfigReview(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setError('');
    setConfirmKind('mqtt');
    setConfirmOpen(true);
  }

  function handleThresholdReview() {
    if (!settings) return;
    setError('');
    setConfirmKind('thresholds');
    setConfirmOpen(true);
  }

  async function handleConfirmSave() {
    if (!settings) return;
    if (confirmKind === 'mqtt') {
      await save({ config: settings.config }, 'Konfigurasi MQTT berhasil disimpan');
    } else {
      await save(
        { mapping: { thresholds: settings.mapping.thresholds ?? [] } },
        'Aturan threshold berhasil disimpan',
      );
    }
  }

  async function toggleDomain(row: IotDomainLinkRow) {
    if (!settings) return;
    const links = settings.domain_links.map((link) => ({
      domain_code: link.domain_code,
      tunasiot_hierarchy: link.tunasiot_hierarchy,
      enabled: link.domain_code === row.domain_code ? !link.enabled : link.enabled,
    }));
    await save({ mapping: { domain_links: links } }, 'Domain link diperbarui');
  }

  if (!settings) {
    return <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>Loading IoT settings…</div>;
  }

  const thresholdCount = settings.mapping.thresholds?.length ?? 0;

  return (
    <>
    <details className="connector-panel-details" open>
      <summary className="connector-panel-summary">Tunas IoT MQTT &amp; Threshold Settings</summary>
      <div className="connector-panel-body iot-connector-panel">
      <FormFeedback success={success && !confirmOpen ? success : ''} error={error && !confirmOpen ? error : ''} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        <strong>MQTT Bridge</strong>
        {mqttConnected ? (
          <Badge variant="success">Connected</Badge>
        ) : (
          <Badge variant="warning">Not connected</Badge>
        )}
        <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
          Subscribe telemetry &amp; alert topics from Tunas IoT broker
        </span>
      </div>

      <form onSubmit={handleConfigReview} style={{ display: 'grid', gap: '0.65rem' }}>
        <Input
          label="Tunas IoT Dashboard URL"
          value={settings.config.tunasiot_base_url ?? ''}
          onChange={(e) =>
            setSettings({
              ...settings,
              config: { ...settings.config, tunasiot_base_url: e.target.value },
            })
          }
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <input
            type="checkbox"
            checked={settings.config.mqtt_auto_wo_enabled ?? true}
            onChange={(e) =>
              setSettings({
                ...settings,
                config: { ...settings.config, mqtt_auto_wo_enabled: e.target.checked },
              })
            }
          />
          Auto-create WO from MQTT telemetry (threshold rules)
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
          <label className="input-group">
            <span className="input-label">Minimum severity for WO</span>
            <select
              className="input-field"
              value={settings.config.min_severity ?? 'MEDIUM'}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  config: { ...settings.config, min_severity: e.target.value as IotSeverity },
                })
              }
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Cooldown (minutes)"
            type="number"
            min={0}
            max={1440}
            value={String(settings.config.cooldown_minutes ?? 30)}
            onChange={(e) =>
              setSettings({
                ...settings,
                config: { ...settings.config, cooldown_minutes: Number(e.target.value) },
              })
            }
          />
        </div>

        <Button type="submit" loading={busy} disabled={busy} variant="secondary">
          Simpan MQTT config →
        </Button>
      </form>

      <div>
        <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Domain links (Tunas IoT ↔ Workflow)</strong>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', margin: '0 0 0.5rem' }}>
          Enable domains to receive MQTT events. Topic pattern:{' '}
          <code>tunas/&#123;tenant&#125;/&#123;location&#125;/&#123;zone&#125;/telemetry</code>
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border, #ddd)' }}>
                <th style={{ padding: '0.35rem' }}>Enable</th>
                <th style={{ padding: '0.35rem' }}>Domain</th>
                <th style={{ padding: '0.35rem' }}>MQTT topic</th>
                <th style={{ padding: '0.35rem' }}>Tunas IoT</th>
              </tr>
            </thead>
            <tbody>
              {settings.domain_links.map((row) => (
                <tr key={row.domain_id} style={{ borderBottom: '1px solid var(--color-border, #eee)' }}>
                  <td style={{ padding: '0.35rem' }}>
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      disabled={busy}
                      onChange={() => toggleDomain(row)}
                    />
                  </td>
                  <td style={{ padding: '0.35rem' }}>
                    <div>{row.domain_name}</div>
                    <code>{row.domain_code}</code>
                  </td>
                  <td style={{ padding: '0.35rem' }}>
                    <code style={{ wordBreak: 'break-all' }}>{row.mqtt_topic}</code>
                  </td>
                  <td style={{ padding: '0.35rem' }}>
                    <a href={row.tunasiot_dashboard_url} target="_blank" rel="noreferrer">
                      Open dashboard
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <strong style={{ display: 'block', marginBottom: '0.5rem' }}>MQTT telemetry payload (multi-sensor)</strong>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', margin: '0 0 0.5rem' }}>
          <strong>Mode production:</strong> MQTT auto-WO hanya untuk severity{' '}
          <code>CRITICAL</code> (atur <em>Minimum severity</em> di bawah). Alert MEDIUM/HIGH — operator
          konfirmasi manual lewat Tunas IoT → HTTP{' '}
          <code>POST /integration/iot/&#123;tenant&#125;/work-order</code>.
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', margin: '0 0 0.5rem' }}>
          API docs (Swagger):{' '}
          <a href="/api/docs" target="_blank" rel="noreferrer">
            /api/docs
          </a>
        </p>
        <pre className="isp-panel-code" style={{ fontSize: '0.78rem' }}>
{`{
  "device_id": "TUNAS-POWER",
  "hierarchy_code": "01.L01.Z01",
  "temperature_1": 32.7,
  "humidity_1": 61.2,
  "voltage_1": 221.8,
  "current_1": 0,
  "power_1": 0
}`}
        </pre>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', margin: '0 0 0.5rem' }}>
          Topic: <code>tunas/&#123;tenant&#125;/L01/Z01/telemetry</code> atau{' '}
          <code>tunas/&#123;tenant&#125;/telemetry</code> + <code>hierarchy_code</code> di body. Referensi
          MQTT: <code>GET /api/integration/iot/&#123;tenant&#125;/mqtt</code> atau Swagger{' '}
          <a href="/api/docs" target="_blank" rel="noreferrer">
            /api/docs
          </a>
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', margin: '0.5rem 0 0' }}>
          <code>device_id</code> = <code>asset_code</code> di master asset. Hanya rule{' '}
          <code>CRITICAL</code> yang enabled memicu auto-WO via MQTT.
        </p>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Threshold rules (auto WO)</strong>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              const thresholds = [...(settings.mapping.thresholds ?? []), newThreshold()];
              setSettings({ ...settings, mapping: { ...settings.mapping, thresholds } });
            }}
          >
            + Add rule
          </Button>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', margin: '0.35rem 0 0.5rem' }}>
          Satu device bisa punya banyak sensor — gunakan nama field persis seperti di payload MQTT, misal{' '}
          <code>temperature_1</code>, <code>humidity_2</code>, <code>voltage_5</code>. Contoh device{' '}
          <code>TUNAS-POWER</code> mengirim <code>temperature_1</code> … <code>voltage_12</code> dalam satu
          JSON.
        </p>
        <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
          {(settings.mapping.thresholds ?? []).map((rule, index) => (
            <div
              key={rule.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr 1fr 1fr 1fr auto',
                gap: '0.35rem',
                alignItems: 'end',
                fontSize: '0.85rem',
              }}
            >
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={(e) => {
                  const thresholds = [...(settings.mapping.thresholds ?? [])];
                  thresholds[index] = { ...rule, enabled: e.target.checked };
                  setSettings({ ...settings, mapping: { ...settings.mapping, thresholds } });
                }}
              />
              <Input
                label="Field"
                value={rule.field}
                onChange={(e) => {
                  const thresholds = [...(settings.mapping.thresholds ?? [])];
                  thresholds[index] = { ...rule, field: e.target.value };
                  setSettings({ ...settings, mapping: { ...settings.mapping, thresholds } });
                }}
              />
              <label className="input-group">
                <span className="input-label">Operator</span>
                <select
                  className="input-field"
                  value={rule.operator}
                  onChange={(e) => {
                    const thresholds = [...(settings.mapping.thresholds ?? [])];
                    thresholds[index] = {
                      ...rule,
                      operator: e.target.value as IotThresholdRule['operator'],
                    };
                    setSettings({ ...settings, mapping: { ...settings.mapping, thresholds } });
                  }}
                >
                  {OPERATORS.map((op) => (
                    <option key={op} value={op}>
                      {OPERATOR_LABELS[op]}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="Value"
                type="number"
                value={String(rule.value)}
                onChange={(e) => {
                  const thresholds = [...(settings.mapping.thresholds ?? [])];
                  thresholds[index] = { ...rule, value: Number(e.target.value) };
                  setSettings({ ...settings, mapping: { ...settings.mapping, thresholds } });
                }}
              />
              <label className="input-group">
                <span className="input-label">Severity</span>
                <select
                  className="input-field"
                  value={rule.severity}
                  onChange={(e) => {
                    const thresholds = [...(settings.mapping.thresholds ?? [])];
                    thresholds[index] = { ...rule, severity: e.target.value as IotSeverity };
                    setSettings({ ...settings, mapping: { ...settings.mapping, thresholds } });
                  }}
                >
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  const thresholds = (settings.mapping.thresholds ?? []).filter((_, i) => i !== index);
                  setSettings({ ...settings, mapping: { ...settings.mapping, thresholds } });
                }}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        <Button
          style={{ marginTop: '0.5rem' }}
          disabled={busy}
          variant="secondary"
          onClick={handleThresholdReview}
        >
          Simpan threshold rules →
        </Button>
      </div>
      </div>
    </details>

    <ConfirmSaveModal
      open={confirmOpen}
      title={confirmKind === 'mqtt' ? 'Simpan Konfigurasi MQTT' : 'Simpan Aturan Threshold'}
      summary={
        confirmKind === 'mqtt' ? (
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            <li>URL: {settings.config.tunasiot_base_url || '—'}</li>
            <li>Auto WO: {settings.config.mqtt_auto_wo_enabled ? 'Aktif' : 'Nonaktif'}</li>
            <li>Min severity: {settings.config.min_severity ?? 'MEDIUM'}</li>
            <li>Cooldown: {settings.config.cooldown_minutes ?? 30} menit</li>
          </ul>
        ) : (
          <p style={{ margin: 0 }}>
            Simpan <strong>{thresholdCount}</strong> aturan threshold untuk auto work order.
          </p>
        )
      }
      busy={busy}
      error={confirmOpen ? error : ''}
      onConfirm={() => void handleConfirmSave()}
      onCancel={() => {
        if (!busy) {
          setConfirmOpen(false);
          setError('');
        }
      }}
    />
    </>
  );
}
