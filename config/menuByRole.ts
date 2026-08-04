/**
 * 角色菜单权限配置
 */

import {
  LayoutGrid,
  FileText,
  FileEdit,
  Database,
  BrainCircuit,
  Bug,
  GlobeLock,
  Search,
  PenTool,
  ListChecks,
  Briefcase,
  Building2,
  Wrench,
  FileSearch,
  Key,
  Monitor,
  FileBarChart,
  Share2,
  Globe,
  Send,
  Newspaper,
  HelpCircle,
  Layers,
  FolderOpen,
  Bell,
  CalendarClock,
  ClipboardList,
  MessageSquare,
  Home,
  Sparkles,
  Bot,
  Zap,
  Workflow,
  Hammer,
  Network,
  History,
  LucideIcon,
} from 'lucide-react';
import { ModuleType, UserRole } from '../types';
import { isBillingCustomerEquivalent } from '../utils/billingRole';
import { SOURCE_HUB_NAV_MODULE_IDS } from './sourceHub';
import {
  MENU_GROUP_LABEL_KEYS,
  MENU_ITEM_DESCRIPTION_KEYS,
  MENU_ITEM_LABEL_KEYS,
} from './menuI18nKeys';
import i18n from '../i18n/config';

export interface MenuItem {
  id: ModuleType;
  labelKey: string;
  icon: LucideIcon;
  /** 九宫格 hub 卡片描述（grid 模式下使用） */
  descriptionKey?: string;
}

