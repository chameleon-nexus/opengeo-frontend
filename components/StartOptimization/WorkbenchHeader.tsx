import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Pencil,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import type { GeoWorkflowDTO } from '../../api/geoWorkflow';
import { brandsAPI } from '../../api/brands';
import { isGeoReportGenerationStepDone } from '../geoWorkflowShared';
import { WORKBENCH_STAGES, type SelectedBrand, type WorkbenchStage } from './types';
import { useModuleI18n } from '../../i18n/hooks';
import { stageDescription, stageLabel } from './stageI18n';

interface Props {
  brand: SelectedBrand | null;
  workflow: GeoWorkflowDTO | null;
  currentStage: WorkbenchStage;
  /** 已完成的阶段集合（用于阶段条「打勾」视觉；由业务 phase 推导，非仅当前浏览 stage） */
  completedStages: Set<WorkbenchStage>;
  /**
   * 由 `workflow.phase` 推导的可跳转上界（已与后端阶段对齐，含未生成报告即可进入「现状分析」页）
   */
  maxNavigableWorkbenchIndex: number;
  /** 已跳过的阶段集合（如半周期下的 report_generation：灰显且不可点） */
  skippedStages?: Set<WorkbenchStage>;
  /** 退出工作台 */
  onExit: () => void;
  /** 阶段条点击；可跳到 `maxNavigableWorkbenchIndex` 内任意非跳过阶段（与当前仅浏览的 `currentStage` 独立） */
  onJumpStage?: (s: WorkbenchStage) => void;
  /** 品牌名修改成功后的回调（让父级同步 SelectedBrand 与 list） */
  onBrandRenamed?: (next: SelectedBrand) => void;
}

const PRIMARY = '#E8553F';

