import { AppError } from '../../lib/response.js';
import { env } from '../../config/env.js';
import { buildTenantSnapshot, snapshotToContextText } from './ai-context.service.js';
import { generateOperationsReport } from './ai-report.service.js';
import type { ReportPeriod } from './ai.schema.js';
import {
  completeChatWithConfig,
  describeLlmConfig,
  getPlatformLlmConfig,
  isPlatformLlmConfigured,
} from './llm.client.js';
import { getUserLlmConfigView, resolveUserLlmConfig } from './user-llm.service.js';

const SYSTEM_PROMPT = `You are Tunas AI Assistant for a multi-tenant work management platform (IT Support, Engineering WO, PM, ISP, GA, Vehicle, Building Management).

Answer in Indonesian unless the user writes in English.
Use ONLY the provided JSON context data — do not invent ticket numbers or statistics.
Be concise, structured with markdown bullets/headers when helpful.
For maintenance history questions, cite trxNo, appCode, asset codes from context.
If data is insufficient, say what is missing and suggest filters (app, date range).`;

type ChatHistory = { role: 'user' | 'assistant'; content: string }[];

function detectReportPeriod(message: string): ReportPeriod | null {
  const m = message.toLowerCase();
  if (m.includes('laporan harian') || m.includes('daily report') || m.includes('report harian')) {
    return 'daily';
  }
  if (
    m.includes('laporan mingguan') ||
    m.includes('weekly report') ||
    m.includes('report mingguan')
  ) {
    return 'weekly';
  }
  if (
    m.includes('laporan bulanan') ||
    m.includes('monthly report') ||
    m.includes('report bulanan')
  ) {
    return 'monthly';
  }
  if (m.includes('harian') && (m.includes('laporan') || m.includes('report'))) return 'daily';
  if (m.includes('mingguan') && (m.includes('laporan') || m.includes('report'))) return 'weekly';
  if (m.includes('bulanan') && (m.includes('laporan') || m.includes('report'))) return 'monthly';
  return null;
}

function detectAppCode(message: string): string | undefined {
  const codes = [
    'IT_SUPPORT',
    'ENG_WO',
    'ENG_PM',
    'ISP_TICKET',
    'GA_SUPPORT',
    'VEHICLE_BOOKING',
    'BUILDING_MGMT',
  ];
  const upper = message.toUpperCase();
  return codes.find((c) => upper.includes(c));
}

function ruleBasedAnswer(
  message: string,
  snapshot: Awaited<ReturnType<typeof buildTenantSnapshot>>,
  hasLlm: boolean,
): string {
  const m = message.toLowerCase();

  if (m.includes('sla') || m.includes('breach')) {
    return [
      `**Status SLA saat ini:**`,
      `- Tiket open dengan SLA breach: **${snapshot.summary.slaBreachOpen}**`,
      `- Rata-rata waktu penyelesaian: **${snapshot.summary.avgResolutionHours} jam**`,
      `- Total open: **${snapshot.summary.open}** · closed: **${snapshot.summary.closed}**`,
    ].join('\n');
  }

  if (
    m.includes('maintenance') ||
    m.includes('pemeliharaan') ||
    m.includes('riwayat') ||
    m.includes('history')
  ) {
    if (snapshot.recentWorkLogs.length === 0 && snapshot.maintenanceHistory.length === 0) {
      return 'Belum ada riwayat maintenance/work log dalam data periode ini. Coba perluas rentang waktu atau cek tiket Engineering WO / PM.';
    }
    const lines = ['**Riwayat Maintenance & Pekerjaan:**', ''];
    for (const log of snapshot.recentWorkLogs.slice(0, 8)) {
      lines.push(`- **${log.trxNo}** [${log.appCode}]: ${log.description ?? log.action}`);
    }
    if (snapshot.maintenanceHistory.length > 0) {
      lines.push('', '**Aset terkait:**');
      for (const a of snapshot.maintenanceHistory.slice(0, 6)) {
        lines.push(`- ${a.assetCode} — ${a.assetName} (tiket ${a.trxNo})`);
      }
    }
    return lines.join('\n');
  }

  if (m.includes('open') || m.includes('terbuka') || m.includes('belum selesai')) {
    const openList = snapshot.recentTransactions.filter((t) => t.status === 'OPEN');
    if (openList.length === 0) return 'Tidak ada tiket open dalam sampel data terbaru.';
    return [
      `**Tiket Open (${openList.length} dalam sampel):**`,
      ...openList.slice(0, 8).map(
        (t) =>
          `- **${t.trxNo}** [${t.appCode}] ${t.title ?? '—'} — proses: ${t.process}, prioritas: ${t.priority ?? '—'}`,
      ),
    ].join('\n');
  }

  if (m.includes('sparepart') || m.includes('alat') || m.includes('tool')) {
    const withMeta = snapshot.recentWorkLogs.filter((l) => l.metadata);
    if (withMeta.length === 0) {
      return 'Belum ada catatan kerja dengan sparepart/alat tercatat. Teknisi dapat mencatat via tab **Catatan Kerja** di detail tiket.';
    }
    return [
      '**Penggunaan Sparepart & Alat (dari work log):**',
      ...withMeta.slice(0, 6).map((l) => `- ${l.trxNo}: ${l.description}`),
    ].join('\n');
  }

  return [
    `**Ringkasan Tunas Workflow:**`,
    `- Total transaksi (sampel): **${snapshot.summary.total}**`,
    `- Open: **${snapshot.summary.open}** · Closed: **${snapshot.summary.closed}**`,
    `- Work log: **${snapshot.summary.workLogCount}**`,
    ``,
    `Anda bisa bertanya:`,
    `- "Riwayat maintenance mesin CNC"`,
    `- "Tiket open SLA breach"`,
    `- "Generate laporan mingguan"`,
    `- "Sparepart yang dipakai minggu ini"`,
    ``,
    hasLlm
      ? ''
      : `_Mode: **Smart Analytics**. Hubungkan ChatGPT atau Gemini di menu **Koneksi AI** untuk jawaban natural language._`,
  ].join('\n');
}

