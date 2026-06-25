import { getConnectorByType } from './connector/connector.service.js';
import { getAnyDeskRemoteSupport } from './anydesk/anydesk.connector.js';
import { notifyTeams } from './microsoft/teams.connector.js';
import { notifySlack } from './slack/slack.connector.js';
import type {
  OutboundNotifyEvent,
  OutboundTransactionPayload,
} from './outbound-notify.shared.js';

export type IntegrationEvent = OutboundNotifyEvent;
export type IntegrationEventPayload = OutboundTransactionPayload;

async function enrichPayload(
  tenantId: string,
  event: IntegrationEvent,
  payload: IntegrationEventPayload,
): Promise<IntegrationEventPayload> {
  if (event !== 'TRANSACTION_ASSIGNED') return payload;

  const anydesk = await getConnectorByType(tenantId, 'ANYDESK');
  if (!anydesk) return payload;

  const config = anydesk.config as { append_to_assign?: boolean; support_anydesk_id?: string };
  if (config.append_to_assign === false || !config.support_anydesk_id) return payload;

  const info = await getAnyDeskRemoteSupport(tenantId);
  if (!info) return payload;

  return {
    ...payload,
    footer: `🖥️ AnyDesk Support ID: ${info.supportId}`,
  };
}

async function dispatchOutbound(
  tenantId: string,
  event: IntegrationEvent,
  payload: IntegrationEventPayload,
) {
  const enriched = await enrichPayload(tenantId, event, payload);

  const results = await Promise.allSettled([
    (async () => {
      const connector = await getConnectorByType(tenantId, 'SLACK');
      if (connector) await notifySlack(connector, event, enriched);
    })(),
    (async () => {
      const connector = await getConnectorByType(tenantId, 'TEAMS');
      if (connector) await notifyTeams(connector, event, enriched);
    })(),
  ]);

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(`[integration] ${event} dispatch failed:`, result.reason);
    }
  }
}

/**
 * Fire-and-forget outbound integration events (Slack, Teams, ...).
 */
export function dispatchIntegrationEvent(
  tenantId: string,
  event: IntegrationEvent,
  payload: IntegrationEventPayload,
) {
  void dispatchOutbound(tenantId, event, payload);
}

export function dispatchTransactionClosed(
  tenantId: string,
  payload: IntegrationEventPayload,
) {
  dispatchIntegrationEvent(tenantId, 'TRANSACTION_CLOSED', payload);

  if (payload.slaStatus === 'BREACHED') {
    dispatchIntegrationEvent(tenantId, 'SLA_BREACHED', payload);
  }
}
