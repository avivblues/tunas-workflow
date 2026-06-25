import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../../lib/response.js';
import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../core/notification/notification.service.js';

export async function registerNotificationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/notification', async (request, reply) => {
    const items = await listNotifications(request.tenantId!, request.authUser!.id);
    const unread = await countUnreadNotifications(request.tenantId!, request.authUser!.id);
    return sendSuccess(reply, { items, unread });
  });

  app.patch('/notification/:id/read', async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await markNotificationRead(request.tenantId!, request.authUser!.id, id);
    return sendSuccess(reply, item, 'Marked as read');
  });

  app.post('/notification/read-all', async (request, reply) => {
    await markAllNotificationsRead(request.tenantId!, request.authUser!.id);
    return sendSuccess(reply, { ok: true }, 'All marked as read');
  });
}
