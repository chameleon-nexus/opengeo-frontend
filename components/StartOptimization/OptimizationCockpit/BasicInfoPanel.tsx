import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { brandsAPI } from '../../../api/brands';
import { geoWorkflowAPI, type GeoWorkflowDTO } from '../../../api/geoWorkflow';
import { optimizationTaskAPI } from '../../../api/optimizationTask';
import { resolveCockpitPublishMarket } from './types';
import BrandIntakeFormFields from '../shared/BrandIntakeFormFields';
import {
  filterDomesticPlatformIds,
  filterOverseasPlatformIds,
  type BrandIntakeFormValues,
  validateBrandIntakeForm,
} from '../shared/brandIntakeForm';
import { useOverseasNotOpenHint } from '../shared/useOverseasNotOpenHint';
import WorkbenchToast, { useWorkbenchToast } from '../shared/WorkbenchToast';
import type { BrandIntakeConfig, SelectedBrand } from '../types';
import { subjectCategoriesFromWorkflow } from '../types';
import { useModuleI18n } from '../../../i18n/hooks';

export interface BasicInfoPanelProps {
  workflow: GeoWorkflowDTO;
  intake: BrandIntakeConfig | null;
  selectedBrand: SelectedBrand | null;
  onWorkflowUpdated: (wf: GeoWorkflowDTO) => void;
  onBrandUpdated?: (brand: SelectedBrand) => void;
  onTaskSnapshotRefresh?: () => void;
}

function formValuesFromWorkflow(
  workflow: GeoWorkflowDTO,
  intake: BrandIntakeConfig | null,
  selectedBrand: SelectedBrand | null,
): BrandIntakeFormValues {
  const fromIntake = intake?.subjectCategories?.map((x) => x.trim()).filter(Boolean);
  const fromWf = subjectCategoriesFromWorkflow(workflow);
  const categories = fromIntake?.length ? fromIntake : fromWf.length ? fromWf : [];
  const legacy = (intake?.subjectCategory ?? workflow.subjectCategory ?? selectedBrand?.category ?? '').trim();
  const subjectCategories = categories.length ? categories : legacy ? [legacy] : [];
  const inferByAi =
    subjectCategories.length > 0
      ? false
      : Boolean(intake?.subjectCategoriesInferByAi ?? workflow.subjectCategoriesInferByAi);

  return {
    brandName: (selectedBrand?.name ?? workflow.brandName ?? '').trim(),
    productName: (intake?.productName ?? workflow.productName ?? '').trim(),
    subjectCategories,
    inferCategoriesByAi: inferByAi,
    brandIntroduction: (selectedBrand?.brand_introduction ?? '').trim(),
    aiPlatforms: new Set(
      intake?.aiPlatforms?.length
        ? intake.aiPlatforms
        : workflow.aiPlatforms?.length
          ? workflow.aiPlatforms
          : ['doubao'],
    ),
    overseasPlatforms: new Set(
      intake?.overseasPlatforms?.length
        ? intake.overseasPlatforms
        : workflow.overseasAiPlatforms?.length
          ? workflow.overseasAiPlatforms
          : [],
    ),
    enableKnowledgeGraph: Boolean(intake?.enableKnowledgeGraph ?? workflow.semanticSeoTaskId?.trim()),
    files: intake?.files ?? [],
  };
}

