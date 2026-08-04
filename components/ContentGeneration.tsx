import React, { useState, useEffect, useRef } from 'react';
import { FileText, Sparkles, Loader2, RefreshCw, Copy, Check, ArrowLeft, Tag, Network, History, List, X } from 'lucide-react';
import { Theme, Brand, ModuleType, ContentGenerationTask } from '../types';
import { knowledgeBaseAPI, KnowledgeBase as KBType } from '../api/knowledgeBase';
import { getRetainedKeywords, generateArticle, getGenerationDetail, regenerateArticle, getGenerationHistory, RetainedKeyword, ArticleResult } from '../api/contentGeneration';
import { knowledgeAPI } from '../api/knowledge';
import { copyToClipboard } from '../utils/clipboard';
import { getApiOrigin } from '../lib/apiOrigin';

interface ContentGenerationProps {
  theme: Theme;
  currentBrand: Brand;
  currentProduct?: { name: string } | null;
  onBack?: () => void;
}

// 假的知识图谱选项
const FAKE_KNOWLEDGE_GRAPHS = [
  { id: 'skincare', name: '护肤知识图谱' },
  { id: 'sports', name: '运动装备知识图谱' },
  { id: 'tech', name: '科技产品知识图谱' },
  { id: 'food', name: '美食健康知识图谱' },
  { id: 'general', name: '通用知识图谱' }
];

