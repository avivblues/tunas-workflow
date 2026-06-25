import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';
import { getInitialProcess } from '../../core/routing/routing.service.js';
import { enqueueEvent } from '../connector/connector.service.js';
import { getConnectorByType } from '../connector/connector.service.js';
import { dispatchIntegrationEvent } from '../integration-dispatch.service.js';
import { dispatchIspPartnerCallback } from './isp-callback.service.js';
import {
  DEFAULT_ISP_ENABLED_APPS,
  ISP_PARTNER_APP_CODES,
  isIspPartnerAppCode,
  type IspConnectorPartnerConfig,
  type IspPartnerAppCode,
} from './isp-partner.types.js';

export const ispWebhookSchema = z
  .object({
    app_code: z.enum(ISP_PARTNER_APP_CODES).default('ISP_TICKET'),
    event: z.enum(['CUSTOMER_COMPLAINT', 'DEVICE_OFFLINE', 'PACKAGE_ISSUE']).optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    area: z.string().optional(),
    device_serial: z.string().optional(),
    description: z.string().min(1),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    title: z.string().optional(),
    domain_code: z.string().optional(),
    details: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.app_code === 'ISP_TICKET') {
      if (!data.customer_name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'customer_name is required for ISP_TICKET',
          path: ['customer_name'],
        });
      }
      if (!data.area?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'area is required for ISP_TICKET',
          path: ['area'],
        });
      }
    }
  });

async function generateTrxNo(tenantId: string) {
  const count = await prisma.transactionHeader.count({ where: { tenantId } });
  return `TW${String(count + 1).padStart(5, '0')}`;
}

async function resolveDomainCode(tenantId: string, area?: string, domainCode?: string) {
  if (domainCode?.trim()) return domainCode.trim();
  if (!area?.trim()) return undefined;
  const domain = await prisma.domainNode.findFirst({
    where: { tenantId, name: { contains: area, mode: 'insensitive' } },
  });
  return domain?.domainCode;
}

async function resolveAssetId(tenantId: string, serial?: string) {
  if (!serial) return null;
  const asset = await prisma.asset.findFirst({
    where: {
      tenantId,
      OR: [{ assetCode: serial }, { serialNo: serial }],
    },
  });
  return asset?.id ?? null;
}

function defaultTitle(appCode: IspPartnerAppCode, input: z.infer<typeof ispWebhookSchema>) {
  if (input.title?.trim()) return input.title.trim();
  if (appCode === 'ISP_TICKET') {
    const event = input.event ?? 'CUSTOMER_COMPLAINT';
    return event === 'DEVICE_OFFLINE'
      ? `Device offline - ${input.customer_name}`
      : `ISP Complaint - ${input.customer_name}`;
  }
  if (appCode === 'ENG_PM') return `PM Request - ${input.description.slice(0, 60)}`;
  if (appCode === 'GA_SUPPORT') return `GA Request - ${input.description.slice(0, 60)}`;
  return `Vehicle Booking - ${input.description.slice(0, 60)}`;
}

function buildDetailRows(appCode: IspPartnerAppCode, input: z.infer<typeof ispWebhookSchema>, title: string) {
  const rows: { fieldCode: string; value: string }[] = [
    { fieldCode: 'title', value: title },
    { fieldCode: 'description', value: input.description },
  ];

  if (appCode === 'ISP_TICKET') {
    rows.push(
      { fieldCode: 'customer_name', value: input.customer_name ?? '' },
      { fieldCode: 'customer_id', value: input.customer_id ?? '' },
      { fieldCode: 'area', value: input.area ?? '' },
      { fieldCode: 'complaint', value: input.description },
      { fieldCode: 'source_event', value: input.event ?? 'CUSTOMER_COMPLAINT' },
    );
    if (input.device_serial) {
      rows.push({ fieldCode: 'device', value: input.device_serial });
    }
  }

  if (appCode === 'ENG_PM' && !input.details?.affected_asset) {
    rows.push({ fieldCode: 'frequency', value: 'ADHOC' });
  }

  if (appCode === 'GA_SUPPORT' && !input.details?.category) {
    rows.push({ fieldCode: 'category', value: 'GENERAL' });
  }

  if (appCode === 'VEHICLE_BOOKING') {
    if (!input.details?.purpose) rows.push({ fieldCode: 'purpose', value: input.description.slice(0, 120) });
  }

  for (const [fieldCode, value] of Object.entries(input.details ?? {})) {
    if (rows.some((r) => r.fieldCode === fieldCode)) continue;
    rows.push({ fieldCode, value: String(value) });
  }

  return rows;
}

export async function processIspWebhook(tenantId: string, input: z.infer<typeof ispWebhookSchema>) {
  const appCode = input.app_code;
  if (!isIspPartnerAppCode(appCode)) {
    throw new AppError(400, 'INVALID_APP', `Unsupported app_code ${appCode}`);
  }

  const connector = await getConnectorByType(tenantId, 'ISP');
  const connectorConfig = (connector?.config ?? {}) as IspConnectorPartnerConfig;
  const enabledApps = (connectorConfig.enabled_apps ?? DEFAULT_ISP_ENABLED_APPS).filter(
    (code): code is IspPartnerAppCode => isIspPartnerAppCode(code),
  );
  if (!enabledApps.includes(appCode)) {
    throw new AppError(400, 'APP_NOT_ENABLED', `${appCode} is not enabled for ISP Partner API`);
  }

  const event = await enqueueEvent(tenantId, 'ISP', input.event ?? appCode, input);
  const initialProcess = await getInitialProcess(tenantId, appCode);
  const trxNo = await generateTrxNo(tenantId);
  const domainCode =
    (await resolveDomainCode(tenantId, input.area, input.domain_code)) ?? undefined;
  const assetId = await resolveAssetId(tenantId, input.device_serial);
  const title = defaultTitle(appCode, input);
  const detailRows = buildDetailRows(appCode, input, title);

  const transaction = await prisma.$transaction(async (tx) => {
    const header = await tx.transactionHeader.create({
      data: {
        tenantId,
        trxNo,
        appCode,
        domainCode,
        currentProcess: initialProcess,
        priority: input.priority ?? 'MEDIUM',
        status: 'OPEN',
        slaStatus: 'ON_TRACK',
      },
    });

    await tx.transactionDetail.createMany({
      data: detailRows.map((row) => ({
        transactionId: header.id,
        fieldCode: row.fieldCode,
        value: row.value,
      })),
    });

    if (assetId) {
      await tx.transactionAsset.create({
        data: { transactionId: header.id, assetId, usageType: 'AFFECTED' },
      });
    }

    await tx.transactionLog.create({
      data: {
        transactionId: header.id,
        process: initialProcess,
        action: 'WEBHOOK_CREATE',
        description: `Auto-created from ISP Partner API (${appCode})`,
      },
    });

    await tx.eventQueue.update({
      where: { id: event.id },
      data: { processed: true },
    });

    return header;
  });

  dispatchIntegrationEvent(tenantId, 'TRANSACTION_CREATED', {
    trxNo: transaction.trxNo,
    appCode,
    priority: input.priority ?? 'MEDIUM',
    title,
    source: 'ISP_WEBHOOK',
  });

  void dispatchIspPartnerCallback(tenantId, transaction.id, 'TICKET_CREATED', {
    operator: 'ISP_WEBHOOK',
  });

  return {
    event_id: event.id,
    transaction_id: transaction.id,
    trx_no: transaction.trxNo,
    app_code: appCode,
  };
}
