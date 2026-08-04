import React, { useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  type ArticlesBranchDTO,
  type CycleStepResultDTO,
  type CycleStepResultsDTO,
  type PublishThirdPartyMetaDTO,
} from '../../../api/optimizationTask';
import { downloadOptimizationCycleBranchZip } from '../../../api/contentGeneration';
import { TP_STATUS } from '../../../constants/thirdPartyPublishStatus';

/** 4 列等分：类型 | 成稿 | ZIP | 媒体发布 */
const MASS_PUBLISH_GRID =
  'grid w-full grid-cols-4 gap-x-3 gap-y-2 items-center text-xs';

const massColValueCls = (isDark: boolean) =>
  `block w-full text-center tabular-nums ${isDark ? 'text-zinc-400' : 'text-slate-600'}`;

function massBranchInactive(status?: string): boolean {
  const s = (status || '').toLowerCase();
  return s === 'not_enabled' || s === 'not_configured';
}

function branchDraftCount(branch?: ArticlesBranchDTO): number {
  if (!branch) return 0;
  const c = branch.count;
  if (c != null && c > 0) return c;
  return branch.taskIds?.length ?? 0;
}

function exportStatusClass(status: string | undefined, isDark: boolean): string {
  const s = (status || '').toLowerCase();
  if (s === 'completed') return isDark ? 'text-emerald-400' : 'text-emerald-700';
  if (s === 'ready_to_export') return isDark ? 'text-sky-400' : 'text-sky-700';
  if (s === 'waiting_content') return isDark ? 'text-amber-400' : 'text-amber-700';
  if (s === 'failed') return 'text-red-500';
  return isDark ? 'text-zinc-500' : 'text-slate-500';
}

function exportStatusClickable(status?: string): boolean {
  const s = (status || '').toLowerCase();
  return s === 'ready_to_export' || s === 'completed';
}

function exportStatusDisplayLabel(status?: string, statusLabel?: string): string {
  const s = (status || '').toLowerCase();
  if (s === 'ready_to_export') return '可导出';
  if (statusLabel) return statusLabel;
  return '—';
}

const massColExportCls = (status: string | undefined, isDark: boolean) =>
  `block w-full text-center font-medium ${exportStatusClass(status, isDark)}`;

function mediaPublishStatusClass(kind: MediaPublishStatusKind, isDark: boolean): string {
  if (kind === 'published') return isDark ? 'text-emerald-400' : 'text-emerald-700';
  if (kind === 'partial') return isDark ? 'text-orange-400' : 'text-orange-700';
  if (kind === 'pending') return isDark ? 'text-sky-400' : 'text-sky-700';
  if (kind === 'enqueued') return isDark ? 'text-amber-400' : 'text-amber-700';
  if (kind === 'waiting') return isDark ? 'text-amber-400' : 'text-amber-700';
  if (kind === 'failed') return 'text-red-500';
  return isDark ? 'text-zinc-500' : 'text-slate-500';
}

type MediaPublishStatusKind = 'idle' | 'waiting' | 'enqueued' | 'failed' | 'partial' | 'pending' | 'published';

function resolveMediaPublishStatus(
  thirdPartyPublishEnabled: boolean,
  publishStep: CycleStepResultDTO | null | undefined,
  articlesStatus: string | undefined,
  cycleRunning: boolean,
): { label: string; kind: MediaPublishStatusKind } {
  if (!thirdPartyPublishEnabled) {
    return { label: '—', kind: 'idle' };
  }
  const tp: PublishThirdPartyMetaDTO | null | undefined =
    publishStep?.thirdPartyDomestic ?? publishStep?.thirdParty;
  const artSt = (articlesStatus || '').toLowerCase();
  const tpStatus = (tp?.status || '').trim();

  if (tp?.taskId) {
    if (tpStatus === TP_STATUS.PENDING) {
      return { label: TP_STATUS.PENDING, kind: 'pending' };
    }
    if (tpStatus === TP_STATUS.PARTIAL) {
      return { label: TP_STATUS.PARTIAL, kind: 'partial' };
    }
    if (tpStatus === TP_STATUS.PUBLISHED) {
      return { label: TP_STATUS.PUBLISHED, kind: 'published' };
    }
    return { label: TP_STATUS.GENERATED, kind: 'enqueued' };
  }
  if (tp?.error) {
    return { label: '入队失败', kind: 'failed' };
  }
  if (artSt === 'running' || cycleRunning) {
    return { label: '等待成稿', kind: 'waiting' };
  }
  if (artSt === 'partial' || artSt === 'failed') {
    return { label: '未成稿', kind: 'partial' };
  }
  return { label: '待入队', kind: 'waiting' };
}

