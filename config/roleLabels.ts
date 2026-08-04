/** 角色组 name → 展示名（含系统角色） */
export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  admin: '管理员',
  agent: '代理商',
  site_admin: '站点管理员',
  customer: '客户',
};

export const SYSTEM_ROLE_NAMES = new Set(['admin', 'agent', 'site_admin']);

export function getRoleDisplayName(name: string): string {
  return ROLE_DISPLAY_NAMES[name] ?? name;
}

export function isSystemRoleName(name: string): boolean {
  return SYSTEM_ROLE_NAMES.has(name);
}
