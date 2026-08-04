
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  UserCircle,
  Briefcase,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { ModuleType, Theme, Brand } from '../types';
import { brandsAPI } from '../api/brands';
import { useModuleI18n } from '../i18n/hooks';
import { preloadModuleI18n } from '../i18n/module-preload';
import {
  buildAdminSidebarMenu,
  findAdminMenuGroupIdForModule,
} from '../config/adminMenu';
import PersonalCenter from './PersonalCenter';
import BrandManagement from './BrandManagement';
import Toolbox from './Toolbox';
import KeySettings from './KeySettings';
import BlogManagement from './BlogManagement';
import AccountManagement from './AccountManagement';
import RoleManagement from './RoleManagement';
import MerchantManagement from './MerchantManagement';
import SiteConfigurationManagement from './SiteConfigurationManagement';
import ThirdPartyPublish from './ThirdPartyPublish';
import ArticleTemplateManager from './ArticleTemplateManager';
import GeneralSettings from './GeneralSettings';
import PointsPricingSettings from './PointsPricingSettings';
import GeoStageFieldGuideManager from './GeoStageFieldGuideManager';
import GeoReportAdminList from './GeoReportAdminList';
import EditDataScreenList from './EditDataScreenList';
import EditDataScreenBatchList from './EditDataScreenBatchList';
import LlmChannelManagement from './LlmChannelManagement';
import SearchConfigManagement from './SearchConfigManagement';
import OverseasAiManagement from './OverseasAiManagement';
import WorkflowTransferManagement from './WorkflowTransferManagement';
import PaymentChannelSettings from './PaymentChannelSettings';
import CreditPackageSettings from './CreditPackageSettings';
import PaymentOrderList from './PaymentOrderList';

interface PersonalBackendLayoutProps {
  theme: Theme;
  onLogout: () => void;
  onNavigateToBrandBackend?: () => void;
  username: string;
  initialModule?: ModuleType;
  userRole?: string | null;
}

