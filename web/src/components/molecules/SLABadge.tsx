import { Badge } from '../atoms/Badge';
import { displaySlaStatus } from '../../utils/sla';

interface SLABadgeProps {
  slaStatus: string | null;
  createdAt: string;
  closedAt: string | null;
  priority: string | null;
  status: string;
}

const labels: Record<string, string> = {
  ON_TRACK: 'On Track',
  AT_RISK: 'At Risk',
  BREACHED: 'Breached',
  MET: 'SLA Met',
};

const variants: Record<string, 'default' | 'warning' | 'info' | 'success'> = {
  ON_TRACK: 'success',
  AT_RISK: 'warning',
  BREACHED: 'warning',
  MET: 'success',
};

export function SLABadge({ slaStatus, createdAt, closedAt, priority, status }: SLABadgeProps) {
  const computed = displaySlaStatus(slaStatus, createdAt, closedAt, priority, status);
  return (
    <Badge variant={variants[computed] ?? 'default'}>{labels[computed] ?? computed}</Badge>
  );
}
