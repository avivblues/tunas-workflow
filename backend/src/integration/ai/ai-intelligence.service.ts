import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';
import { getResolutionHours } from '../../core/sla/sla.service.js';
import {
  completeChatWithConfig,
  describeLlmConfig,
  getPlatformLlmConfig,
} from './llm.client.js';
import { resolveUserLlmConfig } from './user-llm.service.js';

const RCA_KEYWORD_PATTERNS: { keywords: string[]; cause: string; recommendation: string }[] = [
  {
    keywords: ['lubric', 'oli', 'grease', 'spindle', 'pelumas'],
    cause: 'Pelumasan tidak memadai atau kualitas oli menurun',
    recommendation: 'Periksa level pelumas, jadwalkan penggantian oli, cek kebocoran seal spindle',
  },
  {
    keywords: ['overheat', 'panas', 'temperature', 'suhu', 'coolant'],
    cause: 'Masalah pendinginan atau suhu operasi berlebih',
    recommendation: 'Cek level coolant, filter, sirkulasi pompa, dan sensor suhu',
  },
  {
    keywords: ['network', 'offline', 'disconnect', 'los', 'fiber', 'ont', 'olt'],
    cause: 'Gangguan konektivitas jaringan atau perangkat akses',
    recommendation: 'Verifikasi status ONT/OLT, cek redaman fiber, reboot CPE, trace ke upstream',
  },
  {
    keywords: ['power', 'listrik', 'genset', 'voltage', 'mati'],
    cause: 'Gangguan suplai daya atau kelistrikan',
    recommendation: 'Cek MCB, UPS/genset, grounding, dan beban fasa',
  },
  {
    keywords: ['bearing', 'bearing', 'getar', 'vibrasi', 'vibration'],
    cause: 'Keausan bearing atau ketidakseimbangan mekanis',
    recommendation: 'Inspeksi bearing, alignment, balancing rotor, ukur getaran',
  },
  {
    keywords: ['belt', 'sabuk', 'chain', 'rantai'],
    cause: 'Keausan atau ketegangan belt/chain tidak optimal',
    recommendation: 'Periksa tension belt, aus permukaan, dan alignment pulley',
  },
  {
    keywords: ['filter', 'tersumbat', 'clog', 'debu', 'dust'],
    cause: 'Filter tersumbat atau kontaminasi debu/kotoran',
    recommendation: 'Bersihkan atau ganti filter, perbaiki seal area kerja',
  },
  {
    keywords: ['sensor', 'alarm', 'error code', 'fault'],
    cause: 'Sensor fault atau alarm mesin yang memerlukan kalibrasi/reset',
    recommendation: 'Baca fault code, kalibrasi sensor, cek kabel dan I/O panel',
  },
];

const TEXT_FIELDS = [
  'title',
  'description',
  'problem',
  'complaint',
  'issue_type',
  'breakdown_type',
  'notes',
];

