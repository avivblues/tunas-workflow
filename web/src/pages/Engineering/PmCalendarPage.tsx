import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/atoms/Badge';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import {
  PmCalendarScheduleModal,
  type PmCalendarModalMode,
} from '../../components/molecules/PmCalendarScheduleModal';
import {
  getPmCalendar,
  getPmCompliance,
  type PmCalendar,
  type PmCompliance,
} from '../../services/pm-schedule.service';

function monthLabel(date: Date) {
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

type ContextMenuState = {
  x: number;
  y: number;
  day: number;
  scheduleId?: string;
  scheduleTitle?: string;
};

export function PmCalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [calendar, setCalendar] = useState<PmCalendar | null>(null);
  const [compliance, setCompliance] = useState<PmCompliance | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [modal, setModal] = useState<PmCalendarModalMode | null>(null);
  const [message, setMessage] = useState('');

  const range = useMemo(() => {
    const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [cursor]);

  async function reloadCalendar() {
    const [cal, comp] = await Promise.all([
      getPmCalendar(range.from, range.to),
      getPmCompliance(),
    ]);
    setCalendar(cal);
    setCompliance(comp);
  }

  useEffect(() => {
    reloadCalendar().catch(console.error);
  }, [range.from, range.to]);

  useEffect(() => {
    function closeMenu() {
      setContextMenu(null);
    }
    window.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, []);

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

  function openCreateModal(day: number) {
    setModal({
      type: 'create',
      day,
      month: cursor.getMonth() + 1,
      year: cursor.getFullYear(),
    });
    setContextMenu(null);
  }

  function openRescheduleModal(day: number, scheduleId: string) {
    setModal({
      type: 'reschedule',
      scheduleId,
      day,
      month: cursor.getMonth() + 1,
      year: cursor.getFullYear(),
    });
    setContextMenu(null);
  }

  function handleCellContextMenu(e: React.MouseEvent, day: number) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, day });
  }

  function handleScheduleContextMenu(
    e: React.MouseEvent,
    day: number,
    scheduleId: string,
    scheduleTitle: string,
  ) {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, day, scheduleId, scheduleTitle });
  }

  return (
    <div>
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div>
          <h1>📅 PM Calendar</h1>
          <p>
            Klik kanan pada tanggal untuk tambah jadwal, atau pada jadwal existing untuk reschedule
          </p>
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

      {message && <div className="alert alert-success">{message}</div>}

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

        <div className="pm-calendar-grid" onContextMenu={(e) => e.preventDefault()}>
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
              <div
                key={day}
                className={`pm-calendar-cell ${hasEvents ? 'has-events' : ''}`}
                onContextMenu={(e) => handleCellContextMenu(e, day)}
              >
                <div className="pm-calendar-day">{day}</div>
                {schedules.map((s) => (
                  <div
                    key={s.id}
                    className="pm-calendar-event schedule"
                    title={`${s.title} — klik kanan untuk reschedule`}
                    onContextMenu={(e) => handleScheduleContextMenu(e, day, s.id, s.title)}
                  >
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

        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
          <span>
            <Badge variant="info">📋 Schedule</Badge> klik kanan → reschedule
          </span>
          <span>
            <Badge variant="success">🔧 Task</Badge> generated PM work
          </span>
          <span style={{ color: '#64748b' }}>Klik kanan pada tanggal → tambah jadwal</span>
        </div>
      </Card>

      {contextMenu && (
        <div
          className="pm-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
          role="menu"
        >
          {contextMenu.scheduleId ? (
            <>
              <button
                type="button"
                className="pm-context-menu-item"
                onClick={() => openRescheduleModal(contextMenu.day, contextMenu.scheduleId!)}
              >
                📅 Reschedule — {contextMenu.scheduleTitle}
              </button>
              <button
                type="button"
                className="pm-context-menu-item"
                onClick={() => openCreateModal(contextMenu.day)}
              >
                ➕ Tambah jadwal PM (tanggal ini)
              </button>
            </>
          ) : (
            <button
              type="button"
              className="pm-context-menu-item"
              onClick={() => openCreateModal(contextMenu.day)}
            >
              ➕ Tambah jadwal PM
            </button>
          )}
        </div>
      )}

      {modal && (
        <PmCalendarScheduleModal
          mode={modal}
          onClose={() => setModal(null)}
          onSuccess={(msg) => {
            setMessage(msg);
            void reloadCalendar();
          }}
        />
      )}
    </div>
  );
}
