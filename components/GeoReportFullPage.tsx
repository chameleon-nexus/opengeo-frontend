import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Theme } from '../types';
import { diagnosisReportAPI } from '../api/diagnosisReport';
import { useModuleI18n } from '../i18n/hooks';
import { ensureNamespaces } from '../i18n/loader';
import { I18nNamespace } from '../i18n/types';

const GeoBrandReportMiniLayout = lazy(() => import('./GeoBrandReportMiniLayout'));

export interface GeoReportFullPageProps {
  theme: Theme;
  /** 有值则直接打开该任务/批次；无则拉取「最新」诊断的 taskId（与已废弃的 DiagnosisReport 行为一致） */
  taskId?: string;
  /** 分享链接 ?s=xxx，免登录加载 */
  shareId?: string;
  /** 公开分享页：全屏展示，隐藏「开始优化」等需登录操作 */
  isStandalone?: boolean;
  onBack: () => void;
  backButtonLabel?: string;
}

/**
 * 全屏 GEO 品牌诊断报告：统一用 GeoBrandReportMiniLayout（与「快速开始」内嵌同 UI）。
 */
const GeoReportFullPage: React.FC<GeoReportFullPageProps> = ({
  theme,
  taskId: taskIdProp,
  shareId: shareIdProp,
  isStandalone = false,
  onBack,
  backButtonLabel,
}) => {
  const { t } = useModuleI18n('report');
  const resolvedBackLabel = backButtonLabel ?? t('actions.back');
  const isDark = theme === 'dark';
  const shareId = shareIdProp?.trim() || null;
  const [reportI18nReady, setReportI18nReady] = useState(false);
  const [resolvedTaskId, setResolvedTaskId] = useState<string | null>(taskIdProp?.trim() || null);
  const [loading, setLoading] = useState(!shareId && !taskIdProp?.trim());
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void ensureNamespaces([I18nNamespace.Report]).then(() => {
      if (!cancelled) setReportI18nReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (shareId) {
      setResolvedTaskId(null);
      setLoading(false);
      setErr(null);
      return;
    }
    const t = taskIdProp?.trim();
    if (t) {
      setResolvedTaskId(t);
      setLoading(false);
      setErr(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    diagnosisReportAPI
      .getLatest()
      .then((d) => {
        if (cancelled) return;
        const tid = d?.taskId?.trim();
        if (tid) setResolvedTaskId(tid);
        else setErr(t('noReportData'));
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : t('errors.loadFailed'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [taskIdProp, shareId]);

  const muted = isDark ? 'text-zinc-400' : 'text-slate-500';

  if (!reportI18nReady) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center font-sans ${
          isDark ? 'bg-[#1A1A1A] text-white' : 'bg-slate-50 text-slate-900'
        }`}
      >
        <div className="text-center space-y-4">
          <Loader2 className={`w-8 h-8 animate-spin mx-auto ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
          <p className={`text-sm ${muted}`}>{t('loadingReport')}</p>
        </div>
      </div>
    );
  }

  if (shareId) {
    return (
      <div className={`h-full w-full min-h-0 flex flex-col overflow-hidden ${isStandalone ? 'fixed inset-0 z-[1000]' : ''}`}>
        <Suspense
          fallback={
            <div className={`flex flex-1 items-center justify-center ${isDark ? 'bg-[#1A1A1A]' : 'bg-slate-50'}`}>
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
          }
        >
          <GeoBrandReportMiniLayout
            theme={theme}
            shareId={shareId}
            isStandalone={isStandalone}
            onBack={onBack}
            backButtonLabel={resolvedBackLabel}
          />
        </Suspense>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center font-sans ${
          isDark ? 'bg-[#1A1A1A] text-white' : 'bg-slate-50 text-slate-900'
        }`}
      >
        <div className="text-center space-y-4">
          <Loader2 className={`w-8 h-8 animate-spin mx-auto ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
          <p className={`text-sm ${muted}`}>{t('loadingReport')}</p>
        </div>
      </div>
    );
  }
  if (err || !resolvedTaskId) {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-4 p-6 font-sans ${
          isDark ? 'bg-[#1A1A1A] text-white' : 'bg-slate-50 text-slate-900'
        }`}
      >
        <p className="text-sm text-red-500">{err || t('noAvailableReport')}</p>
        <button
          type="button"
          onClick={onBack}
          className={`text-sm font-semibold underline ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}
        >
          {resolvedBackLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full min-h-0 flex flex-col overflow-hidden">
      <Suspense
        fallback={
          <div className={`flex flex-1 items-center justify-center ${isDark ? 'bg-[#1A1A1A]' : 'bg-slate-50'}`}>
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        }
      >
        <GeoBrandReportMiniLayout
          theme={theme}
          taskId={resolvedTaskId}
          isStandalone={isStandalone}
          onBack={onBack}
          backButtonLabel={backButtonLabel}
        />
      </Suspense>
    </div>
  );
};

export default GeoReportFullPage;
