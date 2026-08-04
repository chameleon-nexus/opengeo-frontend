import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, RefreshCcw, Search } from 'lucide-react';
import { geoWorkflowAPI, type GeoWorkflowDTO } from '../../api/geoWorkflow';
import { geoWorkflowListPhaseLabel } from '../geoWorkflowShared';
import { fmtUpdateTime } from './utils/listCardFormat';
import { useModuleI18n } from '../../i18n/hooks';

interface Props {
  /** 点击某行进入工作台 */
  onOpenWorkflow: (wf: GeoWorkflowDTO) => void;
  /** 列表为空时跳转「开始新优化」 */
  onStartOptimization?: () => void;
  /** 默认每页数 */
  pageSize?: number;
  /** 透传给后端 list 的 scope（默认 merchant，按当前用户所在商户聚合） */
  scope?: 'merchant' | 'mine';
  /** 紧凑模式：用于开启新对话页底部最近 N 条 */
  compact?: boolean;
  /** 是否显示搜索框（compact 默认 false） */
  showSearch?: boolean;
  /** 是否显示分页（compact 默认 false） */
  showPagination?: boolean;
  /** compact 模式下撑满父容器高度（开启新对话页 30% 区域） */
  fillHeight?: boolean;
}

const STATUS_KEYS = ['pending', 'running', 'done', 'failed'] as const;

