import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';
import { getInitialProcess } from '../../core/routing/routing.service.js';
import { enqueueEvent } from '../connector/connector.service.js';
import { dispatchIntegrationEvent } from '../integration-dispatch.service.js';
import {
  getIotConnectorForTenant,
  meetsMinSeverity,
  resolveDomainLink,
} from './iot-config.service.js';
import type { IotSeverity } from './iot-config.types.js';

export const iotWorkOrderSchema = z.object({
  event_id: z.string().min(1),
  asset_code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  domain_code: z.string().optional(),
  operator: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const priorityMap: Record<string, string> = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

async function generateTrxNo(tenantId: string) {
  const count = await prisma.transactionHeader.count({ where: { tenantId } });
  return `TW${String(count + 1).padStart(5, '0')}`;
}

async function markIotEventProcessed(tenantId: string, eventId: string) {
  const events = await prisma.eventQueue.findMany({
    where: { tenantId, source: { in: ['IOT', 'MQTT'] }, processed: false },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  for (const event of events) {
    const payload = event.payload as { event_id?: string };
    if (payload.event_id === eventId) {
      await prisma.eventQueue.update({ where: { id: event.id }, data: { processed: true } });
    }
  }
}

export async function findExistingIotTransaction(tenantId: string, eventId: string) {
  const detail = await prisma.transactionDetail.findFirst({
    where: {
      fieldCode: 'iot_event_id',
      value: { equals: eventId },
      transaction: { is: { tenantId, appCode: 'ENG_WO' } },
    },
    include: { transaction: true },
  });
  return detail?.transaction ?? null;
}

export async function createWorkOrderFromIot(
  tenantId: string,
  input: z.infer<typeof iotWorkOrderSchema>,
  options?: { source?: 'IOT' | 'MQTT' },
) {
  const iot = await getIotConnectorForTenant(tenantId);
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { code: true } });
  const severity = (input.severity ?? 'HIGH') as IotSeverity;

  if (iot && !meetsMinSeverity(severity, iot.config.min_severity ?? 'MEDIUM')) {
    throw new AppError(
      422,
      'IOT_SEVERITY_BELOW_THRESHOLD',
      `Severity ${severity} is below minimum ${iot.config.min_severity ?? 'MEDIUM'}`,
    );
  }

  const requestedDomain = input.domain_code;
  if (requestedDomain && tenant && iot) {
    const link = resolveDomainLink(iot.mapping, requestedDomain, tenant.code);
    if (!link) {
      throw new AppError(
        422,
        'IOT_DOMAIN_NOT_LINKED',
        `Domain ${requestedDomain} is not linked to Tunas IoT`,
      );
    }
  }

  const existing = await findExistingIotTransaction(tenantId, input.event_id);
  if (existing) {
    await markIotEventProcessed(tenantId, input.event_id);
    return {
      duplicate: true,
      transaction_id: existing.id,
      trx_no: existing.trxNo,
      app_code: existing.appCode,
    };
  }

  const asset = await prisma.asset.findFirst({
    where: { tenantId, assetCode: input.asset_code },
  });
  if (!asset) {
    throw new AppError(404, 'ASSET_NOT_FOUND', `Asset ${input.asset_code} not found`);
  }

  await enqueueEvent(tenantId, options?.source ?? 'IOT', 'CREATE_WORK_ORDER', input);

  const initialProcess = await getInitialProcess(tenantId, 'ENG_WO');
  const trxNo = await generateTrxNo(tenantId);
  const priority = priorityMap[input.severity ?? 'HIGH'] ?? 'HIGH';
  const domainCode = input.domain_code ?? asset.locationCode ?? undefined;

  const transaction = await prisma.$transaction(async (tx) => {
    const header = await tx.transactionHeader.create({
      data: {
        tenantId,
        trxNo,
        appCode: 'ENG_WO',
        domainCode,
        currentProcess: initialProcess,
        priority,
        status: 'OPEN',
        slaStatus: 'ON_TRACK',
      },
    });

    await tx.transactionDetail.createMany({
      data: [
        { transactionId: header.id, fieldCode: 'title', value: input.title },
        { transactionId: header.id, fieldCode: 'problem', value: input.description },
        { transactionId: header.id, fieldCode: 'breakdown_type', value: 'BREAKDOWN' },
        { transactionId: header.id, fieldCode: 'affected_asset', value: input.asset_code },
        { transactionId: header.id, fieldCode: 'iot_event_id', value: input.event_id },
        { transactionId: header.id, fieldCode: 'iot_operator', value: input.operator ?? '' },
        {
          transactionId: header.id,
          fieldCode: 'iot_metadata',
          value: (input.metadata ?? {}) as object,
        },
      ],
    });

    await tx.transactionAsset.create({
      data: { transactionId: header.id, assetId: asset.id, usageType: 'AFFECTED' },
    });

    await tx.transactionLog.create({
      data: {
        transactionId: header.id,
        process: initialProcess,
        action: 'IOT_CREATE',
        description: `Work order created from Tunas IoT alert (${input.event_id})`,
      },
    });

    return header;
  });

  dispatchIntegrationEvent(tenantId, 'TRANSACTION_CREATED', {
    trxNo: transaction.trxNo,
    appCode: 'ENG_WO',
    priority,
    title: input.title,
    source: 'TUNAS_IOT',
  });

  await markIotEventProcessed(tenantId, input.event_id);

  return {
    duplicate: false,
    transaction_id: transaction.id,
    trx_no: transaction.trxNo,
    app_code: 'ENG_WO',
    domain_code: domainCode,
  };
}
