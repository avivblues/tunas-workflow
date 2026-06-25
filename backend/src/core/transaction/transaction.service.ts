import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';
import type { AuthUser } from '../../types/auth.js';
import {
  getAvailableTransitions,
  getInitialProcess,
  isFinalProcess,
  resolveNextProcess,
} from '../routing/routing.service.js';
import { computeSlaStatus } from '../sla/sla.service.js';
import {
  notifyAssignment,
  notifyTransactionClosed,
} from '../notification/notification.service.js';
import {
  dispatchIntegrationEvent,
  dispatchTransactionClosed,
} from '../../integration/integration-dispatch.service.js';
import { getAnyDeskRemoteSupport } from '../../integration/anydesk/anydesk.connector.js';
import { triggerVehicleBookingCalendarSync } from '../../integration/google/google-calendar.connector.js';
import { dispatchIspPartnerCallback } from '../../integration/isp/isp-callback.service.js';
import { isIspPartnerAppCode } from '../../integration/isp/isp-partner.types.js';
import type {
  createLogSchema,
  createTransactionSchema,
  listTransactionSchema,
  transactionActionSchema,
  updateChecklistSchema,
} from './transaction.schema.js';
import type { z } from 'zod';

async function generateTrxNo(tenantId: string): Promise<string> {
  const count = await prisma.transactionHeader.count({ where: { tenantId } });
  return `TW${String(count + 1).padStart(5, '0')}`;
}

export async function createTransaction(
  user: AuthUser,
  input: z.infer<typeof createTransactionSchema>,
) {
  const appCode = input.app_code;
  const initialProcess = await getInitialProcess(user.tenantId, appCode);
  const trxNo = await generateTrxNo(user.tenantId);

  const app = await prisma.appMaster.findUnique({
    where: { tenantId_appCode: { tenantId: user.tenantId, appCode } },
  });
  if (!app?.active) {
    throw new AppError(404, 'APP_NOT_FOUND', 'Application not found or inactive');
  }

  if (input.domain_code) {
    const domain = await prisma.domainNode.findFirst({
      where: { tenantId: user.tenantId, domainCode: input.domain_code },
    });
    if (!domain) {
      throw new AppError(404, 'DOMAIN_NOT_FOUND', 'Domain location not found');
    }
  }

  if (input.asset_links?.length) {
    const assetIds = input.asset_links.map((l) => l.asset_id);
    const assets = await prisma.asset.findMany({
      where: { tenantId: user.tenantId, id: { in: assetIds } },
    });
    if (assets.length !== assetIds.length) {
      throw new AppError(404, 'ASSET_NOT_FOUND', 'One or more assets not found');
    }
  }

  const transaction = await prisma.$transaction(async (tx) => {
    const header = await tx.transactionHeader.create({
      data: {
        tenantId: user.tenantId,
        trxNo,
        appCode,
        domainCode: input.domain_code,
        currentProcess: initialProcess,
        priority: input.priority ?? 'MEDIUM',
        status: 'OPEN',
        requestBy: user.id,
        assignTo: input.assign_to,
        slaStatus: 'ON_TRACK',
      },
    });

    const detailEntries = Object.entries(input.data);
    if (detailEntries.length > 0) {
      await tx.transactionDetail.createMany({
        data: detailEntries.map(([fieldCode, value]) => ({
          transactionId: header.id,
          fieldCode,
          value: value as object,
        })),
      });
    }

    if (input.asset_links?.length) {
      await tx.transactionAsset.createMany({
        data: input.asset_links.map((link) => ({
          transactionId: header.id,
          assetId: link.asset_id,
          usageType: link.usage_type,
          qty: link.qty,
        })),
      });
    }

    await tx.transactionLog.create({
      data: {
        transactionId: header.id,
        process: initialProcess,
        userId: user.id,
        action: 'CREATE',
        description: `Transaction created by ${user.fullName}`,
        attachments: input.attachments?.length ? (input.attachments as object[]) : undefined,
      },
    });

    return header;
  });

  dispatchIntegrationEvent(user.tenantId, 'TRANSACTION_CREATED', {
    trxNo: transaction.trxNo,
    appCode,
    priority: input.priority ?? 'MEDIUM',
    title: typeof input.data.title === 'string' ? input.data.title : undefined,
    source: 'WEB',
  });

  return getTransactionDetail(user.tenantId, transaction.id);
}

