
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Download, Globe, Database, Clock, CheckCircle2, Loader2, Filter, Eye, PenLine, Trash2, Sparkles, RefreshCcw } from 'lucide-react';
import { Theme, Brand, ModuleType } from '../types';
import { knowledgeAPI, ExtractionTask } from '../api/knowledge';
import { useModuleI18n } from '../i18n/hooks';
import Pagination from './Pagination';

interface ExtractListProps {
  theme: Theme;
  currentBrand?: Brand | null;
  allBrands?: Brand[];
  onBrandChange?: (brand: Brand) => void;
  onNavigateToBrandManagement?: () => void;
  onNewTask: (productId?: string | null) => void;
  onNavigate?: (module: ModuleType, taskId?: string | null) => void;
}

const PAGE_SIZE = 20;

const ExtractList: React.FC<ExtractListProps> = ({ theme, onNewTask, onNavigate }) => {
  const { t, i18n } = useModuleI18n('extract');
  const isDark = theme === 'dark';
  const [currentPage, setCurrentPage] = useState(1);
  const [tasks, setTasks] = useState<ExtractionTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await knowledgeAPI.getExtractionHistory({
        skip: (currentPage - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
        search: searchQuery || undefined,
      });
      setTasks(response.tasks || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      setError(err.message || t('errors.loadFailed'));
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, t]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleSearch = () => {
    setCurrentPage(1);
    setSearchQuery(searchInput.trim());
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleViewTask = (taskId: string) => {
    if (onNavigate) onNavigate(ModuleType.EXTRACT, taskId);
  };

  const handleDeleteTask = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (!window.confirm(t('confirm.delete'))) return;
    try {
      await knowledgeAPI.deleteExtractionTask(taskId);
      await loadHistory();
    } catch (err: any) {
      alert(err?.message || t('errors.deleteFailed'));
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString(i18n.language, {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      }).replace(/\//g, '-');
    } catch { return dateStr; }
  };

  const toolbarBorder = isDark ? 'border-zinc-700/80' : 'border-gray-100';
  const searchInputCls = isDark
    ? 'w-full min-w-[11rem] max-w-xs pl-7 pr-2 py-1.5 text-xs rounded-lg border border-zinc-600 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/25 focus:border-[#E8553F]/50'
    : 'w-full min-w-[11rem] max-w-xs pl-7 pr-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/20 focus:border-[#E8553F]/50';

  return (
    <div className={`h-full min-h-0 flex flex-col ${isDark ? 'bg-geo-bg' : 'bg-[#F5F5F7]'}`}>
      <div className={`flex-1 flex flex-col overflow-hidden relative h-full min-h-0 ${isDark ? 'bg-geo-bg' : ''}`}>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
            <div>
              <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-geo-text-main' : 'text-gray-900'}`}>{t('pageTitle')}</h2>
              <p className={`mt-1 text-sm max-w-3xl ${isDark ? 'text-geo-text-sec' : 'text-gray-500'}`}>
                {t('subtitle')}
              </p>
            </div>

            {error && (
              <div className={`p-4 rounded-xl ${isDark ? 'bg-red-900/20 border border-red-800 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                {error}
              </div>
            )}

            <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-geo-bg/30 border-geo-border' : 'bg-white border-gray-200'}`}>
              <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b ${toolbarBorder}`}>
                <div className="relative shrink-0 flex-1 min-w-[10rem] max-w-xs">
                  <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-500' : 'text-gray-300'}`} />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={t('form.searchPlaceholder')}
                    className={searchInputCls}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 ml-auto sm:ml-0">
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate(ModuleType.MANUAL_INPUT)}
                    className="btn-geo-secondary shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg"
                  >
                    <PenLine className="w-4 h-4" /> {t('actions.manualInput')}
                  </button>
                  <button type="button" onClick={() => onNewTask(null)} className="btn-geo-primary shrink-0 inline-flex items-center gap-1.5">
                    <Plus className="w-4 h-4" /> {t('actions.newTask')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSearch}
                    className={`p-1.5 rounded-lg transition-colors shrink-0 ${isDark ? 'text-zinc-400 hover:text-[#E8553F] hover:bg-[#E8553F]/10' : 'text-gray-400 hover:text-[#E8553F] hover:bg-[#FFF6F2]'}`}
                    title={t('actions.filter')}
                  >
                    <Filter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadHistory()}
                    className={`p-1.5 rounded-lg transition-colors shrink-0 ${isDark ? 'text-zinc-400 hover:text-[#E8553F] hover:bg-[#E8553F]/10' : 'text-gray-400 hover:text-[#E8553F] hover:bg-[#FFF6F2]'}`}
                    title={t('actions.refresh')}
                  >
                    <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3">{t('table.taskId')}</th>
                    <th className="px-4 py-3">{t('table.packName')}</th>
                    <th className="px-4 py-3">{t('table.type')}</th>
                    <th className="px-4 py-3">{t('table.time')}</th>
                    <th className="px-4 py-3">{t('table.source')}</th>
                    <th className="px-4 py-3">{t('table.keywordCount')}</th>
                    <th className="px-4 py-3">{t('table.status')}</th>
                    <th className="px-4 py-3 text-right">{t('table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {loading ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-geo-blue mx-auto" /></td></tr>
                  ) : tasks.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-sm opacity-50">{t('empty.noHistory')}</td></tr>
                  ) : tasks.map(task => {
                    const isBrandParse = task.model_type === 'brand_parse' || task.source === '品牌解析';
                    const isManual = task.model_type === 'manual';
                    const isNormal = task.model_type === 'traditional' || task.model_type === 'word_expand';
                    const isSemantic = !isManual && !isNormal && !isBrandParse;
                    return (
                    <tr key={task.id} className={`group transition-colors ${isDark ? 'hover:bg-geo-card/50' : 'hover:bg-[#FFF9F6]/80'}`}>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-sm px-3 py-1.5 rounded border ${isDark ? 'border-geo-border bg-geo-card text-geo-text-main' : 'border-slate-200 bg-slate-50 text-slate-900'}`}>{task.id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${isDark ? 'text-geo-text-main' : 'text-slate-800'}`}>
                          {task.name || task.keyword || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const label = isBrandParse ? t('types.brandParse') : isManual ? t('types.manual') : isNormal ? t('types.normal') : t('types.semantic');
                          const colors = isBrandParse
                            ? (isDark ? 'bg-[#E8553F]/15 text-[#E8a090] border border-[#E8553F]/25' : 'bg-[#FFF6F2] text-[#C2410C] border border-[#E8553F]/25')
                            : isManual
                            ? (isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                            : isNormal
                              ? (isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200')
                              : (isDark ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-700 border border-blue-200');
                          return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${colors}`}>{label}</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium flex items-center gap-2 ${isDark ? 'text-geo-text-sec' : 'text-slate-600'}`}>
                          <Clock className="w-4 h-4" />{formatDate(task.date)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg w-fit text-xs font-semibold border
                          ${task.source === '品牌解析'
                            ? (isDark ? 'bg-[#E8553F]/10 text-[#E8a090] border-[#E8553F]/25' : 'bg-[#FFF6F2] text-[#C2410C] border-[#E8553F]/20')
                            : task.source.includes('Crawl')
                            ? (isDark ? 'bg-blue-900/20 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200')
                            : (isDark ? 'bg-geo-blue/10 text-geo-blue border-geo-blue/20' : 'bg-purple-50 text-purple-700 border-purple-200')
                          }
                        `}>
                          {task.source === '品牌解析' ? <Sparkles className="w-3 h-3" /> : task.source.includes('Crawl') ? <Globe className="w-3 h-3" /> : <Database className="w-3 h-3" />}
                          {task.source}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-2xl font-semibold font-mono ${task.count > 0 ? (isDark ? 'text-geo-blue geo-glow-text' : 'text-slate-900') : 'opacity-30'}`}>{task.count}</span>
                        <span className="text-xs font-semibold opacity-40 ml-2">{t('table.entities')}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold gap-2
                          ${task.status === 'Completed'
                            ? (isDark ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-green-100 text-green-700')
                            : task.status === 'Failed'
                            ? (isDark ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-100 text-red-700')
                            : (isDark ? 'bg-geo-blue/10 text-geo-blue border-geo-blue/20 animate-pulse' : 'bg-blue-100 text-blue-700')
                          }
                        `}>
                          {task.status === 'Completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : task.status === 'Failed' ? <Clock className="w-3.5 h-3.5" /> : <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />}
                          {task.status === 'Completed' ? t('status.completed') : task.status === 'Failed' ? t('status.failed') : t('status.processing')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2 flex-wrap items-center">
                          <button
                            onClick={() => handleViewTask(task.id)}
                            className={`p-2.5 rounded-lg transition-colors ${isDark ? 'bg-geo-card hover:bg-geo-border text-geo-text-sec hover:text-geo-blue' : 'hover:bg-[#FFF6F2] text-slate-400 hover:text-[#E8553F]'}`}
                            title={t('actions.view')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={e => handleDeleteTask(e, task.id)}
                            className={`p-2.5 rounded-lg transition-colors ${isDark ? 'bg-geo-card hover:bg-red-900/30 text-geo-text-sec hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-600'}`}
                            title={t('actions.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button className={`p-2.5 rounded-lg transition-colors ${isDark ? 'bg-geo-card hover:bg-geo-border text-geo-text-sec hover:text-geo-blue' : 'hover:bg-[#FFF6F2] text-slate-400 hover:text-[#E8553F]'}`}><Download className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
              <Pagination currentPage={currentPage} total={total} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} isDark={isDark} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtractList;
