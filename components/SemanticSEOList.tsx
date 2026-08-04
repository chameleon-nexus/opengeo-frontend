
import React, { useState, useEffect, useMemo } from 'react';
import { 
  GlobeLock, Plus, Clock, CheckCircle2, Loader2, 
  AlertCircle, ChevronRight, Database, Search, X,
  Brain, Network, ArrowRight, Check, RefreshCcw, Trash2
} from 'lucide-react';
import { Theme, SemanticSEOTask, Brand } from '../types';
import { geoWorkflowAPI } from '../api/geoWorkflow';
import { semanticSEOAPI } from '../api/semanticSeo';
import { knowledgeBaseAPI, KnowledgeBase } from '../api/knowledgeBase';
import { useModuleI18n } from '../i18n/hooks';

interface SemanticSEOListProps {
  theme: Theme;
  currentBrand: Brand | null;
  onTaskSelect: (taskId: string) => void;
  /** 驾驶舱：仅展示属于该 GEO 主线的图谱任务（无则空列表） */
  scopeWorkflowId?: string | null;
  /** 驾驶舱：workflow 已绑定的图谱任务（列表 JOIN 未返回时仍展示） */
  pinnedSemanticSeoTaskId?: string | null;
  /** 驾驶舱：workflow 已绑定的知识库（列表 JOIN 未返回时仍展示） */
  pinnedKnowledgeBaseId?: number | null;
  /** 驾驶舱：新建图谱后写回 workflow.semantic_seo_task_id（取首个创建结果） */
  bindGeoWorkflowId?: string | null;
  onGeoWorkflowUpdated?: () => void;
  /** 嵌入优化驾驶舱：全宽布局 */
  embedded?: boolean;
}

function filterKnowledgeBasesForScope(
  list: KnowledgeBase[],
  scopeWorkflowId: string | null | undefined,
  pinnedKnowledgeBaseId: number | null | undefined,
): KnowledgeBase[] {
  if (!scopeWorkflowId?.trim()) return list;
  const wid = scopeWorkflowId.trim();
  return list.filter(
    (kb) =>
      kb.geo_workflow_id === wid ||
      (pinnedKnowledgeBaseId != null && kb.id === pinnedKnowledgeBaseId),
  );
}

