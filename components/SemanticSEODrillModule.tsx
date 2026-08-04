
import React, { useState, useRef, useEffect } from 'react';
import { 
    Search, Play, Loader2, Target, Check, 
    Layers3, RefreshCw, ArrowRight, Timer, Activity, Globe, 
    Wand2, AlertCircle, Sparkles, Download, ChevronLeft, ChevronRight,
    Zap, Database, ArrowLeft, Network, Brain, X, GlobeLock
} from 'lucide-react';
import { Theme, Brand } from '../types';
import { semanticSEOAPI } from '../api/semanticSeo';
import { knowledgeBaseAPI, KnowledgeBase } from '../api/knowledgeBase';
import SemanticSEO from './SemanticSEO';
import { getApiOrigin } from '../lib/apiOrigin';

interface SemanticSEODrillModuleProps {
  theme: Theme;
  currentBrand: Brand;
  selectedProduct: string | null;
  onBack?: () => void;
  initialTaskId?: string | null;
}

const SemanticSEODrillModule: React.FC<SemanticSEODrillModuleProps> = ({ 
  theme, 
  currentBrand, 
  selectedProduct, 
  onBack,
  initialTaskId = null
}) => {
  const isDark = theme === 'dark';
  const [step, setStep] = useState<'source' | 'waiting' | 'results'>('source');
  const [isProcessing, setIsProcessing] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(initialTaskId);
  
  // 创建任务表单状态
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [selectedEntityModel, setSelectedEntityModel] = useState<string>('bert');
  const [selectedRelationModel, setSelectedRelationModel] = useState<string>('pcnn');
  
  // 选项数据
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [isLoadingKBs, setIsLoadingKBs] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  
  // Agent思考过程状态
  const [thinkingSteps, setThinkingSteps] = useState<Array<{
    step: string;
    status: 'running' | 'completed' | 'error';
    message: string;
    timestamp: number;
  }>>([]);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  
  // 加载知识库和数据任务
  useEffect(() => {
    if (step === 'source') {
      loadKnowledgeBases();
    }
  }, [step]);
  
  // 如果提供了initialTaskId，直接显示结果页
  useEffect(() => {
    if (initialTaskId) {
      setCurrentTaskId(initialTaskId);
      setStep('results');
    }
  }, [initialTaskId]);
  
  const loadKnowledgeBases = async () => {
    setIsLoadingKBs(true);
    try {
      const response = await knowledgeBaseAPI.list();
      setKnowledgeBases(response.knowledge_bases);
    } catch (error: any) {
      console.error('加载知识库失败:', error);
    } finally {
      setIsLoadingKBs(false);
    }
  };
  
  const startDrill = async () => {
    if (!keyword.trim()) {
      setCreateError('请输入关键词');
      return;
    }
    
    if (!selectedKnowledgeBase) {
      setCreateError('请选择知识库');
      return;
    }
    
    setIsProcessing(true);
    setCreateError(null);
    setThinkingSteps([]);
    setStep('waiting');
    
    try {
      const result = await semanticSEOAPI.createDrillTask(
        undefined,
        keyword.trim(),
        currentBrand.id,
        selectedKnowledgeBase.id,
        undefined,
        selectedEntityModel,
        selectedRelationModel
      );
      
      if (result.task_id) {
        setCurrentTaskId(result.task_id);
        subscribeToProgress(result.task_id);
      } else {
        throw new Error('未收到任务ID');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '创建下钻任务失败';
      setCreateError(errorMsg);
      console.error('创建下钻任务失败:', err);
      setStep('source');
      setIsProcessing(false);
    }
  };
  
  const subscribeToProgress = (taskId: string) => {
    // 关闭之前的连接
    if (wsConnection) {
      wsConnection.close();
    }
    
    // WebSocket URL
    const baseURL = getApiOrigin();
    const wsUrl = baseURL.replace(/^http/, 'ws') + `/api/semantic-seo/tasks/${taskId}/ws`;
    
    console.log('====== WebSocket 订阅开始 ======');
    console.log('🔗 连接 URL:', wsUrl);
    console.log('🆔 taskId:', taskId);
    console.log('==========================');
    
    // 创建 WebSocket 连接
    const ws = new WebSocket(wsUrl);
    setWsConnection(ws);
    
    // 心跳定时器
    let heartbeatTimer: NodeJS.Timeout | null = null;
    
    ws.onopen = () => {
      console.log('✅ WebSocket 连接已建立');
      
      // 启动心跳（每30秒发送一次ping）
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
        
        // 处理心跳响应
        if (data.type === 'ping' || data.type === 'pong') {
          console.log('💓 收到心跳响应');
          return;
        }
        
        // 检查是否是结束标记
        if (data.type === 'end' || data.type === 'complete') {
          console.log('✅ WebSocket 流结束');
          ws.close();
          setIsProcessing(false);
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          
          // 直接显示结果页，SemanticSEO 组件会自己加载数据
          if (taskId) {
            setStep('results');
          }
          return;
        }
        
        // 添加思考步骤
        setThinkingSteps(prev => {
          const newSteps = [...prev];
          const existingIndex = newSteps.findIndex(s => s.step === data.step);
          
          const stepData = {
            step: data.step || 'unknown',
            status: (data.status === 'completed' ? 'completed' : data.status === 'error' ? 'error' : 'running') as 'running' | 'completed' | 'error',
            message: data.message || '处理中...',
            timestamp: Date.now()
          };
          
          if (existingIndex >= 0) {
            newSteps[existingIndex] = stepData;
          } else {
            newSteps.push(stepData);
          }
          
          return newSteps;
        });
        
        // 如果收到错误事件
        if (data.status === 'error') {
          console.error('❌ 收到错误事件:', data.message);
          setCreateError(data.message || '下钻失败');
          setIsProcessing(false);
          ws.close();
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          setStep('source');
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
      }
    };
  };
  
  // 清理连接
  useEffect(() => {
    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, [wsConnection]);
  
  return (
    <div className="flex h-full p-4 lg:p-6 gap-6 relative font-sans">
      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col rounded-2xl shadow-sm border overflow-hidden relative h-full min-w-0 ${isDark ? 'bg-geo-card border-geo-border' : 'bg-white border-slate-200'}`}>
        <div className="p-8 lg:p-12 overflow-y-auto flex-1 no-scrollbar">
          <div className="max-w-7xl mx-auto space-y-10 pb-20">
            
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="flex items-center gap-4">
                {onBack && (
                  <button 
                    onClick={onBack}
                    className={`p-2 rounded-xl transition-all hover-scale ${isDark ? 'hover:bg-geo-bg text-geo-text-sec hover:text-geo-blue' : 'hover:bg-slate-100 text-slate-600'}`}
                    title="返回"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <div>
                  <div className={`flex items-center gap-2 mb-2 text-xs font-semibold  ${isDark ? 'text-geo-blue geo-glow-text' : 'text-blue-500'}`}>
                    <GlobeLock className="w-3.5 h-3.5" /> Semantic SEO / GEO Engine v5.0
                  </div>
                  <h2 className={`text-4xl font-semibold tracking-tight ${isDark ? 'text-geo-text-main' : 'text-slate-900'}`}>知识图谱</h2>
                  <p className={`mt-2 font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    基于知识库与关键词，使用 AI 工作流生成知识图谱。
                  </p>
                </div>
              </div>
            </div>

            {step === 'source' && (
              <div className="space-y-8">
                {/* Knowledge Base Selection */}
                <div className="space-y-4">
                  <label className={`text-xs font-semibold  ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`}>选择知识库 (Knowledge Base)</label>
                  {isLoadingKBs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-geo-blue" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                      {knowledgeBases.map((kb) => (
                        <button
                          key={kb.id}
                          onClick={() => setSelectedKnowledgeBase(kb)}
                          className={`p-4 rounded-2xl border-2 text-left transition-all ${selectedKnowledgeBase?.id === kb.id
                            ? (isDark ? 'bg-gradient-coral border-[#E8553F] text-white shadow-coral hover:opacity-95' : 'bg-gradient-coral border-[#E8553F] text-white shadow-coral hover:opacity-95')
                            : (isDark ? 'bg-zinc-800 border-zinc-700 text-white hover:border-geo-blue' : 'bg-white border-slate-200 text-slate-900 hover:border-blue-500')
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Database className="w-4 h-4" />
                            <div className="font-bold text-sm">{kb.name}</div>
                          </div>
                          <div className="text-xs opacity-60 mt-1">{kb.description || '无描述'}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Entity Model Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-semibold  ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`}>实体识别模型 (Entity Model)</label>
                    <span className={`text-[9px] font-bold  px-2 py-1 rounded ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-500'}`}>
                      选择核心引擎
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'bert', name: 'BERT', desc: '双向编码器', icon: Brain, color: 'blue' },
                      { id: 'roberta', name: 'RoBERTa', desc: '优化BERT', icon: Brain, color: 'purple' },
                      { id: 'albert', name: 'ALBERT', desc: '轻量级BERT', icon: Brain, color: 'green' },
                      { id: 'electra', name: 'ELECTRA', desc: '高效预训练', icon: Brain, color: 'blue' },
                    ].map((model) => {
                      const Icon = model.icon;
                      const isSelected = selectedEntityModel === model.id;
                      return (
                        <button
                          key={model.id}
                          onClick={() => setSelectedEntityModel(model.id)}
                          className={`group relative p-3 rounded-xl border-2 text-center transition-all overflow-hidden
                            ${isSelected
                              ? (isDark 
                                  ? 'bg-gradient-coral border-[#E8553F] text-white shadow-coral hover:opacity-95' 
                                  : 'bg-gradient-coral border-[#E8553F] text-white shadow-coral hover:opacity-95 shadow-lg')
                              : (isDark 
                                  ? 'bg-zinc-800 border-zinc-700 text-white hover:border-geo-blue hover:bg-zinc-750' 
                                  : 'bg-white border-slate-200 text-slate-900 hover:border-blue-500 hover:shadow-md')
                            }
                          `}
                        >
                          {isSelected && (
                            <div className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-xl opacity-20 ${isDark ? 'bg-white' : 'bg-blue-200'}`}></div>
                          )}
                          <div className="relative flex flex-col items-center gap-2">
                            <div className={`p-2 rounded-lg ${isSelected 
                              ? (isDark ? 'bg-white/20' : 'bg-white/30')
                              : (isDark ? 'bg-zinc-700' : 'bg-slate-100')
                            }`}>
                              <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : (isDark ? 'text-zinc-400' : 'text-slate-500')}`} />
                            </div>
                            <div className="w-full">
                              <div className={`font-semibold text-xs mb-0.5 ${isSelected ? 'text-white' : (isDark ? 'text-white' : 'text-slate-900')}`}>
                                {model.name}
                              </div>
                              <div className={`text-[9px] font-medium leading-tight ${isSelected ? 'text-white/80' : (isDark ? 'text-zinc-400' : 'text-slate-500')}`}>
                                {model.desc}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="absolute top-1 right-1">
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Relation Model Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-semibold  ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`}>关系模型 (Relation Model)</label>
                    <span className={`text-[9px] font-bold  px-2 py-1 rounded ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-500'}`}>
                      选择关系引擎
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'pcnn', name: 'PCNN', desc: '分段卷积网络', icon: Network, color: 'blue' },
                      { id: 'bilstm', name: 'BiLSTM', desc: '双向LSTM', icon: Network, color: 'purple' },
                      { id: 'att_pooling', name: 'Att-Pooling', desc: '注意力池化', icon: Network, color: 'green' },
                      { id: 'transformer', name: 'Transformer', desc: '自注意力机制', icon: Network, color: 'blue' },
                    ].map((model) => {
                      const Icon = model.icon;
                      const isSelected = selectedRelationModel === model.id;
                      return (
                        <button
                          key={model.id}
                          onClick={() => setSelectedRelationModel(model.id)}
                          className={`group relative p-3 rounded-xl border-2 text-center transition-all overflow-hidden
                            ${isSelected
                              ? (isDark 
                                  ? 'bg-gradient-coral border-[#E8553F] text-white shadow-coral hover:opacity-95' 
                                  : 'bg-gradient-coral border-[#E8553F] text-white shadow-coral hover:opacity-95 shadow-lg')
                              : (isDark 
                                  ? 'bg-zinc-800 border-zinc-700 text-white hover:border-geo-blue hover:bg-zinc-750' 
                                  : 'bg-white border-slate-200 text-slate-900 hover:border-blue-500 hover:shadow-md')
                            }
                          `}
                        >
                          {isSelected && (
                            <div className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-xl opacity-20 ${isDark ? 'bg-white' : 'bg-blue-200'}`}></div>
                          )}
                          <div className="relative flex flex-col items-center gap-2">
                            <div className={`p-2 rounded-lg ${isSelected 
                              ? (isDark ? 'bg-white/20' : 'bg-white/30')
                              : (isDark ? 'bg-zinc-700' : 'bg-slate-100')
                            }`}>
                              <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : (isDark ? 'text-zinc-400' : 'text-slate-500')}`} />
                            </div>
                            <div className="w-full">
                              <div className={`font-semibold text-xs mb-0.5 ${isSelected ? 'text-white' : (isDark ? 'text-white' : 'text-slate-900')}`}>
                                {model.name}
                              </div>
                              <div className={`text-[9px] font-medium leading-tight ${isSelected ? 'text-white/80' : (isDark ? 'text-zinc-400' : 'text-slate-500')}`}>
                                {model.desc}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="absolute top-1 right-1">
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Keyword Input */}
                <div className="space-y-4">
                  <label className={`text-xs font-semibold  ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`}>主题关键词 (Theme Keyword) <span className="text-xs font-normal opacity-60">选填</span></label>
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="例如：大理旅游"
                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all font-medium
                      ${isDark 
                        ? 'bg-black/30 border-geo-border text-white placeholder:text-geo-text-sec/50 focus:border-geo-blue' 
                        : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500'
                      }
                    `}
                  />
                </div>

                {createError && (
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {createError}
                  </div>
                )}

                {/* Start Button */}
                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    onClick={startDrill}
                    disabled={isProcessing || !selectedKnowledgeBase || !keyword.trim()}
                    className={`px-5 py-2.5 rounded-2xl font-semibold text-sm  bg-gradient-coral text-white shadow-coral hover:opacity-95 transition-all flex items-center gap-2 ${(isProcessing || !selectedKnowledgeBase || !keyword.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <ArrowRight className="w-4 h-4" />}
                    开始下钻
                  </button>
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
                                <Check className={`w-4 h-4 ${isDark ? 'text-geo-blue' : 'text-green-600'}`} />
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
                    <h2 className={`text-3xl font-semibold tracking-tight ${isDark ? 'text-geo-text-main' : 'text-slate-900'}`}>正在启动工作流...</h2>
                    <p className={`text-sm font-bold opacity-50 mt-5 max-w-lg ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>系统正在初始化知识图谱任务</p>
                  </>
                )}
              </div>
            )}

            {step === 'results' && currentTaskId && (
              <SemanticSEO 
                theme={theme} 
                taskId={currentTaskId} 
                onBack={onBack}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SemanticSEODrillModule;
