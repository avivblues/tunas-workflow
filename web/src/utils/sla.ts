export const SLA_HOURS_BY_PRIORITY: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 72,
};

export type SlaStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'MET';

export function getSlaHours(priority: string | null | undefined): number {
  return SLA_HOURS_BY_PRIORITY[priority ?? 'MEDIUM'] ?? 24;
}

export function computeSlaStatus(
  createdAt: string | Date,
  closedAt: string | Date | null,
  priority: string | null | undefined,
  status: string,
): SlaStatus {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const closed = closedAt
    ? typeof closedAt === 'string'
      ? new Date(closedAt)
      : closedAt
    : null;
  const limitMs = getSlaHours(priority) * 60 * 60 * 1000;
  const end = closed ?? new Date();
  const elapsed = end.getTime() - created.getTime();

  if (status === 'CLOSED') return elapsed > limitMs ? 'BREACHED' : 'MET';
  if (status === 'REJECTED') return 'MET';
  if (elapsed > limitMs) return 'BREACHED';
  if (elapsed > limitMs * 0.75) return 'AT_RISK';
  return 'ON_TRACK';
}

export function displaySlaStatus(
  slaStatus: string | null,
  createdAt: string,
  closedAt: string | null,
  priority: string | null,
  status: string,
): SlaStatus {
  if (status === 'CLOSED' && slaStatus) {
    return slaStatus as SlaStatus;
  }
  return computeSlaStatus(createdAt, closedAt, priority, status);
}
