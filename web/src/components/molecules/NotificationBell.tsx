import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '../../services/notification.service';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const data = await listNotifications();
    setItems(data.items);
    setUnread(data.unread);
  }

  useEffect(() => {
    load().catch(console.error);
    const interval = setInterval(() => load().catch(console.error), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleRead(item: NotificationItem) {
    if (!item.read) {
      await markNotificationRead(item.id);
      await load();
    }
    setOpen(false);
  }

  async function handleReadAll() {
    await markAllNotificationsRead();
    await load();
  }

  return (
    <div className="notification-bell" ref={ref}>
      <button
        type="button"
        className="notification-bell-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && <span className="notification-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button type="button" className="notification-mark-all" onClick={handleReadAll}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notification-list">
            {items.length === 0 ? (
              <p className="notification-empty">No notifications</p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className={`notification-item ${item.read ? '' : 'unread'}`}
                >
                  {item.refType === 'TRANSACTION' && item.refId ? (
                    <Link
                      to={`/transactions/${item.refId}`}
                      onClick={() => handleRead(item)}
                    >
                      <div className="notification-title">{item.title}</div>
                      <div className="notification-message">{item.message}</div>
                    </Link>
                  ) : (
                    <div onClick={() => handleRead(item)}>
                      <div className="notification-title">{item.title}</div>
                      <div className="notification-message">{item.message}</div>
                    </div>
                  )}
                  <div className="notification-time">
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
