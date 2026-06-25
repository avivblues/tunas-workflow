import { useEffect, useState } from 'react';
import { Badge } from '../../components/atoms/Badge';
import { Card } from '../../components/atoms/Card';
import { getCrossAppAnalytics, type CrossAppAnalytics } from '../../services/cross-app-analytics.service';

export function CrossAppAnalyticsPage() {
  const [data, setData] = useState<CrossAppAnalytics | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCrossAppAnalytics(days)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>📈 Cross-App Analytics</h1>
          <p>Perbandingan KPI semua aplikasi dalam satu tenant</p>
        </div>
        <select
          className="input-field"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          style={{ minWidth: 140 }}
        >
          <option value={7}>7 hari</option>
          <option value={30}>30 hari</option>
          <option value={90}>90 hari</option>
        </select>
      </div>

      {loading || !data ? (
        <p>Loading analytics…</p>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            <Card title="Total">
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{data.totals.total}</div>
            </Card>
            <Card title="Open">
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{data.totals.open}</div>
            </Card>
            <Card title="Closed">
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{data.totals.closed}</div>
            </Card>
            <Card title="Active Apps">
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{data.totals.appsActive}</div>
            </Card>
          </div>

          <Card title="Per Application">
            <table className="data-table">
              <thead>
                <tr>
                  <th>App</th>
                  <th>Total</th>
                  <th>Open</th>
                  <th>Closed</th>
                  <th>SLA Breach</th>
                  <th>Avg Resolution (h)</th>
                  <th>Work Logs</th>
                </tr>
              </thead>
              <tbody>
                {data.perApp.map((row) => (
                  <tr key={row.appCode}>
                    <td>
                      <strong>{row.appName}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{row.appCode}</div>
                    </td>
                    <td>{row.total}</td>
                    <td>{row.open}</td>
                    <td>{row.closed}</td>
                    <td>
                      {row.slaBreachOpen > 0 ? (
                        <Badge variant="warning">{row.slaBreachOpen}</Badge>
                      ) : (
                        row.slaBreachOpen
                      )}
                    </td>
                    <td>{row.avgResolutionHours}</td>
                    <td>{row.workLogCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title="Weekly Volume Trend">
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', minHeight: 120 }}>
              {data.weeklyTrend.map((w) => (
                <div key={w.week} style={{ flex: 1, textAlign: 'center' }}>
                  <div
                    style={{
                      height: Math.max(8, w.count * 12),
                      background: '#3b82f6',
                      borderRadius: 4,
                      marginBottom: 6,
                    }}
                  />
                  <div style={{ fontSize: '0.75rem' }}>{w.count}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)' }}>{w.week}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Top Failing Assets (Cross-App)">
            {data.topFailingAssets.length === 0 ? (
              <p style={{ color: 'var(--color-muted)' }}>No asset-linked incidents in this period.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Incidents</th>
                    <th>Apps</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topFailingAssets.map((a) => (
                    <tr key={a.assetCode}>
                      <td>
                        <strong>{a.assetCode}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{a.name}</div>
                      </td>
                      <td>{a.incidentCount}</td>
                      <td>{a.apps.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
