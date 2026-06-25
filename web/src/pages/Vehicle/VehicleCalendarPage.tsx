import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/atoms/Badge';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { APP_UI_CONFIG } from '../../config/apps';
import { listTransactions, type TransactionHeader } from '../../services/transaction.service';

interface BookingRow {
  id: string;
  trxNo: string;
  title: string;
  destination: string;
  start: string;
  end: string;
  status: string;
  process: string;
}

function detailValue(details: { fieldCode: string; value: unknown }[] | undefined, key: string) {
  const row = details?.find((d) => d.fieldCode === key);
  if (!row?.value) return '—';
  return typeof row.value === 'string' ? row.value : String(row.value);
}

function formatWhen(iso: string) {
  if (!iso || iso === '—') return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function VehicleCalendarPage() {
  const config = APP_UI_CONFIG.VEHICLE_BOOKING;
  const [items, setItems] = useState<TransactionHeader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listTransactions({ app_code: 'VEHICLE_BOOKING', limit: 100, with_details: true })
      .then((res) => setItems(res.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const bookings = useMemo<BookingRow[]>(() => {
    return items
      .map((item) => {
        const ext = item as TransactionHeader & {
          details?: { fieldCode: string; value: unknown }[];
        };
        return {
          id: item.id,
          trxNo: item.trxNo,
          title: detailValue(item.details ?? ext.details, 'title'),
          destination: detailValue(item.details ?? ext.details, 'destination'),
          start: detailValue(item.details ?? ext.details, 'start_datetime'),
          end: detailValue(item.details ?? ext.details, 'end_datetime'),
          status: item.status,
          process: item.currentProcess,
        };
      })
      .sort((a, b) => {
        const ta = new Date(a.start).getTime();
        const tb = new Date(b.start).getTime();
        return (Number.isNaN(ta) ? 0 : ta) - (Number.isNaN(tb) ? 0 : tb);
      });
  }, [items]);

  const upcoming = bookings.filter((b) => {
    const start = new Date(b.start);
    return !Number.isNaN(start.getTime()) && start >= new Date() && b.status === 'OPEN';
  });

  const calendarDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { day: number | null; bookings: BookingRow[] }[] = [];

    for (let i = 0; i < startPad; i++) days.push({ day: null, bookings: [] });
    for (let d = 1; d <= daysInMonth; d++) {
      const dayBookings = bookings.filter((b) => {
        const start = new Date(b.start);
        return (
          !Number.isNaN(start.getTime()) &&
          start.getFullYear() === year &&
          start.getMonth() === month &&
          start.getDate() === d
        );
      });
      days.push({ day: d, bookings: dayBookings });
    }
    return { year, month, days };
  }, [bookings]);

  return (
    <div>
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div>
          <h1>🚗 Vehicle Booking Calendar</h1>
          <p>Upcoming and scheduled vehicle reservations</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to={config.listPath}>
            <Button variant="secondary">All Bookings</Button>
          </Link>
          <Link to={config.createPath}>
            <Button>New Booking</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <p>Loading calendar...</p>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <Card
            title={new Date(calendarDays.year, calendarDays.month).toLocaleString('id-ID', {
              month: 'long',
              year: 'numeric',
            })}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '0.35rem',
                fontSize: '0.85rem',
              }}
            >
              {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
                <div key={d} style={{ fontWeight: 600, textAlign: 'center', color: 'var(--color-muted)' }}>
                  {d}
                </div>
              ))}
              {calendarDays.days.map((cell, idx) => (
                <div
                  key={idx}
                  style={{
                    minHeight: 72,
                    border: '1px solid var(--color-border, #e2e8f0)',
                    borderRadius: 8,
                    padding: 4,
                    background: cell.day ? '#fff' : 'transparent',
                  }}
                >
                  {cell.day && (
                    <>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{cell.day}</div>
                      {cell.bookings.slice(0, 2).map((b) => (
                        <Link
                          key={b.id}
                          to={`/transactions/${b.id}`}
                          style={{
                            display: 'block',
                            fontSize: '0.7rem',
                            background: '#dbeafe',
                            borderRadius: 4,
                            padding: '2px 4px',
                            marginBottom: 2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {b.title}
                        </Link>
                      ))}
                      {cell.bookings.length > 2 && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)' }}>
                          +{cell.bookings.length - 2} more
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card title={`Upcoming (${upcoming.length})`}>
            {upcoming.length === 0 ? (
              <p style={{ color: 'var(--color-muted)' }}>No upcoming bookings.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Destination</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Process</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <strong>{b.title}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                          {b.trxNo}
                        </div>
                      </td>
                      <td>{b.destination}</td>
                      <td>{formatWhen(b.start)}</td>
                      <td>{formatWhen(b.end)}</td>
                      <td>
                        <Badge variant="info">{b.process}</Badge>
                      </td>
                      <td>
                        <Link to={`/transactions/${b.id}`}>View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="All Bookings">
            {bookings.length === 0 ? (
              <p style={{ color: 'var(--color-muted)' }}>No bookings yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Destination</th>
                    <th>Start</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id}>
                      <td>
                        {b.title}
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                          {b.trxNo}
                        </div>
                      </td>
                      <td>{b.destination}</td>
                      <td>{formatWhen(b.start)}</td>
                      <td>
                        <Badge variant={b.status === 'OPEN' ? 'info' : 'success'}>{b.status}</Badge>
                      </td>
                      <td>
                        <Link to={`/transactions/${b.id}`}>View</Link>
                      </td>
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
