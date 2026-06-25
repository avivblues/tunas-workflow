import { buildTenantSnapshot, getPeriodRange } from './ai-context.service.js';
import type { ReportPeriod } from './ai.schema.js';

function formatDate(d: Date) {
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function generateOperationsReport(
  tenantId: string,
  period: ReportPeriod,
  appCode?: string,
) {
  const range = getPeriodRange(period);
  const snapshot = await buildTenantSnapshot(tenantId, {
    appCode,
    from: range.from,
    to: range.to,
  });

  const appFilter = appCode ? ` · App: **${appCode}**` : '';
  const lines: string[] = [
    `# Laporan Operasional ${range.label}${appFilter}`,
    ``,
    `**Periode:** ${formatDate(range.from)} — ${formatDate(range.to)}`,
    ``,
    `## Ringkasan`,
    `- Total transaksi: **${snapshot.summary.total}**`,
    `- Masih open: **${snapshot.summary.open}**`,
    `- Selesai (closed): **${snapshot.summary.closed}**`,
    `- SLA breach (open): **${snapshot.summary.slaBreachOpen}**`,
    `- Rata-rata waktu penyelesaian: **${snapshot.summary.avgResolutionHours} jam**`,
    `- Catatan kerja (work log): **${snapshot.summary.workLogCount}**`,
    ``,
  ];

  if (snapshot.byApp.length > 0) {
    lines.push(`## Per Aplikasi`);
    for (const row of snapshot.byApp) {
      const appName = snapshot.apps.find((a) => a.appCode === row.appCode)?.name ?? row.appCode;
      lines.push(`- **${appName}** (${row.appCode}): ${row.count} transaksi`);
    }
    lines.push('');
  }

  if (snapshot.recentTransactions.length > 0) {
    lines.push(`## Transaksi Terbaru`);
    for (const t of snapshot.recentTransactions.slice(0, 10)) {
      const title = t.title ? String(t.title) : '—';
      lines.push(
        `- **${t.trxNo}** [${t.appCode}] ${title} — ${t.status}/${t.process} (prioritas: ${t.priority ?? '—'})`,
      );
    }
    lines.push('');
  }

  if (snapshot.recentWorkLogs.length > 0) {
    lines.push(`## Riwayat Pekerjaan / Maintenance Log`);
    for (const log of snapshot.recentWorkLogs) {
      lines.push(`- **${log.trxNo}** [${log.appCode}]: ${log.description ?? log.action}`);
      const meta = log.metadata as {
        spareparts?: { asset_code?: string; qty: number }[];
        tools?: { asset_code?: string }[];
        workers?: { full_name?: string }[];
      } | null;
      if (meta?.spareparts?.length) {
        lines.push(
          `  - Sparepart: ${meta.spareparts.map((s) => `${s.asset_code}×${s.qty}`).join(', ')}`,
        );
      }
      if (meta?.tools?.length) {
        lines.push(`  - Alat: ${meta.tools.map((t) => t.asset_code).join(', ')}`);
      }
      if (meta?.workers?.length) {
        lines.push(`  - Teknisi: ${meta.workers.map((w) => w.full_name).join(', ')}`);
      }
    }
    lines.push('');
  }

  if (snapshot.maintenanceHistory.length > 0) {
    lines.push(`## Aset Terkait Maintenance`);
    for (const m of snapshot.maintenanceHistory.slice(0, 8)) {
      lines.push(
        `- **${m.assetCode}** ${m.assetName} — tiket ${m.trxNo} [${m.appCode}] ${m.status}/${m.process}`,
      );
    }
    lines.push('');
  }

  lines.push(`---`);
  lines.push(`*Laporan dihasilkan otomatis dari data Tunas Workflow.*`);

  return {
    period,
    appCode: appCode ?? null,
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
    markdown: lines.join('\n'),
    snapshot,
  };
}