function detailText(details: { fieldCode: string; value: unknown }[]): string {
  const parts: string[] = [];
  for (const field of TEXT_FIELDS) {
    const row = details.find((d) => d.fieldCode === field);
    if (typeof row?.value === 'string' && row.value.trim()) {
      parts.push(row.value.toLowerCase());
    }
  }
  return parts.join(' ');
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .split(/[\s,.;:!?()[\]{}"']+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 3),
  );
}

function extractAssetCodes(
  details: { fieldCode: string; value: unknown }[],
  assets: { asset?: { assetCode: string } | null }[],
): string[] {
  const codes = new Set<string>();
  const affected = details.find((d) => d.fieldCode === 'affected_asset');
  if (typeof affected?.value === 'string') codes.add(affected.value);
  for (const link of assets) {
    if (link.asset?.assetCode) codes.add(link.asset.assetCode);
  }
  return [...codes];
}

interface SimilarCase {
  id: string;
  trxNo: string;
  appCode: string;
  title: string | null;
  status: string;
  score: number;
  resolutionHours: number | null;
  assetCodes: string[];
  workLogSummary: string[];
  closedAt: string | null;
}

async function loadTransaction(tenantId: string, transactionId: string) {
  const transaction = await prisma.transactionHeader.findFirst({
    where: { id: transactionId, tenantId },
    include: {
      details: true,
      logs: { orderBy: { createdAt: 'asc' } },
      assets: { include: { asset: true } },
    },
  });
  if (!transaction) {
    throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
  }
  return transaction;
}

export async function findSimilarCases(tenantId: string, transactionId: string, limit = 5) {
  const current = await loadTransaction(tenantId, transactionId);
  const currentText = detailText(current.details);
  const currentTokens = tokenize(currentText);
  const currentAssets = extractAssetCodes(current.details, current.assets);

  const candidates = await prisma.transactionHeader.findMany({
    where: {
      tenantId,
      id: { not: transactionId },
      appCode: current.appCode,
      status: { in: ['CLOSED', 'OPEN'] },
    },
    include: {
      details: true,
      logs: { where: { action: { in: ['WORK_LOG', 'NOTE', 'CLOSE'] } }, orderBy: { createdAt: 'desc' }, take: 5 },
      assets: { include: { asset: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 150,
  });

  const scored: SimilarCase[] = [];

  for (const tx of candidates) {
    const text = detailText(tx.details);
    const tokens = tokenize(text);
    const assets = extractAssetCodes(tx.details, tx.assets);

    let score = 0;
    for (const asset of assets) {
      if (currentAssets.includes(asset)) score += 50;
    }
    for (const token of currentTokens) {
      if (tokens.has(token)) score += 8;
    }
    if (tx.status === 'CLOSED') score += 10;

    if (score < 8) continue;

    const titleRow = tx.details.find((d) => d.fieldCode === 'title');
    scored.push({
      id: tx.id,
      trxNo: tx.trxNo,
      appCode: tx.appCode,
      title: typeof titleRow?.value === 'string' ? titleRow.value : null,
      status: tx.status,
      score,
      resolutionHours:
        tx.closedAt && tx.status === 'CLOSED'
          ? getResolutionHours(tx.createdAt, tx.closedAt)
          : null,
      assetCodes: assets,
      workLogSummary: tx.logs
        .map((l) => l.description)
        .filter((d): d is string => Boolean(d))
        .slice(0, 3),
      closedAt: tx.closedAt?.toISOString() ?? null,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

function ruleBasedRootCauses(text: string) {
  const lower = text.toLowerCase();
  const matches: { cause: string; recommendation: string; confidence: 'high' | 'medium' | 'low' }[] = [];

  for (const pattern of RCA_KEYWORD_PATTERNS) {
    const hit = pattern.keywords.some((kw) => lower.includes(kw));
    if (hit) {
      matches.push({
        cause: pattern.cause,
        recommendation: pattern.recommendation,
        confidence: 'medium',
      });
    }
  }

  if (matches.length === 0) {
    matches.push({
      cause: 'Belum teridentifikasi — perlu inspeksi lapangan lebih lanjut',
      recommendation:
        'Dokumentasikan gejala, cek log mesin/perangkat, bandingkan dengan kasus serupa di bawah',
      confidence: 'low',
    });
  }

  return matches;
}

function buildTechnicianSteps(similar: SimilarCase[]) {
  const steps = new Map<string, number>();
  const spareparts = new Map<string, number>();

  for (const c of similar) {
    for (const log of c.workLogSummary) {
      const key = log.trim();
      if (key.length > 10) steps.set(key, (steps.get(key) ?? 0) + 1);
    }
  }

  const resolutions = similar
    .filter((c) => c.resolutionHours != null)
    .map((c) => c.resolutionHours!);
  const avgResolution =
    resolutions.length > 0
      ? Math.round((resolutions.reduce((a, b) => a + b, 0) / resolutions.length) * 10) / 10
      : null;

  return {
    suggestedSteps: [...steps.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([step, count]) => ({ step, seenInCases: count })),
    sparepartHints: [...spareparts.entries()].map(([part, count]) => ({ part, count })),
    estimatedResolutionHours: avgResolution,
    basedOnCases: similar.length,
  };
}

const RCA_SYSTEM_PROMPT = `You are a maintenance root-cause analyst for Tunas Workflow.
Analyze the current ticket and similar historical cases. Respond in Indonesian.
Return markdown with sections: ## Kemungkinan Root Cause, ## Bukti, ## Rekomendasi Perbaikan, ## Langkah Teknisi.
Use ONLY provided data — do not invent ticket numbers.`;

export async function analyzeRootCause(tenantId: string, userId: string, transactionId: string) {
  const transaction = await loadTransaction(tenantId, transactionId);
  const text = detailText(transaction.details);
  const similar = await findSimilarCases(tenantId, transactionId, 5);
  const ruleCauses = ruleBasedRootCauses(text);
  const technician = buildTechnicianSteps(similar);

  const evidence = [
    ...transaction.logs.slice(-5).map((l) => ({
      type: 'current_log' as const,
      action: l.action,
      description: l.description,
      at: l.createdAt.toISOString(),
    })),
    ...similar.slice(0, 3).map((s) => ({
      type: 'similar_case' as const,
      trxNo: s.trxNo,
      score: s.score,
      workLogs: s.workLogSummary,
    })),
  ];

  let narrative: string | null = null;
  let llmUsed = false;
  const userLlm = await resolveUserLlmConfig(userId);
  const activeConfig = userLlm ?? getPlatformLlmConfig();

  if (activeConfig) {
    try {
      const context = JSON.stringify(
        {
          current: {
            trxNo: transaction.trxNo,
            appCode: transaction.appCode,
            process: transaction.currentProcess,
            status: transaction.status,
            text,
            logs: transaction.logs.map((l) => ({
              action: l.action,
              description: l.description,
            })),
          },
          ruleCauses,
          similar,
          technician,
        },
        null,
        2,
      );
      const llmReply = await completeChatWithConfig(activeConfig, RCA_SYSTEM_PROMPT, [
        { role: 'user', content: `Analyze root cause:\n\`\`\`json\n${context}\n\`\`\`` },
      ]);
      if (llmReply) {
        narrative = llmReply;
        llmUsed = true;
      }
    } catch {
      // fall through to rule-based narrative
    }
  }

  if (!narrative) {
    const lines = [
      '## Kemungkinan Root Cause',
      ...ruleCauses.map((r) => `- **${r.cause}** (${r.confidence})`),
      '',
      '## Rekomendasi Perbaikan',
      ...ruleCauses.map((r) => `- ${r.recommendation}`),
      '',
      '## Kasus Serupa',
      ...(similar.length > 0
        ? similar.map(
            (s) =>
              `- **${s.trxNo}** (skor ${s.score})${s.resolutionHours != null ? ` — selesai ${s.resolutionHours}j` : ''}`,
          )
        : ['- Tidak ada kasus serupa yang cukup mirip dalam historis']),
    ];
    narrative = lines.join('\n');
  }

  return {
    transactionId,
    trxNo: transaction.trxNo,
    appCode: transaction.appCode,
    rootCauses: ruleCauses,
    similarCases: similar,
    technicianSuggestions: technician,
    evidence,
    narrative,
    llmUsed,
    llmProvider: activeConfig ? describeLlmConfig(activeConfig) : null,
  };
}

export async function getTechnicianSuggestions(
  tenantId: string,
  userId: string,
  transactionId: string,
) {
  const analysis = await analyzeRootCause(tenantId, userId, transactionId);
  return {
    transactionId: analysis.transactionId,
    trxNo: analysis.trxNo,
    suggestions: analysis.technicianSuggestions,
    similarCases: analysis.similarCases,
    quickSummary: analysis.rootCauses.slice(0, 2),
    narrative: analysis.narrative,
    llmUsed: analysis.llmUsed,
  };
}
