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
  createdAt: Date,
  closedAt: Date | null,
  priority: string | null | undefined,
  status: string,
  now: Date = new Date(),
): SlaStatus {
  const limitMs = getSlaHours(priority) * 60 * 60 * 1000;
  const end = closedAt ?? now;
  const elapsed = end.getTime() - createdAt.getTime();

  if (status === 'CLOSED') {
    return elapsed > limitMs ? 'BREACHED' : 'MET';
  }

  if (status === 'REJECTED') {
    return 'MET';
  }

  if (elapsed > limitMs) return 'BREACHED';
  if (elapsed > limitMs * 0.75) return 'AT_RISK';
  return 'ON_TRACK';
}

export function getResolutionHours(createdAt: Date, closedAt: Date): number {
  return (closedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
}
