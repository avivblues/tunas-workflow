import { readFileSync } from 'fs';
import { join } from 'path';

export interface MenuDefault {
  appCode: string;
  menuCode: string;
  label: string;
  path: string;
  icon?: string;
  sequence: number;
  showWeb?: boolean;
  showMobile?: boolean;
  roleCode?: string;
}

interface MenuDefaultsFile {
  menus: MenuDefault[];
  groups: { appCode: string; label: string }[];
}

let cached: MenuDefaultsFile | null = null;

export function getMenuDefaults(): MenuDefaultsFile {
  if (!cached) {
    const filePath = join(process.cwd(), 'prisma/menu-defaults.json');
    cached = JSON.parse(readFileSync(filePath, 'utf8')) as MenuDefaultsFile;
  }
  return cached;
}

export function getDefaultAppMenus(): MenuDefault[] {
  return getMenuDefaults().menus;
}

export function getMenuAppGroups(): { appCode: string; label: string }[] {
  return getMenuDefaults().groups;
}
