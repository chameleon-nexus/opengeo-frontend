import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Edit2,
  Loader2,
  Plus,
  Power,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Theme } from '../types';
import {
  ADMIN_PAGE_SHELL_CLS,
  adminCardCls,
  adminPageOuterCls,
  adminSubtitleCls,
  adminTitleCls,
} from '../utils/adminPageStyles';
import {
  geoStageFieldGuidesAPI,
  WORKBENCH_EXECUTE_PHASES,
  type GeoStageFieldGuideDTO,
  type GeoStageFieldGuidePayload,
  type WorkbenchExecutePhase,
} from '../api/geoStageFieldGuides';
import { useModuleI18n } from '../i18n/hooks';

interface Props {
  theme: Theme;
}

const EMPTY_FORM: GeoStageFieldGuidePayload = {
  phase: 'brand_parse',
  formId: '',
  formTitle: '',
  formSortOrder: 0,
  fieldKey: '',
  fieldLabel: '',
  required: false,
  dataType: 'string',
  uiComponent: 'text',
  apiField: null,
  question: '',
  answer: '',
  example: null,
  agentHint: null,
  relatedTools: [],
  sortOrder: 0,
  isActive: true,
};

const GeoStageFieldGuideManager: React.FC<Props> = ({ theme }) => {
  const { t } = useModuleI18n('admin');
  const isDark = theme === 'dark';
  const [phase, setPhase] = useState<WorkbenchExecutePhase>('brand_parse');
  const [search, setSearch] = useState('');
  const [formFilter, setFormFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<GeoStageFieldGuideDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GeoStageFieldGuideDTO | null>(null);
  const [form, setForm] = useState<GeoStageFieldGuidePayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await geoStageFieldGuidesAPI.list(phase, {
        q: search.trim() || undefined,
        formId: formFilter || undefined,
        includeInactive: true,
      });
      setItems(rows);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('pages.geoStageFieldGuides.errors.loadFailed'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [phase, search, formFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const formOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const row of items) {
      if (row.formId) ids.add(row.formId);
    }
    return [...ids].sort();
  }, [items]);

  const grouped = useMemo(() => {
    const map = new Map<string, { title: string; sort: number; rows: GeoStageFieldGuideDTO[] }>();
    for (const row of items) {
      if (!map.has(row.formId)) {
        map.set(row.formId, { title: row.formTitle, sort: row.formSortOrder, rows: [] });
      }
      map.get(row.formId)!.rows.push(row);
    }
    return [...map.entries()]
      .sort((a, b) => a[1].sort - b[1].sort || a[0].localeCompare(b[0]))
      .map(([formId, g]) => ({ formId, ...g }));
  }, [items]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, phase });
    setModalOpen(true);
  };

  const openEdit = (row: GeoStageFieldGuideDTO) => {
    setEditing(row);
    setForm({
      phase: row.phase,
      formId: row.formId,
      formTitle: row.formTitle,
      formSortOrder: row.formSortOrder,
      fieldKey: row.fieldKey,
      fieldLabel: row.fieldLabel,
      required: row.required,
      dataType: row.dataType,
      uiComponent: row.uiComponent,
      apiField: row.apiField,
      question: row.question,
      answer: row.answer,
      example: row.example,
      agentHint: row.agentHint,
      relatedTools: row.relatedTools ?? [],
      sortOrder: row.sortOrder,
      isActive: row.isActive,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSave = async () => {
    if (!form.formId.trim() || !form.fieldKey.trim() || !form.question.trim() || !form.answer.trim()) {
      window.alert(t('pages.geoStageFieldGuides.errors.requireFields'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        relatedTools: (form.relatedTools ?? []).filter(Boolean),
      };
      if (editing?.id) {
        const { phase: _p, formId: _f, fieldKey: _k, ...patch } = payload;
        await geoStageFieldGuidesAPI.update(editing.id, patch);
      } else {
        await geoStageFieldGuidesAPI.create(payload);
      }
      closeModal();
      await load();
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : t('pages.geoStageFieldGuides.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (row: GeoStageFieldGuideDTO) => {
    if (!row.id) {
      window.alert(t('pages.geoStageFieldGuides.errors.builtinReadonly'));
      return;
    }
    setBusyId(row.id);
    try {
      await geoStageFieldGuidesAPI.toggle(row.id);
      await load();
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : t('pages.geoStageFieldGuides.errors.operationFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (row: GeoStageFieldGuideDTO) => {
    if (!row.id) return;
    if (!window.confirm(t('pages.geoStageFieldGuides.confirm.delete', { label: row.fieldLabel, key: row.fieldKey }))) return;
    setBusyId(row.id);
    try {
      await geoStageFieldGuidesAPI.remove(row.id);
      await load();
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : t('pages.geoStageFieldGuides.errors.deleteFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm ${
    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
  }`;

  const cardCls = adminCardCls(isDark);

  return (
    <div className={adminPageOuterCls(isDark)}>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className={ADMIN_PAGE_SHELL_CLS}>
          <div>
            <h1 className={adminTitleCls(isDark)}>{t('pages.geoStageFieldGuides.pageTitle')}</h1>
            <p className={adminSubtitleCls(isDark)}>{t('pages.geoStageFieldGuides.subtitle')}</p>
          </div>

        <div className="flex flex-wrap gap-2">
          {WORKBENCH_EXECUTE_PHASES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPhase(p.id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                phase === p.id
                  ? 'bg-[#E8553F] text-white shadow'
                  : isDark
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-[#E8553F]/40'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex flex-1 min-w-[200px] items-center gap-2 rounded-lg border px-3 py-2 ${isDark ? 'border-zinc-700 bg-zinc-900' : 'border-slate-200 bg-white'}`}>
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="search"
              placeholder={t('pages.geoStageFieldGuides.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`flex-1 bg-transparent text-sm outline-none ${isDark ? 'text-white' : 'text-slate-800'}`}
            />
          </div>
          <select
            value={formFilter}
            onChange={(e) => setFormFilter(e.target.value)}
            className={inputCls + ' w-auto min-w-[160px]'}
          >
            <option value="">{t('pages.geoStageFieldGuides.allForms')}</option>
            {formOptions.map((fid) => (
              <option key={fid} value={fid}>
                {fid}
              </option>
            ))}
          </select>
          <button type="button" onClick={openCreate} className="btn-geo-primary shrink-0">
            <Plus className="w-4 h-4" />
            {t('pages.geoStageFieldGuides.addField')}
          </button>
        </div>

        {error ? (
          <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
        ) : grouped.length === 0 ? (
          <p className={`text-sm text-center py-12 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{t('pages.geoStageFieldGuides.empty')}</p>
        ) : (
          <div className="space-y-4">
            {grouped.map((g) => (
              <div key={g.formId} className={cardCls}>
                <div className={`px-5 py-4 border-b text-sm font-semibold ${isDark ? 'border-zinc-700/80 text-zinc-200' : 'border-gray-100 text-slate-800'}`}>
                  {g.title}
                  <span className={`ml-2 font-mono text-xs font-normal ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                    {g.formId}
                  </span>
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {g.rows.map((row) => (
                    <li
                      key={`${row.formId}-${row.fieldKey}-${row.id ?? 'd'}`}
                      className={`px-4 py-3 flex flex-wrap items-start gap-3 ${!row.isActive ? 'opacity-50' : ''}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {row.fieldLabel}
                          </span>
                          <code className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-600'}`}>
                            {row.fieldKey}
                          </code>
                          {row.required ? (
                            <span className="text-[10px] font-bold uppercase text-red-600">{t('pages.geoStageFieldGuides.required')}</span>
                          ) : (
                            <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{t('pages.geoStageFieldGuides.optional')}</span>
                          )}
                          {!row.id ? (
                            <span className="text-[10px] text-amber-600">{t('pages.geoStageFieldGuides.builtinDefault')}</span>
                          ) : null}
                        </div>
                        <p className={`mt-1 text-xs line-clamp-2 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                          Q: {row.question}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          title={t('pages.geoStageFieldGuides.edit')}
                          onClick={() => openEdit(row)}
                          className={`p-2 rounded-lg ${isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-slate-50 text-slate-600'}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title={row.isActive ? t('pages.geoStageFieldGuides.disable') : t('pages.geoStageFieldGuides.enable')}
                          disabled={busyId === row.id}
                          onClick={() => void handleToggle(row)}
                          className={`p-2 rounded-lg ${isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-slate-50 text-slate-600'}`}
                        >
                          {busyId === row.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </button>
                        {row.id ? (
                          <button
                            type="button"
                            title={t('pages.geoStageFieldGuides.delete')}
                            disabled={busyId === row.id}
                            onClick={() => void handleDelete(row)}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
          <div
            className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl p-6 space-y-4 ${
              isDark ? 'bg-zinc-900 text-white' : 'bg-white text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editing?.id ? t('pages.geoStageFieldGuides.editTitle') : t('pages.geoStageFieldGuides.addTitle')}</h3>
              <button type="button" onClick={closeModal} className="p-2 rounded-lg hover:bg-black/5">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              <div>
                <label className="text-xs font-semibold text-slate-500">form_id</label>
                <input
                  className={inputCls}
                  value={form.formId}
                  disabled={Boolean(editing?.id)}
                  onChange={(e) => setForm((f) => ({ ...f, formId: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">form_title</label>
                <input
                  className={inputCls}
                  value={form.formTitle}
                  onChange={(e) => setForm((f) => ({ ...f, formTitle: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">field_key</label>
                <input
                  className={inputCls}
                  value={form.fieldKey}
                  disabled={Boolean(editing?.id)}
                  onChange={(e) => setForm((f) => ({ ...f, fieldKey: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">field_label</label>
                <input
                  className={inputCls}
                  value={form.fieldLabel}
                  onChange={(e) => setForm((f) => ({ ...f, fieldLabel: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">api_field</label>
                <input
                  className={inputCls}
                  value={form.apiField ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, apiField: e.target.value || null }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">data_type / ui_component</label>
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    value={form.dataType}
                    onChange={(e) => setForm((f) => ({ ...f, dataType: e.target.value }))}
                  />
                  <input
                    className={inputCls}
                    value={form.uiComponent}
                    onChange={(e) => setForm((f) => ({ ...f, uiComponent: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">{t('pages.geoStageFieldGuides.faqQuestion')}</label>
              <input
                className={inputCls}
                value={form.question}
                onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">{t('pages.geoStageFieldGuides.faqAnswer')}</label>
              <textarea
                className={inputCls + ' min-h-[160px]'}
                value={form.answer}
                onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">{t('pages.geoStageFieldGuides.exampleHint')}</label>
              <textarea
                className={inputCls + ' min-h-[60px] mb-2'}
                placeholder="example"
                value={form.example ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, example: e.target.value || null }))}
              />
              <textarea
                className={inputCls + ' min-h-[60px]'}
                placeholder="agent_hint"
                value={form.agentHint ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, agentHint: e.target.value || null }))}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.required}
                onChange={(e) => setForm((f) => ({ ...f, required: e.target.checked }))}
              />
              {t('pages.geoStageFieldGuides.required')}
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeModal} className="btn-geo-secondary">
                {t('pages.geoStageFieldGuides.cancel')}
              </button>
              <button type="button" onClick={() => void handleSave()} disabled={saving} className="btn-geo-primary">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {t('pages.geoStageFieldGuides.save')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default GeoStageFieldGuideManager;
