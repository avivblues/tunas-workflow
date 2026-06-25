import type { Connector } from '@prisma/client';
import {
  formatOutboundMarkdown,
  shouldNotifyOutbound,
  type OutboundNotifyConfig,
  type OutboundNotifyEvent,
  type OutboundTransactionPayload,
} from '../outbound-notify.shared.js';

export type SlackNotifyEvent = OutboundNotifyEvent;
export type SlackTransactionPayload = OutboundTransactionPayload;

interface SlackConnectorConfig extends OutboundNotifyConfig {
  webhook_url: string;
  channel_label?: string;
}

function parseConfig(connector: Connector): SlackConnectorConfig {
  return connector.config as unknown as SlackConnectorConfig;
}

export async function sendSlackMessage(webhookUrl: string, text: string) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Slack webhook failed (${response.status}): ${body}`);
  }
}

export async function notifySlack(
  connector: Connector,
  event: OutboundNotifyEvent,
  payload: OutboundTransactionPayload,
) {
  const config = parseConfig(connector);
  if (!config.webhook_url) {
    throw new Error('Slack webhook URL not configured');
  }
  if (!shouldNotifyOutbound(config, event)) return;

  const text = formatOutboundMarkdown(event, payload);
  await sendSlackMessage(config.webhook_url, text);
}

export async function testSlackConnection(connector: Connector) {
  const config = parseConfig(connector);
  if (!config.webhook_url) {
    throw new Error('Slack webhook URL not configured');
  }

  const channel = config.channel_label ? ` (#${config.channel_label})` : '';
  await sendSlackMessage(
    config.webhook_url,
    `✅ Tunas Workflow connected successfully${channel}`,
  );

  return { ok: true, channel: config.channel_label ?? null };
}
