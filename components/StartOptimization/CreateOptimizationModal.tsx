import React, { useCallback, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { brandsAPI } from '../../api/brands';
import { geoWorkflowAPI, type GeoWorkflowDTO } from '../../api/geoWorkflow';
import type { BrandIntakeConfig, SelectedBrand } from './types';
import { invalidateRecentWorkflowsCache } from '../../constants/geoWorkflow';
import { GEO_QUESTION_INTENT } from './types';
import WorkbenchToast, { useWorkbenchToast } from './shared/WorkbenchToast';
import BrandIntakeFormFields from './shared/BrandIntakeFormFields';
import {
  filterDomesticPlatformIds,
  type BrandIntakeFormValues,
  validateBrandIntakeForm,
} from './shared/brandIntakeForm';
import { useModuleI18n } from '../../i18n/hooks';
import { formatThrownError } from '../../lib/formatApiError';

interface Props {
  brand: SelectedBrand;
  onCancel: () => void;
  onCreated: (wf: GeoWorkflowDTO, intake: BrandIntakeConfig) => void;
}

const CreateOptimizationModal: React.FC<Props> = ({ brand, onCancel, onCreated }) => {
  const { t } = useModuleI18n('optimization');
  const [form, setForm] = useState<BrandIntakeFormValues>(() => {
    const c = (brand.category || '').trim();
    return {
      brandName: brand.name,
      productName: '',
      subjectCategories: c ? [c] : [],
      inferCategoriesByAi: false,
      brandIntroduction: brand.brand_introduction ?? '',
      aiPlatforms: new Set(['doubao']),
      overseasPlatforms: new Set(),
      enableKnowledgeGraph: false,
      files: [],
    };
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, showErrorToast } = useWorkbenchToast();

  const patchForm = useCallback((patch: Partial<BrandIntakeFormValues>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const validateMessages = useMemo(
    () => ({
      brandNameRequired: t('stages.brandInput.errors.brandNameRequired'),
      categoryRequired: t('stages.brandInput.errors.categoryRequired'),
      kbRequiredForAiInfer: t('stages.brandInput.errors.kbRequiredForAiInfer'),
      domesticPlatformRequired: '请至少选择一个国内 AI 平台',
    }),
    [t]
  );

  const handleSubmit = async () => {
    setError(null);
    const validationErr = validateBrandIntakeForm(form, {
      requireBrandName: false,
      includeOverseas: false,
      messages: validateMessages,
    });
    if (validationErr) {
      setError(validationErr);
      return;
    }

    const categories = form.subjectCategories.map((x) => x.trim()).filter(Boolean);
    const primaryCategory = categories[0] ?? '';
    const effectiveProduct = form.productName.trim() || brand.name.trim();
    const platforms = filterDomesticPlatformIds(form.aiPlatforms);

    setSubmitting(true);
    try {
      let activeBrand = brand;
      const intro = form.brandIntroduction.trim() || null;
      if (
        primaryCategory !== (activeBrand.category || '').trim() ||
        intro !== (activeBrand.brand_introduction ?? null)
      ) {
        const updated = await brandsAPI.updateBrand(activeBrand.brand_id, {
          name: activeBrand.name,
          category: primaryCategory || activeBrand.category,
          brand_introduction: intro,
          knowledge_base_id: activeBrand.knowledge_base_id ?? null,
        });
        activeBrand = {
          ...activeBrand,
          category: updated.category ?? primaryCategory,
          brand_introduction: updated.brand_introduction ?? null,
        };
      }

      const wf = await geoWorkflowAPI.create({
        brand_name: activeBrand.name,
        brand_id: activeBrand.id,
        ai_platforms: platforms,
        product_name: effectiveProduct,
        question_intent: GEO_QUESTION_INTENT,
        subject_categories: form.inferCategoriesByAi ? undefined : categories,
        subject_category: primaryCategory || undefined,
        subject_categories_infer_by_ai: form.inferCategoriesByAi,
      });
      const wfReady = await geoWorkflowAPI.advance(wf.workflowId, { cycle_acked: true });
      const nextPhase = (wfReady?.phase || '').toLowerCase();
      if (nextPhase !== 'brand_parse') {
        throw new Error(`未能进入解析品牌阶段（当前：${wfReady?.phase || '未知'}）`);
      }
      invalidateRecentWorkflowsCache();
      const intake: BrandIntakeConfig = {
        brand: activeBrand,
        productName: effectiveProduct,
        subjectCategories: form.inferCategoriesByAi ? undefined : categories,
        subjectCategory: primaryCategory || undefined,
        subjectCategoriesInferByAi: form.inferCategoriesByAi,
        questionIntent: GEO_QUESTION_INTENT,
        aiPlatforms: platforms,
        overseasPlatforms: [],
        enableKnowledgeGraph: form.enableKnowledgeGraph,
        files: form.files,
      };
      onCreated(wfReady, intake);
    } catch (e: unknown) {
      const msg = formatThrownError(e, '创建失败');
      setError(msg);
      showErrorToast(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
      onClick={onCancel}
    >
      <WorkbenchToast toast={toast} />
      <div
        className="flex max-h-[88vh] min-h-0 w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="z-10 flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">创建新优化</div>
            <div className="mt-0.5 text-[11px] text-gray-400">品牌：{brand.name}</div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <BrandIntakeFormFields
            values={form}
            onChange={patchForm}
            showBrandName={false}
            brandNameReadOnly={brand.name}
            filesInputId="start-opt-modal-files"
          />
          {error && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-100 bg-white px-5 py-3">
          <button type="button" onClick={onCancel} className="btn-geo-secondary">
            取消
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="btn-geo-primary"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                创建中…
              </>
            ) : (
              <>创建新优化</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateOptimizationModal;
