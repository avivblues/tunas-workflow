import type { AppReport, ReportType } from '../services/report.service';

function escapeCsv(value: unknown): string {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function downloadAppReportCsv(report: AppReport, filenameBase: string) {
  const lines: string[] = [];

  lines.push(`# Laporan ${report.appCode} — ${report.reportType}`);
  lines.push(`# Periode,${escapeCsv(report.periodLabel ?? '')}`);
  lines.push(`# Generated,${report.generatedAt}`);
  lines.push('');

  lines.push('Ringkasan');
  lines.push(['Metrik', 'Nilai'].map(escapeCsv).join(','));
  for (const [key, val] of Object.entries(report.summary)) {
    lines.push([key, val].map(escapeCsv).join(','));
  }
  lines.push('');

  if (report.items.length > 0) {
    lines.push('Detail');
    const items = report.items as Record<string, unknown>[];
    const headers = [...new Set(items.flatMap((item) => Object.keys(item)))];
    lines.push(headers.map(escapeCsv).join(','));
    for (const item of items) {
      lines.push(headers.map((h) => escapeCsv(item[h])).join(','));
    }
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenameBase}-${report.reportType}-${report.period ?? 'period'}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function reportTypeLabel(type: ReportType): string {
  const labels: Record<string, string> = {
    complaint: 'komplain',
    sla: 'sla',
    asset_usage: 'sparepart-alat',
    sparepart: 'sparepart',
    aging: 'aging',
    technician: 'teknisi',
  };
  return labels[type] ?? type;
}
