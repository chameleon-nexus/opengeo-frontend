
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import * as echarts from 'echarts';
import 'echarts-wordcloud';
import { Trophy, Monitor, Clock, FileText, ChevronRight, ChevronLeft, LayoutGrid, Share2, ChartPie, Loader2, Cloud, Layers, Globe, Phone, Link2, Percent, BarChart3, Sparkles, Download } from 'lucide-react';
import { Theme, Brand, DashboardData } from '../types';
import { copyToClipboard } from '../utils/clipboard';
import { dataScreenReportAPI, DataScreenReportData } from '../api/dataScreenReport';
import { geoWorkflowAPI, type WorkflowAuditPeriod, type WorkflowAuditRow } from '../api/geoWorkflow';
import { openAiCredentialInNewTab } from '../utils/aiCredentialView';
import { dashboardAPI } from '../api/dashboard';
import VisibilityTrendChart from './VisibilityTrendChart';
import Pagination from './Pagination';
import AitripDateRangePicker from './AitripDateRangePicker';
import { isValidIsoRange, lastNDaysRange } from '../utils/dateRange';
import { useModuleI18n } from '../i18n/hooks';

const WORKFLOW_AUDIT_PAGE_SIZE = 20;
const DEFAULT_AUDIT_PERIOD: WorkflowAuditPeriod = 'last_30_days';

const AUDIT_PERIOD_IDS: WorkflowAuditPeriod[] = ['today', 'yesterday', 'last_7_days', 'last_30_days', 'custom'];

type AuditPeriodOptionId = (typeof AUDIT_PERIOD_IDS)[number];

const PERIOD_LABEL_KEYS: Record<AuditPeriodOptionId, string> = {
  today: 'period.today',
  yesterday: 'period.yesterday',
  last_7_days: 'period.last7Days',
  last_30_days: 'period.last30Days',
  custom: 'period.custom',
};

function formatAuditCollectedAt(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
    return d.toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return iso.slice(0, 16);
  }
}

/** 浏览器控制台 [分析明细] 调试摘要（不含大段原文） */
function summarizeDataScreenPayload(data: DataScreenReportData | null): Record<string, unknown> {
  if (!data) return { ok: false, reason: 'null_or_empty' };
  const rows = data.reportRows || [];
  return {
    ok: true,
    id: data.id,
    taskId: data.taskId,
    brandName: data.brandName,
    nReportRows: rows.length,
    nPlatformData: (data.platformData || []).length,
    nTopKeywords: (data.topKeywords || []).length,
    coreWordsTotal: data.coreWordsTotal,
    distilledWordsTotal: data.distilledWordsTotal,
    isMock: data.isMock === true,
  };
}

interface DataScreenProps {
  theme: Theme;
  currentBrand: Brand | null;
  isStandalone?: boolean;
  taskId?: string;  // 从监控日志进入时传入
  shareId?: string;  // 分享链接 ?s=xxx 固化的分享
  canShowVisibilityChart?: boolean;  // show 角色可见，需从 App 传入
  /** 打开「品牌材料解析」引导（不占用侧栏菜单） */
  onOpenBrandParseWizard?: () => void;
  /** 自 GEO 快速开始节点 3「分析明细」进入：顶栏与内嵌诊断报告一致（左返回快速开始） */
  geoWizardNav?: { onBack: () => void; backLabel?: string } | null;
  /** 嵌入优化驾驶舱：全宽布局，去掉独立页 max-width 与快速开始卡片外壳 */
  embedded?: boolean;
  /** 驾驶舱：报表明细列表按工作流累加分页（上方汇总仍用 taskId 加载） */
  workflowId?: string;
}

type DetailReportRow = DataScreenReportData['reportRows'][number] & {
  collectedAt?: string | null;
  cycleNumber?: number | null;
};

type ReportTabId = 'allReports' | 'qaReports' | 'brandReports';

const REPORT_TAB_IDS: ReportTabId[] = ['allReports', 'qaReports', 'brandReports'];

const REPORT_TAB_LABEL_KEYS: Record<ReportTabId, 'tabs.allReports' | 'tabs.qaReports' | 'tabs.brandReports'> = {
  allReports: 'tabs.allReports',
  qaReports: 'tabs.qaReports',
  brandReports: 'tabs.brandReports',
};

const PLATFORM_MAP: Record<string, { name: string; icon: string }> = {
  '豆包（PC）': { name: '豆包', icon: '/imgs/ai-icons/doubao.png' },
  '豆包（移动）': { name: '豆包', icon: '/imgs/ai-icons/doubao.png' },
  'DeepSeek（PC）': { name: 'DeepSeek', icon: '/imgs/ai-icons/deepseek.png' },
  'DeepSeek（移动）': { name: 'DeepSeek', icon: '/imgs/ai-icons/deepseek.png' },
  '文心一言（PC）': { name: '文心一言', icon: '/imgs/ai-icons/wenxin.png' },
  '文心一言（移动）': { name: '文心一言', icon: '/imgs/ai-icons/wenxin.png' },
  '千问（PC）': { name: '千问', icon: '/imgs/ai-icons/tongyi.png' },
  '千问（移动）': { name: '千问', icon: '/imgs/ai-icons/tongyi.png' },
  '元宝（PC）': { name: '元宝', icon: '/imgs/ai-icons/yuanbao.png' },
  '元宝（移动）': { name: '元宝', icon: '/imgs/ai-icons/yuanbao.png' },
  'Kimi（PC）': { name: 'Kimi', icon: '/imgs/ai-icons/kimi.png' },
  'Kimi（移动）': { name: 'Kimi', icon: '/imgs/ai-icons/kimi.png' },
  '夸克（PC）': { name: '夸克', icon: '/imgs/ai-icons/quark.png' },
  '夸克（移动）': { name: '夸克', icon: '/imgs/ai-icons/quark.png' },
  '纳米（PC）': { name: '纳米', icon: '/imgs/ai-icons/nami.png' },
  '纳米（移动）': { name: '纳米', icon: '/imgs/ai-icons/nami.png' },
  '讯飞星火（PC）': { name: '讯飞星火', icon: '/imgs/ai-icons/xunfei.png' },
  '讯飞星火（移动）': { name: '讯飞星火', icon: '/imgs/ai-icons/xunfei.png' },
  '智谱（PC）': { name: '智谱', icon: '/imgs/ai-icons/zhipu.png' },
  '智谱（移动）': { name: '智谱', icon: '/imgs/ai-icons/zhipu.png' },
};

/** 诊断子表 report_rows.platform 常为英文 api_provider（与后端 _DATA_SCREEN_PLATFORM_ICON_MAP 一致） */
const PLATFORM_EN_KEY_MAP: Record<string, { name: string; icon: string }> = {
  doubao: { name: '豆包', icon: '/imgs/ai-icons/doubao.png' },
  deepseek: { name: 'DeepSeek', icon: '/imgs/ai-icons/deepseek.png' },
  wenxin: { name: '文心一言', icon: '/imgs/ai-icons/wenxin.png' },
  yuanbao: { name: '元宝', icon: '/imgs/ai-icons/yuanbao.png' },
  qianwen: { name: '千问', icon: '/imgs/ai-icons/tongyi.png' },
  kimi: { name: 'Kimi', icon: '/imgs/ai-icons/kimi.png' },
  quark: { name: '夸克', icon: '/imgs/ai-icons/quark.png' },
  nami: { name: '纳米', icon: '/imgs/ai-icons/nami.png' },
  xunfei: { name: '讯飞星火', icon: '/imgs/ai-icons/xunfei.png' },
  zhipu: { name: '智谱', icon: '/imgs/ai-icons/zhipu.png' },
};

/** 芯片展示用中文名 -> platforms.* i18n key（筛选/匹配仍用原始中文 chip.name） */
const PLATFORM_CHIP_I18N_KEY: Record<string, string> = {
  豆包: 'doubao',
  DeepSeek: 'deepseek',
  文心一言: 'wenxin',
  千问: 'qianwen',
  元宝: 'yuanbao',
  Kimi: 'kimi',
  夸克: 'quark',
  纳米: 'nami',
  讯飞星火: 'xunfei',
  智谱: 'zhipu',
};

function localizePlatformChipDisplayName(
  name: string,
  translate: (key: string) => string,
  language: string,
): string {
  if (!language.startsWith('en')) return name;
  const resolvedName = resolvePlatformDisplay(name).name;
  const key = PLATFORM_CHIP_I18N_KEY[resolvedName];
  return key ? translate(`platforms.${key}`) : name;
}

