import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';
import { getAppReport, getAppReportBundle } from '../../core/report/report.service.js';
import { computeSlaStatus, getResolutionHours } from '../../core/sla/sla.service.js';
import { isFinalProcess } from '../../core/routing/routing.service.js';
import { dispatchIspPartnerCallback } from './isp-callback.service.js';
import type {
  ispPartnerListQuerySchema,
  ispPartnerLogSchema,
  ispPartnerReportBundleQuerySchema,
  ispPartnerReportQuerySchema,
  ispPartnerUpdateSchema,
} from './isp-partner.schema.js';
import {
  ISP_PARTNER_APP_CODES,
  getIspPartnerProcessCodes,
  isIspPartnerAppCode,
  type IspPartnerAppCode,
} from './isp-partner.types.js';
import type { z } from 'zod';

type TxWithDetails = Prisma.TransactionHeaderGetPayload<{
  include: {
    details: true;
    logs: { orderBy: { createdAt: 'asc' } };
    assets: { include: { asset: true } };
  };
}>;

function detailValue(details: { fieldCode: string; value: unknown }[], fieldCode: string) {
  const row = details.find((d) => d.fieldCode === fieldCode);
  if (row?.value === null || row?.value === undefined) return null;
  if (typeof row.value === 'string' || typeof row.value === 'number' || typeof row.value === 'boolean') {
    return row.value;
  }
  return row.value;
}

function mapTicketSummary(tx: TxWithDetails, availableTransitions?: string[]) {
  return {
    transaction_id: tx.id,
    trx_no: tx.trxNo,
    app_code: tx.appCode,
    status: tx.status,
    current_process: tx.currentProcess,
    priority: tx.priority,
    sla_status: tx.slaStatus,
    domain_code: tx.domainCode,
    assign_to: tx.assignTo,
    customer_id: detailValue(tx.details, 'customer_id'),
    customer_name: detailValue(tx.details, 'customer_name'),
    area: detailValue(tx.details, 'area'),
    title: detailValue(tx.details, 'title'),
    complaint: detailValue(tx.details, 'complaint') ?? detailValue(tx.details, 'description'),
    device: detailValue(tx.details, 'device'),
    source_event: detailValue(tx.details, 'source_event'),
    created_at: tx.createdAt,
    updated_at:
      tx.logs && tx.logs.length > 0 ? tx.logs[tx.logs.length - 1].createdAt : tx.createdAt,
    closed_at: tx.closedAt,
    resolution_hours: tx.closedAt ? getResolutionHours(tx.createdAt, tx.closedAt) : null,
    available_transitions: availableTransitions ?? [],
  };
}

async function getPartnerTransitions(tenantId: string, appCode: IspPartnerAppCode, fromProcess: string) {
  const app = await prisma.appMaster.findUnique({
    where: { tenantId_appCode: { tenantId, appCode } },
    include: { routing: true },
  });
  if (!app) {
    throw new AppError(404, 'APP_NOT_FOUND', `${appCode} not configured`);
  }
  return app.routing.filter((r) => r.fromProcess === fromProcess);
}

async function resolvePartnerNextProcess(
  tenantId: string,
  appCode: IspPartnerAppCode,
  fromProcess: string,
  requestedToProcess?: string,
) {
  const transitions = await getPartnerTransitions(tenantId, appCode, fromProcess);
  if (transitions.length === 0) {
    throw new AppError(400, 'NO_ROUTING', `No routing defined from process ${fromProcess}`);
  }
  if (requestedToProcess) {
    const match = transitions.find((t) => t.toProcess === requestedToProcess);
    if (!match) {
      throw new AppError(
        400,
        'INVALID_TRANSITION',
        `Cannot transition from ${fromProcess} to ${requestedToProcess}`,
      );
    }
    return match.toProcess;
  }
  if (transitions.length > 1) {
    throw new AppError(
      400,
      'AMBIGUOUS_ROUTING',
      'Multiple transitions available — specify to_process',
    );
  }
  return transitions[0].toProcess;
}

async function findPartnerTicket(tenantId: string, trxNo: string) {
  const transaction = await prisma.transactionHeader.findFirst({
    where: {
      tenantId,
      trxNo,
      appCode: { in: [...ISP_PARTNER_APP_CODES] },
    },
    include: {
      details: true,
      logs: { orderBy: { createdAt: 'asc' } },
      assets: { include: { asset: true } },
    },
  });
  if (!transaction) {
    throw new AppError(404, 'TICKET_NOT_FOUND', `Ticket ${trxNo} not found`);
  }
  if (!isIspPartnerAppCode(transaction.appCode)) {
    throw new AppError(404, 'TICKET_NOT_FOUND', `Ticket ${trxNo} not found`);
  }
  return transaction;
}