/** 所有侧栏菜单项（顺序影响默认落地页：首项为最新优化） */
export const SIDEBAR_MENU_ITEMS: MenuItem[] = [
  { id: ModuleType.LATEST_OPTIMIZATION, labelKey: 'items.latestOptimization', icon: History, descriptionKey: 'descriptions.latestOptimization' },
  { id: ModuleType.START_OPTIMIZATION, labelKey: 'items.startOptimization', icon: Workflow, descriptionKey: 'descriptions.startOptimization' },
  { id: ModuleType.TOOLS_HUB, labelKey: 'items.toolsHub', icon: Hammer, descriptionKey: 'descriptions.toolsHub' },
  { id: ModuleType.MERCHANT_HUB, labelKey: 'items.merchantHub', icon: Building2, descriptionKey: 'descriptions.merchantHub' },
  { id: ModuleType.SITE_HUB, labelKey: 'items.siteHub', icon: Network, descriptionKey: 'descriptions.siteHub' },
  { id: ModuleType.WEB_MAIN_HUB, labelKey: 'items.webMainHub', icon: Network, descriptionKey: 'descriptions.webMainHub' },
  { id: ModuleType.SOURCE_HUB, labelKey: 'items.sourceHub', icon: Share2, descriptionKey: 'descriptions.sourceHub' },
  { id: ModuleType.DATA_SCREEN, labelKey: 'items.dataScreen', icon: Monitor },
  { id: ModuleType.DIAGNOSIS_REPORT, labelKey: 'items.diagnosisReport', icon: FileBarChart },
  { id: ModuleType.KNOWLEDGE_BASE, labelKey: 'items.knowledgeBase', icon: Database },
  { id: ModuleType.SEMANTIC_SEO, labelKey: 'items.semanticSeo', icon: GlobeLock },
  { id: ModuleType.EXTRACT, labelKey: 'items.extract', icon: Search },
  { id: ModuleType.GENERATE, labelKey: 'items.generate', icon: PenTool },
  { id: ModuleType.OPTIMIZATION_BOT, labelKey: 'items.optimizationBot', icon: Bot },
  { id: ModuleType.OPTIMIZATION_AGENT, labelKey: 'items.optimizationAgent', icon: Zap },
  { id: ModuleType.REPORTS, labelKey: 'items.reports', icon: FileText },
  { id: ModuleType.SOCIAL_MEDIA_ACCOUNTS, labelKey: 'items.socialMediaAccounts', icon: Share2, descriptionKey: 'descriptions.socialMediaAccounts' },
  { id: ModuleType.PUBLISH_RECORDS, labelKey: 'items.publishRecords', icon: Send, descriptionKey: 'descriptions.publishRecords' },
  { id: ModuleType.THIRD_PARTY_PUBLISH, labelKey: 'items.thirdPartyPublish', icon: Newspaper, descriptionKey: 'descriptions.thirdPartyPublish' },
  { id: ModuleType.OVERSEAS_THIRD_PARTY_PUBLISH, labelKey: 'items.overseasThirdPartyPublish', icon: Globe, descriptionKey: 'descriptions.overseasThirdPartyPublish' },
  { id: ModuleType.AIEO_WEBSITE, labelKey: 'items.aieoWebsite', icon: Globe },
  { id: ModuleType.SITE_LIST, labelKey: 'items.siteList', icon: Globe },
  { id: ModuleType.CONTENT_TASKS, labelKey: 'items.contentTasks', icon: Sparkles },
  { id: ModuleType.WEB_MAIN_CATEGORY, labelKey: 'items.webMainCategory', icon: Layers },
  { id: ModuleType.WEB_MAIN_COLUMN, labelKey: 'items.webMainColumn', icon: FolderOpen },
  { id: ModuleType.WEB_MAIN_ARTICLES, labelKey: 'items.webMainArticles', icon: FileEdit },
  { id: ModuleType.WEB_MAIN_CONTENT_TASKS, labelKey: 'items.webMainContentTasks', icon: Sparkles },
  { id: ModuleType.WEB_MAIN_FAQ, labelKey: 'items.webMainFaq', icon: HelpCircle },
  { id: ModuleType.MERCHANT_PROFILE, labelKey: 'items.merchantProfile', icon: Building2 },
  { id: ModuleType.BLOG_MANAGEMENT, labelKey: 'items.blogManagement', icon: FileEdit },
  { id: ModuleType.COLUMN_MANAGEMENT, labelKey: 'items.columnManagement', icon: FolderOpen },
  { id: ModuleType.CATEGORY_MANAGEMENT, labelKey: 'items.categoryManagement', icon: Layers },
  { id: ModuleType.FAQ_CONFIG, labelKey: 'items.faqConfig', icon: HelpCircle },
  { id: ModuleType.BUSINESS_INTRO, labelKey: 'items.businessIntro', icon: Layers },
  { id: ModuleType.CONTACT_SUBMISSIONS, labelKey: 'items.contactSubmissions', icon: MessageSquare },
  { id: ModuleType.BRAND_MANAGEMENT, labelKey: 'items.brandManagement', icon: Briefcase },
  { id: ModuleType.TOOLBOX, labelKey: 'items.toolbox', icon: Wrench },
  { id: ModuleType.LOGS, labelKey: 'items.logs', icon: FileSearch },
  { id: ModuleType.KEY_SETTINGS, labelKey: 'items.keySettings', icon: Key },
  /** 侧栏已隐藏，仅保留条目供 getMenuLabel / 遗留路由解析「快速开始」 */
  { id: ModuleType.BRAND_PARSE_WIZARD, labelKey: 'items.brandParseWizard', icon: Sparkles },
];

/** 报警子项（侧栏已从「分析洞察」移除；权限列表仍可按序展示） */
export const BENCHMARK_ALERT_SUBMENU_IDS: ModuleType[] = [
  ModuleType.BENCHMARK_ALERT_RUN,
  ModuleType.BENCHMARK_ALERT_SCHEDULE,
  ModuleType.BENCHMARK_ALERT_RESULTS,
];

/** 二级菜单分组：labelKey 为 null 表示单一项不展示分组标题 */
export interface MenuGroup {
  id: string;
  labelKey: string | null;
  items: ModuleType[];
  /**
   * 渲染模式：
   * - list（默认）：可展开的二级列表
   * - grid：侧栏只展示一个父按钮（点击进入九宫格 Hub），子项不在侧栏渲染
   */
  mode?: 'list' | 'grid';
  /** grid 模式下，父按钮点击后跳转到的 hub ModuleType */
  hubModuleId?: ModuleType;
  /** grid 模式下，父按钮使用的图标和名称（覆盖 group.labelKey） */
  hubLabelKey?: string;
}