function resolvePlatformDisplay(platform: string): { name: string; icon: string } {
  const raw = (platform || '').trim();
  if (!raw) return { name: '—', icon: '' };
  if (PLATFORM_MAP[raw]) return PLATFORM_MAP[raw];
  const lower = raw.toLowerCase();
  if (PLATFORM_EN_KEY_MAP[lower]) return PLATFORM_EN_KEY_MAP[lower];
  const stripped = raw.replace(/（PC）|（移动）|\(PC\)|\(移动\)|\s*PC\s*|\s*手机\s*/gi, '').trim();
  if (PLATFORM_MAP[stripped]) return PLATFORM_MAP[stripped];
  const strippedLower = stripped.toLowerCase();
  if (PLATFORM_EN_KEY_MAP[strippedLower]) return PLATFORM_EN_KEY_MAP[strippedLower];
  return { name: stripped || raw, icon: '' };
}

/** 严格使用数据库的 platformData，不做展开转换 */
function usePlatformDataAsIs(data: Array<{ name: string; value: number; color: string; icon: string }>): typeof data {
  return data && data.length > 0 ? data : [];
}

const PLATFORM_CHART_FALLBACK_COLORS = ['#4f72db', '#97d16d', '#f7cd66', '#7bc9e8', '#f36d6d', '#42a875'];

/** 可见度占比全为 0 时，用报表明细各平台行数作为饼图数据 */
function platformShareWithRowCountFallback(
  base: Array<{ name: string; value: number; color: string; icon: string }>,
  rows: Array<{ platform?: string }>,
): Array<{ name: string; value: number; color: string; icon: string }> {
  const total = base.reduce((s, p) => s + (Number(p.value) || 0), 0);
  if (total > 0) return base;

  const countByDisplayName = new Map<string, number>();
  for (const r of rows) {
    const info = resolvePlatformDisplay((r.platform || '').trim());
    const name = info.name;
    if (!name || name === '—') continue;
    countByDisplayName.set(name, (countByDisplayName.get(name) || 0) + 1);
  }
  if (countByDisplayName.size === 0) return base;

  if (base.length > 0) {
    return base.map((p) => ({
      ...p,
      value: countByDisplayName.get(p.name) ?? countByDisplayName.get(resolvePlatformDisplay(p.name).name) ?? 0,
    }));
  }

  let i = 0;
  return Array.from(countByDisplayName.entries()).map(([name, value]) => {
    const info = resolvePlatformDisplay(name);
    const color = PLATFORM_CHART_FALLBACK_COLORS[i % PLATFORM_CHART_FALLBACK_COLORS.length];
    i += 1;
    return { name: info.name, value, color, icon: info.icon };
  });
}

/** show 角色可见度趋势图 mock 数据：近半年，起点 60-80 均匀分布，终点 80-95 均匀分布 */
const MOCK_VISIBILITY_DATA: Pick<DashboardData, 'visibility' | 'competitors'> = {
  visibility: {
    score: 93,
    change: 31,
    history: [
      // 2024-10~2025-03 近半年 | 电动剃须刀:持续上升 62→93 | 飞利浦:平滑 74→82 | S7000:先降后升 78→88 | 软刀头:略升 66→91 | 越野跑鞋:大幅升 70→94
      { date: '2024-10', value: 62, comp1: 74, comp2: 78, comp3: 66, comp4: 70 },
      { date: '2024-11', value: 68, comp1: 75, comp2: 72, comp3: 70, comp4: 76 },
      { date: '2024-12', value: 74, comp1: 76, comp2: 68, comp3: 74, comp4: 82 },
      { date: '2025-01', value: 80, comp1: 78, comp2: 70, comp3: 80, comp4: 88 },
      { date: '2025-02', value: 87, comp1: 80, comp2: 80, comp3: 85, comp4: 91 },
      { date: '2025-03', value: 93, comp1: 82, comp2: 88, comp3: 91, comp4: 94 },
    ],
  },
  competitors: [
    { name: '电动剃须刀', score: 93, change: 31 },
    { name: '飞利浦', score: 82, change: 8 },
    { name: 'S7000敏感肌专用', score: 88, change: 10 },
    { name: '软刀头', score: 91, change: 25 },
    { name: '越野跑鞋', score: 94, change: 24 },
  ],
};

/** 词云单条名称的最大字符数；超过会让 echarts-wordcloud 在小画布里"放不下→静默丢词" */
const WORDCLOUD_NAME_MAX = 12;

/** 兜底用：前端简易中文分词（2 字滑窗 + ASCII 词），用于历史数据里 topKeywords 为空时从报表明细聚合 */
const WORDCLOUD_STOPWORDS = new Set<string>([
  '的', '了', '是', '在', '有', '和', '就', '不', '人', '都', '一', '这', '个',
  '我', '你', '他', '她', '它', '们', '上', '下', '来', '去', '说', '要', '会',
  '能', '可以', '可', '很', '更', '最', '也', '还', '只', '但', '而', '及',
  '为', '与', '或', '等', '吗', '呢', '吧', '啊', '哦', '嗯', '呀', '什么',
  '如何', '怎么', '怎样', '为什么', '哪个', '哪些', '哪里', '多少', '是否',
  '推荐', '选择', '选购', '购买', '评价', '对比', '比较', '区别', '建议',
  '适合', '适用', '使用', '比较好', '怎么样', '好不好', '区分', '分析',
  '请问', '想问', '麻烦', '谢谢', '你好', '目前', '当前', '现在', '今年',
  '需要', '需求', '情况', '方面', '时候', '问题', '原因', '影响', '因素',
  '类型', '种类', '款式', '型号', '版本', '系列', '产品', '品牌', '用户',
  '比如', '例如', '包括', '一些', '一个', '一种', '更好', '最佳', '首选',
]);

const CJK_RE = /[\u4e00-\u9fff]/;

function tokenizeChinese(text: string): string[] {
  if (!text) return [];
  const tokens: string[] = [];
  let cjk = '';
  let ascii = '';
  const flushCjk = () => {
    if (cjk.length >= 2) {
      // 2 字滑窗：把"长距离训练"切成"长距 距离 离训 训练"，词频聚合后高频组合会浮上来
      for (let i = 0; i <= cjk.length - 2; i++) tokens.push(cjk.slice(i, i + 2));
    }
    cjk = '';
  };
  const flushAscii = () => {
    if (ascii.length >= 2) tokens.push(ascii);
    ascii = '';
  };
  for (const ch of text) {
    if (CJK_RE.test(ch)) {
      flushAscii();
      cjk += ch;
    } else if (/[A-Za-z0-9_+\-./]/.test(ch)) {
      flushCjk();
      ascii += ch;
    } else {
      flushCjk();
      flushAscii();
    }
  }
  flushCjk();
  flushAscii();
  return tokens;
}

function isMeaningfulToken(tok: string): boolean {
  if (!tok || tok.length < 2) return false;
  if (WORDCLOUD_STOPWORDS.has(tok)) return false;
  if (/^\d+$/.test(tok)) return false;
  if (/^[A-Za-z]{1,2}$/.test(tok)) return false;
  return true;
}

