import { prisma } from '../../lib/prisma.js';
import { getConnectorByType } from '../connector/connector.service.js';
import type { IspConnectorPartnerConfig, IspPartnerCallbackEvent } from './isp-partner.types.js';
import { DEFAULT_ISP_CALLBACK_EVENTS, ISP_PARTNER_APP_CODES } from './isp-partner.types.js';

export type IspCallbackPayload = {
  event: IspPartnerCallbackEvent;
  trx_no: string;
  transaction_id: string;
  app_code: string;
  status: string;
  current_process: string;
  from_process?: string;
  to_process?: string;
  priority: string | null;
  sla_status: string | null;
  domain_code?: string | null;
  customer_id?: string;
  customer_name?: string;
  area?: string;
  updated_at: string;
  operator?: string;
  comment?: string;
  log_action?: string;
  log_description?: string;
};

function normalizeIspConfig(raw: unknown): IspConnectorPartnerConfig {
  return (raw && typeof raw === 'object' ? raw : {}) as IspConnectorPartnerConfig;
}

function detailValue(
  details: { fieldCode: string; value: unknown }[],
  fieldCode: string,
): string | undefined {
  const row = details.find((d) => d.fieldCode === fieldCode);
  return typeof row?.value === 'string' ? row.value : undefined;
}

async function buildCallbackPayload(
  tenantId: string,
  transactionId: string,
  event: IspPartnerCallbackEvent,
  extra?: Partial<IspCallbackPayload>,
): Promise<IspCallbackPayload | null> {
  const transaction = await prisma.transactionHeader.findFirst({
    where: { id: transactionId, tenantId, appCode: { in: [...ISP_PARTNER_APP_CODES] } },
    include: { details: true },
  });
  if (!transaction) return null;

  return {
    event,
    trx_no: transaction.trxNo,
    transaction_id: transaction.id,
    app_code: transaction.appCode,
    status: transaction.status,
    current_process: transaction.currentProcess,
    priority: transaction.priority,
    sla_status: transaction.slaStatus,
    domain_code: transaction.domainCode,
    customer_id: detailValue(transaction.details, 'customer_id'),
    customer_name: detailValue(transaction.details, 'customer_name'),
    area: detailValue(transaction.details, 'area'),
    updated_at: new Date().toISOString(),
    ...extra,
  };
}

export async function dispatchIspPartnerCallback(
  tenantId: string,
  transactionId: string,
  event: IspPartnerCallbackEvent,
  extra?: Partial<IspCallbackPayload>,
) {
  const connector = await getConnectorByType(tenantId, 'ISP');
  if (!connector) return;

  const config = normalizeIspConfig(connector.config);
  if (!config.callback_url) return;

  const allowed = config.callback_events ?? DEFAULT_ISP_CALLBACK_EVENTS;
  if (!allowed.includes(event)) return;

  const payload = await buildCallbackPayload(tenantId, transactionId, event, extra);
  if (!payload) return;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Tunas-Workflow-ISP-Partner/1.0',
    };
    if (config.callback_secret) {
      headers['X-Callback-Secret'] = config.callback_secret;
    }

    const response = await fetch(config.callback_url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error(
        `[ISP Callback] ${event} failed for ${payload.trx_no}: HTTP ${response.status} ${text}`,
      );
    }
  } catch (err) {
    console.error(`[ISP Callback] ${event} error for ${payload.trx_no}:`, err);
  }
}