function MassPublishBranchRow({
  label,
  draftCount,
  exportStatus,
  exportStatusLabel,
  mediaPublishLabel,
  mediaPublishKind,
  isDark,
  downloading,
  onDownload,
}: {
  label: string;
  draftCount: number;
  exportStatus?: string;
  exportStatusLabel?: string;
  mediaPublishLabel: string;
  mediaPublishKind: MediaPublishStatusKind;
  isDark: boolean;
  downloading: boolean;
  onDownload?: () => void;
}) {
  const clickable = Boolean(onDownload && exportStatusClickable(exportStatus));
  const statusText = exportStatusDisplayLabel(exportStatus, exportStatusLabel);

  return (
    <>
      <span className={`font-medium ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>{label}</span>
      <span className={massColValueCls(isDark)}>
        {draftCount > 0 ? `${draftCount} 篇` : '—'}
      </span>
      {clickable ? (
        <button
          type="button"
          disabled={downloading}
          onClick={onDownload}
          className={`${massColExportCls(exportStatus, isDark)} underline underline-offset-2 hover:opacity-80 disabled:opacity-50`}
          title="点击下载 ZIP（融媒宝）"
        >
          {downloading ? (
            <span className="inline-flex items-center justify-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              下载中
            </span>
          ) : (
            statusText
          )}
        </button>
      ) : (
        <span className={massColExportCls(exportStatus, isDark)}>{statusText}</span>
      )}
      <span
        className={`block w-full text-center font-medium ${mediaPublishStatusClass(mediaPublishKind, isDark)}`}
        title={mediaPublishKind === 'failed' ? mediaPublishLabel : undefined}
      >
        {mediaPublishLabel}
      </span>
    </>
  );
}

export interface OpenClawCycleStepsProps {
  taskId?: string;
  cycleNumber?: number;
  cycleStepResults?: CycleStepResultsDTO | null;
  isDark?: boolean;
  hideWhenEmpty?: boolean;
  sectionTitle?: string;
  onDownloadError?: (message: string) => void;
  /** 为 true 时展示媒体发布列状态（周期自动入队） */
  thirdPartyPublishEnabled?: boolean;
  /** 本轮周期是否仍在执行（文章生成中等） */
  cycleRunning?: boolean;
}

type PublishBranchKey = 'fanwen' | 'fangxie';

const OpenClawCycleSteps: React.FC<OpenClawCycleStepsProps> = ({
  taskId,
  cycleNumber,
  cycleStepResults,
  isDark = false,
  hideWhenEmpty = true,
  sectionTitle = '龙虾协同',
  onDownloadError,
  thirdPartyPublishEnabled = false,
  cycleRunning = false,
}) => {
  const [downloadingBranch, setDownloadingBranch] = useState<PublishBranchKey | null>(null);

  const articles = cycleStepResults?.articles;
  const mp = cycleStepResults?.massPublish;
  const publishStep = cycleStepResults?.publish;

  const tplCount = branchDraftCount(articles?.template);
  const imCount = branchDraftCount(articles?.imitate);

  const fanwenMpStatus = mp?.fanwen?.status;
  const fangxieMpStatus = mp?.fangxie?.status;
  const showFanwen = Boolean(mp && !massBranchInactive(fanwenMpStatus));
  const showFangxie = Boolean(mp && !massBranchInactive(fangxieMpStatus));

  const totalDrafts = (showFanwen ? tplCount : 0) + (showFangxie ? imCount : 0);

  const showMassPublishBlock = Boolean(mp && (showFanwen || showFangxie || mp.canMassPublish));

  const mediaPublishStatus = resolveMediaPublishStatus(
    thirdPartyPublishEnabled,
    publishStep,
    articles?.status,
    cycleRunning,
  );

  const handleDownload = useCallback(
    async (branch: PublishBranchKey) => {
      if (!taskId || cycleNumber == null) {
        onDownloadError?.('缺少任务或周期信息，无法下载');
        return;
      }
      setDownloadingBranch(branch);
      try {
        await downloadOptimizationCycleBranchZip(taskId, cycleNumber, branch);
      } catch (e) {
        onDownloadError?.(e instanceof Error ? e.message : '下载失败');
      } finally {
        setDownloadingBranch(null);
      }
    },
    [taskId, cycleNumber, onDownloadError],
  );

  if (hideWhenEmpty && !showMassPublishBlock) return null;

  const summaryParts: string[] = [];
  if (showFanwen && tplCount > 0) summaryParts.push(`范文 ${tplCount}`);
  if (showFangxie && imCount > 0) summaryParts.push(`仿写 ${imCount}`);

  const bothReadyExport =
    fanwenMpStatus === 'ready_to_export' && fangxieMpStatus === 'ready_to_export';
  const showScopeHint = Boolean(
    mp?.canMassPublish &&
      mp.massPublishScopeLabel &&
      !(bothReadyExport && mp.massPublishScopeLabel === '均可群发')
  );

  const canDownload = Boolean(taskId && cycleNumber != null);

  return (
    <div
      className={`rounded-lg border p-3 space-y-2 ${
        isDark ? 'border-slate-600 bg-zinc-900/50' : 'border-slate-200 bg-slate-50/60'
      }`}
    >
      <div className={`text-xs font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
        {sectionTitle}
      </div>
      {showMassPublishBlock ? (
        <div className="space-y-2">
          <p className={`text-[11px] font-semibold ${isDark ? 'text-violet-300' : 'text-violet-800'}`}>
            待群发
            {totalDrafts > 0 ? (
              <span className={`ml-1.5 font-normal ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                · 成稿 {totalDrafts} 篇
                {summaryParts.length > 0 ? `（${summaryParts.join(' · ')}）` : ''}
              </span>
            ) : null}
          </p>
          {(showFanwen || showFangxie) && (
            <div className="rounded-md border border-slate-100/90 bg-white/60 px-3 py-2.5">
              <div className="w-full space-y-1">
                <div
                  className={`${MASS_PUBLISH_GRID} pb-1 text-[11px] font-medium ${
                    isDark ? 'text-zinc-500' : 'text-slate-400'
                  }`}
                >
                  <span />
                  <span className="text-center">成稿</span>
                  <span className="text-center">ZIP 导出</span>
                  <span className="text-center">媒体发布</span>
                </div>
                {showFanwen ? (
                  <div className={MASS_PUBLISH_GRID}>
                    <MassPublishBranchRow
                      label="范文"
                      draftCount={tplCount}
                      exportStatus={fanwenMpStatus}
                      exportStatusLabel={mp?.fanwen?.statusLabel}
                      mediaPublishLabel={mediaPublishStatus.label}
                      mediaPublishKind={mediaPublishStatus.kind}
                      isDark={isDark}
                      downloading={downloadingBranch === 'fanwen'}
                      onDownload={
                        canDownload && exportStatusClickable(fanwenMpStatus)
                          ? () => void handleDownload('fanwen')
                          : undefined
                      }
                    />
                  </div>
                ) : null}
                {showFangxie ? (
                  <div className={MASS_PUBLISH_GRID}>
                    <MassPublishBranchRow
                      label="仿写"
                      draftCount={imCount}
                      exportStatus={fangxieMpStatus}
                      exportStatusLabel={mp?.fangxie?.statusLabel}
                      mediaPublishLabel={mediaPublishStatus.label}
                      mediaPublishKind={mediaPublishStatus.kind}
                      isDark={isDark}
                      downloading={downloadingBranch === 'fangxie'}
                      onDownload={
                        canDownload && exportStatusClickable(fangxieMpStatus)
                          ? () => void handleDownload('fangxie')
                          : undefined
                      }
                    />
                  </div>
                ) : null}
              </div>
            </div>
          )}
          {showScopeHint ? (
            <p className={`text-[11px] ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              {mp!.massPublishScopeLabel}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default OpenClawCycleSteps;
