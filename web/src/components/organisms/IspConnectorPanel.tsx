import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { updateConnector, type InstalledConnector } from '../../services/connector.service';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

const BUNDLE_APPS = [
  { code: 'ISP_TICKET', label: 'ISP Ticketing', process: 'REQUEST → … → CLOSE' },
  { code: 'ENG_PM', label: 'Preventive Maintenance', process: 'SCHEDULED → … → CLOSE' },
  { code: 'GA_SUPPORT', label: 'GA Support', process: 'REQUEST → … → CLOSE' },
  { code: 'VEHICLE_BOOKING', label: 'Vehicle Booking', process: 'REQUEST → … → CLOSE' },
] as const;

const WEBHOOK_EXAMPLES: Record<string, string> = {
  ISP_TICKET: `{
  "app_code": "ISP_TICKET",
  "event": "CUSTOMER_COMPLAINT",
  "customer_name": "Budi Santoso",
  "area": "01.ISP01",
  "description": "Internet putus",
  "priority": "HIGH"
}`,
  ENG_PM: `{
  "app_code": "ENG_PM",
  "title": "PM Bulanan Genset",
  "description": "Checklist PM genset site A",
  "domain_code": "01.L01.Z01",
  "details": { "affected_asset": "GENSET-500-A", "frequency": "MONTHLY" }
}`,
  GA_SUPPORT: `{
  "app_code": "GA_SUPPORT",
  "title": "Permintaan ATK",
  "description": "Stok kertas A4 habis",
  "details": { "category": "SUPPLIES", "location": "Lantai 3" }
}`,
  VEHICLE_BOOKING: `{
  "app_code": "VEHICLE_BOOKING",
  "title": "Booking mobil operasional",
  "description": "Kunjungan site pelanggan",
  "details": {
    "purpose": "Site visit",
    "start_date": "2026-06-26",
    "destination": "Cluster B"
  }
}`,
};