const ContentGeneration: React.FC<ContentGenerationProps> = ({ 
  theme, 
  currentBrand, 
  currentProduct,
  onBack 
}) => {
  const isDark = theme === 'dark';
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // 状态管理
  const [knowledgeBases, setKnowledgeBases] = useState<KBType[]>([]);
  const [selectedKbId, setSelectedKbId] = useState<number | null>(null);
  const [selectedKgType, setSelectedKgType] = useState<string>('');
  const [latestCoreKeywords, setLatestCoreKeywords] = useState<Array<{text: string; score: number}>>([]);
  const [selectedCoreKeywords, setSelectedCoreKeywords] = useState<Array<{text: string; score: number}>>([]);
  const [isLoadingCoreKeywords, setIsLoadingCoreKeywords] = useState(false);
  
  // 生成状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [thinkingProcess, setThinkingProcess] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<string>('');
  
  // 结果状态
  const [result, setResult] = useState<ArticleResult | null>(null);
  const [copied, setCopied] = useState(false);
  
  // 视图状态：'generate' | 'history'
  const [view, setView] = useState<'generate' | 'history'>('generate');
  
  // 历史记录状态
  const [historyList, setHistoryList] = useState<ContentGenerationTask[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedHistoryTask, setSelectedHistoryTask] = useState<ContentGenerationTask | null>(null);
  
  // 加载知识库列表
  useEffect(() => {
    loadKnowledgeBases();
  }, []);
  
  // 进入页面时自动加载历史记录
  useEffect(() => {
    if (currentBrand) {
      console.log('📋 [useEffect] 进入页面，自动加载历史记录:', {
        brand_name: currentBrand.name,
        product_name: currentProduct?.name
      });
      loadHistory();
    }
  }, [currentBrand, currentProduct]);
  
  // 当切换到历史记录视图时，重新加载
  useEffect(() => {
    console.log('📋 [useEffect] 检查是否需要加载历史记录:', {
      view,
      currentBrand: currentBrand?.name,
      currentProduct: currentProduct?.name
    });
    if (view === 'history' && currentBrand) {
      console.log('📋 [useEffect] 切换到历史记录视图，重新加载');
      loadHistory();
    }
  }, [view]);
  
  // 当品牌/产品/知识库变化时，加载最新一次词条提炼的核心词
  useEffect(() => {
    if (selectedKbId && currentBrand) {
      loadLatestCoreKeywords();
    } else {
      setLatestCoreKeywords([]);
      setSelectedCoreKeywords([]);
    }
  }, [selectedKbId, currentBrand, currentProduct]);
  
  const loadKnowledgeBases = async () => {
    try {
      // 只查询当前品牌的知识库
      const brandId = currentBrand?.id;
      const response = await knowledgeBaseAPI.list(brandId);
      setKnowledgeBases(response.knowledge_bases);
      if (response.knowledge_bases.length > 0 && !selectedKbId) {
        setSelectedKbId(response.knowledge_bases[0].id);
      }
    } catch (err) {
      console.error('加载知识库失败:', err);
    }
  };
  
  const loadLatestCoreKeywords = async () => {
    if (!selectedKbId || !currentBrand) return;
    
    setIsLoadingCoreKeywords(true);
    try {
      const response = await knowledgeAPI.getLatestExtractionCoreKeywords({
        brand_name: currentBrand.name,
        product_name: currentProduct?.name,
        knowledge_base_id: selectedKbId
      });
      
      if (response.core_keywords && response.core_keywords.length > 0) {
        setLatestCoreKeywords(response.core_keywords);
        // 多选模式下，不自动选择，让用户自己选择
      } else {
        setLatestCoreKeywords([]);
        setSelectedCoreKeywords([]);
      }
    } catch (err) {
      console.error('加载最新核心词失败:', err);
      setLatestCoreKeywords([]);
      setSelectedCoreKeyword(null);
    } finally {
      setIsLoadingCoreKeywords(false);
    }
  };
  
  const loadHistory = async () => {
    if (!currentBrand) {
      console.error('📋 [loadHistory] 当前品牌为空，无法加载历史记录');
      setHistoryList([]);
      return;
    }
    
    setIsLoadingHistory(true);
    try {
      console.log('📋 [loadHistory] 开始加载历史记录:', {
        brand_name: currentBrand.name,
        product_name: currentProduct?.name
      });
      const response = await getGenerationHistory({
        brand_name: currentBrand.name,
        product_name: currentProduct?.name,
        limit: 50,
        offset: 0
      });
      console.log('📋 [loadHistory] API响应:', response);
      if (response.success && response.data) {
        console.log('📋 [loadHistory] 解析后的任务列表:', response.data.tasks);
        console.log('📋 [loadHistory] 任务数量:', response.data.tasks?.length || 0);
        setHistoryList(response.data.tasks || []);
      } else {
        console.warn('📋 [loadHistory] 响应格式异常:', response);
        setHistoryList([]);
      }
    } catch (err) {
      console.error('📋 [loadHistory] 加载历史记录失败:', err);
      console.error('📋 [loadHistory] 错误详情:', err);
      setHistoryList([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };
  
  const handleViewHistory = async (task: ContentGenerationTask) => {
    try {
      const response = await getGenerationDetail(task.task_id);
      const taskData = response.data;
      // 转换后端数据格式到前端格式
      const detail: ArticleResult = {
        task_id: taskData.task_id || task.task_id,
        article: taskData.generated_article || '',
        similarity_score: taskData.similarity_score || 0,
        score_details: taskData.score_details || {},
        co_occurrence_words: taskData.co_occurrence_words || [],
        entity_relationships: taskData.entity_relationships || [],
        iteration_count: taskData.iteration_count || 1,
        kg_type: taskData.kg_type || '',
        created_at: taskData.created_at || task.created_at
      };
      setResult(detail);
      setView('generate');
      // 滚动到结果区域
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    } catch (err) {
      console.error('加载详情失败:', err);
      alert('加载详情失败');
    }
  };
  
  const handleGenerate = async () => {
    if (!selectedKbId || selectedCoreKeywords.length === 0 || !selectedKgType) {
      alert('请选择知识库、知识图谱，并至少选择一个核心词');
      return;
    }
    
    setIsGenerating(true);
    setResult(null);
    setThinkingProcess('');
    setCurrentStep('');
    
    try {
      // 启动生成任务
      // 将多个核心词合并为一个字符串（用逗号分隔）
      const keywordTexts = selectedCoreKeywords.map(kw => kw.text).join('，');
      
      // 注意：多选模式下，使用第一个词条的ID（如果存在），或者使用0
      let keywordId = 0;
      if (selectedCoreKeywords.length > 0) {
        try {
          // 尝试从保留词条中查找匹配的第一个核心词
          const retainedKeywords = await getRetainedKeywords({
            knowledge_base_id: selectedKbId,
            brand_name: currentBrand.name,
            product_name: currentProduct?.name
          });
          const matched = retainedKeywords.find(kw => kw.text === selectedCoreKeywords[0].text);
          if (matched) {
            keywordId = matched.id;
          }
        } catch (err) {
          console.warn('查找保留词条失败，将使用核心词文本:', err);
        }
      }
      
      const response = await generateArticle({
        knowledge_base_id: selectedKbId,
        brand_name: currentBrand.name,
        product_name: currentProduct?.name || '',
        keyword_id: keywordId || 0, // 如果没有找到，使用0（后端需要处理这种情况）
        keyword_text: keywordTexts, // 多个词条用逗号分隔
        kg_type: selectedKgType
      });
      
      setTaskId(response.task_id);
      
      // 建立 WebSocket 连接
      const apiBaseUrl = getApiOrigin();
      const wsUrl = apiBaseUrl.replace('http://', 'ws://').replace('https://', 'wss://') + `/api/content/generate-article/ws/${response.task_id}`;
      const websocket = new WebSocket(wsUrl);
      
      websocket.onopen = () => {
        console.log('[ContentGeneration] WebSocket 连接成功');
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[ContentGeneration] WebSocket 消息:', data);
          
          if (data.type === 'connected') {
            setThinkingProcess('连接成功，开始生成...');
          } else if (data.type === 'node_update' || data.step || data.node_id) {
            // 更新思考过程
            const step = data.step || data.node_id || '';
            const message = data.message || getStepDescription(step);
            setCurrentStep(step);
            setThinkingProcess(message);
          } else if (data.type === 'complete' || (data.step === 'complete' && data.status === 'completed')) {
            // 生成完成
            const resultData = data.data || {};
            setResult({
              task_id: response.task_id,
              article: resultData.article || '',
              similarity_score: resultData.similarity_score || 0,
              score_details: resultData.score_details || {},
              co_occurrence_words: resultData.co_occurrence_words || [],
              entity_relationships: resultData.entity_relationships || [],
              iteration_count: 1,
              kg_type: selectedKgType,
              created_at: new Date().toISOString()
            });
            setIsGenerating(false);
            setThinkingProcess('');
            websocket.close();
          } else if (data.type === 'error' || data.status === 'failed') {
            alert(`生成失败: ${data.error || data.message}`);
            setIsGenerating(false);
            setThinkingProcess('');
            websocket.close();
          }
        } catch (err) {
          console.error('[ContentGeneration] 解析 WebSocket 消息失败:', err);
        }
      };
      
      websocket.onerror = (error) => {
        console.error('[ContentGeneration] WebSocket 错误:', error);
        setIsGenerating(false);
      };
      
      websocket.onclose = () => {
        console.log('[ContentGeneration] WebSocket 连接关闭');
        setWs(null);
      };
      
      setWs(websocket);
      
    } catch (err: any) {
      console.error('启动生成失败:', err);
      alert(`启动生成失败: ${err.message}`);
      setIsGenerating(false);
    }
  };
  
  const getStepDescription = (step: string): string => {
    const stepMap: Record<string, string> = {
      'step1_kg_extraction': '正在提取知识图谱信息...',
      'step2_kg_simulation': 'AI导入共现词和实体关系...',
      'step3_strategy_generation': '正在制定内容策略...',
      'step4_article_generation': '正在生成文章...',
      'step5_similarity_scoring': '正在计算相似性评分...',
      'workflow_start': '思维链分析开始...'
    };
    return stepMap[step] || `正在处理: ${step}...`;
  };
  
  const handleRegenerate = async () => {
    if (!taskId) return;
    
    try {
      const response = await regenerateArticle(taskId);
      setTaskId(response.new_task_id);
      setResult(null);
      setIsGenerating(true);
      setThinkingProcess('正在重新生成...');
      
      // 重新建立 WebSocket 连接
      const apiBaseUrl = getApiOrigin();
      const wsUrl = apiBaseUrl.replace('http://', 'ws://').replace('https://', 'wss://') + `/api/content/generate-article/ws/${response.new_task_id}`;
      const websocket = new WebSocket(wsUrl);
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'complete' || data.status === 'completed') {
            const resultData = data.data || data;
            getGenerationDetail(response.new_task_id).then(detail => {
              setResult(detail.data);
              setIsGenerating(false);
              websocket.close();
            });
          }
        } catch (err) {
          console.error('解析消息失败:', err);
        }
      };
      
      setWs(websocket);
    } catch (err: any) {
      alert(`重新生成失败: ${err.message}`);
    }
  };
  
  const handleCopyArticle = async () => {
    if (!result?.article) return;
    
    const ok = await copyToClipboard(result.article);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  // 清理 WebSocket 连接
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);
  
  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thinkingProcess, result]);
  
  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* 头部 */}
      <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className={`p-2 rounded-lg hover:bg-opacity-20 ${isDark ? 'hover:bg-white' : 'hover:bg-gray-200'}`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <FileText className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-bold">内容生成</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView(view === 'generate' ? 'history' : 'generate')}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
              view === 'history'
                ? 'bg-blue-500 text-white'
                : isDark
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
            }`}
          >
            {view === 'generate' ? (
              <>
                <History className="w-4 h-4" />
                历史记录
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                生成内容
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
        {/* 历史记录视图 */}
        {view === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">历史记录</h2>
              <button
                onClick={loadHistory}
                disabled={isLoadingHistory}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 ${
                  isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                刷新
              </button>
            </div>
            
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : historyList.length === 0 ? (
              <div className={`text-center py-20 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>暂无历史记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyList.map((task) => (
                  <div
                    key={task.task_id}
                    onClick={() => handleViewHistory(task)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      isDark
                        ? 'bg-gray-800 border-gray-700 hover:border-blue-500 hover:bg-gray-750'
                        : 'bg-white border-gray-200 hover:border-blue-500 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-sm font-medium ${
                            task.status === 'completed' ? 'text-green-500' :
                            task.status === 'processing' ? 'text-blue-500' :
                            task.status === 'failed' ? 'text-red-500' :
                            'text-gray-500'
                          }`}>
                            {task.status === 'completed' ? '已完成' :
                             task.status === 'processing' ? '生成中' :
                             task.status === 'failed' ? '失败' :
                             '待处理'}
                          </span>
                        </div>
                        <p className={`text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          <span className="font-medium">词条:</span> {task.keyword_text}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                          {task.brand_name} {task.product_name && `· ${task.product_name}`}
                        </p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                          {new Date(task.created_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} style={{ transform: 'rotate(180deg)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* 生成视图 */}
        {view === 'generate' && (
          <>
        {/* 配置选择区 */}
        <div className={`mb-6 p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <h2 className="text-lg font-semibold mb-4">配置选择</h2>
          
          <div className="space-y-4">
            {/* 知识库选择 */}
            <div>
              <label className="block text-sm font-medium mb-2">知识库</label>
              <select
                value={selectedKbId || ''}
                onChange={(e) => setSelectedKbId(Number(e.target.value))}
                className={`w-full p-2 rounded-lg border ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                }`}
              >
                <option value="">请选择知识库</option>
                {knowledgeBases.map(kb => (
                  <option key={kb.id} value={kb.id}>{kb.name}</option>
                ))}
              </select>
            </div>
            
            {/* 知识图谱选择（假的） */}
            <div>
              <label className="block text-sm font-medium mb-2">知识图谱</label>
              <select
                value={selectedKgType}
                onChange={(e) => setSelectedKgType(e.target.value)}
                className={`w-full p-2 rounded-lg border ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                }`}
              >
                <option value="">请选择知识图谱</option>
                {FAKE_KNOWLEDGE_GRAPHS.map(kg => (
                  <option key={kg.id} value={kg.name}>{kg.name}</option>
                ))}
              </select>
            </div>
            
            {/* 核心词显示（自动从最新一次词条提炼获取） */}
            <div>
              <label className="block text-sm font-medium mb-2">核心词（来自最新一次关键词生成）</label>
              {isLoadingCoreKeywords ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>正在加载核心词...</span>
                </div>
              ) : latestCoreKeywords.length > 0 ? (
                <div className={`p-3 rounded-lg border ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600' 
                    : 'bg-white border-gray-300'
                }`}>
                  <div className="space-y-2">
                    {latestCoreKeywords.map((kw, idx) => {
                      const isSelected = selectedCoreKeywords.some(selected => selected.text === kw.text);
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (isSelected) {
                              // 取消选择
                              setSelectedCoreKeywords(prev => prev.filter(selected => selected.text !== kw.text));
                            } else {
                              // 添加选择
                              setSelectedCoreKeywords(prev => [...prev, kw]);
                            }
                          }}
                          className={`p-2 rounded cursor-pointer transition-all ${
                            isSelected
                              ? isDark
                                ? 'bg-blue-500/20 border-blue-500 border-2'
                                : 'bg-blue-100 border-blue-500 border-2'
                              : isDark
                              ? 'bg-gray-600 border border-gray-500 hover:border-blue-500/50'
                              : 'bg-gray-50 border border-gray-200 hover:border-blue-500/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                isSelected
                                  ? isDark
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'bg-blue-500 border-blue-500'
                                  : isDark
                                  ? 'border-gray-400'
                                  : 'border-gray-300'
                              }`}>
                                {isSelected && (
                                  <Check className={`w-3 h-3 ${isDark ? 'text-white' : 'text-white'}`} />
                                )}
                              </div>
                              <span className={`font-medium ${
                                isSelected
                                  ? 'text-blue-500'
                                  : isDark ? 'text-white' : 'text-gray-900'
                              }`}>
                                {kw.text}
                              </span>
                            </div>
                            <span className={`text-xs ${
                              isDark ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              分数: {kw.score || 0}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {selectedCoreKeywords.length > 0 && (
                    <div className={`mt-3 p-2 rounded ${
                      isDark ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
                    }`}>
                      <p className={`text-sm mb-1 ${
                        isDark ? 'text-blue-300' : 'text-blue-700'
                      }`}>
                        <span className="font-medium">已选择 {selectedCoreKeywords.length} 个核心词：</span>
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedCoreKeywords.map((kw, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 rounded text-xs ${
                              isDark
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-blue-100 text-blue-700 border border-blue-300'
                            }`}
                          >
                            {kw.text}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`p-3 rounded-lg border ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-gray-400' 
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}>
                  <p className="text-sm">暂无核心词，请先在关键词生成模块进行生成</p>
                </div>
              )}
            </div>
          </div>
          
          {/* 生成按钮 */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedKbId || selectedCoreKeywords.length === 0 || !selectedKgType}
            className={`mt-4 w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 ${
              isGenerating || !selectedKbId || selectedCoreKeywords.length === 0 || !selectedKgType
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span>生成中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>生成文章</span>
              </>
            )}
          </button>
        </div>
        
        {/* 思考过程显示 */}
        {isGenerating && thinkingProcess && (
          <div className={`mb-6 p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="font-medium">正在思考...</span>
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {thinkingProcess}
            </p>
          </div>
        )}
        
        {/* 结果展示区 */}
        {result && !isGenerating && (
          <div className={`space-y-4 ${isDark ? 'bg-gray-800' : 'bg-gray-50'} p-6 rounded-lg`}>
            {/* 文章内容 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">生成的文章</h3>
                <button
                  onClick={handleCopyArticle}
                  className={`p-2 rounded-lg hover:bg-opacity-20 ${isDark ? 'hover:bg-white' : 'hover:bg-gray-200'}`}
                >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-white'} border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                <p className="whitespace-pre-wrap leading-relaxed">{result.article}</p>
              </div>
            </div>
            
            {/* 共现词 */}
            {result.co_occurrence_words && result.co_occurrence_words.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  共现词
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.co_occurrence_words.map((word, idx) => (
                    <span
                      key={idx}
                      className={`px-3 py-1 rounded-full text-sm ${
                        isDark 
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                          : 'bg-blue-100 text-blue-700 border border-blue-300'
                      }`}
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* 实体关系 */}
            {result.entity_relationships && result.entity_relationships.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Network className="w-5 h-5" />
                  实体关系
                </h3>
                <div className="space-y-2">
                  {result.entity_relationships.map((rel, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-white'} border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}
                    >
                      <span className="font-medium">{rel.subject}</span>
                      <span className="mx-2 text-gray-500">→</span>
                      <span className="text-blue-500">{rel.relation}</span>
                      <span className="mx-2 text-gray-500">→</span>
                      <span className="font-medium">{rel.object}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 操作按钮 */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleRegenerate}
                className={`flex-1 py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 ${
                  isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                下一次迭代
              </button>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};

export default ContentGeneration;
