/**
 * Admin 后台侧栏：两级菜单配置
 */

import {
  ArrowRightLeft,
  Bot,
  BookOpen,
  Building2,
  CreditCard,
  Coins,
  FileBarChart,
  FileEdit,
  Globe,
  LayoutTemplate,
  LucideIcon,
  Package,
  Receipt,
  Search,
  Shield,
  UserCircle,
  Users,
  Wrench,
} from 'lucide-react';
import { ModuleType } from '../types';

export interface AdminMenuItemDef {
  id: ModuleType;
  labelKey: string;
  icon: LucideIcon;
  roleRequired?: string[];
}

export interface AdminMenuGroupDef {
  id: string;
  labelKey: string;
  roleRequired?: string[];
  items: ModuleType[];
}

/** 侧栏隐藏但仍支持深链的模块 */
export const ADMIN_SIDEBAR_HIDDEN_MODULE_IDS = new Set<ModuleType>([
  ModuleType.KEY_SETTINGS,
  ModuleType.GENERAL_SETTINGS,
]);

export const ADMIN_MENU_ITEM_DEFS: AdminMenuItemDef[] = [
  { id: ModuleType.PERSONAL_CENTER, labelKey: 'personalCenter', icon: UserCircle },
  { id: ModuleType.MERCHANT_MANAGEMENT, labelKey: 'merchantManagement', icon: Building2, roleRequired: ['admin', 'agent'] },
  { id: ModuleType.WORKFLOW_TRANSFER, labelKey: 'workflowTransfer', icon: ArrowRightLeft, roleRequired: ['admin', 'agent'] },
  { id: ModuleType.SITE_CONFIGURATION, labelKey: 'siteConfiguration', icon: Globe, roleRequired: ['admin'] },
  { id: 'ACCOUNT_MANAGEMENT' as ModuleType, labelKey: 'accountManagement', icon: Users, roleRequired: ['admin', 'agent'] },
  { id: ModuleType.ROLE_MANAGEMENT, labelKey: 'roleManagement', icon: Shield, roleRequired: ['admin'] },
  { id: ModuleType.LLM_CHANNELS, labelKey: 'llmChannelsMenu', icon: Bot, roleRequired: ['admin'] },
  { id: ModuleType.SEARCH_CONFIG, labelKey: 'searchConfigMenu', icon: Search, roleRequired: ['admin'] },
  { id: ModuleType.ARTICLE_TEMPLATES, labelKey: 'articleTemplates', icon: LayoutTemplate, roleRequired: ['admin'] },
  { id: ModuleType.GEO_STAGE_FIELD_GUIDES, labelKey: 'geoStageFieldGuides', icon: BookOpen, roleRequired: ['admin'] },
  { id: ModuleType.GEO_REPORT_ADMIN, labelKey: 'geoReportAdmin', icon: FileBarChart, roleRequired: ['admin'] },
  { id: ModuleType.POINTS_PRICING, labelKey: 'pointsPricing', icon: Coins, roleRequired: ['admin'] },
  { id: ModuleType.CREDIT_PACKAGES, labelKey: 'creditPackages', icon: Package, roleRequired: ['admin'] },
  { id: ModuleType.PAYMENT_CHANNEL_SETTINGS, labelKey: 'paymentChannels', icon: CreditCard, roleRequired: ['admin'] },
  { id: ModuleType.PAYMENT_ORDERS, labelKey: 'paymentOrders', icon: Receipt, roleRequired: ['admin'] },
  { id: ModuleType.TOOLBOX, labelKey: 'toolbox', icon: Wrench, roleRequired: ['admin'] },
];

/** 顶栏独立一级项（不参与分组） */
export const ADMIN_TOP_LEVEL_MODULE_IDS: ModuleType[] = [ModuleType.PERSONAL_CENTER];

