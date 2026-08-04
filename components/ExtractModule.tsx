
import React, { useState, useRef, useEffect } from 'react';
import { 
    Search, Upload, BookOpen, Play, Loader2, Target, Check, 
    Layers3, RefreshCw, ArrowRight, Timer, Activity, Globe, 
    Wand2, AlertCircle, Sparkles, Download, ChevronLeft, ChevronRight,
    Zap, Database, ArrowLeft, Package, X
} from 'lucide-react';
import { Theme, Brand } from '../types';
import { knowledgeBaseAPI, KnowledgeBase } from '../api/knowledgeBase';
import { knowledgeAPI } from '../api/knowledge';
import { semanticSEOAPI } from '../api/semanticSeo';
import { SemanticSEOTask } from '../types';
import { useBrandCatalog } from '../hooks/useBrandCatalog';
import { useModuleI18n } from '../i18n/hooks';
import { getApiOrigin } from '../lib/apiOrigin';
import KeywordVisualizationRadial from './KeywordVisualizationRadial';

interface ExtractModuleProps {
  theme: Theme;
  currentBrand: Brand | null;
  selectedProduct: string | null;
  onNavigateToAnalyze: () => void;
  onBack?: () => void;
  initialTaskId?: string | null;
}

// 移除mock数据，改为从API获取

const SHAVING_KEYWORDS = [
    {text: '智能胡须感应', score: 98}, {text: '微珠舒适涂层', score: 95}, {text: '360度灵动刀头', score: 92}, {text: '钢精精密刀片', score: 90}, 
    {text: '每秒500次检测', score: 88}, {text: '多功能清洗中心', score: 85}, {text: '干湿双剃技术', score: 84}, {text: 'Pop-up修剪器', score: 82}, 
    {text: 'OLED实时反馈', score: 80}, {text: 'USB-C快充', score: 78}, {text: '60分钟超长续航', score: 76}, {text: '人体工学防滑柄', score: 75}, 
    {text: '全身水洗机身', score: 94}, {text: '旅行锁保护', score: 72}, {text: '刀头更换提醒', score: 70}, {text: '低噪音电机', score: 68}, 
    {text: '自磨刃技术', score: 89}, {text: '高转速马达', score: 91}, {text: '肤质自适应系统', score: 93}, {text: '纳米级钢材', score: 87}, 
    {text: '逆向切割保护', score: 83}, {text: '商务出行首选', score: 81}, {text: '高端男士礼赠', score: 99}, {text: '敏感肌专研', score: 96}, 
    {text: '防夹须技术', score: 94}, {text: '压力传感器', score: 88}, {text: '蓝牙APP智连', score: 72}, {text: '胡须密度分析', score: 79}, 
    {text: '精密梳齿技术', score: 77}, {text: '抗菌防护刀网', score: 85}, {text: '钛金材质刀头', score: 82}, {text: '过敏体质适用', score: 90}, 
    {text: '剃须力度引导', score: 84}, {text: '极致干净度', score: 97}, {text: '皮肤摩擦阻力', score: 74}, {text: '鬓角精准修剪', score: 78}, 
    {text: 'V型刀片系统', score: 86}, {text: '舒适切剃角度', score: 81}, {text: '刀网耐用寿命', score: 65}, {text: '清洁液自动配比', score: 69}, 
    {text: '一刻钟紧急充电', score: 73}, {text: '磨砂金属质感', score: 71}, {text: '旗舰级马达', score: 92}, {text: '专业理容导师', score: 88}, 
    {text: '深层洁净力', score: 95}, {text: '柔肤保护模式', score: 89}, {text: '长胡须预处理', score: 76}, {text: '短硬茬一扫净', score: 84}, 
    {text: '弧面贴合技术', score: 82}, {text: '智能电量百分比', score: 67}, {text: '航空级材料', score: 79}, {text: '便携旅行盒', score: 70}, 
    {text: '温和不伤肤', score: 93}, {text: '极致剃须回馈', score: 85}, {text: '精准贴合死角', score: 87}, {text: '全球通用电压', score: 66}, 
    {text: '下颚轮廓适配', score: 81}, {text: '快充5分钟可用', score: 72}, {text: '高效理容体验', score: 88}, {text: '智能恒温技术', score: 64}
];

const KEY_POOLS = [
    SHAVING_KEYWORDS.slice(0, 30),
    SHAVING_KEYWORDS.slice(30, 60),
    SHAVING_KEYWORDS.sort(() => Math.random() - 0.5).slice(0, 20)
];

// 造句扩词默认词表（与造句工具一致）
const DEFAULT_PREFIX_WORDS = '口碑好的\n比较好的\n靠谱的\n有实力的\n专业的\n知名的\n评价高的\n优秀的\n性价比高的\n信誉好的\n行业知名的\n顶尖的\n诚信的\n可靠的\n有名的\n口碑不错的';
const DEFAULT_INDUSTRY_WORDS = '厂家\n制造厂\n供应商\n生产厂家\n源头厂家\n批发厂家\n定制厂家\n定做厂家\n订购厂家\n批发商\n销售厂家\n企业\n生产商\n销售公司\n供应厂家\n品牌\n品牌公司\n公司\n平台\n服务商\n厂商\n生产厂商\n优质厂家\n实力厂家\n工厂\n直销厂家\n直销工厂\n直销厂商';
const DEFAULT_SUFFIX_WORDS = '找哪家\n选哪家\n怎么联系\n推荐几家\n推荐\n怎么选择\n怎么选\n口碑推荐\n联系方式\n推荐哪家\n业内推荐\n选择标准\n如何选择';
const DEFAULT_REGION_WORDS = '北京\n上海\n广州\n深圳';

const SHAVER_EXPANSION_TEMPLATES = [
    "哪个品牌的{brand}刀网材质更好，{comp1}还是{comp2}？",
    "针对{issue}，{brand}的防刺激技术是否比其他品牌更有效？",
    "出差使用{brand}，续航和便携性表现如何？",
    "如何评价{brand}的智能感应技术对剃须体验的提升？",
    "对于商务礼赠，{brand}的旗舰系列档次感是否足够？",
    "{brand}对比{comp1}，在极致干净度上哪个更胜一筹？",
    "长期使用{brand}，刀头的耐用程度和更换成本大概是多少？",
    "关于{brand}的全身水洗功能，清洁液的消耗速度快吗？",
    "{brand}是否有针对敏感肌的专业理容指南？",
    "新手入门选择{brand}的哪一个系列性价比最高？"
];