const PersonalBackendLayout: React.FC<PersonalBackendLayoutProps> = ({
  theme,
  onLogout,
  onNavigateToBrandBackend,
  username,
  initialModule,
  userRole,
}) => {
  const isDark = theme === 'dark';
  const { t } = useModuleI18n('admin');
  const [activeModule, setActiveModule] = useState<ModuleType>(initialModule || ModuleType.PERSONAL_CENTER);

  useEffect(() => {
    if (initialModule) {
      setActiveModule(initialModule);
    }
  }, [initialModule]);

  useEffect(() => {
    void preloadModuleI18n(activeModule);
  }, [activeModule]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    () => new Set([userRole === 'agent' ? 'agent_ops' : 'platform']),
  );

  const { topLevelItems, groups, allItems } = useMemo(
    () => buildAdminSidebarMenu(userRole, (key) => t(key)),
    [t, userRole],
  );

  useEffect(() => {
    const groupId = findAdminMenuGroupIdForModule(activeModule);
    if (!groupId) return;
    setExpandedGroupIds((prev) => {
      if (prev.has(groupId)) return prev;
      const next = new Set(prev);
      next.add(groupId);
      return next;
    });
  }, [activeModule]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  useEffect(() => {
    const loadBrands = async () => {
      try {
        const apiBrands = await brandsAPI.listBrands({ is_active: true });
        const formattedBrands: Brand[] = apiBrands.map((b) => ({
          id: b.brand_id,
          name: b.name,
          category: b.category,
          logoColor: b.logo_color || 'bg-blue-600',
          customerId: b.customer_id || null,
        }));
        setAllBrands(formattedBrands);
      } catch (error) {
        console.error('加载品牌列表失败:', error);
      }
    };
    void loadBrands();
  }, []);

  const activePageLabel =
    allItems.find((item) => item.id === activeModule)?.label || t('personalCenter');

  const navBtnClass = (active: boolean, nested = false) =>
    `w-full rounded-xl flex items-center gap-3 transition-all text-left ${
      nested ? 'pl-9 pr-3 py-2' : 'px-4 py-3'
    } ${
      active
        ? isDark
          ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95'
          : 'bg-gradient-coral text-white shadow-coral hover:opacity-95'
        : isDark
          ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`;

  const groupHeaderClass = (expanded: boolean, hasActiveChild: boolean) =>
    `w-full px-3 py-2 rounded-lg flex items-center gap-2 transition-all text-left ${
      hasActiveChild
        ? isDark
          ? 'text-white bg-zinc-800/80'
          : 'text-slate-900 bg-slate-100'
        : isDark
          ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
    } ${expanded ? '' : ''}`;

  const renderModule = () => {
    switch (activeModule) {
      case ModuleType.PERSONAL_CENTER:
        return <PersonalCenter theme={theme} />;
      case ModuleType.BRAND_MANAGEMENT:
        return <BrandManagement theme={theme} brands={allBrands} setBrands={setAllBrands} />;
      case ModuleType.BLOG_MANAGEMENT:
        return <BlogManagement theme={theme} />;
      case ModuleType.MERCHANT_MANAGEMENT:
        return <MerchantManagement theme={theme} />;
      case ModuleType.WORKFLOW_TRANSFER:
        return <WorkflowTransferManagement theme={theme} />;
      case ModuleType.SITE_CONFIGURATION:
        return <SiteConfigurationManagement theme={theme} />;
      case 'ACCOUNT_MANAGEMENT' as ModuleType:
        return <AccountManagement theme={theme} />;
      case ModuleType.ROLE_MANAGEMENT:
        return <RoleManagement theme={theme} />;
      case ModuleType.TOOLBOX:
        return <Toolbox theme={theme} />;
      case ModuleType.KEY_SETTINGS:
        return <KeySettings theme={theme} />;
      case ModuleType.ARTICLE_TEMPLATES:
        return <ArticleTemplateManager theme={theme} />;
      case ModuleType.PUBLISH_TODO:
        return (
          <div className={`flex-1 p-8 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
            <p>发稿运营请在云端完整版 Admin 处理；开源实例仅可提交发稿任务。</p>
          </div>
        );
      case ModuleType.GENERAL_SETTINGS:
        return <GeneralSettings theme={theme} />;
      case ModuleType.LLM_CHANNELS:
        return <LlmChannelManagement theme={theme} />;
      case ModuleType.SEARCH_CONFIG:
        return <SearchConfigManagement theme={theme} />;
      case ModuleType.OVERSEAS_AI:
        return (
          <div className={`flex-1 p-8 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
            <p>出海 AI 通道仅在云端完整版提供；开源版请使用「日常 AI 通道」自配 Key。</p>
          </div>
        );
      case ModuleType.POINTS_PRICING:
        return <PointsPricingSettings theme={theme} />;
      case ModuleType.PAYMENT_CHANNEL_SETTINGS:
        return <PaymentChannelSettings theme={theme} />;
      case ModuleType.CREDIT_PACKAGES:
        return <CreditPackageSettings theme={theme} />;
      case ModuleType.PAYMENT_ORDERS:
        return <PaymentOrderList theme={theme} />;
      case ModuleType.GEO_STAGE_FIELD_GUIDES:
        return <GeoStageFieldGuideManager theme={theme} />;
      case ModuleType.GEO_REPORT_ADMIN:
      case ModuleType.EDIT_ANALYSIS:
        return <GeoReportAdminList theme={theme} />;
      case ModuleType.EDIT_DATA_SCREEN:
        return <EditDataScreenList theme={theme} />;
      case ModuleType.EDIT_DATA_SCREEN_BATCH:
        return <EditDataScreenBatchList theme={theme} />;
      default:
        return <PersonalCenter theme={theme} />;
    }
  };

  return (
    <div className={`h-screen w-full flex overflow-hidden ${isDark ? 'bg-geo-bg' : 'bg-white'}`}>
      <div
        className={`
        fixed inset-y-0 left-0 z-50 w-[280px] p-4 flex flex-col transition-transform duration-300 ease-out lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isDark ? 'bg-zinc-900 border-r border-white/10' : 'bg-white border-r border-slate-200'}
      `}
      >
        <div className="h-full flex flex-col">
          <div className="px-6 pt-8 pb-6 shrink-0">
            <div className="flex items-center gap-4 mb-6">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                  isDark ? 'bg-gradient-coral shadow-coral hover:opacity-95' : 'bg-gradient-coral shadow-coral hover:opacity-95'
                }`}
              >
                <UserCircle className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className={`font-semibold text-xl tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t('title')}
                </h1>
                <p className={`text-xs font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>{t('subtitle')}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 space-y-1 no-scrollbar">
            {topLevelItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModule(item.id)}
                  className={navBtnClass(isActive)}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="font-bold text-sm">{item.label}</span>
                </button>
              );
            })}

            {groups.map((group) => {
              const expanded = expandedGroupIds.has(group.id);
              const hasActiveChild = group.items.some((item) => item.id === activeModule);
              return (
                <div key={group.id} className="pt-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={groupHeaderClass(expanded, hasActiveChild)}
                  >
                    {expanded ? (
                      <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    )}
                    <span className="text-[11px] font-bold uppercase tracking-wide">{group.label}</span>
                  </button>
                  {expanded && (
                    <div className="mt-1 space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeModule === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setActiveModule(item.id)}
                            className={navBtnClass(isActive, true)}
                          >
                            <Icon className={`shrink-0 ${isActive ? 'w-4 h-4' : 'w-4 h-4 opacity-80'}`} />
                            <span className={`font-semibold ${isActive ? 'text-sm' : 'text-xs'}`}>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div
            className="p-4 border-t shrink-0 space-y-2"
            style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
          >
            {onNavigateToBrandBackend && (
              <button
                type="button"
                onClick={onNavigateToBrandBackend}
                className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all text-left ${
                  isDark
                    ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Briefcase className="w-5 h-5" />
                <span className="font-bold text-sm">{t('backToBrandBackend')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onLogout}
              className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all text-left ${
                isDark ? 'text-red-400 hover:bg-red-500/20 hover:text-red-300' : 'text-red-600 hover:bg-red-50 hover:text-red-700'
              }`}
            >
              <LogOut className="w-5 h-5" />
              <span className="font-bold text-sm">{t('logout')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col ml-0 lg:ml-[280px]">
        <header
          className={`h-16 border-b flex items-center justify-between px-6 shrink-0 ${
            isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 rounded-lg transition-all lg:hidden ${
                isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'
              }`}
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{activePageLabel}</div>
          </div>
          <div
            className={`flex items-center gap-3 px-3 py-1.5 rounded-full border backdrop-blur-md ${
              isDark ? 'bg-zinc-800/50 border-white/10 text-white' : 'bg-white/50 border-slate-200 text-slate-700'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center ${isDark ? 'bg-zinc-700' : 'bg-slate-200'}`}
            >
              <UserCircle className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold">{username}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">{renderModule()}</div>
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  );
};

export default PersonalBackendLayout;
