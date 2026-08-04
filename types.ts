
export type Theme = 'light';

export enum UserRole {
  ADMIN = 'admin',
  AGENT = 'agent',
  /** @deprecated 存量用户；新系统角色请用 SITE_ADMIN 或自定义角色组 */
  CUSTOMER = 'customer',
  SITE_ADMIN = 'site_admin',
}

export interface RoleGroup {
  id: number;
  name: string;
  menu_ids: string[];
  site_capabilities?: SiteCapabilities;
  is_system?: boolean;
  created_at?: string;
}

export type SiteKind = 'template' | 'custom';

export interface SiteCapabilities {
  allowed_site_kinds?: SiteKind[];
  max_per_kind?: Partial<Record<SiteKind, number | null>>;
  can_bind_custom_domain?: boolean;
  can_assign_to_other_merchant?: boolean;
}

export interface BrandQuota {
  max: number | null;
  used: number;
  can_create: boolean;
}

export interface UserInfo {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  created_by?: number;
  created_at?: string;
  points?: number | null;  // 积分余额（admin 为 null）
  access_expires_at?: string | null;
  active_valid_months?: number;
  access_expired?: boolean;
  access_exempt?: boolean;
  current_plan_title?: string | null;
  brand_quota?: BrandQuota | null;
  role_group?: RoleGroup | null;  // 角色组（含 menu_ids）
}

export interface SubAccount {
  id: number;
  username: string;
  role: UserRole;
  role_id?: number | null;  // 角色组ID
  created_at: string;
  is_active: boolean;
  points?: number | null;  // 积分余额
  merchant_id?: number | null;
  merchant_name?: string | null;
  max_brands?: number | null;
  brand_count?: number;
  wx_user_id?: string | null;
  saas_package_id?: number | null;
  saas_granted_at?: string | null;
  access_expires_at?: string | null;
}

