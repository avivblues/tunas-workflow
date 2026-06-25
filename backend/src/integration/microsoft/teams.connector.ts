import type { Connector } from '@prisma/client';
import {
  formatOutboundMarkdown,
  outboundEventTitle,
  outboundThemeColor,
  shouldNotifyOutbound,
  type OutboundNotifyConfig,
  type OutboundNotifyEvent,
  type OutboundTransactionPayload,
} from '../outbound-notify.shared.js';

export interface TeamsConnectorConfig extends OutboundNotifyConfig {
  webhook_url: string;
  channel_label?: string;
}

function parseConfig(connector: Connector): TeamsConnectorConfig {
  return connector.config as unknown as TeamsConnectorConfig;
}

function buildMessageCard(event: OutboundNotifyEvent, payload: OutboundTransactionPayload) {
  const facts = [
    { name: 'Transaction', value: payload.trxNo },
    { name: 'App', value: payload.appCode },
  ];

  if (payload.priority) facts.push({ name: 'Priority', value: payload.priority });
  if (payload.assigneeName) facts.push({ name: 'Assignee', value: payload.assigneeName });
  if (payload.slaStatus) facts.push({ name: 'SLA', value: payload.slaStatus });
  if (payload.source) facts.push({ name: 'Source', value: payload.source });
  if (payload.title) facts.push({ name: 'Title', value: payload.title });

  return {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    themeColor: outboundThemeColor(event),
    summary: outboundEventTitle(event, payload),
    title: outboundEventTitle(event, payload),
    text: formatOutboundTextPlain(event, payload) + (payload.footer ? `\n\n${payload.footer}` : ''),
    sections: [{ facts }],
  };
}

function formatOutboundTextPlain(
  event: OutboundNotifyEvent,
  payload: OutboundTransactionPayload,
) {
  return formatOutboundMarkdown(event, payload).replace(/\*/g, '').replace(/`/g, '');
}

export async function sendTeamsMessage(webhookUrl: string, card: object) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Teams webhook failed (${response.status}): ${body}`);
  }
}

export async function notifyTeams(
  connector: Connector,
  event: OutboundNotifyEvent,
  payload: OutboundTransactionPayload,
) {
  const config = parseConfig(connector);
  if (!config.webhook_url) {
    throw new Error('Teams webhook URL not configured');
  }
  if (!shouldNotifyOutbound(config, event)) return;

  const card = buildMessageCard(event, payload);
  await sendTeamsMessage(config.webhook_url, card);
}

export async function testTeamsConnection(connector: Connector) {
  const config = parseConfig(connector);
  if (!config.webhook_url) {
    throw new Error('Teams webhook URL not configured');
  }

  const channel = config.channel_label ? ` (#${config.channel_label})` : '';
  await sendTeamsMessage(config.webhook_url, {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    themeColor: '2EB886',
    summary: 'Tunas Workflow connected',
    title: 'Tunas Workflow',
    text: `✅ Tunas Workflow connected successfully${channel}`,
  });

  return { ok: true, channel: config.channel_label ?? null };
}
