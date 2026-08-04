import React, { useCallback, useMemo, useState } from 'react';
import { Loader2, ArrowRight } from 'lucide-react';
import { brandsAPI } from '../../../api/brands';
import { geoWorkflowAPI, type GeoWorkflowDTO } from '../../../api/geoWorkflow';
import type { BrandIntakeConfig, SelectedBrand } from '../types';
import { GEO_QUESTION_INTENT } from '../types';
import { invalidateRecentWorkflowsCache } from '../../../constants/geoWorkflow';
import { genBrandSlug } from '../../../utils/brandSlug';
import WorkbenchToast, { useWorkbenchToast } from '../shared/WorkbenchToast';
import BrandIntakeFormFields from '../shared/BrandIntakeFormFields';
import {
  filterDomesticPlatformIds,
  filterOverseasPlatformIds,
  type BrandIntakeFormValues,
  validateBrandIntakeForm,
} from '../shared/brandIntakeForm';
import { useOverseasNotOpenHint } from '../shared/useOverseasNotOpenHint';
import { useModuleI18n } from '../../../i18n/hooks';
import { formatThrownError } from '../../../lib/formatApiError';

interface Props {
  initialBrand?: SelectedBrand | null;
  initialConfig?: BrandIntakeConfig | null;
  onIntakeComplete: (wf: GeoWorkflowDTO, cfg: BrandIntakeConfig) => void;
  onBrandCreated?: () => void;
}

function initialFormValues(
  initialBrand?: SelectedBrand | null,
  initialConfig?: BrandIntakeConfig | null
): BrandIntakeFormValues {
  const fromIntake = initialConfig?.subjectCategories?.map((x) => x.trim()).filter(Boolean);
  const legacy = (initialConfig?.subjectCategory ?? initialBrand?.category ?? '').trim();
  const categories = fromIntake?.length ? fromIntake : legacy ? [legacy] : [];
  return {
    brandName: initialBrand?.name ?? '',
    productName: (initialConfig?.productName ?? '').trim(),
    subjectCategories: categories,
    inferCategoriesByAi: initialConfig?.subjectCategoriesInferByAi ?? false,
    brandIntroduction: initialBrand?.brand_introduction ?? '',
    aiPlatforms: new Set(
      initialConfig?.aiPlatforms?.length ? initialConfig.aiPlatforms : ['doubao']
    ),
    overseasPlatforms: new Set(initialConfig?.overseasPlatforms ?? []),
    enableKnowledgeGraph: initialConfig?.enableKnowledgeGraph ?? false,
    files: initialConfig?.files ?? [],
  };
}