export function IspConnectorPanel({
  connector,
  tenantCode,
  onSaved,
}: {
  connector: InstalledConnector;
  tenantCode: string;
  onSaved?: (message: string) => void;
}) {
  const [form, setForm] = useState({
    callback_url: String(connector.config.callback_url ?? ''),
    callback_secret: String(connector.config.callback_secret ?? ''),
    api_key: String(connector.config.api_key ?? ''),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [exampleApp, setExampleApp] = useState<string>('ISP_TICKET');

  useEffect(() => {
    setForm({
      callback_url: String(connector.config.callback_url ?? ''),
      callback_secret: String(connector.config.callback_secret ?? ''),
      api_key: String(connector.config.api_key ?? ''),
    });
  }, [connector]);

  const base = `${API_BASE}/integration/isp/${tenantCode}`;
  const secret = String(connector.config.webhook_secret ?? '');
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await updateConnector(connector.id, {
        config: {
          ...connector.config,
          callback_url: form.callback_url || undefined,
          callback_secret: form.callback_secret || undefined,
          api_key: form.api_key || undefined,
        },
      });
      onSaved?.('ISP Partner settings saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="connector-panel-details" open>
      <summary className="connector-panel-summary">ISP Partner API &amp; Callback Settings</summary>
      <div className="connector-panel-body">
        {error && <div style={{ color: 'var(--color-danger, #c0392b)' }}>{error}</div>}

        <section className="isp-panel-section">
          <strong>ISP Product Bundle</strong>
          <p className="isp-panel-muted">
            Satu webhook URL + satu secret untuk semua modul. Bedakan modul lewat field{' '}
            <code>app_code</code> di body request.
          </p>
          <table className="data-table isp-panel-apps-table">
            <thead>
              <tr>
                <th>app_code</th>
                <th>Modul</th>
                <th>Alur proses</th>
              </tr>
            </thead>
            <tbody>
              {BUNDLE_APPS.map((app) => (
                <tr key={app.code}>
                  <td>
                    <code>{app.code}</code>
                  </td>
                  <td>{app.label}</td>
                  <td>{app.process}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="isp-panel-section">
          <strong>Inbound Webhook — satu URL untuk semua modul</strong>
          <div className="isp-panel-endpoint">
            <code>POST {base}/webhook</code>
          </div>
          <p className="isp-panel-muted">
            Header: <code>X-Webhook-Secret</code> atau <code>X-Api-Key</code>
            {secret && (
              <>
                {' '}
                · Secret: <code>{secret}</code>
              </>
            )}
          </p>
          <p className="isp-panel-muted">
            Tanpa <code>app_code</code> = default <code>ISP_TICKET</code> (backward compatible).
          </p>
          <label className="isp-panel-filter-group">
            <span className="isp-panel-filter-label">Contoh body webhook</span>
            <select
              className="input-field"
              value={exampleApp}
              onChange={(e) => setExampleApp(e.target.value)}
            >
              {BUNDLE_APPS.map((app) => (
                <option key={app.code} value={app.code}>
                  {app.code}
                </option>
              ))}
            </select>
          </label>
          <pre className="isp-panel-code">{WEBHOOK_EXAMPLES[exampleApp]}</pre>
        </section>

        <section className="isp-panel-section">
          <strong>Partner API (Pull / Push)</strong>
          <p className="isp-panel-muted">
            Panduan: <code>docs/ISP-INTEGRATION-GUIDE.md</code> · Postman:{' '}
            <code>docs/postman/ISP-Partner-API.postman_collection.json</code> · Test:{' '}
            <code>bash scripts/isp-partner-api-test.sh</code>
          </p>

          <div className="isp-panel-subsection">
            <span className="isp-panel-subtitle">Transaksi</span>
            <ul className="isp-panel-endpoints">
              <li>
                <code>GET {base}/tickets?app_code=&#123;app&#125;</code> — list per modul
              </li>
              <li>
                <code>GET {base}/tickets/:trxNo</code> — detail + logs + transitions
              </li>
              <li>
                <code>PATCH {base}/tickets/:trxNo</code> — ADVANCE / ASSIGN / CLOSE
              </li>
              <li>
                <code>POST {base}/tickets/:trxNo/logs</code> — tambah catatan
              </li>
              <li>
                <code>GET {base}/processes?app_code=&#123;app&#125;</code> — flow proses
              </li>
            </ul>
          </div>

          <div className="isp-panel-subsection">
            <span className="isp-panel-subtitle">Laporan (per modul, per bulan / tahun)</span>
            <ul className="isp-panel-endpoints">
              <li>
                <code>
                  GET {base}/report?app_code=ISP_TICKET&amp;type=complaint&amp;period=month&amp;year=
                  {year}&amp;month={month}
                </code>{' '}
                — komplain
              </li>
              <li>
                <code>
                  GET {base}/report?app_code=ENG_PM&amp;type=sla&amp;period=year&amp;year={year}
                </code>{' '}
                — SLA penanganan
              </li>
              <li>
                <code>
                  GET {base}/report?app_code=GA_SUPPORT&amp;type=asset_usage&amp;period=month&amp;year=
                  {year}&amp;month={month}
                </code>{' '}
                — sparepart &amp; alat
              </li>
              <li>
                <code>
                  GET {base}/reports/bundle?app_code=VEHICLE_BOOKING&amp;period=year&amp;year={year}
                </code>{' '}
                — ketiga laporan sekaligus
              </li>
            </ul>
            <p className="isp-panel-muted">
              <code>type</code>: <code>complaint</code> · <code>sla</code> · <code>asset_usage</code>{' '}
              · <code>period</code>: <code>month</code> atau <code>year</code>
            </p>
          </div>
        </section>

        <section className="isp-panel-section">
          <strong>Outbound Callback (Tunas → ISP)</strong>
          <p className="isp-panel-muted">
            Semua modul mengirim callback ke URL yang sama. Payload menyertakan{' '}
            <code>app_code</code> + <code>trx_no</code>.
          </p>
          <form onSubmit={handleSave} className="isp-panel-form">
            <Input
              label="Callback URL"
              placeholder="https://isp-app.example.com/api/tunas/callback"
              value={form.callback_url}
              onChange={(e) => setForm({ ...form, callback_url: e.target.value })}
            />
            <Input
              label="Callback Secret (header X-Callback-Secret)"
              type="password"
              value={form.callback_secret}
              onChange={(e) => setForm({ ...form, callback_secret: e.target.value })}
            />
            <Input
              label="Partner API Key (opsional, default = webhook secret)"
              type="password"
              value={form.api_key}
              onChange={(e) => setForm({ ...form, api_key: e.target.value })}
            />
            <Button type="submit" disabled={busy} variant="secondary">
              Save ISP Partner settings
            </Button>
          </form>
        </section>
      </div>
    </details>
  );
}
