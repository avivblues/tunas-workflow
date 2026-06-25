import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import type { AppUiConfig } from '../../config/apps';
import {
  getAppReport,
  type AppReport,
  type ReportPeriod,
  type ReportType,
} from '../../services/report.service';
import './app-dashboard.css';

const REPORT_TABS: { type: ReportType; label: string }[] = [
  { type: 'complaint', label: 'Laporan Komplain' },
  { type: 'sla', label: 'SLA Penanganan' },
  { type: 'asset_usage', label: 'Sparepart & Alat' },
];

const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function AppReportPage({ config }: { config: AppUiConfig }) {
  const now = new Date();
  const [type, setType] = useState<ReportType>('complaint');
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState<AppReport | null>(null);
  const [loading, setLoading] = useState(true);

  const yearOptions = useMemo(() => {
    const current = now.getFullYear();
    return [current - 1, current, current + 1];
  }, []);

  useEffect(() => {
    setLoading(true);
    getAppReport(config.appCode, {
      type,
      period,
      year,
      month: period === 'month' ? month : undefined,
    })
      .then(setReport)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [config.appCode, type, period, year, month]);

  const periodLabel =
    period === 'year'
      ? `Tahun ${year}`
      : `${MONTHS[month - 1]} ${year}`;

  return (
    <div className="app-report-page">
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div>
          <h1>
            {config.icon} {config.label} — Laporan
          </h1>
          <p>Komplain, SLA penanganan, dan pemakaian sparepart/alat per bulan atau per tahun</p>
        </div>
        <Link to={config.dashboardPath}>
          <Button variant="secondary">← Dashboard</Button>
        </Link>
      </div>

      <Card title="Periode">
        <div className="app-report-filters">
          <div className="app-report-filter-group">
            <span className="app-report-filter-label">Jenis periode</span>
            <div className="app-report-tabs app-report-tabs-inline">
              <button
                type="button"
                className={`app-report-tab ${period === 'month' ? 'active' : ''}`}
                onClick={() => setPeriod('month')}
              >
                Per Bulan
              </button>
              <button
                type="button"
                className={`app-report-tab ${period === 'year' ? 'active' : ''}`}
                onClick={() => setPeriod('year')}
              >
                Per Tahun
              </button>
            </div>
          </div>
          <label className="app-report-filter-group">
            <span className="app-report-filter-label">Tahun</span>
            <select
              className="input-field"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          {period === 'month' && (
            <label className="app-report-filter-group">
              <span className="app-report-filter-label">Bulan</span>
              <select
                className="input-field"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTHS.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </Card>

      <div className="app-report-tabs">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.type}
            type="button"
            className={`app-report-tab ${type === tab.type ? 'active' : ''}`}
            onClick={() => setType(tab.type)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading || !report ? (
        <p>Memuat laporan...</p>
      ) : (
        <>
          <Card title={`Ringkasan — ${periodLabel}`}>
            <div
              className="stats-grid"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}
            >
              {Object.entries(report.summary).map(([key, val]) => (
                <div key={key}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {formatSummaryLabel(key)}
                  </div>
                  <div className="stat-value" style={{ fontSize: '1.5rem' }}>
                    {typeof val === 'number' && key.includes('Pct') ? `${val}%` : val}
                  </div>
                </div>
              ))}
            </div>

            {report.monthlyBreakdown && report.monthlyBreakdown.length > 1 && (
              <MonthlyBreakdownTable type={report.reportType} rows={report.monthlyBreakdown} />
            )}

            {report.byPriority && report.byPriority.length > 0 && (
              <PriorityTable rows={report.byPriority} />
            )}
          </Card>

          <Card title="Detail">
            <ReportTable type={report.reportType} items={report.items} />
          </Card>
        </>
      )}
    </div>
  );
}

function formatSummaryLabel(key: string) {
  const labels: Record<string, string> = {
    total: 'Total',
    open: 'Terbuka',
    closed: 'Selesai',
    rejected: 'Ditolak',
    breachOpen: 'SLA breach (open)',
    atRisk: 'Berisiko',
    onTrack: 'On track',
    met: 'SLA terpenuhi',
    breachedClosed: 'SLA breach (closed)',
    compliancePct: 'Kepatuhan SLA',
    avgResolutionHours: 'Rata-rata penanganan (jam)',
    uniqueAssets: 'Jenis aset',
    sparepartQty: 'Qty sparepart',
    toolQty: 'Qty alat',
    totalQty: 'Total pemakaian',
  };
  return labels[key] ?? key.replace(/([A-Z])/g, ' $1');
}

function MonthlyBreakdownTable({
  type,
  rows,
}: {
  type: ReportType;
  rows: Record<string, unknown>[];
}) {
  if (type === 'complaint') {
    const data = rows as {
      month: string;
      created: number;
      closed: number;
      open: number;
      rejected: number;
    }[];
    return (
      <table className="data-table" style={{ marginTop: '1rem' }}>
        <thead>
          <tr>
            <th>Bulan</th>
            <th>Masuk</th>
            <th>Selesai</th>
            <th>Terbuka</th>
            <th>Ditolak</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.month}>
              <td>{r.month}</td>
              <td>{r.created}</td>
              <td>{r.closed}</td>
              <td>{r.open}</td>
              <td>{r.rejected}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (type === 'sla') {
    const data = rows as {
      month: string;
      total: number;
      met: number;
      breached: number;
      atRisk: number;
      avgResolutionHours: number;
    }[];
    return (
      <table className="data-table" style={{ marginTop: '1rem' }}>
        <thead>
          <tr>
            <th>Bulan</th>
            <th>Total</th>
            <th>SLA OK</th>
            <th>Breach</th>
            <th>Risiko</th>
            <th>Rata-rata (jam)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.month}>
              <td>{r.month}</td>
              <td>{r.total}</td>
              <td>{r.met}</td>
              <td>{r.breached}</td>
              <td>{r.atRisk}</td>
              <td>{r.avgResolutionHours || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const data = rows as {
    month: string;
    sparepartQty: number;
    toolQty: number;
    transactions: number;
  }[];
  return (
    <table className="data-table" style={{ marginTop: '1rem' }}>
      <thead>
        <tr>
          <th>Bulan</th>
          <th>Sparepart</th>
          <th>Alat</th>
          <th>Transaksi</th>
        </tr>
      </thead>
      <tbody>
        {data.map((r) => (
          <tr key={r.month}>
            <td>{r.month}</td>
            <td>{r.sparepartQty}</td>
            <td>{r.toolQty}</td>
            <td>{r.transactions}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PriorityTable({ rows }: { rows: { priority: string; count: number }[] }) {
  return (
    <table className="data-table" style={{ marginTop: '1rem' }}>
      <thead>
        <tr>
          <th>Prioritas</th>
          <th>Jumlah</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.priority}>
            <td>{r.priority}</td>
            <td>{r.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReportTable({ type, items }: { type: ReportType; items: unknown[] }) {
  if (items.length === 0) {
    return <p style={{ color: '#64748b' }}>Tidak ada data untuk periode ini.</p>;
  }

  if (type === 'asset_usage' || type === 'sparepart') {
    const rows = items as {
      assetCode: string;
      assetName: string;
      usageType: string;
      qty: number;
      ticketCount: number;
    }[];
    return (
      <table className="data-table">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama</th>
            <th>Tipe</th>
            <th>Qty</th>
            <th>Transaksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.assetCode}-${r.usageType}`}>
              <td>
                <code>{r.assetCode}</code>
              </td>
              <td>{r.assetName}</td>
              <td>{r.usageType}</td>
              <td>{r.qty}</td>
              <td>{r.ticketCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (type === 'complaint') {
    const rows = items as {
      id: string;
      trxNo: string;
      title: string | null;
      status: string;
      priority: string | null;
      currentProcess: string;
      area?: string | null;
      customerName?: string | null;
      createdAt: string;
    }[];
    return (
      <table className="data-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Judul</th>
            <th>Status</th>
            <th>Prioritas</th>
            <th>Proses</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <code>{r.trxNo}</code>
              </td>
              <td>{r.title ?? '—'}</td>
              <td>{r.status}</td>
              <td>{r.priority}</td>
              <td>{r.currentProcess}</td>
              <td>
                <Link to={`/transactions/${r.id}`}>Lihat</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const rows = items as {
    id: string;
    trxNo: string;
    slaStatus: string;
    status: string;
    priority: string | null;
    resolutionHours: number | null;
    currentProcess?: string;
  }[];
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>No</th>
          <th>SLA</th>
          <th>Status</th>
          <th>Prioritas</th>
          <th>Proses</th>
          <th>Penanganan (jam)</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>
              <code>{r.trxNo}</code>
            </td>
            <td>
              <Badge variant={r.slaStatus === 'BREACHED' ? 'warning' : 'default'}>
                {r.slaStatus}
              </Badge>
            </td>
            <td>{r.status}</td>
            <td>{r.priority}</td>
            <td>{r.currentProcess ?? '—'}</td>
            <td>{r.resolutionHours ?? '—'}</td>
            <td>
              <Link to={`/transactions/${r.id}`}>Lihat</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
