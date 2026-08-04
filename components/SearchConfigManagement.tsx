import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Play,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { Theme } from '../types';
import {
  searchConfigAPI,
  type SearchChannelRow,
  type SearchProviderType,
} from '../api/searchConfig';
import { useModuleI18n } from '../i18n/hooks';

interface Props {
  theme: Theme;
}

type FormState = {
  code: string;
  name: string;
  providerType: SearchProviderType;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  engineType: string;
  numResults: string;
  includeSummary: boolean;
  includeMainText: boolean;
  searchType: string;
  searchDepth: string;
  topic: string;
  maxResults: string;
  includeAnswer: boolean;
};

const emptyForm = (): FormState => ({
  code: '',
  name: '',
  providerType: 'aliyun_iqs',
  baseUrl: 'https://cloud-iqs.aliyuncs.com',
  apiKey: '',
  enabled: false,
  engineType: 'LiteAdvanced',
  numResults: '10',
  includeSummary: false,
  includeMainText: false,
  searchType: 'auto',
  searchDepth: 'basic',
  topic: 'general',
  maxResults: '5',
  includeAnswer: true,
});

const PAGE_SHELL_CLS = 'max-w-7xl mx-auto px-6 py-8 space-y-6';

const SearchConfigManagement: React.FC<Props> = ({ theme }) => {
  const { t } = useModuleI18n('admin');
  const isDark = theme === 'dark';
  const toolbarBorder = isDark ? 'border-zinc-700/80' : 'border-gray-100';
  const cardCls = `rounded-2xl border overflow-hidden shadow-sm transition-colors ${
    isDark ? 'bg-zinc-900/40 border-zinc-700' : 'bg-white border-gray-200'
  }`;
  const rowHoverCls = isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-[#FFF9F6]/80';
  const iconBtnCls = `p-1.5 rounded-lg transition-colors shrink-0 ${
    isDark ? 'text-zinc-400 hover:text-[#E8553F] hover:bg-[#E8553F]/10' : 'text-gray-400 hover:text-[#E8553F] hover:bg-[#FFF6F2]'
  }`;
  const [rows, setRows] = useState<SearchChannelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modal, setModal] = useState<{ open: boolean; editing: SearchChannelRow | null; form: FormState }>({
    open: false,
    editing: null,
    form: emptyForm(),
  });
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testQuery, setTestQuery] = useState('人工智能最新进展');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await searchConfigAPI.list();
      setRows(list);
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || t('searchConfig.loadFailed') });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const formFromRow = (row: SearchChannelRow): FormState => {
    const extra = row.extraJson || {};
    return {
      code: row.code,
      name: row.name,
      providerType: row.providerType,
      baseUrl: row.baseUrl || '',
      apiKey: '',
      enabled: row.enabled,
      engineType: String(extra.engineType ?? 'LiteAdvanced'),
      numResults: String(extra.numResults ?? 10),
      includeSummary: Boolean(extra.includeSummary),
      includeMainText: Boolean(extra.includeMainText),
      searchType: String(extra.searchType ?? 'auto'),
      searchDepth: String(extra.searchDepth ?? 'basic'),
      topic: String(extra.topic ?? 'general'),
      maxResults: String(extra.maxResults ?? 5),
      includeAnswer: Boolean(extra.includeAnswer ?? true),
    };
  };

  const buildExtraJson = (form: FormState): Record<string, unknown> => {
    if (form.providerType === 'exa') {
      return {
        searchType: form.searchType,
        numResults: Number(form.numResults) || 10,
        includeSummary: form.includeSummary,
      };
    }
    if (form.providerType === 'tavily') {
      return {
        searchDepth: form.searchDepth,
        topic: form.topic,
        maxResults: Number(form.maxResults) || 5,
        includeAnswer: form.includeAnswer,
      };
    }
    return {
      engineType: form.engineType,
      numResults: Number(form.numResults) || 10,
      includeSummary: form.includeSummary,
      includeMainText: form.includeMainText,
    };
  };

  const openCreate = () => setModal({ open: true, editing: null, form: emptyForm() });
  const openEdit = (row: SearchChannelRow) =>
    setModal({ open: true, editing: row, form: formFromRow(row) });
  const closeModal = () => setModal({ open: false, editing: null, form: emptyForm() });

  const handleSave = async () => {
    const { form, editing } = modal;
    if (!form.name.trim()) {
      setMessage({ type: 'error', text: t('searchConfig.nameRequired') });
      return;
    }
    if (!editing && !form.code.trim()) {
      setMessage({ type: 'error', text: t('searchConfig.codeRequired') });
      return;
    }
    setSaving(true);
    try {
      const extraJson = buildExtraJson(form);
      if (editing) {
        await searchConfigAPI.update(editing.id, {
          name: form.name.trim(),
          baseUrl: form.baseUrl.trim() || undefined,
          apiKey: form.apiKey.trim() || undefined,
          extraJson,
          enabled: form.enabled,
        });
        setMessage({ type: 'success', text: t('searchConfig.updated') });
      } else {
        await searchConfigAPI.create({
          code: form.code.trim(),
          name: form.name.trim(),
          providerType: form.providerType,
          baseUrl: form.baseUrl.trim() || undefined,
          apiKey: form.apiKey.trim() || undefined,
          extraJson,
          enabled: form.enabled,
        });
        setMessage({ type: 'success', text: t('searchConfig.created') });
      }
      closeModal();
      await load();
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || t('searchConfig.saveFailed') });
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (row: SearchChannelRow) => {
    try {
      await searchConfigAPI.setDefault(row.id);
      setMessage({ type: 'success', text: t('searchConfig.defaultSet') });
      await load();
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || t('searchConfig.saveFailed') });
    }
  };

  const handleDelete = async (row: SearchChannelRow) => {
    if (!window.confirm(t('searchConfig.deleteConfirm', { name: row.name }))) return;
    try {
      await searchConfigAPI.remove(row.id);
      setMessage({ type: 'success', text: t('searchConfig.deleted') });
      await load();
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || t('searchConfig.saveFailed') });
    }
  };

  const handleTest = async (row: SearchChannelRow) => {
    setTestingId(row.id);
    try {
      const result = await searchConfigAPI.test(row.id, testQuery);
      const lines = result.preview
        .map((p, i) => `${i + 1}. ${p.title || ''}\n${p.url || ''}\n${p.snippet || ''}`)
        .join('\n\n');
      window.alert(`${t('searchConfig.testOk', { count: result.count })}\n\n${result.answer ? `${result.answer}\n\n` : ''}${lines}`);
    } catch (e) {
      window.alert((e as Error).message || t('searchConfig.testFailed'));
    } finally {
      setTestingId(null);
    }
  };

  const inputClass = isDark
    ? 'w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-600 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/25 focus:border-[#E8553F]/50'
    : 'w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/20 focus:border-[#E8553F]/50';
  const labelCls = `text-xs font-semibold mb-1 block ${isDark ? 'text-zinc-300' : 'text-slate-700'}`;

  const renderExtraFields = (form: FormState, setForm: (fn: (f: FormState) => FormState) => void) => {
    if (form.providerType === 'exa') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t('searchConfig.searchType')}</label>
            <select className={inputClass} value={form.searchType} onChange={(e) => setForm((f) => ({ ...f, searchType: e.target.value }))}>
              <option value="auto">auto</option>
              <option value="fast">fast</option>
              <option value="deep">deep</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>{t('searchConfig.numResults')}</label>
            <input className={inputClass} value={form.numResults} onChange={(e) => setForm((f) => ({ ...f, numResults: e.target.value }))} />
          </div>
        </div>
      );
    }
    if (form.providerType === 'tavily') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t('searchConfig.searchDepth')}</label>
            <select className={inputClass} value={form.searchDepth} onChange={(e) => setForm((f) => ({ ...f, searchDepth: e.target.value }))}>
              <option value="basic">basic</option>
              <option value="advanced">advanced</option>
              <option value="fast">fast</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>{t('searchConfig.maxResults')}</label>
            <input className={inputClass} value={form.maxResults} onChange={(e) => setForm((f) => ({ ...f, maxResults: e.target.value }))} />
          </div>
        </div>
      );
    }
    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t('searchConfig.engineType')}</label>
            <select className={inputClass} value={form.engineType} onChange={(e) => setForm((f) => ({ ...f, engineType: e.target.value }))}>
              <option value="LiteAdvanced">LiteAdvanced</option>
              <option value="Lite">Lite</option>
              <option value="GenericAdvanced">GenericAdvanced</option>
              <option value="Generic">Generic</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>{t('searchConfig.numResults')}</label>
            <input className={inputClass} value={form.numResults} onChange={(e) => setForm((f) => ({ ...f, numResults: e.target.value }))} />
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-xs font-medium">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.includeSummary} onChange={(e) => setForm((f) => ({ ...f, includeSummary: e.target.checked }))} />
            {t('searchConfig.includeSummary')}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.includeMainText} onChange={(e) => setForm((f) => ({ ...f, includeMainText: e.target.checked }))} />
            {t('searchConfig.includeMainText')}
          </label>
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <div className={`flex flex-1 items-center justify-center min-h-[12rem] ${isDark ? 'bg-geo-bg text-zinc-400' : 'bg-[#F5F5F7] text-slate-500'}`}>
        <Loader2 className="w-6 h-6 animate-spin opacity-60" />
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col h-full min-h-0 overflow-hidden transition-colors duration-500 ${isDark ? 'bg-geo-bg text-white' : 'bg-[#F5F5F7] text-slate-900'}`}>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className={PAGE_SHELL_CLS}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('searchConfig.title')}</h1>
              <p className={`mt-1 text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{t('searchConfig.subtitle')}</p>
            </div>
            <button type="button" onClick={openCreate} className="btn-geo-primary shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold">
              <Plus className="w-3.5 h-3.5" />
              {t('searchConfig.create')}
            </button>
          </div>

          {message && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium ${message.type === 'success' ? (isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700') : (isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-700')}`}>
              {message.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
              {message.text}
            </div>
          )}

          <div className={cardCls}>
            <div className={`px-5 py-4 border-b ${toolbarBorder}`}>
              <p className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>{t('searchConfig.listTitle')}</p>
            </div>
            {rows.length === 0 ? (
              <div className={`px-5 py-12 text-center text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>{t('searchConfig.empty')}</div>
            ) : (
              rows.map((row) => (
                <div key={row.id} className={`flex flex-wrap items-center gap-3 px-5 py-4 border-b last:border-b-0 text-sm transition-colors ${toolbarBorder} ${rowHoverCls}`}>
                  <div className={`p-1.5 rounded-lg ${isDark ? 'bg-zinc-800/80' : 'bg-gray-50'}`}><Search className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>{row.name}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-100 text-gray-600'}`}>{row.code}</span>
                      {row.isDefault && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-semibold">
                          <Star className="w-3 h-3 fill-current" />
                          {t('searchConfig.defaultBadge')}
                        </span>
                      )}
                      {!row.enabled && <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-semibold">{t('searchConfig.disabled')}</span>}
                    </div>
                    <div className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                      {row.providerType} · {row.baseUrl}{row.maskedKey ? ` · Key ${row.maskedKey}` : ''}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
                    {!row.isDefault && row.enabled && (
                      <button type="button" onClick={() => void handleSetDefault(row)} className={isDark ? 'text-zinc-300 hover:text-[#E8553F]' : 'text-slate-600 hover:text-[#E8553F]'}>
                        {t('searchConfig.setDefault')}
                      </button>
                    )}
                    <button type="button" onClick={() => openEdit(row)} className={iconBtnCls} title={t('searchConfig.edit')}><Pencil className="w-4 h-4" /></button>
                    <button type="button" onClick={() => void handleTest(row)} disabled={testingId === row.id} className={iconBtnCls} title={t('searchConfig.test')}>
                      {testingId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    </button>
                    {!row.isDefault && (
                      <button type="button" onClick={() => void handleDelete(row)} className={iconBtnCls} title={t('searchConfig.delete')}><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={cardCls}>
            <div className={`px-5 py-4 border-b ${toolbarBorder}`}>
              <p className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>{t('searchConfig.testTitle')}</p>
            </div>
            <div className="px-5 py-4">
              <label className={labelCls}>{t('searchConfig.testQuery')}</label>
              <input className={inputClass} value={testQuery} onChange={(e) => setTestQuery(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className={`w-full max-w-lg rounded-2xl border shadow-xl ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'}`}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${toolbarBorder}`}>
              <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {modal.editing ? t('searchConfig.editTitle') : t('searchConfig.createTitle')}
              </h2>
              <button type="button" onClick={closeModal} className={iconBtnCls}><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
              {!modal.editing && (
                <div>
                  <label className={labelCls}>{t('searchConfig.code')}</label>
                  <input className={inputClass} value={modal.form.code} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, code: e.target.value } }))} />
                </div>
              )}
              <div>
                <label className={labelCls}>{t('searchConfig.name')}</label>
                <input className={inputClass} value={modal.form.name} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, name: e.target.value } }))} />
              </div>
              {!modal.editing && (
                <div>
                  <label className={labelCls}>{t('searchConfig.providerType')}</label>
                  <select
                    className={inputClass}
                    value={modal.form.providerType}
                    onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, providerType: e.target.value as SearchProviderType } }))}
                  >
                    <option value="aliyun_iqs">Aliyun IQS</option>
                    <option value="exa">Exa</option>
                    <option value="tavily">Tavily</option>
                  </select>
                </div>
              )}
              <div>
                <label className={labelCls}>{t('searchConfig.baseUrl')}</label>
                <input className={inputClass} value={modal.form.baseUrl} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, baseUrl: e.target.value } }))} />
              </div>
              <div>
                <label className={labelCls}>{t('searchConfig.apiKey')}</label>
                <input
                  type="password"
                  className={inputClass}
                  placeholder={modal.editing?.maskedKey || ''}
                  value={modal.form.apiKey}
                  onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, apiKey: e.target.value } }))}
                />
              </div>
              {renderExtraFields(modal.form, (fn) => setModal((m) => ({ ...m, form: fn(m.form) })))}
              <label className="flex items-center gap-2 text-xs font-medium">
                <input type="checkbox" checked={modal.form.enabled} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, enabled: e.target.checked } }))} />
                {t('searchConfig.enabled')}
              </label>
            </div>
            <div className={`flex justify-end gap-2 px-5 py-4 border-t ${toolbarBorder}`}>
              <button type="button" onClick={closeModal} className={`px-4 py-2 text-sm font-semibold rounded-lg ${isDark ? 'text-zinc-300 bg-zinc-800' : 'text-slate-700 bg-gray-100'}`}>
                {t('searchConfig.cancel')}
              </button>
              <button type="button" onClick={() => void handleSave()} disabled={saving} className="btn-geo-primary px-4 py-2 text-sm font-semibold disabled:opacity-50">
                {saving ? t('searchConfig.saving') : t('searchConfig.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchConfigManagement;
