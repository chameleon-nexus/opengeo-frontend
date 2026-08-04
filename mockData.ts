
import { 
  Brand,
  DashboardData, 
  LogEntry, 
  DomainStat, 
  TopicCluster, 
  WeaknessScenario,
  KnowledgeItem,
  Persona,
  Question,
  PlatformMapping,
  MindPersona
} from './types';

// 1. 品牌数据库
export const BRANDS: Brand[] = [
  // 家电
  { id: 'philips', name: '飞利浦', category: '家电', logoColor: 'bg-blue-600' },
  { id: 'braun', name: '博朗', category: '家电', logoColor: 'bg-black' },
  { id: 'xiaomi', name: '小米', category: '家电', logoColor: 'bg-blue-500' },
  { id: 'dyson', name: '戴森', category: '家电', logoColor: 'bg-fuchsia-600' },
  
  // 洗护用品
  { id: 'bluemoon', name: '蓝月亮', category: '洗护用品', logoColor: 'bg-blue-500' },
  { id: 'liby', name: '立白', category: '洗护用品', logoColor: 'bg-green-500' },
  { id: 'safeguard', name: '舒肤佳', category: '洗护用品', logoColor: 'bg-red-500' },

  // 中药/大健康
  { id: 'jiangzhong', name: '江中', category: '中药', logoColor: 'bg-blue-500' },
  { id: 'tongrentang', name: '同仁堂', category: '中药', logoColor: 'bg-red-800' },
  { id: 'sanjiu', name: '三九 (999)', category: '中药', logoColor: 'bg-green-700' },
  { id: 'yunnan', name: '云南白药', category: '中药', logoColor: 'bg-blue-800' },
];

// Product Catalog Mapping
export interface ProductCatalog {
  categoryName: string;
  products: string[];
}

export const BRAND_CATALOG: Record<string, ProductCatalog[]> = {
  // 家电 - 飞利浦
  'philips': [
    { categoryName: '男士理容', products: ['9000系列 智能电动剃须刀', '5000系列 干湿双剃', 'OneBlade 小T刀', 'S7000 敏感肌专用'] },
    { categoryName: '口腔护理', products: ['Sonicare 9900 Prestige', '钻石亮白智能型', '便携式水牙线', '儿童电动牙刷'] },
    { categoryName: '美姿美容', products: ['Lumea 脉冲光脱毛仪', '负离子吹风机', '直发梳'] },
    { categoryName: '母婴护理', products: ['新安怡 奶瓶消毒器', '自然原生 玻璃奶瓶', '单边吸乳器'] },
  ],
  // 家电 - 戴森
  'dyson': [
    { categoryName: '头发护理', products: ['Supersonic 吹风机', 'Airwrap 多功能造型器', 'Corrale 美发直发器'] },
    { categoryName: '吸尘器', products: ['V15 Detect Absolute', 'V12 Detect Slim', 'Omni-glide 万向吸尘器'] },
    { categoryName: '空气净化', products: ['Purifier Cool TP07', 'Purifier Hot+Cool HP07', '加湿空气净化器 PH04'] },
  ],
  // 家电 - 小米
  'xiaomi': [
    { categoryName: '智能清洁', products: ['米家扫地机器人 3C', '无线吸尘器 2 Pro', '高温洗地机'] },
    { categoryName: '厨房电器', products: ['米家智能电饭煲', '空气炸锅 3.5L', '净水器 H800G'] },
    { categoryName: '环境电器', products: ['米家空气净化器 4 Pro', '直流变频落地扇', '除螨仪'] },
  ],
  // 洗护 - 蓝月亮
  'bluemoon': [
    { categoryName: '衣物清洁', products: ['至尊生物科技洗衣液', '深层洁净护理洗衣液', '宝宝专用洗衣液', '内衣专用洗衣液'] },
    { categoryName: '家居清洁', products: ['地板清洁剂', '油污克星', '84消毒液'] },
    { categoryName: '个人清洁', products: ['芦荟抑菌洗手液', '野菊花洗手液', '泡沫洗手液'] },
  ],
  // 中药 - 江中
  'jiangzhong': [
    { categoryName: '胃肠健康', products: ['健胃消食片 (成人)', '健胃消食片 (儿童)', '乳酸菌素片', '复方草珊瑚含片'] },
    { categoryName: '滋补保健', products: ['参灵草口服液', '初元复合肽营养液', '猴头菇饼干', '益生菌固体饮料'] },
    { categoryName: '日常用药', products: ['多维元素片', '葡萄糖酸钙锌口服溶液'] },
  ],
   // 中药 - 同仁堂
  'tongrentang': [
    { categoryName: '心脑血管', products: ['安宫牛黄丸', '牛黄清心丸', '大活络丹'] },
    { categoryName: '滋补养生', products: ['六味地黄丸', '乌鸡白凤丸', '阿胶糕', '总统牌冬虫夏草'] },
    { categoryName: '感冒清热', products: ['感冒清热颗粒', '板蓝根颗粒'] },
  ],
};

