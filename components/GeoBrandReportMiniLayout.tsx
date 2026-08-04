import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Download, Loader2, Share2 } from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import { Theme } from '../types';
import { diagnosisReportAPI, DiagnosisReportData } from '../api/diagnosisReport';
import type { OptimizationStartPayload } from '../api/optimizationTask';
import { AI_PLATFORM_DESC, CITATION_PREF_DESC, buildInteractivePkView, enrichGeoReportForView, EnrichedGeoReport } from '../utils/miniReportEnrich';
import { exportGeoReportPdf } from '../utils/exportGeoReportPdf';
import PositiveKeywordsWordCloud from './PositiveKeywordsWordCloud';
import { useModuleI18n } from '../i18n/hooks';

interface GeoBrandReportMiniLayoutProps {
  theme: Theme;
  taskId?: string;
  /** 分享链接 ?s=xxx，免登录加载 */
  shareId?: string;
  /** 公开分享页全屏模式 */
  isStandalone?: boolean;
  onBack: () => void;
  /** 顶部返回按钮文案，区分「正常完成诊断进入」与「从产出物弹层进入」等 */
  backButtonLabel?: string;
  /** 基于本报告一键进入「优化任务」创建流程 */
  onStartOptimize?: (payload: OptimizationStartPayload) => void;
  /** 嵌入「开始优化」等场景时隐藏顶栏（返回 + 开始优化），由外层提供操作区 */
  hideTopBar?: boolean;
  /** 嵌入优化驾驶舱：全宽布局，去掉独立页 max-width */
  embedded?: boolean;
}

function extractCoreKeywordsFromReport(report: DiagnosisReportData): string[] {
  const set = new Set<string>();
  for (const part of (report.keywords || '').split(/[,，、\s]+/)) {
    const s = part.trim();
    if (s) set.add(s);
  }
  const ind = report.indicatorData;
  const idObj = Array.isArray(ind) ? null : ind;
  if (idObj?.positiveKeywords && Array.isArray(idObj.positiveKeywords)) {
    for (const k of idObj.positiveKeywords) {
      const s = String(k || '').trim();
      if (s) set.add(s);
    }
  }
  if (idObj?.word_pack && Array.isArray(idObj.word_pack)) {
    for (const k of idObj.word_pack) {
      const s = String(k || '').trim();
      if (s) set.add(s);
    }
  }
  return [...set].slice(0, 50);
}

