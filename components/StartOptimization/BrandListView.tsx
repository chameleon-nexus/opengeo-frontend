import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Loader2, Plus, RefreshCcw, Search } from 'lucide-react';
import { brandsAPI, type Brand as ApiBrand } from '../../api/brands';
import { geoWorkflowAPI } from '../../api/geoWorkflow';
import { RECENT_WORKFLOWS_REFRESH_EVENT } from '../../constants/geoWorkflow';
import CreateOptimizationModal from './CreateOptimizationModal';
import HistoryOptimizationModal from './HistoryOptimizationModal';
import HistoryReportModal from './HistoryReportModal';
import type { BrandIntakeConfig, SelectedBrand } from './types';
import type { GeoWorkflowDTO } from '../../api/geoWorkflow';
import type { UserRole } from '../../types';
import { fmtUpdateTime } from './utils/listCardFormat';
import { useModuleI18n } from '../../i18n/hooks';

interface Props {
  /** 进入工作台（新建：选品牌后弹窗 → 创建工作流 → 跳过输入品牌阶段） */
  onEnterWithNewWorkflow: (
    brand: SelectedBrand,
    wf: GeoWorkflowDTO,
    intake: BrandIntakeConfig
  ) => void;
  /** 直接进入工作台（不带任何品牌：从 0 开始全新创建） */
  onCreateBrandNew: () => void;
  /** 进入已有工作流（历史优化列表点击） */
  onOpenExistingWorkflow: (brand: SelectedBrand, workflowId: string) => void;
  /** 打开工作流最新分析报告（历史报告列表点击） */
  onOpenReport: (reportTaskId: string) => void;
  canCreateBrand?: boolean;
  userRole?: UserRole | null;
  onBrandQuotaRefresh?: () => void;
}

