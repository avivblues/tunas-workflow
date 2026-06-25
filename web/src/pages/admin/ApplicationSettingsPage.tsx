import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminAppSelector } from '../../components/molecules/AdminAppSelector';
import { listAppConfig } from '../../services/app.service';
import { listMenuGroups } from '../../services/menu.service';
import { AppMenuPanel } from './AppMenuPanel';
import { AppProcessPanel } from './AppProcessPanel';
import './admin-settings.css';

type SettingsTab = 'process' | 'menu';

interface ApplicationSettingsPageProps {
  defaultTab: SettingsTab;
}

export function ApplicationSettingsPage({ defaultTab }: ApplicationSettingsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as SettingsTab) || defaultTab;
  const [menuGroups, setMenuGroups] = useState<{ appCode: string; label: string }[]>([]);
  const [apps, setApps] = useState<
    { id: string; appCode: string; name: string; active: boolean }[]
  >([]);
  const [selectedAppCode, setSelectedAppCode] = useState(
    searchParams.get('app') ?? (defaultTab === 'menu' ? 'IT_SUPPORT' : 'IT_SUPPORT'),
  );

  useEffect(() => {
    Promise.all([listMenuGroups(), listAppConfig()])
      .then(([groups, appRows]) => {
        setMenuGroups(groups);
        setApps(
          appRows.map((a) => ({
            id: a.id,
            appCode: a.appCode,
            name: a.name,
            active: a.active,
          })),
        );
      })
      .catch(console.error);
  }, []);

  const appSelectorOptions = useMemo(() => {
    if (tab === 'menu') {
      return menuGroups.map((g) => ({ appCode: g.appCode, label: g.label }));
    }
    return apps.map((a) => ({
      id: a.id,
      appCode: a.appCode,
      label: a.name,
      active: a.active,
    }));
  }, [tab, menuGroups, apps]);

  const selectedAppId = apps.find((a) => a.appCode === selectedAppCode)?.id ?? apps[0]?.id ?? null;

  const selectedLabel =
    menuGroups.find((g) => g.appCode === selectedAppCode)?.label ??
    apps.find((a) => a.appCode === selectedAppCode)?.name ??
    selectedAppCode;

  function switchTab(next: SettingsTab) {
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    if (selectedAppCode) params.set('app', selectedAppCode);
    setSearchParams(params);
    if (next === 'menu' && selectedAppCode === 'SYSTEM') {
      // keep system
    } else if (next === 'process' && selectedAppCode === 'SYSTEM') {
      setSelectedAppCode(apps[0]?.appCode ?? 'IT_SUPPORT');
    }
  }

  function selectApp(appCode: string) {
    setSelectedAppCode(appCode);
    const params = new URLSearchParams(searchParams);
    params.set('app', appCode);
    params.set('tab', tab);
    setSearchParams(params);
  }

  return (
    <div>
      <div className="page-header">
        <h1>Pengaturan Aplikasi</h1>
        <p>
          Konfigurasi alur proses, routing approval, dan menu navigasi per aplikasi — semua dalam
          satu tempat.
        </p>
      </div>

      <div className="admin-settings-tabs">
        <button
          type="button"
          className={`admin-settings-tab ${tab === 'process' ? 'active' : ''}`}
          onClick={() => switchTab('process')}
        >
          ⚙️ Proses & Routing
        </button>
        <button
          type="button"
          className={`admin-settings-tab ${tab === 'menu' ? 'active' : ''}`}
          onClick={() => switchTab('menu')}
        >
          📋 Menu Navigasi
        </button>
      </div>

      <AdminAppSelector
        options={appSelectorOptions.filter((o) => tab === 'menu' || o.appCode !== 'SYSTEM')}
        selected={selectedAppCode}
        onSelect={selectApp}
      />

      {tab === 'process' ? (
        <AppProcessPanel selectedAppId={selectedAppId} />
      ) : (
        <AppMenuPanel selectedApp={selectedAppCode} selectedLabel={selectedLabel} />
      )}
    </div>
  );
}