export async function chatWithAssistant(
  tenantId: string,
  userId: string,
  message: string,
  options?: { appCode?: string; history?: ChatHistory },
) {
  if (!env.AI_ENABLED) {
    throw new AppError(503, 'AI_DISABLED', 'AI assistant is disabled');
  }

  const reportPeriod = detectReportPeriod(message);
  const appCode = options?.appCode ?? detectAppCode(message);

  if (reportPeriod) {
    const report = await generateOperationsReport(tenantId, reportPeriod, appCode);
    return {
      reply: report.markdown,
      mode: 'report' as const,
      report: {
        period: report.period,
        appCode: report.appCode,
        range: report.range,
      },
      llmUsed: false,
    };
  }

  const snapshot = await buildTenantSnapshot(tenantId, { appCode });
  const contextText = snapshotToContextText(snapshot);

  const history = options?.history ?? [];
  const llmMessages = [
    ...history.slice(-6),
    {
      role: 'user' as const,
      content: `Context data:\n\`\`\`json\n${contextText}\n\`\`\`\n\nUser question: ${message}`,
    },
  ];

  let reply: string;
  let llmUsed = false;
  let llmSource: 'user' | 'platform' | null = null;

  const userLlm = await resolveUserLlmConfig(userId);
  const platformLlm = getPlatformLlmConfig();
  const activeConfig = userLlm ?? platformLlm;
  const hasLlm = Boolean(activeConfig);

  try {
    if (activeConfig) {
      const llmReply = await completeChatWithConfig(activeConfig, SYSTEM_PROMPT, llmMessages);
      if (llmReply) {
        reply = llmReply;
        llmUsed = true;
        llmSource = activeConfig.source;
      } else {
        reply = ruleBasedAnswer(message, snapshot, hasLlm);
      }
    } else {
      reply = ruleBasedAnswer(message, snapshot, hasLlm);
    }
  } catch {
    reply = ruleBasedAnswer(message, snapshot, hasLlm);
  }

  return {
    reply,
    mode: 'chat' as const,
    llmUsed,
    llmSource,
    llmProvider: activeConfig ? describeLlmConfig(activeConfig) : null,
    contextSummary: snapshot.summary,
  };
}

export async function getAssistantStatus(userId: string) {
  const userConfig = await getUserLlmConfigView(userId);
  const platformConfigured = isPlatformLlmConfigured();

  return {
    enabled: env.AI_ENABLED,
    llmConfigured: Boolean(userConfig?.connected || platformConfigured),
    userLlm: userConfig,
    platformLlm: platformConfigured
      ? { provider: 'OPENAI', model: env.OPENAI_MODEL, source: 'platform' as const }
      : null,
    model: userConfig?.model ?? (platformConfigured ? env.OPENAI_MODEL : null),
    modes: ['chat', 'report', 'rca', 'suggestions'],
    reportPeriods: ['daily', 'weekly', 'monthly'],
  };
}
