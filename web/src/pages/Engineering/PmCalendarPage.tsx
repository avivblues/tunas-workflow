import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/atoms/Badge';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import {
  getPmCalendar,
  getPmCompliance,
  type PmCalendar,
  type PmCompliance,
} from '../../services/pm-schedule.service';

function monthLabel(date: Date) {
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

export function PmCalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [calendar, setCalendar] = useState<PmCalendar | null>(null);
  const [compliance, setCompliance] = useState<PmCompliance | null>(null);

  const range = useMemo(() => {
    const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [cursor]);

  useEffect(() => {
    Promise.all([getPmCalendar(range.from, range.to), getPmCompliance()])
      .then(([cal, comp]) => {
        setCalendar(cal);
        setCompliance(comp);
      })
      .catch(console.error);
  }, [range.from, range.to]);

  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();

  function eventsForDay(day: number) {
    if (!calendar) return { schedules: [], tasks: [] };
    const dayStart = new Date(cursor.getFullYear(), cursor.getMonth(), day);
    const dayEnd = new Date(cursor.getFullYear(), cursor.getMonth(), day, 23, 59, 59);

    const schedules = calendar.schedules.filter((s) => {
      const d = new Date(s.nextRunAt);
      return d >= dayStart && d <= dayEnd;
    });
    const tasks = calendar.pmTasks.filter((t) => {
      const d = new Date(t.scheduledAt);
      return d >= dayStart && d <= dayEnd;
    });
    return { schedules, tasks };
  }

  return (
    <div>
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div>
          <h1>📅 PM Calendar</h1>
          <p>Upcoming preventive maintenance schedules & generated tasks</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/engineering/pm-schedules">
            <Button variant="secondary">Manage Schedules</Button>
          </Link>
          <Link to="/engineering/pm">
            <Button variant="secondary">PM Tasks</Button>
          </Link>
        </div>
      </div>

      {compliance && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <Card title="Compliance Rate">
            <div className="stat-value">{compliance.complianceRate}%</div>
          </Card>
          <Card title="Active Schedules">
            <div className="stat-value">{compliance.activeSchedules}</div>
          </Card>
          <Card title="Overdue">
            <div className="stat-value stat-danger">{compliance.overdueSchedules}</div>
          </Card>
          <Card title="Open PM Tasks">
            <div className="stat-value">{compliance.pmOpen}</div>
          </Card>
          <Card title="Completed (Month)">
            <div className="stat-value stat-warning">{compliance.pmCompletedThisMonth}</div>
          </Card>
        </div>
      )}

      <Card title={monthLabel(cursor)}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <Button
            variant="secondary"
            onClick={() =>
              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
            }
          >
            ← Prev
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
            }
          >
            Next →
          </Button>
        </div>

        <div className="pm-calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="pm-calendar-head">
              {d}
            </div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="pm-calendar-cell empty" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const { schedules, tasks } = eventsForDay(day);
            const hasEvents = schedules.length > 0 || tasks.length > 0;
            return (
              <div key={day} className={`pm-calendar-cell ${hasEvents ? 'has-events' : ''}`}>
                <div className="pm-calendar-day">{day}</div>
                {schedules.map((s) => (
                  <div key={s.id} className="pm-calendar-event schedule" title={s.title}>
                    📋 {s.title}
                  </div>
                ))}
                {tasks.map((t) => (
                  <Link
                    key={t.id}
                    to={`/transactions/${t.id}`}
                    className="pm-calendar-event task"
                    title={t.trxNo}
                  >
                    🔧 {t.trxNo}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
          <span>
            <Badge variant="info">📋 Schedule</Badge> upcoming PM
          </span>
          <span>
            <Badge variant="success">🔧 Task</Badge> generated PM work
          </span>
        </div>
      </Card>
    </div>
  );
}
