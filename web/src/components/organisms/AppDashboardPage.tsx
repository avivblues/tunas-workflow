import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../atoms/Badge';
import { Card } from '../atoms/Card';
import type { AppUiConfig } from '../../config/apps';
import { getAppDashboard, type AppDashboard } from '../../services/dashboard.service';
import './app-dashboard.css';

function MetricsList({ title, items }: { title: string; items: { label: string; count: number }[] }) {
  if (items.length === 0) return null;
  return (
    <Card title={title}>
      <ul className="app-metrics-list">
        {items.map((row) => (
          <li key={row.label}>
            <strong>{row.label}</strong> — {row.count}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AppSpecificMetrics({ data }: { data: AppDashboard }) {
  const m = data.appMetrics;
  if (!m) return null;

  if (m.type === 'IT_SUPPORT') {
    const x = m.metrics;
    return (
      <div className="app-metrics-grid">
        <Card title="Critical / High Open">
          <div className="stat-value stat-danger">{x.criticalOpen}</div>
        </Card>
        <Card title="Avg Age Open (days)">
          <div className="stat-value">{x.avgAgeOpenDays}</div>
        </Card>
        <MetricsList title="Top Problems (Category)" items={x.topProblems} />
        <MetricsList title="Asset Failure Trend" items={x.assetFailures} />
      </div>
    );
  }

  if (m.type === 'ENGINEERING') {
    const x = m.metrics;
    return (
      <div className="app-metrics-grid">
        <Card title="Open Breakdowns">
          <div className="stat-value">{x.openBreakdowns}</div>
        </Card>
        <Card title="Est. Downtime (h)">
          <div className="stat-value stat-warning">{x.downtimeHours}h</div>
        </Card>
        <Card title="MTBF (h)">
          <div className="stat-value">{x.mtbfHours}h</div>
        </Card>
        <Card title="PM Compliance">
          <div className="stat-value">{x.pmCompliance.complianceRate}%</div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.35rem' }}>
            {x.pmCompliance.pmCompletedThisMonth} selesai · {x.pmCompliance.overdueSchedules} overdue
          </p>
        </Card>
        <MetricsList title="Sparepart Usage" items={x.sparepartUsage} />
      </div>
    );
  }

  if (m.type === 'ISP_TICKET') {
    const x = m.metrics;
    return (
      <div className="app-metrics-grid">
        <Card title="Customer Down (High)">
          <div className="stat-value stat-danger">{x.customerDown}</div>
        </Card>
        <Card title="Avg Resolution (h)">
          <div className="stat-value">{x.avgResolutionHours}h</div>
        </Card>
        <MetricsList title="Area Problems" items={x.byArea} />
        <Card title="Repeated Complaints">
          {x.repeatedComplaints.length === 0 ? (
            <p style={{ color: '#64748b' }}>No repeated complaints</p>
          ) : (
            <ul className="app-metrics-list">
              {x.repeatedComplaints.map((r) => (
                <li key={r.customer}>
                  <strong>{r.customer}</strong> — {r.count} tiket
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    );
  }

  if (m.type === 'GA_SUPPORT') {
    const x = m.metrics;
    return (
      <div className="app-metrics-grid">
        <Card title="Open Requests">
          <div className="stat-value">{x.openRequests}</div>
        </Card>
        <Card title="Avg Response (h)">
          <div className="stat-value">{x.avgResponseHours}h</div>
        </Card>
        <MetricsList title="By Category" items={x.byCategory} />
      </div>
    );
  }

  if (m.type === 'VEHICLE_BOOKING') {
    const x = m.metrics;
    return (
      <div className="app-metrics-grid">
        <Card title="Bookings This Month">
          <div className="stat-value">{x.bookingsThisMonth}</div>
        </Card>
        <Card title="Upcoming">
          <div className="stat-value">{x.upcomingBookings}</div>
        </Card>
        <Card title="Utilization">
          <div className="stat-value">{x.utilizationRate}%</div>
        </Card>
        <MetricsList title="Top Destinations" items={x.byDestination} />
      </div>
    );
  }

  if (m.type === 'BUILDING_MGMT') {
    const x = m.metrics;
    return (
      <div className="app-metrics-grid">
        <Card title="Open Issues">
          <div className="stat-value">{x.openIssues}</div>
        </Card>
        <Card title="Emergency Open">
          <div className="stat-value stat-danger">{x.emergencyOpen}</div>
        </Card>
        <MetricsList title="By Issue Type" items={x.byIssueType} />
      </div>
    );
  }

  return null;
}

export function AppDashboardPage({ config }: { config: AppUiConfig }) {
  const [data, setData] = useState<AppDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAppDashboard(config.appCode)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [config.appCode]);

  if (loading || !data) {
    return <p>Loading dashboard...</p>;
  }

  const { summary } = data;
  const reportPath = config.reportPath ?? `${config.dashboardPath}/reports`;

  return (
    <div>
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div>
          <h1>
            {config.icon} {config.label} Dashboard
          </h1>
          <p>SLA, KPI & metrik khusus aplikasi</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link to={reportPath}>
            <Badge variant="info">Reports</Badge>
          </Link>
          {config.mapPath && (
            <Link to={config.mapPath}>
              <Badge variant="info">Map</Badge>
            </Link>
          )}
          <Link to={config.listPath}>
            <Badge variant="info">View List</Badge>
          </Link>
          <Link to={config.createPath}>
            <Badge variant="success">Create {config.itemLabel}</Badge>
          </Link>
        </div>
      </div>

      <div className="stats-grid">
        <Card title="Open">
          <div className="stat-value">{summary.open}</div>
        </Card>
        <Card title="Closed">
          <div className="stat-value">{summary.closed}</div>
        </Card>
        <Card title="SLA At Risk">
          <div className="stat-value stat-warning">{summary.slaAtRisk}</div>
        </Card>
        <Card title="SLA Breach (Open)">
          <div className="stat-value stat-danger">{summary.slaBreachOpen}</div>
        </Card>
        <Card title="MTTR (hours)">
          <div className="stat-value">{summary.mttrHours}h</div>
        </Card>
        <Card title="SLA Breached (Closed)">
          <div className="stat-value">{summary.slaBreachedClosed}</div>
        </Card>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>App Insights</h2>
        <AppSpecificMetrics data={data} />
      </div>

      <div style={{ display: 'grid', gap: '1.5rem', marginTop: '1.5rem' }}>
        <Card title="Open by Process">
          {data.byProcess.length === 0 ? (
            <p style={{ color: '#64748b' }}>No open items</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Process</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {data.byProcess.map((row) => (
                  <tr key={row.process}>
                    <td>{row.process}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Technician KPI">
          {data.technicianKpi.length === 0 ? (
            <p style={{ color: '#64748b' }}>No completed assignments yet</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Technician</th>
                  <th>Completed</th>
                  <th>Avg Resolution (h)</th>
                </tr>
              </thead>
              <tbody>
                {data.technicianKpi.map((row) => (
                  <tr key={row.userId}>
                    <td>{row.fullName}</td>
                    <td>{row.completed}</td>
                    <td>{row.avgResolutionHours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Recent SLA Breaches">
          {data.recentBreaches.length === 0 ? (
            <p style={{ color: '#64748b' }}>No breaches</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.recentBreaches.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <code>{row.trxNo}</code>
                    </td>
                    <td>{row.status}</td>
                    <td>{row.priority}</td>
                    <td>
                      <Link to={`/transactions/${row.id}`}>View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
