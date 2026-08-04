import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Coins,
  KeyRound,
  LogOut,
  MessageSquarePlus,
  MoreVertical,
  Pencil,
  Pin,
  Package,
  Settings,
  Trash2,
  UserCircle,
  Workflow,
} from 'lucide-react';
import { ModuleType, UserRole } from '../types';
import { isBillingAdmin, isBillingAccessExempt } from '../utils/billingRole';
import {
  SIDEBAR_MENU_ITEMS,
  SIDEBAR_FOOTER_NAV_ITEMS,
  getMenuLabel,
  getEffectiveMenuIds,
  hasSiteHubAccess,
  hasSourceHubAccess,
  SOURCE_HUB_CHILD_IDS,
} from '../config/menuByRole';
import { geoWorkflowAPI, type GeoWorkflowDTO } from '../api/geoWorkflow';
import { RECENT_WORKFLOWS_REFRESH_EVENT, invalidateRecentWorkflowsCache } from '../constants/geoWorkflow';
import { geoWorkflowListPhaseLabel } from './geoWorkflowShared';
import {
  shouldOpenConversationForWorkflow,
  workflowSidebarTitle,
} from '../lib/workflowSidebar';
import { useModuleI18n } from '../i18n/hooks';
import { LanguageSwitcher } from '../i18n/LanguageSwitcher';

interface SidebarProps {
  activeModule: ModuleType;
  onSelect: (module: ModuleType) => void;
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  userRole: UserRole | null;
  menuIds?: string[] | null;
  username: string;
  userPoints: number | null;
  currentPlanTitle?: string | null;
  activeConversationWorkflowId: string | null;
  activeWorkbenchWorkflowId?: string | null;
  activeCockpitWorkflowId?: string | null;
  onNewConversation: () => void;
  /** 侧栏删除当前打开的对话或工作台主线时回调 */
  onWorkflowDeleted?: (workflowId: string) => void;
  onOpenRecentWorkflow: (wf: GeoWorkflowDTO) => void;
  onOpenPersonalBackend: () => void;
  onOpenLobsterKeys?: () => void;
  onOpenPointsDetail?: () => void;
  onOpenPackageManagement?: () => void;
  onLogout: () => void;
  recentRefreshKey?: number;
}

const RECENT_LIMIT = 8;

