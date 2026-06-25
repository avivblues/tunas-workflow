import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/atoms/Badge';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { SLABadge } from '../../components/molecules/SLABadge';
import type { AppUiConfig } from '../../config/apps';
import type { TransactionHeader } from '../../services/transaction.service';
import { listTransactions } from '../../services/transaction.service';

const priorityVariant: Record<string, 'default' | 'warning' | 'info' | 'success'> = {
  CRITICAL: 'warning',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'default',
};

export function TransactionListPage({ config }: { config: AppUiConfig }) {
  const [items, setItems] = useState<TransactionHeader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listTransactions({ app_code: config.appCode })
      .then((r) => setItems(r.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [config.appCode]);

  return (
    <div>
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div>
          <h1>
            {config.icon} {config.label}
          </h1>
          <p>All {config.itemLabel.toLowerCase()}s for your tenant</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to={config.dashboardPath}>
            <Button variant="secondary">Dashboard</Button>
          </Link>
          <Link to={config.createPath}>
            <Button>Create {config.itemLabel}</Button>
          </Link>
        </div>
      </div>

      <Card title={`${config.itemLabel} List`}>
        {loading ? (
          <p style={{ color: '#64748b' }}>Loading...</p>
        ) : items.length === 0 ? (
          <p style={{ color: '#64748b' }}>No records yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Location</th>
                <th>Process</th>
                <th>Priority</th>
                <th>SLA</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id}>
                  <td>
                    <code>{t.trxNo}</code>
                  </td>
                  <td>
                    <code style={{ fontSize: '0.75rem' }}>{t.domainCode ?? '—'}</code>
                  </td>
                  <td>{t.currentProcess}</td>
                  <td>
                    <Badge variant={priorityVariant[t.priority ?? 'MEDIUM'] ?? 'default'}>
                      {t.priority}
                    </Badge>
                  </td>
                  <td>
                    <SLABadge
                      slaStatus={t.slaStatus}
                      createdAt={t.createdAt}
                      closedAt={t.closedAt}
                      priority={t.priority}
                      status={t.status}
                    />
                  </td>
                  <td>
                    <Badge variant={t.status === 'OPEN' ? 'info' : 'default'}>{t.status}</Badge>
                  </td>
                  <td>{new Date(t.createdAt).toLocaleString()}</td>
                  <td>
                    <Link to={`/transactions/${t.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