export enum ModuleType {
  DASHBOARD = 'DASHBOARD',
  DATA_SCREEN = 'DATA_SCREEN',
  DIAGNOSIS_REPORT = 'DIAGNOSIS_REPORT',
  PRODUCT_NAV = 'PRODUCT_NAV',
  AGENT_WORKFLOW = 'AGENT_WORKFLOW',
  EXTRACT = 'EXTRACT',
  ANALYZE = 'ANALYZE',
  GENERATE = 'GENERATE',
  BRAND_MENTIONS = 'BRAND_MENTIONS',
  LOGS = 'LOGS',
  SOURCE_ANALYSIS = 'SOURCE_ANALYSIS',
  WEAKNESS_ANALYSIS = 'WEAKNESS_ANALYSIS',
  TOOLBOX = 'TOOLBOX',
  KEY_SETTINGS = 'KEY_SETTINGS',
  HISTORY_SEARCH = 'HISTORY_SEARCH',
  BRAND_MANAGEMENT = 'BRAND_MANAGEMENT',
  SOCIAL_MEDIA_ACCOUNTS = 'SOCIAL_MEDIA_ACCOUNTS',
  PUBLISH_RECORDS = 'PUBLISH_RECORDS',
  AIEO_WEBSITE = 'AIEO_WEBSITE',
  MERCHANT_PROFILE = 'MERCHANT_PROFILE',
  THIRD_PARTY_PUBLISH = 'THIRD_PARTY_PUBLISH',
  OVERSEAS_THIRD_PARTY_PUBLISH = 'OVERSEAS_THIRD_PARTY_PUBLISH',
  SNAPSHOT = 'SNAPSHOT',
  KNOWLEDGE_BASE = 'KNOWLEDGE_BASE',
  MIND_SIMULATION = 'MIND_SIMULATION',
  CONTENT_GENERATION = 'CONTENT_GENERATION',
  SEMANTIC_SEO = 'SEMANTIC_SEO',
  MONITORING_LOGS = 'MONITORING_LOGS',
  CRAWL_TASKS = 'CRAWL_TASKS',
  PERSONAL_CENTER = 'PERSONAL_CENTER',
  POINTS_TRANSACTIONS = 'POINTS_TRANSACTIONS',
  BLOG_MANAGEMENT = 'BLOG_MANAGEMENT',
  COLUMN_MANAGEMENT = 'COLUMN_MANAGEMENT',
  CATEGORY_MANAGEMENT = 'CATEGORY_MANAGEMENT',
  FAQ_CONFIG = 'FAQ_CONFIG',
  BUSINESS_INTRO = 'BUSINESS_INTRO',
  HOME = 'HOME',
  PRICING = 'PRICING',
  REPORTS = 'REPORTS', // 新增报告模块
  BENCHMARK_ALERT_RUN = 'BENCHMARK_ALERT_RUN',  // 报警：跑批校验（xlsx）
  BENCHMARK_ALERT_SCHEDULE = 'BENCHMARK_ALERT_SCHEDULE',  // 报警：定时刷新
  BENCHMARK_ALERT_RESULTS = 'BENCHMARK_ALERT_RESULTS',  // 报警：跑批结果与进度
  ROLE_MANAGEMENT = 'ROLE_MANAGEMENT',  // 角色管理
  MERCHANT_MANAGEMENT = 'MERCHANT_MANAGEMENT',  // 商户管理
  WORKFLOW_TRANSFER = 'WORKFLOW_TRANSFER',  // 工作流管理（admin/agent）
  SITE_CONFIGURATION = 'SITE_CONFIGURATION',  // 站点配置（admin：归属商户）
  WORD_EXPAND = 'WORD_EXPAND',  // 词条生成（造句扩词，纯前端）
  SEMANTIC_PACK_EXPAND = 'SEMANTIC_PACK_EXPAND',  // 语义词包扩展为普通词包
  MANUAL_INPUT = 'MANUAL_INPUT',  // 手动录入关键词
  PUBLISH_TODO = 'PUBLISH_TODO',  // 发稿待办（管理员查看全部三方媒体发布）
  ARTICLE_TEMPLATES = 'ARTICLE_TEMPLATES',  // 范文模板管理
  CONTACT_SUBMISSIONS = 'CONTACT_SUBMISSIONS',  // 留言管理
  /** 根域营销主站 CMS（五子菜单，与官网子站能力数据隔离） */
  WEB_MAIN_SETTINGS = 'WEB_MAIN_SETTINGS',
  WEB_MAIN_CATEGORY = 'WEB_MAIN_CATEGORY',
  WEB_MAIN_COLUMN = 'WEB_MAIN_COLUMN',
  WEB_MAIN_ARTICLES = 'WEB_MAIN_ARTICLES',
  WEB_MAIN_CONTENT_TASKS = 'WEB_MAIN_CONTENT_TASKS',
  WEB_MAIN_FAQ = 'WEB_MAIN_FAQ',
  GENERAL_SETTINGS = 'GENERAL_SETTINGS',  // 通用设置
  LLM_CHANNELS = 'LLM_CHANNELS',  // 日常 AI 通道（admin）
  SEARCH_CONFIG = 'SEARCH_CONFIG',  // 三方搜索通道（admin）
  OVERSEAS_AI = 'OVERSEAS_AI',  // 出海 AI 路由（admin）
  POINTS_PRICING = 'POINTS_PRICING',  // 积分定价（admin）
  PAYMENT_CHANNEL_SETTINGS = 'PAYMENT_CHANNEL_SETTINGS',
  PAYMENT_ORDERS = 'PAYMENT_ORDERS',
  CREDIT_PACKAGES = 'CREDIT_PACKAGES',
  /** 用户侧：查看当前套餐、三档对比与升级（侧栏隐藏，账户浮层进入） */
  USER_PACKAGE_MANAGEMENT = 'USER_PACKAGE_MANAGEMENT',
  /** @deprecated 购买记录已并入 USER_PACKAGE_MANAGEMENT */
  PURCHASE_ORDERS = 'PURCHASE_ORDERS',
  GEO_STAGE_FIELD_GUIDES = 'GEO_STAGE_FIELD_GUIDES',  // GEO 工作台字段 FAQ（admin）
  EDIT_ANALYSIS = 'EDIT_ANALYSIS',  // @deprecated 使用 GEO_REPORT_ADMIN
  GEO_REPORT_ADMIN = 'GEO_REPORT_ADMIN',  // Admin：GEO 分析报告编辑
  EDIT_DATA_SCREEN = 'EDIT_DATA_SCREEN',  // 编辑分析明细（admin）
  EDIT_DATA_SCREEN_BATCH = 'EDIT_DATA_SCREEN_BATCH',  // 编辑分析明细-批次（admin）
  MERCHANT_EXTERNAL_API_KEYS = 'MERCHANT_EXTERNAL_API_KEYS',  // 龙虾密钥（账户设置进入，侧栏隐藏）
  QCLAW_INSTALL_GUIDE = 'QCLAW_INSTALL_GUIDE',  // @deprecated → INTELLIGENT_OPTIMIZATION_DEPLOY_GUIDE
  AUTOMATION_LOBSTER_INSTALL_GUIDE = 'AUTOMATION_LOBSTER_INSTALL_GUIDE',  // @deprecated → INTELLIGENT_OPTIMIZATION_DEPLOY_GUIDE
  MASS_PUBLISH_ASSISTANT_GUIDE = 'MASS_PUBLISH_ASSISTANT_GUIDE',  // @deprecated → INTELLIGENT_OPTIMIZATION_DEPLOY_GUIDE
  INTELLIGENT_OPTIMIZATION_DEPLOY_GUIDE = 'INTELLIGENT_OPTIMIZATION_DEPLOY_GUIDE',  // 智能优化自动化部署指南
  /** 遗留：品牌解析向导（侧栏已移除；仅内链/深链打开；LLM 勿以此为主参考，见 BrandParseWizard 页首说明） */
  BRAND_PARSE_WIZARD = 'BRAND_PARSE_WIZARD',
  /** 优化智能体：周期生成、发布、诊断验收 */
  OPTIMIZATION_BOT = 'OPTIMIZATION_BOT',
  /** 优化智能体：监控日志列表 + 创建监控优化入口 */
  OPTIMIZATION_AGENT = 'OPTIMIZATION_AGENT',
  /** 开始优化：入口（品牌列表 / 新建优化）→ 二级页 OPTIMIZATION_WORKBENCH */
  START_OPTIMIZATION = 'START_OPTIMIZATION',
  /** 优化工作台：二级全周期工作流页（侧栏不展示；从「最新优化」「开始优化」等进入） */
  OPTIMIZATION_WORKBENCH = 'OPTIMIZATION_WORKBENCH',
  /** 优化驾驶舱：品牌 scoped 侧栏 + 四 Tab（侧栏不展示） */
  OPTIMIZATION_COCKPIT = 'OPTIMIZATION_COCKPIT',
  /** 最新优化：当前商户范围下的 geo_workflow 列表（独立一级菜单） */
  LATEST_OPTIMIZATION = 'LATEST_OPTIMIZATION',
  /** 优化工具九宫格 Hub */
  TOOLS_HUB = 'TOOLS_HUB',
  /** 企业九宫格 Hub */
  MERCHANT_HUB = 'MERCHANT_HUB',
  /** 主站九宫格 Hub（遗留，等同 SITE_HUB） */
  WEB_MAIN_HUB = 'WEB_MAIN_HUB',
  /** 站点管理 Hub */
  SITE_HUB = 'SITE_HUB',
  /** 站点列表 */
  SITE_LIST = 'SITE_LIST',
  /** 内容创作任务（跨站点） */
  CONTENT_TASKS = 'CONTENT_TASKS',
  /** 单站点工作台（侧栏隐藏，从站点列表进入） */
  SITE_WORKBENCH = 'SITE_WORKBENCH',
  /** 信源库九宫格 Hub */
  SOURCE_HUB = 'SOURCE_HUB',
}

