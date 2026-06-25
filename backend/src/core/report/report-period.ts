export type ReportPeriod = 'month' | 'year';

export interface ReportDateRange {
  from: Date;
  to: Date;
  period: ReportPeriod;
  year: number;
  month?: number;
  label: string;
}

export function resolveReportDateRange(options: {
  period?: ReportPeriod;
  year?: number;
  month?: number;
  days?: number;
}): ReportDateRange {
  const now = new Date();

  if (options.period === 'year') {
    const year = options.year ?? now.getFullYear();
    return {
      from: new Date(year, 0, 1),
      to: new Date(year + 1, 0, 1),
      period: 'year',
      year,
      label: String(year),
    };
  }

  if (options.period === 'month' || options.year !== undefined || options.month !== undefined) {
    const year = options.year ?? now.getFullYear();
    const month = options.month ?? now.getMonth() + 1;
    return {
      from: new Date(year, month - 1, 1),
      to: new Date(year, month, 1),
      period: 'month',
      year,
      month,
      label: `${year}-${String(month).padStart(2, '0')}`,
    };
  }

  if (options.days) {
    const to = new Date();
    const from = new Date(to.getTime() - options.days * 24 * 60 * 60 * 1000);
    return {
      from,
      to,
      period: 'month',
      year: from.getFullYear(),
      month: from.getMonth() + 1,
      label: `last_${options.days}_days`,
    };
  }

  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return {
    from: new Date(year, month - 1, 1),
    to: new Date(year, month, 1),
    period: 'month',
    year,
    month,
    label: `${year}-${String(month).padStart(2, '0')}`,
  };
}

export function monthKeysInRange(range: ReportDateRange): string[] {
  if (range.period === 'month' && range.month) {
    return [range.label];
  }
  const keys: string[] = [];
  for (let m = 0; m < 12; m += 1) {
    const d = new Date(range.year, m, 1);
    if (d >= range.from && d < range.to) {
      keys.push(`${range.year}-${String(m + 1).padStart(2, '0')}`);
    }
  }
  return keys;
}

export function monthKeyForDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
