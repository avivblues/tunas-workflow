import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../atoms/Button';
import { NotificationBell } from '../molecules/NotificationBell';
import { listNavMenu, type NavMenuItem } from '../../services/menu.service';
import './AppLayout.css';

const FALLBACK_NAV: NavMenuItem[] = [
  {
    id: 'fallback-dashboard',
    appCode: 'SYSTEM',
    menuCode: 'DASHBOARD',
    label: 'Dashboard',
    path: '/',
    icon: '🏠',
    sequence: 0,
    visible: true,
    showWeb: true,
    showMobile: false,
    roleCode: null,
  },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const [navItems, setNavItems] = useState<NavMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listNavMenu('WEB')
      .then(setNavItems)
      .catch(() => setNavItems(FALLBACK_NAV))
      .finally(() => setLoading(false));
  }, []);

  const items = navItems.length > 0 ? navItems : FALLBACK_NAV;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">🌱</span>
          <div>
            <div className="brand-name">Tunas Workflow</div>
            <div className="brand-tenant">{user?.tenant?.name}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {loading ? (
            <span className="nav-link" style={{ opacity: 0.6 }}>
              Loading menu...
            </span>
          ) : (
            items.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {item.icon ? `${item.icon} ` : ''}
                {item.label}
              </NavLink>
            ))
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-name">{user?.fullName}</div>
            <div className="user-role">{user?.roleName}</div>
          </div>
          <Button variant="ghost" onClick={logout}>
            Logout
          </Button>
        </div>
      </aside>

      <main className="main-content">
        <div className="main-topbar">
          <NotificationBell />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
