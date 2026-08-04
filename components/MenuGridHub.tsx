import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { ModuleType, UserRole } from '../types';
import {
  HIDDEN_FROM_SIDEBAR,
  MENU_GROUPS,
  SIDEBAR_MENU_ITEMS,
  getEffectiveMenuIds,
  getGridHubDisplay,
  getMenuDescription,
  getMenuLabel,
} from '../config/menuByRole';
import { useModuleI18n } from '../i18n/hooks';

interface MenuGridHubProps {
  /** 哪个 group 的项要被聚合展示（如 'content' / 'web_main' / 'website'） */
  groupId: string;
  /** Hub 顶部标题（省略时从 menu 分组自动解析） */
  title?: string;
  /** Hub 顶部副标题描述（省略时从 menu 分组自动解析） */
  subtitle?: string;
  /** 当前用户角色 */
  userRole: UserRole | null;
  /** 当前用户角色组配置的菜单 IDs（用于权限过滤） */
  menuIds?: string[] | null;
  /** 当用户点击格子时，跳转到对应模块 */
  onSelect: (m: ModuleType) => void;
}

/**
 * 通用九宫格 Hub：
 * 复用 menuByRole 中的 group.items 列表，结合用户权限过滤后渲染为可点击的卡片。
 * 用于「优化工具 / 企业 / 主站」三个 hub 模块。
 */
const MenuGridHub: React.FC<MenuGridHubProps> = ({
  groupId,
  title,
  subtitle,
  userRole,
  menuIds,
  onSelect,
}) => {
  const { t, i18n } = useModuleI18n('menu');
  const hubDisplay = useMemo(() => getGridHubDisplay(groupId), [groupId, i18n.language]);
  const displayTitle = title ?? hubDisplay.title;
  const displaySubtitle = subtitle ?? hubDisplay.subtitle;
  const items = useMemo(() => {
    const group = MENU_GROUPS.find((g) => g.id === groupId);
    if (!group) return [] as ModuleType[];
    const allowed = new Set(getEffectiveMenuIds(menuIds, userRole));
    // hub 内部允许展示「侧栏隐藏但分组内」的项？这里仅按 allowed 过滤，不再使用 HIDDEN_FROM_SIDEBAR
    void HIDDEN_FROM_SIDEBAR;
    return group.items.filter((id) => allowed.has(id));
  }, [groupId, menuIds, userRole]);

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F5F5F7]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 顶部标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{displayTitle}</h1>
          {displaySubtitle && (
            <p className="mt-2 text-sm text-gray-500">{displaySubtitle}</p>
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-200 px-8 py-16 text-center">
            <div className="text-gray-400 text-sm">{t('hub.noFeatures', { defaultValue: '当前角色暂无可用功能' })}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((id) => {
              const meta = SIDEBAR_MENU_ITEMS.find((m) => m.id === id);
              const Icon = meta?.icon;
              const label = getMenuLabel(id, userRole);
              const description = getMenuDescription(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelect(id)}
                  className="group relative text-left bg-white border border-gray-200 rounded-2xl p-5 transition-all hover:border-[#E8553F]/40 hover:shadow-[0_8px_24px_-12px_rgba(232,85,63,0.25)] hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFE9E2] to-[#FFD3C5] flex items-center justify-center text-[#E8553F]">
                      {Icon && <Icon className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-base font-semibold text-gray-900 truncate">{label}</div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#E8553F] transition-colors" />
                      </div>
                      {description && (
                        <p className="mt-1 text-xs text-gray-500 line-clamp-2 leading-relaxed">{description}</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuGridHub;