export const ADMIN_MENU_GROUPS: AdminMenuGroupDef[] = [
  {
    id: 'platform',
    labelKey: 'menuGroups.platform',
    roleRequired: ['admin'],
    items: [
      ModuleType.MERCHANT_MANAGEMENT,
      ModuleType.WORKFLOW_TRANSFER,
      ModuleType.SITE_CONFIGURATION,
      'ACCOUNT_MANAGEMENT' as ModuleType,
      ModuleType.ROLE_MANAGEMENT,
    ],
  },
  {
    id: 'agent_ops',
    labelKey: 'menuGroups.agentOps',
    roleRequired: ['agent'],
    items: [ModuleType.MERCHANT_MANAGEMENT, ModuleType.WORKFLOW_TRANSFER, 'ACCOUNT_MANAGEMENT' as ModuleType],
  },
  {
    id: 'ai',
    labelKey: 'menuGroups.ai',
    roleRequired: ['admin'],
    items: [ModuleType.LLM_CHANNELS, ModuleType.SEARCH_CONFIG],
  },
  {
    id: 'content',
    labelKey: 'menuGroups.content',
    items: [ModuleType.ARTICLE_TEMPLATES],
  },
  {
    id: 'basics',
    labelKey: 'menuGroups.basics',
    items: [
      ModuleType.GEO_STAGE_FIELD_GUIDES,
      ModuleType.GEO_REPORT_ADMIN,
      ModuleType.POINTS_PRICING,
      ModuleType.CREDIT_PACKAGES,
      ModuleType.PAYMENT_CHANNEL_SETTINGS,
      ModuleType.PAYMENT_ORDERS,
      ModuleType.TOOLBOX,
    ],
  },
];

const ITEM_DEF_MAP = new Map(ADMIN_MENU_ITEM_DEFS.map((item) => [item.id, item]));

export function isAdminMenuItemVisible(
  item: AdminMenuItemDef,
  userRole: string | null | undefined,
): boolean {
  if (ADMIN_SIDEBAR_HIDDEN_MODULE_IDS.has(item.id)) return false;
  if (!item.roleRequired) return true;
  if (!userRole) return true;
  return item.roleRequired.includes(userRole);
}

export function resolveAdminMenuItem(moduleId: ModuleType): AdminMenuItemDef | undefined {
  return ITEM_DEF_MAP.get(moduleId);
}

export function findAdminMenuGroupIdForModule(moduleId: ModuleType): string | null {
  for (const group of ADMIN_MENU_GROUPS) {
    if (group.items.includes(moduleId)) return group.id;
  }
  return null;
}

export interface ResolvedAdminMenuItem {
  id: ModuleType;
  labelKey: string;
  icon: LucideIcon;
  label: string;
}

export interface ResolvedAdminMenuGroup {
  id: string;
  labelKey: string;
  label: string;
  items: ResolvedAdminMenuItem[];
}

export function buildAdminSidebarMenu(
  userRole: string | null | undefined,
  translate: (key: string) => string,
): {
  topLevelItems: ResolvedAdminMenuItem[];
  groups: ResolvedAdminMenuGroup[];
  allItems: ResolvedAdminMenuItem[];
} {
  const resolveItem = (moduleId: ModuleType): ResolvedAdminMenuItem | null => {
    const def = resolveAdminMenuItem(moduleId);
    if (!def || !isAdminMenuItemVisible(def, userRole)) return null;
    return {
      id: def.id,
      labelKey: def.labelKey,
      icon: def.icon,
      label: translate(def.labelKey),
    };
  };

  const topLevelItems = ADMIN_TOP_LEVEL_MODULE_IDS.map(resolveItem).filter(Boolean) as ResolvedAdminMenuItem[];

  const groups: ResolvedAdminMenuGroup[] = [];
  for (const group of ADMIN_MENU_GROUPS) {
    if (group.roleRequired && userRole && !group.roleRequired.includes(userRole)) {
      continue;
    }
    const items = group.items.map(resolveItem).filter(Boolean) as ResolvedAdminMenuItem[];
    if (items.length === 0) continue;
    groups.push({
      id: group.id,
      labelKey: group.labelKey,
      label: translate(group.labelKey),
      items,
    });
  }

  const allItems = [...topLevelItems, ...groups.flatMap((g) => g.items)];
  return { topLevelItems, groups, allItems };
}