const ExtractModule: React.FC<ExtractModuleProps> = ({ theme, currentBrand, selectedProduct: initialSelectedProduct, onNavigateToAnalyze, onBack, initialTaskId }) => {
  const { t } = useModuleI18n('extract');
  const isDark = theme === 'dark';
  const { catalog } = useBrandCatalog(currentBrand);
  const [selectedProduct, setSelectedProduct] = useState<string>(initialSelectedProduct || '');
  
  // 获取所有产品列表（扁平化）
  const allProducts = catalog.flatMap(cat => cat.products);
  
  const [step, setStep] = useState<'source' | 'keywords' | 'waiting' | 'expanded'>('source');
  const [isProcessing, setIsProcessing] = useState(false);
  const [iteration, setIteration] = useState(1);
  const [convergenceRate, setConvergenceRate] = useState(0);
  // 移除sourceType，只保留知识库选择
  const [selectedKbId, setSelectedKbId] = useState<number | null>(null);
  const [modelType, setModelType] = useState<'semantic' | 'traditional' | 'semantic_v2' | 'word_expand'>('semantic');  // 模型类型：语义1 / 传统 / 语义2 / 扩词
  const [currentKeyKeywords, setCurrentKeyKeywords] = useState<Array<{text: string, score: number, isRetained?: boolean}>>([]);
  const [longtailQuestions, setLongtailQuestions] = useState<Array<{text: string, source_keyword: string}>>([]);
  const [semanticExtensionQuestions, setSemanticExtensionQuestions] = useState<Array<{text: string, source_keyword: string}>>([]);
  
  // 传统模型专用状态
  const [coreKeywords, setCoreKeywords] = useState<Array<{text: string, score: number}>>([]);  // 核心关键词（5个）
  const [positiveQuestions, setPositiveQuestions] = useState<string[]>([]);
  const [negativeQuestions, setNegativeQuestions] = useState<string[]>([]);
  const [brandQuestions, setBrandQuestions] = useState<string[]>([]);
  
  // 语义模型2 专用状态（5 Tab）
  const [brandPackQuestions, setBrandPackQuestions] = useState<string[]>([]);
  const [qaPackQuestions, setQaPackQuestions] = useState<string[]>([]);
  const [competitorPackQuestions, setCompetitorPackQuestions] = useState<string[]>([]);
  const [semanticV2ActiveTab, setSemanticV2ActiveTab] = useState<'core' | 'brand_pack' | 'qa_pack' | 'competitor_pack' | 'semantic_pack'>('core');
  
  // 页签状态：语义模型用一套，传统模型用另一套
  const [semanticActiveTab, setSemanticActiveTab] = useState<'keywords' | 'longtail' | 'semantic'>('keywords');
  const [traditionalActiveTab, setTraditionalActiveTab] = useState<'core' | 'positive' | 'negative' | 'brand'>('core');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);  // 只存储文本，用于快速查找
  const [expandedKeywords, setExpandedKeywords] = useState<Array<{id: number, text: string, vol: number, competition: string}>>([]);
  const [extractPage, setExtractPage] = useState(1);
  const itemsPerPage = 12;
  const [sentenceExpandLoading, setSentenceExpandLoading] = useState(false);  // 造句扩词加载中
  const [sentenceExpandModalOpen, setSentenceExpandModalOpen] = useState(false);
  const [sentenceExpandRegion, setSentenceExpandRegion] = useState('');
  const [sentenceExpandPrefix, setSentenceExpandPrefix] = useState(DEFAULT_PREFIX_WORDS);
  const [sentenceExpandCoreOptions, setSentenceExpandCoreOptions] = useState<string[]>([]);  // 核心词下拉选项（当前语义关键词）
  const [sentenceExpandSelectedCores, setSentenceExpandSelectedCores] = useState<string[]>([]);  // 选中的核心词
  const [sentenceExpandIndustry, setSentenceExpandIndustry] = useState(DEFAULT_INDUSTRY_WORDS);
  const [sentenceExpandSuffix, setSentenceExpandSuffix] = useState(DEFAULT_SUFFIX_WORDS);
  const [sentenceExpandResult, setSentenceExpandResult] = useState<Array<{ text: string; source_keyword: string }>>([]);
  const [sentenceExpandMaxPerWord, setSentenceExpandMaxPerWord] = useState(100);
  
  // 迭代相关状态
  const [retainedKeywords, setRetainedKeywords] = useState<Array<{text: string, score: number}>>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  
  // Agent思考过程状态
  const [thinkingSteps, setThinkingSteps] = useState<Array<{
    step: string;
    status: 'running' | 'completed' | 'error';
    message: string;
    timestamp: number;
  }>>([]);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  
  // 真实知识库列表
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [isLoadingKbs, setIsLoadingKbs] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);
  
  // Query和期望条数（传统模型每个维度的问题数量，默认10）
  const [taskName, setTaskName] = useState<string>('');  // 任务名称
  const [query, setQuery] = useState<string>('');
  const [expectedCount, setExpectedCount] = useState<number>(10);  // 传统模型：10个问题/维度

  // 造句扩词：解析词表（换行或逗号分隔，去空）
  const parseWords = (s: string): string[] => s.split(/[\n,，]/).map(w => w.trim()).filter(Boolean);
  const runSentenceExpandPreview = () => {
    const cores = sentenceExpandSelectedCores.filter(Boolean);
    const prefixes = parseWords(sentenceExpandPrefix);
    const industries = parseWords(sentenceExpandIndustry);
    const suffixes = parseWords(sentenceExpandSuffix);
    const regionsRaw = parseWords(sentenceExpandRegion);
    const regionsList = regionsRaw.length > 0 ? regionsRaw : [''];
    if (!cores.length) {
      alert('请填写核心词');
      return;
    }
    if (!prefixes.length || !industries.length || !suffixes.length) {
      alert('请填写前缀词、行业词、后缀词');
      return;
    }
    const questions: Array<{ text: string; source_keyword: string }> = [];
    for (const core of cores) {
      let count = 0;
      for (const r of regionsList) {
        if (count >= sentenceExpandMaxPerWord) break;
        for (const p of prefixes) {
          if (count >= sentenceExpandMaxPerWord) break;
          for (const ind of industries) {
            if (count >= sentenceExpandMaxPerWord) break;
            for (const s of suffixes) {
              if (count >= sentenceExpandMaxPerWord) break;
              questions.push({ text: r + p + core + ind + s, source_keyword: core });
              count++;
            }
          }
        }
      }
    }
    setSentenceExpandResult(questions);
  };
  
  /** 从「知识图谱」模块拉取的真实任务列表；提炼接口暂不传该字段，仅作侧栏选择展示 */
  const [selectedSeoTask, setSelectedSeoTask] = useState<string | null>(null);
  const [seoTasks, setSeoTasks] = useState<SemanticSEOTask[]>([]);
  const [isLoadingSeoTasks, setIsLoadingSeoTasks] = useState(false);
  
  // 图表可视化模式
  const [visualizationMode, setVisualizationMode] = useState<'v1' | null>(null);

  // 同步外部传入的 selectedProduct
  useEffect(() => {
    if (initialSelectedProduct !== undefined) {
      setSelectedProduct(initialSelectedProduct || '');
    }
  }, [initialSelectedProduct]);

  // 加载知识库列表
  useEffect(() => {
    loadKnowledgeBases();
  }, []);

  useEffect(() => {
    loadSeoTasks();
  }, []);

  // 如果有 initialTaskId，加载历史任务数据
  useEffect(() => {
    if (initialTaskId) {
      loadHistoryTask(initialTaskId);
    }
  }, [initialTaskId]);

  const loadHistoryTask = async (taskId: string) => {
    try {
      setIsProcessing(true);
      setStep('waiting');
      setThinkingSteps([{
        step: 'loading_history',
        status: 'running',
        message: '正在加载历史任务数据...',
        timestamp: Date.now()
      }]);
      
      // 获取任务的完整数据
      const result = await knowledgeAPI.getExtractionTaskKeywords(taskId);
      
      // 根据模型类型处理不同的数据结构
      const resultModelType = result.model_type || 'semantic';
      
      if (resultModelType === 'traditional') {
        // 传统模型数据
        const core = result.core_keywords || [];
        const positive = result.positive_questions || [];
        const negative = result.negative_questions || [];
        const brand = result.brand_questions || [];
        
        if (core.length > 0 || positive.length > 0 || negative.length > 0 || brand.length > 0) {
          // 设置模型类型
          setModelType('traditional');
          
          // 设置传统模型数据
          setCoreKeywords(core.map((kw: any) => ({
            text: typeof kw === 'string' ? kw : kw.text || kw,
            score: typeof kw === 'object' && kw.score ? kw.score : 80
          })));
          setPositiveQuestions(positive);
          setNegativeQuestions(negative);
          setBrandQuestions(brand);
          
          setStep('keywords');
          setIteration(1);
          setConvergenceRate(100);
          
          setThinkingSteps([{
            step: 'loading_history',
            status: 'completed',
            message: `历史任务数据加载完成：核心词${core.length}个，正向${positive.length}个，负面${negative.length}个，品牌${brand.length}个`,
            timestamp: Date.now()
          }]);
        } else {
          alert('该任务没有数据');
          setStep('source');
        }
      } else if (result.model_type === 'word_expand') {
        // 扩词工具保存的词包：无 tab，仅展示词条列表
        const phrases = (result.longtail_questions || []).map((q: { text?: string; source_keyword?: string }) => (typeof q === 'string' ? q : (q?.text ?? '')));
        const list = phrases.filter(Boolean).length ? phrases : (result.keywords || []).map((k: { text?: string }) => (typeof k === 'string' ? k : k?.text ?? ''));
        if (list.length > 0) {
          setModelType('word_expand');
          setLongtailQuestions(list.map((text: string) => ({ text, source_keyword: '' })));
          setStep('keywords');
          setThinkingSteps([{
            step: 'loading_history',
            status: 'completed',
            message: `扩词结果加载完成：共 ${list.length} 条词条`,
            timestamp: Date.now()
          }]);
        } else {
          alert('该任务没有数据');
          setStep('source');
        }
      } else if (result.model_type === 'semantic_v2') {
        // 语义模型2 数据（5 Tab）
        const semanticKeywords = result.semantic_keywords || result.keywords || [];
        const longtailQuestionsData = result.longtail_questions || [];
        const semanticExtensionQuestionsData = result.semantic_extension_questions || [];
        const brandPack = result.brand_pack_questions || [];
        const qaPack = result.qa_pack_questions || [];
        const competitorPack = result.competitor_pack_questions || [];
        if (semanticKeywords.length > 0 || longtailQuestionsData.length > 0 || semanticExtensionQuestionsData.length > 0 || brandPack.length > 0 || qaPack.length > 0 || competitorPack.length > 0) {
          setModelType('semantic_v2');
          if (semanticKeywords.length > 0) {
            setCurrentKeyKeywords(semanticKeywords.map((kw: any) => ({ ...kw, isRetained: false })));
          }
          setLongtailQuestions(longtailQuestionsData);
          setSemanticExtensionQuestions(semanticExtensionQuestionsData);
          setBrandPackQuestions(brandPack);
          setQaPackQuestions(qaPack);
          setCompetitorPackQuestions(competitorPack);
          setStep('keywords');
          setIteration(1);
          setConvergenceRate(76);
          setThinkingSteps([{
            step: 'loading_history',
            status: 'completed',
            message: `语义模型2 历史任务加载完成：核心词${semanticKeywords.length}个，品牌词包${brandPack.length}个，问答词包${qaPack.length}个，竞品词包${competitorPack.length}个，语义词包${longtailQuestionsData.length + semanticExtensionQuestionsData.length}个`,
            timestamp: Date.now()
          }]);
        } else {
          alert('该任务没有数据');
          setStep('source');
        }
      } else {
        // 语义模型数据
      const semanticKeywords = result.semantic_keywords || result.keywords || [];
      const longtailQuestions = result.longtail_questions || [];
      const semanticExtensionQuestions = result.semantic_extension_questions || [];
      
      if (semanticKeywords.length > 0 || longtailQuestions.length > 0 || semanticExtensionQuestions.length > 0) {
          // 设置模型类型
          setModelType('semantic');
          
        // 设置语义关键词
        if (semanticKeywords.length > 0) {
          setCurrentKeyKeywords(semanticKeywords.map(kw => ({ ...kw, isRetained: false })));
        }
        
        // 设置长尾问题
        setLongtailQuestions(longtailQuestions);
        
        // 设置语义扩展问题
        setSemanticExtensionQuestions(semanticExtensionQuestions);
        
        setStep('keywords');
        setIteration(1);
        setConvergenceRate(76);
        
        setThinkingSteps([{
          step: 'loading_history',
          status: 'completed',
          message: `历史任务数据加载完成：${semanticKeywords.length}个核心词，${longtailQuestions.length}个长尾问题，${semanticExtensionQuestions.length}个语义扩展问题`,
          timestamp: Date.now()
        }]);
      } else {
        alert('该任务没有数据');
        setStep('source');
        }
      }
    } catch (err) {
      console.error('加载历史任务数据失败:', err);
      alert(err instanceof Error ? err.message : '加载历史任务数据失败');
      setStep('source');
      setThinkingSteps([{
        step: 'loading_history',
        status: 'error',
        message: '加载历史任务数据失败',
        timestamp: Date.now()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const loadKnowledgeBases = async () => {
    setIsLoadingKbs(true);
    setKbError(null);
    try {
      // 只查询当前品牌的知识库
      const brandId = currentBrand?.id;
      const response = await knowledgeBaseAPI.list(brandId);
      setKnowledgeBases(response.knowledge_bases);
    } catch (err) {
      setKbError(err instanceof Error ? err.message : '加载知识库失败');
      console.error('加载知识库失败:', err);
    } finally {
      setIsLoadingKbs(false);
    }
  };

  // 加载知识图谱列表（语义 SEO 已落库任务）
  const loadSeoTasks = async () => {
    setIsLoadingSeoTasks(true);
    try {
      const tasks = await semanticSEOAPI.listTasks({
        limit: 50,
      });
      const list = tasks || [];
      setSeoTasks(list);
      setSelectedSeoTask((prev) => {
        if (prev && list.some((t) => t.task_id === prev)) return prev;
        if (list.length > 0) return list[0].task_id;
        return null;
      });
    } catch (err) {
      console.error('加载知识图谱失败:', err);
      setSeoTasks([]);
      setSelectedSeoTask(null);
    } finally {
      setIsLoadingSeoTasks(false);
    }
  };

  const startInitialExtract = async () => {
    if (!selectedKbId) {
      alert('请先选择一个知识库');
      return;
    }
    
    setIsProcessing(true);
    setThinkingSteps([]);  // 清空之前的思考步骤
    
    try {
      // 从知识库提取关键词（RAG提取 -> AI联网搜索生成SEO关键词）
      const extractQuery = query || `${currentBrand?.name ?? ''} ${selectedProduct || ''} 产品特点 技术参数 用户关注点`;
      const result = await knowledgeAPI.extract({
        knowledge_base_id: selectedKbId,
        query: extractQuery,
        name: taskName.trim() || undefined,  // 任务名称
        top_k: expectedCount,
        brand_name: currentBrand?.name ?? undefined,
        product_name: selectedProduct || undefined,
        model_selection: 'doubao',  // 固定使用默认模型
        model_type: modelType  // 传递模型类型：semantic 或 traditional
      });
      
      // 保存task_id
      if (result.task_id) {
        setCurrentTaskId(result.task_id);
        
        // 订阅SSE流式推送（只要有task_id就订阅）
        console.log('📡 准备订阅SSE流，task_id:', result.task_id);
        subscribeToProgress(result.task_id);
      } else {
        console.warn('⚠️ 未收到task_id，无法订阅SSE流');
      }
      
      // 如果同步返回了结果（兼容旧版本，但这种情况不应该发生，因为现在都是异步）
      if (result.keywords && result.keywords.length > 0) {
        console.log('⚠️ 收到同步返回结果（旧版本兼容）');
        setRetainedKeywords([]);
        setIteration(1);
        setCurrentKeyKeywords(result.keywords.map(kw => ({ ...kw, isRetained: false })));
        setStep('keywords');
        setConvergenceRate(76);
        setIsProcessing(false);
      } else {
        // 异步模式：设置等待状态，等待SSE推送结果
        console.log('⏳ 进入异步模式，等待SSE推送...');
        setStep('waiting');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '提取关键词失败');
      console.error('提取关键词失败:', err);
      setIsProcessing(false);
    }
  };
  
  const subscribeToProgress = (taskId: string) => {
    // 关闭之前的连接
    if (eventSource) {
      console.log('🔌 关闭旧的连接');
      if ((eventSource as any).close) {
        (eventSource as any).close();
      }
    }
    
    // WebSocket URL (企业级方案：替代 SSE)
    const baseURL = getApiOrigin();
    const wsUrl = baseURL.replace(/^http/, 'ws') + `/api/knowledge/extract/ws/${taskId}`;
    
    console.log('====== WebSocket 订阅开始 ======');
    console.log('🔗 连接 URL:', wsUrl);
    console.log('🆔 taskId:', taskId);
    console.log('==========================');
    
    // 创建 WebSocket 连接（企业级：自动重连 + 心跳）
    const ws = new WebSocket(wsUrl);
    setEventSource(ws as any);
    
    // 心跳定时器
    let heartbeatTimer: NodeJS.Timeout | null = null;
    
    ws.onopen = () => {
      console.log('✅ WebSocket 连接已建立');
      
      // 启动心跳（每30秒发送一次ping，保活连接）
      heartbeatTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            console.log('💓 发送心跳');
          } catch (err) {
            console.error('❌ 心跳发送失败:', err);
          }
        }
      }, 30000);
    };
    
    ws.onmessage = (event) => {
      console.log('====== 收到 WebSocket 消息 ======');
      console.log('📨 [DATA]:', event.data);
      
      try {
        const data = JSON.parse(event.data);
        console.log('📦 解析后的数据:', data);
        
        // 处理连接确认
        if (data.type === 'connected') {
          console.log('✅ WebSocket 连接已确认:', data.task_id);
          return;
        }
        
        // 处理心跳响应（ping/pong）
        if (data.type === 'ping' || data.type === 'pong') {
          console.log('💓 收到心跳响应');
          return;
        }
        
        // 检查是否是结束标记
        if (data.type === 'end') {
          console.log('✅ WebSocket 流结束');
          ws.close();
          setIsProcessing(false);
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          return;
        }
        
        // 添加思考步骤
        console.log('📝 准备更新 thinkingSteps...');
        setThinkingSteps(prev => {
          const newSteps = [...prev];
          const existingIndex = newSteps.findIndex(s => s.step === data.step);
          
          const stepData = {
            step: data.step || 'unknown',
            status: data.status || 'running',
            message: data.message || '处理中...',
            timestamp: Date.now()
          };
          
          console.log('📝 新步骤数据:', stepData);
          
          if (existingIndex >= 0) {
            newSteps[existingIndex] = stepData;
          } else {
            newSteps.push(stepData);
          }
          
          console.log('📊 当前思考步骤数量:', newSteps.length);
          return newSteps;
        });
        
        // 如果收到完成事件且包含数据，更新关键词
        if (data.status === 'completed' && data.step === 'complete' && data.data) {
          // 根据模型类型解析不同的数据结构
          if (modelType === 'traditional') {
            // 传统模型数据结构
            const core = data.data.core_keywords || [];
            const positive = data.data.positive_questions || [];
            const negative = data.data.negative_questions || [];
            const brand = data.data.brand_questions || [];
            
            console.log('✅ 收到传统模型最终结果:');
            console.log('  - 核心关键词数量:', core.length);
            console.log('  - 正向问题数量:', positive.length);
            console.log('  - 负面问题数量:', negative.length);
            console.log('  - 品牌问题数量:', brand.length);
            
            // 设置传统模型专用状态
            setCoreKeywords(core.map((kw: any) => ({
              text: typeof kw === 'string' ? kw : kw.text || kw,
              score: typeof kw === 'object' && kw.score ? kw.score : 0
            })));
            setPositiveQuestions(positive);
            setNegativeQuestions(negative);
            setBrandQuestions(brand);
            
            setStep('keywords');
            setIteration(1);
            setConvergenceRate(100);
            setIsProcessing(false);
            
            setThinkingSteps([{
              step: 'complete',
              status: 'completed',
              message: `传统模型生成完成：核心词${core.length}个，正向${positive.length}个，负面${negative.length}个，品牌${brand.length}个`,
              timestamp: Date.now()
            }]);
            
            return; // 传统模型处理完成，直接返回
          }
          
          if (modelType === 'semantic_v2') {
            const semanticKeywords = data.data.semantic_keywords || [];
            const longtailQuestionsV2 = data.data.longtail_questions || [];
            const semanticExtensionQuestionsV2 = data.data.semantic_extension_questions || [];
            const brandPack = data.data.brand_pack_questions || [];
            const qaPack = data.data.qa_pack_questions || [];
            const competitorPack = data.data.competitor_pack_questions || [];
            setCurrentKeyKeywords(semanticKeywords.map((kw: any) => ({ ...kw, isRetained: false })));
            setLongtailQuestions(longtailQuestionsV2);
            setSemanticExtensionQuestions(semanticExtensionQuestionsV2);
            setBrandPackQuestions(brandPack);
            setQaPackQuestions(qaPack);
            setCompetitorPackQuestions(competitorPack);
            setStep('keywords');
            setIteration(1);
            setConvergenceRate(76);
            setIsProcessing(false);
            setThinkingSteps([{
              step: 'complete',
              status: 'completed',
              message: `语义模型2 生成完成：核心词${semanticKeywords.length}个，品牌词包${brandPack.length}个，问答词包${qaPack.length}个，竞品词包${competitorPack.length}个，语义词包${longtailQuestionsV2.length + semanticExtensionQuestionsV2.length}个`,
              timestamp: Date.now()
            }]);
            return;
          }
          
          // 语义模型数据结构
          const semanticKeywords = data.data.semantic_keywords || [];
          const longtailQuestions = data.data.longtail_questions || [];
          const semanticExtensionQuestions = data.data.semantic_extension_questions || [];
          
          console.log('✅ 收到语义模型最终结果:');
          console.log('  - 语义关键词数量:', semanticKeywords.length);
          console.log('  - 长尾问题数量:', longtailQuestions.length);
          console.log('  - 语义扩展问题数量:', semanticExtensionQuestions.length);
          
          // 更新长尾问题和语义扩展问题
          setLongtailQuestions(longtailQuestions);
          setSemanticExtensionQuestions(semanticExtensionQuestions);
          
          // 兼容旧格式：如果只有 keywords 字段，说明是旧版本
          const allKeywords = semanticKeywords.length > 0 ? semanticKeywords : (data.data.keywords || []);
          
          if (allKeywords.length > 0 || longtailQuestions.length > 0 || semanticExtensionQuestions.length > 0) {
            // 检查是否有保留的关键词（迭代模式）
            setRetainedKeywords(prevRetained => {
              if (prevRetained && prevRetained.length > 0) {
                // 迭代模式：合并保留词和新词
                console.log('🔄 迭代模式：合并保留词和新词');
                console.log('📊 保留词数量:', prevRetained.length, '新词数量:', allKeywords.length);
                
                // 限制新词数量为期望条数（避免生成过多）
                const newKeywords = allKeywords.slice(0, expectedCount);
                console.log('✂️ 限制后新词数量:', newKeywords.length);
                
                // 标记保留词和新词
                const retainedWithFlag = prevRetained.map((kw: any) => ({ 
                  ...kw, 
                  isRetained: true,
                  source: 'retained'  // 标记来源
                }));
                const newWithFlag = newKeywords.map((kw: any) => ({ 
                  ...kw, 
                  isRetained: false,
                  source: 'new'  // 标记来源
                }));
                
                // 合并
                const merged = [...retainedWithFlag, ...newWithFlag];
                
                // 去重（如果新词和保留词重复，保留标记为 isRetained: true 的）
                const uniqueKeywords: Array<{text: string, score: number, isRetained?: boolean, source?: string}> = [];
                const seen = new Set<string>();
                for (const kw of merged) {
                  if (!seen.has(kw.text)) {
                    seen.add(kw.text);
                    uniqueKeywords.push(kw);
                  } else {
                    // 如果重复，优先保留标记为 isRetained 的
                    const existingIndex = uniqueKeywords.findIndex(k => k.text === kw.text);
                    if (existingIndex >= 0 && kw.isRetained && !uniqueKeywords[existingIndex].isRetained) {
                      uniqueKeywords[existingIndex] = kw;
                    }
                  }
                }
                
                // 按分数排序（保留的关键词优先）
                uniqueKeywords.sort((a, b) => {
                  if (a.isRetained && !b.isRetained) return -1;
                  if (!a.isRetained && b.isRetained) return 1;
                  return b.score - a.score;
                });
                
                console.log('📋 最终合并结果:', {
                  total: uniqueKeywords.length,
                  retained: uniqueKeywords.filter(k => k.isRetained).length,
                  new: uniqueKeywords.filter(k => !k.isRetained).length
                });
                
                setCurrentKeyKeywords(uniqueKeywords);
                setConvergenceRate(prev => {
                  if (prev < 80) return 88;
                  if (prev < 90) return 96;
                  return Math.min(99, prev + 1);
                });
                
                return prevRetained; // 保持保留词列表
              } else {
                // 首次提取模式
                console.log('🆕 首次提取模式');
                setIteration(1);
                // 限制数量为期望条数
                const limitedKeywords = allKeywords.slice(0, expectedCount);
                setCurrentKeyKeywords(limitedKeywords.map((kw: any) => ({ 
                  ...kw, 
                  isRetained: false,
                  source: 'new'
                })));
                setConvergenceRate(76);
                return [];
              }
            });
            
            setSelectedKeywords([]);
            setStep('keywords');
            setIsProcessing(false);
          }
        }
        
        // 如果收到错误事件
        if (data.status === 'error') {
          console.error('❌ 收到错误事件:', data.message);
          alert(data.message || '提取失败');
          setIsProcessing(false);
          ws.close();
          if (heartbeatTimer) clearInterval(heartbeatTimer);
        }
      } catch (err) {
        console.error('❌ 解析 WebSocket 数据失败:', err);
        console.error('❌ 原始数据:', event.data);
      }
    };
    
    ws.onerror = (error) => {
      console.error('====== WebSocket 连接错误 ======');
      console.error('❌ WebSocket 错误:', error);
      console.error('=========================');
    };
    
    ws.onclose = (event) => {
      console.log('====== WebSocket 连接关闭 ======');
      console.log('📡 关闭代码:', event.code);
      console.log('📡 关闭原因:', event.reason);
      console.log('📡 是否正常关闭:', event.wasClean);
      console.log('=========================');
      
      setIsProcessing(false);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      
      // 如果是异常断开（非1000正常关闭），考虑重连
      if (!event.wasClean && event.code !== 1000) {
        console.warn('⚠️ 检测到异常断开，可能需要重连');
        // 这里可以实现自动重连逻辑（企业级需求）
        // 暂时不自动重连，让用户手动处理
      }
    };
  };
  
  // 清理连接（支持 WebSocket）
  React.useEffect(() => {
    return () => {
      if (eventSource) {
        if ((eventSource as any).close) {
          (eventSource as any).close();
        }
      }
    };
  }, [eventSource]);

  const submitForIteration = async () => {
    if (selectedKeywords.length === 0) {
      alert('请至少选择几个关键词作为下一轮迭代的基础');
      return;
    }
    
    if (!selectedKbId) {
      alert('请先选择一个知识库');
      return;
    }
    
    setIsProcessing(true);
    setStep('waiting');
    setThinkingSteps([]);  // 清空之前的思考步骤
    
    try {
      const extractQuery = query || `${currentBrand?.name ?? ''} ${selectedProduct || ''} 产品特点 技术参数 用户关注点`;
      
      // Step 1: 保存选中的关键词（包含分数）
      // 从 currentKeyKeywords 中获取选中关键词的完整信息（包含分数）
      const selectedKeywordsWithScore = currentKeyKeywords
        .filter(kw => selectedKeywords.includes(kw.text))
        .map(kw => ({
          text: kw.text,
          score: kw.score
        }));
      
      console.log('💾 准备保存的关键词（含分数）:', selectedKeywordsWithScore);
      
      const saveResult = await knowledgeAPI.nextIteration({
        knowledge_base_id: selectedKbId,
        query: extractQuery,
        top_k: expectedCount,
        brand_name: currentBrand?.name ?? undefined,
        product_name: selectedProduct || undefined,
        retained_keywords: selectedKeywordsWithScore,  // 传递包含分数的对象数组
        iteration: iteration + 1
      });
      
      console.log('✅ 已保存选中的关键词:', saveResult.saved_count);
      
      // 更新保留的关键词列表
      setRetainedKeywords(saveResult.retained_keywords);
      setIteration(saveResult.iteration);
      
      // Step 2: 启动新的提取任务（和初次提取一样）
      const extractResult = await knowledgeAPI.extract({
        knowledge_base_id: selectedKbId,
        query: extractQuery,
        top_k: expectedCount,
        brand_name: currentBrand?.name ?? undefined,
        product_name: selectedProduct || undefined,
        model_selection: 'doubao',
        model_type: modelType  // 传递模型类型
      });
      
      const newTaskId = extractResult.task_id;
      setCurrentTaskId(newTaskId);
      
      console.log('✅ 已启动新提取任务:', newTaskId);
      
      // Step 3: 使用和首次提取一样的 WebSocket 监听逻辑
      subscribeToProgress(newTaskId);
      
      // 保存保留词信息到状态，用于在 WebSocket 完成时合并
      // 注意：需要在 subscribeToProgress 的完成处理中检查 retainedKeywords 状态
      setRetainedKeywords(saveResult.retained_keywords);
    } catch (error) {
      console.error('迭代失败:', error);
      alert(`迭代失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setStep('keywords');
      setIsProcessing(false);
    }
  };

  const startExpansion = async () => {
      if (selectedKeywords.length === 0) {
          alert('请至少选择一个关键词进行扩展');
          return;
      }

      setIsProcessing(true);
      setStep('waiting');
      
      try {
          // 调用真实的扩展API
          const result = await knowledgeAPI.expand({
              knowledge_base_id: selectedKbId!,
              selected_keywords: selectedKeywords,
              brand_name: currentBrand?.name ?? '',
              product_name: selectedProduct || '',
              expand_dimensions: ['time', 'demographic', 'adjective', 'scenario'],
              top_k: 100
          });
          
          // 转换为展示格式
          const expandedResults = result.long_tail_keywords.map(kw => ({
              id: kw.id,
              text: kw.text,
              vol: kw.volume,
              competition: kw.competition
          }));
          
          setExpandedKeywords(expandedResults);
          setStep('expanded');
      } catch (error) {
          console.error('扩展失败:', error);
          alert(`扩展失败: ${error instanceof Error ? error.message : '未知错误'}`);
          setStep('keywords'); // 回退到关键词选择步骤
      } finally {
          setIsProcessing(false);
      }
  };

  const getScoreColor = (score: number) => {
      if (score >= 90) return isDark ? 'text-geo-blue' : 'text-blue-600';
      if (score >= 75) return 'text-blue-500';
      if (score >= 60) return 'text-blue-500';
      return 'text-slate-400';
  };

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500 font-sans">
        {/* 页头：回退 + 标题（与内容补位分发页一致） */}
        <div className="flex justify-between items-end mb-2 shrink-0">
            <div className="flex items-center gap-4">
                {onBack && (
                    <button
                        onClick={onBack}
                        className={`p-2 rounded-xl transition-all hover-scale ${isDark ? 'hover:bg-geo-bg text-geo-text-sec hover:text-geo-blue' : 'hover:bg-slate-100 text-slate-600'}`}
                        title={t('actions.back')}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}
                <div>
                    <h2 className={`text-3xl font-semibold tracking-tight ${isDark ? 'text-geo-text-main' : 'text-slate-900'}`}>{t('pageTitle')}</h2>
                    <p className={`text-sm font-bold opacity-60 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>{t('moduleSubtitle')}</p>
                </div>
            </div>
        </div>

        {step === 'source' && (
            <div className="w-full max-w-xl mx-auto space-y-12 animate-in zoom-in-95 duration-700 py-4">
                    {/* 任务名称 */}
                    <div className={`w-full text-left p-6 rounded-2xl border ${isDark ? 'bg-geo-bg border-geo-border' : 'bg-slate-50 border-slate-200'}`}>
                        <label className={`block text-left text-sm font-semibold tracking-[0.05em] mb-3 ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`}>
                            {t('module.taskName')}
                        </label>
                        <input
                            type="text"
                            value={taskName}
                            onChange={(e) => setTaskName(e.target.value)}
                            placeholder={t('module.taskNamePlaceholder')}
                            className={`w-full px-4 py-3 rounded-xl border outline-none transition-all font-medium
                                ${isDark 
                                    ? 'bg-black/30 border-geo-border text-white placeholder:text-geo-text-sec/50 focus:border-geo-blue' 
                                    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500'
                                }
                            `}
                        />
                    </div>

                    {/* 直接显示知识库选择，去掉上传选项 */}
                    <div className={`w-full text-left p-6 rounded-2xl border animate-in slide-in-from-top-4 duration-300 ${isDark ? 'bg-geo-bg border-geo-border' : 'bg-slate-50 border-slate-200'}`}>
                        <label className={`block text-xs font-semibold  mb-4 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>{t('module.knowledgeBase')}</label>
                        {isLoadingKbs ? (
                            <div className="text-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                                <p className={`text-sm ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>{t('module.loadingKb')}</p>
                            </div>
                        ) : kbError ? (
                            <div className={`text-center py-8 ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                                <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                                <p className="text-sm">{kbError}</p>
                                <button onClick={loadKnowledgeBases} className="mt-2 text-xs underline">{t('module.retry')}</button>
                            </div>
                        ) : knowledgeBases.length === 0 ? (
                            <div className={`text-center py-8 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>
                                <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">{t('module.noKb')}</p>
                                <p className="text-xs mt-1">{t('module.createKbFirst')}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {knowledgeBases.map(kb => (
                                    <button 
                                        key={kb.id}
                                        onClick={() => setSelectedKbId(kb.id)}
                                        className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between group
                                            ${selectedKbId === kb.id 
                                                ? (isDark ? 'border-geo-blue bg-geo-blue/5' : 'border-blue-500 bg-white shadow-md')
                                                : (isDark ? 'border-geo-border hover:border-geo-text-sec' : 'border-slate-100 hover:border-slate-200 bg-white/50')
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg transition-colors ${selectedKbId === kb.id ? (isDark ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' : 'bg-gradient-coral text-white shadow-coral hover:opacity-95') : (isDark ? 'bg-geo-card text-geo-text-sec' : 'bg-slate-100 text-slate-400')}`}>
                                                <Database className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className={`text-sm font-semibold ${selectedKbId === kb.id ? (isDark ? 'text-white' : 'text-blue-600') : (isDark ? 'text-geo-text-main' : 'text-slate-700')}`}>{kb.name}</div>
                                                <div className="text-xs font-bold opacity-40 mt-0.5">{t('module.docCount', { count: kb.doc_count })} • {kb.status === 'ready' ? t('module.kbStatus.ready') : kb.status === 'indexing' ? t('module.kbStatus.indexing') : t('module.kbStatus.idle')}</div>
                                            </div>
                                        </div>
                                        {selectedKbId === kb.id && <div className={`p-1 rounded-full ${isDark ? 'bg-geo-blue text-white' : 'bg-blue-600 text-white'}`}><Check className="w-3 h-3" /></div>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>


                    {/* 知识图谱：仅展示知识图谱模块中的真实任务（提炼接口暂不传图谱参数） */}
                    <div className={`w-full text-left p-6 rounded-2xl border ${isDark ? 'bg-geo-bg border-geo-border' : 'bg-slate-50 border-slate-200'}`}>
                        <label className={`block text-xs font-semibold  mb-4 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>
                            {t('module.knowledgeGraph')}
                        </label>
                        {isLoadingSeoTasks ? (
                            <div className="text-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                                <p className={`text-xs ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>{t('module.loading')}</p>
                            </div>
                        ) : seoTasks.length === 0 ? (
                            <p className={`text-sm ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>
                              {t('module.noGraph')}
                            </p>
                        ) : (
                            <select
                                value={selectedSeoTask || ''}
                                onChange={(e) => setSelectedSeoTask(e.target.value || null)}
                                className={`w-full p-4 rounded-xl border-2 transition-all ${isDark 
                                    ? 'bg-geo-card border-geo-border text-geo-text-main focus:border-geo-blue' 
                                    : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
                                }`}
                            >
                                <option value="">{t('module.noGraphOption')}</option>
                                {seoTasks.map((task) => (
                                    <option key={task.task_id} value={task.task_id}>
                                        {task.name || task.keyword || task.task_id}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* 期望条数 */}
                    <div className={`w-full text-left p-6 rounded-2xl border ${isDark ? 'bg-geo-bg border-geo-border' : 'bg-slate-50 border-slate-200'}`}>
                        <label className={`block text-left text-sm font-semibold tracking-[0.05em] mb-3 ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`}>
                            {t('module.expectedCount')}
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="200"
                            value={expectedCount}
                            onChange={(e) => setExpectedCount(parseInt(e.target.value) || 10)}
                            className={`w-full max-w-[12rem] px-4 py-3 rounded-xl border text-sm font-bold outline-none
                                ${isDark 
                                    ? 'bg-black/30 border-geo-border text-white focus:border-geo-blue' 
                                    : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
                                }
                            `}
                        />
                    </div>

                    <button
                      type="button"
                      onClick={startInitialExtract}
                      disabled={isProcessing || !selectedKbId}
                      className="btn-geo-primary w-full hover-scale gap-3"
                    >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Play className="w-4 h-4 fill-current" />}
                        {t('module.startExtract')}
                    </button>
            </div>
        )}

        {/* STEP 2: KEYWORDS REVIEW */}
        {step === 'keywords' && visualizationMode === null && (
            <div className="flex-1 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className={`p-8 rounded-2xl border shadow-sm flex flex-col flex-1 ${isDark ? 'bg-geo-card border-geo-border' : 'bg-white border-slate-100'}`}>
                    <div className="flex justify-between items-center mb-8 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${isDark ? 'bg-geo-bg text-geo-blue shadow-blue-glow' : 'bg-blue-50 text-blue-600'}`}><Layers3 className="w-6 h-6" /></div>
                            <div>
                                <h3 className={`font-semibold text-xl tracking-tight ${isDark ? 'text-geo-text-main' : 'text-slate-900'}`}>{modelType === 'word_expand' ? t('module.expandResult') : t('module.extractResult')}</h3>
                                <p className={`text-xs font-bold opacity-40  ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>{modelType === 'word_expand' ? t('module.expandResultHint') : t('module.extractResultHint')}</p>
                            </div>
                        </div>
                    </div>

                    {/* 扩词工具详情：无 tab，仅展示词条列表 */}
                    {modelType === 'word_expand' && (
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className={`flex items-center justify-between gap-4 mb-4 shrink-0 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>
                                <span className="text-sm font-bold">共 {longtailQuestions.length} 条词条</span>
                            </div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 no-scrollbar content-start">
                                {longtailQuestions.map((q, idx) => (
                                    <div key={idx} className={`p-4 rounded-2xl border transition-all ${isDark ? 'border-geo-border bg-geo-bg hover:border-geo-text-sec' : 'border-slate-100 hover:border-slate-300 shadow-sm bg-white'}`}>
                                        <span className={`text-sm font-bold block ${isDark ? 'text-geo-text-main' : 'text-slate-700'}`}>{q.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 标签页切换 - 根据模型类型显示不同的页签（扩词详情不显示 tab） */}
                    {modelType !== 'word_expand' && (modelType === 'traditional' ? (
                        // 传统模型页签（4个tab：核心词、正向、负面、品牌）
                    <div className="flex gap-2 mb-6 shrink-0 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                        <button
                                onClick={() => setTraditionalActiveTab('core')}
                            className={`px-6 py-3 text-sm font-semibold  transition-all border-b-2 ${
                                    traditionalActiveTab === 'core'
                                        ? (isDark ? 'border-geo-blue text-geo-blue' : 'border-blue-500 text-blue-600')
                                        : (isDark ? 'border-transparent text-geo-text-sec hover:text-geo-text-main' : 'border-transparent text-slate-400 hover:text-slate-600')
                                }`}
                            >
                                核心词 ({coreKeywords.length})
                            </button>
                        <button
                                onClick={() => setTraditionalActiveTab('positive')}
                            className={`px-6 py-3 text-sm font-semibold  transition-all border-b-2 ${
                                    traditionalActiveTab === 'positive'
                                        ? (isDark ? 'border-geo-blue text-geo-blue' : 'border-blue-500 text-blue-600')
                                        : (isDark ? 'border-transparent text-geo-text-sec hover:text-geo-text-main' : 'border-transparent text-slate-400 hover:text-slate-600')
                                }`}
                            >
                                正向问题 ({positiveQuestions.length})
                            </button>
                            <button
                                onClick={() => setTraditionalActiveTab('negative')}
                                className={`px-6 py-3 text-sm font-semibold  transition-all border-b-2 ${
                                    traditionalActiveTab === 'negative'
                                        ? (isDark ? 'border-geo-blue text-geo-blue' : 'border-blue-500 text-blue-600')
                                        : (isDark ? 'border-transparent text-geo-text-sec hover:text-geo-text-main' : 'border-transparent text-slate-400 hover:text-slate-600')
                                }`}
                            >
                                负面问题 ({negativeQuestions.length})
                            </button>
                            <button
                                onClick={() => setTraditionalActiveTab('brand')}
                                className={`px-6 py-3 text-sm font-semibold  transition-all border-b-2 ${
                                    traditionalActiveTab === 'brand'
                                        ? (isDark ? 'border-geo-blue text-geo-blue' : 'border-blue-500 text-blue-600')
                                        : (isDark ? 'border-transparent text-geo-text-sec hover:text-geo-text-main' : 'border-transparent text-slate-400 hover:text-slate-600')
                                }`}
                            >
                                品牌问题 ({brandQuestions.length})
                            </button>
                        </div>
                    ) : modelType === 'semantic_v2' ? (
                        // 语义模型2 页签（5个：核心词、品牌词包、问答词包、竞品词包、语义词包）
                        <div className="flex gap-2 mb-6 shrink-0 border-b overflow-x-auto" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                            <button onClick={() => setSemanticV2ActiveTab('core')} className={`px-4 py-3 text-sm font-semibold  transition-all border-b-2 shrink-0 ${semanticV2ActiveTab === 'core' ? (isDark ? 'border-geo-blue text-geo-blue' : 'border-blue-500 text-blue-600') : (isDark ? 'border-transparent text-geo-text-sec hover:text-geo-text-main' : 'border-transparent text-slate-400 hover:text-slate-600')}`}>核心词 ({currentKeyKeywords.length})</button>
                            <button onClick={() => setSemanticV2ActiveTab('brand_pack')} className={`px-4 py-3 text-sm font-semibold  transition-all border-b-2 shrink-0 ${semanticV2ActiveTab === 'brand_pack' ? (isDark ? 'border-geo-blue text-geo-blue' : 'border-blue-500 text-blue-600') : (isDark ? 'border-transparent text-geo-text-sec hover:text-geo-text-main' : 'border-transparent text-slate-400 hover:text-slate-600')}`}>品牌词包 ({brandPackQuestions.length})</button>
                            <button onClick={() => setSemanticV2ActiveTab('qa_pack')} className={`px-4 py-3 text-sm font-semibold  transition-all border-b-2 shrink-0 ${semanticV2ActiveTab === 'qa_pack' ? (isDark ? 'border-geo-blue text-geo-blue' : 'border-blue-500 text-blue-600') : (isDark ? 'border-transparent text-geo-text-sec hover:text-geo-text-main' : 'border-transparent text-slate-400 hover:text-slate-600')}`}>问答词包 ({qaPackQuestions.length})</button>
                            <button onClick={() => setSemanticV2ActiveTab('competitor_pack')} className={`px-4 py-3 text-sm font-semibold  transition-all border-b-2 shrink-0 ${semanticV2ActiveTab === 'competitor_pack' ? (isDark ? 'border-geo-blue text-geo-blue' : 'border-blue-500 text-blue-600') : (isDark ? 'border-transparent text-geo-text-sec hover:text-geo-text-main' : 'border-transparent text-slate-400 hover:text-slate-600')}`}>竞品词包 ({competitorPackQuestions.length})</button>
                            <button onClick={() => setSemanticV2ActiveTab('semantic_pack')} className={`px-4 py-3 text-sm font-semibold  transition-all border-b-2 shrink-0 ${semanticV2ActiveTab === 'semantic_pack' ? (isDark ? 'border-geo-blue text-geo-blue' : 'border-blue-500 text-blue-600') : (isDark ? 'border-transparent text-geo-text-sec hover:text-geo-text-main' : 'border-transparent text-slate-400 hover:text-slate-600')}`}>语义词包 ({longtailQuestions.length + semanticExtensionQuestions.length})</button>
                        </div>
                    ) : (
                        // 语义模型页签（顺序：语义关键词 → 语义扩展问题 → 长尾问题）
                        <div className="flex gap-2 mb-6 shrink-0 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                            <button
                                onClick={() => setSemanticActiveTab('keywords')}
                                className={`px-6 py-3 text-sm font-semibold  transition-all border-b-2 ${
                                    semanticActiveTab === 'keywords'
                                    ? (isDark ? 'border-geo-blue text-geo-blue' : 'border-blue-500 text-blue-600')
                                    : (isDark ? 'border-transparent text-geo-text-sec hover:text-geo-text-main' : 'border-transparent text-slate-400 hover:text-slate-600')
                            }`}
                        >
                            语义关键词 ({currentKeyKeywords.length})
                        </button>
                        <button
                                onClick={() => setSemanticActiveTab('semantic')}
                            className={`px-6 py-3 text-sm font-semibold  transition-all border-b-2 ${
                                    semanticActiveTab === 'semantic'
                                    ? (isDark ? 'border-geo-blue text-geo-blue' : 'border-blue-500 text-blue-600')
                                    : (isDark ? 'border-transparent text-geo-text-sec hover:text-geo-text-main' : 'border-transparent text-slate-400 hover:text-slate-600')
                            }`}
                        >
                            语义扩展问题 ({semanticExtensionQuestions.length})
                        </button>
                    </div>
                    ) )}

                    {/* 传统模型内容展示 */}
                    {modelType === 'traditional' && (
                        <>
                            {/* 核心词展示 */}
                            {traditionalActiveTab === 'core' && (
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 no-scrollbar content-start">
                                    {coreKeywords.map((kw, idx) => (
                                        <div key={idx} className={`p-4 rounded-2xl border transition-all ${isDark ? 'border-geo-border bg-geo-bg hover:border-geo-text-sec' : 'border-slate-100 hover:border-slate-300 shadow-sm bg-white'}`}>
                                            <div className="flex items-start gap-3">
                                                <div className={`text-xs font-semibold  px-2 py-1 rounded shrink-0 ${isDark ? 'bg-geo-blue/20 text-geo-blue' : 'bg-blue-100 text-blue-600'}`}>
                                                    核心
                                                </div>
                                                <div className="flex-1">
                                                    <span className={`text-sm font-bold block ${isDark ? 'text-geo-text-main' : 'text-slate-700'}`}>{kw.text}</span>
                                                    {kw.score > 0 && (
                                                        <span className={`text-xs mt-1 block ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>评分: {kw.score}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {coreKeywords.length === 0 && (
                                        <div className={`col-span-full text-center py-12 ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`}>
                                            <p className="text-sm">暂无核心关键词</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* 正向问题展示 */}
                            {traditionalActiveTab === 'positive' && (
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 no-scrollbar content-start">
                                    {positiveQuestions.map((q, idx) => (
                                        <div key={idx} className={`p-4 rounded-2xl border transition-all ${isDark ? 'border-geo-border bg-geo-bg hover:border-geo-text-sec' : 'border-slate-100 hover:border-slate-300 shadow-sm bg-white'}`}>
                                            <div className="flex items-start gap-3">
<div className={`text-xs font-semibold  px-2 py-1 rounded shrink-0 ${isDark ? 'bg-geo-blue/20 text-geo-blue' : 'bg-blue-100 text-blue-600'}`}>
                                            正向
                                        </div>
                                                <span className={`text-sm font-bold flex-1 ${isDark ? 'text-geo-text-main' : 'text-slate-700'}`}>{q}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {positiveQuestions.length === 0 && (
                                        <div className={`col-span-full text-center py-12 ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`}>
                                            <p className="text-sm">暂无正向问题</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* 负面问题展示 */}
                            {traditionalActiveTab === 'negative' && (
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 no-scrollbar content-start">
                                    {negativeQuestions.map((q, idx) => (
                                        <div key={idx} className={`p-4 rounded-2xl border transition-all ${isDark ? 'border-geo-border bg-geo-bg hover:border-geo-text-sec' : 'border-slate-100 hover:border-slate-300 shadow-sm bg-white'}`}>
                                            <div className="flex items-start gap-3">
<div className={`text-xs font-semibold  px-2 py-1 rounded shrink-0 ${isDark ? 'bg-zinc-600/30 text-zinc-300' : 'bg-slate-100 text-slate-600'}`}>
                                            负面
                                        </div>
                                                <span className={`text-sm font-bold flex-1 ${isDark ? 'text-geo-text-main' : 'text-slate-700'}`}>{q}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {negativeQuestions.length === 0 && (
                                        <div className={`col-span-full text-center py-12 ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`}>
                                            <p className="text-sm">暂无负面问题</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* 品牌问题展示 */}
                            {traditionalActiveTab === 'brand' && (
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 no-scrollbar content-start">
                                    {brandQuestions.map((q, idx) => (
                                        <div key={idx} className={`p-4 rounded-2xl border transition-all ${isDark ? 'border-geo-border bg-geo-bg hover:border-geo-text-sec' : 'border-slate-100 hover:border-slate-300 shadow-sm bg-white'}`}>
                                            <div className="flex items-start gap-3">
                                                <div className={`text-xs font-semibold  px-2 py-1 rounded shrink-0 ${isDark ? 'bg-geo-blue/20 text-geo-blue' : 'bg-blue-100 text-blue-600'}`}>
                                                    品牌
                                                </div>
                                                <span className={`text-sm font-bold flex-1 ${isDark ? 'text-geo-text-main' : 'text-slate-700'}`}>{q}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {brandQuestions.length === 0 && (
                                        <div className={`col-span-full text-center py-12 ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`}>
                                            <p className="text-sm">暂无品牌问题</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* 语义模型2 内容展示（5 Tab） */}
                    {modelType === 'semantic_v2' && (
                        <>
                            {semanticV2ActiveTab === 'core' && (
                                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2 no-scrollbar content-start">
                                    {currentKeyKeywords.map((kw, idx) => (
                                        <div key={idx} className={`p-4 rounded-2xl border transition-all ${isDark ? 'border-geo-border bg-geo-bg hover:border-geo-text-sec' : 'border-slate-100 hover:border-slate-300 shadow-sm bg-white'}`}>
                                            <span className={`text-sm font-bold block ${isDark ? 'text-geo-text-main' : 'text-slate-700'}`}>{kw.text}</span>
                                        </div>
                                    ))}
                                    {currentKeyKeywords.length === 0 && <div className={`col-span-full text-center py-12 ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`}><p className="text-sm">暂无核心词</p></div>}
                                </div>
                            )}
                            {semanticV2ActiveTab === 'brand_pack' && (
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 no-scrollbar content-start">
                                    {brandPackQuestions.map((q, idx) => (
                                        <div key={idx} className={`p-4 rounded-2xl border transition-all ${isDark ? 'border-geo-border bg-geo-bg hover:border-geo-text-sec' : 'border-slate-100 hover:border-slate-300 shadow-sm bg-white'}`}>
                                            <span className={`text-sm font-bold ${isDark ? 'text-geo-text-main' : 'text-slate-700'}`}>{q}</span>
                                        </div>
                                    ))}
                                    {brandPackQuestions.length === 0 && <div className={`col-span-full text-center py-12 ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`}><p className="text-sm">暂无品牌词包</p></div>}
                                </div>
                            )}
                            {semanticV2ActiveTab === 'qa_pack' && (
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 no-scrollbar content-start">
                                    {qaPackQuestions.map((q, idx) => (
                                        <div key={idx} className={`p-4 rounded-2xl border transition-all ${isDark ? 'border-geo-border bg-geo-bg hover:border-geo-text-sec' : 'border-slate-100 hover:border-slate-300 shadow-sm bg-white'}`}>
                                            <span className={`text-sm font-bold ${isDark ? 'text-geo-text-main' : 'text-slate-700'}`}>{q}</span>
                                        </div>
                                    ))}
                                    {qaPackQuestions.length === 0 && <div className={`col-span-full text-center py-12 ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`}><p className="text-sm">暂无问答词包</p></div>}
                                </div>
                            )}
                            {semanticV2ActiveTab === 'competitor_pack' && (
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 no-scrollbar content-start">
                                    {competitorPackQuestions.map((q, idx) => (
                                        <div key={idx} className={`p-4 rounded-2xl border transition-all ${isDark ? 'border-geo-border bg-geo-bg hover:border-geo-text-sec' : 'border-slate-100 hover:border-slate-300 shadow-sm bg-white'}`}>
                                            <span className={`text-sm font-bold ${isDark ? 'text-geo-text-main' : 'text-slate-700'}`}>{q}</span>
                                        </div>
                                    ))}
                                    {competitorPackQuestions.length === 0 && <div className={`col-span-full text-center py-12 ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`}><p className="text-sm">暂无竞品词包</p></div>}
                                </div>
                            )}
                            {semanticV2ActiveTab === 'semantic_pack' && (
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 no-scrollbar content-start">
                                    {longtailQuestions.map((q, idx) => (
                                        <div key={idx} className={`p-4 rounded-2xl border transition-all ${isDark ? 'border-geo-border bg-geo-bg hover:border-geo-text-sec' : 'border-slate-100 hover:border-slate-300 shadow-sm bg-white'}`}>
                                            <span className={`text-sm font-bold flex-1 ${isDark ? 'text-geo-text-main' : 'text-slate-700'}`}>{typeof q === 'object' && q.text ? q.text : String(q)}</span>
                                        </div>
                                    ))}
                                    {semanticExtensionQuestions.map((q, idx) => (
                                        <div key={`ext-${idx}`} className={`p-4 rounded-2xl border transition-all ${isDark ? 'border-geo-border bg-geo-bg hover:border-geo-text-sec' : 'border-slate-100 hover:border-slate-300 shadow-sm bg-white'}`}>
                                            <span className={`text-sm font-bold flex-1 ${isDark ? 'text-geo-text-main' : 'text-slate-700'}`}>{typeof q === 'object' && q.text ? q.text : String(q)}</span>
                                        </div>
                                    ))}
                                    {longtailQuestions.length === 0 && semanticExtensionQuestions.length === 0 && <div className={`col-span-full text-center py-12 ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`}><p className="text-sm">暂无语义词包</p></div>}
                                </div>
                            )}
                        </>
                    )}
                    
                    {/* 语义模型内容展示 */}
                    {modelType === 'semantic' && (
                        <>
                    {/* 语义关键词展示（长尾 tab 已隐藏，longtail 时也显示关键词） */}
                            {(semanticActiveTab === 'keywords' || semanticActiveTab === 'longtail') && (
                        <>
                            <div className="flex justify-end gap-2 mb-4 shrink-0">
                                <button onClick={() => setSelectedKeywords(currentKeyKeywords.map(k => k.text))} className={`text-xs font-semibold  px-4 py-2 rounded-xl transition-colors ${isDark ? 'text-geo-blue hover:bg-geo-bg' : 'text-blue-600 hover:bg-blue-50'}`}>全选</button>
                                <button onClick={() => setSelectedKeywords([])} className={`text-xs font-semibold  px-4 py-2 rounded-xl transition-colors ${isDark ? 'text-geo-text-sec hover:bg-geo-bg' : 'text-slate-400 hover:bg-slate-50'}`}>清空</button>
                            </div>
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-6 overflow-y-auto pr-2 no-scrollbar content-start">
                                {currentKeyKeywords.map(kw => {
                                    const isSelected = selectedKeywords.includes(kw.text);
                                    const isRetained = kw.isRetained === true;
                                    const isNew = kw.isRetained === false;
                                    return (
                                        <div key={kw.text} onClick={() => setSelectedKeywords(prev => isSelected ? prev.filter(k => k !== kw.text) : [...prev, kw.text])} className={`p-6 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-4 relative group hover-scale ${isSelected ? (isDark ? 'border-geo-blue bg-geo-blue/10 shadow-blue-glow' : 'border-blue-500 bg-blue-50 shadow-md') : (isDark ? 'border-geo-border bg-geo-bg hover:border-geo-text-sec' : 'border-slate-100 hover:border-slate-300 shadow-sm bg-white')}`}>
                                            {isRetained && (
                                                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold  ${isDark ? 'bg-geo-blue/20 text-geo-blue border border-geo-blue/50' : 'bg-blue-100 text-blue-600 border border-blue-300'}`}>
                                                    已保留
                                                </div>
                                            )}
                                            {isNew && !isRetained && (
                                                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold  ${isDark ? 'bg-geo-blue/20 text-geo-blue border border-geo-blue/50' : 'bg-blue-100 text-blue-600 border border-blue-200'}`}>
                                                    新生成
                                                </div>
                                            )}
                                            <div className="flex justify-between items-start gap-4">
                                                <span className={`text-base font-semibold leading-tight ${isSelected ? (isDark ? 'text-white' : 'text-blue-700') : (isDark ? 'text-geo-text-main' : 'text-slate-700')}`}>{kw.text}</span>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? (isDark ? 'bg-gradient-coral border-[#E8553F] text-white shadow-coral hover:opacity-95' : 'bg-gradient-coral border-[#E8553F] text-white shadow-coral hover:opacity-95') : (isDark ? 'border-geo-border bg-geo-bg' : 'border-slate-300 bg-white')}`}>{isSelected && <Check className="w-3 h-3" />}</div>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-2">
                                                <Activity className={`w-3 h-3 ${getScoreColor(kw.score)}`} />
                                                <span className={`text-xs font-semibold  ${getScoreColor(kw.score)}`}>热度: {kw.score}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* 语义扩展问题展示 */}
                            {semanticActiveTab === 'semantic' && (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 no-scrollbar content-start">
                            {semanticExtensionQuestions.map((q, idx) => (
                                <div key={idx} className={`p-4 rounded-2xl border transition-all ${isDark ? 'border-geo-border bg-geo-bg hover:border-geo-text-sec' : 'border-slate-100 hover:border-slate-300 shadow-sm bg-white'}`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`text-xs font-semibold  px-2 py-1 rounded shrink-0 ${isDark ? 'bg-geo-blue/20 text-geo-blue' : 'bg-blue-100 text-blue-600'}`}>
                                            {q.source_keyword}
                                        </div>
                                        <span className={`text-sm font-bold flex-1 ${isDark ? 'text-geo-text-main' : 'text-slate-700'}`}>{q.text}</span>
                                    </div>
                                </div>
                            ))}
                            {semanticExtensionQuestions.length === 0 && (
                                <div className={`col-span-full text-center py-12 ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`}>
                                    <p className="text-sm">暂无语义扩展问题</p>
                                </div>
                            )}
                        </div>
                    )}
                        </>
                    )}


                    <div className={`mt-10 pt-8 border-t flex items-center justify-between shrink-0 ${isDark ? 'border-geo-border' : 'border-slate-100'}`}>
                        <div className="flex gap-4">
                            {/* 图表功能已隐藏 */}
                            {onBack && (
                                <button onClick={onBack} className={`px-10 py-4 rounded-xl font-semibold text-xs  shadow-sm flex items-center gap-3 transition-all hover-scale ${isDark ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' : 'bg-gradient-coral text-white shadow-coral hover:opacity-95'}`}>
                                    <Check className="w-4 h-4" /> 完成
                                </button>
                            )}
                            {/* 确认并扩展按钮已隐藏 */}
                            {/* <button onClick={startExpansion} className={`px-10 py-4 rounded-xl font-semibold text-xs  shadow-sm flex items-center gap-3 transition-all hover-scale ${isDark ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' : 'bg-gradient-coral text-white shadow-coral hover:opacity-95'}`}>
                                确认并扩展 <ArrowRight className="w-4 h-4" />
                            </button> */}
                        </div>
                        {modelType !== 'word_expand' && (
                            <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border transition-opacity ${isDark ? 'bg-geo-bg/50 border-geo-border text-geo-text-sec' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                <Timer className="w-4 h-4" />
                                <div className="text-xs font-semibold ">任务分析就绪：节点已连接</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* 同心圆三层结构图表 */}
        {step === 'keywords' && visualizationMode === 'radial' && (
            <div className="flex-1 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className={`p-8 rounded-2xl border shadow-sm flex flex-col flex-1 ${isDark ? 'bg-geo-card border-geo-border' : 'bg-white border-slate-100'}`}>
                    <KeywordVisualizationRadial
                        theme={theme}
                        coreKeywords={currentKeyKeywords.map(kw => ({ text: kw.text, score: kw.score }))}
                        longtailQuestions={longtailQuestions}
                        semanticExtensionQuestions={semanticExtensionQuestions}
                        brandName={currentBrand?.name ?? ''}
                        productName={selectedProduct}
                        onBack={() => setVisualizationMode(null)}
                    />
                </div>
            </div>
        )}


        {step === 'waiting' && (
            <div className={`min-h-[500px] flex flex-col items-center justify-center text-center animate-in fade-in duration-700 rounded-2xl border shadow-sm ${isDark ? 'bg-geo-card border-geo-border' : 'bg-white'}`}>
                <div className="relative mb-10">
                    <div className={`absolute inset-0 rounded-full blur-2xl animate-pulse ${isDark ? 'bg-geo-blue/30' : 'bg-blue-500/20'}`}></div>
                    <Loader2 className={`w-20 h-20 animate-spin relative z-10 ${isDark ? 'text-geo-blue' : 'text-blue-600'}`} />
                </div>
                
                {/* 动态显示当前思考步骤 */}
                {thinkingSteps.length > 0 ? (
                    <>
                        <h2 className={`text-3xl font-semibold tracking-tight mb-4 ${isDark ? 'text-geo-text-main' : 'text-slate-900'}`}>
                            {thinkingSteps[thinkingSteps.length - 1]?.message || '正在处理...'}
                        </h2>
                        <div className="mt-6 w-full max-w-2xl space-y-2">
                            {thinkingSteps.slice(-3).map((step, idx, arr) => {
                                // 最后一条强制显示为"执行中"，前面的都显示为"已完成"
                                const isLast = idx === arr.length - 1;
                                const displayStatus = isLast ? 'running' : 'completed';
                                
                                return (
                                    <div 
                                        key={`${step.step}-${idx}`} 
                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                                            displayStatus === 'running' 
                                                ? (isDark ? 'bg-geo-bg border-geo-blue/30' : 'bg-blue-50 border-blue-200')
                                                : (isDark ? 'bg-geo-bg/30 border-geo-border opacity-60' : 'bg-slate-50 border-slate-200 opacity-60')
                                        }`}
                                    >
                                        <div>
                                            {displayStatus === 'running' ? (
                                                <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-geo-blue' : 'text-blue-600'}`} />
                                            ) : (
                                                <Check className={`w-4 h-4 ${isDark ? 'text-geo-blue' : 'text-blue-600'}`} />
                                            )}
                                        </div>
                                        <p className={`text-sm font-bold flex-1 ${isDark ? 'text-geo-text-main' : 'text-slate-700'}`}>
                                            {step.message}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <>
                        <h2 className={`text-3xl font-semibold tracking-tight ${isDark ? 'text-geo-text-main' : 'text-slate-900'}`}>正在通过语义聚类重组下一轮候选池...</h2>
                        <p className={`text-sm font-bold opacity-50 mt-5 max-w-lg ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>系统正在根据您选择的重点语义，自动筛选 RAG 知识库中关联度最高的补位实体</p>
                    </>
                )}
            </div>
        )}

        {step === 'expanded' && (
            <div className="space-y-8 animate-in fade-in duration-700 pb-12">
                <div className={`flex justify-between items-center p-8 rounded-2xl border shadow-sm transition-colors ${isDark ? 'bg-geo-card border-geo-border shadow-blue-glow/10' : 'bg-indigo-50 border-indigo-100'}`}>
                    <div className="flex items-center gap-5">
                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-geo-bg text-geo-blue shadow-blue-glow' : 'bg-white text-indigo-600 shadow-sm'}`}><Sparkles className="w-8 h-8" /></div>
                        <div>
                            <span className={`font-semibold block text-2xl tracking-tight ${isDark ? 'text-geo-text-main' : 'text-indigo-900'}`}>基础词条裂变完成</span>
                            <span className={`text-xs font-semibold  opacity-60 ${isDark ? 'text-geo-text-sec' : 'text-indigo-700'}`}>已生成 163 个高意图查询短语</span>
                        </div>
                    </div>
                    <button className={`px-5 py-2 rounded-lg text-xs font-semibold  border transition-all hover-scale ${isDark ? 'bg-geo-bg border-geo-border text-geo-text-main hover:border-geo-blue' : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-100'} flex items-center gap-3`}><Download className="w-4 h-4" /> 导出分析报告</button>
                </div>

                <div className={`rounded-2xl border overflow-hidden flex flex-col shadow-sm ${isDark ? 'bg-geo-card border-geo-border' : 'bg-white border-slate-200'}`}>
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3 w-1/2">语义长尾组合</th>
                                <th className="px-4 py-3 text-right">流量指数</th>
                                <th className="px-4 py-3 text-right">难度</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                            {expandedKeywords.slice((extractPage-1)*itemsPerPage, extractPage*itemsPerPage).map(row => (
                                <tr key={row.id} className={`group transition-colors ${isDark ? 'hover:bg-geo-bg/30' : 'hover:bg-slate-50/80'}`}>
                                    <td className="px-4 py-3 font-mono font-bold opacity-30">{String(row.id).padStart(3, '0')}</td>
                                    <td className={`px-4 py-3 font-semibold text-lg leading-snug tracking-tight ${isDark ? 'text-geo-text-main' : 'text-slate-700'}`}>{row.text}</td>
                                    <td className={`px-4 py-3 text-right font-mono font-semibold text-xl tracking-tighter ${isDark ? 'text-geo-blue geo-glow-text' : 'text-slate-900 opacity-70'}`}>{row.vol.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold  border ${row.competition === '高' ? (isDark ? 'bg-zinc-600/30 text-zinc-300 border-zinc-500/20' : 'bg-slate-100 text-slate-600 border-slate-200') : (isDark ? 'bg-geo-blue/20 text-geo-blue border-geo-blue/30' : 'bg-blue-50 text-blue-600 border-blue-100')}`}>{row.competition}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className={`p-6 border-t flex justify-between items-center ${isDark ? 'border-geo-border bg-geo-bg/50' : 'border-slate-50 bg-slate-50/30'}`}>
                        <button disabled={extractPage === 1} onClick={() => setExtractPage(p => p - 1)} className={`p-3 rounded-xl transition-all ${isDark ? 'bg-geo-card text-geo-text-sec hover:text-white disabled:opacity-20' : 'hover:bg-black/5'}`}><ChevronLeft className="w-6 h-6" /></button>
                        <span className={`text-xs font-semibold  ${isDark ? 'text-geo-text-sec' : 'opacity-40'}`}>分页索引 {extractPage} / {Math.ceil(expandedKeywords.length / itemsPerPage)}</span>
                        <button disabled={extractPage * itemsPerPage >= expandedKeywords.length} onClick={() => setExtractPage(p => p + 1)} className={`p-3 rounded-xl transition-all ${isDark ? 'bg-geo-card text-geo-text-sec hover:text-white disabled:opacity-20' : 'hover:bg-black/5'}`}><ChevronRight className="w-6 h-6" /></button>
                    </div>
                </div>
            </div>
        )}

        {/* 造句扩词弹窗（结构同造句工具：地区词、前缀词、核心词、行业词、后缀词） */}
        {sentenceExpandModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSentenceExpandModalOpen(false)}>
                <div
                    className={`max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-2xl border shadow-sm flex flex-col ${isDark ? 'bg-geo-card border-geo-border' : 'bg-white border-slate-200'}`}
                    onClick={e => e.stopPropagation()}
                >
                    <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-geo-border' : 'border-slate-200'}`}>
                        <h3 className={`text-lg font-semibold ${isDark ? 'text-geo-text-main' : 'text-slate-900'}`}>造句扩词</h3>
                        <button type="button" onClick={() => setSentenceExpandModalOpen(false)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-geo-bg text-geo-text-sec' : 'hover:bg-slate-100 text-slate-500'}`}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <div>
                            <label className={`block text-xs font-semibold  mb-2 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>1. 地区词（可选，不填则不拼地区）</label>
                            <textarea value={sentenceExpandRegion} onChange={e => setSentenceExpandRegion(e.target.value)} rows={2} className={`w-full rounded-xl border px-4 py-3 text-sm resize-none ${isDark ? 'bg-geo-bg border-geo-border text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} placeholder={'北京\n上海\n广州'} />
                        </div>
                        <div>
                            <label className={`block text-xs font-semibold  mb-2 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>2. 前缀词（默认词）</label>
                            <textarea value={sentenceExpandPrefix} onChange={e => setSentenceExpandPrefix(e.target.value)} rows={4} className={`w-full rounded-xl border px-4 py-3 text-sm resize-none ${isDark ? 'bg-geo-bg border-geo-border text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} placeholder="口碑好的、靠谱的..." />
                        </div>
                        <div>
                            <label className={`block text-xs font-semibold  mb-2 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>3. 核心词（必填，从当前语义关键词多选）</label>
                            <select
                                multiple
                                value={sentenceExpandSelectedCores}
                                onChange={e => setSentenceExpandSelectedCores(Array.from(e.target.selectedOptions, o => o.value))}
                                className={`w-full rounded-xl border px-4 py-3 text-sm min-h-[120px] ${isDark ? 'bg-geo-bg border-geo-border text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            >
                                {sentenceExpandCoreOptions.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                            <p className={`mt-1 text-xs ${isDark ? 'text-geo-text-sec opacity-70' : 'text-slate-400'}`}>按住 Ctrl/Cmd 可多选，已选 {sentenceExpandSelectedCores.length} 项</p>
                        </div>
                        <div>
                            <label className={`block text-xs font-semibold  mb-2 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>4. 行业词（必填，默认词）</label>
                            <textarea value={sentenceExpandIndustry} onChange={e => setSentenceExpandIndustry(e.target.value)} rows={4} className={`w-full rounded-xl border px-4 py-3 text-sm resize-none ${isDark ? 'bg-geo-bg border-geo-border text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} placeholder="厂家、供应商..." />
                        </div>
                        <div>
                            <label className={`block text-xs font-semibold  mb-2 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>5. 后缀词（默认词）</label>
                            <textarea value={sentenceExpandSuffix} onChange={e => setSentenceExpandSuffix(e.target.value)} rows={3} className={`w-full rounded-xl border px-4 py-3 text-sm resize-none ${isDark ? 'bg-geo-bg border-geo-border text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} placeholder="找哪家、怎么联系..." />
                        </div>
                        <div className={`flex items-center gap-4 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>
                            <span className="text-sm font-bold">每个核心词最多生成</span>
                            <input type="number" min={1} max={500} value={sentenceExpandMaxPerWord} onChange={e => setSentenceExpandMaxPerWord(Number(e.target.value) || 100)} className={`w-20 rounded-lg border px-2 py-1 text-sm ${isDark ? 'bg-geo-bg border-geo-border text-white' : 'bg-white border-slate-200 text-slate-900'}`} />
                            <span className="text-sm font-bold">条</span>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={runSentenceExpandPreview} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold  ${isDark ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' : 'bg-gradient-coral text-white shadow-coral hover:opacity-95'}`}>
                                <Wand2 className="w-4 h-4" /> 预览拓词
                            </button>
                        </div>
                        {sentenceExpandResult.length > 0 && (
                            <div className="border-t pt-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                                <p className={`text-sm font-bold mb-2 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>已生成 {sentenceExpandResult.length} 条，可追加到长尾问题</p>
                                <div className="max-h-48 overflow-y-auto rounded-xl border p-3 space-y-1" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                                    {sentenceExpandResult.slice(0, 20).map((q, idx) => (
                                        <div key={idx} className={`text-xs truncate ${isDark ? 'text-geo-text-sec' : 'text-slate-600'}`}>{q.text}</div>
                                    ))}
                                    {sentenceExpandResult.length > 20 && <div className={`text-xs ${isDark ? 'text-geo-text-sec opacity-70' : 'text-slate-400'}`}>... 还有 {sentenceExpandResult.length - 20} 条</div>}
                                </div>
                                <button type="button" onClick={() => { setLongtailQuestions(prev => [...prev, ...sentenceExpandResult]); setSentenceExpandModalOpen(false); setSentenceExpandResult([]); }} className={`mt-3 px-6 py-2 rounded-xl text-sm font-semibold  ${isDark ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' : 'bg-gradient-coral text-white shadow-coral hover:opacity-95'}`}>
                                    追加到长尾问题
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default ExtractModule;
