import { getGoogleAccessToken, type GoogleServiceAccount } from './google-auth.client.js';

export interface GoogleCalendarEventInput {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
}

interface GoogleEventResponse {
  id: string;
  htmlLink?: string;
}

async function calendarRequest<T>(
  accessToken: string,
  method: string,
  path: string,
  body?: object,
): Promise<T> {
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });

  if (response.status === 204) {
    return {} as T;
  }

  const data = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(data.error?.message ?? `Google Calendar API error (${response.status})`);
  }

  return data;
}

function buildEventBody(input: GoogleCalendarEventInput) {
  return {
    summary: input.summary,
    description: input.description,
    location: input.location,
    start: { dateTime: input.start.toISOString(), timeZone: 'UTC' },
    end: { dateTime: input.end.toISOString(), timeZone: 'UTC' },
  };
}

export async function listCalendars(serviceAccount: GoogleServiceAccount) {
  const token = await getGoogleAccessToken(serviceAccount);
  const data = await calendarRequest<{ items?: { id: string; summary: string }[] }>(
    token,
    'GET',
    '/users/me/calendarList?maxResults=10',
  );
  return data.items ?? [];
}

export async function createCalendarEvent(
  serviceAccount: GoogleServiceAccount,
  calendarId: string,
  input: GoogleCalendarEventInput,
) {
  const token = await getGoogleAccessToken(serviceAccount);
  return calendarRequest<GoogleEventResponse>(
    token,
    'POST',
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    buildEventBody(input),
  );
}

export async function updateCalendarEvent(
  serviceAccount: GoogleServiceAccount,
  calendarId: string,
  eventId: string,
  input: GoogleCalendarEventInput,
) {
  const token = await getGoogleAccessToken(serviceAccount);
  return calendarRequest<GoogleEventResponse>(
    token,
    'PUT',
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    buildEventBody(input),
  );
}

export async function deleteCalendarEvent(
  serviceAccount: GoogleServiceAccount,
  calendarId: string,
  eventId: string,
) {
  const token = await getGoogleAccessToken(serviceAccount);
  await calendarRequest(token, 'DELETE', `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`);
}