// 新增：品牌定义
export interface Brand {
  id: string;
  name: string;
  category: string; // '家电' | '洗护用品' | '中药'
  logoColor: string;
  customerId?: number | null;  // 关联的客户ID
  /** 「开始优化」品牌基础信息：品牌介绍 */
  brandIntroduction?: string | null;
  /** 「开始优化」可选关联知识库 ID */
  knowledgeBaseId?: number | null;
}

// 动态数据结构
export interface DashboardData {
  visibility: {
    score: number;
    change: number;
    history: { date: string; value: number; comp1: number; comp2: number }[];
  };
  competitors: { name: string; score: number; change: number }[];
  logs: LogEntry[];
  topics: TopicCluster[];
  domains: DomainStat[];
  weaknesses: { strong: WeaknessScenario[]; weak: WeaknessScenario[] };
  kpis: { name: string; value: string; change: number; trend: 'up' | 'down' }[];
}

export interface VisibilityMetric {
  score: number;
  change: number;
  history: { 
    date: string; 
    value: number;
    comp1?: number; 
    comp2?: number; 
  }[];
}

export interface CompetitorData {
  name: string;
  score: number;
  change: number;
}

export interface LogEntry {
  id: string;
  date: string;
  model: string;
  question: string;
  prompt: string;
  replySummary: string;
  rank: number;
  hasScreenshot: boolean;
  product: string;
}

