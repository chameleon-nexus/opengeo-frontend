import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Globe, Loader2, Pencil, Play, X } from 'lucide-react';
import { Theme } from '../types';
import { llmChannelAPI, type LlmChannelRow } from '../api/llmChannel';
import { searchConfigAPI, type SearchChannelRow } from '../api/searchConfig';
import {
  overseasAiAPI,
  type OverseasAiRow,
  type OverseasPlatformOption,
  type OverseasRunnerType,
} from '../api/overseasAi';
import { useModuleI18n } from '../i18n/hooks';

interface Props {
  theme: Theme;
}

type EditForm = {
  runnerType: OverseasRunnerType;
  llmChannelId: string;
  searchChannelId: string;
  enabled: boolean;
};

const PAGE_SHELL_CLS = 'max-w-7xl mx-auto px-6 py-8 space-y-6';

const RUNNER_OPTIONS: OverseasRunnerType[] = ['perplexity_native', 'openai_native', 'compose'];

const OverseasAiManagement: React.FC<Props> = ({ theme }) => {
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

  const [rows, setRows] = useState<OverseasAiRow[]>([]);
  const [platforms, setPlatforms] = useState<OverseasPlatformOption[]>([]);
  const [llmChannels, setLlmChannels] = useState<LlmChannelRow[]>([]);
  const [searchChannels, setSearchChannels] = useState<SearchChannelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modal, setModal] = useState<{ open: boolean; row: OverseasAiRow | null; form: EditForm }>({
    open: false,
    row: null,
    form: { runnerType: 'compose', llmChannelId: '', searchChannelId: '', enabled: false },
  });
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testQuery, setTestQuery] = useState('What are the best project management tools in 2025?');

  const platformLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    platforms.forEach((p) => map.set(p.value, p.label));
    return map;
  }, [platforms]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, llm, sc] = await Promise.all([
        overseasAiAPI.list(),
        llmChannelAPI.list(),
        searchConfigAPI.list(),
      ]);
      setRows(ov.items);
      setPlatforms(ov.platforms);
      setLlmChannels(llm.filter((x) => x.enabled));
      setSearchChannels(sc.filter((x) => x.enabled));
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || t('overseasAi.loadFailed') });
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

  const openEdit = (row: OverseasAiRow) => {
    setModal({
      open: true,
      row,
      form: {
        runnerType: row.runnerType,
        llmChannelId: row.llmChannelId != null ? String(row.llmChannelId) : '',
        searchChannelId: row.searchChannelId != null ? String(row.searchChannelId) : '',
        enabled: row.enabled,
      },
    });
  };

  const closeModal = () => setModal({ open: false, row: null, form: { runnerType: 'compose', llmChannelId: '', searchChannelId: '', enabled: false } });

  const needsLlm = (rt: OverseasRunnerType) => rt === 'perplexity_native' || rt === 'openai_native' || rt === 'compose';
  const needsSearch = (rt: OverseasRunnerType) => rt === 'compose';

  const handleSave = async () => {
    const { row, form } = modal;
    if (!row) return;
    setSaving(true);
    try {
      await overseasAiAPI.update(row.platformId, {
        runnerType: form.runnerType,
        llmChannelId: form.llmChannelId ? Number(form.llmChannelId) : null,
        searchChannelId: form.searchChannelId ? Number(form.searchChannelId) : null,
        enabled: form.enabled,
        clearLlmChannel: !form.llmChannelId,
        clearSearchChannel: !form.searchChannelId,
      });
      setMessage({ type: 'success', text: t('overseasAi.updated') });
      closeModal();
      await load();
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || t('overseasAi.saveFailed') });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (row: OverseasAiRow) => {
    setTestingId(row.platformId);
    try {
      const result = await overseasAiAPI.test(row.platformId, testQuery);
      const refs = result.preview.map((p, i) => `${i + 1}. ${p.title || ''}\n${p.url || ''}`).join('\n\n');
      window.alert(`${t('overseasAi.testOk', { count: result.refCount })}\n\n${result.answer.slice(0, 1200)}\n\n${refs}`);
    } catch (e) {
      window.alert((e as Error).message || t('overseasAi.testFailed'));
    } finally {
      setTestingId(null);
    }
  };

  const inputClass = isDark
    ? 'w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-600 bg-zinc-900/80 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/25 focus:border-[#E8553F]/50'
    : 'w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/20 focus:border-[#E8553F]/50';
  const labelCls = `text-xs font-semibold mb-1 block ${isDark ? 'text-zinc-300' : 'text-slate-700'}`;

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
          <div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('overseasAi.title')}</h1>
            <p className={`mt-1 text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{t('overseasAi.subtitle')}</p>
          </div>

          {message && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium ${message.type === 'success' ? (isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700') : (isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-700')}`}>
              {message.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
              {message.text}
            </div>
          )}

          <div className={cardCls}>
            <div className={`px-5 py-4 border-b ${toolbarBorder}`}>
              <p className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>{t('overseasAi.listTitle')}</p>
            </div>
            {rows.map((row) => (
              <div key={row.platformId} className={`flex flex-wrap items-center gap-3 px-5 py-4 border-b last:border-b-0 text-sm transition-colors ${toolbarBorder} ${rowHoverCls}`}>
                <div className={`p-1.5 rounded-lg ${isDark ? 'bg-zinc-800/80' : 'bg-gray-50'}`}><Globe className="w-4 h-4" /></div>
                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-bold ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>
                      {platformLabelMap.get(row.platformId) || row.platformId}
                    </span>
                    {!row.enabled && <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-semibold">{t('overseasAi.disabled')}</span>}
                  </div>
                  <div className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                    {t(`overseasAi.runner_${row.runnerType}`)}
                    {row.llmChannelName ? ` · LLM: ${row.llmChannelName}` : ''}
                    {row.searchChannelName ? ` · Search: ${row.searchChannelName}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => openEdit(row)} className={iconBtnCls}><Pencil className="w-4 h-4" /></button>
                  <button type="button" onClick={() => void handleTest(row)} disabled={testingId === row.platformId} className={iconBtnCls}>
                    {testingId === row.platformId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className={cardCls}>
            <div className={`px-5 py-4 border-b ${toolbarBorder}`}>
              <p className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>{t('overseasAi.testTitle')}</p>
            </div>
            <div className="px-5 py-4">
              <label className={labelCls}>{t('overseasAi.testQuery')}</label>
              <input className={inputClass} value={testQuery} onChange={(e) => setTestQuery(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {modal.open && modal.row && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className={`w-full max-w-lg rounded-2xl border shadow-xl ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'}`}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${toolbarBorder}`}>
              <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {platformLabelMap.get(modal.row.platformId) || modal.row.platformId}
              </h2>
              <button type="button" onClick={closeModal} className={iconBtnCls}><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className={labelCls}>{t('overseasAi.runnerType')}</label>
                <select
                  className={inputClass}
                  value={modal.form.runnerType}
                  onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, runnerType: e.target.value as OverseasRunnerType } }))}
                >
                  {RUNNER_OPTIONS.map((rt) => (
                    <option key={rt} value={rt}>{t(`overseasAi.runner_${rt}`)}</option>
                  ))}
                </select>
              </div>
              {needsLlm(modal.form.runnerType) && (
                <div>
                  <label className={labelCls}>{t('overseasAi.llmChannel')}</label>
                  <select
                    className={inputClass}
                    value={modal.form.llmChannelId}
                    onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, llmChannelId: e.target.value } }))}
                  >
                    <option value="">{t('overseasAi.selectPlaceholder')}</option>
                    {llmChannels.map((ch) => (
                      <option key={ch.id} value={String(ch.id)}>{ch.name} ({ch.providerType})</option>
                    ))}
                  </select>
                </div>
              )}
              {needsSearch(modal.form.runnerType) && (
                <div>
                  <label className={labelCls}>{t('overseasAi.searchChannel')}</label>
                  <select
                    className={inputClass}
                    value={modal.form.searchChannelId}
                    onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, searchChannelId: e.target.value } }))}
                  >
                    <option value="">{t('overseasAi.selectPlaceholder')}</option>
                    {searchChannels.map((ch) => (
                      <option key={ch.id} value={String(ch.id)}>{ch.name} ({ch.providerType})</option>
                    ))}
                  </select>
                </div>
              )}
              <label className="flex items-center gap-2 text-xs font-medium">
                <input type="checkbox" checked={modal.form.enabled} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, enabled: e.target.checked } }))} />
                {t('overseasAi.enabled')}
              </label>
            </div>
            <div className={`flex justify-end gap-2 px-5 py-4 border-t ${toolbarBorder}`}>
              <button type="button" onClick={closeModal} className={`px-4 py-2 text-sm font-semibold rounded-lg ${isDark ? 'text-zinc-300 bg-zinc-800' : 'text-slate-700 bg-gray-100'}`}>
                {t('overseasAi.cancel')}
              </button>
              <button type="button" onClick={() => void handleSave()} disabled={saving} className="btn-geo-primary px-4 py-2 text-sm font-semibold disabled:opacity-50">
                {saving ? t('overseasAi.saving') : t('overseasAi.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OverseasAiManagement;
