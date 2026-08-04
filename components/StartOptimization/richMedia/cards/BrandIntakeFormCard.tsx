import React, { useCallback, useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { geoWorkflowAPI } from '../../../../api/geoWorkflow';
import BrandIntakeFormFields from '../../shared/BrandIntakeFormFields';
import {
  brandIntakeFormPayloadFromValues,
  brandIntakeValuesFromFormFields,
  type BrandIntakeFormValues,
  validateBrandIntakeForm,
} from '../../shared/brandIntakeForm';
import { setImIntakeFiles } from '../../shared/imIntakeFilesCache';
import { useModuleI18n } from '../../../../i18n/hooks';

const BRAND_INTAKE_FORM_ID = 'brand_input_form';

interface Props {
  title: string;
  fields: Array<Record<string, unknown>>;
  submitTarget?: string;
  workflowId?: string | null;
  onSubmit: (message: string, payload: Record<string, unknown>) => Promise<unknown>;
}

const BrandIntakeFormCard: React.FC<Props> = ({
  title,
  fields,
  submitTarget,
  workflowId,
  onSubmit,
}) => {
  const { t } = useModuleI18n('optimization');
  const [form, setForm] = useState<BrandIntakeFormValues>(() => {
    const partial = brandIntakeValuesFromFormFields(fields);
    return {
      brandName: partial.brandName ?? '',
      productName: partial.productName ?? '',
      subjectCategories: partial.subjectCategories ?? [],
      inferCategoriesByAi: partial.inferCategoriesByAi ?? false,
      brandIntroduction: partial.brandIntroduction ?? '',
      aiPlatforms: partial.aiPlatforms ?? new Set(['doubao']),
      overseasPlatforms: new Set(),
      enableKnowledgeGraph: false,
      files: [],
    };
  });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  const handleSubmit = useCallback(async () => {
    const validationErr = validateBrandIntakeForm(form, {
      requireBrandName: true,
      includeOverseas: false,
      messages: validateMessages,
    });
    if (validationErr) {
      setErr(validationErr);
      return;
    }
    setErr(null);
    setSending(true);
    try {
      const wid = (workflowId || '').trim();
      if (form.files.length > 0 && wid) {
        try {
          await geoWorkflowAPI.supplementKnowledgeBase(wid, form.files);
        } catch (uploadErr: unknown) {
          const msg =
            uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
          setErr(msg || '知识库材料上传失败');
          return;
        }
      }
      if (wid) {
        setImIntakeFiles(wid, form.files);
      }
      const msg =
        (submitTarget && submitTarget.trim()) || `form_submit:${BRAND_INTAKE_FORM_ID}`;
      const payload = brandIntakeFormPayloadFromValues(form);
      await onSubmit(msg, payload);
      setDone(true);
    } catch (e: unknown) {
      setErr((e as Error)?.message || String(e));
    } finally {
      setSending(false);
    }
  }, [form, onSubmit, submitTarget, validateMessages, workflowId]);

  return (
    <div className="rounded-xl border border-[#E8553F]/20 bg-gradient-to-b from-[#FFF6F2] to-white px-4 py-3 text-left shadow-sm">
      <div className="text-sm font-semibold text-gray-900 mb-3">{title}</div>
      <BrandIntakeFormFields
        values={form}
        onChange={patchForm}
        section="all"
        filesInputId={`im-brand-intake-${workflowId || 'new'}`}
        disabled={done || sending}
      />
      {err && <div className="mt-2 text-xs text-red-500">{err}</div>}
      {done ? (
        <div className="mt-3 flex items-center gap-1 text-[11px] text-emerald-600">
          <Check className="w-3.5 h-3.5" />
          已提交
        </div>
      ) : (
        <button
          type="button"
          disabled={sending}
          onClick={() => void handleSubmit()}
          className="mt-3 w-full rounded-lg bg-[#E8553F] text-white text-sm py-2 flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {sending && <Loader2 className="w-4 h-4 animate-spin" />}
          提交
        </button>
      )}
    </div>
  );
};

export default BrandIntakeFormCard;