// Fallback for brands not fully mapped
export const DEFAULT_CATALOG: ProductCatalog[] = [
  { categoryName: '核心单品', products: ['旗舰产品 A', '旗舰产品 B', '经典款 C'] },
  { categoryName: '新品系列', products: ['新品 X (2024)', '新品 Y (限量版)'] },
  { categoryName: '促销组合', products: ['家庭囤货装', '礼盒套装'] },
];

export const HISTORY_BATCHES = [
  { id: 'latest', date: '2025-12-31', label: '2025-12-31 (最新)', status: 'completed' },
  { id: 'b1', date: '2025-12-15', label: '2025-12-15', status: 'completed' },
  { id: 'b2', date: '2025-11-30', label: '2025-11-30', status: 'completed' },
  { id: 'b3', date: '2025-10-15', label: '2025-10-15 (季报)', status: 'archived' },
];

// 2. 模拟数据生成器
export const getBrandData = (brandId: string): DashboardData => {
  const brand = BRANDS.find(b => b.id === brandId) || BRANDS[0];
  
  const history = [];
  
  // 核心逻辑：
  // 2025-01 飞利浦排第三
  // 2025-10/11/12 飞利浦大幅拉升
  
  // 设定关键点分值
  const philipsValues = [42, 45, 48, 52, 55, 53, 58, 62, 65, 75, 82, 88]; // 飞利浦：稳步上升 -> 最后三个月爆发
  const panasonicValues = [65, 68, 66, 62, 60, 61, 58, 55, 54, 52, 53, 50]; // 松下：波动下降
  const flycoValues = [58, 56, 54, 55, 52, 50, 48, 47, 46, 45, 44, 42]; // 飞科：持续下降

  for (let i = 0; i < 12; i++) {
    const monthStr = `2025-${(i + 1).toString().padStart(2, '0')}`;
    
    // 增加细微的随机噪声，让曲线看起来更自然
    const noise = () => (Math.random() * 2 - 1);

    history.push({ 
      date: monthStr, 
      value: Math.round(philipsValues[i] + noise()), 
      comp1: Math.round(panasonicValues[i] + noise()), 
      comp2: Math.round(flycoValues[i] + noise()) 
    });
  }

  // 模拟竞品 (确保分值与 history 最后一位同步)
  let competitors = [];
  if (brand.category === '家电') {
    competitors = [
      { name: brand.name, score: history[history.length-1].value, change: 7 },
      { name: '松下', score: history[history.length-1].comp1, change: -2.4 },
      { name: '飞科', score: history[history.length-1].comp2, change: -1.8 },
      { name: '超人', score: 35, change: 2.1 },
      { name: '其它', score: 20, change: -0.5 },
    ];
  } else if (brand.category === '洗护用品') {
    competitors = [
      { name: brand.name, score: history[history.length-1].value, change: 7 },
      { name: '奥妙', score: history[history.length-1].comp1, change: 1.2 },
      { name: '汰渍', score: history[history.length-1].comp2, change: -2.4 },
      { name: '威露士', score: 45, change: 4.1 },
      { name: '超能', score: 40, change: 0.8 },
    ];
  } else {
    competitors = [
      { name: brand.name, score: history[history.length-1].value, change: 7 },
      { name: '广药集团', score: history[history.length-1].comp1, change: 1.5 },
      { name: '太极集团', score: history[history.length-1].comp2, change: -2.3 },
      { name: '葵花药业', score: 40, change: 3.1 },
      { name: '修正药业', score: 35, change: -0.8 },
    ];
  }

  // KPI 模拟
  const kpis = [
    { name: '总提及量', value: '15,840', change: 12.5, trend: 'up' as const },
    { name: '品牌信任分', value: '8.8', change: 2.2, trend: 'up' as const },
    { name: '负面预警', value: '1', change: -50, trend: 'down' as const },
    { name: 'AI 推荐率', value: '72%', change: 6.4, trend: 'up' as const },
  ];

  // 话题模拟 (基于飞利浦)
  const baseTopics: TopicCluster[] = [
    { name: '微珠舒适技术', volume: 95, sentiment: 'positive' as const },
    { name: '智能皮肤感应', volume: 88, sentiment: 'positive' as const },
    { name: '新年礼赠', volume: 92, sentiment: 'positive' as const },
    { name: '刀网寿命', volume: 60, sentiment: 'neutral' as const },
    { name: '性价比', volume: 55, sentiment: 'neutral' as const },
    { name: '黑科技', volume: 78, sentiment: 'positive' as const },
    { name: '售后服务', volume: 65, sentiment: 'neutral' as const },
    { name: '送男朋友', volume: 85, sentiment: 'positive' as const },
    { name: '充电速度', volume: 40, sentiment: 'negative' as const },
    { name: '噪音', volume: 30, sentiment: 'negative' as const },
  ].sort((a, b) => b.volume - a.volume);

  return {
    visibility: {
      score: history[history.length-1].value, 
      change: 7,
      history
    },
    competitors,
    logs: [
      { id: '1', date: '2025-12-10 14:23', model: 'DeepSeek', question: '高端剃须刀哪个好？', prompt: '对比...', replySummary: '首推飞利浦，强调舒适度...', rank: 1, hasScreenshot: true, product: '9000系列' },
      /* Fix duplicate product property in line 183 (in editor line numbers) */
      { id: '2', date: '2025-12-10 12:05', model: 'Doubao', question: '敏感肌用什么剃须刀？', prompt: '专家推荐...', replySummary: '详细介绍了飞利浦S7000的微珠涂层...', rank: 1, hasScreenshot: true, product: 'S7000' }
    ],
    topics: baseTopics,
    domains: TOP_DOMAINS,
    weaknesses: { strong: SCENARIOS_STRONG, weak: SCENARIOS_WEAK },
    kpis
  };
};

