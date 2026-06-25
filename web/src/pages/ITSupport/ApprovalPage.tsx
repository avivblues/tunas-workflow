import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/atoms/Badge';
import { Card } from '../../components/atoms/Card';
import type { TransactionHeader } from '../../services/transaction.service';
import { listPendingApprovals } from '../../services/transaction.service';

export function ApprovalPage() {
  const [items, setItems] = useState<TransactionHeader[]>([]);

  useEffect(() => {
    listPendingApprovals().then(setItems).catch(console.error);
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Pending Approvals</h1>
        <p>Tickets waiting for your action</p>
      </div>

      <Card title="Approval Queue">
        {items.length === 0 ? (
          <p style={{ color: '#64748b' }}>No pending approvals</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>App</th>
                <th>Process</th>
                <th>Priority</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id}>
                  <td>
                    <code>{t.trxNo}</code>
                  </td>
                  <td>{t.appCode}</td>
                  <td>{t.currentProcess}</td>
                  <td>
                    <Badge variant="info">{t.priority}</Badge>
                  </td>
                  <td>
                    <Link to={`/transactions/${t.id}`}>Review</Link>
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
