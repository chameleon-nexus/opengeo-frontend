import React, { useState } from 'react';
import { CheckCircle2, FileBarChart, RefreshCcw, ListChecks, Trash2 } from 'lucide-react';
import { geoWorkflowAPI } from '../../../api/geoWorkflow';
import type { GeoWorkflowDTO } from '../../../api/geoWorkflow';
import type { SelectedBrand } from '../types';
import { useModuleI18n } from '../../../i18n/hooks';

interface Props {
  brand: SelectedBrand;
  workflow: GeoWorkflowDTO;
  onCreateNew: () => void;
  /** 全屏 GeoBrandReportMiniLayout，传 taskId */
  onOpenReport?: (taskId: string) => void;
  onOpenOptimizationTask?: (taskId: string) => void;
}

const CompletionStage: React.FC<Props> = ({
  brand,
  workflow,
  onCreateNew,
  onOpenReport,
  onOpenOptimizationTask,
}) => {
  const { t } = useModuleI18n('optimization');
  const reportId = workflow.latestReportId ?? workflow.diagnosisReportId ?? null;
  const reportTaskIdForView = workflow.latestReportId
    ? workflow.artifactReportTaskId
    : workflow.diagnosisReportTaskId;
  const reasonKey = workflow.completionReason?.trim().toLowerCase();
  const reasonLabel = reasonKey
    ? t(`stages.completion.reasons.${reasonKey}`, {
        defaultValue: workflow.completionReason ?? t('stages.completion.ended'),
      })
    : t('stages.completion.ended');

  const [deleteBusy, setDeleteBusy] = useState(false);

  const handleDeleteWorkflow = () => {
    if (!window.confirm(t('stages.completion.deleteConfirm'))) {
      return;
    }
    setDeleteBusy(true);
    void (async () => {
      try {
        await geoWorkflowAPI.deleteWorkflow(workflow.workflowId);
        onCreateNew();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : String(e));
      } finally {
        setDeleteBusy(false);
      }
    })();
  };

  return (
    <div className="max-w-3xl mx-auto px-2 py-2 space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-500" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-gray-900">{t('stages.completion.title')}</h2>
        <p className="mt-1 text-xs text-gray-500">
          {t('stages.completion.brandSummary', { brandName: brand.name, reason: reasonLabel })}
          {workflow.acceptedAt && (
            <>
              {t('stages.completion.acceptedAt', {
                time: new Date(workflow.acceptedAt).toLocaleString(),
              })}
            </>
          )}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900">{t('stages.completion.outputsTitle')}</h3>
        <p className="mt-1 text-xs text-gray-500">{t('stages.completion.outputsHint')}</p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {reportId != null && reportTaskIdForView && onOpenReport && (
            <button
              type="button"
              onClick={() => onOpenReport(reportTaskIdForView)}
              className="text-left rounded-xl border border-gray-200 px-4 py-3 hover:border-[#E8553F]/40 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <FileBarChart className="w-4 h-4 text-[#E8553F]" />
                {t('stages.completion.viewReport')}
              </div>
              <div className="mt-1 text-[11px] text-gray-400">
                {t('stages.completion.reportId', { id: reportId })}
              </div>
            </button>
          )}
          {workflow.optimizationTaskId && onOpenOptimizationTask && (
            <button
              type="button"
              onClick={() => onOpenOptimizationTask(workflow.optimizationTaskId!)}
              className="text-left rounded-xl border border-gray-200 px-4 py-3 hover:border-[#E8553F]/40 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <ListChecks className="w-4 h-4 text-[#E8553F]" />
                {t('stages.completion.viewDetail')}
              </div>
              <div className="mt-1 text-[11px] text-gray-400">
                {t('stages.completion.taskId', { id: workflow.optimizationTaskId })}
              </div>
            </button>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-red-100 bg-red-50/50 px-4 py-3 text-left">
          <p className="text-xs font-medium text-red-800">{t('stages.completion.deleteSectionTitle')}</p>
          <p className="mt-1 text-xs text-red-700/90">{t('stages.completion.deleteSectionHint')}</p>
          <button
            type="button"
            disabled={deleteBusy}
            onClick={handleDeleteWorkflow}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {deleteBusy ? t('stages.completion.deleting') : t('stages.completion.delete')}
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onCreateNew} className="btn-geo-primary">
            <RefreshCcw className="w-4 h-4" />
            {t('stages.completion.createNew')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompletionStage;