const BasicInfoPanel: React.FC<BasicInfoPanelProps> = ({
  workflow,
  intake,
  selectedBrand,
  onWorkflowUpdated,
  onBrandUpdated,
  onTaskSnapshotRefresh,
}) => {
  const { t } = useModuleI18n('optimization');
  const [form, setForm] = useState<BrandIntakeFormValues>(() =>
    formValuesFromWorkflow(workflow, intake, selectedBrand),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { toast, showToast } = useWorkbenchToast();
  const { notifyOverseasNotOpen } = useOverseasNotOpenHint(showToast);

  const isOverseas = resolveCockpitPublishMarket(workflow.optimizationMarket) === 'overseas';

  useEffect(() => {
    setForm(formValuesFromWorkflow(workflow, intake, selectedBrand));
  }, [workflow.workflowId, workflow.updatedAt, intake, selectedBrand]);

  const patchForm = useCallback((patch: Partial<BrandIntakeFormValues>) => {
    setSuccess(null);
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (patch.subjectCategories && patch.subjectCategories.some((x) => x.trim())) {
        next.inferCategoriesByAi = false;
      }
      return next;
    });
  }, []);

  const validateMessages = useMemo(
    () => ({
      brandNameRequired: t('stages.brandInput.errors.brandNameRequired'),
      categoryRequired: t('stages.brandInput.errors.categoryRequired'),
      kbRequiredForAiInfer: t('stages.brandInput.errors.kbRequiredForAiInfer'),
      saveFailed: t('stages.brandInput.errors.saveFailed'),
    }),
    [t],
  );

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    const categories = form.subjectCategories.map((x) => x.trim()).filter(Boolean);
    const inferByAi = categories.length > 0 ? false : form.inferCategoriesByAi;
    const validationErr = validateBrandIntakeForm(
      { ...form, inferCategoriesByAi: inferByAi },
      {
        requireBrandName: true,
        includeOverseas: isOverseas,
        messages: validateMessages,
      },
    );
    if (validationErr) {
      setError(validationErr);
      return;
    }

    const primaryCategory = categories[0] ?? '';
    const brandName = form.brandName.trim();
    const effectiveProduct = form.productName.trim() || brandName;
    const platformList = filterDomesticPlatformIds(form.aiPlatforms);
    const overseasList = filterOverseasPlatformIds(form.overseasPlatforms);

    setSaving(true);
    try {
      const wf = await geoWorkflowAPI.advance(workflow.workflowId, {
        brand_name: brandName,
        product_name: effectiveProduct,
        ai_platforms: platformList,
        overseas_ai_platforms: overseasList,
        subject_categories: inferByAi ? undefined : categories,
        subject_category: primaryCategory || undefined,
        subject_categories_infer_by_ai: inferByAi,
      });
      onWorkflowUpdated(wf);

      if (selectedBrand?.brand_id && selectedBrand.id > 0) {
        const updated = await brandsAPI.updateBrand(selectedBrand.brand_id, {
          name: brandName,
          category: primaryCategory || selectedBrand.category,
          brand_introduction: form.brandIntroduction.trim() || null,
        });
        onBrandUpdated?.({
          ...selectedBrand,
          id: updated.id,
          brand_id: updated.brand_id,
          name: updated.name,
          category: updated.category,
          brand_introduction: updated.brand_introduction ?? null,
          knowledge_base_id: updated.knowledge_base_id ?? selectedBrand.knowledge_base_id ?? null,
        });
      }

      const tid = workflow.optimizationTaskId?.trim();
      if (tid) {
        await optimizationTaskAPI.patch(tid, {
          brand_name: brandName,
          product_name: effectiveProduct,
        });
        onTaskSnapshotRefresh?.();
      }

      const msg = t('basicInfo.saveSuccess');
      setSuccess(msg);
      showToast(msg);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('basicInfo.saveFailed');
      setError(msg || t('basicInfo.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkbenchToast toast={toast} />
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-4">
        <div className="mx-auto max-w-3xl space-y-4 px-2 pt-0">
          <p className="text-xs text-slate-500">{t('basicInfo.hint')}</p>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">{t('basicInfo.formTitle')}</h3>
            <BrandIntakeFormFields
              section="object"
              values={form}
              onChange={patchForm}
              filesInputId="cockpit-basic-info-files"
              disabled={saving}
            />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <BrandIntakeFormFields
              section="platforms"
              values={form}
              onChange={patchForm}
              showOverseas={isOverseas}
              onOverseasNotOpenHint={notifyOverseasNotOpen}
              filesInputId="cockpit-basic-info-files"
              disabled={saving}
            />
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-200/90 bg-[#F5F5F7]/95 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.1)] backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {error ? (
            <p className="flex-1 text-xs text-red-600 sm:text-right">{error}</p>
          ) : success ? (
            <p className="flex-1 text-xs text-emerald-700 sm:text-right">{success}</p>
          ) : (
            <span className="flex-1" aria-hidden />
          )}
          <button type="button" onClick={() => void handleSave()} disabled={saving} className="btn-geo-primary">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('basicInfo.saving')}
              </>
            ) : (
              t('basicInfo.save')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BasicInfoPanel;