export async function listTransactions(
  tenantId: string,
  query: z.infer<typeof listTransactionSchema>,
) {
  const where = {
    tenantId,
    ...(query.app_code ? { appCode: query.app_code } : {}),
    ...(query.domain_code ? { domainCode: { startsWith: query.domain_code } } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.process ? { currentProcess: query.process } : {}),
    ...(query.assign_to ? { assignTo: query.assign_to } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.transactionHeader.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      ...(query.with_details ? { include: { details: true } } : {}),
    }),
    prisma.transactionHeader.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getTransactionDetail(tenantId: string, id: string) {
  const transaction = await prisma.transactionHeader.findFirst({
    where: { id, tenantId },
    include: {
      details: true,
      logs: { orderBy: { createdAt: 'asc' } },
      assets: { include: { asset: true } },
    },
  });

  if (!transaction) {
    throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
  }

  const transitions = await getAvailableTransitions({
    tenantId,
    appCode: transaction.appCode,
    fromProcess: transaction.currentProcess,
    roleCode: null,
  });

  const remoteSupport = await getAnyDeskRemoteSupport(tenantId);

  return { ...transaction, availableTransitions: transitions.map((t) => t.toProcess), remoteSupport };
}

export async function performAction(
  user: AuthUser,
  id: string,
  input: z.infer<typeof transactionActionSchema>,
) {
  const transaction = await prisma.transactionHeader.findFirst({
    where: { id, tenantId: user.tenantId },
  });

  if (!transaction) {
    throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
  }

  if (transaction.status === 'CLOSED') {
    throw new AppError(400, 'TRANSACTION_CLOSED', 'Transaction is already closed');
  }

  let nextProcess = transaction.currentProcess;
  let newStatus = transaction.status;
  let assignTo = transaction.assignTo;

  if (input.action === 'ASSIGN') {
    if (!input.assign_to) {
      throw new AppError(400, 'ASSIGN_REQUIRED', 'assign_to is required for ASSIGN action');
    }
    assignTo = input.assign_to;
  } else if (input.action === 'ADVANCE') {
    const resolved = await resolveNextProcess(
      {
        tenantId: user.tenantId,
        appCode: transaction.appCode,
        fromProcess: transaction.currentProcess,
        roleCode: user.roleCode,
      },
      input.to_process,
    );
    nextProcess = resolved.toProcess;
    const final = await isFinalProcess(user.tenantId, transaction.appCode, nextProcess);
    if (final) {
      newStatus = 'CLOSED';
    }
  } else if (input.action === 'CLOSE') {
    const final = await isFinalProcess(
      user.tenantId,
      transaction.appCode,
      transaction.currentProcess,
    );
    if (!final) {
      const resolved = await resolveNextProcess(
        {
          tenantId: user.tenantId,
          appCode: transaction.appCode,
          fromProcess: transaction.currentProcess,
          roleCode: user.roleCode,
        },
        input.to_process,
      );
      nextProcess = resolved.toProcess;
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

  const previousAssignee = transaction.assignTo;

  await prisma.$transaction(async (tx) => {
    await tx.transactionHeader.update({
      where: { id },
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
        transactionId: id,
        process: nextProcess,
        userId: user.id,
        action: input.action,
        description: input.comment ?? `${input.action} by ${user.fullName}`,
      },
    });
  });

  if (newStatus === 'CLOSED') {
    await notifyTransactionClosed(user.tenantId, {
      id: transaction.id,
      trxNo: transaction.trxNo,
      appCode: transaction.appCode,
      requestBy: transaction.requestBy,
      slaStatus: slaStatus ?? null,
    });

    dispatchTransactionClosed(user.tenantId, {
      trxNo: transaction.trxNo,
      appCode: transaction.appCode,
      priority: transaction.priority,
      slaStatus: slaStatus ?? null,
      status: newStatus,
      source: 'WEB',
    });
  }

  if (input.action === 'ASSIGN' && assignTo && assignTo !== previousAssignee) {
    await notifyAssignment(user.tenantId, assignTo, {
      id: transaction.id,
      trxNo: transaction.trxNo,
      appCode: transaction.appCode,
    });

    const assignee = await prisma.user.findFirst({
      where: { id: assignTo, tenantId: user.tenantId },
    });

    dispatchIntegrationEvent(user.tenantId, 'TRANSACTION_ASSIGNED', {
      trxNo: transaction.trxNo,
      appCode: transaction.appCode,
      priority: transaction.priority,
      assigneeName: assignee?.fullName,
      source: 'WEB',
    });
  }

  if (
    transaction.appCode === 'VEHICLE_BOOKING' &&
    nextProcess === 'ASSIGN' &&
    newStatus === 'OPEN'
  ) {
    triggerVehicleBookingCalendarSync(user.tenantId, transaction.id);
  }

  if (isIspPartnerAppCode(transaction.appCode)) {
    const callbackEvent =
      newStatus === 'CLOSED'
        ? 'TICKET_CLOSED'
        : transaction.currentProcess !== nextProcess
          ? 'TICKET_STATUS_CHANGED'
          : null;
    if (callbackEvent) {
      void dispatchIspPartnerCallback(user.tenantId, transaction.id, callbackEvent, {
        from_process: transaction.currentProcess,
        to_process: nextProcess,
        operator: user.username,
        comment: input.comment,
      });
    }
  }

  return getTransactionDetail(user.tenantId, id);
}

export async function addTransactionLog(
  user: AuthUser,
  id: string,
  input: z.infer<typeof createLogSchema>,
) {
  const transaction = await prisma.transactionHeader.findFirst({
    where: { id, tenantId: user.tenantId },
  });

  if (!transaction) {
    throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
  }

  const sparepartRows = input.spareparts?.length
    ? await prisma.asset.findMany({
        where: { tenantId: user.tenantId, id: { in: input.spareparts.map((s) => s.asset_id) } },
      })
    : [];

  const toolRows = input.tools?.length
    ? await prisma.asset.findMany({
        where: { tenantId: user.tenantId, id: { in: input.tools.map((t) => t.asset_id) } },
      })
    : [];

  const workerRows = input.workers?.length
    ? await prisma.user.findMany({
        where: { tenantId: user.tenantId, id: { in: input.workers.map((w) => w.user_id) } },
      })
    : [];

  const metadata = {
    spareparts: input.spareparts?.map((sp) => {
      const asset = sparepartRows.find((a) => a.id === sp.asset_id);
      return {
        asset_id: sp.asset_id,
        asset_code: asset?.assetCode,
        name: asset?.name,
        qty: sp.qty ?? 1,
      };
    }),
    tools: input.tools?.map((t) => {
      const asset = toolRows.find((a) => a.id === t.asset_id);
      return { asset_id: t.asset_id, asset_code: asset?.assetCode, name: asset?.name };
    }),
    workers: input.workers?.map((w) => {
      const u = workerRows.find((row) => row.id === w.user_id);
      return { user_id: w.user_id, full_name: u?.fullName };
    }),
  };

  const hasMetadata =
    (metadata.spareparts?.length ?? 0) > 0 ||
    (metadata.tools?.length ?? 0) > 0 ||
    (metadata.workers?.length ?? 0) > 0;

  await prisma.$transaction(async (tx) => {
    await tx.transactionLog.create({
      data: {
        transactionId: id,
        process: transaction.currentProcess,
        userId: user.id,
        action: input.action,
        description: input.description,
        attachments: input.attachments as object[] | undefined,
        metadata: hasMetadata ? (metadata as object) : undefined,
      },
    });

    for (const sp of input.spareparts ?? []) {
      await tx.transactionAsset.create({
        data: {
          transactionId: id,
          assetId: sp.asset_id,
          usageType: 'SPAREPART',
          qty: sp.qty ?? 1,
        },
      });
    }

    for (const tool of input.tools ?? []) {
      await tx.transactionAsset.create({
        data: {
          transactionId: id,
          assetId: tool.asset_id,
          usageType: 'TOOL',
          qty: 1,
        },
      });
    }
  });

  if (isIspPartnerAppCode(transaction.appCode)) {
    void dispatchIspPartnerCallback(user.tenantId, transaction.id, 'TICKET_LOG_ADDED', {
      operator: user.username,
      log_action: input.action,
      log_description: input.description,
    });
  }

  return getTransactionDetail(user.tenantId, id);
}

export async function updatePmChecklist(
  user: AuthUser,
  id: string,
  input: z.infer<typeof updateChecklistSchema>,
) {
  const transaction = await prisma.transactionHeader.findFirst({
    where: { id, tenantId: user.tenantId, appCode: 'ENG_PM' },
    include: { details: true },
  });

  if (!transaction) {
    throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'PM task not found');
  }

  const checklistDetail = transaction.details.find((d) => d.fieldCode === 'checklist');
  if (checklistDetail) {
    await prisma.transactionDetail.update({
      where: { id: checklistDetail.id },
      data: { value: input.checklist as object[] },
    });
  } else {
    await prisma.transactionDetail.create({
      data: {
        transactionId: id,
        fieldCode: 'checklist',
        value: input.checklist as object[],
      },
    });
  }

  const allDone = input.checklist.every((item) => item.done);
  await prisma.transactionLog.create({
    data: {
      transactionId: id,
      process: transaction.currentProcess,
      userId: user.id,
      action: 'CHECKLIST',
      description: allDone
        ? 'All checklist items completed'
        : `Checklist updated (${input.checklist.filter((i) => i.done).length}/${input.checklist.length})`,
    },
  });

  return getTransactionDetail(user.tenantId, id);
}

export async function listPendingApprovals(user: AuthUser) {
  const routings = await prisma.appRouting.findMany({
    where: {
      roleCode: user.roleCode ?? undefined,
      app: { tenantId: user.tenantId, active: true },
    },
    include: { app: true },
  });

  if (routings.length === 0) {
    return [];
  }

  const conditions = routings.map((r) => ({
    tenantId: user.tenantId,
    appCode: r.app.appCode,
    currentProcess: r.fromProcess,
    status: 'OPEN',
  }));

  return prisma.transactionHeader.findMany({
    where: { OR: conditions },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}