export async function listIspPartnerTickets(
  tenantId: string,
  query: z.infer<typeof ispPartnerListQuerySchema>,
) {
  const appCodes = query.app_code ? [query.app_code] : [...ISP_PARTNER_APP_CODES];

  const where: Prisma.TransactionHeaderWhereInput = {
    tenantId,
    appCode: { in: appCodes },
    ...(query.status ? { status: query.status } : {}),
    ...(query.process ? { currentProcess: query.process } : {}),
    ...(query.since ? { createdAt: { gte: new Date(query.since) } } : {}),
  };

  if (query.area || query.customer_id) {
    where.details = {
      some: {
        AND: [
          ...(query.area
            ? [{ fieldCode: 'area', value: { equals: query.area } }]
            : []),
          ...(query.customer_id
            ? [{ fieldCode: 'customer_id', value: { equals: query.customer_id } }]
            : []),
        ],
      },
    };
  }

  const [items, total] = await Promise.all([
    prisma.transactionHeader.findMany({
      where,
      include: { details: true, logs: false, assets: false },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.transactionHeader.count({ where }),
  ]);

  const summaries = await Promise.all(
    items.map(async (tx) => {
      if (!isIspPartnerAppCode(tx.appCode)) {
        return mapTicketSummary(tx as TxWithDetails, []);
      }
      const transitions = await getPartnerTransitions(tenantId, tx.appCode, tx.currentProcess);
      return mapTicketSummary(tx as TxWithDetails, transitions.map((t) => t.toProcess));
    }),
  );

  return {
    items: summaries,
    supported_apps: [...ISP_PARTNER_APP_CODES],
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      total_pages: Math.ceil(total / query.limit),
    },
  };
}

export async function getIspPartnerTicket(tenantId: string, trxNo: string) {
  const transaction = await findPartnerTicket(tenantId, trxNo);
  const appCode = transaction.appCode as IspPartnerAppCode;
  const transitions = await getPartnerTransitions(tenantId, appCode, transaction.currentProcess);
  const processFlow = getIspPartnerProcessCodes(appCode);

  return {
    ...mapTicketSummary(transaction, transitions.map((t) => t.toProcess)),
    assets: transaction.assets.map((row) => ({
      asset_id: row.assetId,
      asset_code: row.asset.assetCode,
      name: row.asset.name,
      usage_type: row.usageType,
    })),
    logs: transaction.logs.map((log) => ({
      id: log.id,
      process: log.process,
      action: log.action,
      description: log.description,
      created_at: log.createdAt,
      user_id: log.userId,
    })),
    process_flow: processFlow,
  };
}

export async function updateIspPartnerTicket(
  tenantId: string,
  trxNo: string,
  input: z.infer<typeof ispPartnerUpdateSchema>,
) {
  const transaction = await findPartnerTicket(tenantId, trxNo);
  const appCode = transaction.appCode as IspPartnerAppCode;

  if (transaction.status === 'CLOSED' || transaction.status === 'REJECTED') {
    throw new AppError(400, 'TICKET_CLOSED', 'Ticket is already closed or rejected');
  }

  const fromProcess = transaction.currentProcess;
  let nextProcess = transaction.currentProcess;
  let newStatus = transaction.status;
  let assignTo = transaction.assignTo;

  if (input.action === 'ASSIGN') {
    if (!input.assign_to) {
      throw new AppError(400, 'ASSIGN_REQUIRED', 'assign_to is required for ASSIGN action');
    }
    assignTo = input.assign_to;
    nextProcess = await resolvePartnerNextProcess(tenantId, appCode, fromProcess, input.to_process);
  } else if (input.action === 'ADVANCE') {
    nextProcess = await resolvePartnerNextProcess(tenantId, appCode, fromProcess, input.to_process);
    const final = await isFinalProcess(tenantId, appCode, nextProcess);
    if (final) newStatus = 'CLOSED';
  } else if (input.action === 'CLOSE') {
    const final = await isFinalProcess(tenantId, appCode, transaction.currentProcess);
    if (!final) {
      const closeProcess = processFlowCloseCode(appCode);
      nextProcess = await resolvePartnerNextProcess(
        tenantId,
        appCode,
        fromProcess,
        input.to_process ?? closeProcess,
      );
    } else {
      nextProcess = transaction.currentProcess;
    }
    newStatus = 'CLOSED';
  } else if (input.action === 'REJECT') {
    newStatus = 'REJECTED';
  }

  if (input.assign_to !== undefined && input.action !== 'ASSIGN') {
    assignTo = input.assign_to;
  }

  const closedAt =
    newStatus === 'CLOSED' || newStatus === 'REJECTED' ? new Date() : null;
  const slaStatus =
    newStatus === 'CLOSED'
      ? computeSlaStatus(transaction.createdAt, closedAt, transaction.priority, newStatus)
      : transaction.slaStatus;

  const operator = input.operator ?? 'ISP_PARTNER_API';
  const logDescription = input.comment ?? `${input.action} via ISP Partner API (${operator})`;

  await prisma.$transaction(async (tx) => {
    await tx.transactionHeader.update({
      where: { id: transaction.id },
      data: {
        currentProcess: nextProcess,
        status: newStatus,
        assignTo,
        closedAt,
        slaStatus: newStatus === 'CLOSED' ? slaStatus : transaction.slaStatus,
      },
    });

    await tx.transactionLog.create({
      data: {
        transactionId: transaction.id,
        process: nextProcess,
        action: input.action,
        description: logDescription,
      },
    });
  });

  const callbackEvent = newStatus === 'CLOSED' ? 'TICKET_CLOSED' : 'TICKET_STATUS_CHANGED';

  void dispatchIspPartnerCallback(tenantId, transaction.id, callbackEvent, {
    from_process: fromProcess,
    to_process: nextProcess,
    operator,
    comment: input.comment,
  });

  return getIspPartnerTicket(tenantId, trxNo);
}

function processFlowCloseCode(appCode: IspPartnerAppCode) {
  const flow = getIspPartnerProcessCodes(appCode);
  return flow[flow.length - 1] ?? 'CLOSE';
}

export async function addIspPartnerTicketLog(
  tenantId: string,
  trxNo: string,
  input: z.infer<typeof ispPartnerLogSchema>,
) {
  const transaction = await findPartnerTicket(tenantId, trxNo);
  const operator = input.operator ?? 'ISP_PARTNER_API';

  await prisma.transactionLog.create({
    data: {
      transactionId: transaction.id,
      process: transaction.currentProcess,
      action: input.action,
      description: `[${operator}] ${input.description}`,
    },
  });

  void dispatchIspPartnerCallback(tenantId, transaction.id, 'TICKET_LOG_ADDED', {
    operator,
    log_action: input.action,
    log_description: input.description,
  });

  return getIspPartnerTicket(tenantId, trxNo);
}

export async function getIspPartnerReport(
  tenantId: string,
  query: z.infer<typeof ispPartnerReportQuerySchema>,
) {
  const report = await getAppReport(tenantId, query.app_code, query.type, {
    period: query.period,
    year: query.year,
    month: query.month,
    days: query.days,
  });
  return {
    app_code: query.app_code,
    type: query.type,
    generated_at: new Date().toISOString(),
    ...report,
  };
}

export async function getIspPartnerReportBundle(
  tenantId: string,
  query: z.infer<typeof ispPartnerReportBundleQuerySchema>,
) {
  const bundle = await getAppReportBundle(tenantId, query.app_code, {
    period: query.period,
    year: query.year,
    month: query.month,
  });
  return {
    app_code: query.app_code,
    generated_at: new Date().toISOString(),
    period: query.period,
    year: query.year ?? bundle.complaint.year ?? null,
    month: query.month ?? bundle.complaint.month ?? null,
    reports: bundle,
  };
}

export function getIspPartnerProcessFlow(appCode?: IspPartnerAppCode) {
  if (appCode) {
    const flow = getIspPartnerProcessCodes(appCode);
    return {
      app_code: appCode,
      processes: flow.map((code, index) => ({
        sequence: index + 1,
        process_code: code,
        is_final: code === flow[flow.length - 1],
      })),
    };
  }

  return {
    supported_apps: [...ISP_PARTNER_APP_CODES],
    apps: ISP_PARTNER_APP_CODES.map((code) => {
      const flow = getIspPartnerProcessCodes(code);
      return {
        app_code: code,
        processes: flow.map((processCode, index) => ({
          sequence: index + 1,
          process_code: processCode,
          is_final: processCode === flow[flow.length - 1],
        })),
      };
    }),
  };
}
