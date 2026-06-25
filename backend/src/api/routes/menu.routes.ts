import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../../lib/response.js';
import {
  createMenuItem,
  createMenuSchema,
  deleteMenuItem,
  listMenu,
  listMenuAdmin,
  reorderMenuItems,
  reorderMenuSchema,
  resetMenuSchema,
  seedDefaultMenus,
  updateMenuItem,
  updateMenuSchema,
} from '../../master/tenant/menu.service.js';
import { getMenuAppGroups } from '../../master/tenant/menu-defaults.loader.js';

export async function registerMenuRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/menu', async (request, reply) => {
    const { platform, app_code } = request.query as {
      platform?: 'WEB' | 'MOBILE';
      app_code?: string;
    };

    const items = await listMenu(request.tenantId!, {
      platform,
      appCode: app_code,
      userRoleCode: request.authUser?.roleCode ?? null,
    });

    return sendSuccess(reply, items);
  });

  app.get('/menu/groups', async (_request, reply) => {
    return sendSuccess(reply, getMenuAppGroups());
  });

  app.get('/menu/admin', async (request, reply) => {
    const { app_code } = request.query as { app_code?: string };
    const items = await listMenuAdmin(request.tenantId!, app_code);
    return sendSuccess(reply, items);
  });

  app.post('/menu', async (request, reply) => {
    const input = createMenuSchema.parse(request.body);
    const created = await createMenuItem(request.tenantId!, input);
    return sendSuccess(reply, created, 'Menu item created', 201);
  });

  app.patch('/menu/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateMenuSchema.parse(request.body);
    const updated = await updateMenuItem(request.tenantId!, id, input);
    return sendSuccess(reply, updated, 'Menu item updated');
  });

  app.delete('/menu/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteMenuItem(request.tenantId!, id);
    return sendSuccess(reply, null, 'Menu item deleted');
  });

  app.post('/menu/reorder', async (request, reply) => {
    const input = reorderMenuSchema.parse(request.body);
    const items = await reorderMenuItems(request.tenantId!, input.items);
    return sendSuccess(reply, items, 'Menu order updated');
  });

  app.post('/menu/reset-defaults', async (request, reply) => {
    const input = resetMenuSchema.parse(request.body ?? {});
    const items = await seedDefaultMenus(request.tenantId!, input.appCode);
    return sendSuccess(reply, items, 'Default menus restored');
  });
}
