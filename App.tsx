
import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, ArrowLeft } from 'lucide-react';
import { preloadModuleI18n } from './i18n/module-preload';
import { useModuleI18n } from './i18n/hooks';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import SiteAdminLogin from './components/SiteAdminLogin';
// 按需加载：首次只加载 Login/Sidebar，其余模块进入时再加载
const ProductNav = lazy(() => import('./components/ProductNav'));
const Toolbox = lazy(() => import('./components/Toolbox'));
const KeySettings = lazy(() => import('./components/KeySettings'));
const HistorySearch = lazy(() => import('./components/HistorySearch'));
const BrandManagement = lazy(() => import('./components/BrandManagement'));
const SocialMediaAccounts = lazy(() => import('./components/SocialMediaAccounts'));
const ExtractList = lazy(() => import('./components/ExtractList'));
const SentenceExpandPage = lazy(() => import('./components/SentenceExpandPage'));
const SemanticPackExpandPage = lazy(() => import('./components/SemanticPackExpandPage'));
const ManualKeywordInput = lazy(() => import('./components/ManualKeywordInput'));
const GenerateList = lazy(() => import('./components/GenerateList'));
const SnapshotView = lazy(() => import('./components/SnapshotView'));
const KnowledgeBase = lazy(() => import('./components/KnowledgeBase'));
const SemanticSEO = lazy(() => import('./components/SemanticSEO'));
const SemanticSEOList = lazy(() => import('./components/SemanticSEOList'));
const AnalyticsReport = lazy(() => import('./components/AnalyticsReport'));
const DataScreen = lazy(() => import('./components/DataScreen'));
const AiReplyCredentialPage = lazy(() => import('./components/AiReplyCredentialPage'));
const BrandParseWizard = lazy(() => import('./components/BrandParseWizard'));
const StartOptimization = lazy(() => import('./components/StartOptimization'));
const OptimizationWorkbench = lazy(() => import('./components/StartOptimization/OptimizationWorkbench'));
const OptimizationCockpit = lazy(() => import('./components/StartOptimization/OptimizationCockpit'));
const LatestOptimization = lazy(() => import('./components/LatestOptimization'));
const MenuGridHub = lazy(() => import('./components/MenuGridHub'));
const SourceHubPage = lazy(() => import('./components/SourceHubPage'));
const OptimizationBot = lazy(() => import('./components/OptimizationBot'));
const OptimizationAgent = lazy(() => import('./components/OptimizationAgent'));
const GeoReportFullPage = lazy(() => import('./components/GeoReportFullPage'));
const PublishRecords = lazy(() => import('./components/PublishRecords'));
const TemplateSiteAIEOEntry = lazy(() => import('./components/TemplateSiteAIEOEntry'));
const TemplateSiteBusinessEntry = lazy(() => import('./components/TemplateSiteBusinessEntry'));
const WebMainSettings = lazy(() => import('./components/WebMainSettings'));
const WebMainContentTasks = lazy(() => import('./components/WebMainContentTasks'));
const SiteList = lazy(() => import('./components/SiteList'));
const SiteWorkbench = lazy(() => import('./components/SiteWorkbench'));
const MerchantProfile = lazy(() => import('./components/MerchantProfile'));
const ThirdPartyPublish = lazy(() => import('./components/ThirdPartyPublish'));
const BlogManagement = lazy(() => import('./components/BlogManagement'));
const ColumnManagement = lazy(() => import('./components/ColumnManagement'));
const PointsTransactionList = lazy(() => import('./components/PointsTransactionList'));
const PurchaseOrderList = lazy(() => import('./components/PurchaseOrderList'));
const UserPackageManagement = lazy(() => import('./components/UserPackageManagement'));
const CreditsRechargeDrawer = lazy(() => import('./components/CreditsRechargeDrawer'));
const MerchantExternalApiKeys = lazy(() => import('./components/MerchantExternalApiKeys'));
const IntelligentOptimizationDeployGuide = lazy(() => import('./components/IntelligentOptimizationDeployGuide'));
const CategoryManagement = lazy(() => import('./components/CategoryManagement'));
const FAQConfig = lazy(() => import('./components/FAQConfig'));
const BusinessIntroConfig = lazy(() => import('./components/BusinessIntroConfig'));
const ContactSubmissions = lazy(() => import('./components/ContactSubmissions'));
const PersonalBackendLayout = lazy(() => import('./components/PersonalBackendLayout'));
const SitePortalLayout = lazy(() => import('./components/SitePortalLayout'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./components/TermsOfService'));
const PageFallback = () => {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex items-center justify-center text-slate-500">
      {t('actions.loading', { defaultValue: 'Loading...' })}
    </div>
  );
};
import { brandQuotaBlockedMessage, shouldBlockNewBrandWorkbench } from './lib/brandQuota';
import { ModuleType, Theme, Brand, UserRole, UserInfo, BrandQuota } from './types';
import { SHOW_CONTENT_AND_MEDIA_PUBLISH } from './constants/optimizationMode';
import { isBillingAccessExempt, isBillingCustomerEquivalent } from './utils/billingRole';
import {
  DEFAULT_WORKBENCH_OPEN,
  workflowPhaseToWorkbenchStage,
  type WorkbenchOpenParams,
} from './components/StartOptimization/types';
import type { CockpitTab } from './components/StartOptimization/OptimizationCockpit/types';
import { SIDEBAR_MENU_ITEMS, HIDDEN_FROM_SIDEBAR, getEffectiveMenuIds, getGridHubParent } from './config/menuByRole';
import { brandsAPI, type Brand as ApiBrand } from './api/brands';
import { apiBrandRecordToAppBrand, resolveAppBrandFromSavedId } from './utils/appBrand';
import { authAPI } from './api/auth';
import { clearAuthSession, getAccessToken } from './lib/authSession';
import type { CreateOptimizationTaskPayload } from './api/optimizationTask';
import type { SocialMediaAccountsHandle } from './components/SocialMediaAccounts';
import { geoWorkflowAPI, type GeoWorkflowDTO } from './api/geoWorkflow';
import { invalidateRecentWorkflowsCache } from './constants/geoWorkflow';
import { shouldOpenConversationForWorkflow, shouldOpenCockpitForWorkflow } from './lib/workflowSidebar';
import { SOCIAL_ACCOUNTS_FROM_OPTIMIZATION_WORKBENCH_KEY } from './constants/socialAccountsNavigation';

const APP_BACKEND_PATH = '/workspace';
const SITE_ADMIN_LOGIN_PATH = '/site-admin/login';
const SITE_ADMIN_HOME_PATH = '/site-admin';
const SIDEBAR_COLLAPSED_KEY = 'geo-sidebar-collapsed';

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function normalizeAppPath(pathname: string): string {
  const p = (pathname || '/').replace(/\/$/, '');
  return p || '/';
}

/** 后台路径；/app 在 Windows 下会与 App.tsx 冲突，仅作历史兼容 */
function isBackendPath(pathname: string): boolean {
  const p = normalizeAppPath(pathname);
  return p === APP_BACKEND_PATH || p === '/app';
}

function isSiteAdminLoginPath(pathname: string): boolean {
  return normalizeAppPath(pathname) === SITE_ADMIN_LOGIN_PATH;
}

function isSiteAdminHomePath(pathname: string): boolean {
  return normalizeAppPath(pathname) === SITE_ADMIN_HOME_PATH;
}

function isSiteAdminPath(pathname: string): boolean {
  const p = normalizeAppPath(pathname);
  return p === SITE_ADMIN_HOME_PATH || p === SITE_ADMIN_LOGIN_PATH || p.startsWith('/site-admin/');
}

/** 无需登录的分享/凭证页（非营销站） */
function isPublicSharePath(pathname: string): boolean {
  const p = (pathname || '').replace(/\/$/, '') || '/';
  return (
    p.endsWith('/data-screen') ||
    p.endsWith('/diagnosis-report') ||
    p.endsWith('/credential')
  );
}

function sealLoginUrl(): void {
  if (normalizeAppPath(window.location.pathname) !== '/login') {
    window.history.replaceState({ appView: 'login' }, '', '/login');
  }
}

function sealSiteAdminLoginUrl(): void {
  if (!isSiteAdminLoginPath(window.location.pathname)) {
    window.history.replaceState({ appView: 'site-admin-login' }, '', SITE_ADMIN_LOGIN_PATH);
  }
}

/** 登录后锁定历史：replace 当前页 + push 占位，配合 popstate 拦截浏览器后退 */
function sealAuthHistory() {
  window.history.replaceState({ appView: 'backend', sealed: true }, '', APP_BACKEND_PATH);
  window.history.pushState({ appView: 'backend', sealed: true }, '', APP_BACKEND_PATH);
}

function sealSiteAdminAuthHistory() {
  window.history.replaceState({ appView: 'site-portal', sealed: true }, '', SITE_ADMIN_HOME_PATH);
  window.history.pushState({ appView: 'site-portal', sealed: true }, '', SITE_ADMIN_HOME_PATH);
}

const App: React.FC = () => {
  const { t: optT } = useModuleI18n('optimization');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(!!getAccessToken());
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userPoints, setUserPoints] = useState<number | null>(null);  // 积分（admin 为 null）
  const [currentPlanTitle, setCurrentPlanTitle] = useState<string | null>(null);
  const [brandQuota, setBrandQuota] = useState<BrandQuota | null>(null);
  const [menuIds, setMenuIds] = useState<string[] | null>(null);  // 角色组配置的菜单（用于 Sidebar）
  const [roleGroupName, setRoleGroupName] = useState<string | null>(null);  // 角色组名称，用于 show 角色可见度趋势图
  const [activeModule, setActiveModule] = useState<ModuleType>(ModuleType.LATEST_OPTIMIZATION);

  useEffect(() => {
    void preloadModuleI18n(activeModule);
  }, [activeModule]);

  const [isWorkflowMode, setIsWorkflowMode] = useState(false);
  const [workflowProduct, setWorkflowProduct] = useState<string | null>(null);
  const [listSelectedProduct, setListSelectedProduct] = useState<string | null>(null);
  const [selectedAnalyzeTaskId, setSelectedAnalyzeTaskId] = useState<string | null>(null);
  const [selectedExtractTaskId, setSelectedExtractTaskId] = useState<string | null>(null);
  const [selectedSemanticExpandTaskId, setSelectedSemanticExpandTaskId] = useState<string | null>(null);
  const [reportTaskId, setReportTaskId] = useState<string | null>(null);
  /** 侧栏「诊断报告」全页返回目标（默认快速开始；工作台跳转打开时为 OPTIMIZATION_WORKBENCH） */
  const [diagnosisReportReturnModule, setDiagnosisReportReturnModule] = useState<ModuleType>(
    ModuleType.BRAND_PARSE_WIZARD
  );
  /** 自 GEO 节点 3「分析明细」进入：与内嵌诊断报告顶栏一致的返回快速开始 */
  const [dataScreenWizardNav, setDataScreenWizardNav] = useState<{
    onBack: () => void;
    backLabel?: string;
  } | null>(null);
  const [diagnosisReportTaskIdFromAnalyze, setDiagnosisReportTaskIdFromAnalyze] = useState<string | null>(null);
  /** 进入「优化任务」时预填创建表单（如从诊断报告「开始优化」） */
  const [optimizationBotCreateDraft, setOptimizationBotCreateDraft] = useState<Partial<CreateOptimizationTaskPayload> | null>(null);
  /** 进入「优化任务」时直接打开的任务详情 ID */
  const [optimizationBotDetailTaskId, setOptimizationBotDetailTaskId] = useState<string | null>(null);
  /** 从「优化智能体」进入「优化任务」时直接打开新建表单 */
  const [optimizationBotOpenCreate, setOptimizationBotOpenCreate] = useState(false);
  /** 自侧栏「优化任务」跳转到快速开始并选中 GEO 主线 / 产出节点 */
  const [wizardInitialWorkflowId, setWizardInitialWorkflowId] = useState<string | null>(null);
  const [wizardInitialArtifactStep, setWizardInitialArtifactStep] = useState<number | null>(null);
  /** 侧栏「优化工作台」及入口跳转时的 OptimizationWorkbench 路由参数 */
  const [workbenchOpen, setWorkbenchOpen] = useState<WorkbenchOpenParams | null>(null);
  /** 关闭工作台时回到的模块（最新优化 / 开始优化 / 快速开始） */
  const [workbenchReturnModule, setWorkbenchReturnModule] = useState<ModuleType>(ModuleType.START_OPTIMIZATION);
  /** 优化驾驶舱：品牌 scoped 视图 */
  const [cockpitOpen, setCockpitOpen] = useState<{ workflowId: string; initialTab?: CockpitTab } | null>(null);
  const [cockpitReturnModule, setCockpitReturnModule] = useState<ModuleType>(ModuleType.LATEST_OPTIMIZATION);
  /** 进入驾驶舱前保存的工作台上下文，返回时恢复智能优化 Hub */
  const [cockpitReturnWorkbench, setCockpitReturnWorkbench] = useState<WorkbenchOpenParams | null>(null);
  /** 关闭智能优化自动化部署指南时回到的模块 */
  const [deployGuideReturnModule, setDeployGuideReturnModule] = useState<ModuleType>(
    ModuleType.OPTIMIZATION_WORKBENCH
  );
  /** 关闭龙虾密钥页时回到的模块 */
  const [merchantKeysReturnModule, setMerchantKeysReturnModule] = useState<ModuleType>(ModuleType.LATEST_OPTIMIZATION);
  /** 关闭套餐管理页时回到的模块 */
  const [packageManagementReturnModule, setPackageManagementReturnModule] = useState<ModuleType>(
    ModuleType.LATEST_OPTIMIZATION,
  );
  /** GEO 智能优化节点 → 侧栏「内容生成」：按优化任务 ID 筛批次 */
  const [geoArtifactGenerateFilterTaskId, setGeoArtifactGenerateFilterTaskId] = useState<string | null>(null);
  /** 与上条同时：进入内容生成后打开指定 CG 任务详情 */
  const [geoArtifactInitialContentTaskId, setGeoArtifactInitialContentTaskId] = useState<string | null>(null);
  /** 详情页「返回」回到优化工作台（由「查看正文」从工作台进入时） */
  const [geoGenerateFromWorkbenchArticle, setGeoGenerateFromWorkbenchArticle] = useState(false);
  /** 自优化工作台进入内容生成列表：顶栏返回工作台而非优化工具 Hub */
  const [geoGenerateFromWorkbench, setGeoGenerateFromWorkbench] = useState(false);
  /** 内容生成原文详情打开时隐藏 Hub 顶栏「返回」，避免与页内返回重复 */
  const [generateListArticleDetailActive, setGenerateListArticleDetailActive] = useState(false);
  /** 内容生成：批次文章页顶栏「返回」先退回批次列表，再退回 Hub（见 GenerateList nestedHubBackRef） */
  const generateListNestedBackRef = useRef<(() => boolean) | null>(null);
  const socialMediaAccountsHubBackRef = useRef<SocialMediaAccountsHandle | null>(null);
  /** 自优化工作台进入信源库子页：顶栏返回工作台而非信源库 Hub */
  const [sourceHubFromWorkbench, setSourceHubFromWorkbench] = useState(false);
  /** 自优化工作台进入知识库/知识图谱：顶栏返回工作台而非优化工具 Hub */
  const [toolsHubFromWorkbench, setToolsHubFromWorkbench] = useState(false);
  /** 工作台深链：按 GEO 主线隔离知识库/图谱（与优化驾驶舱 tab 一致） */
  const [toolsHubWorkflowId, setToolsHubWorkflowId] = useState<string | null>(null);
  const [toolsHubPinnedKnowledgeBaseId, setToolsHubPinnedKnowledgeBaseId] = useState<number | null>(null);
  const [toolsHubPinnedSemanticSeoTaskId, setToolsHubPinnedSemanticSeoTaskId] = useState<string | null>(null);
  /** GEO 智能优化节点 → 侧栏「自媒体发布」 */
  const [geoArtifactPublishFilterTaskId, setGeoArtifactPublishFilterTaskId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  /** 「开启新对话」绑定的 workflowId */
  const [conversationWorkflowId, setConversationWorkflowId] = useState<string | null>(null);
  /** 每次「开启新对话」递增，用于重置对话 UI */
  const [conversationSessionKey, setConversationSessionKey] = useState(0);
  const [recentWorkflowsRefreshKey, setRecentWorkflowsRefreshKey] = useState(0);
  const refreshRecentWorkflows = useCallback(() => {
    setRecentWorkflowsRefreshKey((n) => n + 1);
    invalidateRecentWorkflowsCache();
  }, []);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const toggleSidebarCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const theme: Theme = 'light';
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [semanticSEOTaskId, setSemanticSEOTaskId] = useState<string | null>(null);
  /** 从优化工作台「解析品牌」跳入知识库时预选 knowledge_bases.id，离开模块后清空 */
  const [knowledgeBasePresetId, setKnowledgeBasePresetId] = useState<number | null>(null);
  const [backendMode, setBackendMode] = useState<'brand' | 'personal' | 'site-portal'>('brand'); // 'brand' | 'personal' | 'site-portal'
  const [currentPage, setCurrentPage] = useState<'login' | 'backend'>('login');
  /** 登录页外链：仅隐私政策 / 用户协议（无营销首页、价格、资讯） */
  const [publicPage, setPublicPage] = useState<'privacy' | 'terms' | null>(null);
  const [initialPersonalBackendModule, setInitialPersonalBackendModule] = useState<ModuleType | null>(null); // 管理员后台初始模块
  /** 单站点工作台当前 site_id */
  const [siteWorkbenchId, setSiteWorkbenchId] = useState<number | null>(null);
  /** 内容创作任务列表预选站点 */
  const [contentTasksSiteFilter, setContentTasksSiteFilter] = useState<number | undefined>(undefined);
  const [buyProductId, setBuyProductId] = useState<string | null>(null);
  const [accessExpired, setAccessExpired] = useState(false);
  const [creditsRechargeOpen, setCreditsRechargeOpen] = useState(false);
  const [pointsRefreshKey, setPointsRefreshKey] = useState(0);
  const isAuthenticatedRef = useRef(isAuthenticated);
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const applyUserSession = useCallback((user: UserInfo, options?: { sitePortal?: boolean }) => {
    setUserRole(user.role as UserRole);
    setUsername(user.username);
    setUserPoints(user.points ?? null);
    setCurrentPlanTitle(user.current_plan_title ?? null);
    setBrandQuota(user.brand_quota ?? null);
    setMenuIds(user.role_group?.menu_ids ?? null);
    setRoleGroupName(user.role_group?.name ?? null);
    setAccessExpired(!!user.access_expired && !user.access_exempt);
    setIsAuthenticated(true);
    setCurrentPage('backend');
    const useSitePortal =
      options?.sitePortal === true || user.role === UserRole.SITE_ADMIN;
    if (useSitePortal && user.role === UserRole.SITE_ADMIN) {
      setBackendMode('site-portal');
    }
  }, []);
  const openPackageManagement = useCallback((returnTo: ModuleType = ModuleType.LATEST_OPTIMIZATION) => {
    setPackageManagementReturnModule(returnTo);
    setActiveModule(ModuleType.USER_PACKAGE_MANAGEMENT);
  }, []);

  const exitPackageManagement = useCallback(() => {
    setBuyProductId(null);
    const ret = packageManagementReturnModule;
    setPackageManagementReturnModule(ModuleType.LATEST_OPTIMIZATION);
    setActiveModule(ret);
  }, [packageManagementReturnModule]);

  const handleBuyCreditsPaid = useCallback(() => {
    authAPI.getCurrentUser().then((user) => {
      applyUserSession(user);
    }).catch(() => undefined);
    setAccessExpired(false);
  }, [applyUserSession]);

  const handleCreditsRecharged = useCallback(() => {
    authAPI.getCurrentUser().then((user) => {
      applyUserSession(user);
    }).catch(() => undefined);
    setPointsRefreshKey((k) => k + 1);
  }, [applyUserSession]);

  const refreshBrandQuota = useCallback(async () => {
    try {
      const user = await authAPI.getCurrentUser();
      setBrandQuota(user.brand_quota ?? null);
    } catch {
      /* ignore */
    }
  }, []);
  // 包装setCurrentBrand，同时保存到localStorage
  const handleBrandChange = (brand: Brand) => {
    setCurrentBrand(brand);
    localStorage.setItem('selected_brand_id', brand.id);
  };

  /** 进入侧栏「优化工作台」模块；returnTo 为返回目标（从哪进回哪） */
  const openOptimizationWorkbench = useCallback((params: WorkbenchOpenParams, returnTo: ModuleType) => {
    if (shouldBlockNewBrandWorkbench(params, brandQuota)) {
      window.alert(brandQuotaBlockedMessage(brandQuota));
      return;
    }
    setWorkbenchReturnModule(returnTo);
    setWorkbenchOpen(params);
    setActiveModule(ModuleType.OPTIMIZATION_WORKBENCH);
    refreshRecentWorkflows();
  }, [brandQuota, refreshRecentWorkflows]);

  const exitOptimizationCockpit = useCallback(() => {
    const wid = cockpitOpen?.workflowId?.trim();
    setCockpitOpen(null);
    if (wid) {
      const saved = cockpitReturnWorkbench;
      openOptimizationWorkbench(
        {
          workflowId: wid,
          brand: saved?.brand ?? null,
          initialStage: 'intelligent_optimization',
          intake: saved?.intake ?? null,
          skipAutoCockpit: true,
        },
        cockpitReturnModule,
      );
      return;
    }
    setActiveModule(cockpitReturnModule);
  }, [
    cockpitOpen?.workflowId,
    cockpitReturnWorkbench,
    cockpitReturnModule,
    openOptimizationWorkbench,
  ]);

  const openOptimizationCockpit = useCallback(
    async (wfOrId: GeoWorkflowDTO | string, returnTo: ModuleType, initialTab?: CockpitTab) => {
      const workflowId =
        typeof wfOrId === 'string' ? wfOrId.trim() : (wfOrId.workflowId || '').trim();
      if (!workflowId) return;
      try {
        await geoWorkflowAPI.get(workflowId);
        await geoWorkflowAPI.ensureOptimizationTask(workflowId);
        setCockpitReturnWorkbench(
          workbenchOpen?.workflowId
            ? {
                ...workbenchOpen,
                workflowId,
                initialStage: 'intelligent_optimization',
              }
            : {
                workflowId,
                brand: null,
                initialStage: 'intelligent_optimization',
                intake: null,
              },
        );
        setWorkbenchOpen(null);
        setCockpitReturnModule(returnTo);
        setCockpitOpen({ workflowId, initialTab });
        setActiveModule(ModuleType.OPTIMIZATION_COCKPIT);
        refreshRecentWorkflows();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        window.alert(msg || '无法进入优化驾驶舱，请稍后重试');
      }
    },
    [refreshRecentWorkflows, workbenchOpen],
  );

  const routeGeoWorkflowOpen = useCallback(
    (
      brand: WorkbenchOpenParams['brand'],
      workflowId: string,
      returnTo: ModuleType,
    ) => {
      const wid = workflowId.trim();
      if (!wid) return;
      void geoWorkflowAPI
        .get(wid)
        .then((wf) => {
          if (shouldOpenConversationForWorkflow(wf)) {
            setConversationWorkflowId(wf.workflowId);
            setConversationSessionKey((k) => k + 1);
            setActiveModule(ModuleType.LATEST_OPTIMIZATION);
            return;
          }
          if (shouldOpenCockpitForWorkflow(wf)) {
            openOptimizationCockpit(wf, returnTo);
            return;
          }
          openOptimizationWorkbench(
            {
              brand,
              workflowId: wid,
              initialStage: workflowPhaseToWorkbenchStage(wf),
              intake: null,
            },
            returnTo,
          );
        })
        .catch(() => {
          window.alert('加载工作流失败');
        });
    },
    [openOptimizationCockpit, openOptimizationWorkbench],
  );

  const handleNewConversation = useCallback(() => {
    setConversationWorkflowId(null);
    setConversationSessionKey((k) => k + 1);
    setActiveModule(ModuleType.LATEST_OPTIMIZATION);
  }, []);

  const handleWorkflowDeleted = useCallback(
    (workflowId: string) => {
      if (conversationWorkflowId === workflowId) {
        setConversationWorkflowId(null);
        setConversationSessionKey((k) => k + 1);
        setActiveModule(ModuleType.LATEST_OPTIMIZATION);
      }
      if (workbenchOpen?.workflowId === workflowId) {
        setWorkbenchOpen(null);
        setActiveModule(workbenchReturnModule ?? ModuleType.START_OPTIMIZATION);
      }
      if (cockpitOpen?.workflowId === workflowId) {
        setCockpitOpen(null);
        setActiveModule(cockpitReturnModule ?? ModuleType.LATEST_OPTIMIZATION);
      }
    },
    [conversationWorkflowId, workbenchOpen, workbenchReturnModule, cockpitOpen, cockpitReturnModule]
  );

  const handleOpenRecentWorkflow = useCallback(
    (wf: GeoWorkflowDTO) => {
      if (shouldOpenConversationForWorkflow(wf)) {
        setConversationWorkflowId(wf.workflowId);
        setConversationSessionKey((k) => k + 1);
        setActiveModule(ModuleType.LATEST_OPTIMIZATION);
        return;
      }
      if (shouldOpenCockpitForWorkflow(wf)) {
        openOptimizationCockpit(wf, ModuleType.LATEST_OPTIMIZATION);
        return;
      }
      openOptimizationWorkbench(
        {
          workflowId: wf.workflowId,
          brand: null,
          initialStage: workflowPhaseToWorkbenchStage(wf),
          intake: null,
        },
        ModuleType.LATEST_OPTIMIZATION,
      );
    },
    [openOptimizationCockpit, openOptimizationWorkbench],
  );

  const openWorkbenchFromStartOptimization = useCallback(
    (params: WorkbenchOpenParams) => openOptimizationWorkbench(params, ModuleType.START_OPTIMIZATION),
    [openOptimizationWorkbench],
  );

  /** 从 GEO 产出等入口打开「分析明细」：尽量切换到对应品牌再进入模块 */
  const openDataScreenForBrand = useCallback(
    (
      bid: string,
      options?: { geoWizardBack?: boolean; returnTo?: ModuleType; backLabel?: string }
    ) => {
      const id = (bid || '').trim().toLowerCase();
      if (id) {
        const b = allBrands.find((x) => (x.id || '').toLowerCase() === id);
        if (b) {
          setCurrentBrand(b);
          localStorage.setItem('selected_brand_id', b.id);
        }
      }
      if (options?.geoWizardBack) {
        const returnMod = options.returnTo ?? ModuleType.BRAND_PARSE_WIZARD;
        const backLabel =
          options.backLabel ??
          (returnMod === ModuleType.BRAND_PARSE_WIZARD ? '返回快速开始' : '返回优化工作台');
        setDataScreenWizardNav({
          onBack: () => {
            setActiveModule(returnMod);
          },
          backLabel,
        });
      } else {
        setDataScreenWizardNav(null);
      }
      setActiveModule(ModuleType.DATA_SCREEN);
    },
    [allBrands],
  );

  useEffect(() => {
    if (activeModule !== ModuleType.DATA_SCREEN) {
      setDataScreenWizardNav(null);
    }
  }, [activeModule]);

  // ?buy=product_id 深链：登录后自动打开购买抽屉
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const buy = params.get('buy');
    if (buy) {
      setBuyProductId(buy);
      try {
        sessionStorage.setItem('pending_buy_product', buy);
      } catch {
        /* ignore */
      }
      params.delete('buy');
      const qs = params.toString();
      const next = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
      window.history.replaceState(window.history.state, '', next);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || authChecking) return;
    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem('pending_buy_product');
    } catch {
      /* ignore */
    }
    if (!pending) return;
    setBuyProductId(pending);
    openPackageManagement(ModuleType.LATEST_OPTIMIZATION);
    try {
      sessionStorage.removeItem('pending_buy_product');
    } catch {
      /* ignore */
    }
  }, [isAuthenticated, authChecking, openPackageManagement]);

  useEffect(() => {
    const onAccessExpired = () => {
      setAccessExpired(true);
    };
    window.addEventListener('geo-access-expired', onAccessExpired);
    return () => window.removeEventListener('geo-access-expired', onAccessExpired);
  }, []);

  // OAuth 回调：授权成功后跳转带 ?oauth=success，自动切换到自媒体账号
  useEffect(() => {
    if (!isAuthenticated) return;
    const path = (typeof window !== 'undefined' ? window.location.pathname : '').replace(/\/$/, '');
    if (path.endsWith('/oauth/postiz/callback')) {
      void import('./api/postizPublish').then(({ syncPostizAccounts }) =>
        syncPostizAccounts()
          .catch(() => undefined)
          .finally(() => {
            setCurrentPage('backend');
            setBackendMode('brand');
            setActiveModule(ModuleType.SOCIAL_MEDIA_ACCOUNTS);
            window.history.replaceState({ appView: 'backend' }, '', APP_BACKEND_PATH);
          }),
      );
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get('oauth');
    if (oauth === 'success') {
      setCurrentPage('backend');
      setBackendMode('brand');
      setActiveModule(ModuleType.SOCIAL_MEDIA_ACCOUNTS);
      window.history.replaceState({ appView: 'backend' }, '', APP_BACKEND_PATH);
    }
  }, [isAuthenticated]);

  // 恢复认证状态：syncAuthSession 校验并续期 token，直接进入后台
  useEffect(() => {
    const token = getAccessToken();
    console.log('🔍 [Auth] Token存在:', !!token);
    if (token) {
      authAPI.syncAuthSession().then((result) => {
        if (!result) {
          clearAuthSession();
          setIsAuthenticated(false);
          return;
        }
        // 公开分享/凭证页：仅续期 token，不进入后台态、不改 URL（与 /data-screen 一致）
        if (isPublicSharePath(window.location.pathname)) {
          return;
        }
        applyUserSession(result.user);
        const path = normalizeAppPath(window.location.pathname);
        if (result.user.role === UserRole.SITE_ADMIN) {
          setBackendMode('site-portal');
          if (!isSiteAdminPath(path)) {
            window.history.replaceState({ appView: 'site-portal' }, '', SITE_ADMIN_HOME_PATH);
          }
        } else if (isSiteAdminPath(path)) {
          window.history.replaceState({ appView: 'backend' }, '', APP_BACKEND_PATH);
          setBackendMode('brand');
        } else if (path === '/login' || path === '/' || path === '/app') {
          window.history.replaceState({ appView: 'backend' }, '', APP_BACKEND_PATH);
        }
      }).catch((error) => {
        console.error('❌ [Auth] 会话同步失败:', error);
        clearAuthSession();
        setIsAuthenticated(false);
      }).finally(() => {
        setAuthChecking(false);
      });
    } else {
      const path = normalizeAppPath(window.location.pathname);
      if (isSiteAdminPath(path)) {
        setCurrentPage('login');
        setPublicPage(null);
        sealSiteAdminLoginUrl();
      } else if (isBackendPath(path) || !isPublicSharePath(window.location.pathname)) {
        setCurrentPage('login');
        setPublicPage(null);
        sealLoginUrl();
      }
      setAuthChecking(false);
    }
  }, [applyUserSession]);

  // 登录后锁定浏览器历史，禁止后退到登录页/首页（公开分享/凭证页除外）
  useEffect(() => {
    if (!isAuthenticated || authChecking) return;
    if (isPublicSharePath(window.location.pathname)) return;
    if (backendMode === 'site-portal') {
      sealSiteAdminAuthHistory();
    } else {
      sealAuthHistory();
    }
  }, [isAuthenticated, authChecking, backendMode]);

  // 站点管理员已登录时不在 /site-admin/login 停留
  useEffect(() => {
    if (!isAuthenticated || authChecking) return;
    if (userRole === UserRole.SITE_ADMIN && isSiteAdminLoginPath(window.location.pathname)) {
      window.history.replaceState({ appView: 'site-portal' }, '', SITE_ADMIN_HOME_PATH);
    }
  }, [isAuthenticated, authChecking, userRole]);

  // 浏览器后退/前进：同步 URL 与页面状态
  useEffect(() => {
    const handlePopState = () => {
      if (isAuthenticatedRef.current) {
        if (isPublicSharePath(window.location.pathname)) return;
        if (backendMode === 'site-portal') {
          window.history.pushState({ appView: 'site-portal', sealed: true }, '', SITE_ADMIN_HOME_PATH);
          setCurrentPage('backend');
          return;
        }
        // 已登录：拦截后退/前进，始终留在工作台
        window.history.pushState({ appView: 'backend', sealed: true }, '', APP_BACKEND_PATH);
        setCurrentPage('backend');
        return;
      }

      const path = normalizeAppPath(window.location.pathname);
      if (isSiteAdminPath(path)) {
        setCurrentPage('login');
        setPublicPage(null);
        sealSiteAdminLoginUrl();
        return;
      }

      setCurrentPage('login');
      setPublicPage(null);
      sealLoginUrl();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [backendMode]);

  // 严禁全域看板：任何情况下进入 DASHBOARD 都强制跳转到最新优化（侧栏置顶首项）
  useEffect(() => {
    if (activeModule === ModuleType.DASHBOARD) {
      setActiveModule(ModuleType.LATEST_OPTIMIZATION);
    }
  }, [activeModule]);

  // 进入品牌后台时，默认打开用户可见的第一个功能（跳过全域看板，进入第一个实际功能）
  useEffect(() => {
    if (currentPage !== 'backend' || backendMode !== 'brand' || !isAuthenticated) return;
    const allowedIds = getEffectiveMenuIds(menuIds, userRole);
    const visibleItems = SIDEBAR_MENU_ITEMS.filter(
      item => allowedIds.includes(item.id) && !HIDDEN_FROM_SIDEBAR.includes(item.id)
    );
    const target = visibleItems.find(item => item.id !== ModuleType.DASHBOARD)?.id ?? visibleItems[0]?.id;
    if (!target) return;
    const isCurrentVisible = visibleItems.some(item => item.id === activeModule);
    const isHiddenModule = HIDDEN_FROM_SIDEBAR.includes(activeModule);
    const shouldSwitch = (!isCurrentVisible && !isHiddenModule) || activeModule === ModuleType.DASHBOARD;
    if (shouldSwitch) {
      setActiveModule(target);
    }
  }, [isAuthenticated, currentPage, backendMode, menuIds, userRole, activeModule, currentBrand]);

  // 加载品牌列表
  useEffect(() => {
    const loadBrands = async () => {
      if (!isAuthenticated) {
        setBrandsLoading(false);
        return;
      }

      try {
        setBrandsLoading(true);
        const apiBrands = await brandsAPI.listBrands({ is_active: true });
        
        // 转换 API 数据格式为前端使用的格式
        const formattedBrands: Brand[] = apiBrands.map((b) => apiBrandRecordToAppBrand(b));
        
        setAllBrands(formattedBrands);

        // 无品牌时：引导用户去个人中心品牌管理（由下面的 useEffect 处理）
        if (formattedBrands.length === 0) {
          setCurrentBrand(null);
          setBrandsLoading(false);
          return;
        }

        // 优先恢复用户之前选择的品牌（兼容误存数字主键）
        const savedBrandId = localStorage.getItem('selected_brand_id');
        if (savedBrandId && formattedBrands.length > 0) {
          const savedBrand = resolveAppBrandFromSavedId(savedBrandId, apiBrands);
          if (savedBrand) {
            setCurrentBrand(savedBrand);
            if (savedBrand.id !== savedBrandId) {
              localStorage.setItem('selected_brand_id', savedBrand.id);
            }
          } else {
            // 保存的品牌ID不存在，使用默认品牌
            const philipsBrand = formattedBrands.find(b => b.id === 'philips');
            const defaultBrand = philipsBrand || formattedBrands[0];
            setCurrentBrand(defaultBrand);
            localStorage.setItem('selected_brand_id', defaultBrand.id);
          }
        } else if (formattedBrands.length > 0) {
          // 如果没有保存的品牌，默认选择飞利浦或第一个
          const philipsBrand = formattedBrands.find(b => b.id === 'philips');
          const defaultBrand = philipsBrand || formattedBrands[0];
          setCurrentBrand(defaultBrand);
          localStorage.setItem('selected_brand_id', defaultBrand.id);
        }
      } catch (error) {
        console.error('加载品牌列表失败:', error);
        // 失败时不使用mock数据，设置为空数组
        setAllBrands([]);
        setCurrentBrand(null);
      } finally {
        setBrandsLoading(false);
      }
    };
    
    loadBrands();
  }, [isAuthenticated]);

  useEffect(() => {
    document.body.style.backgroundColor = '#F5F5F7';
  }, []);

  const handleLogin = (user: string) => {
    console.log('🔐 [Login] 登录成功, 用户:', user);
    setUsername(user);
    localStorage.setItem('auth_username', user);
    authAPI.getCurrentUser().then((userInfo: UserInfo) => {
      applyUserSession(userInfo);
      if (userInfo.role === UserRole.SITE_ADMIN) {
        setBackendMode('site-portal');
        window.history.replaceState({ appView: 'site-portal' }, '', SITE_ADMIN_HOME_PATH);
        sealSiteAdminAuthHistory();
        return;
      }
      setBackendMode('brand');
      setActiveModule(ModuleType.LATEST_OPTIMIZATION);
      sealAuthHistory();
    }).catch((error) => {
      console.error('❌ [Login] 获取角色失败:', error);
      setIsAuthenticated(true);
      setCurrentPage('backend');
      setBackendMode('brand');
      setActiveModule(ModuleType.LATEST_OPTIMIZATION);
      sealAuthHistory();
    });
    setIsAuthenticated(true);
    setCurrentPage('backend');
    setActiveModule(ModuleType.LATEST_OPTIMIZATION);
  };

  const handleSiteAdminLogin = (user: string) => {
    setUsername(user);
    localStorage.setItem('auth_username', user);
    authAPI.getCurrentUser().then((userInfo: UserInfo) => {
      applyUserSession(userInfo, { sitePortal: true });
      window.history.replaceState({ appView: 'site-portal' }, '', SITE_ADMIN_HOME_PATH);
      sealSiteAdminAuthHistory();
    }).catch((error) => {
      console.error('❌ [SiteAdminLogin] 获取用户信息失败:', error);
    });
    setIsAuthenticated(true);
    setCurrentPage('backend');
    setBackendMode('site-portal');
  };

  const handleNavigateToLogin = () => {
    setCurrentPage('login');
    setPublicPage(null);
    sealLoginUrl();
  };

  const handlePublicLegalNavigate = (page: 'home' | 'pricing' | 'blog' | 'privacy' | 'terms') => {
    if (page === 'privacy') setPublicPage('privacy');
    else if (page === 'terms') setPublicPage('terms');
    else handleNavigateToLogin();
  };

  const handleNavigateToPersonalBackend = (initialModule?: ModuleType) => {
    setInitialPersonalBackendModule(initialModule || null);
    setBackendMode('personal');
    setCurrentPage('backend');
  };

  const handleNavigateToBrandBackend = () => {
    setBackendMode('brand');
    setCurrentPage('backend');
  };

  const handleLogout = () => {
    const wasSitePortal = backendMode === 'site-portal';
    authAPI.logout();
    setIsAuthenticated(false);
    setUsername('');
    setUserRole(null);
    setUserPoints(null);
    setCurrentPlanTitle(null);
    setMenuIds(null);
    setRoleGroupName(null);
    setBuyProductId(null);
    setAccessExpired(false);
    setCurrentPage('login');
    setPublicPage(null);
    setBackendMode('brand');
    if (wasSitePortal) {
      window.history.replaceState({ appView: 'site-admin-login' }, '', SITE_ADMIN_LOGIN_PATH);
    } else {
      window.history.replaceState({ appView: 'login' }, '', '/login');
    }
  };

  const startWorkflow = (productId?: string | null) => {
      setWorkflowProduct(productId || null);
      setListSelectedProduct(productId || null); // 保存选中的产品，用于回退时恢复
      setIsWorkflowMode(true);
  };
  
  const endWorkflow = (product?: string | null) => {
      setIsWorkflowMode(false);
      setWorkflowProduct(null);
      // 如果传递了产品，更新列表页的选中产品
      if (product !== undefined) {
          setListSelectedProduct(product);
      }
  };

  const handleOptimizationBotInitialConsumed = () => {
    setOptimizationBotCreateDraft(null);
    setOptimizationBotDetailTaskId(null);
    setOptimizationBotOpenCreate(false);
  };

  const handleWizardInitialFocusConsumed = useCallback(() => {
    setWizardInitialWorkflowId(null);
    setWizardInitialArtifactStep(null);
  }, []);

  const consumeGeoGenerateFilter = useCallback(() => {
    setGeoArtifactGenerateFilterTaskId(null);
  }, []);

  const consumeGeoGenerateContentTask = useCallback(() => {
    setGeoArtifactInitialContentTaskId(null);
  }, []);

  const exitGenerateArticleDetailToWorkbench = useCallback(() => {
    setGeoGenerateFromWorkbenchArticle(false);
    setGeoGenerateFromWorkbench(false);
    setGeoArtifactGenerateFilterTaskId(null);
    setActiveModule(ModuleType.OPTIMIZATION_WORKBENCH);
  }, []);

  const exitGenerateListToWorkbench = useCallback(() => {
    setGeoGenerateFromWorkbench(false);
    setGeoGenerateFromWorkbenchArticle(false);
    setActiveModule(ModuleType.OPTIMIZATION_WORKBENCH);
  }, []);

  const exitSourceHubToWorkbench = useCallback(() => {
    setSourceHubFromWorkbench(false);
    setActiveModule(ModuleType.OPTIMIZATION_WORKBENCH);
  }, []);

  const exitToolsHubToWorkbench = useCallback(() => {
    setToolsHubFromWorkbench(false);
    setToolsHubWorkflowId(null);
    setToolsHubPinnedKnowledgeBaseId(null);
    setToolsHubPinnedSemanticSeoTaskId(null);
    setKnowledgeBasePresetId(null);
    setSemanticSEOTaskId(null);
    setActiveModule(ModuleType.OPTIMIZATION_WORKBENCH);
  }, []);

  const refreshToolsHubWorkflowBindings = useCallback(async () => {
    const wid = toolsHubWorkflowId?.trim();
    if (!wid) return;
    try {
      const wf = await geoWorkflowAPI.get(wid);
      setToolsHubPinnedKnowledgeBaseId(wf.knowledgeBaseId ?? null);
      const tid = (wf.semanticSeoTaskId ?? '').trim();
      setToolsHubPinnedSemanticSeoTaskId(tid || null);
    } catch {
      /* ignore */
    }
  }, [toolsHubWorkflowId]);

  const markSourceHubFromWorkbench = useCallback((m: ModuleType) => {
    setSourceHubFromWorkbench(true);
    if (m === ModuleType.SOCIAL_MEDIA_ACCOUNTS) {
      try {
        sessionStorage.setItem(SOCIAL_ACCOUNTS_FROM_OPTIMIZATION_WORKBENCH_KEY, '1');
      } catch {
        /* ignore */
      }
    }
  }, []);

  const consumeGeoPublishFilter = useCallback(() => {
    setGeoArtifactPublishFilterTaskId(null);
  }, []);

  useEffect(() => {
    if (activeModule !== ModuleType.GENERATE) {
      setGeoGenerateFromWorkbenchArticle(false);
      if (activeModule !== ModuleType.OPTIMIZATION_WORKBENCH) {
        setGeoGenerateFromWorkbench(false);
        setGeoArtifactGenerateFilterTaskId(null);
      }
    }
    const sourceHubModules = [
      ModuleType.SOCIAL_MEDIA_ACCOUNTS,
      ModuleType.PUBLISH_RECORDS,
      ModuleType.THIRD_PARTY_PUBLISH,
    ] as const;
    if (!sourceHubModules.includes(activeModule as (typeof sourceHubModules)[number])) {
      if (activeModule !== ModuleType.OPTIMIZATION_WORKBENCH) {
        setSourceHubFromWorkbench(false);
      }
    }
    const toolsHubModules = [ModuleType.KNOWLEDGE_BASE, ModuleType.SEMANTIC_SEO] as const;
    if (!toolsHubModules.includes(activeModule as (typeof toolsHubModules)[number])) {
      if (activeModule !== ModuleType.OPTIMIZATION_WORKBENCH) {
        setToolsHubFromWorkbench(false);
      }
    }
  }, [activeModule]);

  useEffect(() => {
    const toolsHubModules = [ModuleType.KNOWLEDGE_BASE, ModuleType.SEMANTIC_SEO] as const;
    if (!toolsHubModules.includes(activeModule as (typeof toolsHubModules)[number])) {
      setKnowledgeBasePresetId(null);
      setToolsHubWorkflowId(null);
      setToolsHubPinnedKnowledgeBaseId(null);
      setToolsHubPinnedSemanticSeoTaskId(null);
    }
  }, [activeModule]);

  const renderRemovedModule = (title: string) => (
    <div className={`flex-1 p-8 ${theme === 'dark' ? 'text-zinc-300' : 'text-slate-600'}`}>
      <h2 className="text-xl font-medium mb-2">{title}</h2>
      <p>该功能在开源版已移除，请使用侧栏「开始优化」工作流。</p>
    </div>
  );

  const renderModule = () => {
    switch (activeModule) {
      case ModuleType.DASHBOARD:
        return (
          <DataScreen
            theme={theme}
            currentBrand={currentBrand}
            taskId={reportTaskId || undefined}
            canShowVisibilityChart={roleGroupName?.toLowerCase() === 'show'}
            geoWizardNav={dataScreenWizardNav}
            onOpenBrandParseWizard={() => {
              setActiveModule(ModuleType.BRAND_PARSE_WIZARD);
            }}
          />
        );
      case ModuleType.DATA_SCREEN:
        return (
          <DataScreen
            theme={theme}
            currentBrand={currentBrand}
            taskId={reportTaskId || undefined}
            canShowVisibilityChart={roleGroupName?.toLowerCase() === 'show'}
            geoWizardNav={dataScreenWizardNav}
            onOpenBrandParseWizard={() => {
              setActiveModule(ModuleType.BRAND_PARSE_WIZARD);
            }}
          />
        );
      case ModuleType.BRAND_PARSE_WIZARD:
        return (
          <BrandParseWizard
            theme={theme}
            currentBrand={currentBrand}
            initialWorkflowId={wizardInitialWorkflowId}
            initialArtifactStep={wizardInitialArtifactStep}
            onInitialFocusConsumed={handleWizardInitialFocusConsumed}
            onOpenDataScreenAll={openDataScreenForBrand}
            onOpenGenerateListForOptimizationTask={(tid) => {
              setGeoArtifactGenerateFilterTaskId(tid);
              setActiveModule(ModuleType.GENERATE);
            }}
            onOpenPublishRecordsForOptimizationTask={(tid) => {
              setGeoArtifactPublishFilterTaskId(tid);
              setActiveModule(ModuleType.PUBLISH_RECORDS);
            }}
            onOpenOptimizationWorkbench={(p) =>
              openOptimizationWorkbench(p, ModuleType.BRAND_PARSE_WIZARD)
            }
          />
        );
      case ModuleType.START_OPTIMIZATION:
        return (
          <StartOptimization
            onEnterWorkbench={openWorkbenchFromStartOptimization}
            canCreateBrand={brandQuota?.can_create !== false}
            brandQuota={brandQuota}
            onBrandQuotaRefresh={refreshBrandQuota}
            userRole={userRole}
            onOpenWorkflow={(brand, workflowId) =>
              routeGeoWorkflowOpen(brand, workflowId, ModuleType.START_OPTIMIZATION)
            }
            onOpenDiagnosisReport={(reportTaskId) => {
              setReportTaskId(reportTaskId);
              setDiagnosisReportReturnModule(ModuleType.START_OPTIMIZATION);
              setActiveModule(ModuleType.DIAGNOSIS_REPORT);
            }}
          />
        );
      case ModuleType.OPTIMIZATION_WORKBENCH: {
        const wb = workbenchOpen ?? DEFAULT_WORKBENCH_OPEN;
        return (
          <OptimizationWorkbench
            key={`${wb.workflowId ?? 'new'}-${wb.brand?.id ?? 'nb'}-${wb.initialStage}-${wb.skipAutoCockpit ? 'hub' : 'auto'}`}
            initialBrand={wb.brand}
            initialWorkflowId={wb.workflowId}
            initialStage={wb.initialStage}
            initialIntake={wb.intake}
            skipAutoCockpit={wb.skipAutoCockpit === true}
            userRole={userRole}
            onBrandQuotaRefresh={refreshBrandQuota}
            onExit={() => {
              setWorkbenchOpen(null);
              setActiveModule(workbenchReturnModule);
              void refreshBrandQuota();
            }}
            onEnterCockpit={(wid) => openOptimizationCockpit(wid, workbenchReturnModule)}
            onJumpModule={(m, opts) => {
              if (
                m === ModuleType.QCLAW_INSTALL_GUIDE ||
                m === ModuleType.AUTOMATION_LOBSTER_INSTALL_GUIDE ||
                m === ModuleType.MASS_PUBLISH_ASSISTANT_GUIDE ||
                m === ModuleType.INTELLIGENT_OPTIMIZATION_DEPLOY_GUIDE
              ) {
                setDeployGuideReturnModule(ModuleType.OPTIMIZATION_WORKBENCH);
                setActiveModule(ModuleType.INTELLIGENT_OPTIMIZATION_DEPLOY_GUIDE);
                return;
              }
              if (m === ModuleType.KNOWLEDGE_BASE) {
                const wid = (opts?.workflowId ?? workbenchOpen?.workflowId ?? '').trim();
                if (wid) setToolsHubWorkflowId(wid);
                setToolsHubPinnedKnowledgeBaseId(opts?.knowledgeBaseId ?? null);
                setKnowledgeBasePresetId(opts?.knowledgeBaseId ?? null);
                setToolsHubFromWorkbench(true);
                setActiveModule(ModuleType.KNOWLEDGE_BASE);
                return;
              }
              if (m === ModuleType.SEMANTIC_SEO) {
                const wid = (opts?.workflowId ?? workbenchOpen?.workflowId ?? '').trim();
                if (wid) setToolsHubWorkflowId(wid);
                const tid = opts?.taskId?.trim() ? opts.taskId.trim() : null;
                setToolsHubPinnedSemanticSeoTaskId(tid);
                setSemanticSEOTaskId(tid);
                setToolsHubFromWorkbench(true);
                setActiveModule(ModuleType.SEMANTIC_SEO);
                return;
              }
              if (m === ModuleType.OPTIMIZATION_BOT && opts?.taskId) {
                setOptimizationBotDetailTaskId(opts.taskId);
              }
              if (m === ModuleType.DIAGNOSIS_REPORT && opts?.reportTaskId) {
                setReportTaskId(opts.reportTaskId);
                setDiagnosisReportReturnModule(ModuleType.OPTIMIZATION_WORKBENCH);
                setActiveModule(ModuleType.DIAGNOSIS_REPORT);
                return;
              }
              if (m === ModuleType.DIAGNOSIS_REPORT && opts?.workflowId) {
                setWizardInitialWorkflowId(opts.workflowId);
              }
              if (m === ModuleType.DATA_SCREEN && opts?.taskId?.trim()) {
                const tid = opts.taskId!.trim();
                setReportTaskId(tid);
                if (opts?.geoWizardBack === true) {
                  const returnMod = opts?.returnTo ?? ModuleType.BRAND_PARSE_WIZARD;
                  const backLabel =
                    opts?.backLabel ??
                    (returnMod === ModuleType.BRAND_PARSE_WIZARD
                      ? optT('navigation.backToQuickStart')
                      : optT('navigation.backToWorkbench'));
                  setDataScreenWizardNav({
                    onBack: () => {
                      setActiveModule(returnMod);
                    },
                    backLabel,
                  });
                } else {
                  setDataScreenWizardNav(null);
                }
                setActiveModule(ModuleType.DATA_SCREEN);
                return;
              }
              if (m === ModuleType.DATA_SCREEN && opts?.brandName) {
                openDataScreenForBrand(opts.brandName, {
                  geoWizardBack: opts?.geoWizardBack === true,
                  returnTo: opts?.returnTo ?? ModuleType.OPTIMIZATION_WORKBENCH,
                  backLabel: opts?.backLabel,
                });
                return;
              }
              if (m === ModuleType.GENERATE) {
                if (opts?.taskId) {
                  setGeoArtifactGenerateFilterTaskId(opts.taskId);
                  setGeoGenerateFromWorkbench(true);
                }
                if (opts?.contentGenerationTaskId?.trim()) {
                  setGeoArtifactInitialContentTaskId(opts.contentGenerationTaskId.trim());
                  setGeoGenerateFromWorkbenchArticle(true);
                } else {
                  setGeoGenerateFromWorkbenchArticle(false);
                }
              }
              if (m === ModuleType.PUBLISH_RECORDS && opts?.taskId) {
                setGeoArtifactPublishFilterTaskId(opts.taskId);
              }
              if (
                m === ModuleType.SOCIAL_MEDIA_ACCOUNTS ||
                m === ModuleType.PUBLISH_RECORDS ||
                m === ModuleType.THIRD_PARTY_PUBLISH
              ) {
                markSourceHubFromWorkbench(m);
              }
              setActiveModule(m);
            }}
          />
        );
      }
      case ModuleType.OPTIMIZATION_COCKPIT: {
        const cid = cockpitOpen?.workflowId;
        if (!cid) {
          exitOptimizationCockpit();
          return null;
        }
        return (
          <OptimizationCockpit
            key={cid}
            workflowId={cid}
            initialTab={cockpitOpen?.initialTab}
            theme={theme}
            currentBrand={currentBrand}
            userRole={userRole}
            onBrandResolved={handleBrandChange}
            onExit={exitOptimizationCockpit}
            onOpenDeployGuide={() => {
              setDeployGuideReturnModule(ModuleType.OPTIMIZATION_COCKPIT);
              setActiveModule(ModuleType.INTELLIGENT_OPTIMIZATION_DEPLOY_GUIDE);
            }}
          />
        );
      }
      case ModuleType.LATEST_OPTIMIZATION:
        return (
          <LatestOptimization
            workflowId={conversationWorkflowId}
            conversationSessionKey={conversationSessionKey}
            onJumpToWorkbench={(params) => {
              refreshRecentWorkflows();
              if (params.workflowId?.trim()) {
                routeGeoWorkflowOpen(params.brand, params.workflowId, ModuleType.LATEST_OPTIMIZATION);
                return;
              }
              openOptimizationWorkbench(params, ModuleType.LATEST_OPTIMIZATION);
            }}
            onWorkflowIdAssigned={(id) => {
              setConversationWorkflowId(id);
              refreshRecentWorkflows();
            }}
            onWorkflowUpdated={refreshRecentWorkflows}
            onDirectStartOptimization={() => {
              if (shouldBlockNewBrandWorkbench(DEFAULT_WORKBENCH_OPEN, brandQuota)) {
                window.alert(brandQuotaBlockedMessage(brandQuota));
                return;
              }
              openOptimizationWorkbench(DEFAULT_WORKBENCH_OPEN, ModuleType.LATEST_OPTIMIZATION);
            }}
            brandQuota={brandQuota}
          />
        );
      case ModuleType.TOOLS_HUB:
        return (
          <MenuGridHub
            groupId="content"
            userRole={userRole}
            menuIds={menuIds}
            onSelect={(id) => setActiveModule(id)}
          />
        );
      case ModuleType.MERCHANT_HUB:
        return (
          <MenuGridHub
            groupId="website"
            userRole={userRole}
            menuIds={menuIds}
            onSelect={(id) => setActiveModule(id)}
          />
        );
      case ModuleType.WEB_MAIN_HUB:
      case ModuleType.SITE_HUB:
        return (
          <MenuGridHub
            groupId="site_hub"
            userRole={userRole}
            menuIds={menuIds}
            onSelect={(id) => setActiveModule(id)}
          />
        );
      case ModuleType.SITE_LIST:
        return (
          <SiteList
            theme={theme}
            userRole={userRole}
            onOpenWorkbench={(siteId) => {
              setSiteWorkbenchId(siteId);
              setActiveModule(ModuleType.SITE_WORKBENCH);
            }}
            onOpenContentTasks={(siteId) => {
              setContentTasksSiteFilter(siteId);
              setActiveModule(ModuleType.CONTENT_TASKS);
            }}
          />
        );
      case ModuleType.SITE_WORKBENCH:
        return siteWorkbenchId != null ? (
          <SiteWorkbench
            theme={theme}
            siteId={siteWorkbenchId}
            currentBrand={currentBrand}
            onBack={() => setActiveModule(ModuleType.SITE_LIST)}
            onOpenContentTasks={(siteId) => {
              setContentTasksSiteFilter(siteId);
              setActiveModule(ModuleType.CONTENT_TASKS);
            }}
          />
        ) : (
          <SiteList
            theme={theme}
            userRole={userRole}
            onOpenWorkbench={(siteId) => {
              setSiteWorkbenchId(siteId);
              setActiveModule(ModuleType.SITE_WORKBENCH);
            }}
            onOpenContentTasks={(siteId) => {
              setContentTasksSiteFilter(siteId);
              setActiveModule(ModuleType.CONTENT_TASKS);
            }}
          />
        );
      case ModuleType.CONTENT_TASKS:
      case ModuleType.WEB_MAIN_CONTENT_TASKS:
        return (
          <WebMainContentTasks
            theme={theme}
            initialSiteIdFilter={contentTasksSiteFilter}
            onOpenArticles={(siteId) => {
              if (siteId != null) setSiteWorkbenchId(siteId);
              setActiveModule(ModuleType.SITE_WORKBENCH);
            }}
          />
        );
      case ModuleType.SOURCE_HUB:
        return (
          <SourceHubPage
            userRole={userRole}
            menuIds={menuIds}
            onSelect={(id) => {
              if (id === ModuleType.INTELLIGENT_OPTIMIZATION_DEPLOY_GUIDE) {
                setDeployGuideReturnModule(ModuleType.SOURCE_HUB);
              }
              setActiveModule(id);
            }}
          />
        );
      case ModuleType.DIAGNOSIS_REPORT:
        return (
          <Suspense fallback={<PageFallback />}>
            <GeoReportFullPage
              theme={theme}
              taskId={reportTaskId || undefined}
              onBack={() => {
                const backTo = diagnosisReportReturnModule;
                setReportTaskId(null);
                setDiagnosisReportReturnModule(ModuleType.BRAND_PARSE_WIZARD);
                setActiveModule(backTo);
              }}
              backButtonLabel={
                diagnosisReportReturnModule === ModuleType.OPTIMIZATION_WORKBENCH
                  ? optT('navigation.backToWorkbench')
                  : diagnosisReportReturnModule === ModuleType.START_OPTIMIZATION
                    ? optT('navigation.backToManagement')
                    : optT('navigation.backToQuickStart')
              }
            />
          </Suspense>
        );
      case ModuleType.SOCIAL_MEDIA_ACCOUNTS:
        return (
          <SocialMediaAccounts
            ref={socialMediaAccountsHubBackRef}
            theme={theme}
            currentBrand={currentBrand}
            onReturnToOptimizationWorkbench={exitSourceHubToWorkbench}
          />
        );
      case ModuleType.PUBLISH_RECORDS:
        return (
          <PublishRecords
            theme={theme}
            currentBrand={currentBrand}
            initialOptimizationTaskIdFilter={geoArtifactPublishFilterTaskId}
            onInitialOptimizationTaskFilterConsumed={consumeGeoPublishFilter}
          />
        );
      case ModuleType.AIEO_WEBSITE:
        return (
          <TemplateSiteAIEOEntry
            theme={theme}
            onOpenSiteWorkbench={(id) => {
              setSiteWorkbenchId(id);
              setActiveModule(ModuleType.SITE_WORKBENCH);
            }}
          />
        );
      case ModuleType.WEB_MAIN_SETTINGS:
        return siteWorkbenchId != null ? (
          <SiteWorkbench theme={theme} siteId={siteWorkbenchId} currentBrand={currentBrand} onBack={() => setActiveModule(ModuleType.SITE_LIST)} onOpenContentTasks={(id) => { setContentTasksSiteFilter(id); setActiveModule(ModuleType.CONTENT_TASKS); }} />
        ) : (
          <WebMainSettings theme={theme} />
        );
      case ModuleType.WEB_MAIN_CATEGORY:
        return <CategoryManagement theme={theme} siteScope="web_main" />;
      case ModuleType.WEB_MAIN_COLUMN:
        return <ColumnManagement theme={theme} siteScope="web_main" />;
      case ModuleType.WEB_MAIN_ARTICLES:
        return siteWorkbenchId != null ? (
          <SiteWorkbench theme={theme} siteId={siteWorkbenchId} initialTab="articles" currentBrand={currentBrand} onBack={() => setActiveModule(ModuleType.SITE_LIST)} onOpenContentTasks={(id) => { setContentTasksSiteFilter(id); setActiveModule(ModuleType.CONTENT_TASKS); }} />
        ) : (
          <BlogManagement theme={theme} siteScope="web_main" />
        );
      case ModuleType.WEB_MAIN_FAQ:
        return <FAQConfig theme={theme} siteScope="web_main" />;
      case ModuleType.MERCHANT_PROFILE:
        return <MerchantProfile theme={theme} />;
      case ModuleType.FAQ_CONFIG:
        return <FAQConfig theme={theme} />;
      case ModuleType.BUSINESS_INTRO:
        return (
          <TemplateSiteBusinessEntry
            theme={theme}
            onOpenSiteWorkbench={(id) => {
              setSiteWorkbenchId(id);
              setActiveModule(ModuleType.SITE_WORKBENCH);
            }}
          />
        );
      case ModuleType.THIRD_PARTY_PUBLISH:
        if (SHOW_CONTENT_AND_MEDIA_PUBLISH) {
          return <ThirdPartyPublish theme={theme} portal="merchantSaas" market="domestic" />;
        }
        return renderRemovedModule('B 模式：发稿由云端运营处理，请在工作台查看交付链接');
      case ModuleType.OVERSEAS_THIRD_PARTY_PUBLISH:
        if (SHOW_CONTENT_AND_MEDIA_PUBLISH) {
          return <ThirdPartyPublish theme={theme} portal="merchantSaas" market="overseas" />;
        }
        return renderRemovedModule('B 模式：发稿由云端运营处理，请在工作台查看交付链接');
      case ModuleType.MIND_SIMULATION:
      case ModuleType.AGENT_WORKFLOW:
      case ModuleType.CRAWL_TASKS:
      case ModuleType.MONITORING_LOGS:
      case ModuleType.BENCHMARK_ALERT_RUN:
      case ModuleType.BENCHMARK_ALERT_SCHEDULE:
      case ModuleType.BENCHMARK_ALERT_RESULTS:
      case ModuleType.BRAND_MENTIONS:
      case ModuleType.SOURCE_ANALYSIS:
      case ModuleType.WEAKNESS_ANALYSIS:
        return renderRemovedModule('功能已下线');
      case ModuleType.PRODUCT_NAV:
        return <ProductNav theme={theme} currentBrand={currentBrand} initialTab="extract" onBack={endWorkflow} />;
      case ModuleType.WORD_EXPAND:
        return <SentenceExpandPage theme={theme} onBack={() => setActiveModule(ModuleType.EXTRACT)} />;
      case ModuleType.SEMANTIC_PACK_EXPAND:
        if (selectedSemanticExpandTaskId) {
          return (
            <SemanticPackExpandPage
              theme={theme}
              taskId={selectedSemanticExpandTaskId}
              onBack={() => {
                setSelectedSemanticExpandTaskId(null);
                setActiveModule(ModuleType.EXTRACT);
              }}
            />
          );
        }
        return null;
      case ModuleType.MANUAL_INPUT:
        return <ManualKeywordInput theme={theme} onBack={() => setActiveModule(ModuleType.EXTRACT)} />;
      case ModuleType.EXTRACT:
        if (selectedExtractTaskId) {
          // 如果有选中的任务ID，显示提炼结果页
          return <ProductNav theme={theme} currentBrand={currentBrand} initialTab="extract" onBack={() => setSelectedExtractTaskId(null)} initialProduct={workflowProduct} selectedTaskId={selectedExtractTaskId} />;
        }
        return isWorkflowMode 
            ? <ProductNav theme={theme} currentBrand={currentBrand} initialTab="extract" onBack={endWorkflow} initialProduct={workflowProduct} />
            : <ExtractList theme={theme} currentBrand={currentBrand} allBrands={allBrands} onBrandChange={handleBrandChange} onNavigateToBrandManagement={() => setActiveModule(ModuleType.BRAND_MANAGEMENT)} onNewTask={startWorkflow} onNavigate={(module, taskId) => {
                if (module === ModuleType.SEMANTIC_PACK_EXPAND && taskId) {
                  setSelectedSemanticExpandTaskId(taskId);
                  setActiveModule(module);
                } else if (taskId) {
                  setSelectedExtractTaskId(taskId);
                  setActiveModule(module);
                } else {
                  setActiveModule(module);
                }
              }} />;
      case ModuleType.ANALYZE:
        if (diagnosisReportTaskIdFromAnalyze) {
          // 从现状分析点诊断报告进入：保持 ANALYZE 选中，不切到诊断报告菜单
          return (
            <Suspense fallback={<PageFallback />}>
              <GeoReportFullPage
                theme={theme}
                taskId={diagnosisReportTaskIdFromAnalyze}
                onBack={() => setDiagnosisReportTaskIdFromAnalyze(null)}
                backButtonLabel={optT('navigation.back')}
              />
            </Suspense>
          );
        }
        if (selectedAnalyzeTaskId) {
          // 如果有选中的任务ID，显示分析结果页
          return <ProductNav theme={theme} currentBrand={currentBrand} initialTab="analyze" onBack={() => setSelectedAnalyzeTaskId(null)} initialProduct={workflowProduct} selectedTaskId={selectedAnalyzeTaskId} />;
        }
        return (
          <div className={`flex-1 p-8 ${theme === 'dark' ? 'text-zinc-300' : 'text-slate-600'}`}>
            <h2 className="text-xl font-medium mb-2">旧版「现状分析」任务已下线</h2>
            <p>请使用侧栏「开始优化」工作流中的现状分析环节。</p>
          </div>
        );
      case ModuleType.GENERATE:
        return isWorkflowMode 
            ? <ProductNav theme={theme} currentBrand={currentBrand} initialTab="generate" onBack={endWorkflow} initialProduct={workflowProduct} />
            : (
              <GenerateList
                theme={theme}
                onNewTask={startWorkflow}
                initialOptimizationTaskIdFilter={
                  geoGenerateFromWorkbench ? null : geoArtifactGenerateFilterTaskId
                }
                onInitialOptimizationTaskFilterConsumed={consumeGeoGenerateFilter}
                lockedOptimizationTaskId={
                  geoGenerateFromWorkbench ? geoArtifactGenerateFilterTaskId : null
                }
                initialContentTaskId={geoArtifactInitialContentTaskId}
                onInitialContentTaskConsumed={consumeGeoGenerateContentTask}
                onExitArticleDetailToWorkbench={
                  geoGenerateFromWorkbenchArticle ? exitGenerateArticleDetailToWorkbench : undefined
                }
                onArticleDetailViewActive={setGenerateListArticleDetailActive}
                nestedHubBackRef={generateListNestedBackRef}
              />
            );
      case ModuleType.SNAPSHOT: 
        return <SnapshotView theme={theme} currentBrand={currentBrand} />;
      case ModuleType.KNOWLEDGE_BASE:
        return (
          <KnowledgeBase
            theme={theme}
            currentBrand={currentBrand}
            allBrands={allBrands}
            onBrandChange={handleBrandChange}
            onNavigateToBrandManagement={() => setActiveModule(ModuleType.BRAND_MANAGEMENT)}
            initialSelectedKnowledgeBaseId={
              knowledgeBasePresetId ?? toolsHubPinnedKnowledgeBaseId
            }
            scopeWorkflowId={toolsHubWorkflowId}
            bindGeoWorkflowId={toolsHubWorkflowId}
            onGeoWorkflowUpdated={() => void refreshToolsHubWorkflowBindings()}
          />
        );
      case ModuleType.CONTENT_GENERATION:
        // 已废弃，重定向到 GENERATE
        setActiveModule(ModuleType.GENERATE);
        return null;
      case ModuleType.LOGS:
        return renderRemovedModule('系统日志');
      case ModuleType.TOOLBOX:
        return <Toolbox theme={theme} />;
      case ModuleType.KEY_SETTINGS:
        return <KeySettings theme={theme} />;
      case ModuleType.HISTORY_SEARCH:
        return <HistorySearch theme={theme} currentBrand={currentBrand} onBack={() => setActiveModule(ModuleType.DATA_SCREEN)} />;
      case ModuleType.BRAND_MANAGEMENT:
        return <BrandManagement theme={theme} brands={allBrands} setBrands={setAllBrands} />;
      case ModuleType.BLOG_MANAGEMENT:
        return <BlogManagement theme={theme} />;
      case ModuleType.COLUMN_MANAGEMENT:
        return <ColumnManagement theme={theme} />;
      case ModuleType.POINTS_TRANSACTIONS:
        return (
          <PointsTransactionList
            balance={userPoints}
            refreshKey={pointsRefreshKey}
            onBack={() => setActiveModule(ModuleType.LATEST_OPTIMIZATION)}
            onRecharge={() => setCreditsRechargeOpen(true)}
          />
        );
      case ModuleType.USER_PACKAGE_MANAGEMENT:
        return (
          <UserPackageManagement
            initialProductId={buyProductId}
            onPaid={handleBuyCreditsPaid}
            onBack={exitPackageManagement}
          />
        );
      case ModuleType.PURCHASE_ORDERS:
        return (
          <PurchaseOrderList
            onBack={() => setActiveModule(ModuleType.LATEST_OPTIMIZATION)}
          />
        );
      case ModuleType.MERCHANT_EXTERNAL_API_KEYS:
        return (
          <MerchantExternalApiKeys
            theme={theme}
            onBack={() => setActiveModule(merchantKeysReturnModule)}
          />
        );
      case ModuleType.QCLAW_INSTALL_GUIDE:
      case ModuleType.AUTOMATION_LOBSTER_INSTALL_GUIDE:
      case ModuleType.MASS_PUBLISH_ASSISTANT_GUIDE:
      case ModuleType.INTELLIGENT_OPTIMIZATION_DEPLOY_GUIDE:
        return (
          <IntelligentOptimizationDeployGuide
            theme={theme}
            onBack={() => setActiveModule(deployGuideReturnModule)}
          />
        );
      case ModuleType.CONTACT_SUBMISSIONS:
        return <ContactSubmissions theme={theme} />;
      case ModuleType.CATEGORY_MANAGEMENT:
        return <CategoryManagement theme={theme} />;
      case ModuleType.SEMANTIC_SEO:
        if (semanticSEOTaskId) {
          return (
            <SemanticSEO
              theme={theme}
              taskId={semanticSEOTaskId}
              onBack={() => setSemanticSEOTaskId(null)}
            />
          );
        }
        return (
          <SemanticSEOList
            theme={theme}
            currentBrand={currentBrand}
            onTaskSelect={setSemanticSEOTaskId}
            scopeWorkflowId={toolsHubWorkflowId}
            pinnedSemanticSeoTaskId={toolsHubPinnedSemanticSeoTaskId}
            pinnedKnowledgeBaseId={toolsHubPinnedKnowledgeBaseId}
            bindGeoWorkflowId={toolsHubWorkflowId}
            onGeoWorkflowUpdated={() => void refreshToolsHubWorkflowBindings()}
          />
        );
      case ModuleType.REPORTS:
        // 分析报告模块
        return <AnalyticsReport theme={theme} currentBrand={currentBrand} />;
      case ModuleType.OPTIMIZATION_AGENT:
        return (
          <OptimizationAgent
            theme={theme}
            onCreateMonitoringOptimization={() => {
              setOptimizationBotOpenCreate(true);
              setActiveModule(ModuleType.OPTIMIZATION_BOT);
            }}
            onOpenTaskDetail={(taskId) => {
              setOptimizationBotDetailTaskId(taskId);
              setActiveModule(ModuleType.OPTIMIZATION_BOT);
            }}
          />
        );
      case ModuleType.OPTIMIZATION_BOT:
        return (
          <OptimizationBot
            theme={theme}
            currentBrand={currentBrand}
            initialCreateDraft={optimizationBotCreateDraft}
            initialDetailTaskId={optimizationBotDetailTaskId}
            initialOpenCreate={optimizationBotOpenCreate}
            onInitialRouteConsumed={handleOptimizationBotInitialConsumed}
            onOpenQuickStart={() => setActiveModule(ModuleType.BRAND_PARSE_WIZARD)}
            onOpenDataScreenAll={openDataScreenForBrand}
            onOpenGenerateListForOptimizationTask={(tid) => {
              setGeoArtifactGenerateFilterTaskId(tid);
              setActiveModule(ModuleType.GENERATE);
            }}
            onOpenPublishRecordsForOptimizationTask={(tid) => {
              setGeoArtifactPublishFilterTaskId(tid);
              setActiveModule(ModuleType.PUBLISH_RECORDS);
            }}
          />
        );
      default:
        return renderRemovedModule('页面不存在');
    }
  };

  // 公开链接：无需登录，直接展示分析明细/诊断报告（无侧栏、无页头）
  const path = (typeof window !== 'undefined' ? window.location.pathname : '').replace(/\/$/, '') || '/';
  if (path.endsWith('/data-screen')) {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const shareIdFromUrl = params.get('s') || undefined;
    const taskIdFromUrl = params.get('taskId') || undefined;
    return (
      <div className="flex h-screen w-full font-sans overflow-hidden bg-white">
        <Suspense fallback={<div className="flex-1 flex items-center justify-center">加载中...</div>}>
          <DataScreen theme="light" currentBrand={null} isStandalone taskId={taskIdFromUrl} shareId={shareIdFromUrl} canShowVisibilityChart={false} />
        </Suspense>
      </div>
    );
  }
  if (path.endsWith('/credential')) {
    const cParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const credentialKey = cParams.get('k');
    return (
      <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#e8eaef] text-slate-500">加载中…</div>}>
        <AiReplyCredentialPage queryKey={credentialKey} />
      </Suspense>
    );
  }
  if (path.endsWith('/diagnosis-report')) {
    const drParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const drShareId = drParams.get('s') || undefined;
    const drTaskId = drParams.get('taskId') || undefined;
    return (
      <div className="flex h-screen w-full font-sans overflow-hidden bg-white">
        <Suspense fallback={<div className="flex-1 flex items-center justify-center">加载中...</div>}>
          <GeoReportFullPage
            theme="light"
            taskId={drShareId ? undefined : drTaskId}
            shareId={drShareId}
            isStandalone
            onBack={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) window.history.back();
            }}
            backButtonLabel={optT('navigation.back')}
          />
        </Suspense>
      </div>
    );
  }

  // Token 验证中：显示轻量 loading，避免先加载首页再跳后台的闪烁
  if (authChecking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F5F5F7]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">正在验证登录状态…</span>
        </div>
      </div>
    );
  }

  // 未登录：登录页（含站点管理员专属入口）
  if (!isAuthenticated) {
    const unauthPath = normalizeAppPath(window.location.pathname);
    if (isSiteAdminPath(unauthPath)) {
      if (isSiteAdminHomePath(unauthPath)) {
        window.history.replaceState({ appView: 'site-admin-login' }, '', SITE_ADMIN_LOGIN_PATH);
      }
      return <SiteAdminLogin onLoginSuccess={handleSiteAdminLogin} />;
    }

    if (publicPage === 'privacy') {
      return (
        <Suspense fallback={<PageFallback />}>
          <PrivacyPolicy
            theme={theme}
            onNavigate={handlePublicLegalNavigate}
            onNavigateToLogin={handleNavigateToLogin}
            onNavigateBack={() => setPublicPage(null)}
          />
        </Suspense>
      );
    }

    if (publicPage === 'terms') {
      return (
        <Suspense fallback={<PageFallback />}>
          <TermsOfService
            theme={theme}
            onNavigate={handlePublicLegalNavigate}
            onNavigateToLogin={handleNavigateToLogin}
            onNavigateBack={() => setPublicPage(null)}
          />
        </Suspense>
      );
    }

    return (
      <Login
        onLogin={handleLogin}
        onNavigateToPrivacy={() => setPublicPage('privacy')}
        onNavigateToTerms={() => setPublicPage('terms')}
        theme={theme}
      />
    );
  }

  // 已登录状态：站点管理员门户 / 管理员后台 / 品牌后台
  if (backendMode === 'site-portal' && userRole === UserRole.SITE_ADMIN) {
    return (
      <Suspense fallback={<PageFallback />}>
        <SitePortalLayout
          theme={theme}
          username={username}
          userRole={UserRole.SITE_ADMIN}
          onLogout={handleLogout}
        />
      </Suspense>
    );
  }

  if (backendMode === 'personal') {
    return (
      <Suspense fallback={<PageFallback />}>
      <PersonalBackendLayout 
        theme={theme} 
        onLogout={handleLogout}
        onNavigateToBrandBackend={handleNavigateToBrandBackend}
        username={username}
        initialModule={initialPersonalBackendModule || undefined}
        userRole={userRole}
      />
      </Suspense>
    );
  }

  const gridHubParent = getGridHubParent(activeModule);
  const isSourceHubWorkbenchModule =
    activeModule === ModuleType.SOCIAL_MEDIA_ACCOUNTS ||
    activeModule === ModuleType.PUBLISH_RECORDS ||
    activeModule === ModuleType.THIRD_PARTY_PUBLISH ||
    activeModule === ModuleType.OVERSEAS_THIRD_PARTY_PUBLISH;
  const isToolsHubWorkbenchModule =
    activeModule === ModuleType.KNOWLEDGE_BASE ||
    activeModule === ModuleType.SEMANTIC_SEO;
  const showGridHubBack =
    gridHubParent != null &&
    activeModule !== gridHubParent.hubModuleId &&
    !(activeModule === ModuleType.GENERATE && generateListArticleDetailActive) &&
    !(activeModule === ModuleType.GENERATE && geoGenerateFromWorkbench) &&
    !(sourceHubFromWorkbench && isSourceHubWorkbenchModule) &&
    !(toolsHubFromWorkbench && isToolsHubWorkbenchModule);
  const showWorkbenchDeepLinkBack =
    (activeModule === ModuleType.GENERATE &&
      geoGenerateFromWorkbench &&
      !generateListArticleDetailActive) ||
    (sourceHubFromWorkbench && isSourceHubWorkbenchModule) ||
    (toolsHubFromWorkbench && isToolsHubWorkbenchModule);

  const handleWorkbenchDeepLinkBack = () => {
    if (activeModule === ModuleType.GENERATE) {
      if (generateListNestedBackRef.current?.()) return;
      exitGenerateListToWorkbench();
      return;
    }
    if (activeModule === ModuleType.SOCIAL_MEDIA_ACCOUNTS) {
      if (socialMediaAccountsHubBackRef.current?.handleGridHubBack()) return;
    }
    if (isToolsHubWorkbenchModule) {
      exitToolsHubToWorkbench();
      return;
    }
    exitSourceHubToWorkbench();
  };

  return (
    <div className="flex h-screen w-full font-sans overflow-hidden bg-[#F5F5F7] text-gray-900">

      {activeModule !== ModuleType.OPTIMIZATION_COCKPIT ? (
      <Sidebar 
          activeModule={activeModule} 
          onSelect={(m) => { 
            setReportTaskId(null);
            setDiagnosisReportReturnModule(ModuleType.BRAND_PARSE_WIZARD);
            if (m === ModuleType.EXTRACT) endWorkflow();
            if (m === ModuleType.OPTIMIZATION_BOT) {
              setOptimizationBotCreateDraft(null);
              setOptimizationBotDetailTaskId(null);
              setOptimizationBotOpenCreate(false);
            }
            setActiveModule(m); 
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
          userRole={userRole}
          menuIds={menuIds}
          username={username}
          userPoints={userPoints}
          currentPlanTitle={currentPlanTitle}
          activeConversationWorkflowId={conversationWorkflowId}
          activeWorkbenchWorkflowId={workbenchOpen?.workflowId ?? null}
          activeCockpitWorkflowId={cockpitOpen?.workflowId ?? null}
          onNewConversation={handleNewConversation}
          onWorkflowDeleted={handleWorkflowDeleted}
          onOpenRecentWorkflow={handleOpenRecentWorkflow}
          onOpenPersonalBackend={() => handleNavigateToPersonalBackend(ModuleType.PERSONAL_CENTER)}
          onOpenLobsterKeys={() => {
            setMerchantKeysReturnModule(ModuleType.LATEST_OPTIMIZATION);
            setActiveModule(ModuleType.MERCHANT_EXTERNAL_API_KEYS);
          }}
          onOpenPointsDetail={() => setActiveModule(ModuleType.POINTS_TRANSACTIONS)}
          onOpenPackageManagement={
            !isBillingAccessExempt(userRole ?? undefined)
              ? () => openPackageManagement(ModuleType.LATEST_OPTIMIZATION)
              : undefined
          }
          onLogout={handleLogout}
          recentRefreshKey={recentWorkflowsRefreshKey}
      />
      ) : null}
      
      <main
        className={`flex-1 flex flex-col min-w-0 overflow-hidden relative transition-[padding] duration-300 ease-out ${
          activeModule === ModuleType.OPTIMIZATION_COCKPIT
            ? 'lg:pl-0'
            : sidebarCollapsed
              ? 'lg:pl-16'
              : 'lg:pl-64'
        }`}
      >
        {/* TopBar */}
        <header className="relative z-50 h-16 flex shrink-0 items-center justify-between bg-transparent px-8">
            {/* 移动端：汉堡菜单 */}
            <div className="flex items-center gap-3 lg:hidden">
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 -ml-2 rounded-lg transition-colors text-gray-700 hover:bg-gray-100"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <img src="/logo.png" alt="珊瑚GEO" className="w-7 h-7 object-contain" />
                <span className="font-semibold text-sm text-gray-900">珊瑚GEO</span>
            </div>
            <div className="hidden lg:block flex-1">
                <span className="text-sm text-gray-400">
                  {new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
            </div>
        </header>

        <div className="relative z-0 flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
          {accessExpired ? (
            <div className="z-30 shrink-0 border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-sm text-amber-900">
              试用或套餐已到期，请购买套餐后继续使用。
              <button
                type="button"
                onClick={() => openPackageManagement(ModuleType.LATEST_OPTIMIZATION)}
                className="ml-2 font-medium text-[#E8553F] hover:underline"
              >
                立即升级
              </button>
            </div>
          ) : null}
          <Suspense fallback={<PageFallback />}>
            <>
              {showWorkbenchDeepLinkBack ? (
                <div className="z-20 shrink-0 border-b border-gray-200/90 bg-[#F5F5F7]/95 px-6 py-2.5 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={handleWorkbenchDeepLinkBack}
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-[#E8553F] transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" />
                    返回优化工作台
                  </button>
                </div>
              ) : showGridHubBack ? (
                <div className="z-20 shrink-0 border-b border-gray-200/90 bg-[#F5F5F7]/95 px-6 py-2.5 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        activeModule === ModuleType.SOCIAL_MEDIA_ACCOUNTS &&
                        socialMediaAccountsHubBackRef.current?.handleGridHubBack()
                      ) {
                        return;
                      }
                      if (
                        activeModule === ModuleType.GENERATE &&
                        generateListNestedBackRef.current?.()
                      ) {
                        return;
                      }
                      setActiveModule(gridHubParent.hubModuleId);
                    }}
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-[#E8553F] transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" />
                    返回
                  </button>
                </div>
              ) : null}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {renderModule()}
              </div>
            </>
          </Suspense>
        </div>
      </main>
      <Suspense fallback={null}>
        <CreditsRechargeDrawer
          open={creditsRechargeOpen}
          onClose={() => setCreditsRechargeOpen(false)}
          onPaid={handleCreditsRecharged}
        />
      </Suspense>
    </div>
  );
};

export default App;
