export type IspPartnerCallbackEvent =
  | 'TICKET_CREATED'
  | 'TICKET_STATUS_CHANGED'
  | 'TICKET_CLOSED'
  | 'TICKET_LOG_ADDED';

export type IspConnectorPartnerConfig = {
  webhook_secret?: string;
  api_key?: string;
  callback_url?: string;
  callback_secret?: string;
  callback_events?: IspPartnerCallbackEvent[];
  /** Apps exposed via ISP Partner API (default: all bundle apps). */
  enabled_apps?: string[];
};

export const DEFAULT_ISP_CALLBACK_EVENTS: IspPartnerCallbackEvent[] = [
  'TICKET_CREATED',
  'TICKET_STATUS_CHANGED',
  'TICKET_CLOSED',
  'TICKET_LOG_ADDED',
];

export const ISP_PROCESS_CODES = [
  'REQUEST',
  'ASSIGN',
  'DISPATCH',
  'WORKING',
  'RESOLVED',
  'CLOSE',
] as const;

/** Apps included in the ISP product bundle (Partner API + callbacks). */
export const ISP_PARTNER_APP_CODES = [
  'ISP_TICKET',
  'ENG_PM',
  'GA_SUPPORT',
  'VEHICLE_BOOKING',
] as const;

export type IspPartnerAppCode = (typeof ISP_PARTNER_APP_CODES)[number];

export const ISP_PARTNER_PROCESS_FLOWS: Record<IspPartnerAppCode, readonly string[]> = {
  ISP_TICKET: ISP_PROCESS_CODES,
  ENG_PM: ['SCHEDULED', 'EXECUTE', 'CHECKLIST', 'VERIFY', 'CLOSE'],
  GA_SUPPORT: ['REQUEST', 'ASSIGN', 'WORKING', 'RESOLVED', 'CLOSE'],
  VEHICLE_BOOKING: ['REQUEST', 'APPROVAL', 'ASSIGN', 'ACTIVE', 'RETURN', 'CLOSE'],
};

export const DEFAULT_ISP_ENABLED_APPS: IspPartnerAppCode[] = [...ISP_PARTNER_APP_CODES];

export function isIspPartnerAppCode(appCode: string): appCode is IspPartnerAppCode {
  return (ISP_PARTNER_APP_CODES as readonly string[]).includes(appCode);
}

export function getIspPartnerProcessCodes(appCode: IspPartnerAppCode) {
  return ISP_PARTNER_PROCESS_FLOWS[appCode];
}
