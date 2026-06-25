import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';
import { getDefaultAppMenus } from './menu-defaults.loader.js';

export const createMenuSchema = z.object({
  appCode: z.string().min(1).toUpperCase(),
  menuCode: z.string().min(1).toUpperCase(),
  label: z.string().min(1),
  path: z.string().min(1),
  icon: z.string().optional().nullable(),
  sequence: z.number().int().min(0).optional(),
  visible: z.boolean().optional(),
  showWeb: z.boolean().optional(),
  showMobile: z.boolean().optional(),
  roleCode: z.string().optional().nullable(),
});

export const updateMenuSchema = createMenuSchema
  .partial()
  .omit({ appCode: true, menuCode: true });

export const reorderMenuSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sequence: z.number().int().min(0),
    }),
  ),
});

export const resetMenuSchema = z.object({
  appCode: z.string().optional(),
});

function filterByRole<T extends { roleCode: string | null }>(
  items: T[],
  userRoleCode: string | null,
): T[] {
  return items.filter((item) => !item.roleCode || item.roleCode === userRoleCode);
}

export async function listMenu(
  tenantId: string,
  options: {
    platform?: 'WEB' | 'MOBILE';
    appCode?: string;
    userRoleCode?: string | null;
    includeHidden?: boolean;
  } = {},
) {
  const { platform, appCode, userRoleCode = null, includeHidden = false } = options;

  const rows = await prisma.appMenu.findMany({
    where: {
      tenantId,
      ...(appCode ? { appCode: appCode.toUpperCase() } : {}),
      ...(includeHidden ? {} : { visible: true }),
      ...(platform === 'WEB' ? { showWeb: true } : {}),
      ...(platform === 'MOBILE' ? { showMobile: true } : {}),
    },
    orderBy: [{ sequence: 'asc' }, { label: 'asc' }],
  });

  const filtered = filterByRole(rows, userRoleCode);

  if (!appCode) {
    const activeApps = await prisma.appMaster.findMany({
      where: { tenantId, active: true },
      select: { appCode: true },
    });
    const activeCodes = new Set(activeApps.map((a) => a.appCode));
    return filtered.filter((item) => item.appCode === 'SYSTEM' || activeCodes.has(item.appCode));
  }

  return filtered;
}

export async function listMenuAdmin(tenantId: string, appCode?: string) {
  return prisma.appMenu.findMany({
    where: {
      tenantId,
      ...(appCode ? { appCode: appCode.toUpperCase() } : {}),
    },
    orderBy: [{ appCode: 'asc' }, { sequence: 'asc' }],
  });
}

export async function createMenuItem(
  tenantId: string,
  input: z.infer<typeof createMenuSchema>,
) {
  const existing = await prisma.appMenu.findUnique({
    where: {
      tenantId_appCode_menuCode: {
        tenantId,
        appCode: input.appCode,
        menuCode: input.menuCode,
      },
    },
  });
  if (existing) {
    throw new AppError(409, 'MENU_EXISTS', 'Menu code already exists for this application');
  }

  return prisma.appMenu.create({
    data: {
      tenantId,
      appCode: input.appCode,
      menuCode: input.menuCode,
      label: input.label,
      path: input.path,
      icon: input.icon ?? null,
      sequence: input.sequence ?? 0,
      visible: input.visible ?? true,
      showWeb: input.showWeb ?? true,
      showMobile: input.showMobile ?? false,
      roleCode: input.roleCode ?? null,
    },
  });
}

export async function updateMenuItem(
  tenantId: string,
  id: string,
  input: z.infer<typeof updateMenuSchema>,
) {
  const menu = await prisma.appMenu.findFirst({ where: { id, tenantId } });
  if (!menu) {
    throw new AppError(404, 'MENU_NOT_FOUND', 'Menu item not found');
  }

  return prisma.appMenu.update({
    where: { id },
    data: input,
  });
}

export async function deleteMenuItem(tenantId: string, id: string) {
  const menu = await prisma.appMenu.findFirst({ where: { id, tenantId } });
  if (!menu) {
    throw new AppError(404, 'MENU_NOT_FOUND', 'Menu item not found');
  }

  await prisma.appMenu.delete({ where: { id } });
}

export async function reorderMenuItems(
  tenantId: string,
  items: { id: string; sequence: number }[],
) {
  await prisma.$transaction(
    items.map((item) =>
      prisma.appMenu.updateMany({
        where: { id: item.id, tenantId },
        data: { sequence: item.sequence },
      }),
    ),
  );

  return listMenuAdmin(tenantId);
}

export async function seedDefaultMenus(tenantId: string, appCode?: string) {
  const templates = appCode
    ? getDefaultAppMenus().filter((m) => m.appCode === appCode.toUpperCase())
    : getDefaultAppMenus();

  for (const template of templates) {
    await prisma.appMenu.upsert({
      where: {
        tenantId_appCode_menuCode: {
          tenantId,
          appCode: template.appCode,
          menuCode: template.menuCode,
        },
      },
      update: {
        label: template.label,
        path: template.path,
        icon: template.icon ?? null,
        sequence: template.sequence,
        showWeb: template.showWeb ?? true,
        showMobile: template.showMobile ?? false,
        roleCode: template.roleCode ?? null,
        visible: true,
      },
      create: {
        tenantId,
        appCode: template.appCode,
        menuCode: template.menuCode,
        label: template.label,
        path: template.path,
        icon: template.icon ?? null,
        sequence: template.sequence,
        showWeb: template.showWeb ?? true,
        showMobile: template.showMobile ?? false,
        roleCode: template.roleCode ?? null,
        visible: true,
      },
    });
  }

  return listMenuAdmin(tenantId, appCode);
}