/** 报表明细有词但 topKeywords 为空（或后端是旧数据）时，用问题文本词级聚合出词云 */
function deriveWordCloudFromReportRows(
  rows: DataScreenReportData['reportRows'] | undefined,
): { name: string; value: number }[] {
  if (!rows?.length) return [];
  const counts = new Map<string, number>();
  for (const r of rows) {
    const raw = String(r.latestWord ?? r.coreWord ?? '').trim();
    if (!raw) continue;
    const seen = new Set<string>();
    for (const tok of tokenizeChinese(raw)) {
      if (!isMeaningfulToken(tok)) continue;
      if (seen.has(tok)) continue;
      seen.add(tok);
      counts.set(tok, (counts.get(tok) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, c]) => c >= 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([name, c]) => ({ name, value: Math.max(1, c) }));
}

/** 兼容 API / 历史数据：word | keyword | term；过长名字会让词云画布排不下，统一截断 */
function normalizeWordCloudSeries(topKeywords: DataScreenReportData['topKeywords'] | undefined): { name: string; value: number }[] {
  const list = topKeywords || [];
  const out: { name: string; value: number }[] = [];
  const seen = new Set<string>();
  for (const k of list as Array<{ word?: string; keyword?: string; term?: string; count?: number; value?: number }>) {
    let name = String(k?.word ?? k?.keyword ?? k?.term ?? '').trim();
    if (!name) continue;
    // 历史数据可能把整条问题塞进 word 字段；超长则截断，避免词云在小画布里排不下被静默丢弃
    if (name.length > WORDCLOUD_NAME_MAX) {
      name = `${name.slice(0, WORDCLOUD_NAME_MAX)}…`;
    }
    if (seen.has(name)) continue;
    seen.add(name);
    const n = Number(k?.count ?? k?.value);
    const value = Number.isFinite(n) && n > 0 ? Math.round(n) : 1;
    out.push({ name, value });
  }
  return out.slice(0, 40);
}

/** 历史/旧数据兜底：当 topKeywords 全部 count=0 或全部超过 8 字（基本是问题原文）时视为不可用 */
function isTopKeywordsUsable(list: { name: string; value: number }[]): boolean {
  if (list.length === 0) return false;
  const longRatio = list.filter((x) => x.name.replace(/…$/, '').length > 8).length / list.length;
  if (longRatio >= 0.6) return false;
  const allEqual = list.every((x) => x.value === list[0].value);
  // 全部相等且条数较少，仍然让它渲染（mock 兜底场景值都是 1 是合法的）
  if (allEqual && list.length < 4) return false;
  return true;
}

const DataScreen: React.FC<DataScreenProps> = ({
  theme,
  currentBrand,
  isStandalone = false,
  taskId,
  shareId,
  canShowVisibilityChart = false,
  onOpenBrandParseWizard,
  geoWizardNav,
  embedded = false,
  workflowId,
}) => {
  const { t, i18n } = useModuleI18n('dataScreen');
  const { t: tc } = useModuleI18n('common');
  const auditPeriodOptions = useMemo(
    () => AUDIT_PERIOD_IDS.map((id) => ({ id, label: t(PERIOD_LABEL_KEYS[id] as 'period.today') })),
    [t],
  );
  const workflowListMode = Boolean((workflowId || '').trim());
  /** 驾驶舱内嵌分析明细：聚焦报表明细表格，不展示上方词云/占比等汇总图 */
  const cockpitAuditFocus = workflowListMode && embedded;
  const isDark = theme === 'dark';
  const useWizardCardShell = Boolean(geoWizardNav) && !embedded;
  const contentShellCls = embedded
    ? 'w-full px-4 md:px-6 space-y-12 md:space-y-16 pb-32'
    : 'max-w-[1600px] mx-auto space-y-12 md:space-y-16 pb-32';
  /** 自 GEO 主线 / 优化工作台「查看」分析明细进入：精简版面（去掉 top 语义词表、数据指标） */
  const wizardDataScreenCompact = Boolean(geoWizardNav) || embedded;
  /** 与 BrandParseWizard / 内嵌分析报告顶栏一致 */
  const wizardCardShell = isDark
    ? 'overflow-hidden rounded-2xl border border-slate-600/80 bg-slate-900/90 shadow-lg shadow-black/30'
    : 'overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-200/50';
  const wizardCardHeader = isDark
    ? 'border-b border-slate-700 bg-gradient-to-r from-orange-950/50 to-amber-950/30 px-5 py-4 sm:px-8'
    : 'border-b border-slate-100 bg-gradient-to-r from-orange-50/90 to-amber-50/40 px-5 py-4 sm:px-8';
  const wizardTitleCls = isDark ? 'text-lg font-semibold text-white sm:text-xl' : 'text-lg font-semibold text-[#111827] sm:text-xl';
  const wizardSubCls = isDark ? 'mt-1 text-sm text-zinc-400' : 'mt-1 text-sm text-[#64748b]';
  const geoBackBtnCls = `p-2 rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-xs font-semibold shrink-0
    ${isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`;
  const [activeTab, setActiveTab] = useState<ReportTabId>('allReports');
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [singleReportData, setSingleReportData] = useState<DataScreenReportData | null>(null);

  const reportData = singleReportData;
  const [visibilityData, setVisibilityData] = useState<Pick<DashboardData, 'visibility' | 'competitors'> | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const wordCloudRef = useRef<HTMLDivElement>(null);
  const wordCloudChartRef = useRef<echarts.ECharts | null>(null);
  const [workflowAuditRows, setWorkflowAuditRows] = useState<WorkflowAuditRow[]>([]);
  const [workflowWordCloudRows, setWorkflowWordCloudRows] = useState<WorkflowAuditRow[]>([]);
  const [workflowAuditPlatforms, setWorkflowAuditPlatforms] = useState<
    Array<{ name: string; value: number; color: string; icon: string }>
  >([]);
  const [workflowAuditTotal, setWorkflowAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPeriod, setAuditPeriod] = useState<WorkflowAuditPeriod>(DEFAULT_AUDIT_PERIOD);
  const [auditCustomFrom, setAuditCustomFrom] = useState('');
  const [auditCustomTo, setAuditCustomTo] = useState('');
  const [auditListLoading, setAuditListLoading] = useState(false);
  const [auditExporting, setAuditExporting] = useState(false);
  const [platformReady, setPlatformReady] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const wordCloudSeries = useMemo(() => {
    if (workflowListMode) {
      const fromWorkflow = deriveWordCloudFromReportRows(
        workflowWordCloudRows.map((r) => ({
          coreWord: r.coreWord,
          latestWord: r.latestWord,
          platform: r.platform,
          link: r.link || '',
        })),
      );
      if (fromWorkflow.length > 0) return fromWorkflow;
    }
    const fromTop = normalizeWordCloudSeries(singleReportData?.topKeywords);
    // topKeywords 在历史数据里可能塞的是问题原文（长串、count=0），不可用时降级到 reportRows 词级聚合
    if (isTopKeywordsUsable(fromTop)) return fromTop;
    const fromRows = deriveWordCloudFromReportRows(singleReportData?.reportRows);
    if (fromRows.length > 0) return fromRows;
    return fromTop;
  }, [
    workflowListMode,
    workflowWordCloudRows,
    singleReportData?.topKeywords,
    singleReportData?.reportRows,
  ]);

  // 词云图：规范化字段 + 容器实测宽高（百分比宽高在部分布局下会导致词云不绘制）
  useEffect(() => {
    const el = wordCloudRef.current;
    if (!singleReportData || wordCloudSeries.length === 0) {
      if (wordCloudChartRef.current) {
        wordCloudChartRef.current.dispose();
        wordCloudChartRef.current = null;
      }
      return;
    }

    let cancelled = false;
    let ro: ResizeObserver | null = null;

    const mount = () => {
      if (cancelled || !wordCloudRef.current) return;
      const rect = wordCloudRef.current.getBoundingClientRect();
      const w = Math.max(220, Math.floor(rect.width));
      const h = Math.max(220, Math.floor(rect.height));
      if (w < 80 || h < 80) {
        requestAnimationFrame(mount);
        return;
      }
      if (wordCloudChartRef.current) {
        wordCloudChartRef.current.dispose();
        wordCloudChartRef.current = null;
      }
      const chart = echarts.init(wordCloudRef.current);
      wordCloudChartRef.current = chart;
      // 字号上限随容器尺寸自适应：避免在小卡片里因字号过大而排不下被静默丢弃
      const sizeMax = Math.min(28, Math.max(16, Math.floor(Math.min(w, h) / 9)));
      const sizeMin = Math.min(14, Math.max(10, Math.floor(sizeMax / 2)));
      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          formatter: (params: { name?: string; value?: number }) =>
            `${params.name ?? ''}<br/>${t('wordCloud.tooltipCount', { value: params.value ?? '' })}`,
          backgroundColor: isDark ? 'rgba(26,26,26,0.9)' : 'rgba(255,255,255,0.9)',
          textStyle: { color: isDark ? '#fff' : '#333' },
        },
        series: [
          {
            type: 'wordCloud',
            gridSize: 4,
            sizeRange: [sizeMin, sizeMax],
            rotationRange: [-30, 30],
            rotationStep: 30,
            shape: 'circle',
            left: 'center',
            top: 'center',
            width: w,
            height: h,
            drawOutOfBound: false,
            textStyle: {
              fontFamily: 'Noto Sans SC, Inter, sans-serif',
              fontWeight: 'bold',
              color: () => {
                const colors = isDark
                  ? ['#4f72db', '#97d16d', '#f7cd66', '#7bc9e8', '#f36d6d', '#42a875']
                  : ['#2563eb', '#059669', '#d97706', '#0284c7', '#dc2626', '#16a34a'];
                return colors[Math.floor(Math.random() * colors.length)];
              },
            },
            emphasis: { focus: 'self', textStyle: { shadowBlur: 10 } },
            data: wordCloudSeries,
          },
        ],
      });
      chart.resize({ width: w, height: h });
    };

    const timer = window.setTimeout(mount, 120);
    const onWinResize = () => {
      const box = wordCloudRef.current?.getBoundingClientRect();
      if (!box || !wordCloudChartRef.current) return;
      wordCloudChartRef.current.resize({ width: Math.floor(box.width), height: Math.floor(box.height) });
    };
    window.addEventListener('resize', onWinResize);
    if (typeof ResizeObserver !== 'undefined' && el) {
      ro = new ResizeObserver(onWinResize);
      ro.observe(el);
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener('resize', onWinResize);
      ro?.disconnect();
      if (wordCloudChartRef.current) {
        wordCloudChartRef.current.dispose();
        wordCloudChartRef.current = null;
      }
    };
  }, [singleReportData, wordCloudSeries, isDark, t]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        let data: DataScreenReportData | null = null;
        const entry = shareId
          ? { mode: 'share' as const, shareId, urlTail: `/api/data-screen/share/${shareId}` }
          : taskId
            ? { mode: 'task' as const, taskId, urlTail: `/api/data-screen/task/${encodeURIComponent(taskId)}` }
            : {
                mode: 'brand_latest' as const,
                brandName: (currentBrand?.name || '').trim(),
                urlTail: (currentBrand?.name || '').trim()
                  ? `/api/data-screen/${encodeURIComponent((currentBrand?.name || '').trim())}/latest`
                  : '(skipped — no brand)',
              };
        console.info('[分析明细] 请求入口', entry);
        if (shareId) {
          data = await dataScreenReportAPI.getByShare(shareId);
        } else if (taskId) {
          data = await dataScreenReportAPI.getByTask(taskId);
        } else {
          const brandName = (currentBrand?.name || '').trim();
          data = brandName
            ? await dataScreenReportAPI.getLatest(encodeURIComponent(brandName))
            : null;
        }
        console.info('[分析明细] 返回摘要', summarizeDataScreenPayload(data));
        setSingleReportData(data);
      } catch (err) {
        console.error('加载分析明细失败:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [shareId, taskId, currentBrand?.name]);

  const selectedPlatformName = useMemo(() => {
    if (selectedPlatforms.size !== 1) return undefined;
    return Array.from(selectedPlatforms)[0];
  }, [selectedPlatforms]);

  const loadWorkflowAuditRows = useCallback(async () => {
    const wid = (workflowId || '').trim();
    if (!wid || !workflowListMode) return;
    if (auditPeriod === 'custom' && !isValidIsoRange(auditCustomFrom, auditCustomTo)) {
      setWorkflowAuditRows([]);
      setWorkflowWordCloudRows([]);
      setWorkflowAuditPlatforms([]);
      setWorkflowAuditTotal(0);
      return;
    }
    setAuditListLoading(true);
    try {
      const periodQuery = {
        period: auditPeriod,
        dateFrom: auditPeriod === 'custom' ? auditCustomFrom : undefined,
        dateTo: auditPeriod === 'custom' ? auditCustomTo : undefined,
      };
      const filteredQuery = {
        ...periodQuery,
        platform: selectedPlatformName,
      };
      const [pageData, summaryData, metaData] = await Promise.all([
        geoWorkflowAPI.listAuditRows(wid, {
          skip: (auditPage - 1) * WORKFLOW_AUDIT_PAGE_SIZE,
          limit: WORKFLOW_AUDIT_PAGE_SIZE,
          ...filteredQuery,
        }),
        geoWorkflowAPI.listAuditRows(wid, {
          skip: 0,
          limit: 100,
          ...filteredQuery,
        }),
        geoWorkflowAPI.listAuditRows(wid, {
          skip: 0,
          limit: 1,
          ...periodQuery,
        }),
      ]);
      setWorkflowAuditRows(pageData.rows || []);
      setWorkflowAuditTotal(pageData.total ?? 0);
      setWorkflowAuditPlatforms(metaData.platforms || []);
      setWorkflowWordCloudRows(summaryData.rows || []);
    } catch (err) {
      console.error('[分析明细] 工作流列表加载失败', err);
      setWorkflowAuditRows([]);
      setWorkflowWordCloudRows([]);
      setWorkflowAuditPlatforms([]);
      setWorkflowAuditTotal(0);
    } finally {
      setAuditListLoading(false);
    }
  }, [
    workflowId,
    workflowListMode,
    auditPage,
    auditPeriod,
    auditCustomFrom,
    auditCustomTo,
    selectedPlatformName,
  ]);

  const auditFilterInputCls = `rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
    isDark
      ? 'border-zinc-700 bg-zinc-800 text-white focus:border-blue-400'
      : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
  }`;

  const handleAuditPeriodChange = (period: WorkflowAuditPeriod) => {
    setAuditPeriod(period);
    setAuditPage(1);
    if (period === 'custom') {
      const { from, to } = lastNDaysRange(30);
      setAuditCustomFrom(from);
      setAuditCustomTo(to);
    } else {
      setAuditCustomFrom('');
      setAuditCustomTo('');
    }
  };

  const handleAuditCustomRangeChange = (from: string, to: string) => {
    setAuditCustomFrom(from);
    setAuditCustomTo(to);
    if (isValidIsoRange(from, to)) setAuditPage(1);
  };

  const handleExportAuditRows = useCallback(async () => {
    const wid = (workflowId || '').trim();
    if (!wid || auditExporting) return;
    if (auditPeriod === 'custom' && !isValidIsoRange(auditCustomFrom, auditCustomTo)) return;
    setAuditExporting(true);
    try {
      await geoWorkflowAPI.exportAuditRows(wid, {
        period: auditPeriod,
        dateFrom: auditPeriod === 'custom' ? auditCustomFrom : undefined,
        dateTo: auditPeriod === 'custom' ? auditCustomTo : undefined,
        platform: selectedPlatformName,
      });
    } catch (err) {
      console.error('[分析明细] 导出失败', err);
      window.alert(err instanceof Error ? err.message : t('errors.exportFailed'));
    } finally {
      setAuditExporting(false);
    }
  }, [
    workflowId,
    auditExporting,
    auditPeriod,
    auditCustomFrom,
    auditCustomTo,
    selectedPlatformName,
    t,
  ]);

  const workflowAuditToolbar = workflowListMode ? (
    <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
      {auditPeriod === 'custom' ? (
        <AitripDateRangePicker
          from={auditCustomFrom}
          to={auditCustomTo}
          onChange={handleAuditCustomRangeChange}
          placeholder={t('period.placeholder')}
        />
      ) : null}
      <select
        value={auditPeriod}
        onChange={(e) => handleAuditPeriodChange(e.target.value as WorkflowAuditPeriod)}
        className={`min-w-[9rem] ${auditFilterInputCls} font-medium`}
        aria-label={t('period.ariaLabel')}
      >
        {auditPeriodOptions.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => void handleExportAuditRows()}
        disabled={
          auditExporting ||
          workflowAuditTotal === 0 ||
          (auditPeriod === 'custom' && !isValidIsoRange(auditCustomFrom, auditCustomTo))
        }
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          isDark
            ? 'border-blue-500/40 bg-blue-600 text-white hover:bg-blue-500'
            : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
        }`}
        title={t('actions.exportExcel')}
      >
        {auditExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {t('actions.exportExcel')}
      </button>
    </div>
  ) : null;

  useEffect(() => {
    if (!workflowListMode || loading) return;
    if (auditPeriod === 'custom' && !isValidIsoRange(auditCustomFrom, auditCustomTo)) return;
    void loadWorkflowAuditRows();
  }, [workflowListMode, loading, loadWorkflowAuditRows]);

  // 可见度趋势图：有 currentBrand 时从 Dashboard API 拉取
  useEffect(() => {
    if (!currentBrand?.id || shareId || taskId) {
      setVisibilityData(null);
      return;
    }
    const loadVisibility = async () => {
      try {
        const data = await dashboardAPI.getLatest(currentBrand.id);
        setVisibilityData({
          visibility: data.visibility,
          competitors: data.competitors || []
        });
      } catch {
        setVisibilityData(null);
      }
    };
    loadVisibility();
  }, [currentBrand?.id, shareId, taskId]);

  const lastReportIdRef = useRef<number | string | null>(null);
  const workflowPlatformsInitRef = useRef<string | null>(null);
  useEffect(() => {
    workflowPlatformsInitRef.current = null;
    setPlatformReady(false);
    setSelectedPlatforms(new Set());
    setAuditPeriod(DEFAULT_AUDIT_PERIOD);
    setAuditCustomFrom('');
    setAuditCustomTo('');
    setAuditPage(1);
  }, [workflowId]);

  useEffect(() => {
    if (workflowListMode) {
      const chipSource = usePlatformDataAsIs(
        reportData?.platformData?.length
          ? reportData.platformData
          : workflowAuditPlatforms,
      );
      if (chipSource.length === 0) return;
      const key = `${workflowId}:${chipSource.map((p) => p.name).join(',')}`;
      if (workflowPlatformsInitRef.current === key) return;
      workflowPlatformsInitRef.current = key;
      const first = chipSource[0]?.name;
      if (first) setSelectedPlatforms(new Set([first]));
      setPlatformReady(true);
      return;
    }
    if (!reportData) {
      setPlatformReady(false);
      return;
    }
    const id = reportData.id ?? reportData.taskId ?? '';
    if (lastReportIdRef.current === id) return;
    lastReportIdRef.current = id;
    const platforms = usePlatformDataAsIs(reportData.platformData || []);
    const first = platforms[0]?.name;
    if (first) setSelectedPlatforms(new Set([first]));
    setPlatformReady(true);
  }, [reportData, workflowListMode, workflowId, workflowAuditPlatforms, reportData?.platformData]);

  const base = (import.meta as any).env?.BASE_URL || '/';
  const basePath = base === '/' ? '' : base.replace(/\/$/, '');
  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${basePath}` : '';
  const handleShareLink = async () => {
    if (!reportData?.taskId || reportData.taskId === '__aggregated__') return;
    try {
      const isMock = reportData.isMock === true;
      const { shareId } = await dataScreenReportAPI.createShare(reportData.taskId, isMock);
      const shareUrl = `${baseUrl}/data-screen?s=${shareId}`;
      const ok = await copyToClipboard(shareUrl);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('创建分享失败:', err);
    }
  };

  /** 与 DiagnosisReport 一致的页面底色；自快速开始进入分析明细时与 BrandParseWizard 页渐变一致 */
  const containerClasses = embedded
    ? `flex-1 h-full min-h-0 overflow-y-auto no-scrollbar font-sans w-full transition-colors duration-500 ${
        isDark ? 'bg-[#120D1D] text-white' : 'bg-[#F5F5F7] text-slate-900'
      }`
    : `
    flex-1 p-4 md:p-10 overflow-y-auto no-scrollbar font-sans transition-colors duration-500
    ${
      geoWizardNav
        ? isDark
          ? 'bg-[linear-gradient(180deg,#111827_0%,#0f172a_40%,#0f172a_100%)] text-white'
          : 'bg-[linear-gradient(180deg,#fff5f2_0%,#f8f9fb_38%,#f8f9fb_100%)] text-slate-900'
        : isDark
          ? 'bg-[#120D1D] text-white'
          : 'bg-white text-slate-900'
    }
    ${isStandalone ? 'fixed inset-0 z-[1000] w-screen h-screen' : 'relative w-full h-full'}
  `;

  const cardClasses = `
    rounded-2xl border p-6 md:p-10 relative overflow-hidden backdrop-blur-md transition-all
    ${isDark ? 'bg-white/5 border-white/5 shadow-black/20' : 'bg-white border-slate-200 shadow-sm'}
  `;

  const subCardClasses = `
    p-4 md:p-5 rounded-xl border transition-all group relative overflow-hidden
    ${isDark ? 'bg-white/[0.03] border-white/5 hover:border-white/10' : 'bg-slate-50 border-slate-100 hover:border-blue-200'}
  `;

  /** 卡片内区块标题：与诊断报告「数据信息源概况」等 h3 一致 */
  const sectionTitleClasses = `text-lg md:text-xl font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`;

  const tableHeaderClasses = 'sticky top-0 z-10 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100';

  /** 英文平台标识 -> 中文名，用于明细 platform 与芯片名匹配 */
  const PLATFORM_ALIAS: Record<string, string> = {
    doubao: '豆包', deepseek: 'DeepSeek', wenxin: '文心一言', qianwen: '千问', yuanbao: '元宝', kimi: 'Kimi',
  };
  const normalizeForMatch = (str: string): string => {
    const t = (str || '').trim().replace(/（|）|\(|\)/g, '').replace(/移动|手机/g, '').replace(/pc|PC/g, '').trim().toLowerCase();
    return (PLATFORM_ALIAS[t] || t || (str || '').trim()).toLowerCase();
  };
  const matchPlatform = (rowPlatform: string, sel: string) => {
    const rowNorm = normalizeForMatch(rowPlatform);
    const selNorm = normalizeForMatch(sel);
    if (!rowNorm || !selNorm) return false;
    if (rowNorm === selNorm) return true;
    const rowBase = (PLATFORM_ALIAS[(rowPlatform || '').trim().toLowerCase()] || (rowPlatform || '').trim()).toLowerCase();
    const selBase = (PLATFORM_ALIAS[(sel || '').trim().toLowerCase()] || (sel || '').trim().replace(/（pc）|（移动）|pc|手机/g, '').trim()).toLowerCase();
    return (rowBase && selBase && (rowBase.includes(selBase) || selBase.includes(rowBase))) || (rowNorm.includes(selNorm) || selNorm.includes(rowNorm));
  };

  const TOP_KEYWORDS = (reportData?.topKeywords || []).slice(0, 20).map((item: any, i: number) => ({
    rank: item.rank ?? i + 1,
    word: String(item.word ?? item.keyword ?? item.term ?? '').trim() || '—',
    count: item.count ?? 0,
    medal: item.medal ?? 'bg-slate-400',
  }));
  const platformDisplayName = useCallback(
    (name: string) => localizePlatformChipDisplayName(name, t, i18n.language),
    [t, i18n.language],
  );
  const workflowMappedRows: DetailReportRow[] = useMemo(
    () =>
      workflowAuditRows.map((r) => ({
        rank: r.rank,
        coreWord: r.coreWord,
        latestWord: r.latestWord,
        platform: r.platform,
        link: r.link || '',
        aiAnswer: r.aiAnswer,
        collectedAt: r.collectedAt,
        cycleNumber: r.cycleNumber,
      })),
    [workflowAuditRows],
  );
  const ALL_REPORT_ROWS: DetailReportRow[] = workflowListMode
    ? workflowMappedRows
    : (reportData?.reportRows || []);

  const platformShareCountRows = useMemo(() => {
    if (workflowListMode) {
      const src = workflowWordCloudRows.length > 0 ? workflowWordCloudRows : workflowAuditRows;
      return src.map((r) => ({ platform: r.platform }));
    }
    return (reportData?.reportRows || []).map((r) => ({ platform: r.platform }));
  }, [workflowListMode, workflowWordCloudRows, workflowAuditRows, reportData?.reportRows]);

  const PLATFORM_DATA = useMemo(() => {
    const base = usePlatformDataAsIs(
      reportData?.platformData?.length
        ? reportData.platformData
        : workflowAuditPlatforms,
    );
    return platformShareWithRowCountFallback(base, platformShareCountRows);
  }, [
    reportData?.platformData,
    workflowAuditPlatforms,
    platformShareCountRows,
  ]);

  const REPORT_ROWS: DetailReportRow[] = useMemo(() => {
    if (selectedPlatforms.size === 0) return ALL_REPORT_ROWS;
    return ALL_REPORT_ROWS.filter((r) =>
      Array.from(selectedPlatforms).some((sel) => matchPlatform(r.platform || '', sel)),
    );
  }, [ALL_REPORT_ROWS, selectedPlatforms]);

  const togglePlatform = (name: string) => {
    setSelectedPlatforms((prev) => {
      if (prev.has(name)) return new Set();
      return new Set([name]);
    });
    if (workflowListMode) setAuditPage(1);
  };
  const isPlatformSelected = (name: string) => selectedPlatforms.has(name);

  const ENGINE_CHIPS = PLATFORM_DATA.map((p, i) => ({
    name: p.name,
    color: i === 0 ? 'bg-blue-500' : 'bg-white/10',
    icon: p.icon,
  }));

  if (loading) {
    if (useWizardCardShell) {
      return (
        <div className={containerClasses}>
          <div className="mx-auto w-full max-w-[1300px] px-4 sm:px-6 lg:px-8">
            <h1 className="sr-only">{t('wizard.title')}</h1>
            <section className={wizardCardShell}>
              <div className={wizardCardHeader}>
                <h2 className={wizardTitleCls}>{t('wizard.title')}</h2>
                <p className={wizardSubCls}>{t('wizard.subtitle')}</p>
              </div>
              <div className="flex min-h-[40vh] items-center justify-center px-5 py-10 sm:px-8">
                <div className="text-center space-y-4">
                  <Loader2 className={`w-8 h-8 animate-spin mx-auto ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{tc('actions.loading')}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      );
    }
    return (
      <div className={containerClasses}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <Loader2 className={`w-8 h-8 animate-spin mx-auto ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
            <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              {tc('actions.loading')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!reportData) {
    if (useWizardCardShell) {
      return (
        <div className={containerClasses}>
          <div className="mx-auto w-full max-w-[1300px] px-4 sm:px-6 lg:px-8">
            <h1 className="sr-only">{t('wizard.title')}</h1>
            <section className={wizardCardShell}>
              <div className={wizardCardHeader}>
                <h2 className={wizardTitleCls}>{t('wizard.title')}</h2>
                <p className={wizardSubCls}>{t('wizard.subtitle')}</p>
              </div>
              <div className="space-y-8 px-5 py-6 sm:px-8">
                <button
                  type="button"
                  onClick={geoWizardNav.onBack}
                  className={geoBackBtnCls}
                  title={geoWizardNav.backLabel ?? t('actions.backToQuickStart')}
                >
                  <ChevronLeft className="w-5 h-5" /> {geoWizardNav.backLabel ?? t('actions.backToQuickStart')}
                </button>
                <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
                  <div className="w-full max-w-lg space-y-6">
                    <h2 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('pageTitle')}</h2>
                    <Monitor className={`w-12 h-12 mx-auto ${isDark ? 'text-zinc-600' : 'text-slate-300'}`} />
                    <p className={`text-lg font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                      {t('empty.noVisibilityData')}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>
                      {t('empty.completeDiagnosisFirst')}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      );
    }
    return (
      <div className={containerClasses}>
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-10">
          <div className="w-full max-w-lg text-center space-y-6">
            {!embedded ? (
              <h1 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('pageTitle')}</h1>
            ) : null}
            <Monitor className={`w-12 h-12 mx-auto ${isDark ? 'text-zinc-600' : 'text-slate-300'}`} />
            <p className={`text-lg font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              {t('empty.noAnalyticsData')}
            </p>
            <p className={`text-sm ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>
              {t('empty.completeDiagnosisFirst')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const dataScreenBody = (
    <>
        {onOpenBrandParseWizard && !isStandalone && !geoWizardNav && (
          <div className="px-4 pt-4">
            <div
              className={`rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3 ${
                isDark ? 'border-violet-500/40 bg-violet-950/40' : 'border-violet-200 bg-violet-50'
              }`}
            >
              <div className={`text-sm flex items-start gap-2 ${isDark ? 'text-violet-100' : 'text-violet-900'}`}>
                <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-violet-500" />
                <span>
                  <span className="font-semibold">{t('wizard.bannerTitle')}</span>
                  <span className={`block sm:inline sm:ml-2 ${isDark ? 'text-violet-200/90' : 'text-violet-800/90'}`}>
                    {t('wizard.bannerHint')}
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenBrandParseWizard}
                className="shrink-0 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium"
              >
                {t('wizard.enterGuide')}
              </button>
            </div>
          </div>
        )}
        {geoWizardNav ? (
          <div className="flex flex-wrap items-center justify-between gap-3 py-1">
            <button
              type="button"
              onClick={geoWizardNav.onBack}
              className={geoBackBtnCls}
              title={geoWizardNav.backLabel ?? t('actions.backToQuickStart')}
            >
              <ChevronLeft className="w-5 h-5" /> {geoWizardNav.backLabel ?? t('actions.backToQuickStart')}
            </button>
            <div className="flex items-center gap-2">
              {reportData?.taskId && reportData.taskId !== '__aggregated__' ? (
                <button
                  type="button"
                  onClick={() => void handleShareLink()}
                  className={`p-2.5 rounded-xl border transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-xs font-semibold ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 shadow-sm'
                  }`}
                  title={t('actions.shareLinkTitle')}
                >
                  <Share2 className="w-4 h-4" /> {copied ? t('actions.shareCopied') : t('actions.share')}
                </button>
              ) : null}
            </div>
          </div>
        ) : !embedded ? (
          <div className="flex items-center justify-between py-4 px-4">
            {(reportData.summaryMetrics?.showLogo !== '0') && (
              <div className="lg:hidden">
                <img src="/logo.png" alt={t('brandLogoAlt')} className="h-10 w-auto object-contain" />
              </div>
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {reportData?.taskId && reportData.taskId !== '__aggregated__' ? (
                <button
                  type="button"
                  onClick={() => void handleShareLink()}
                  className={`p-2.5 rounded-xl border transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-xs font-semibold ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 shadow-sm'
                  }`}
                  title={t('actions.shareLinkTitle')}
                >
                  <Share2 className="w-4 h-4" /> {copied ? t('actions.shareCopied') : t('actions.share')}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {!embedded ? (
        <div className="text-center relative px-4 py-4 md:py-6">
            <h1 className={`text-3xl md:text-5xl font-semibold tracking-wide transition-all
                ${isDark ? 'geo-glow-text opacity-90 text-white' : 'text-slate-900'}
            `}>
                {t('pageTitle')}
            </h1>
        </div>
        ) : null}

        {!cockpitAuditFocus ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-stretch">
            {/* 仅 show 角色可见趋势图；分享链接( isStandalone )始终展示数据指标 */}
            {(!isStandalone && canShowVisibilityChart) ? (
              <React.Fragment>
                {/* show 第一行：趋势图、词云 */}
                {(() => {
                  // show 角色：始终用 mock 数据，确保趋势图有线条（API 常返回空 history）
                  const visibility = MOCK_VISIBILITY_DATA.visibility;
                  const competitors = MOCK_VISIBILITY_DATA.competitors;
                  return (
                    <div className="lg:col-span-1">
                      <VisibilityTrendChart theme={theme} visibility={visibility} competitors={competitors} cardClasses={cardClasses} />
                    </div>
                  );
                })()}
                <div className={`${cardClasses} min-w-0 overflow-visible lg:col-span-1`}>
                  <div className="flex items-center gap-3 mb-6 md:mb-8 shrink-0">
                    <div className={`p-1.5 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><Cloud className="w-4 h-4" /></div>
                    <h3 className={sectionTitleClasses}>{t('sections.wordCloud')}</h3>
                  </div>
                  <div ref={wordCloudRef} className="w-full h-[260px] md:h-[300px]" style={{ minHeight: 240 }} data-html2canvas-ignore />
                  {wordCloudSeries.length === 0 ? (
                    <p className={`mt-2 text-center text-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>{t('wordCloud.noData')}</p>
                  ) : null}
                </div>
                {/* show 第二行：top语义词（工作台嵌入时隐藏）、各平台占比 */}
                {!wizardDataScreenCompact ? (
                <div className={`${cardClasses} flex flex-col min-h-0`}>
                  <div className="flex items-center gap-3 mb-6 md:mb-8 shrink-0">
                    <div className={`p-1.5 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><LayoutGrid className="w-4 h-4" /></div>
                    <h3 className={sectionTitleClasses}>{t('sections.semanticWords')}</h3>
                  </div>
                  <div className={`flex-1 min-h-0 overflow-hidden rounded-xl border flex flex-col ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                    <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
                      <table className="w-full text-left min-w-[400px]">
                        <thead className={tableHeaderClasses}>
                          <tr>
                            <th className="px-4 py-3 w-20 whitespace-nowrap">{t('table.rank')}</th>
                            <th className="px-4 py-3">{t('table.semanticWord')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                          {TOP_KEYWORDS.map((item) => (
                            <tr key={item.rank} className={`transition-colors group ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                              <td className="px-4 py-3">
                                <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-semibold italic shadow-lg text-white ${item.medal}`}>{item.rank}</div>
                              </td>
                              <td className={`px-4 py-3 font-bold text-sm ${isDark ? 'text-zinc-300 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900'}`}>{item.word}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                ) : null}
                <div className={`${cardClasses} flex flex-col min-h-0 ${wizardDataScreenCompact ? 'lg:col-span-2' : ''}`}>
                  <div className="flex items-center gap-3 mb-6 md:mb-8 shrink-0">
                    <div className={`p-1.5 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><ChartPie className="w-4 h-4" /></div>
                    <h3 className={sectionTitleClasses}>{t('sections.platformShare')}</h3>
                  </div>
                  <div className="flex flex-col md:flex-row items-center justify-center min-h-[200px] md:min-h-[300px]">
                    <div className={`w-full relative flex justify-center ${isMobile ? 'h-[200px] max-w-[280px] mx-auto' : 'flex-1 h-[280px]'}`}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={PLATFORM_DATA} nameKey="name" dataKey="value" innerRadius={isMobile ? 40 : 70} outerRadius={isMobile ? 65 : 100} paddingAngle={5} stroke="none">
                            {PLATFORM_DATA.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#18181b' : '#fff', border: 'none', borderRadius: '12px', color: isDark ? '#fff' : '#333', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="hidden md:block absolute top-1 right-2 z-10 max-w-[45%]">
                        <div className={`grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] font-semibold ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                          {PLATFORM_DATA.map((item, i) => (
                            <div key={i} className="truncate flex items-center gap-1" title={`${platformDisplayName(item.name)} ${item.value}`}>
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              <span className="truncate">{platformDisplayName(item.name)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mt-4 md:mt-6">
                    {PLATFORM_DATA.map((item) => {
                      const sel = isPlatformSelected(item.name);
                      const displayName = platformDisplayName(item.name);
                      return (
                        <button key={item.name} type="button" onClick={() => togglePlatform(item.name)}
                          className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg border transition-all min-w-0 cursor-pointer text-left w-full
                            ${sel ? (isDark ? 'bg-blue-500/30 border-blue-500/50 ring-2 ring-blue-500/50' : 'bg-blue-100 border-blue-300 ring-2 ring-blue-200') : (isDark ? 'bg-white/[0.03] border-white/5 hover:border-white/10' : 'bg-slate-50 border-slate-100 hover:bg-slate-100')}`}>
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0 bg-white/50">
                            {item.icon ? <img src={item.icon} alt={displayName} className="w-full h-full object-contain p-0.5 sm:p-1" /> : <span className="text-xs font-bold opacity-70">{displayName.charAt(0)}</span>}
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className={`text-[8px] sm:text-[9px] font-semibold truncate whitespace-nowrap ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} title={displayName}>{displayName}</div>
                            <div className="text-xs sm:text-xs font-semibold flex items-center justify-between gap-1">
                              <span className={`truncate whitespace-nowrap ${isDark ? 'text-white' : 'text-slate-800'}`}>{item.value}</span>
                              <span className={`text-[9px] sm:text-xs font-normal shrink-0 whitespace-nowrap ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>{(item.value / (PLATFORM_DATA.reduce((s, p) => s + p.value, 0) || 1) * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </React.Fragment>
            ) : (
              <React.Fragment>
                {/* 非 show：第一行 top语义词（工作台嵌入时隐藏）、各平台占比 */}
                {!wizardDataScreenCompact ? (
                <div className={`${cardClasses} flex flex-col min-h-0`}>
                  <div className="flex items-center gap-3 mb-6 md:mb-8 shrink-0">
                    <div className={`p-1.5 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><LayoutGrid className="w-4 h-4" /></div>
                    <h3 className={sectionTitleClasses}>{t('sections.semanticWords')}</h3>
                  </div>
                  <div className={`flex-1 min-h-0 overflow-hidden rounded-xl border flex flex-col ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                    <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
                      <table className="w-full text-left min-w-[400px]">
                        <thead className={tableHeaderClasses}>
                          <tr>
                            <th className="px-4 py-3 w-20 whitespace-nowrap">{t('table.rank')}</th>
                            <th className="px-4 py-3">{t('table.semanticWord')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                          {TOP_KEYWORDS.map((item) => (
                            <tr key={item.rank} className={`transition-colors group ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                              <td className="px-4 py-3">
                                <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-semibold italic shadow-lg text-white ${item.medal}`}>{item.rank}</div>
                              </td>
                              <td className={`px-4 py-3 font-bold text-sm ${isDark ? 'text-zinc-300 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900'}`}>{item.word}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                ) : null}
                <div className={`${cardClasses} flex flex-col min-h-0`}>
                  <div className="flex items-center gap-3 mb-6 md:mb-8 shrink-0">
                    <div className={`p-1.5 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><ChartPie className="w-4 h-4" /></div>
                    <h3 className={sectionTitleClasses}>{t('sections.platformShare')}</h3>
                  </div>
                  <div className="flex flex-col md:flex-row items-center justify-center min-h-[200px] md:min-h-[300px]">
                    <div className={`w-full relative flex justify-center ${isMobile ? 'h-[200px] max-w-[280px] mx-auto' : 'flex-1 h-[280px]'}`}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={PLATFORM_DATA} nameKey="name" dataKey="value" innerRadius={isMobile ? 40 : 70} outerRadius={isMobile ? 65 : 100} paddingAngle={5} stroke="none">
                            {PLATFORM_DATA.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#18181b' : '#fff', border: 'none', borderRadius: '12px', color: isDark ? '#fff' : '#333', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="hidden md:block absolute top-1 right-2 z-10 max-w-[45%]">
                        <div className={`grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] font-semibold ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                          {PLATFORM_DATA.map((item, i) => (
                            <div key={i} className="truncate flex items-center gap-1" title={`${platformDisplayName(item.name)} ${item.value}`}>
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              <span className="truncate">{platformDisplayName(item.name)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mt-4 md:mt-6">
                    {PLATFORM_DATA.map((item) => {
                      const sel = isPlatformSelected(item.name);
                      const displayName = platformDisplayName(item.name);
                      return (
                        <button key={item.name} type="button" onClick={() => togglePlatform(item.name)}
                          className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg border transition-all min-w-0 cursor-pointer text-left w-full
                            ${sel ? (isDark ? 'bg-blue-500/30 border-blue-500/50 ring-2 ring-blue-500/50' : 'bg-blue-100 border-blue-300 ring-2 ring-blue-200') : (isDark ? 'bg-white/[0.03] border-white/5 hover:border-white/10' : 'bg-slate-50 border-slate-100 hover:bg-slate-100')}`}>
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0 bg-white/50">
                            {item.icon ? <img src={item.icon} alt={displayName} className="w-full h-full object-contain p-0.5 sm:p-1" /> : <span className="text-xs font-bold opacity-70">{displayName.charAt(0)}</span>}
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className={`text-[8px] sm:text-[9px] font-semibold truncate whitespace-nowrap ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} title={displayName}>{displayName}</div>
                            <div className="text-xs sm:text-xs font-semibold flex items-center justify-between gap-1">
                              <span className={`truncate whitespace-nowrap ${isDark ? 'text-white' : 'text-slate-800'}`}>{item.value}</span>
                              <span className={`text-[9px] sm:text-xs font-normal shrink-0 whitespace-nowrap ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>{(item.value / (PLATFORM_DATA.reduce((s, p) => s + p.value, 0) || 1) * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* 非 show 第二行：词云、数据指标（工作台嵌入时去掉数据指标） */}
                <div className={`${cardClasses} min-w-0 overflow-visible lg:col-span-1`}>
                  <div className="flex items-center gap-3 mb-6 md:mb-8 shrink-0">
                    <div className={`p-1.5 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><Cloud className="w-4 h-4" /></div>
                    <h3 className={sectionTitleClasses}>{t('sections.wordCloud')}</h3>
                  </div>
                  <div ref={wordCloudRef} className="w-full h-[260px] md:h-[300px]" style={{ minHeight: 240 }} data-html2canvas-ignore />
                  {wordCloudSeries.length === 0 ? (
                    <p className={`mt-2 text-center text-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>{t('wordCloud.noData')}</p>
                  ) : null}
                </div>
                {!wizardDataScreenCompact ? (
                <div className={`${cardClasses} lg:col-span-1`}>
                  <div className="flex items-center gap-3 mb-6 md:mb-8 shrink-0">
                    <div className={`p-1.5 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><ChartPie className="w-4 h-4" /></div>
                    <h3 className={sectionTitleClasses}>{t('sections.dataMetrics')}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(() => {
                        const sm = reportData.summaryMetrics || {};
                        const parseFlags = (): boolean[] => {
                            if (sm.displayFlags) {
                                const arr = sm.displayFlags.split(',').map((x) => x.trim() === '1');
                                if (arr.length >= 6) return arr.slice(0, 6);
                            }
                            const n = Math.min(6, Math.max(1, parseInt(sm.displayCount || '4', 10) || 4));
                            return [true, true, true, true, false, false].map((v, i) => i < n);
                        };
                        const flags = parseFlags();
                        const allMetrics = [
                            { title: t('sections.totalCollected'), value: sm.totalCollected ?? '0', trend: undefined, hasTrend: false, hasSub: false },
                            { icon: Globe, iconBg: 'bg-blue-500/20', iconColor: 'text-blue-500', title: t('sections.platformCount'), value: sm.platformCount ?? '0', sub: undefined, hasTrend: false, hasSub: false },
                            { icon: Phone, iconBg: 'bg-violet-500/20', iconColor: 'text-violet-500', title: t('sections.contactExposure'), value: sm.contactExposure ?? '0', trend: sm.contactExposureToday ?? '0', hasTrend: true, hasSub: false },
                            { icon: Link2, iconBg: 'bg-emerald-500/20', iconColor: 'text-emerald-500', title: t('sections.officialLinkExposure'), value: sm.officialLinkExposure ?? '0', trend: sm.officialLinkExposureToday ?? '0', hasTrend: true, hasSub: false },
                            { icon: Percent, iconBg: 'bg-amber-500/20', iconColor: 'text-amber-500', title: t('sections.overallExposureRate'), value: sm.overallExposureRate ?? '0', trend: sm.overallExposureRateToday ?? '0', hasTrend: true, hasSub: false },
                            { icon: BarChart3, iconBg: 'bg-cyan-500/20', iconColor: 'text-cyan-500', title: t('sections.top3Share'), value: sm.top3Rate ?? '0', trend: sm.top3RateToday ?? '0', hasTrend: true, hasSub: false },
                        ];
                        return allMetrics.filter((_, i) => flags[i]).map((m, i) => ({
                            ...m,
                            trend: m.hasTrend && m.trend ? m.trend : undefined,
                            sub: m.hasSub ? m.sub : undefined,
                        }));
                    })().map((m, i) => (
                        <div key={i} className={subCardClasses}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${m.iconBg} ${m.iconColor}`}>
                                <m.icon className="w-4 h-4" />
                            </div>
                            <p className={`text-[10px] font-semibold mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{m.title}</p>
                            <p className={`text-lg md:text-xl font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{m.value}</p>
                            {m.hasTrend && m.trend ? (
                                <p className="text-[10px] font-medium text-emerald-500 mt-1">{m.trend}</p>
                            ) : m.sub ? (
                                <p className={`text-[10px] font-medium mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{m.sub}</p>
                            ) : null}
                        </div>
                    ))}
                </div>
                </div>
                ) : null}
              </React.Fragment>
            )}
        </div>
        ) : null}

        <div className="space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className={`flex flex-col gap-4 border-b pb-6 md:flex-row md:items-start md:justify-between md:pb-8 ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                <div className="flex min-w-0 items-center gap-3">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><Monitor className="w-5 h-5" /></div>
                    <div>
                        <h3 className={sectionTitleClasses}>{t('sections.reportDetail')}</h3>
                        <p className={`text-xs md:text-sm font-medium mt-2 leading-relaxed ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                            {t('disclaimer')}
                        </p>
                    </div>
                </div>
                {workflowListMode ? (
                  workflowAuditToolbar
                ) : (
                  <div className={`text-xs font-semibold shrink-0 self-end md:self-auto ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                    {t('updatedAt', { date: reportData.snapshotDate || '-' })}
                  </div>
                )}
            </div>

            <div className="hidden">
                {REPORT_TAB_IDS.map((tabId) => {
                  const tabIcons: Record<ReportTabId, typeof FileText> = {
                    allReports: FileText,
                    qaReports: Clock,
                    brandReports: Trophy,
                  };
                  const TabIcon = tabIcons[tabId];
                  return (
                    <button key={tabId} onClick={() => setActiveTab(tabId)}>
                        <TabIcon /> {t(REPORT_TAB_LABEL_KEYS[tabId])}
                    </button>
                  );
                })}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {ENGINE_CHIPS.map((chip, i) => {
                  const selected = isPlatformSelected(chip.name);
                  const chipDisplayName = platformDisplayName(chip.name);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => togglePlatform(chip.name)}
                      className={`p-4 rounded-xl border flex items-center gap-3 transition-all hover:scale-[1.02] cursor-pointer text-left w-full
                        ${selected
                            ? (isDark ? 'bg-blue-500 border-blue-500 shadow-blue-500/30 text-white' : 'bg-blue-500 border-blue-500 text-white shadow-md')
                            : (isDark ? 'bg-white/[0.03] border-white/5 text-zinc-300 opacity-70' : 'bg-white border-slate-200 text-slate-700 shadow-sm opacity-60')
                        }
                    `}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-inner
                            ${chip.color === 'bg-blue-500' ? 'bg-white/20' : (isDark ? 'bg-white/10' : 'bg-slate-100')}
                        `}>
                            {chip.icon ? (
                              <img src={chip.icon} alt={chipDisplayName} className="w-full h-full object-contain p-1" />
                            ) : (
                              <span className="text-xs font-bold opacity-80">{chipDisplayName.charAt(0)}</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                            <p className="text-xs font-semibold truncate whitespace-nowrap" title={chipDisplayName}>{chipDisplayName}</p>
                        </div>
                    </button>
                  );
                })}
            </div>

            <div className={`rounded-2xl border overflow-hidden shadow-sm transition-colors ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead className={tableHeaderClasses}>
                            <tr>
                                <th className="px-4 py-3 w-24">{t('table.rank')}</th>
                                {workflowListMode ? (
                                  <th className="px-4 py-3 whitespace-nowrap">{t('table.auditTime')}</th>
                                ) : null}
                                <th className="px-4 py-3">{t('table.coreWord')}</th>
                                    <th className="px-4 py-3">{t('table.question')}</th>
                                <th className="px-4 py-3">{t('table.platform')}</th>
                                <th className="px-4 py-3 text-right">{t('table.credential')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                            {auditListLoading && workflowListMode && REPORT_ROWS.length === 0 ? (
                              <tr>
                                <td colSpan={workflowListMode ? 6 : 5} className="px-4 py-12 text-center text-slate-500">
                                  <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
                                  {t('table.loadingDetail')}
                                </td>
                              </tr>
                            ) : REPORT_ROWS.length === 0 ? (
                              <tr>
                                <td colSpan={workflowListMode ? 6 : 5} className="px-4 py-12 text-center text-slate-500">
                                  {workflowListMode && auditPeriod === 'custom' && !isValidIsoRange(auditCustomFrom, auditCustomTo)
                                    ? t('empty.selectDateRange')
                                    : t('empty.noReportData')}
                                </td>
                              </tr>
                            ) : (
                            REPORT_ROWS.map((row, idx) => {
                              const core = (row.coreWord || '').trim() || '—';
                              const latest = (row.latestWord || '').trim() || '—';
                              const rowRank = workflowListMode
                                ? row.rank ?? (auditPage - 1) * WORKFLOW_AUDIT_PAGE_SIZE + idx + 1
                                : idx + 1;
                              return (
                                <tr key={`${row.platform}-${row.link || ''}-${rowRank}-${row.collectedAt || idx}`} className={`transition-colors group ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                                    <td className="px-4 py-3 font-mono tabular-nums text-xs w-14 align-top text-center text-slate-500">{rowRank}</td>
                                    {workflowListMode ? (
                                      <td className={`whitespace-nowrap px-4 py-3 align-top text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                                        {formatAuditCollectedAt(row.collectedAt, i18n.language)}
                                        {row.cycleNumber != null ? (
                                          <span className="mt-0.5 block text-[10px] text-slate-400">
                                            {t('cycle', { number: row.cycleNumber })}
                                          </span>
                                        ) : null}
                                      </td>
                                    ) : null}
                                    <td className={`px-4 py-3 align-top min-w-[8rem] max-w-[14rem] whitespace-normal break-words leading-relaxed ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>{core}</td>
                                    <td className={`px-4 py-3 align-top min-w-[10rem] max-w-[min(32rem,45vw)] whitespace-normal break-words leading-relaxed ${isDark ? 'text-zinc-100' : 'text-slate-900 font-medium'}`}>{latest}</td>
                                    <td className="px-4 py-3 font-medium">
                                        {(() => {
                                          const info = resolvePlatformDisplay(row.platform);
                                          return (
                                            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold bg-white text-slate-700">
                                              {info.icon && <img src={info.icon} alt="" className="w-5 h-5 object-contain rounded" />}
                                              <span>{info.name}</span>
                                            </span>
                                          );
                                        })()}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {(() => {
                                          const sm = reportData.summaryMetrics || {};
                                          const byPlatform = (key: string) => {
                                            try {
                                              const o = JSON.parse(sm[key] || '{}');
                                              return typeof o === 'object' && o !== null ? o : {};
                                            } catch {
                                              return {};
                                            }
                                          };
                                          const quickByPlatform = byPlatform('showQuickCredentialByPlatform');
                                          const gotoByPlatform = byPlatform('showGotoPlatformByPlatform');
                                          const showQuick =
                                            quickByPlatform[row.platform] !== undefined
                                              ? quickByPlatform[row.platform] === '1' || quickByPlatform[row.platform] === true
                                              : sm.showQuickCredential !== '0';
                                          const showGoto =
                                            gotoByPlatform[row.platform] !== undefined
                                              ? gotoByPlatform[row.platform] === '1' || gotoByPlatform[row.platform] === true
                                              : sm.showGotoPlatform !== '0';
                                          const showCredential = showQuick || showGoto;
                                          if (!showCredential) return null;
                                          const brandLabel = (reportData.brandName || currentBrand?.name || '').trim();
                                          return (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                openAiCredentialInNewTab({
                                                  brandName: brandLabel,
                                                  platform: row.platform,
                                                  question: latest,
                                                  aiAnswer: row.aiAnswer || '',
                                                  externalLink: row.link || '',
                                                })
                                              }
                                              className={`text-xs font-semibold hover:underline whitespace-nowrap ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                                            >
                                              {t('table.credential')}
                                            </button>
                                          );
                                        })()}
                                    </td>
                                </tr>
                              );
                            })
                            )}
                        </tbody>
                    </table>
                </div>
                {workflowListMode && workflowAuditTotal > 0 ? (
                  <Pagination
                    currentPage={auditPage}
                    total={workflowAuditTotal}
                    pageSize={WORKFLOW_AUDIT_PAGE_SIZE}
                    onPageChange={setAuditPage}
                    isDark={isDark}
                  />
                ) : null}
            </div>
        </div>

    </>
  );

  if (useWizardCardShell) {
    return (
      <div className={containerClasses}>
        <div className="mx-auto w-full max-w-[1300px] px-4 sm:px-6 lg:px-8">
          <h1 className="sr-only">{t('wizard.title')}</h1>
          <section className={wizardCardShell}>
            <div className={wizardCardHeader}>
              <h2 className={wizardTitleCls}>{t('wizard.title')}</h2>
              <p className={wizardSubCls}>{t('wizard.subtitle')}</p>
            </div>
            <div className={`${contentShellCls} px-5 sm:px-8`}>
              {dataScreenBody}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <div className={contentShellCls}>
        {dataScreenBody}
      </div>
    </div>
  );
};

export default DataScreen;