/** 侧栏底部固定功能入口：优化管理、信源库、站点管理（账户设置单独渲染） */
export const SIDEBAR_FOOTER_NAV_ITEMS: ModuleType[] = [
  ModuleType.START_OPTIMIZATION,
  ModuleType.SOURCE_HUB,
  ModuleType.SITE_HUB,
];

/** 信源库 Hub 下的子模块（国内 1 + 出海 3，用于侧栏高亮） */
export const SOURCE_HUB_CHILD_IDS: ModuleType[] = [...SOURCE_HUB_NAV_MODULE_IDS];

/** 站点 Hub 下的子模块 */
export const SITE_HUB_CHILD_IDS: ModuleType[] = [
  ModuleType.SITE_LIST,
  ModuleType.CONTENT_TASKS,
];

/** @deprecated 使用 SITE_HUB_CHILD_IDS */
export const WEB_MAIN_HUB_CHILD_IDS: ModuleType[] = SITE_HUB_CHILD_IDS;

export const MENU_GROUPS: MenuGroup[] = [
  { id: 'quick', labelKey: null, items: [ModuleType.LATEST_OPTIMIZATION, ModuleType.START_OPTIMIZATION] },
  {
    id: 'content',
    labelKey: 'groups.tools',
    mode: 'grid',
    hubModuleId: ModuleType.TOOLS_HUB,
    items: [
      ModuleType.KNOWLEDGE_BASE,
      ModuleType.SEMANTIC_SEO,
      ModuleType.EXTRACT,
      ModuleType.GENERATE,
    ],
  },
  {
    id: 'social',
    labelKey: 'groups.sourceHub',
    mode: 'grid',
    hubModuleId: ModuleType.SOURCE_HUB,
    items: [
      ModuleType.THIRD_PARTY_PUBLISH,
      ModuleType.SOCIAL_MEDIA_ACCOUNTS,
      ModuleType.PUBLISH_RECORDS,
      ModuleType.OVERSEAS_THIRD_PARTY_PUBLISH,
    ],
  },
  {
    id: 'site_hub',
    labelKey: 'groups.siteHub',
    mode: 'grid',
    hubModuleId: ModuleType.SITE_HUB,
    items: [ModuleType.SITE_LIST, ModuleType.CONTENT_TASKS],
  },
  {
    id: 'website',
    labelKey: 'groups.merchant',
    mode: 'grid',
    hubModuleId: ModuleType.MERCHANT_HUB,
    items: [
      ModuleType.AIEO_WEBSITE,
      ModuleType.MERCHANT_PROFILE,
      ModuleType.BUSINESS_INTRO,
      ModuleType.CONTACT_SUBMISSIONS,
    ],
  },
];

/** 九宫格子页 → 父 Hub（与 MENU_GROUPS 中 grid 分组一致） */
export interface GridHubParent {
  hubModuleId: ModuleType;
  /** 与侧栏父级名称一致，用于「返回优化工具」等文案 */
  label: string;
}

/**
 * 若当前模块属于某个九宫格 Hub 下的子项，返回父 Hub；否则 null。
 * Hub 自身不在 items 内，故不会对 Hub 返回自身。
 */
export function translateMenuKey(key: string): string {
  return i18n.t(key, { ns: 'menu', defaultValue: key });
}

/** 九宫格 Hub 页标题与副标题（随语言切换） */
export function getGridHubDisplay(groupId: string): { title: string; subtitle?: string } {
  const group = MENU_GROUPS.find((g) => g.id === groupId);
  if (!group) return { title: '' };
  const title = group.labelKey ? translateMenuKey(group.labelKey) : '';
  let subtitle: string | undefined;
  if (group.hubModuleId) {
    const hub = SIDEBAR_MENU_ITEMS.find((m) => m.id === group.hubModuleId);
    if (hub?.descriptionKey) {
      subtitle = translateMenuKey(hub.descriptionKey);
    }
  }
  return { title, subtitle };
}