const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelect,
  isOpen,
  onClose,
  collapsed,
  onToggleCollapse,
  userRole,
  menuIds,
  username,
  userPoints,
  currentPlanTitle,
  activeConversationWorkflowId,
  activeWorkbenchWorkflowId,
  activeCockpitWorkflowId,
  onNewConversation,
  onWorkflowDeleted,
  onOpenRecentWorkflow,
  onOpenPersonalBackend,
  onOpenLobsterKeys,
  onOpenPointsDetail,
  onOpenPackageManagement,
  onLogout,
  recentRefreshKey = 0,
}) => {
  const { t } = useModuleI18n('menu');
  const [isDesktop, setIsDesktop] = useState(false);
  const [recentWorkflows, setRecentWorkflows] = useState<GeoWorkflowDTO[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountWrapRef = useRef<HTMLDivElement>(null);
  const [rowMenuWorkflowId, setRowMenuWorkflowId] = useState<string | null>(null);
  const [rowMenuBusy, setRowMenuBusy] = useState(false);
  const rowMenuRef = useRef<HTMLDivElement>(null);

  const initials = username ? username.substring(0, 2).toUpperCase() : 'U';

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!accountOpen) return undefined;
    const onDocClick = (e: MouseEvent) => {
      if (accountWrapRef.current && !accountWrapRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [accountOpen]);

  useEffect(() => {
    if (!rowMenuWorkflowId) return undefined;
    const onDocClick = (e: MouseEvent) => {
      if (rowMenuRef.current && !rowMenuRef.current.contains(e.target as Node)) {
        setRowMenuWorkflowId(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [rowMenuWorkflowId]);

  const allowedIds = getEffectiveMenuIds(menuIds, userRole);
  const allowedSet = new Set(allowedIds);
  const isFooterVisible = (id: ModuleType) => allowedSet.has(id);

  const isNarrow = collapsed && isDesktop;

  const loadRecentWorkflows = useCallback(async () => {
    if (isNarrow) return;
    setRecentLoading(true);
    try {
      const data = await geoWorkflowAPI.list({ scope: 'mine', limit: RECENT_LIMIT, offset: 0 });
      setRecentWorkflows(data.items || []);
    } catch {
      setRecentWorkflows([]);
    } finally {
      setRecentLoading(false);
    }
  }, [isNarrow]);

  useEffect(() => {
    if (isNarrow) return undefined;
    void loadRecentWorkflows();
    const onRefresh = () => void loadRecentWorkflows();
    window.addEventListener(RECENT_WORKFLOWS_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(RECENT_WORKFLOWS_REFRESH_EVENT, onRefresh);
  }, [isNarrow, loadRecentWorkflows, recentRefreshKey]);

  const handleNewConversation = () => {
    onNewConversation();
    onClose();
  };

  const handlePinWorkflow = async (wf: GeoWorkflowDTO) => {
    setRowMenuBusy(true);
    try {
      await geoWorkflowAPI.patchWorkflowSidebar(wf.workflowId, {
        sidebar_pinned: !wf.sidebarPinned,
      });
      setRowMenuWorkflowId(null);
      invalidateRecentWorkflowsCache();
      await loadRecentWorkflows();
    } catch {
      /* ignore */
    } finally {
      setRowMenuBusy(false);
    }
  };

  const handleRenameWorkflow = async (wf: GeoWorkflowDTO) => {
    const current = workflowSidebarTitle(wf);
    const next = window.prompt(t('sidebar.renamePrompt'), current);
    if (next === null) return;
    const trimmed = next.trim();
    setRowMenuBusy(true);
    try {
      await geoWorkflowAPI.patchWorkflowSidebar(wf.workflowId, {
        sidebar_title: trimmed || '',
      });
      setRowMenuWorkflowId(null);
      invalidateRecentWorkflowsCache();
      await loadRecentWorkflows();
    } catch {
      /* ignore */
    } finally {
      setRowMenuBusy(false);
    }
  };

  const handleDeleteWorkflow = async (wf: GeoWorkflowDTO) => {
    if (!window.confirm(t('sidebar.deleteConfirm'))) return;
    setRowMenuBusy(true);
    try {
      await geoWorkflowAPI.deleteWorkflow(wf.workflowId);
      setRowMenuWorkflowId(null);
      if (
        activeConversationWorkflowId === wf.workflowId ||
        activeWorkbenchWorkflowId === wf.workflowId ||
        activeCockpitWorkflowId === wf.workflowId
      ) {
        if (onWorkflowDeleted) {
          onWorkflowDeleted(wf.workflowId);
        } else if (activeConversationWorkflowId === wf.workflowId) {
          onNewConversation();
        }
      }
      invalidateRecentWorkflowsCache();
      await loadRecentWorkflows();
    } catch {
      /* ignore */
    } finally {
      setRowMenuBusy(false);
    }
  };

  const isWorkflowActive = (wf: GeoWorkflowDTO) => {
    const id = wf.workflowId;
    if (activeConversationWorkflowId && id === activeConversationWorkflowId) {
      return activeModule === ModuleType.LATEST_OPTIMIZATION;
    }
    if (activeWorkbenchWorkflowId && id === activeWorkbenchWorkflowId) {
      return activeModule === ModuleType.OPTIMIZATION_WORKBENCH;
    }
    if (activeCockpitWorkflowId && id === activeCockpitWorkflowId) {
      return activeModule === ModuleType.OPTIMIZATION_COCKPIT;
    }
    return false;
  };

  const navBtnClass = (active: boolean, narrow: boolean, embedded = false) =>
    narrow
      ? `w-full flex items-center justify-center py-2.5 transition-all rounded-lg ${embedded ? '' : 'mx-1'} ${
          active
            ? 'text-[#E8553F]'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
        }`
      : `${embedded ? 'w-fit max-w-full' : 'mx-2 w-[calc(100%-16px)]'} flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
          active
            ? 'text-[#E8553F]'
            : 'text-gray-500 hover:bg-white/70 hover:text-gray-900'
        }`;

  const renderFooterNavItem = (itemId: ModuleType) => {
    const item = SIDEBAR_MENU_ITEMS.find((m) => m.id === itemId);
    if (!item) return null;
    if (itemId === ModuleType.SOURCE_HUB) {
      if (!hasSourceHubAccess(menuIds, userRole)) return null;
    } else if (itemId === ModuleType.SITE_HUB || itemId === ModuleType.WEB_MAIN_HUB) {
      if (!hasSiteHubAccess(menuIds, userRole)) return null;
    } else if (!isFooterVisible(itemId)) {
      return null;
    }
    const Icon = item.icon;
    const label = getMenuLabel(itemId, userRole);
    const isActive =
      activeModule === itemId ||
      (itemId === ModuleType.START_OPTIMIZATION &&
        (activeModule === ModuleType.OPTIMIZATION_WORKBENCH ||
          activeModule === ModuleType.OPTIMIZATION_COCKPIT)) ||
      (itemId === ModuleType.SOURCE_HUB &&
        (activeModule === ModuleType.SOURCE_HUB || SOURCE_HUB_CHILD_IDS.includes(activeModule))) ||
      ((itemId === ModuleType.SITE_HUB || itemId === ModuleType.WEB_MAIN_HUB) &&
        (activeModule === ModuleType.SITE_HUB ||
          activeModule === ModuleType.WEB_MAIN_HUB ||
          activeModule === ModuleType.SITE_LIST ||
          activeModule === ModuleType.CONTENT_TASKS ||
          activeModule === ModuleType.SITE_WORKBENCH ||
          [
            ModuleType.WEB_MAIN_SETTINGS,
            ModuleType.WEB_MAIN_CATEGORY,
            ModuleType.WEB_MAIN_COLUMN,
            ModuleType.WEB_MAIN_ARTICLES,
            ModuleType.WEB_MAIN_FAQ,
          ].includes(activeModule)));

    return (
      <button
        key={itemId}
        type="button"
        title={isNarrow ? label : undefined}
        onClick={() => {
          onSelect(itemId);
          onClose();
          setAccountOpen(false);
        }}
        className={navBtnClass(isActive, isNarrow)}
      >
        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#E8553F]' : 'text-gray-400'}`} />
        {!isNarrow ? <span className="truncate">{label}</span> : null}
      </button>
    );
  };

  const renderAccountPopover = () => (
    <div
      className="absolute bottom-0 left-full z-[60] w-72 rounded-xl border border-gray-200 bg-white py-3 shadow-xl"
    >
      <div className="flex items-center gap-3 px-4 pb-3 border-b border-gray-100">
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#E8553F] text-white text-sm font-semibold shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-900 truncate">{username || t('sidebar.defaultUser')}</div>
          <div className="mt-0.5">
            {onOpenPointsDetail && (isBillingAdmin(userRole) || userPoints != null) ? (
              <button
                type="button"
                onClick={() => {
                  setAccountOpen(false);
                  onOpenPointsDetail();
                  onClose();
                }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#E8553F] transition-colors group/points"
              >
                <Coins className="w-3.5 h-3.5 shrink-0 text-gray-400 group-hover/points:text-[#E8553F]" />
                <span>{isBillingAdmin(userRole) ? t('sidebar.pointsUnlimited') : t('sidebar.pointsCount', { count: userPoints })}</span>
                <ChevronRight className="w-3 h-3 opacity-0 group-hover/points:opacity-100 transition-opacity" />
              </button>
            ) : userPoints != null ? (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Coins className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                <span>{t('sidebar.pointsCount', { count: userPoints })}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Coins className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                <span>—</span>
              </div>
            )}
          </div>
          {currentPlanTitle && !isBillingAccessExempt(userRole) ? (
            onOpenPackageManagement ? (
              <button
                type="button"
                onClick={() => {
                  setAccountOpen(false);
                  onOpenPackageManagement();
                  onClose();
                }}
                className="mt-1 flex items-center gap-1 text-xs text-gray-500 hover:text-[#E8553F] transition-colors group/plan"
              >
                <Package className="w-3.5 h-3.5 shrink-0 text-gray-400 group-hover/plan:text-[#E8553F]" />
                <span>{t('sidebar.currentPlan', { plan: currentPlanTitle })}</span>
                <ChevronRight className="w-3 h-3 opacity-0 group-hover/plan:opacity-100 transition-opacity" />
              </button>
            ) : (
              <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                <Package className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                <span>{t('sidebar.currentPlan', { plan: currentPlanTitle })}</span>
              </div>
            )
          ) : null}
        </div>
      </div>
      <div className="px-4 py-3 border-b border-gray-100">
        <LanguageSwitcher variant="segmented" activeModule={activeModule} />
      </div>
      <div className="px-2 pt-2 space-y-0.5">
        <button
          type="button"
          onClick={() => {
            setAccountOpen(false);
            onOpenPersonalBackend();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <UserCircle className="w-4 h-4 text-gray-400" />
          {t('sidebar.personalCenter')}
        </button>
        {onOpenLobsterKeys ? (
          <button
            type="button"
            onClick={() => {
              setAccountOpen(false);
              onOpenLobsterKeys();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <KeyRound className="w-4 h-4 text-gray-400" />
            {t('sidebar.lobsterKeys')}
          </button>
        ) : null}
        {onOpenPackageManagement ? (
          <button
            type="button"
            onClick={() => {
              setAccountOpen(false);
              onOpenPackageManagement();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Package className="w-4 h-4 text-gray-400" />
            {t('sidebar.packageManagement')}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setAccountOpen(false);
            onLogout();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-red-500 rounded-lg hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t('sidebar.logout')}
        </button>
      </div>
    </div>
  );

  const renderAccountSettings = () => {
    const active = accountOpen;
    return (
      <div
        ref={accountWrapRef}
        className={`relative ${isNarrow ? 'mx-1 w-full' : 'mx-2 w-fit max-w-full'}`}
      >
        <button
          type="button"
          title={isNarrow ? t('sidebar.accountSettings') : undefined}
          onClick={() => setAccountOpen((o) => !o)}
          className={navBtnClass(active, isNarrow, true)}
        >
          <Settings className={`w-4 h-4 shrink-0 ${active ? 'text-[#E8553F]' : 'text-gray-400'}`} />
          {!isNarrow ? <span className="truncate">{t('sidebar.accountSettings')}</span> : null}
        </button>
        {accountOpen ? renderAccountPopover() : null}
      </div>
    );
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <div
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col bg-gray-50 border-r border-gray-200
          transition-[width,transform] duration-300 ease-out w-64
          ${collapsed ? 'lg:w-16' : 'lg:w-64'}
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div
          className={`h-16 flex items-center border-b border-gray-200 shrink-0 relative
            ${isNarrow ? 'justify-center px-2' : 'px-4'}`}
        >
          <div className={`flex items-center gap-3 min-w-0 ${isNarrow ? 'justify-center' : ''}`}>
            <img src="/logo.png" alt="珊瑚GEO" className="w-8 h-8 object-contain shrink-0" />
            {!isNarrow && (
              <span className="text-gray-900 font-semibold text-lg tracking-tight truncate">{t('sidebar.brandName')}</span>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10
              w-6 h-6 items-center justify-center rounded-full
              border border-gray-200 bg-white text-gray-500 shadow-sm
              hover:text-[#E8553F] hover:border-[#E8553F]/30 transition-colors"
            title={isNarrow ? t('sidebar.expand') : t('sidebar.collapse')}
            aria-label={isNarrow ? t('sidebar.expand') : t('sidebar.collapse')}
          >
            {isNarrow ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* 开启新优化 */}
        <div className={`shrink-0 border-b border-gray-200 ${isNarrow ? 'px-1 py-2' : 'px-2 py-2'}`}>
          {isNarrow ? (
            <button
              type="button"
              title={t('items.latestOptimization')}
              onClick={handleNewConversation}
              className="w-full flex items-center justify-center py-2.5 rounded-lg mx-1 text-gray-500 hover:bg-white hover:text-[#E8553F] transition-colors"
            >
              <MessageSquarePlus className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNewConversation}
              className="mx-2 flex h-10 w-[calc(100%-16px)] items-center gap-3 rounded-lg px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-white hover:shadow-sm"
            >
              <MessageSquarePlus className="w-4 h-4 shrink-0 text-[#E8553F]" />
              <span>{t('items.latestOptimization')}</span>
            </button>
          )}
        </div>

        {/* 最近优化 */}
        {!isNarrow ? (
          <div
            className="flex-1 overflow-y-auto py-3 min-h-0"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
          >
            <div className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {t('sidebar.recentWorkflows')}
            </div>
            <div className="space-y-1">
              {recentLoading && recentWorkflows.length === 0 ? (
                <div className="px-4 py-2 text-xs text-gray-400">{t('sidebar.loading')}</div>
              ) : null}
              {recentWorkflows.map((wf) => {
                const active = isWorkflowActive(wf);
                const title = workflowSidebarTitle(wf);
                const phaseLabel = geoWorkflowListPhaseLabel(wf);
                const inConversation = shouldOpenConversationForWorkflow(wf);
                const menuOpen = rowMenuWorkflowId === wf.workflowId;
                const rowClass = active
                  ? 'bg-white text-[#E8553F] shadow-sm'
                  : 'text-gray-500 hover:bg-white/70 hover:text-gray-900';
                return (
                  <div
                    key={wf.workflowId}
                    className="relative mx-2 w-[calc(100%-16px)]"
                    ref={menuOpen ? rowMenuRef : undefined}
                  >
                    <div
                      className={`flex min-h-9 items-center gap-1 rounded-lg py-1.5 pl-3 pr-1 text-sm transition-colors ${rowClass}`}
                    >
                      <button
                        type="button"
                        title={title}
                        onClick={() => {
                          onOpenRecentWorkflow(wf);
                          onClose();
                        }}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        {inConversation ? (
                          <MessageSquarePlus className="w-4 h-4 shrink-0 text-gray-400" />
                        ) : (
                          <Workflow className="w-4 h-4 shrink-0 text-gray-400" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {wf.sidebarPinned ? (
                              <Pin className="mr-1 inline-block h-3 w-3 shrink-0 text-amber-500" />
                            ) : null}
                            {title}
                          </span>
                          <span className="block truncate text-[10px] text-gray-400">{phaseLabel}</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        title={t('sidebar.more')}
                        disabled={rowMenuBusy}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRowMenuWorkflowId(menuOpen ? null : wf.workflowId);
                        }}
                        className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                    {menuOpen ? (
                      <div className="absolute right-0 top-full z-50 mt-0.5 min-w-[8.5rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                        <button
                          type="button"
                          disabled={rowMenuBusy}
                          onClick={() => void handlePinWorkflow(wf)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                        >
                          <Pin className="h-3.5 w-3.5 shrink-0" />
                          {wf.sidebarPinned ? t('sidebar.unpin') : t('sidebar.pin')}
                        </button>
                        <button
                          type="button"
                          disabled={rowMenuBusy}
                          onClick={() => void handleRenameWorkflow(wf)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil className="h-3.5 w-3.5 shrink-0" />
                          {t('sidebar.rename')}
                        </button>
                        <button
                          type="button"
                          disabled={rowMenuBusy}
                          onClick={() => void handleDeleteWorkflow(wf)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5 shrink-0" />
                          {t('sidebar.delete')}
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {!recentLoading && recentWorkflows.length === 0 ? (
                <div className="px-4 py-2 text-xs text-gray-400">{t('sidebar.noRecentWorkflows')}</div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0" />
        )}

        {/* 底部：优化管理、主站、账户设置 */}
        <div className={`shrink-0 border-t border-gray-200 ${isNarrow ? 'py-2 space-y-1' : 'py-3 space-y-1'}`}>
          {SIDEBAR_FOOTER_NAV_ITEMS.map(renderFooterNavItem)}
          {renderAccountSettings()}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
