import { prisma } from '../../lib/prisma.js';

interface CreateNotificationInput {
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  refType?: string;
  refId?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({ data: input });
}

export async function listNotifications(tenantId: string, userId: string, limit = 30) {
  return prisma.notification.findMany({
    where: { tenantId, userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function countUnreadNotifications(tenantId: string, userId: string) {
  return prisma.notification.count({
    where: { tenantId, userId, read: false },
  });
}

export async function markNotificationRead(tenantId: string, userId: string, id: string) {
  const notification = await prisma.notification.findFirst({
    where: { id, tenantId, userId },
  });
  if (!notification) return null;

  return prisma.notification.update({
    where: { id },
    data: { read: true },
  });
}

export async function markAllNotificationsRead(tenantId: string, userId: string) {
  await prisma.notification.updateMany({
    where: { tenantId, userId, read: false },
    data: { read: true },
  });
}

export async function notifyTransactionClosed(
  tenantId: string,
  transaction: {
    id: string;
    trxNo: string;
    appCode: string;
    requestBy: string | null;
    slaStatus: string | null;
  },
) {
  if (!transaction.requestBy) return;

  const slaLabel =
    transaction.slaStatus === 'BREACHED' ? ' (SLA breached)' : ' (SLA met)';

  await createNotification({
    tenantId,
    userId: transaction.requestBy,
    title: `${transaction.trxNo} completed`,
    message: `Your ${transaction.appCode} request has been closed${slaLabel}.`,
    type: 'TRANSACTION_CLOSED',
    refType: 'TRANSACTION',
    refId: transaction.id,
  });
}

export async function notifyAssignment(
  tenantId: string,
  assigneeId: string,
  transaction: { id: string; trxNo: string; appCode: string },
) {
  await createNotification({
    tenantId,
    userId: assigneeId,
    title: `Assigned: ${transaction.trxNo}`,
    message: `You have been assigned a ${transaction.appCode} task.`,
    type: 'ASSIGNMENT',
    refType: 'TRANSACTION',
    refId: transaction.id,
  });
}