export function getMenuDescription(itemId: ModuleType): string | undefined {
  const item = SIDEBAR_MENU_ITEMS.find((m) => m.id === itemId);
  const descKey = item?.descriptionKey ?? MENU_ITEM_DESCRIPTION_KEYS[itemId];
  return descKey ? translateMenuKey(descKey) : undefined;
}

export function getGridHubParent(moduleId: ModuleType): GridHubParent | null {
  if (SOURCE_HUB_NAV_MODULE_IDS.includes(moduleId)) {
    const social = MENU_GROUPS.find((g) => g.hubModuleId === ModuleType.SOURCE_HUB);
    if (social) {
      const labelKey = social.hubLabelKey ?? social.labelKey ?? 'groups.sourceHub';
      return { hubModuleId: ModuleType.SOURCE_HUB, label: translateMenuKey(labelKey) };
    }
  }
  for (const g of MENU_GROUPS) {
    if (g.mode !== 'grid' || !g.hubModuleId) continue;
    if (!g.items.includes(moduleId)) continue;
    const labelKey = g.hubLabelKey ?? g.labelKey;
    if (!labelKey) continue;
    return { hubModuleId: g.hubModuleId, label: translateMenuKey(labelKey) };
  }
  return null;
}

/** 不在侧栏显示、仅从其他入口访问的项（全域看板已废弃；分析明细/诊断报告/报警/品牌管理从侧栏隐藏，仍可通过模块路由打开） */
export const HIDDEN_FROM_SIDEBAR: ModuleType[] = [
  // 三个 hub 是「虚拟模块」，自身不出现在侧栏菜单项里，由 grid 模式的父按钮触发
  ModuleType.TOOLS_HUB,
  ModuleType.MERCHANT_HUB,
  ModuleType.WEB_MAIN_HUB,
  ModuleType.SITE_HUB,
  ModuleType.SOURCE_HUB,
  ModuleType.DASHBOARD,
  ModuleType.DATA_SCREEN,
  ModuleType.DIAGNOSIS_REPORT,
  ModuleType.BRAND_MANAGEMENT,
  ModuleType.BENCHMARK_ALERT_RUN,
  ModuleType.BENCHMARK_ALERT_SCHEDULE,
  ModuleType.BENCHMARK_ALERT_RESULTS,
  ModuleType.PRODUCT_NAV,
  ModuleType.SNAPSHOT,
  ModuleType.BRAND_MENTIONS,
  ModuleType.SOURCE_ANALYSIS,
  ModuleType.WEAKNESS_ANALYSIS,
  ModuleType.CONTENT_GENERATION,
  ModuleType.TOOLBOX,
  ModuleType.KEY_SETTINGS,
  ModuleType.LOGS,
  ModuleType.WORD_EXPAND,
  ModuleType.SEMANTIC_PACK_EXPAND,
  ModuleType.MANUAL_INPUT,
  /** 仅从其他入口进入，侧栏不展示 */
  ModuleType.ANALYZE,
  /** 仅从「优化智能体」创建监控优化进入，侧栏不展示 */
  ModuleType.OPTIMIZATION_BOT,
  /** 原「分析洞察」分组，侧栏已移除入口 */
  ModuleType.MIND_SIMULATION,
  ModuleType.CRAWL_TASKS,
  ModuleType.MONITORING_LOGS,
  ModuleType.REPORTS,
  /** 二级页面：仅从「最新优化」「开始优化」等入口进入，侧栏不展示 */
  ModuleType.OPTIMIZATION_WORKBENCH,
  ModuleType.OPTIMIZATION_COCKPIT,
  /** 客户仅从优化工作台「文章生成→查看」进入，不要求菜单权限 */
  ModuleType.GENERATE,
  /** 客户/工作台深链：知识库 · 知识图谱（优化工具九宫格子项，侧栏不单独展示） */
  ModuleType.KNOWLEDGE_BASE,
  ModuleType.SEMANTIC_SEO,
  /** 已从侧栏移除入口；模块仍可由 App 内嵌链接打开，勿作为主参考页 */
  ModuleType.BRAND_PARSE_WIZARD,
  /** 单站点工作台内 tab，侧栏不展示 */
  ModuleType.SITE_WORKBENCH,
  ModuleType.WEB_MAIN_SETTINGS,
  ModuleType.WEB_MAIN_CATEGORY,
  ModuleType.WEB_MAIN_COLUMN,
  ModuleType.WEB_MAIN_ARTICLES,
  ModuleType.WEB_MAIN_CONTENT_TASKS,
  ModuleType.WEB_MAIN_FAQ,
  ModuleType.BLOG_MANAGEMENT,
  ModuleType.COLUMN_MANAGEMENT,
  ModuleType.CATEGORY_MANAGEMENT,
  ModuleType.FAQ_CONFIG,
  /** 仅从账户设置浮窗「积分」进入 */
  ModuleType.POINTS_TRANSACTIONS,
  ModuleType.USER_PACKAGE_MANAGEMENT,
  ModuleType.PURCHASE_ORDERS,
  /** 仅从账户设置「龙虾密钥」进入 */
  ModuleType.MERCHANT_EXTERNAL_API_KEYS,
  /** 仅从优化工作流「安装龙虾」进入 */
  ModuleType.QCLAW_INSTALL_GUIDE,
  /** @deprecated 已合并至自动化部署指南 */
  ModuleType.AUTOMATION_LOBSTER_INSTALL_GUIDE,
  /** @deprecated 已合并至自动化部署指南 */
  ModuleType.MASS_PUBLISH_ASSISTANT_GUIDE,
  /** 仅从智能优化 / 信源库「自动化部署指南」进入 */
  ModuleType.INTELLIGENT_OPTIMIZATION_DEPLOY_GUIDE,
];