const SemanticSEOList: React.FC<SemanticSEOListProps> = ({
  theme,
  currentBrand,
  onTaskSelect,
  scopeWorkflowId = null,
  pinnedSemanticSeoTaskId = null,
  pinnedKnowledgeBaseId = null,
  bindGeoWorkflowId = null,
  onGeoWorkflowUpdated,
  embedded = false,
}) => {
  const { t } = useModuleI18n('semanticSeo');
  const { t: tc } = useModuleI18n('common');
  const workflowGraphLimitMsg = t('empty.workflowLimit');
  const isDark = theme === 'dark';
  const pageShellCls = embedded
    ? 'w-full px-4 md:px-6 py-6 space-y-6'
    : 'max-w-7xl mx-auto px-6 py-8 space-y-6';
  const [view, setView] = useState<'list'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Task list state
  const [tasks, setTasks] = useState<SemanticSEOTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  
  // Creation workflow state
  const [graphName, setGraphName] = useState("");  // 图谱名称
  const [keyword, setKeyword] = useState("");
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [selectedEntityModel, setSelectedEntityModel] = useState<string>('bert');
  const [selectedRelationModel, setSelectedRelationModel] = useState<string>('pcnn');
  
  // Options state
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [isLoadingKBs, setIsLoadingKBs] = useState(false);
  const [listSearch, setListSearch] = useState('');

  const scopedTasks = useMemo(() => {
    if (!scopeWorkflowId?.trim()) return tasks;
    const wid = scopeWorkflowId.trim();
    const pinned = pinnedSemanticSeoTaskId?.trim() || null;
    return tasks.filter(
      (t) => t.geo_workflow_id === wid || (pinned != null && t.task_id === pinned),
    );
  }, [tasks, scopeWorkflowId, pinnedSemanticSeoTaskId]);

  const filteredTasks = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return scopedTasks;
    return scopedTasks.filter(
      (t) =>
        (t.task_id || '').toLowerCase().includes(q) ||
        (t.name || '').toLowerCase().includes(q) ||
        (t.geo_workflow_label || '').toLowerCase().includes(q)
    );
  }, [scopedTasks, listSearch]);

  const isWorkflowScoped = Boolean(scopeWorkflowId?.trim());
  const workflowGraphAtLimit =
    isWorkflowScoped &&
    (scopedTasks.length >= 1 || Boolean(pinnedSemanticSeoTaskId?.trim()));

  const handleOpenCreateModal = () => {
    if (workflowGraphAtLimit) {
      window.alert(workflowGraphLimitMsg);
      return;
    }
    setIsModalOpen(true);
  };

  // Load tasks on component mount
  useEffect(() => {
    void loadTasks();
  }, [scopeWorkflowId, pinnedSemanticSeoTaskId]);

  // Load knowledge bases when modal opens
  useEffect(() => {
    if (isModalOpen) {
      void loadKnowledgeBases();
    }
  }, [isModalOpen, scopeWorkflowId, pinnedKnowledgeBaseId]);

  useEffect(() => {
    if (!isModalOpen || knowledgeBases.length === 0) return;
    if (pinnedKnowledgeBaseId != null) {
      const match = knowledgeBases.find((kb) => kb.id === pinnedKnowledgeBaseId);
      if (match) {
        setSelectedKnowledgeBase(match);
        return;
      }
    }
    if (knowledgeBases.length === 1) {
      setSelectedKnowledgeBase(knowledgeBases[0]);
    }
  }, [isModalOpen, knowledgeBases, pinnedKnowledgeBaseId]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setGraphName("");
    setKeyword("");
    setSelectedKnowledgeBase(null);
    setSelectedEntityModel('bert');
    setSelectedRelationModel('pcnn');
    setCreateError(null);
  };

  // Load tasks from API
  const loadTasks = async () => {
    setIsLoadingTasks(true);
    try {
      const data = await semanticSEOAPI.listTasks({
        skip: 0,
        limit: 100
      });
      setTasks(data);
    } catch (error: any) {
      console.error('加载语义SEO任务失败:', error);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Load knowledge bases from API
  const loadKnowledgeBases = async () => {
    setIsLoadingKBs(true);
    try {
      const response = scopeWorkflowId?.trim()
        ? await knowledgeBaseAPI.list()
        : await knowledgeBaseAPI.list(currentBrand?.id);
      let list = filterKnowledgeBasesForScope(
        response.knowledge_bases,
        scopeWorkflowId,
        pinnedKnowledgeBaseId,
      );
      if (
        scopeWorkflowId?.trim() &&
        pinnedKnowledgeBaseId != null &&
        !list.some((kb) => kb.id === pinnedKnowledgeBaseId)
      ) {
        try {
          const kb = await knowledgeBaseAPI.get(pinnedKnowledgeBaseId);
          list = [kb, ...list];
        } catch {
          /* 知识库可能已删除 */
        }
      }
      setKnowledgeBases(list);
    } catch (error: unknown) {
      console.error('加载知识库失败:', error);
    } finally {
      setIsLoadingKBs(false);
    }
  };

  // Handle create task
  const handleCreateTask = async () => {
    if (workflowGraphAtLimit) {
      setCreateError(WORKFLOW_GRAPH_SINGLE_LIMIT_MSG);
      return;
    }
    if (!selectedKnowledgeBase) {
      setCreateError(t('errors.selectKb'));
      return;
    }

    setIsCreatingTask(true);
    setCreateError(null);
    try {
      const result = await semanticSEOAPI.createDrillTask(
        graphName.trim() || undefined,
        keyword.trim() || undefined,
        currentBrand?.id || undefined,
        selectedKnowledgeBase.id,
        undefined,
        selectedEntityModel,
        selectedRelationModel,
      );
      console.log('✓ 任务创建成功:', result.task_id);

      const firstTaskId = result.task_id?.trim();
      if (bindGeoWorkflowId?.trim() && firstTaskId) {
        await geoWorkflowAPI.advance(bindGeoWorkflowId.trim(), {
          semantic_seo_task_id: firstTaskId,
        });
        onGeoWorkflowUpdated?.();
      }

      // 重置表单并关闭弹窗
      handleCloseModal();

      // 重新加载任务列表
      await loadTasks();
    } catch (error: any) {
      console.error('创建语义下钻任务失败:', error);
      setCreateError(error.message || t('errors.createFailed'));
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleDeleteTask = async (task: SemanticSEOTask, e: React.MouseEvent) => {
    e.stopPropagation();
    const taskId = (task.task_id || '').trim();
    if (!taskId) return;

    const label = task.name?.trim() || taskId;
    if (!window.confirm(t('confirm.delete'))) {
      return;
    }

    setDeletingTaskId(taskId);
    try {
      if (bindGeoWorkflowId?.trim()) {
        await geoWorkflowAPI.clearKnowledgeGraph(bindGeoWorkflowId.trim());
        onGeoWorkflowUpdated?.();
      } else {
        await semanticSEOAPI.deleteTask(taskId);
      }
      await loadTasks();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('errors.deleteFailed');
      window.alert(msg);
    } finally {
      setDeletingTaskId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${isDark ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-green-100 text-green-700'}`}>
            <CheckCircle2 className="w-3 h-3" /> {t('status.completed')}
          </span>
        );
      case 'processing':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-700'}`}>
            <Loader2 className="w-3 h-3 animate-spin" /> {t('status.running')}
          </span>
        );
      case 'pending':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${isDark ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' : 'bg-slate-100 text-slate-500'}`}>
            <Clock className="w-3 h-3" /> {t('status.pending')}
          </span>
        );
      case 'failed':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${isDark ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-red-100 text-red-700'}`}>
            <AlertCircle className="w-3 h-3" /> {t('status.failed')}
          </span>
        );
      default:
        return null;
    }
  };

  const toolbarBorder = isDark ? 'border-zinc-700/80' : 'border-gray-100';
  const searchInputCls = isDark
    ? 'w-full min-w-[11rem] max-w-xs pl-7 pr-2 py-1.5 text-xs rounded-lg border border-zinc-600 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/25 focus:border-[#E8553F]/50'
    : 'w-full min-w-[11rem] max-w-xs pl-7 pr-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/20 focus:border-[#E8553F]/50';

  return (
    <div className={`h-full min-h-0 flex flex-col ${isDark ? 'bg-geo-bg' : 'bg-[#F5F5F7]'}`}>
      <div className={`flex-1 flex flex-col overflow-hidden relative h-full min-h-0 ${isDark ? 'bg-geo-bg' : ''}`}>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className={pageShellCls}>
            <div>
              <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-geo-text-main' : 'text-gray-900'}`}>{t('pageTitle')}</h2>
            </div>

          <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-geo-bg/30 border-geo-border' : 'bg-white border-gray-200'}`}>
            <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b ${toolbarBorder}`}>
              <div className="relative shrink-0 flex-1 min-w-[10rem] max-w-xs">
                <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-500' : 'text-gray-300'}`} />
                <input
                  type="text"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder={t('form.searchPlaceholder')}
                  className={searchInputCls}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 ml-auto sm:ml-0">
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  title={workflowGraphAtLimit ? workflowGraphLimitMsg : undefined}
                  className={`btn-geo-primary shrink-0 inline-flex items-center gap-1.5 ${workflowGraphAtLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Plus className="w-4 h-4" /> {t('actions.create')}
                </button>
                <button
                  type="button"
                  onClick={() => loadTasks()}
                  className={`p-1.5 rounded-lg transition-colors shrink-0 ${isDark ? 'text-zinc-400 hover:text-[#E8553F] hover:bg-[#E8553F]/10' : 'text-gray-400 hover:text-[#E8553F] hover:bg-[#FFF6F2]'}`}
                  title={t('actions.refresh')}
                >
                  <RefreshCcw className={`w-3.5 h-3.5 ${isLoadingTasks ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3">{t('table.taskId')}</th>
                    <th className="px-4 py-3">{t('table.graphName')}</th>
                    <th className="px-4 py-3">GEO</th>
                    <th className="px-4 py-3">{t('table.createdAt')}</th>
                    <th className="px-4 py-3 text-center">{t('form.entityModel')}</th>
                    <th className="px-4 py-3 text-center">{t('form.relationModel')}</th>
                    <th className="px-4 py-3 text-center">{t('table.status')}</th>
                    <th className="px-4 py-3 text-right">关系数</th>
                    <th className="px-4 py-3 text-right">共现词数</th>
                    {isWorkflowScoped ? <th className="px-4 py-3 text-center w-20">{t('table.actions')}</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {isLoadingTasks ? (
                    <tr>
                      <td colSpan={isWorkflowScoped ? 10 : 9} className="px-4 py-12 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
                      </td>
                    </tr>
                  ) : scopedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={isWorkflowScoped ? 10 : 9} className="px-4 py-12 text-center text-sm opacity-50">
                        {t('empty.noTasks')}
                      </td>
                    </tr>
                  ) : filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={isWorkflowScoped ? 10 : 9} className="px-4 py-12 text-center text-xs text-gray-400">
                        {tc('status.noData')}
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => (
                      <tr 
                        key={task.id || task.task_id} 
                        onClick={() => { onTaskSelect(task.task_id); }}
                        className={`group transition-colors cursor-pointer ${isDark ? 'hover:bg-geo-card/50' : 'hover:bg-[#FFF9F6]/80'}`}
                      >
                        <td className="px-4 py-3">
                          <span className={`font-mono text-sm px-3 py-1.5 rounded border ${isDark ? 'border-geo-border bg-geo-card text-geo-text-main' : 'border-slate-200 bg-slate-50 text-slate-900'}`}>{task.task_id}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {task.name || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <span className={`text-xs leading-snug ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                            {task.geo_workflow_label?.trim() ? task.geo_workflow_label : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium flex items-center gap-2 ${isDark ? 'text-geo-text-sec' : 'text-slate-600'}`}>
                            <Clock className="w-4 h-4" />
                            {new Date(task.created_at).toLocaleString('zh-CN')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-semibold  ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                            {task.entity_model || 'bert'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-semibold  ${isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                            {task.relation_model || 'pcnn'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getStatusBadge(task.status)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {task.status === 'completed' ? (
                            <div className="inline-flex items-center gap-3">
                               <div className="text-right">
                                  <div className={`font-semibold text-lg ${isDark ? 'text-geo-blue' : 'text-slate-900'}`}>{task.total_relations || 0}</div>
                                  <div className="text-[9px]  opacity-40 font-bold">Relations</div>
                               </div>
                               <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                            </div>
                          ) : (
                            <div className="flex justify-end pr-2 opacity-20">-</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {task.status === 'completed' ? (
                            <div className="text-right">
                              <div className={`font-semibold text-lg ${isDark ? 'text-geo-blue' : 'text-slate-900'}`}>{task.total_cooccurrence_words || 0}</div>
                              <div className="text-[9px]  opacity-40 font-bold">Words</div>
                            </div>
                          ) : (
                            <div className="flex justify-end pr-2 opacity-20">-</div>
                          )}
                        </td>
                        {isWorkflowScoped ? (
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              title={t('actions.delete')}
                              disabled={deletingTaskId === task.task_id}
                              onClick={(e) => void handleDeleteTask(task, e)}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                                isDark
                                  ? 'text-zinc-400 hover:bg-red-500/15 hover:text-red-400'
                                  : 'text-slate-400 hover:bg-red-50 hover:text-red-600'
                              } disabled:opacity-40`}
                            >
                              {deletingTaskId === task.task_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity duration-500" onClick={handleCloseModal}></div>
          <div className={`absolute inset-0 flex items-center justify-center p-4 pointer-events-none`}>
            <div className={`relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-sm pointer-events-auto flex flex-col ${isDark ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
              <header className="p-6 border-b flex items-center justify-between shrink-0">
                <h3 className="text-2xl font-semibold">{t('actions.create')}</h3>
                <button onClick={handleCloseModal} className="p-2 rounded-full hover:bg-black/5 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </header>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-8" onClick={e => e.stopPropagation()}>
                {/* Graph Name */}
                <div className="space-y-4">
                  <label className={`text-xs font-semibold  ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{t('form.graphName')}</label>
                  <input
                    type="text"
                    value={graphName}
                    onChange={(e) => setGraphName(e.target.value)}
                    placeholder={t('form.graphNamePlaceholder')}
                    className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-geo-blue' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'}`}
                  />
                </div>
                
                {/* Knowledge Base Selection */}
                <div className="space-y-4">
                  <label className={`text-xs font-semibold  ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{t('form.knowledgeBase')}</label>
                  {isLoadingKBs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                      {knowledgeBases.length === 0 ? (
                        <div
                          className={`col-span-2 p-4 rounded-2xl border-2 text-center text-sm ${
                            isDark
                              ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          {scopeWorkflowId?.trim()
                            ? t('empty.noWorkflowKb')
                            : t('empty.noKnowledgeBases')}
                        </div>
                      ) : (
                        knowledgeBases.map((kb) => (
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
                          <div className="text-xs opacity-60 mt-1">{kb.description || '—'}</div>
                        </button>
                      ))
                      )}
                    </div>
                  )}
                </div>

                {/* Entity Model Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-semibold  ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{t('form.entityModel')}</label>
                    <span className={`text-[9px] font-bold  px-2 py-1 rounded ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-500'}`}>
                      选择核心引擎
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {(
                      [
                        { id: 'bert', icon: Brain },
                        { id: 'roberta', icon: Brain },
                        { id: 'albert', icon: Brain },
                        { id: 'electra', icon: Brain },
                      ] as const
                    ).map((model) => {
                      const Icon = model.icon;
                      const isSelected = selectedEntityModel === model.id;
                      const name = t(`models.entity.${model.id}.name`);
                      const desc = t(`models.entity.${model.id}.desc`);
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
                                {name}
                              </div>
                              <div className={`text-[9px] font-medium leading-tight ${isSelected ? 'text-white/80' : (isDark ? 'text-zinc-400' : 'text-slate-500')}`}>
                                {desc}
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
                    <label className={`text-xs font-semibold  ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{t('form.relationModel')}</label>
                    <span className={`text-[9px] font-bold  px-2 py-1 rounded ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-500'}`}>
                      选择关系引擎
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {(
                      [
                        { id: 'pcnn', icon: Network },
                        { id: 'bilstm', icon: Network },
                        { id: 'att_pooling', icon: Network },
                        { id: 'transformer', icon: Network },
                      ] as const
                    ).map((model) => {
                      const Icon = model.icon;
                      const isSelected = selectedRelationModel === model.id;
                      const name = t(`models.relation.${model.id}.name`);
                      const desc = t(`models.relation.${model.id}.desc`);
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
                                {name}
                              </div>
                              <div className={`text-[9px] font-medium leading-tight ${isSelected ? 'text-white/80' : (isDark ? 'text-zinc-400' : 'text-slate-500')}`}>
                                {desc}
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
                  <label className={`text-xs font-semibold  ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{t('form.keyword')}</label>
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder={t('form.keywordPlaceholder')}
                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all font-medium
                      ${isDark 
                        ? 'bg-black/30 border-zinc-700 text-white placeholder:text-zinc-400/50 focus:border-geo-blue' 
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
              </div>

              <footer className="p-6 border-t flex justify-end gap-3 shrink-0">
                <button 
                  onClick={handleCloseModal} 
                  className={`px-6 py-3 rounded-xl text-xs font-semibold  border transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 hover:text-white' : 'bg-slate-100 border-slate-200'}`}
                >
                  {tc('actions.cancel')}
                </button>
                <button 
                  onClick={handleCreateTask}
                  disabled={isCreatingTask || !selectedKnowledgeBase}
                  className={`px-6 py-3 rounded-xl text-xs font-semibold  bg-gradient-coral text-white shadow-coral hover:opacity-95 transition-all flex items-center gap-2 ${(isCreatingTask || !selectedKnowledgeBase) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isCreatingTask ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <ArrowRight className="w-4 h-4" />}
                  {isCreatingTask ? t('actions.creating') : t('actions.create')}
                </button>
              </footer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SemanticSEOList;
