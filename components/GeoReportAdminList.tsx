/**
 * Admin：GEO 分析报告列表（与工作流现状分析/周期诊断同源 diagnosis_reports）
 * 通用编辑入口，不区分基线/最新。
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Edit3, Loader2, RefreshCw, Search } from 'lucide-react';
import { Theme } from '../types';
import { diagnosisReportAPI, type AdminGeoReportListItem } from '../api/diagnosisReport';
import EditAnalysisForm from './EditAnalysisForm';
import { useModuleI18n } from '../i18n/hooks';
import {
  ADMIN_PAGE_SHELL_CLS,
  adminCardCls,
  adminPageOuterCls,
  adminSubtitleCls,
  adminTitleCls,
} from '../utils/adminPageStyles';

const PAGE_SIZE = 15;

interface Props {
  theme: Theme;
}

function fmtTime(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const GeoReportAdminList: React.FC<Props> = ({ theme }) => {
  const { t } = useModuleI18n('admin');
  const isDark = theme === 'dark';
  const [reports, setReports] = useState<AdminGeoReportListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [editingReportId, setEditingReportId] = useState<number | null>(null);
  const [recalcReportId, setRecalcReportId] = useState<number | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await diagnosisReportAPI.listAllAdmin({
        skip: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
        brand_name: search.trim() || undefined,
      });
      setReports(res.reports || []);
      setTotal(res.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('pages.geoReportAdmin.errors.loadFailed'));
      setReports([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, t]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleRecalculate = async (r: AdminGeoReportListItem) => {
    const name = r.brandName || r.brandId || t('pages.geoReportAdmin.reportFallback', { id: r.id });
    if (!window.confirm(t('pages.geoReportAdmin.confirm.recalc', { name }))) {
      return;
    }
    setRecalcReportId(r.id);
    setError(null);
    try {
      await diagnosisReportAPI.recalculate(r.id);
      await loadReports();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('pages.geoReportAdmin.errors.recalcFailed'));
    } finally {
      setRecalcReportId(null);
    }
  };

  const cardCls = adminCardCls(isDark);

  if (editingReportId !== null) {
    return (
      <div className={adminPageOuterCls(isDark)}>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className={ADMIN_PAGE_SHELL_CLS}>
            <EditAnalysisForm
              theme={theme}
              reportId={editingReportId}
              onBack={() => {
                setEditingReportId(null);
                void loadReports();
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={adminPageOuterCls(isDark)}>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className={ADMIN_PAGE_SHELL_CLS}>
          <div>
            <h1 className={adminTitleCls(isDark)}>{t('pages.geoReportAdmin.pageTitle')}</h1>
            <p className={adminSubtitleCls(isDark)}>{t('pages.geoReportAdmin.subtitle')}</p>
          </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search
              className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              placeholder={t('pages.geoReportAdmin.searchPlaceholder')}
              className={`w-full rounded-xl border py-2 pl-9 pr-3 text-sm ${
                isDark
                  ? 'border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500'
                  : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'
              }`}
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="btn-geo-primary shrink-0 px-4 py-2 text-sm font-semibold"
          >
            {t('pages.geoReportAdmin.search')}
          </button>
        </div>

        {error ? (
          <div
            className={`mb-4 rounded-xl border p-4 text-sm ${
              isDark ? 'border-red-800 bg-red-900/20 text-red-400' : 'border-red-200 bg-red-50 text-red-600'
            }`}
          >
            {error}
          </div>
        ) : null}

        {loading && reports.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className={`h-8 w-8 animate-spin ${isDark ? 'text-[#FF9B85]' : 'text-[#E8553F]'}`} />
          </div>
        ) : reports.length === 0 ? (
          <div className={`${cardCls} p-12 text-center`}>
            <p className={isDark ? 'text-zinc-400' : 'text-slate-500'}>{t('pages.geoReportAdmin.empty')}</p>
          </div>
        ) : (
          <div className={cardCls}>
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'bg-zinc-800/50 text-zinc-400' : 'bg-slate-50 text-slate-500'}>
                  <th className="px-4 py-3 text-left font-semibold">{t('pages.geoReportAdmin.table.brand')}</th>
                  <th className="px-4 py-3 text-left font-semibold">{t('pages.geoReportAdmin.table.product')}</th>
                  <th className="px-4 py-3 text-left font-semibold">{t('pages.geoReportAdmin.table.merchant')}</th>
                  <th className="px-4 py-3 text-left font-semibold">{t('pages.geoReportAdmin.table.visibility')}</th>
                  <th className="px-4 py-3 text-left font-semibold">{t('pages.geoReportAdmin.table.createdAt')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('pages.geoReportAdmin.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-t ${isDark ? 'border-white/5 hover:bg-zinc-800/30' : 'border-slate-100 hover:bg-slate-50'}`}
                  >
                    <td className={`px-4 py-3 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {r.brandName || r.brandId || '—'}
                    </td>
                    <td className={`px-4 py-3 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
                      {r.productName?.trim() || '—'}
                    </td>
                    <td className={`px-4 py-3 text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                      {r.merchantName?.trim() || (r.merchantId != null ? t('pages.geoReportAdmin.merchantFallback', { id: r.merchantId }) : '—')}
                    </td>
                    <td className={`px-4 py-3 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
                      {r.visibility ?? '—'}
                    </td>
                    <td className={`px-4 py-3 text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                      {fmtTime(r.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          disabled={recalcReportId !== null}
                          onClick={() => void handleRecalculate(r)}
                          title={t('pages.geoReportAdmin.recalcTitle')}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                            isDark
                              ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${recalcReportId === r.id ? 'animate-spin' : ''}`} />
                          {recalcReportId === r.id ? t('pages.geoReportAdmin.recalculating') : t('pages.geoReportAdmin.recalc')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingReportId(r.id)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            isDark
                              ? 'bg-[#E8553F]/20 text-[#FF9B85] hover:bg-[#E8553F]/30'
                              : 'bg-[#FFF9F6] text-[#E8553F] hover:bg-orange-50'
                          }`}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          {t('pages.geoReportAdmin.edit')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {total > PAGE_SIZE ? (
              <div
                className={`flex items-center justify-between border-t px-4 py-3 ${
                  isDark ? 'border-white/5' : 'border-slate-100'
                }`}
              >
                <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{t('pages.geoReportAdmin.total', { count: total })}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${
                      isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    {t('pages.geoReportAdmin.prevPage')}
                  </button>
                  <button
                    type="button"
                    disabled={page * PAGE_SIZE >= total}
                    onClick={() => setPage((p) => p + 1)}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${
                      isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {t('pages.geoReportAdmin.nextPage')}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default GeoReportAdminList;
