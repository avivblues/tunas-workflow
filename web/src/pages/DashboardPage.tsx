import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/atoms/Badge';
import { Card } from '../components/atoms/Card';
import { APP_UI_CONFIG, DEMO_APP_CODES, getAppIcon } from '../config/apps';
import { useAuth } from '../context/AuthContext';
import type { AppMaster } from '../services/app.service';
import { listApps } from '../services/app.service';
import { getTenant } from '../services/master.service';

export function DashboardPage() {
  const { user } = useAuth();
  const [apps, setApps] = useState<AppMaster[]>([]);
  const [tenantName, setTenantName] = useState('');

  useEffect(() => {
    listApps().then(setApps).catch(console.error);
    getTenant().then((t) => setTenantName(t.name)).catch(console.error);
  }, []);

  const demoApps = apps.filter((a) =>
    (DEMO_APP_CODES as readonly string[]).includes(a.appCode),
  );

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>
          Welcome, {user?.fullName} · {tenantName || user?.tenant?.name}
        </p>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <Card title="Demo Applications">
          <div className="app-grid">
            {demoApps.map((app) => {
              const ui = APP_UI_CONFIG[app.appCode];
              return (
                <Link
                  key={app.id}
                  to={ui?.dashboardPath ?? ui?.listPath ?? '/'}
                  className="app-card"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="app-card-icon">{getAppIcon(app.appCode, app.icon)}</div>
                  <div className="app-card-name">{app.name}</div>
                  <div className="app-card-code">{app.appCode}</div>
                  {app.active && <Badge variant="success">Active</Badge>}
                </Link>
              );
            })}
          </div>
        </Card>

        <Card title="Platform Status">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <Badge variant="success">Phase 1 — Auth & Config</Badge>
            <Badge variant="success">Phase 2 — Transaction Engine</Badge>
            <Badge variant="success">Phase 3 — Attachments & Asset Link</Badge>
            <Badge variant="success">Phase 4 — SLA, KPI & Dashboard</Badge>
            <Badge variant="success">Phase 5 — Engineering PM & Scheduler</Badge>
            <Badge variant="success">Phase 6 — Integrations & Marketplace</Badge>
            <Badge variant="success">Phase 7 — ISP Map & Mobile Shell</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}