/** 每个角色可看到的菜单 ID 列表 */
export const ROLE_MENU_IDS: Record<UserRole, ModuleType[]> = {
  [UserRole.ADMIN]: [
    ModuleType.LATEST_OPTIMIZATION,
    ModuleType.START_OPTIMIZATION,
    ModuleType.DIAGNOSIS_REPORT,
    ModuleType.KNOWLEDGE_BASE,
    ModuleType.SEMANTIC_SEO,
    ModuleType.EXTRACT,
    ModuleType.GENERATE,
    ModuleType.OPTIMIZATION_AGENT,
    ModuleType.SOCIAL_MEDIA_ACCOUNTS,
    ModuleType.PUBLISH_RECORDS,
    ModuleType.THIRD_PARTY_PUBLISH,
    ModuleType.OVERSEAS_THIRD_PARTY_PUBLISH,
    ModuleType.INTELLIGENT_OPTIMIZATION_DEPLOY_GUIDE,
    ModuleType.AIEO_WEBSITE,
    ModuleType.SITE_LIST,
    ModuleType.CONTENT_TASKS,
    ModuleType.MERCHANT_PROFILE,
    ModuleType.BUSINESS_INTRO,
    ModuleType.CONTACT_SUBMISSIONS,
    ModuleType.BRAND_MANAGEMENT,
  ],
  [UserRole.AGENT]: [
    ModuleType.LATEST_OPTIMIZATION,
    ModuleType.START_OPTIMIZATION,
    ModuleType.DIAGNOSIS_REPORT,
    ModuleType.KNOWLEDGE_BASE,
    ModuleType.SEMANTIC_SEO,
    ModuleType.EXTRACT,
    ModuleType.GENERATE,
    ModuleType.OPTIMIZATION_AGENT,
    ModuleType.SOCIAL_MEDIA_ACCOUNTS,
    ModuleType.PUBLISH_RECORDS,
    ModuleType.THIRD_PARTY_PUBLISH,
    ModuleType.OVERSEAS_THIRD_PARTY_PUBLISH,
    ModuleType.INTELLIGENT_OPTIMIZATION_DEPLOY_GUIDE,
    ModuleType.AIEO_WEBSITE,
    ModuleType.SITE_LIST,
    ModuleType.CONTENT_TASKS,
    ModuleType.MERCHANT_PROFILE,
    ModuleType.BUSINESS_INTRO,
    ModuleType.CONTACT_SUBMISSIONS,
    ModuleType.BRAND_MANAGEMENT,
  ],
  [UserRole.CUSTOMER]: [
    ModuleType.LATEST_OPTIMIZATION,
    ModuleType.START_OPTIMIZATION,
    ModuleType.DIAGNOSIS_REPORT,
    ModuleType.OPTIMIZATION_AGENT,
    ModuleType.SOCIAL_MEDIA_ACCOUNTS,
    ModuleType.PUBLISH_RECORDS,
    ModuleType.THIRD_PARTY_PUBLISH,
    ModuleType.OVERSEAS_THIRD_PARTY_PUBLISH,
    ModuleType.INTELLIGENT_OPTIMIZATION_DEPLOY_GUIDE,
    ModuleType.AIEO_WEBSITE,
    ModuleType.SITE_LIST,
    ModuleType.CONTENT_TASKS,
    ModuleType.MERCHANT_PROFILE,
    ModuleType.BUSINESS_INTRO,
    ModuleType.CONTACT_SUBMISSIONS,
    ModuleType.BRAND_MANAGEMENT,
  ],
  [UserRole.SITE_ADMIN]: [
    ModuleType.SITE_HUB,
    ModuleType.SITE_LIST,
    ModuleType.CONTENT_TASKS,
    ModuleType.WEB_MAIN_ARTICLES,
    ModuleType.WEB_MAIN_CATEGORY,
    ModuleType.WEB_MAIN_COLUMN,
  ],
};

