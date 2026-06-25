export type OutboundNotifyEvent =
  | 'TRANSACTION_CREATED'
  | 'TRANSACTION_ASSIGNED'
  | 'TRANSACTION_CLOSED'
  | 'SLA_BREACHED';

export interface OutboundTransactionPayload {
  trxNo: string;
  appCode: string;
  priority?: string | null;
  status?: string;
  title?: string;
  assigneeName?: string;
  slaStatus?: string | null;
  source?: string;
  footer?: string;
}

export const DEFAULT_NOTIFY_ON: OutboundNotifyEvent[] = [
  'TRANSACTION_CREATED',
  'TRANSACTION_ASSIGNED',
  'TRANSACTION_CLOSED',
  'SLA_BREACHED',
];

export interface OutboundNotifyConfig {
  notify_on?: OutboundNotifyEvent[];
}

export function shouldNotifyOutbound(
  config: OutboundNotifyConfig,
  event: OutboundNotifyEvent,
) {
  const allowed = config.notify_on ?? DEFAULT_NOTIFY_ON;
  return allowed.includes(event);
}

function withFooter(text: string, footer?: string) {
  return footer ? `${text}\n\n${footer}` : text;
}

export function formatOutboundText(
  event: OutboundNotifyEvent,
  payload: OutboundTransactionPayload,
) {
  const title = payload.title ? ` — ${payload.title}` : '';
  const source = payload.source ? ` (${payload.source})` : '';

  let text: string;
  switch (event) {
    case 'TRANSACTION_CREATED':
      text = `🆕 New ${payload.appCode} ${payload.trxNo}${title}${source}\nPriority: ${payload.priority ?? 'MEDIUM'}`;
      break;
    case 'TRANSACTION_ASSIGNED':
      text = `👤 Assigned ${payload.trxNo} (${payload.appCode})${title}\nAssignee: ${payload.assigneeName ?? '—'}`;
      break;
    case 'TRANSACTION_CLOSED':
      text = `✅ Closed ${payload.trxNo} (${payload.appCode})${title}\nSLA: ${payload.slaStatus ?? '—'}`;
      break;
    case 'SLA_BREACHED':
      text = `🚨 SLA Breached ${payload.trxNo} (${payload.appCode})${title}`;
      break;
    default:
      text = `Tunas Workflow: ${payload.trxNo} (${payload.appCode})`;
  }

  return withFooter(text, payload.footer);
}

export function formatOutboundMarkdown(
  event: OutboundNotifyEvent,
  payload: OutboundTransactionPayload,
) {
  const title = payload.title ? ` — ${payload.title}` : '';
  const source = payload.source ? ` (${payload.source})` : '';

  let text: string;
  switch (event) {
    case 'TRANSACTION_CREATED':
      text = `🆕 *New ${payload.appCode}* \`${payload.trxNo}\`${title}${source}\nPriority: ${payload.priority ?? 'MEDIUM'}`;
      break;
    case 'TRANSACTION_ASSIGNED':
      text = `👤 *Assigned* \`${payload.trxNo}\` (${payload.appCode})${title}\nAssignee: ${payload.assigneeName ?? '—'}`;
      break;
    case 'TRANSACTION_CLOSED':
      text = `✅ *Closed* \`${payload.trxNo}\` (${payload.appCode})${title}\nSLA: ${payload.slaStatus ?? '—'}`;
      break;
    case 'SLA_BREACHED':
      text = `🚨 *SLA Breached* \`${payload.trxNo}\` (${payload.appCode})${title}`;
      break;
    default:
      text = `Tunas Workflow: ${payload.trxNo} (${payload.appCode})`;
  }

  return withFooter(text, payload.footer);
}

export function outboundThemeColor(event: OutboundNotifyEvent) {
  switch (event) {
    case 'TRANSACTION_CREATED':
      return '2EB886';
    case 'TRANSACTION_ASSIGNED':
      return '0078D4';
    case 'TRANSACTION_CLOSED':
      return '6264A7';
    case 'SLA_BREACHED':
      return 'D13438';
    default:
      return '0078D4';
  }
}

export function outboundEventTitle(event: OutboundNotifyEvent, payload: OutboundTransactionPayload) {
  switch (event) {
    case 'TRANSACTION_CREATED':
      return `New ${payload.appCode}`;
    case 'TRANSACTION_ASSIGNED':
      return `Assigned ${payload.trxNo}`;
    case 'TRANSACTION_CLOSED':
      return `Closed ${payload.trxNo}`;
    case 'SLA_BREACHED':
      return `SLA Breached ${payload.trxNo}`;
    default:
      return 'Tunas Workflow';
  }
}
