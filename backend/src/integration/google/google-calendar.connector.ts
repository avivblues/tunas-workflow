import type { Connector } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';
import { getConnectorByType } from '../connector/connector.service.js';
import { parseServiceAccountJson } from './google-auth.client.js';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendars,
  updateCalendarEvent,
} from './google-calendar.client.js';

interface GoogleCalendarConfig {
  calendar_id: string;
  service_account_json: string;
  timezone?: string;
}

interface GoogleEventMapping {
  google_events?: Record<string, string>;
}

function parseConfig(connector: Connector): GoogleCalendarConfig {
  return connector.config as unknown as GoogleCalendarConfig;
}

function parseMapping(connector: Connector): GoogleEventMapping {
  return (connector.mapping ?? {}) as GoogleEventMapping;
}

function getServiceAccount(config: GoogleCalendarConfig) {
  if (!config.service_account_json) {
    throw new Error('Service account JSON not configured');
  }
  return parseServiceAccountJson(config.service_account_json);
}

function buildPmEventInput(schedule: {
  title: string;
  description: string | null;
  frequency: string;
  nextRunAt: Date;
  domainCode: string | null;
  asset?: { assetCode: string; name: string } | null;
}) {
  const start = new Date(schedule.nextRunAt);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const assetLine = schedule.asset
    ? `Asset: ${schedule.asset.assetCode} — ${schedule.asset.name}`
    : '';
  const description = [
    schedule.description ?? 'Preventive maintenance schedule from Tunas Workflow',
    `Frequency: ${schedule.frequency}`,
    assetLine,
    schedule.domainCode ? `Location: ${schedule.domainCode}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    summary: `[PM] ${schedule.title}`,
    description,
    start,
    end,
    location: schedule.domainCode ?? undefined,
  };
}

async function saveEventMapping(connectorId: string, mapping: GoogleEventMapping) {
  await prisma.connector.update({
    where: { id: connectorId },
    data: { mapping: mapping as Prisma.InputJsonValue },
  });
}

export async function testGoogleCalendarConnection(connector: Connector) {
  const config = parseConfig(connector);
  const serviceAccount = getServiceAccount(config);
  const calendars = await listCalendars(serviceAccount);

  return {
    ok: true,
    calendarId: config.calendar_id,
    accessibleCalendars: calendars.map((c) => ({ id: c.id, summary: c.summary })),
  };
}

export async function syncPmScheduleToGoogle(tenantId: string, scheduleId: string) {
  const connector = await getConnectorByType(tenantId, 'GOOGLE_CALENDAR');
  if (!connector) return null;

  const schedule = await prisma.pmSchedule.findFirst({
    where: { id: scheduleId, tenantId },
    include: { asset: true },
  });
  if (!schedule) return null;

  return upsertPmScheduleEvent(connector, schedule);
}

async function upsertPmScheduleEvent(
  connector: Connector,
  schedule: {
    id: string;
    title: string;
    description: string | null;
    frequency: string;
    nextRunAt: Date;
    domainCode: string | null;
    active: boolean;
    asset: { assetCode: string; name: string } | null;
  },
) {
  const config = parseConfig(connector);
  const serviceAccount = getServiceAccount(config);
  const mapping = parseMapping(connector);
  const eventMap = { ...(mapping.google_events ?? {}) };
  const existingEventId = eventMap[schedule.id];

  if (!schedule.active) {
    if (existingEventId) {
      await deleteCalendarEvent(serviceAccount, config.calendar_id, existingEventId);
      delete eventMap[schedule.id];
      await saveEventMapping(connector.id, { ...mapping, google_events: eventMap });
    }
    return { action: 'deleted' as const, scheduleId: schedule.id };
  }

  const eventInput = buildPmEventInput(schedule);

  if (existingEventId) {
    const updated = await updateCalendarEvent(
      serviceAccount,
      config.calendar_id,
      existingEventId,
      eventInput,
    );
    return {
      action: 'updated' as const,
      scheduleId: schedule.id,
      eventId: updated.id,
      htmlLink: updated.htmlLink,
    };
  }

  const created = await createCalendarEvent(serviceAccount, config.calendar_id, eventInput);
  eventMap[schedule.id] = created.id;
  await saveEventMapping(connector.id, { ...mapping, google_events: eventMap });

  return {
    action: 'created' as const,
    scheduleId: schedule.id,
    eventId: created.id,
    htmlLink: created.htmlLink,
  };
}

export async function syncAllPmSchedulesToGoogle(tenantId: string) {
  const connector = await getConnectorByType(tenantId, 'GOOGLE_CALENDAR');
  if (!connector) {
    throw new AppError(404, 'CONNECTOR_NOT_INSTALLED', 'Google Calendar connector not installed');
  }

  const schedules = await prisma.pmSchedule.findMany({
    where: { tenantId },
    include: { asset: true },
  });

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let failed = 0;

  for (const schedule of schedules) {
    try {
      const result = await upsertPmScheduleEvent(connector, schedule);
      if (result.action === 'created') created++;
      else if (result.action === 'updated') updated++;
      else if (result.action === 'deleted') deleted++;
    } catch (err) {
      failed++;
      console.error(`[google-calendar] sync failed for ${schedule.id}:`, err);
    }
  }

  return { total: schedules.length, created, updated, deleted, failed };
}

export function triggerPmScheduleCalendarSync(tenantId: string, scheduleId: string) {
  void syncPmScheduleToGoogle(tenantId, scheduleId).catch((err) => {
    console.error(`[google-calendar] schedule sync failed (${scheduleId}):`, err);
  });
}

function detailString(details: { fieldCode: string; value: unknown }[], code: string) {
  const row = details.find((d) => d.fieldCode === code);
  if (!row?.value) return null;
  return typeof row.value === 'string' ? row.value : String(row.value);
}

export async function syncVehicleBookingToGoogle(tenantId: string, transactionId: string) {
  const connector = await getConnectorByType(tenantId, 'GOOGLE_CALENDAR');
  if (!connector) return null;

  const transaction = await prisma.transactionHeader.findFirst({
    where: { id: transactionId, tenantId, appCode: 'VEHICLE_BOOKING' },
    include: { details: true },
  });
  if (!transaction) return null;

  const config = parseConfig(connector);
  const serviceAccount = getServiceAccount(config);
  const mapping = parseMapping(connector);
  const eventMap = { ...(mapping.google_events ?? {}) };
  const existingEventId = eventMap[transactionId];

  const title = detailString(transaction.details, 'title') ?? transaction.trxNo;
  const destination = detailString(transaction.details, 'destination');
  const startRaw = detailString(transaction.details, 'start_datetime');
  const endRaw = detailString(transaction.details, 'end_datetime');
  const start = startRaw ? new Date(startRaw) : new Date(transaction.createdAt);
  const end = endRaw ? new Date(endRaw) : new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const eventInput = {
    summary: `[Vehicle] ${title}`,
    description: [
      `Booking ${transaction.trxNo}`,
      destination ? `Destination: ${destination}` : '',
      transaction.domainCode ? `Pickup: ${transaction.domainCode}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    start,
    end,
    location: destination ?? transaction.domainCode ?? undefined,
  };

  if (existingEventId) {
    const updated = await updateCalendarEvent(
      serviceAccount,
      config.calendar_id,
      existingEventId,
      eventInput,
    );
    return { action: 'updated' as const, eventId: updated.id, htmlLink: updated.htmlLink };
  }

  const created = await createCalendarEvent(serviceAccount, config.calendar_id, eventInput);
  eventMap[transactionId] = created.id;
  await saveEventMapping(connector.id, { ...mapping, google_events: eventMap });

  return { action: 'created' as const, eventId: created.id, htmlLink: created.htmlLink };
}

export function triggerVehicleBookingCalendarSync(tenantId: string, transactionId: string) {
  void syncVehicleBookingToGoogle(tenantId, transactionId).catch((err) => {
    console.error(`[google-calendar] vehicle booking sync failed (${transactionId}):`, err);
  });
}