const BrandListView: React.FC<Props> = ({
  onEnterWithNewWorkflow,
  onCreateBrandNew,
  onOpenExistingWorkflow,
  onOpenReport,
  canCreateBrand = true,
  userRole = null,
  onBrandQuotaRefresh,
}) => {
  const { t } = useModuleI18n('optimization');
  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<SelectedBrand | null>(null);
  /** 历史优化弹窗（与「创建新优化」同品牌维度） */
  const [historyBrand, setHistoryBrand] = useState<SelectedBrand | null>(null);
  /** 历史报告弹窗 */
  const [reportBrand, setReportBrand] = useState<SelectedBrand | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await brandsAPI.listBrands({ is_active: true, limit: 100 });
      const role = (userRole || '').toLowerCase();
      if (role === 'customer') {
        setBrands(list);
        return;
      }
      const wfRes = await geoWorkflowAPI.list({ scope: 'mine', limit: 200, offset: 0 });
      const brandIdsWithWorkflow = new Set(
        (wfRes.items ?? [])
          .map((w) => w.brandId)
          .filter((id): id is number => id != null)
      );
      if (brandIdsWithWorkflow.size === 0) {
        setBrands([]);
        return;
      }
      setBrands(list.filter((b) => brandIdsWithWorkflow.has(b.id)));
    } catch (e: any) {
      setError(e?.message || t('brandList.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t, userRole]);

  useEffect(() => {
    void load();
    const onRefresh = () => void load();
    window.addEventListener(RECENT_WORKFLOWS_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(RECENT_WORKFLOWS_REFRESH_EVENT, onRefresh);
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.brand_id.toLowerCase().includes(q)
    );
  }, [brands, search]);

  const toSelected = (b: ApiBrand): SelectedBrand => ({
    id: b.id,
    brand_id: b.brand_id,
    name: b.name,
    category: b.category,
    brand_introduction: b.brand_introduction ?? null,
    knowledge_base_id: b.knowledge_base_id ?? null,
  });

  return (
    <div className="min-h-0 flex-1 w-full overflow-y-auto bg-[#F5F5F7]">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* 顶部：欢迎区 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('brandList.title')}</h1>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
              <div className="relative shrink-0">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('brandList.searchPlaceholder')}
                  className="w-44 pl-7 pr-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/20 focus:border-[#E8553F]/50"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 ml-auto sm:ml-0">
                <button
                  type="button"
                  onClick={onCreateBrandNew}
                  disabled={!canCreateBrand}
                  className="btn-geo-primary shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  {t('brandList.startOptimization')}
                </button>
                <button
                  type="button"
                  onClick={load}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-[#E8553F] hover:bg-[#FFF6F2] transition-colors"
                  title={t('brandList.refresh')}
                >
                  <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {loading && brands.length === 0 ? (
              <div className="px-5 py-12 text-center text-xs text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin inline-block mr-1" />
                {t('brandList.loading')}
              </div>
            ) : error ? (
              <div className="px-5 py-8 text-center text-xs text-red-500">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="px-5 py-12 text-center text-xs text-gray-400">
                {search ? t('brandList.noMatch') : t('brandList.empty')}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filtered.map((b) => {
                  const titleLine = b.name;
                  return (
                    <li key={b.id}>
                      <div className="w-full text-left px-5 py-4 hover:bg-[#FFF9F6]/50 transition-colors flex flex-col sm:flex-row sm:items-stretch gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 leading-snug">{titleLine}</div>
                          <ul className="mt-2 space-y-1.5 text-[11px] text-gray-600">
                            <li className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                              <span className="text-gray-400">·</span>
                              <span className="text-gray-500 shrink-0">{t('brandList.brandName')}</span>
                              <span className="inline-flex max-w-full items-center rounded-md bg-gray-100 px-2 py-0.5 text-gray-800 font-medium truncate">
                                {b.name}
                              </span>
                            </li>
                            <li className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                              <span className="text-gray-400">·</span>
                              <span className="text-gray-500 shrink-0">{t('brandList.createdAt')}</span>
                              <span className="text-gray-800">{fmtUpdateTime(b.created_at)}</span>
                            </li>
                          </ul>
                        </div>
                        <div className="flex flex-row sm:flex-col sm:items-end sm:justify-between gap-2 shrink-0 sm:min-w-[200px] border-t border-gray-100 sm:border-0 pt-3 sm:pt-0">
                          <div className="text-[11px] text-gray-400 sm:text-right w-full sm:w-auto">
                            {t('brandList.updatedAt')}{fmtUpdateTime(b.updated_at)}
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-3 ml-auto sm:ml-0 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() => setHistoryBrand(toSelected(b))}
                              className="inline-flex items-center gap-0.5 text-sm font-medium text-[#E8553F] hover:text-[#d14a36]"
                            >
                              {t('brandList.historyOptimization')}
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setReportBrand(toSelected(b))}
                              className="inline-flex items-center gap-0.5 text-sm font-medium text-[#E8553F] hover:text-[#d14a36]"
                            >
                              {t('brandList.historyReport')}
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedBrand(toSelected(b))}
                              className="inline-flex items-center gap-0.5 text-sm font-medium text-[#E8553F] hover:text-[#d14a36]"
                            >
                              {t('brandList.newOptimization')}
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      {selectedBrand && (
        <CreateOptimizationModal
          brand={selectedBrand}
          onCancel={() => setSelectedBrand(null)}
          onCreated={(wf, intake) => {
            const bb = selectedBrand;
            setSelectedBrand(null);
            onBrandQuotaRefresh?.();
            onEnterWithNewWorkflow(bb, wf, intake);
          }}
        />
      )}

      {historyBrand && (
        <HistoryOptimizationModal
          brand={historyBrand}
          onCancel={() => setHistoryBrand(null)}
          onEnterWorkflow={(workflowId) => {
            const bb = historyBrand;
            setHistoryBrand(null);
            onOpenExistingWorkflow(bb, workflowId);
          }}
        />
      )}

      {reportBrand && (
        <HistoryReportModal
          brand={reportBrand}
          onCancel={() => setReportBrand(null)}
          onOpenReport={(reportTaskId) => {
            setReportBrand(null);
            onOpenReport(reportTaskId);
          }}
        />
      )}
    </div>
  );
};

export default BrandListView;