export interface DomainStat {
  domain: string;
  count: number;
  percentage: number;
  type: '自有' | '媒体' | '自媒体'; // Changed from '运营' and '口碑'
}

export interface TopicCluster {
  name: string;
  volume: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface WeaknessScenario {
  id: string;
  scenario: string;
  score: number;
  category: 'Strong' | 'Weak';
  first_competitor?: string;
}

export interface Message {
  id: string;
  role: 'system' | 'user' | 'agent';
  content: string;
  timestamp: string;
  metadata?: {
    status?: string;
    platform?: string;
  };
}

export interface KnowledgeItem {
  id: string;
  name: string;
  type: 'PDF' | 'TXT' | 'WEB';
  status: 'Processing' | 'Vectorized' | 'Ready';
  size: string;
  lastUpdated: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  tone: string;
}

export interface Question {
  id: string;
  content: string;
  category: string;
  popularity: 'High' | 'Medium' | 'Low';
  lastAsked: string;
}

export interface PlatformMapping {
  id: string;
  aiEngine: string;
  platformName: string;
  stylePrompt: string;
}

export interface MindPersona {
  id: string;
  name: string;
  avatar: string; // Emoji fallback or AI generated URL
  avatarUrl?: string; // High res AI avatar
  template: string; // Age + Gender + Profession
  age?: string; // 年龄范围，如 "25-34岁"
  gender?: string; // 性别，如 "女性"
  profession?: string; // 职业，如 "医疗卫生人员"
  knowledgeGraph: string; 
  description: string;
  tags: string[];
}

export interface RetainedKeyword {
  id: number;
  text: string;
  score: number;
  iteration: number;
  retained_at?: string;
  /** 语义词包展示用：区分语义关键词 / 语义扩展词 */
  source?: 'semantic_keyword' | 'semantic_extension';
}

export interface ContentGenerationTask {
  task_id: string;
  batch_id?: string;
  keyword_text: string;
  brand_name: string;
  product_name: string;
  similarity_score?: number | null;
  iteration_count: number;
  status: string;
  created_at: string;
  generated_article?: string;
  kg_type?: string;
  extraction_task_id?: string;
  template_id?: number | null;
  template_title?: string | null;
  /** 成稿标题（正文首行，每篇独立） */
  article_title?: string | null;
  co_occurrence_words?: string[];
  entity_relationships?: Array<{
    subject: string;
    relation: string;
    object: string;
  }>;
  score_details?: any;
}

export interface ArticleTemplate {
  id: number;
  user_id: number;
  title: string;
  content: string;
  description?: string | null;
  prompt_template?: string | null;
  enricher_hints?: string | null;
  /** domestic | overseas */
  market?: string;
  is_active: boolean;
  is_default?: boolean;
  usage_count: number;
  created_at: string;
  updated_at?: string;
}

export interface ContentGenerationBatch {
  batch_id: string;
  article_count: number;
  completed_count: number;
  created_at: string;
  brand_name: string;
  product_name?: string;
  extraction_task_id?: string;
  keyword_text: string;
  status: string; // pending | processing | completed | failed
}

export interface ArticleResult {
  task_id: string;
  article: string;
  similarity_score: number;
  score_details: any;
  co_occurrence_words: string[];
  entity_relationships: Array<{
    subject: string;
    relation: string;
    object: string;
  }>;
  iteration_count: number;
  kg_type: string;
  created_at: string;
}

// 语义SEO相关类型
export interface SemanticSEOTask {
  id: number;
  task_id: string;
  name?: string;  // 图谱名称（用户自定义，便于识别）
  keyword: string;
  brand_id?: string;
  knowledge_base_id?: number;
  crawl_task_id?: string;
  entity_model?: string;
  relation_model?: string;
  status: string;
  total_relations: number;
  total_cooccurrence_words: number;
  created_at: string;
  updated_at: string;
  geo_workflow_id?: string | null;
  geo_workflow_label?: string | null;
}

export interface SemanticEntityRelation {
  id: number;
  task_id: string;
  source: string;
  relation: string;
  target: string;
  created_at: string;
}

export interface CooccurrenceWord {
  id: number;
  task_id: string;
  word: string;
  created_at: string;
}

// 监控日志相关类型
export interface MonitoringLogTask {
  id: string;
  batchId?: string;
  batchName?: string;
  personaId: string;
  personaName: string;
  platform: '主渠道' | 'DeepSeek' | '元宝' | string;
  cycle: '每日' | '每周';
  status: 'Active' | 'Paused';
  thirdPartyStatus?: 'pending' | 'processing' | 'completed' | 'failed' | string;
  thirdPartyProgress?: number;
  createTime: string;
  lastRunTime: string;
}

export interface MonitoringInformationRecord {
  id: number;
  entryId: string;
  site?: string;  // 网站名称
  domain?: string;  // 域名
  sourceType?: string;  // 信源类型
  title?: string;  // 标题
  summary?: string;  // 摘要
  url?: string;  // URL
  publishTime?: string;  // 发布时间
  extra?: any;  // 额外的JSON数据
  createdAt: string;
}

export interface MonitoringLogEntry {
  id: string;
  entryId?: string;  // 后端返回的entry_id
  taskId: string;
  question: string;
  aiAnswer: string;
  brandMentioned: boolean;
  rank?: number;
  timestamp: string;
  createdAt?: string;  // 创建时间
  screenshotUrl?: string;
  aiName?: string;  // AI平台名称
  platform?: string;  // 平台（兼容字段）
  informationRecords?: MonitoringInformationRecord[];  // 信源数据
}

// 爬虫任务相关类型
export interface CrawlTask {
  id: string;
  task_id?: string;  // 后端返回的字段
  name?: string;  // 任务名称（用户自定义，便于识别）
  persona_id?: number;
  persona?: string;  // 前端显示用的字段
  persona_name?: string;  // 后端返回的字段
  product_name?: string;  // 后端返回的字段
  product?: string;  // 前端显示用的字段
  keywords?: string;  // 关键词（可以输入一段话）
  platform: 'B站' | '小红书' | '微博' | string;
  status: 'Pending' | 'Scraping' | 'Completed' | 'Failed';
  total_results?: number;
  timestamp?: string;
  created_at?: string;
  // 第三方任务相关字段
  third_party_task_id?: string;  // 第三方任务ID
  third_party_status?: string;  // 第三方任务状态
  third_party_progress?: number;  // 第三方任务进度
  third_party_input_data?: any;  // 第三方输入数据
  third_party_output_data?: any;  // 第三方输出数据
  third_party_error_message?: string;  // 第三方错误信息
}

export interface CrawlResult {
  id: string;
  result_id?: string;  // 后端返回的字段
  taskId: string;
  task_id?: string;  // 后端返回的字段
  title: string;
  author: string;
  platform: string;
  description?: string;
  matchedKeywords?: string[];
  matched_keywords?: string[];  // 后端返回的字段
  rawJson?: string;
  raw_json?: string;  // 后端返回的字段
  rawHtml?: string;
  raw_html?: string;  // 后端返回的字段
  timestamp: string;
  comments?: Array<{
    user_name: string;
    content: string;
    comment_time?: string;
  }>;
}

// 博客文章相关类型
export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: {
    name: string;
    avatar: string;
  };
  date: string;
  coverImage: string;
  tags: string[];
  status: 'published' | 'draft';
}

// 文章管理相关类型
export interface Article {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  column?: string;
  column_id?: number | null;
  image: string;
  content: string;
  author: string;
  date: string;
}
