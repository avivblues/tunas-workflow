import { SLABadge } from './SLABadge';

interface SLAIndicatorProps {
  label?: string;
  slaStatus: string | null;
  createdAt: string;
  closedAt: string | null;
  priority: string | null;
  status: string;
}

export function SLAIndicator({
  label = 'SLA',
  slaStatus,
  createdAt,
  closedAt,
  priority,
  status,
}: SLAIndicatorProps) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{label}</span>
      <SLABadge
        slaStatus={slaStatus}
        createdAt={createdAt}
        closedAt={closedAt}
        priority={priority}
        status={status}
      />
    </div>
  );
}