/**
 * 合并角色组/API 的 menu_ids 与默认规则：
 * - 始终包含「最新优化」「优化管理」
 * - 有任一主站子权限时注入「主站」Hub
 * - agent 始终包含企业信息
 */
export function getEffectiveMenuIds(
  menuIds: string[] | null | undefined,
  userRole: UserRole | null
): ModuleType[] {
  let base = (menuIds && menuIds.length > 0
    ? menuIds
    : (userRole ? (ROLE_MENU_IDS[userRole] ?? []) : SIDEBAR_MENU_ITEMS.map(m => m.id))) as ModuleType[];
  if (!base.includes(ModuleType.LATEST_OPTIMIZATION)) {
    base = [ModuleType.LATEST_OPTIMIZATION, ...base];
  }
  if (!base.includes(ModuleType.START_OPTIMIZATION)) {
    const idx = base.indexOf(ModuleType.LATEST_OPTIMIZATION);
    base = [...base.slice(0, idx + 1), ModuleType.START_OPTIMIZATION, ...base.slice(idx + 1)];
  }
  const siteChildIds = SITE_HUB_CHILD_IDS;
  const hasLegacyWebMain = [
    ModuleType.WEB_MAIN_SETTINGS,
    ModuleType.WEB_MAIN_CATEGORY,
    ModuleType.WEB_MAIN_COLUMN,
    ModuleType.WEB_MAIN_ARTICLES,
    ModuleType.WEB_MAIN_CONTENT_TASKS,
    ModuleType.WEB_MAIN_FAQ,
  ].some((id) => base.includes(id));
  if (hasLegacyWebMain) {
    for (const id of siteChildIds) {
      if (!base.includes(id)) base = [...base, id];
    }
  }
  if (
    !base.includes(ModuleType.SITE_HUB) &&
    !base.includes(ModuleType.WEB_MAIN_HUB) &&
    siteChildIds.some((id) => base.includes(id))
  ) {
    base = [...base, ModuleType.SITE_HUB];
  }
  if (
    !base.includes(ModuleType.SOURCE_HUB) &&
    SOURCE_HUB_CHILD_IDS.some((id) => base.includes(id))
  ) {
    base = [...base, ModuleType.SOURCE_HUB];
  }
  if (userRole === UserRole.AGENT && !base.includes(ModuleType.MERCHANT_PROFILE)) {
    base = [...base, ModuleType.MERCHANT_PROFILE];
  }
  return base;
}

