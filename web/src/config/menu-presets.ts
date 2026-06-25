import { APP_UI_CONFIG } from './apps';

export interface MenuPathPreset {
  menuCode: string;
  label: string;
  path: string;
  icon: string;
  showWeb: boolean;
  showMobile: boolean;
  hint: string;
}

const PRESET_META: Record<
  string,
  { menuCode: string; label: string; hint: string; showWeb: boolean; showMobile: boolean }
> = {
  LIST: {
    menuCode: 'LIST',
    label: 'Daftar',
    hint: 'Halaman utama daftar transaksi',
    showWeb: true,
    showMobile: true,
  },
  CREATE: {
    menuCode: 'CREATE',
    label: 'Buat Baru',
    hint: 'Form pembuatan transaksi baru',
    showWeb: false,
    showMobile: true,
  },
  DASHBOARD: {
    menuCode: 'DASHBOARD',
    label: 'Dashboard',
    hint: 'Ringkasan KPI & statistik',
    showWeb: false,
    showMobile: false,
  },
  MAP: {
    menuCode: 'MAP',
    label: 'Peta',
    hint: 'Tampilan peta lokasi',
    showWeb: true,
    showMobile: true,
  },
  CALENDAR: {
    menuCode: 'CALENDAR',
    label: 'Kalender',
    hint: 'Jadwal & kalender',
    showWeb: true,
    showMobile: false,
  },
  SCHEDULES: {
    menuCode: 'SCHEDULES',
    label: 'Jadwal',
    hint: 'Daftar jadwal terjadwal',
    showWeb: true,
    showMobile: false,
  },
};

export function getMenuPresetsForApp(appCode: string): MenuPathPreset[] {
  const ui = APP_UI_CONFIG[appCode];
  if (!ui) return [];

  const presets: MenuPathPreset[] = [];

  const add = (key: keyof typeof PRESET_META, path: string | undefined, icon: string) => {
    if (!path) return;
    const meta = PRESET_META[key];
    presets.push({
      menuCode: meta.menuCode,
      label: `${meta.label} — ${ui.label}`,
      path,
      icon,
      showWeb: meta.showWeb,
      showMobile: meta.showMobile,
      hint: meta.hint,
    });
  };

  add('LIST', ui.listPath, ui.icon);
  add('CREATE', ui.createPath, '➕');
  add('DASHBOARD', ui.dashboardPath, '📊');
  add('MAP', ui.mapPath, '🗺️');

  if (appCode === 'ENG_PM') {
    add('SCHEDULES', '/engineering/pm-schedules', '🗓️');
    add('CALENDAR', '/engineering/pm-calendar', '📆');
  }
  if (appCode === 'VEHICLE_BOOKING') {
    add('CALENDAR', '/vehicle/calendar', '📆');
  }

  return presets;
}

export const SYSTEM_MENU_PRESETS: MenuPathPreset[] = [
  {
    menuCode: 'DASHBOARD',
    label: 'Dashboard',
    path: '/',
    icon: '🏠',
    showWeb: true,
    showMobile: false,
    hint: 'Halaman utama',
  },
  {
    menuCode: 'APPROVALS',
    label: 'Persetujuan',
    path: '/approvals',
    icon: '✅',
    showWeb: true,
    showMobile: false,
    hint: 'Daftar menunggu approval',
  },
];

export const APP_ICONS: Record<string, string> = {
  SYSTEM: '⚙️',
  IT_SUPPORT: '💻',
  ENG_WO: '🔧',
  ENG_PM: '📅',
  ISP_TICKET: '📡',
  GA_SUPPORT: '🏢',
  VEHICLE_BOOKING: '🚗',
  BUILDING_MGMT: '🏗️',
};