const WorkbenchHeader: React.FC<Props> = ({
  brand,
  workflow,
  currentStage,
  completedStages,
  maxNavigableWorkbenchIndex,
  skippedStages,
  onExit,
  onJumpStage,
  onBrandRenamed,
}) => {
  const { t } = useModuleI18n('optimization');
  const currentIdx = WORKBENCH_STAGES.findIndex((s) => s.id === currentStage);
  const currentMeta = WORKBENCH_STAGES[currentIdx];
  const safeNavigableMax = Math.max(-1, maxNavigableWorkbenchIndex);

  // ===== 品牌名内联编辑 =====
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState<string>(brand?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraftName(brand?.name ?? '');
  }, [brand?.name]);

  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing]);

  /** workflow 已创建后不可改品牌名，需新建优化 */
  const canEdit = Boolean(brand?.brand_id) && !workflow?.workflowId;

  const beginEdit = () => {
    if (!canEdit || saving) return;
    setSaveError(null);
    setEditing(true);
  };
  const cancelEdit = () => {
    if (saving) return;
    setDraftName(brand?.name ?? '');
    setSaveError(null);
    setEditing(false);
  };
  const commitEdit = async () => {
    if (!brand) return;
    const next = draftName.trim();
    if (!next) {
      setSaveError(t('workbench.brandNameRequired'));
      return;
    }
    if (next === brand.name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await brandsAPI.updateBrand(brand.brand_id, { name: next });
      setSaving(false);
      setEditing(false);
      onBrandRenamed?.({
        ...brand,
        id: updated.id,
        brand_id: updated.brand_id,
        name: updated.name,
        category: updated.category,
        brand_introduction: updated.brand_introduction ?? brand.brand_introduction ?? null,
        knowledge_base_id: updated.knowledge_base_id ?? brand.knowledge_base_id ?? null,
      });
    } catch (e: any) {
      setSaving(false);
      setSaveError(e?.message || t('workbench.saveFailed'));
    }
  };

  // ===== 阶段条交互 =====
  const isStageSkipped = (s: WorkbenchStage) => Boolean(skippedStages?.has(s));
  const isStageDone = (s: WorkbenchStage) => {
    if (isStageSkipped(s)) return false;
    if (workflow?.phase === 'completion' || workflow?.phase === 'completed') {
      return true;
    }
    if (workflow && s === 'report_generation') {
      return isGeoReportGenerationStepDone(workflow);
    }
    const idx = WORKBENCH_STAGES.findIndex((x) => x.id === s);
    return completedStages.has(s) || idx < safeNavigableMax;
  };
  const isStageActive = (s: WorkbenchStage) => s === currentStage;
  /** 阶段条仅展示进度，不可切换阶段 */
  const canJumpTo = (_s: WorkbenchStage) => false;

  return (
    <div className="relative z-30 flex h-14 w-full shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-6">
      {/* ===== 左：身份（上行标签+ID，下行品牌名；各项自身不换行） ===== */}
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onExit}
          title={t('workbench.back')}
          className="w-8 h-8 shrink-0 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="min-w-0">
          <div className="flex flex-nowrap items-center gap-2">
            <span className="shrink-0 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {t('workbench.workflowLabel', { defaultValue: 'GEO Optimization Workflow' })}
            </span>
            {workflow?.workflowId ? (
              <span
                className="min-w-0 truncate whitespace-nowrap text-[10px] font-mono text-gray-300"
                title={workflow.workflowId}
              >
                {workflow.workflowId}
              </span>
            ) : null}
          </div>

          {editing ? (
            <div className="mt-0.5 flex min-w-0 flex-nowrap items-center gap-1.5">
              <input
                ref={inputRef}
                type="text"
                value={draftName}
                disabled={saving}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') cancelEdit();
                }}
                className="min-w-0 max-w-[260px] whitespace-nowrap rounded border border-[#E8553F]/40 px-1.5 py-0.5 text-sm font-bold leading-tight text-gray-900 outline-none focus:border-[#E8553F] focus:ring-2 focus:ring-[#E8553F]/20"
                placeholder={t('workbench.brandNamePlaceholder')}
              />
              <button
                type="button"
                onClick={commitEdit}
                disabled={saving}
                title={t('common.save')}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                title={t('common.cancel')}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-40"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {saveError ? (
                <span className="ml-1 min-w-0 truncate whitespace-nowrap text-[11px] text-red-500" title={saveError}>
                  {saveError}
                </span>
              ) : null}
            </div>
          ) : (
            <div
              className={`group mt-0.5 flex min-w-0 flex-nowrap items-center gap-2 ${canEdit ? 'cursor-pointer' : ''}`}
              title={brand?.name ?? t('workbench.unnamedWorkbench')}
              onClick={beginEdit}
            >
              <h1 className="min-w-0 truncate whitespace-nowrap text-sm font-extrabold leading-tight text-gray-900">
                {brand?.name ?? t('workbench.unnamedWorkflowTitle')}
              </h1>
              {canEdit ? (
                <Pencil className="h-3 w-3 shrink-0 text-gray-400 transition-colors group-hover:text-gray-600" />
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* ===== 右：当前阶段 + 阶段条 + 快捷入口（单行右对齐，窄屏阶段条横滚） ===== */}
      <div className="ml-auto flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-3 overflow-hidden">
        <div className="flex shrink-0 items-center gap-1.5 text-xs leading-5 text-gray-500">
          <span className="hidden sm:inline whitespace-nowrap">{t('workbench.currentPhaseLabel')}</span>
          <span
            className="whitespace-nowrap rounded-md px-2 py-0.5 font-medium text-white"
            style={{ background: PRIMARY }}
          >
            {currentMeta ? stageLabel(t, currentMeta.id) : '-'}
          </span>
        </div>

        <span className="hidden h-5 w-px shrink-0 bg-gray-300/80 sm:block" />

        <div
          className="min-w-0 shrink overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex w-max items-center rounded-full border border-gray-200/70 bg-white/10 p-0.5">
            {WORKBENCH_STAGES.map((s, idx) => {
              const skipped = isStageSkipped(s.id);
              const done = isStageDone(s.id);
              const active = isStageActive(s.id);
              const reachable = canJumpTo(s.id);
              const label = stageLabel(t, s.id);
              const dotClass = skipped
                ? 'bg-gray-300'
                : active
                  ? 'bg-yellow-500'
                  : done
                    ? 'bg-gray-400'
                    : 'bg-gray-300';
              const pillClass = skipped
                ? 'border-dashed border-gray-300 text-gray-400 cursor-not-allowed bg-gray-50/60 line-through opacity-70'
                : active
                  ? 'bg-slate-200/80 border-slate-300 text-slate-900'
                  : done
                    ? 'border-transparent text-gray-400 cursor-not-allowed bg-gray-100/70 opacity-60'
                    : reachable
                      ? 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-100/80'
                      : 'border-transparent text-gray-300 cursor-not-allowed opacity-50';
              return (
                <React.Fragment key={s.id}>
                  {idx > 0 && <span className="mx-1 h-4 w-px shrink-0 bg-gray-300" />}
                  <button
                    type="button"
                    onClick={() => {
                      if (!reachable) return;
                      onJumpStage?.(s.id);
                    }}
                    title={
                      skipped
                        ? t('workbench.stageSkipped', { label })
                        : active
                          ? stageDescription(t, s.id)
                          : t('workbench.stageProgress', {
                              label,
                              status: done ? t('workbench.stageDone') : t('workbench.stageNotReached'),
                            })
                    }
                    className={`flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-[background-color,border-color,color] duration-200 border ${pillClass}`}
                    disabled={!reachable}
                  >
                    <span className={`block size-1.5 rounded-full transition-colors ${dotClass}`} />
                    <span className="whitespace-nowrap">{label}</span>
                    {skipped && (
                      <span className="ml-0.5 text-[9px] font-normal">{t('workbench.skippedBadge')}</span>
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkbenchHeader;
