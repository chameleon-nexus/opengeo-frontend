import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import {
  geoWorkflowAPI,
  type GeoDiagnosisQuestionDTO,
  type GeoWorkflowDTO,
} from '../../../api/geoWorkflow';
import { useModuleI18n } from '../../../i18n/hooks';

export interface DiagnosisQuestionsSectionProps {
  workflow: GeoWorkflowDTO;
  onWorkflowUpdated: (wf: GeoWorkflowDTO) => void;
}

function normalizeQuestions(raw: GeoDiagnosisQuestionDTO[] | null | undefined): GeoDiagnosisQuestionDTO[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((q) => ({
      ...q,
      text: (q.text ?? '').trim(),
      base_keyword: (q.base_keyword ?? '').trim() || undefined,
      subject_category: (q.subject_category ?? '').trim() || undefined,
      region_word: (q.region_word ?? '').trim() || undefined,
    }))
    .filter((q) => q.text);
}

function emptyQuestion(): GeoDiagnosisQuestionDTO {
  return {
    text: '',
    base_keyword: '',
    dimension: 'core_keyword',
    score: 95,
  };
}

const DiagnosisQuestionsSection: React.FC<DiagnosisQuestionsSectionProps> = ({
  workflow,
  onWorkflowUpdated,
}) => {
  const { t } = useModuleI18n('optimization');
  const [questions, setQuestions] = useState<GeoDiagnosisQuestionDTO[]>(() =>
    normalizeQuestions(workflow.diagnosisQuestions),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setQuestions(normalizeQuestions(workflow.diagnosisQuestions));
    setDirty(false);
  }, [workflow.workflowId, workflow.diagnosisQuestions, workflow.updatedAt]);

  const updateQuestionText = useCallback((index: number, text: string) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, text } : q)));
    setDirty(true);
  }, []);

  const addQuestion = useCallback(() => {
    setQuestions((prev) => [...prev, emptyQuestion()]);
    setDirty(true);
  }, []);

  const removeQuestion = useCallback((index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }, []);

  const handleSave = async () => {
    setError(null);
    const payload = questions
      .map((q) => ({ ...q, text: q.text.trim() }))
      .filter((q) => q.text);
    if (payload.length === 0) {
      setError(t('diagnosisQuestions.minOne'));
      return;
    }
    setSaving(true);
    try {
      const wf = await geoWorkflowAPI.patchDiagnosisQuestions(workflow.workflowId, payload);
      const saved = normalizeQuestions(wf.diagnosisQuestions ?? payload);
      setQuestions(saved.length ? saved : payload);
      setDirty(false);
      onWorkflowUpdated(wf);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('diagnosisQuestions.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[#111827]">{t('diagnosisQuestions.title')}</h3>
            <p className="mt-1 text-xs text-[#64748b]">{t('diagnosisQuestions.hint')}</p>
          </div>
          {dirty ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
              {t('diagnosisQuestions.pendingEdits')}
            </span>
          ) : null}
        </div>

        {questions.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">{t('diagnosisQuestions.empty')}</p>
        ) : (
          <ul className="space-y-3">
            {questions.map((q, i) => (
              <li
                key={`dq-${i}-${q.base_keyword ?? 'q'}`}
                className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-3"
              >
                <span className="mt-2 shrink-0 text-xs font-semibold text-slate-400 w-6">{i + 1}.</span>
                <textarea
                  rows={2}
                  value={q.text}
                  onChange={(e) => updateQuestionText(i, e.target.value)}
                  placeholder={t('diagnosisQuestions.placeholder')}
                  disabled={saving}
                  className="min-h-[2.5rem] flex-1 resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#E8553F]/50 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/20 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => removeQuestion(i)}
                  disabled={saving || questions.length <= 1}
                  title={t('diagnosisQuestions.remove')}
                  className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={addQuestion}
          disabled={saving}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-[#E8553F]/40 hover:text-[#E8553F] disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('diagnosisQuestions.add')}
        </button>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !dirty}
            className="btn-geo-primary disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('diagnosisQuestions.saving')}
              </>
            ) : (
              t('diagnosisQuestions.save')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiagnosisQuestionsSection;