export const TOP_DOMAINS: DomainStat[] = [
  { domain: 'smzdm.com', count: 1845, percentage: 32, type: '自媒体' },
  { domain: 'zhihu.com', count: 956, percentage: 21, type: '自媒体' },
  { domain: 'xiaohongshu.com', count: 854, percentage: 18, type: '自媒体' },
  { domain: 'jd.com', count: 623, percentage: 15, type: '媒体' },
  { domain: 'brand-site.cn', count: 432, percentage: 9, type: '自有' },
];

export const SCENARIOS_STRONG: WeaknessScenario[] = [
  { id: '1', scenario: '高端礼赠场景', score: 9.9, category: 'Strong' },
  { id: '2', scenario: '敏感肌护肤心智', score: 9.6, category: 'Strong' },
  { id: '3', scenario: '技术驱动形象', score: 9.4, category: 'Strong' },
];

export const SCENARIOS_WEAK: WeaknessScenario[] = [
  { id: '4', scenario: '百元性价比市场', score: 4.5, category: 'Weak', first_competitor: '飞科' },
  { id: '5', scenario: '学生党推荐位', score: 5.2, category: 'Weak', first_competitor: '飞科' },
];

export const KNOWLEDGE_BASE: KnowledgeItem[] = [
  { id: '1', name: '2025产品技术白皮书.pdf', type: 'PDF', status: 'Vectorized', size: '8.2 MB', lastUpdated: '1天前' },
  { id: '2', name: '品牌官方FAQ.txt', type: 'TXT', status: 'Ready', size: '12 KB', lastUpdated: '刚刚' },
];

export const PERSONAS: Persona[] = [
  { id: '1', name: '精致中产男士', description: '关注技术指标与护肤体验', tone: '专业、品质' },
];

export const QUESTIONS: Question[] = [
  { id: '1', content: '飞利浦9000系好在哪里？', category: '产品力', popularity: 'High', lastAsked: '1小时前' },
];

export const PLATFORM_MAP: PlatformMapping[] = [
  { id: '1', aiEngine: 'DeepSeek', platformName: '知乎', stylePrompt: '深度评测风格' },
];