function LatestWorkflowsPanel({
  onOpenWorkflow,
  onStartOptimization,
  pageSize = 10,
  scope = 'merchant',
  compact = false,
  showSearch,
  showPagination,
  fillHeight = false,
}: Props) {
  const { t } = useModuleI18n('optimization');
  const statusLabel = (status: string) => {
    if (STATUS_KEYS.includes(status as (typeof STATUS_KEYS)[number])) {
      return t(`latestWorkflows.status.${status}`);
    }
    return status;
  };
  const resolvedShowSearch = showSearch ?? !compact;
  const resolvedShowPagination = showPagination ?? !compact;

  const [items, setItems] = useState<GeoWorkflowDTO[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await geoWorkflowAPI.list({
        scope,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        brand_name: search.trim() || undefined,
      });
      setItems(data.items || []);
      setTotal(data.total ?? data.items?.length ?? 0);
    } catch (e: any) {
      setError(e?.message || t('latestWorkflows.loadFailed'));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, scope]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const phaseBadgeClass = (phase: string, status: string) => {
    if (phase === 'completed' || phase === 'completion') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (status === 'failed') return 'bg-red-50 text-red-600 border-red-100';
    if (status === 'running') return 'bg-blue-50 text-blue-600 border-blue-100';
    return 'bg-gray-50 text-gray-500 border-gray-100';
  };

  return (
    <div
      className={`bg-white border border-gray-200 overflow-hidden shadow-sm ${
        compact ? 'rounded-xl' : 'rounded-2xl'
      } ${fillHeight ? 'h-full flex flex-col min-h-0' : ''}`}
    >
      <div
        className={`flex flex-wrap items-center gap-2 border-b border-gray-100 shrink-0 ${
          compact ? `px-4 ${fillHeight ? 'py-2' : 'py-3'} justify-between` : 'px-5 py-4 justify-end'
        }`}
      >
        {compact ? (
          <h3 className="text-sm font-semibold text-gray-900">{t('latestWorkflows.title')}</h3>
        ) : null}
        <div className="flex items-center gap-2 ml-auto">
          {resolvedShowSearch ? (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                placeholder={t('latestWorkflows.searchPlaceholder')}
                className="w-44 pl-7 pr-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/20 focus:border-[#E8553F]/50"
              />
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => load()}
            className="p-1.5 rounded-lg text-gray-400 hover:text-[#E8553F] hover:bg-[#FFF6F2] transition-colors"
            title={t('latestWorkflows.refresh')}
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className={`text-center text-xs text-gray-400 ${compact ? 'px-4 py-6' : 'px-5 py-12'} ${fillHeight ? 'flex-1 flex items-center justify-center' : ''}`}>
          <Loader2 className="w-4 h-4 animate-spin inline-block mr-1" />
          {t('latestWorkflows.loading')}
        </div>
      ) : error ? (
        <div className={`text-center text-xs text-red-500 ${compact ? 'px-4 py-6' : 'px-5 py-8'}`}>{error}</div>
      ) : items.length === 0 ? (
        <div className={`text-center ${compact ? 'px-4 py-6' : 'px-5 py-12'} ${fillHeight ? 'flex-1 flex flex-col items-center justify-center' : ''}`}>
          <p className="text-xs text-gray-400">
            {search ? t('latestWorkflows.noMatch') : t('latestWorkflows.empty')}
          </p>
          {onStartOptimization && !search ? (
            <button
              type="button"
              onClick={onStartOptimization}
              className="btn-geo-primary mt-4 inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold"
            >
              {t('latestWorkflows.startNew')}
            </button>
          ) : null}
        </div>
      ) : (
        <ul className={`divide-y divide-gray-100 ${fillHeight ? 'min-h-0 flex-1 overflow-y-auto' : ''}`}>
          {items.map((wf) => {
            const titleLine = `${wf.brandName}${wf.productName ? ` · ${wf.productName}` : ''}`;
            if (compact) {
              return (
                <li key={wf.workflowId}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenWorkflow(wf)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenWorkflow(wf);
                      }
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#FFF9F6] transition-colors flex items-center gap-3 cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{titleLine}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${phaseBadgeClass(
                            wf.phase,
                            wf.phaseStatus
                          )}`}
                        >
                          {geoWorkflowListPhaseLabel(wf)} · {statusLabel(wf.phaseStatus)}
                        </span>
                        <span className="text-gray-400">{fmtUpdateTime(wf.updatedAt)}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0 text-[#E8553F]" />
                  </div>
                </li>
              );
            }

            return (
              <li key={wf.workflowId}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenWorkflow(wf)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenWorkflow(wf);
                    }
                  }}
                  className="w-full text-left px-5 py-4 hover:bg-[#FFF9F6] transition-colors flex flex-col sm:flex-row sm:items-stretch gap-4 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 leading-snug">{titleLine}</div>
                    <ul className="mt-2 space-y-1.5 text-[11px] text-gray-600">
                      <li className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-500 shrink-0">{t('latestWorkflows.optimizeBrand')}</span>
                        <span className="inline-flex max-w-full items-center rounded-md bg-gray-100 px-2 py-0.5 text-gray-800 font-medium truncate">
                          {wf.brandName}
                        </span>
                      </li>
                      {wf.productName ? (
                        <li className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                          <span className="text-gray-400">·</span>
                          <span className="text-gray-500 shrink-0">{t('latestWorkflows.optimizeProduct')}</span>
                          <span className="inline-flex max-w-full items-center rounded-md bg-orange-50 px-2 py-0.5 text-gray-800 font-medium truncate">
                            {wf.productName}
                          </span>
                        </li>
                      ) : null}
                      <li className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-500 shrink-0">{t('latestWorkflows.currentPhase')}</span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${phaseBadgeClass(
                            wf.phase,
                            wf.phaseStatus
                          )}`}
                        >
                          {geoWorkflowListPhaseLabel(wf)} ·{' '}
                          {statusLabel(wf.phaseStatus)}
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="flex flex-row sm:flex-col sm:items-end sm:justify-between gap-2 shrink-0 sm:min-w-[140px] border-t border-gray-100 sm:border-0 pt-3 sm:pt-0">
                    <div className="text-[11px] text-gray-400 sm:text-right">
                      {t('latestWorkflows.updatedAt')}{fmtUpdateTime(wf.updatedAt)}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenWorkflow(wf);
                      }}
                      className="inline-flex items-center gap-0.5 text-sm font-medium text-[#E8553F] hover:text-[#d14a36] ml-auto"
                    >
                      {t('latestWorkflows.enterOptimization')}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {resolvedShowPagination && total > pageSize && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
          <div>
            {t('latestWorkflows.pagination', { total, page, totalPages })}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-[#E8553F]/40"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-[#E8553F]/40"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LatestWorkflowsPanel;
