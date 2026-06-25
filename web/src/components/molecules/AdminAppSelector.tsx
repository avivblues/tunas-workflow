import { APP_ICONS } from '../../config/menu-presets';
import './AdminAppSelector.css';

export interface AdminAppOption {
  id?: string;
  appCode: string;
  label: string;
  active?: boolean;
}

interface AdminAppSelectorProps {
  options: AdminAppOption[];
  selected: string;
  onSelect: (appCode: string) => void;
  groupLabels?: { system: string; apps: string };
}

export function AdminAppSelector({
  options,
  selected,
  onSelect,
  groupLabels = { system: 'Sistem', apps: 'Aplikasi' },
}: AdminAppSelectorProps) {
  const system = options.filter((o) => o.appCode === 'SYSTEM');
  const apps = options.filter((o) => o.appCode !== 'SYSTEM');

  function renderChip(opt: AdminAppOption) {
    const isActive = selected === opt.appCode;
    const inactive = opt.active === false;
    return (
      <button
        key={opt.appCode}
        type="button"
        className={`admin-app-chip ${isActive ? 'active' : ''} ${inactive ? 'inactive' : ''}`}
        onClick={() => onSelect(opt.appCode)}
        title={opt.appCode}
      >
        <span className="admin-app-chip-icon">{APP_ICONS[opt.appCode] ?? '📋'}</span>
        <span className="admin-app-chip-label">{opt.label}</span>
        {inactive && <span className="admin-app-chip-badge">Nonaktif</span>}
      </button>
    );
  }

  return (
    <div className="admin-app-selector">
      {system.length > 0 && (
        <div className="admin-app-group">
          <div className="admin-app-group-label">{groupLabels.system}</div>
          <div className="admin-app-chips">{system.map(renderChip)}</div>
        </div>
      )}
      {apps.length > 0 && (
        <div className="admin-app-group">
          <div className="admin-app-group-label">{groupLabels.apps}</div>
          <div className="admin-app-chips">{apps.map(renderChip)}</div>
        </div>
      )}
    </div>
  );
}