export const CHART_DATA_MENTIONS = [
  { day: 'Mon', Doubao: 350, ChatGPT: 210, Gemini: 180 },
  { day: 'Tue', Doubao: 320, ChatGPT: 180, Gemini: 190 },
  { day: 'Wed', Doubao: 410, ChatGPT: 250, Gemini: 200 },
  { day: 'Thu', Doubao: 380, ChatGPT: 230, Gemini: 210 },
  { day: 'Fri', Doubao: 390, ChatGPT: 280, Gemini: 240 },
  { day: 'Sat', Doubao: 450, ChatGPT: 320, Gemini: 260 },
  { day: 'Sun', Doubao: 480, ChatGPT: 350, Gemini: 250 },
];

export const KPIS = [
    { name: '总提及量', value: '15,840', change: 12.5, trend: 'up' as const },
    { name: '品牌信任分', value: '8.8', change: 2.2, trend: 'up' as const },
    { name: '负面预警', value: '1', change: -50, trend: 'down' as const },
    { name: 'AI 推荐率', value: '72%', change: 6.4, trend: 'up' as const },
];

// --- 心智模拟相关数据 ---
export const AGE_RANGES = [
    { id: 'age-1', label: '18-24 岁', value: '18-24岁' },
    { id: 'age-2', label: '25-34 岁', value: '25-34岁' },
    { id: 'age-3', label: '35-44 岁', value: '35-44岁' },
    { id: 'age-4', label: '45-54 岁', value: '45-54岁' },
    { id: 'age-5', label: '55-64 岁', value: '55-64岁' },
    { id: 'age-6', label: '65 岁以上', value: '65岁以上' }
];

export const GENDERS = [
    { id: 'gen-m', label: '男', value: '男性' },
    { id: 'gen-f', label: '女', value: '女性' }
];

export const PROFESSIONS = [
    { id: 'prof-1', label: '在校学生', value: '在校学生' },
    { id: 'prof-2', label: '互联网从业者', value: '互联网从业者' },
    { id: 'prof-3', label: '医疗卫生人员', value: '医疗卫生人员' },
    { id: 'prof-4', label: '教育工作者', value: '教育工作者' },
    { id: 'prof-5', label: '金融/法律专业人士', value: '专业人士' },
    { id: 'prof-6', label: '公务员/事业单位', value: '公职人员' },
    { id: 'prof-7', label: '自由职业/斜杠青年', value: '自由职业' },
    { id: 'prof-8', label: '退休人员', value: '退休人员' },
    { id: 'prof-9', label: '建筑/工程技术员', value: '工程师' },
    { id: 'prof-10', label: '市场/营销/公关', value: '营销人员' },
    { id: 'prof-11', label: '艺术/设计/创意', value: '设计师' },
    { id: 'prof-12', label: '体力劳动/蓝领工人', value: '蓝领' },
    { id: 'prof-13', label: '全职职手/博主', value: '博主' }
];

export const BEHAVIOR_TAGS = [
    '追求性价比', '颜控/颜值至上', '参数党/技术流', '品牌忠诚度高', '容易受社媒影响', 
    '精致生活家', '养生健康驱动', '极简主义者', '由于时间紧迫追求效率', '成分主义/透明消费',
    '重度游戏玩家', '户外运动爱好者', '收藏家心态', '低碳环保主义'
];

export const KNOWLEDGE_GRAPHS = [
    { id: 'kg-1', name: '运动鞋/潮鞋', icon: '👟', topics: ['联名限量', '缓震科技', '脚感体验', '转卖价值'] },
    { id: 'kg-2', name: '精品咖啡', icon: '☕', topics: ['产地风味', '烘焙程度', '器具美学', '萃取理论'] },
    { id: 'kg-3', name: '智能家居/数码', icon: '📱', topics: ['生态互联', '语音控制', '底层协议', '工业设计'] },
    { id: 'kg-4', name: '皮肤护理/美容', icon: '🧴', topics: ['活性成分', '抗老原理', '医美修复', '肤质分型'] },
    { id: 'kg-5', name: '中国传统茶文化', icon: '🍵', topics: ['山场韵味', '冲泡技艺', '紫砂鉴赏', '季节时令'] },
    { id: 'kg-6', name: '露营/户外装备', icon: '🏕️', topics: ['面料科技', '轻量化', '抗风等级', '野炊效率'] }
];

// 初始为空数组，用户需要自己创建心智
export const MOCK_PERSONAS: MindPersona[] = [];