/** 侧栏底部「信源库」是否应对当前用户可见 */
export function hasSourceHubAccess(
  menuIds: string[] | null | undefined,
  userRole: UserRole | null
): boolean {
  const allowed = new Set(getEffectiveMenuIds(menuIds, userRole));
  return (
    allowed.has(ModuleType.SOURCE_HUB) ||
    SOURCE_HUB_CHILD_IDS.some((id) => allowed.has(id))
  );
}

/** 侧栏底部「站点管理」是否应对当前用户可见 */
export function hasSiteHubAccess(
  menuIds: string[] | null | undefined,
  userRole: UserRole | null
): boolean {
  const allowed = new Set(getEffectiveMenuIds(menuIds, userRole));
  return (
    allowed.has(ModuleType.SITE_HUB) ||
    allowed.has(ModuleType.WEB_MAIN_HUB) ||
    SITE_HUB_CHILD_IDS.some((id) => allowed.has(id))
  );
}

/** @deprecated 使用 hasSiteHubAccess */
export function hasWebMainHubAccess(
  menuIds: string[] | null | undefined,
  userRole: UserRole | null
): boolean {
  return hasSiteHubAccess(menuIds, userRole);
}

/** 根据角色获取菜单显示标签（部分项按角色不同显示不同文案） */
export function getMenuLabel(itemId: ModuleType, userRole: UserRole | null): string {
  if (itemId === ModuleType.MONITORING_LOGS && isBillingCustomerEquivalent(userRole)) {
    return translateMenuKey('items.monitoringReport');
  }
  const item = SIDEBAR_MENU_ITEMS.find((m) => m.id === itemId);
  const key = item?.labelKey ?? MENU_ITEM_LABEL_KEYS[itemId];
  if (key) {
    return translateMenuKey(key);
  }
  return String(itemId);
}

/**
 * 角色权限里展示的菜单名：父菜单 - 子菜单（与侧栏 MENU_GROUPS 一致；侧栏无分组标题的项用「侧栏」作父级）
 */
export function getRolePermissionLabel(itemId: ModuleType, userRole: UserRole | null = null): string {
  const childLabel = getMenuLabel(itemId, userRole);
  if (BENCHMARK_ALERT_SUBMENU_IDS.includes(itemId)) {
    return `${translateMenuKey('groups.alert')} - ${childLabel}`;
  }
  for (const group of MENU_GROUPS) {
    if (!group.items.includes(itemId)) continue;
    if (group.labelKey === null) {
      return `${translateMenuKey('groups.sidebar')} - ${childLabel}`;
    }
    return `${translateMenuKey(group.labelKey)} - ${childLabel}`;
  }
  return childLabel;
}

/**
 * 按侧栏分组顺序排列权限项（含报警子项），供角色管理勾选列表使用
 */
export function getOrderedPermissionMenuEntries(
  visibleIds: Set<ModuleType>
): Array<{ id: ModuleType; label: string }> {
  const out: Array<{ id: ModuleType; label: string }> = [];
  const push = (id: ModuleType) => {
    if (!visibleIds.has(id)) return;
    out.push({ id, label: getRolePermissionLabel(id, null) });
  };
  for (const group of MENU_GROUPS) {
    for (const id of group.items) {
      push(id);
    }
  }
  for (const id of BENCHMARK_ALERT_SUBMENU_IDS) {
    push(id);
  }
  const seen = new Set(out.map(o => o.id));
  for (const id of visibleIds) {
    if (!seen.has(id)) {
      out.push({ id, label: getRolePermissionLabel(id, null) });
      seen.add(id);
    }
  }
  return out;
}