const BrandInputStage: React.FC<Props> = ({
  initialBrand,
  initialConfig,
  onIntakeComplete,
  onBrandCreated,
}) => {
  const { t } = useModuleI18n('optimization');
  const [form, setForm] = useState<BrandIntakeFormValues>(() =>
    initialFormValues(initialBrand, initialConfig)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast, showErrorToast } = useWorkbenchToast();
  const { notifyOverseasNotOpen } = useOverseasNotOpenHint(showToast);

  const notifyError = useCallback(
    (msg: string) => {
      setError(msg);
      showErrorToast(msg);
    },
    [showErrorToast]
  );

  const patchForm = useCallback((patch: Partial<BrandIntakeFormValues>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const validateMessages = useMemo(
    () => ({
      brandNameRequired: t('stages.brandInput.errors.brandNameRequired'),
      categoryRequired: t('stages.brandInput.errors.categoryRequired'),
      kbRequiredForAiInfer: t('stages.brandInput.errors.kbRequiredForAiInfer'),
      saveFailed: t('stages.brandInput.errors.saveFailed'),
    }),
    [t]
  );

  const handleSubmit = async () => {
    setError(null);
    const validationErr = validateBrandIntakeForm(form, {
      requireBrandName: true,
      includeOverseas: true,
      messages: validateMessages,
    });
    if (validationErr) {
      notifyError(validationErr);
      return;
    }

    const categories = form.subjectCategories.map((x) => x.trim()).filter(Boolean);
    const primaryCategory = categories[0] ?? '';
    const effectiveProduct = form.productName.trim() || form.brandName.trim();
    const platformList = filterDomesticPlatformIds(form.aiPlatforms);
    const overseasList = filterOverseasPlatformIds(form.overseasPlatforms);

    setSubmitting(true);
    try {
      let brand: SelectedBrand;
      if (initialBrand?.id) {
        const updated = await brandsAPI.updateBrand(initialBrand.brand_id, {
          name: form.brandName.trim(),
          category: primaryCategory || initialBrand.category,
          brand_introduction: form.brandIntroduction.trim() || null,
          knowledge_base_id: initialBrand.knowledge_base_id ?? null,
        });
        brand = {
          id: updated.id,
          brand_id: updated.brand_id,
          name: updated.name,
          category: updated.category ?? '',
          brand_introduction: updated.brand_introduction ?? null,
          knowledge_base_id: updated.knowledge_base_id ?? null,
        };
      } else {
        const created = await brandsAPI.createBrand({
          brand_id: genBrandSlug(form.brandName),
          name: form.brandName.trim(),
          category: primaryCategory || '',
          brand_introduction: form.brandIntroduction.trim() || null,
          knowledge_base_id: null,
          is_active: true,
        });
        brand = {
          id: created.id,
          brand_id: created.brand_id,
          name: created.name,
          category: created.category ?? '',
          brand_introduction: created.brand_introduction ?? null,
          knowledge_base_id: created.knowledge_base_id ?? null,
        };
        onBrandCreated?.();
      }

      const cfg: BrandIntakeConfig = {
        brand,
        productName: effectiveProduct,
        subjectCategories: form.inferCategoriesByAi ? undefined : categories,
        subjectCategory: primaryCategory || undefined,
        subjectCategoriesInferByAi: form.inferCategoriesByAi,
        questionIntent: GEO_QUESTION_INTENT,
        aiPlatforms: platformList,
        overseasPlatforms: overseasList,
        enableKnowledgeGraph: form.enableKnowledgeGraph,
        files: form.files,
      };

      const wf = await geoWorkflowAPI.create({
        brand_name: brand.name,
        brand_id: brand.id,
        ai_platforms: platformList,
        overseas_ai_platforms: overseasList,
        product_name: effectiveProduct,
        question_intent: GEO_QUESTION_INTENT,
        subject_categories: form.inferCategoriesByAi ? undefined : categories,
        subject_category: primaryCategory || undefined,
        subject_categories_infer_by_ai: form.inferCategoriesByAi,
      });
      const wfReady = await geoWorkflowAPI.advance(wf.workflowId, { cycle_acked: true });
      const nextPhase = (wfReady?.phase || '').toLowerCase();
      if (nextPhase !== 'brand_parse') {
        throw new Error(
          `未能进入解析品牌阶段（当前阶段：${wfReady?.phase || '未知'}），请重试`
        );
      }
      invalidateRecentWorkflowsCache();
      onIntakeComplete(wfReady, cfg);
    } catch (e: unknown) {
      const msg = formatThrownError(e, t('stages.brandInput.errors.saveFailed'));
      notifyError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkbenchToast toast={toast} />
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto max-w-3xl space-y-4 px-2 pb-4 pt-0">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              {t('stages.brandInput.formTitle')}
            </h3>
            <BrandIntakeFormFields
              section="object"
              values={form}
              onChange={patchForm}
              filesInputId="start-opt-brand-input-files"
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <BrandIntakeFormFields
              section="materials"
              values={form}
              onChange={patchForm}
              filesInputId="start-opt-brand-input-files"
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <BrandIntakeFormFields
              section="platforms"
              values={form}
              onChange={patchForm}
              showOverseas
              onOverseasNotOpenHint={notifyOverseasNotOpen}
              filesInputId="start-opt-brand-input-files"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-200/90 bg-[#F5F5F7]/95 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.1)] backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-end gap-2">
          {error && (
            <div className="w-full rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-geo-primary"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('stages.brandInput.submitting')}
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                {t('common.next')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrandInputStage;