function parseVisibilityPct(v?: string | null): number | null {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(/%/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

function rankPillClass(rank: string, isDark: boolean): string {
  const r = String(rank || '').toLowerCase();
  if (r === 'none') {
    return isDark ? 'text-zinc-500 bg-zinc-800' : 'text-slate-500 bg-slate-100';
  }
  if (r.startsWith('top')) {
    return isDark ? 'text-violet-200 bg-violet-950/80 border border-violet-700/50' : 'text-violet-800 bg-violet-50 border border-violet-200';
  }
  return isDark ? 'text-zinc-300 bg-zinc-800' : 'text-slate-700 bg-slate-100';
}

function formatPlatformCell(rank: string, t: (key: string) => string): string {
  const r = String(rank || '').toLowerCase();
  if (r === 'none') return t('status.notMentioned');
  if (['top1', 'top2', 'top3', 'top4', 'top5'].includes(r)) {
    return t('status.mentioned');
  }
  return rank;
}

function aiRankingRowLabel(rowIndex: number, rankLabel?: string): React.ReactNode {
  if (rankLabel) return <span className="tabular-nums">{rankLabel}</span>;
  const medals = ['🥇', '🥈', '🥉'];
  if (rowIndex < 3) {
    return (
      <span className="inline-flex items-center gap-1">
        <span aria-hidden>{medals[rowIndex]}</span>
        <span>第{rowIndex + 1}名</span>
      </span>
    );
  }
  return <span>第{rowIndex + 1}名</span>;
}

function pkLeaderboardRankLabel(rank: number): React.ReactNode {
  const medals = ['🥇', '🥈', '🥉'];
  if (rank >= 1 && rank <= 3) {
    return (
      <span className="inline-flex items-center gap-1">
        <span aria-hidden>{medals[rank - 1]}</span>
        <span>第{rank}名</span>
      </span>
    );
  }
  return <span className="tabular-nums">第{rank}名</span>;
}

function isDiagnosisReportMock(data: DiagnosisReportData | null): boolean {
  if (!data) return false;
  return data.id === 0 || data.taskId === 'DEMO-DR-001';
}

const GeoBrandReportMiniLayout: React.FC<GeoBrandReportMiniLayoutProps> = ({
  theme,
  taskId,
  shareId,
  isStandalone = false,
  onBack,
  backButtonLabel,
  onStartOptimize,
  hideTopBar = false,
  embedded = false,
}) => {
  const { t } = useModuleI18n('report');
  const { t: tc } = useModuleI18n('common');
  const isDark = theme === 'dark';
  const resolvedBackLabel = backButtonLabel ?? t('actions.back');
  const contentShellCls = embedded
    ? 'w-full px-4 md:px-6 space-y-8 md:space-y-10 pb-16'
    : 'max-w-[1200px] mx-auto space-y-8 md:space-y-10 pb-16';
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<DiagnosisReportData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        let data: DiagnosisReportData | null = null;
        const sid = shareId?.trim();
        const tid = taskId?.trim();
        if (sid) {
          data = await diagnosisReportAPI.getByShare(sid);
        } else if (tid) {
          data = tid.startsWith('BATCH-')
            ? await diagnosisReportAPI.getByBatch(tid)
            : await diagnosisReportAPI.getByTask(tid);
        }
        if (!cancelled) setReport(data);
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : t('errors.loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [taskId, shareId]);

  const enriched = useMemo(() => enrichGeoReportForView(report), [report]);

  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || '/';
  const basePath = base === '/' ? '' : base.replace(/\/$/, '');
  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${basePath}` : '';

  const handleShare = async () => {
    const tid = report?.taskId?.trim();
    if (!tid || tid === '__aggregated__') return;
    try {
      const { shareId: newShareId } = await diagnosisReportAPI.createShare(
        tid,
        isDiagnosisReportMock(report)
      );
      const shareUrl = `${baseUrl}/diagnosis-report?s=${newShareId}`;
      const ok = await copyToClipboard(shareUrl);
      if (ok) {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch (e) {
      console.error('创建分享失败:', e);
    }
  };

  const containerClasses = embedded
    ? `flex-1 h-full min-h-0 overflow-y-auto no-scrollbar font-sans w-full transition-colors duration-500 ${
        isDark ? 'bg-[#1A1A1A] text-white' : 'bg-[#F5F5F7] text-slate-900'
      }`
    : `
    flex-1 p-4 md:p-10 overflow-y-auto no-scrollbar font-sans transition-colors duration-500
    ${isDark ? 'bg-[#1A1A1A] text-white' : 'bg-slate-50 text-slate-900'}
    ${isStandalone ? 'fixed inset-0 z-[1000] w-screen h-screen' : ''}
  `;

  const cardClasses = `
    rounded-2xl border p-5 md:p-8 relative overflow-hidden backdrop-blur-md transition-all
    ${isDark ? 'bg-zinc-900/50 border-white/5 shadow-black/20' : 'bg-white border-slate-200 shadow-sm'}
  `;

  const sectionTitleCls = `text-lg md:text-xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`;
  const mutedCls = isDark ? 'text-zinc-400' : 'text-slate-500';
  const accentBarCls = isDark ? 'bg-violet-500' : 'bg-violet-600';

  const backBtnCls = `p-2 rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-xs font-semibold shrink-0
    ${isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`;

  if (loading) {
    return (
      <div className={containerClasses}>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center space-y-4">
            <Loader2 className={`w-8 h-8 animate-spin mx-auto ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
            <p className={`text-sm ${mutedCls}`}>{tc('status.loading')}…</p>
          </div>
        </div>
      </div>
    );
  }

  if (err || !report || !enriched) {
    return (
      <div className={containerClasses}>
        <div className={`${embedded ? 'w-full' : 'max-w-[1200px] mx-auto'} flex flex-col items-center justify-center gap-4 min-h-[40vh]`}>
          <p className="text-red-500 text-sm">{err || t('empty.noReport')}</p>
          {hideTopBar ? null : (
            <button type="button" onClick={onBack} className={backBtnCls}>
              <ChevronLeft className="w-5 h-5" /> {resolvedBackLabel}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <GeoReportBody
      enriched={enriched}
      rawReport={report}
      theme={theme}
      isDark={isDark}
      containerClasses={containerClasses}
      cardClasses={cardClasses}
      sectionTitleCls={sectionTitleCls}
      mutedCls={mutedCls}
      accentBarCls={accentBarCls}
      backBtnCls={backBtnCls}
      backButtonLabel={resolvedBackLabel}
      onBack={onBack}
      onStartOptimize={onStartOptimize}
      hideTopBar={hideTopBar}
      isStandalone={isStandalone}
      shareId={shareId}
      onShare={() => void handleShare()}
      shareCopied={shareCopied}
      contentShellCls={contentShellCls}
    />
  );
};

type BodyProps = {
  enriched: EnrichedGeoReport;
  rawReport: DiagnosisReportData;
  theme: Theme;
  isDark: boolean;
  containerClasses: string;
  cardClasses: string;
  sectionTitleCls: string;
  mutedCls: string;
  accentBarCls: string;
  backBtnCls: string;
  backButtonLabel: string;
  onBack: () => void;
  onStartOptimize?: (payload: OptimizationStartPayload) => void;
  hideTopBar: boolean;
  isStandalone?: boolean;
  shareId?: string;
  onShare?: () => void;
  shareCopied?: boolean;
  contentShellCls: string;
};

/** AI 平台竞争力 / 提及榜：表头展示与快速开始一致的 PNG icon */
function PlatformColHeader({
  col,
  mutedCls,
}: {
  col: { id: string; name: string; icon: string };
  mutedCls: string;
}) {
  return (
    <span className="inline-flex flex-col items-center gap-1">
      {col.icon ? (
        <img src={col.icon} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
      ) : (
        <span className={`text-base leading-none ${mutedCls}`} aria-hidden>
          ◆
        </span>
      )}
      <span>{col.name}</span>
    </span>
  );
}

const GeoReportBody: React.FC<BodyProps> = ({
  enriched,
  rawReport,
  theme,
  isDark,
  containerClasses,
  cardClasses,
  sectionTitleCls,
  mutedCls,
  accentBarCls,
  backBtnCls,
  backButtonLabel,
  onBack,
  onStartOptimize,
  hideTopBar,
  isStandalone = false,
  shareId,
  onShare,
  shareCopied = false,
  contentShellCls,
}) => {
  const { t } = useModuleI18n('report');
  const [selectedPkRivalName, setSelectedPkRivalName] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    setSelectedPkRivalName(null);
  }, [rawReport.id, rawReport.taskId]);

  const pkView = useMemo(
    () => buildInteractivePkView(rawReport, enriched, selectedPkRivalName),
    [rawReport, enriched, selectedPkRivalName],
  );

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportGeoReportPdf({ enriched, pkView });
    } catch (e) {
      console.error('PDF 导出失败:', e);
      window.alert(t('errors.loadFailed'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const industry = enriched.industry?.trim();
  const purpleMuted = isDark ? 'text-violet-300/90' : 'text-violet-700';

  const positiveKeywordTexts = useMemo(
    () => enriched._positiveWords.map((w) => w.text).filter(Boolean),
    [enriched._positiveWords]
  );

  const optList = enriched._optimizationSuggestions || [];

  const handleStartOptimizeClick = () => {
    if (!onStartOptimize) return;
    const kws = extractCoreKeywordsFromReport(rawReport);
    const core = kws.length > 0 ? kws : [rawReport.brandName].filter(Boolean);
    if (core.length === 0) {
      window.alert(t('errors.missingBrandOrKeywords'));
      return;
    }
    onStartOptimize({
      brandName: rawReport.brandName,
      keywords: core,
      sourceDiagnosisReportId: rawReport.id,
      baselineVisibility: parseVisibilityPct(rawReport.visibility),
    });
  };

  const optimizeTopBtnCls =
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E8553F] to-[#FF9B85] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#E8553F]/25 transition hover:opacity-95';

  return (
    <div className={containerClasses}>
      <div className={contentShellCls}>
        {!hideTopBar ? (
          <div className="flex flex-wrap items-center justify-between gap-3 py-1">
            {!isStandalone ? (
              <button type="button" onClick={onBack} className={backBtnCls} title={backButtonLabel}>
                <ChevronLeft className="w-5 h-5" /> {backButtonLabel}
              </button>
            ) : (
              <div />
            )}
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              {onStartOptimize && !isStandalone && !shareId ? (
                <button type="button" onClick={handleStartOptimizeClick} className={optimizeTopBtnCls}>
                  {t('actions.startOptimization')}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* 二、首屏大卡片区 */}
        <section className={cardClasses}>
          {industry ? (
            <p className={`text-sm font-medium mb-2 ${mutedCls}`}>{industry}</p>
          ) : null}
          <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
            <h1 className={`text-2xl md:text-3xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t('reportTitle', { brandName: enriched.brandName })}
            </h1>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void handleExportPdf()}
                disabled={isExportingPdf}
                className={backBtnCls}
                title={t('actions.exportPdf')}
              >
                {isExportingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isExportingPdf ? t('actions.exportingPdf') : t('actions.exportPdf')}
              </button>
              {rawReport?.taskId && rawReport.taskId !== '__aggregated__' && onShare && !shareId ? (
                <button
                  type="button"
                  onClick={onShare}
                  className={backBtnCls}
                  title="复制免登录分享链接"
                >
                  <Share2 className="w-4 h-4" />
                  {shareCopied ? t('actions.shareCopied') : t('actions.share')}
                </button>
              ) : null}
            </div>
          </div>
          <p className={`text-sm ${mutedCls}`}>{t('diagnosisTime', { dateTime: enriched._dateTimeFull })}</p>

          {enriched._pkLeaderboard.length > 0 ? (
            <div className="mt-8 md:mt-10">
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-6 w-1 rounded-full ${accentBarCls}`} aria-hidden />
                <h3 className={`text-base md:text-lg font-bold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                  {t('sections.brandScoreLeaderboard')}
                </h3>
              </div>
              <p className={`text-xs md:text-sm mb-4 ${mutedCls}`}>
                {t('sections.brandScoreLeaderboardHint')}
              </p>
              <div
                className={`overflow-hidden rounded-2xl border ${
                  isDark ? 'border-white/5 bg-zinc-800/40' : 'border-slate-100 bg-slate-50'
                }`}
              >
                {enriched._pkLeaderboard.map((row, idx) => {
                  const showGap =
                    enriched._pkLeaderboardShowEllipsis
                    && row.isSelf
                    && idx === enriched._pkLeaderboard.length - 1;
                  const isPkSelected =
                    !row.isSelf
                    && pkView.hasRival
                    && (row.name === pkView.selectedRivalName
                      || row.name === pkView.compName);
                  const rowInteractive = !row.isSelf;
                  return (
                    <React.Fragment key={`${row.rank}-${row.name}`}>
                      {showGap ? (
                        <div
                          className={`flex items-center justify-center border-t py-2 text-xs tracking-widest ${
                            isDark ? 'border-zinc-800 text-zinc-500' : 'border-slate-200 text-slate-400'
                          }`}
                          aria-hidden
                        >
                          ···
                        </div>
                      ) : null}
                      <div
                        role={rowInteractive ? 'button' : undefined}
                        tabIndex={rowInteractive ? 0 : undefined}
                        onClick={
                          rowInteractive
                            ? () => setSelectedPkRivalName(row.name)
                            : undefined
                        }
                        onKeyDown={
                          rowInteractive
                            ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setSelectedPkRivalName(row.name);
                                }
                              }
                            : undefined
                        }
                        className={`flex items-center gap-3 px-4 py-3 md:gap-4 md:px-5 md:py-3.5 ${
                          idx > 0 || showGap ? (isDark ? 'border-t border-zinc-800' : 'border-t border-slate-100') : ''
                        } ${
                          row.isSelf
                            ? isDark
                              ? 'bg-violet-950/35'
                              : 'bg-violet-50/90'
                            : isPkSelected
                              ? isDark
                                ? 'bg-fuchsia-950/30 ring-1 ring-inset ring-fuchsia-500/40'
                                : 'bg-fuchsia-50/90 ring-1 ring-inset ring-fuchsia-200'
                              : rowInteractive
                                ? isDark
                                  ? 'cursor-pointer hover:bg-zinc-800/60'
                                  : 'cursor-pointer hover:bg-white/80'
                                : ''
                        }`}
                      >
                        <div
                          className={`w-24 shrink-0 text-sm font-medium ${
                            isDark ? 'text-zinc-200' : 'text-slate-800'
                          }`}
                        >
                          {pkLeaderboardRankLabel(row.rank)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span
                            className={`truncate text-sm font-semibold md:text-base ${
                              row.isSelf
                                ? isDark
                                  ? 'text-violet-300'
                                  : 'text-violet-700'
                                : isDark
                                  ? 'text-white'
                                  : 'text-slate-900'
                            }`}
                            title={row.name}
                          >
                            {row.name}
                          </span>
                          {row.isSelf ? (
                            <span
                              className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                isDark
                                  ? 'bg-violet-500/20 text-violet-300'
                                  : 'bg-violet-100 text-violet-700'
                              }`}
                            >
                              {t('sections.thisBrand')}
                            </span>
                          ) : null}
                        </div>
                        <div
                          className={`shrink-0 text-xl font-bold tabular-nums md:text-2xl ${
                            row.isSelf
                              ? isDark
                                ? 'text-violet-300'
                                : 'text-violet-700'
                              : isDark
                                ? 'text-fuchsia-300'
                                : 'text-fuchsia-700'
                          }`}
                        >
                          {row.score}
                          <span className="ml-0.5 text-sm font-medium">分</span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-8 md:mt-10 flex flex-col md:flex-row items-stretch md:items-center gap-6 md:gap-4">
            <div
              className={`flex-1 rounded-2xl p-6 flex flex-col items-center text-center ${
                isDark ? 'bg-zinc-800/80 border border-white/5' : 'bg-slate-50 border border-slate-100'
              }`}
            >
              <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{enriched.brandName}</div>
              <div className={`mt-2 text-3xl font-bold tabular-nums ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
                {enriched._brandScore}
                <span className="text-base font-medium ml-0.5">分</span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center shrink-0 gap-1 py-2 md:py-0">
              <span
                className={`text-xl font-black tracking-widest px-4 py-2 rounded-xl ${
                  isDark ? 'bg-zinc-800 text-violet-300' : 'bg-violet-100 text-violet-800'
                }`}
              >
                PK
              </span>
            </div>

            <div
              className={`relative flex-1 rounded-2xl p-6 flex flex-col items-center text-center ${
                isDark ? 'bg-zinc-800/80 border border-white/5' : 'bg-slate-50 border border-slate-100'
              }`}
            >
              {pkView.hasRival && pkView.rivalBadge ? (
                <span
                  className={`absolute top-3 right-3 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide whitespace-nowrap ${
                    isDark ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-fuchsia-100 text-fuchsia-700'
                  }`}
                >
                  {pkView.rivalBadge}
                </span>
              ) : null}
              <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{pkView.compName}</div>
              <div className={`mt-2 text-3xl font-bold tabular-nums ${isDark ? 'text-fuchsia-300' : 'text-fuchsia-700'}`}>
                {pkView.compScore}
                <span className="text-base font-medium ml-0.5">分</span>
              </div>
            </div>
          </div>

          <div className="mt-10 space-y-6">
            {pkView.compareBars.map((bar) => (
              <div key={bar.label}>
                <div className="flex items-center gap-3 md:gap-4">
                  <div
                    className={`w-14 md:w-20 text-right text-sm font-medium tabular-nums shrink-0 ${
                      isDark ? 'text-zinc-200' : 'text-slate-800'
                    }`}
                  >
                    {bar.leftText}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`h-3 rounded-full overflow-hidden flex ${isDark ? 'bg-zinc-700' : 'bg-slate-200'}`}
                      role="presentation"
                    >
                      <div className={`h-full rounded-l-full ${accentBarCls}`} style={{ width: `${bar.leftPercent}%` }} />
                      <div className="flex-1 min-w-[4px]" />
                    </div>
                  </div>
                  <div
                    className={`w-14 md:w-20 text-left text-sm font-medium tabular-nums shrink-0 ${
                      isDark ? 'text-zinc-200' : 'text-slate-800'
                    }`}
                  >
                    {bar.rightText}
                  </div>
                </div>
                <p className={`text-center text-xs mt-2 ${mutedCls}`}>{bar.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border p-5 md:p-6 bg-gradient-to-br from-violet-500/10 to-transparent border-violet-500/20">
            <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-violet-600 text-white mb-4">
              总结
            </div>
            <p className={`text-sm md:text-base leading-relaxed ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>
              {pkView.fsSummaryLine1}
            </p>
            <p className={`text-sm md:text-base leading-relaxed mt-3 ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>
              {pkView.fsSummaryLine2}
            </p>
            <p className={`text-xs mt-4 ${mutedCls}`}>{enriched._fsSummaryFoot}</p>
          </div>
        </section>

        {/* 三、品牌可见性分析 */}
        <section className={cardClasses}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`h-8 w-1 rounded-full ${accentBarCls}`} aria-hidden />
            <h2 className={sectionTitleCls}>{t('sections.brandVisibility')}</h2>
          </div>

          <div className="h-[320px] md:h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={enriched.radarRows} cx="50%" cy="52%" outerRadius="72%">
                <PolarGrid stroke={isDark ? '#3f3f46' : '#e2e8f0'} />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: isDark ? '#a1a1aa' : '#64748b', fontSize: 11 }}
                />
                <Radar
                  name={t('sections.thisBrand')}
                  dataKey="brand"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.35}
                  strokeWidth={2}
                />
                {enriched._showIndustryBenchmark ? (
                  <Radar
                    name={t('sections.industryAverage')}
                    dataKey="industry"
                    stroke={isDark ? '#71717a' : '#94a3b8'}
                    fill={isDark ? '#71717a' : '#94a3b8'}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                ) : null}
                <Legend
                  wrapperStyle={{ paddingTop: 16 }}
                  formatter={(value) => <span className={isDark ? 'text-zinc-300' : 'text-slate-600'}>{value}</span>}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {enriched.visibilityCards.map((c) => (
              <div
                key={c.title}
                className={`rounded-xl p-4 border ${isDark ? 'bg-zinc-800/60 border-white/5' : 'bg-slate-50 border-slate-100'}`}
              >
                <div className={`text-xs font-medium ${mutedCls}`}>{c.title}</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className={`text-2xl font-bold tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {c.value}
                  </span>
                  <span className={`text-sm ${mutedCls}`}>{c.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div className={`mt-8 rounded-xl p-5 border ${isDark ? 'border-white/10 bg-zinc-800/40' : 'border-slate-100 bg-slate-50'}`}>
            <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-violet-600 text-white mb-3">
              总结
            </div>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>
              {enriched._visibilitySummaryLine1}
            </p>
            <p className={`text-sm leading-relaxed mt-2 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
              {enriched._visibilitySummaryLine2}
            </p>
            {enriched._visibilitySummaryFoot ? (
              <p className={`text-xs mt-3 ${mutedCls}`}>{enriched._visibilitySummaryFoot}</p>
            ) : null}
          </div>
        </section>

        {/* 四、AI 平台竞争力分析 */}
        <section className={cardClasses}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`h-8 w-1 rounded-full ${accentBarCls}`} aria-hidden />
            <h2 className={sectionTitleCls}>{t('sections.aiCompetitiveness')}</h2>
          </div>
          <p className={`text-sm leading-relaxed mb-4 ${mutedCls}`}>{AI_PLATFORM_DESC}</p>

          <div
            className={`mb-6 rounded-lg px-3 py-2 text-xs font-medium text-center ${
              isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-600'
            }`}
            style={{
              background: isDark
                ? 'linear-gradient(90deg, #4c1d95 0%, #3f3f46 50%, #27272a 100%)'
                : 'linear-gradient(90deg, #ede9fe 0%, #e2e8f0 50%, #f1f5f9 100%)',
            }}
          >
            <span className={isDark ? 'text-violet-300 font-semibold' : 'text-violet-700 font-semibold'}>竞争强势</span>
          </div>

          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm border-collapse min-w-[520px]">
              <thead>
                <tr className={isDark ? 'border-b border-zinc-700' : 'border-b border-slate-200'}>
                  <th className={`text-left py-3 pr-4 font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                    核心词
                  </th>
                  {enriched._aiPlatformCols.map((col) => (
                    <th key={col.id} className={`text-center py-3 px-2 font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                      <PlatformColHeader col={col} mutedCls={mutedCls} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enriched._aiPlatformRows.length === 0 ? (
                  <tr>
                    <td colSpan={1 + enriched._aiPlatformCols.length} className={`py-8 text-center ${mutedCls}`}>
                      暂无核心词数据
                    </td>
                  </tr>
                ) : (
                  enriched._aiPlatformRows.map((row) => (
                    <tr key={row.rowId} className={isDark ? 'border-b border-zinc-800' : 'border-b border-slate-100'}>
                      <td className={`py-3 pr-4 font-medium ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>{row.keyword}</td>
                      {row.platforms.map((rk, i) => (
                        <td key={i} className="py-3 px-2 text-center">
                          <span
                            className={`inline-block min-w-[3.5rem] px-2 py-1 rounded-lg text-xs font-medium ${rankPillClass(rk, isDark)}`}
                          >
                            {formatPlatformCell(rk, t)}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className={`mt-8 rounded-xl p-5 border ${isDark ? 'border-white/10 bg-zinc-800/40' : 'border-slate-100 bg-slate-50'}`}>
            <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-violet-600 text-white mb-3">
              总结
            </div>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>
              {enriched._aiPlatformSummaryLine1}
            </p>
            <p className={`text-sm leading-relaxed mt-2 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
              {enriched._aiPlatformSummaryLine2}
            </p>
            {enriched._aiPlatformSummaryFoot ? (
              <p className={`text-xs mt-3 ${mutedCls}`}>{enriched._aiPlatformSummaryFoot}</p>
            ) : null}
          </div>
        </section>

        {/* 五、AI 提及排行榜 */}
        <section className={cardClasses}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`h-8 w-1 rounded-full ${accentBarCls}`} aria-hidden />
            <h2 className={sectionTitleCls}>{t('sections.aiMentionRanking')}</h2>
          </div>
          <p className={`text-sm mb-6 ${mutedCls}`}>{enriched._aiRankingSubtitle}</p>

          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm border-collapse min-w-[520px]">
              <thead>
                <tr className={isDark ? 'border-b border-zinc-700' : 'border-b border-slate-200'}>
                  <th className={`text-left py-3 pr-4 font-semibold w-28 ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                    名次
                  </th>
                  {enriched._aiPlatformCols.map((col) => (
                    <th key={col.id} className={`text-center py-3 px-2 font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                      <PlatformColHeader col={col} mutedCls={mutedCls} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enriched._aiRankingRows.map((r, idx) => (
                  <tr key={r.rowId} className={isDark ? 'border-b border-zinc-800' : 'border-b border-slate-100'}>
                    <td className={`py-3 pr-4 font-medium ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                      {aiRankingRowLabel(idx, r.rankLabel)}
                    </td>
                    {r.cells.map((cell, ci) => (
                      <td key={ci} className="py-3 px-2 text-center">
                        <span
                          className={
                            cell.highlight
                              ? isDark
                                ? 'text-violet-300 font-semibold'
                                : 'text-violet-700 font-semibold'
                              : isDark
                                ? 'text-zinc-300'
                                : 'text-slate-700'
                          }
                        >
                          {cell.text}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={`mt-8 rounded-xl p-5 border ${isDark ? 'border-white/10 bg-zinc-800/40' : 'border-slate-100 bg-slate-50'}`}>
            <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-violet-600 text-white mb-3">
              总结
            </div>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>
              {enriched._aiRankingSummaryLine1}
            </p>
            <p className={`text-sm leading-relaxed mt-2 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
              {enriched._aiRankingSummaryLine2}
            </p>
            {enriched._aiRankingSummaryFoot ? (
              <p className={`text-xs mt-3 ${mutedCls}`}>{enriched._aiRankingSummaryFoot}</p>
            ) : null}
          </div>
        </section>

        {/* 六、正面提及词 */}
        <section className={cardClasses}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`h-8 w-1 rounded-full ${accentBarCls}`} aria-hidden />
            <h2 className={sectionTitleCls}>{t('sections.positiveKeywords')}</h2>
          </div>
          {positiveKeywordTexts.length === 0 ? (
            <p className={mutedCls}>暂无正面提及词</p>
          ) : (
            <PositiveKeywordsWordCloud theme={theme} keywords={positiveKeywordTexts} />
          )}
        </section>

        {/* 七、模型引用偏好 */}
        <section className={cardClasses}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`h-8 w-1 rounded-full ${accentBarCls}`} aria-hidden />
            <h2 className={sectionTitleCls}>{t('sections.modelCitationPreference')}</h2>
          </div>
          <p className={`text-sm leading-relaxed mb-8 ${mutedCls}`}>{CITATION_PREF_DESC}</p>

          <div className="space-y-10">
            {enriched._citationPlatforms.map((plat) => (
              <div key={plat.id}>
                <h3 className={`text-base font-semibold mb-4 ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>
                  {plat.name} 引用来源
                </h3>
                <div className="space-y-3">
                  {plat.pairRows.map((prow) => (
                    <div key={prow.rowId} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(['left', 'right'] as const).map((side) => {
                        const cell = prow[side];
                        return (
                          <div
                            key={side}
                            className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${
                              isDark ? 'bg-zinc-800/60 border-white/5' : 'bg-slate-50 border-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {cell.icon ? (
                                <span className="text-lg shrink-0" aria-hidden>
                                  {cell.icon}
                                </span>
                              ) : (
                                <span className={`text-xs font-mono tabular-nums shrink-0 w-6 ${mutedCls}`}>{cell.rankNum}</span>
                              )}
                              <span className={`truncate font-medium ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>
                                {cell.name}
                              </span>
                            </div>
                            <span className={`text-sm font-semibold tabular-nums shrink-0 ${purpleMuted}`}>{cell.pct}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 八、优化建议 */}
        <section className={cardClasses}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`h-8 w-1 rounded-full ${accentBarCls}`} aria-hidden />
            <h2 className={sectionTitleCls}>{t('sections.optimizationSuggestions')}</h2>
          </div>

          {optList.length === 0 ? (
            <p className={mutedCls}>{t('empty.noSuggestions')}</p>
          ) : (
            <div className="space-y-6">
              {optList.map((raw, idx) => {
                const sg = raw as {
                  id?: string | number;
                  num?: string | number;
                  title?: string;
                  platform?: string;
                  trigger?: string;
                  output?: string;
                  howLines?: string[];
                  metrics?: string;
                };
                const howLines = Array.isArray(sg.howLines) ? sg.howLines : [];
                return (
                  <div
                    key={sg.id != null ? String(sg.id) : `opt-${idx}`}
                    className={`rounded-2xl border p-5 md:p-6 ${isDark ? 'border-white/10 bg-zinc-800/40' : 'border-slate-100 bg-slate-50'}`}
                  >
                    <div className="flex gap-3 items-start">
                      <div
                        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                          isDark ? 'bg-violet-600 text-white' : 'bg-violet-600 text-white'
                        }`}
                      >
                        {sg.num != null ? String(sg.num) : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{sg.title || '—'}</h3>

                        <div className={`mt-4 space-y-3 text-sm ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>
                          <p>
                            <span className={mutedCls}>优先优化平台：</span>
                            {sg.platform ?? '—'}
                          </p>
                          <p>
                            <span className={mutedCls}>触发点：</span>
                            {sg.trigger ?? '—'}
                          </p>
                          <div>
                            <span className={mutedCls}>要产出：</span>
                            <p className="mt-1 whitespace-pre-wrap leading-relaxed">{sg.output ?? '—'}</p>
                          </div>
                          <div>
                            <span className={mutedCls}>怎么写：</span>
                            <ul className="mt-2 list-disc pl-5 space-y-1">
                              {howLines.length ? (
                                howLines.map((line, li) => (
                                  <li key={li}>{line}</li>
                                ))
                              ) : (
                                <li>—</li>
                              )}
                            </ul>
                          </div>
                          <p>
                            <span className={mutedCls}>预期提升指标：</span>
                            {sg.metrics ?? '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default GeoBrandReportMiniLayout;
