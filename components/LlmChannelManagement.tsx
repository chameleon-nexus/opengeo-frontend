import React, { useCallback, useEffect, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Loader2,
  Pencil,
  Play,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { Theme } from '../types';
import {
  llmChannelAPI,
  type LlmChannelRow,
  type ProviderType,
  type WebSearchMode,
} from '../api/llmChannel';
import { useModuleI18n } from '../i18n/hooks';

interface Props {
  theme: Theme;
}

type FormState = {
  code: string;
  name: string;
  providerType: ProviderType;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: string;
  webSearchMode: WebSearchMode;
  enabled: boolean;
};

const DOUBAO_DEFAULT_BASE = 'https://ark.cn-beijing.volces.com/api/v3';
const OPENAI_COMPAT_DEFAULT_BASE = 'https://api.deepseek.com/v1';
const OPENAI_COMPAT_DEFAULT_MODEL = 'deepseek-chat';

const providerFormDefaults = (providerType: ProviderType): Pick<FormState, 'providerType' | 'baseUrl' | 'model' | 'webSearchMode'> => {
  if (providerType === 'doubao_bot') {
    return {
      providerType,
      baseUrl: DOUBAO_DEFAULT_BASE,
      model: '',
      webSearchMode: 'native',
    };
  }
  return {
    providerType,
    baseUrl: OPENAI_COMPAT_DEFAULT_BASE,
    model: OPENAI_COMPAT_DEFAULT_MODEL,
    webSearchMode: 'none',
  };
};

const emptyForm = (): FormState => ({
  code: '',
  name: '',
  ...providerFormDefaults('doubao_bot'),
  apiKey: '',
  temperature: '0.7',
  enabled: true,
});

const WEB_MODE_OPTIONS: { value: WebSearchMode; labelKey: string }[] = [
  { value: 'none', labelKey: 'webModeNone' },
  { value: 'native', labelKey: 'webModeNative' },
  { value: 'third_party', labelKey: 'webModeThirdParty' },
];

const PAGE_SHELL_CLS = 'max-w-7xl mx-auto px-6 py-8 space-y-6';

const LlmChannelManagement: React.FC<Props> = ({ theme }) => {
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
  const [rows, setRows] = useState<LlmChannelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modal, setModal] = useState<{ open: boolean; editing: LlmChannelRow | null; form: FormState }>({
    open: false,
    editing: null,
    form: emptyForm(),
  });
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await llmChannelAPI.list();
      setRows(list);
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || t('llmChannels.loadFailed') });
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

  const openCreate = () => {
    setModal({ open: true, editing: null, form: emptyForm() });
  };

  const openEdit = (row: LlmChannelRow) => {
    const isDoubao = row.providerType === 'doubao_bot';
    setModal({
      open: true,
      editing: row,
      form: {
        code: row.code,
        name: row.name,
        providerType: row.providerType,
        baseUrl: row.baseUrl || (isDoubao ? DOUBAO_DEFAULT_BASE : ''),
        apiKey: '',
        model: row.model || '',
        temperature: row.temperature != null ? String(row.temperature) : '',
        webSearchMode: isDoubao && row.webSearchMode === 'none' ? 'native' : row.webSearchMode,
        enabled: row.enabled,
      },
    });
  };

  const closeModal = () => setModal({ open: false, editing: null, form: emptyForm() });

  const handleSave = async () => {
    const { form, editing } = modal;
    if (!form.name.trim()) {
      setMessage({ type: 'error', text: t('llmChannels.nameRequired') });
      return;
    }
    if (!editing && !form.code.trim()) {
      setMessage({ type: 'error', text: t('llmChannels.codeRequired') });
      return;
    }
    if (form.providerType === 'doubao_bot' && !form.model.trim() && !(editing?.model || '').trim()) {
      setMessage({ type: 'error', text: t('llmChannels.modelRequiredDoubao') });
      return;
    }
    setSaving(true);
    try {
      const temperature = form.temperature.trim() ? Number(form.temperature) : null;
      if (editing) {
        await llmChannelAPI.update(editing.id, {
          name: form.name.trim(),
          baseUrl: form.baseUrl.trim() || undefined,
          apiKey: form.apiKey.trim() || undefined,
          model: form.model.trim() || undefined,
          temperature,
          webSearchMode: form.webSearchMode,
          enabled: form.enabled,
        });
        setMessage({ type: 'success', text: t('llmChannels.updated') });
      } else {
        await llmChannelAPI.create({
          code: form.code.trim(),
          name: form.name.trim(),
          providerType: form.providerType,
          baseUrl: form.baseUrl.trim() || undefined,
          apiKey: form.apiKey.trim() || undefined,
          model: form.model.trim() || undefined,
          temperature,
          webSearchMode: form.webSearchMode,
          enabled: form.enabled,
        });
        setMessage({ type: 'success', text: t('llmChannels.created') });
      }
      closeModal();
      await load();
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || t('llmChannels.saveFailed') });
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (row: LlmChannelRow) => {
    try {
      await llmChannelAPI.setDefault(row.id);
      setMessage({ type: 'success', text: t('llmChannels.defaultSet') });
      await load();
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || t('llmChannels.saveFailed') });
    }
  };

  const handleDelete = async (row: LlmChannelRow) => {
    if (!window.confirm(t('llmChannels.deleteConfirm', { name: row.name }))) return;
    try {
      await llmChannelAPI.remove(row.id);
      setMessage({ type: 'success', text: t('llmChannels.deleted') });
      await load();
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || t('llmChannels.saveFailed') });
    }
  };

  const handleTest = async (row: LlmChannelRow) => {
    setTestingId(row.id);
    try {
      const reply = await llmChannelAPI.test(row.id);
      window.alert(`${t('llmChannels.testOk')}\n\n${reply.slice(0, 800)}`);
    } catch (e) {
      window.alert((e as Error).message || t('llmChannels.testFailed'));
    } finally {
      setTestingId(null);
    }
  };

  const inputClass = isDark
    ? 'w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-600 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/25 focus:border-[#E8553F]/50'
    : 'w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/20 focus:border-[#E8553F]/50';

  if (loading) {
    return (
      <div
        className={`flex flex-1 items-center justify-center min-h-[12rem] ${
          isDark ? 'bg-geo-bg text-zinc-400' : 'bg-[#F5F5F7] text-slate-500'
        }`}
      >
        <Loader2 className="w-6 h-6 animate-spin opacity-60" />
      </div>
    );
  }

  return (
    <div
      className={`flex-1 flex flex-col h-full min-h-0 overflow-hidden transition-colors duration-500 ${
        isDark ? 'bg-geo-bg text-white' : 'bg-[#F5F5F7] text-slate-900'
      }`}
    >
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className={PAGE_SHELL_CLS}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('llmChannels.title')}
              </h1>
              <p className={`mt-1 text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{t('llmChannels.subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="btn-geo-primary shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('llmChannels.create')}
            </button>
          </div>

          {message && (
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium ${
                message.type === 'success'
                  ? isDark
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-green-50 text-green-700'
                  : isDark
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-red-50 text-red-700'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
              {message.text}
            </div>
          )}

          <div className={cardCls}>
            <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b ${toolbarBorder}`}>
              <p className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                {t('llmChannels.listTitle')}
              </p>
            </div>
            {rows.length === 0 ? (
              <div className={`px-5 py-12 text-center text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                {t('llmChannels.empty')}
              </div>
            ) : (
              rows.map((row) => (
                <div
                  key={row.id}
                  className={`flex flex-wrap items-center gap-3 px-5 py-4 border-b last:border-b-0 text-sm transition-colors ${toolbarBorder} ${rowHoverCls}`}
                >
                  <div className={`p-1.5 rounded-lg ${isDark ? 'bg-zinc-800/80' : 'bg-gray-50'}`}>
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>{row.name}</span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ${
                          isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {row.code}
                      </span>
                      {row.isDefault && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-semibold">
                          <Star className="w-3 h-3 fill-current" />
                          {t('llmChannels.defaultBadge')}
                        </span>
                      )}
                      {!row.enabled && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-semibold">
                          {t('llmChannels.disabled')}
                        </span>
                      )}
                    </div>
                    <div className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                      {row.providerType} · {row.model || '—'} ·{' '}
                      {t(`llmChannels.${WEB_MODE_OPTIONS.find((o) => o.value === row.webSearchMode)?.labelKey || 'webModeNone'}`)}
                      {row.maskedKey ? ` · Key ${row.maskedKey}` : ''}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
                    {!row.isDefault && row.enabled && (
                      <button
                        type="button"
                        onClick={() => void handleSetDefault(row)}
                        className={isDark ? 'text-zinc-300 hover:text-[#E8553F]' : 'text-slate-600 hover:text-[#E8553F]'}
                      >
                        {t('llmChannels.setDefault')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleTest(row)}
                      disabled={testingId === row.id}
                      className={iconBtnCls}
                      title={t('llmChannels.test')}
                    >
                      {testingId === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                    <button type="button" onClick={() => openEdit(row)} className={iconBtnCls} title={t('llmChannels.edit')}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {row.code !== 'doubao_bot' && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(row)}
                        className={`${iconBtnCls} hover:text-red-500`}
                        title={t('llmChannels.delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className={`w-full max-w-lg rounded-2xl border p-5 space-y-4 shadow-sm ${
              isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                {modal.editing ? t('llmChannels.edit') : t('llmChannels.create')}
              </h3>
              <button type="button" onClick={closeModal} className={iconBtnCls}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {!modal.editing && (
              <div>
                <label className={`text-xs font-semibold mb-1 block ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  {t('llmChannels.code')}
                </label>
                <input className={inputClass} value={modal.form.code} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, code: e.target.value } }))} />
              </div>
            )}
            <div>
              <label className={`text-xs font-semibold mb-1 block ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                {t('llmChannels.name')}
              </label>
              <input className={inputClass} value={modal.form.name} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, name: e.target.value } }))} />
            </div>
            {!modal.editing && (
              <div>
                <label className={`text-xs font-semibold mb-1 block ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  {t('llmChannels.providerType')}
                </label>
                <select
                  className={inputClass}
                  value={modal.form.providerType}
                  onChange={(e) => {
                    const providerType = e.target.value as ProviderType;
                    setModal((m) => ({
                      ...m,
                      form: { ...m.form, ...providerFormDefaults(providerType) },
                    }));
                  }}
                >
                  <option value="openai_compatible">openai_compatible</option>
                  <option value="doubao_bot">doubao_bot</option>
                </select>
              </div>
            )}
            <div>
              <label className={`text-xs font-semibold mb-1 block ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                {t('llmChannels.baseUrl')}
              </label>
              <input className={inputClass} value={modal.form.baseUrl} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, baseUrl: e.target.value } }))} />
            </div>
            <div>
              <label className={`text-xs font-semibold mb-1 block ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                {t('llmChannels.model')}
              </label>
              <input
                className={inputClass}
                value={modal.form.model}
                placeholder={
                  modal.form.providerType === 'doubao_bot'
                    ? t('llmChannels.modelPlaceholderDoubao')
                    : t('llmChannels.modelPlaceholderOpenai')
                }
                onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, model: e.target.value } }))}
              />
            </div>
            <div>
              <label className={`text-xs font-semibold mb-1 block ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                {t('llmChannels.apiKey')}
              </label>
              <input
                type="password"
                className={inputClass}
                placeholder={modal.editing?.maskedKey ? modal.editing.maskedKey : ''}
                value={modal.form.apiKey}
                onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, apiKey: e.target.value } }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`text-xs font-semibold mb-1 block ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  {t('llmChannels.temperature')}
                </label>
                <input className={inputClass} value={modal.form.temperature} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, temperature: e.target.value } }))} />
              </div>
              <div>
                <label className={`text-xs font-semibold mb-1 block ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  {t('llmChannels.webSearchMode')}
                </label>
                <select
                  className={inputClass}
                  value={modal.form.webSearchMode}
                  onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, webSearchMode: e.target.value as WebSearchMode } }))}
                  disabled={modal.form.providerType === 'doubao_bot' || modal.editing?.code === 'doubao_bot'}
                >
                  {WEB_MODE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(`llmChannels.${opt.labelKey}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 rounded border-slate-300"
                checked={modal.form.enabled}
                disabled={modal.editing?.code === 'doubao_bot' && modal.editing?.isDefault}
                onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, enabled: e.target.checked } }))}
              />
              {t('llmChannels.enabled')}
            </label>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="btn-geo-primary w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {saving ? t('llmChannels.saving') : t('llmChannels.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LlmChannelManagement;
