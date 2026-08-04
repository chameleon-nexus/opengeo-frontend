/**
 * 站点工作台 — 基础信息（CMS 设置 + 模板站前台模板）
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Loader2, Plus, X } from 'lucide-react';
import { Theme } from '../types';
import * as api from '../api/webMainSite';
import { sitesAPI } from '../api/sites';
import { useSiteContext } from '../context/SiteContext';
import { useModuleI18n } from '../i18n/hooks';
import {
  siteAccentBorderSelected,
  siteAccentSelected,
  siteFormCard,
  siteInputCls,
  sitePrimaryBtn,
  siteTagChip,
  siteWorkbenchInner,
  siteWorkbenchScroll,
  siteWorkbenchShell,
  siteWorkbenchSubtitle,
  siteWorkbenchTitle,
} from '../lib/siteWorkbenchUi';
import {
  SUBDOMAIN_BASE,
  buildEffectiveDomain,
  parseHostToDomainFields,
  type DomainMode,
} from '../lib/parseSiteHost';
import SiteImageAssetField from './SiteImageAssetField';
import SiteBannerImagesField from './SiteBannerImagesField';
import SloganRichEditor from './SloganRichEditor';
import {
  DEFAULT_BLOCK_VISIBILITY,
  blockVisibilityForTemplate,
  parseBlockVisibility,
  type SiteBlockVisibility,
  type SiteBlockVisibilityKey,
} from '../lib/siteBlockVisibility';
import ContactChannelsSettings, {
  DEFAULT_EN_FORM_FIELDS,
  DEFAULT_ZH_FORM_FIELDS,
  type ContactChannelRow,
  type ContactFormFieldKey,
  type ContactFormFieldRow,
} from './ContactChannelsSettings';

const FORM_FIELD_KEYS: ContactFormFieldKey[] = [
  'phone', 'email', 'wechat', 'whatsapp', 'discord', 'telegram', 'line',
];

function buildFormFieldsPayload(rows: ContactFormFieldRow[]): ContactFormFieldRow[] {
  return FORM_FIELD_KEYS.map((key, idx) => {
    const found = rows.find((r) => r.key === key);
    return {
      key,
      enabled: found ? found.enabled !== false : false,
      required: found ? !!found.required : false,
      sort: idx,
    };
  });
}

interface WebMainSettingsProps {
  theme: Theme;
  onSiteUpdated?: () => void;
}

const inputCls = siteInputCls;

const metaEnv = ((import.meta as any).env || {}) as Record<string, unknown>;
const isDevEnv = Boolean(metaEnv.DEV);
const CNAME_TARGET = (metaEnv.VITE_CNAME_TARGET || `sub.${SUBDOMAIN_BASE}`)
  .toString()
  .replace(/^https?:\/\//, '')
  .split('/')[0]
  .toLowerCase();

const TEXT_FIELD_KEYS: Array<{
  key: keyof api.WebMainSettings;
  labelKey: string;
  hintKey?: string;
}> = [
  { key: 'site_title', labelKey: 'webMainSettings.fields.site_title', hintKey: 'webMainSettings.fieldHints.site_title' },
  { key: 'brand_name', labelKey: 'webMainSettings.fields.brand_name', hintKey: 'webMainSettings.fieldHints.brand_name' },
  { key: 'hero_headline', labelKey: 'webMainSettings.fields.hero_headline', hintKey: 'webMainSettings.fieldHints.hero_headline' },
  { key: 'site_description', labelKey: 'webMainSettings.fields.site_description', hintKey: 'webMainSettings.fieldHints.site_description' },
  { key: 'phone', labelKey: 'webMainSettings.fields.phone' },
  { key: 'icp_number', labelKey: 'webMainSettings.fields.icp_number' },
  { key: 'police_number', labelKey: 'webMainSettings.fields.police_number' },
  { key: 'address', labelKey: 'webMainSettings.fields.address' },
  { key: 'contact_email', labelKey: 'webMainSettings.fields.contact_email' },
];

const WebMainSettings: React.FC<WebMainSettingsProps> = ({ theme: _theme, onSiteUpdated }) => {
  void _theme;
  const { t } = useModuleI18n('site');
  const { siteId, site } = useSiteContext();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [st, setSt] = useState<api.WebMainSettings>({});
  const [assetBusy, setAssetBusy] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [templateId, setTemplateId] = useState(site?.template_id || 'default');
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateMsg, setTemplateMsg] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(site?.is_open !== false);
  const [keywordInput, setKeywordInput] = useState('');
  const initialHost = parseHostToDomainFields(site?.primary_host || '');
  const [domainMode, setDomainMode] = useState<DomainMode>(initialHost.domainMode);
  const [subdomainSlug, setSubdomainSlug] = useState(initialHost.subdomainSlug);
  const [customDomain, setCustomDomain] = useState(initialHost.customDomain);
  const [blockVisibility, setBlockVisibility] = useState<SiteBlockVisibility>(DEFAULT_BLOCK_VISIBILITY);
  const [englishSiteEnabled, setEnglishSiteEnabled] = useState(false);

  const isTemplateSite = site?.site_kind === 'template';
  const visibleBlockKeys = useMemo(
    () => blockVisibilityForTemplate(templateId),
    [templateId],
  );

  useEffect(() => {
    if (!isTemplateSite) return;
    setBlockVisibility(
      parseBlockVisibility(site?.site_settings?.block_visibility, st.show_contact_form),
    );
    const i18n = (site?.site_settings?.i18n || {}) as { enabled_locales?: string[] };
    const locales = Array.isArray(i18n.enabled_locales) ? i18n.enabled_locales : ['zh'];
    setEnglishSiteEnabled(locales.includes('en'));
  }, [isTemplateSite, site?.id, site?.site_settings, site?.updated_at, st.show_contact_form]);

  useEffect(() => {
    setIsOpen(site?.is_open !== false);
  }, [site?.is_open]);

  useEffect(() => {
    const hf = parseHostToDomainFields(site?.primary_host || '');
    setDomainMode(hf.domainMode);
    setSubdomainSlug(hf.subdomainSlug);
    setCustomDomain(hf.customDomain);
  }, [site?.primary_host]);

  const effectiveDomain = useMemo(
    () => buildEffectiveDomain(domainMode, subdomainSlug, customDomain),
    [domainMode, subdomainSlug, customDomain],
  );

  const keywords = st.keywords || [];

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (!kw || keywords.length >= 20 || keywords.includes(kw)) return;
    setSt({ ...st, keywords: [...keywords, kw] });
    setKeywordInput('');
  };

  const removeKeyword = (kw: string) => {
    setSt({ ...st, keywords: keywords.filter((k) => k !== kw) });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
  };

  const toggleBlockVisibility = (key: SiteBlockVisibilityKey) => {
    setBlockVisibility((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === 'contact_form') {
        setSt((s) => ({ ...s, show_contact_form: next.contact_form }));
      }
      return next;
    });
  };

  const contactChannels = useMemo(
    () => (Array.isArray(st.contact_channels) ? st.contact_channels : []) as ContactChannelRow[],
    [st.contact_channels],
  );
  const contactFormFields = useMemo(() => {
    const raw = st.contact_form_fields;
    if (Array.isArray(raw) && raw.length > 0) {
      return buildFormFieldsPayload(raw as ContactFormFieldRow[]);
    }
    return buildFormFieldsPayload(englishSiteEnabled ? DEFAULT_EN_FORM_FIELDS : DEFAULT_ZH_FORM_FIELDS);
  }, [st.contact_form_fields, englishSiteEnabled]);

  const previewUrl = effectiveDomain ? `https://${effectiveDomain}` : '';

  const loadSettings = useCallback(() => {
    api.getWebMainSettings().then((data) => {
      setSt({
        ...data,
        hero_images: Array.isArray(data.hero_images) ? data.hero_images : [],
      });
    }).catch(() => setSt({}));
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    setTemplateId(site?.template_id || 'default');
  }, [site?.template_id]);

  useEffect(() => {
    if (site?.site_kind === 'template') {
      sitesAPI.listTemplates().then(setTemplates).catch(() => setTemplates([]));
    } else {
      setTemplates([]);
    }
  }, [site?.site_kind]);

  const saveTemplate = async (id: string) => {
    if (id === templateId) return;
    setTemplateSaving(true);
    setTemplateMsg(null);
    try {
      await sitesAPI.update(siteId, { template_id: id });
      setTemplateId(id);
      setTemplateMsg(t('webMainSettings.templateUpdated'));
      onSiteUpdated?.();
    } catch (err: unknown) {
      setTemplateMsg((err as Error).message || t('webMainSettings.templateSaveFailed'));
    } finally {
      setTemplateSaving(false);
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const heroImages = st.hero_images || [];
      const showContactForm = isTemplateSite ? blockVisibility.contact_form : (st.show_contact_form ?? true);
      const formFieldsPayload = buildFormFieldsPayload(contactFormFields);
      const analyticsEnabled = !!st.analytics_enabled;
      const gaId = (st.google_analytics_id || '').trim().toUpperCase();
      if (analyticsEnabled) {
        if (!gaId) {
          setMsg(t('webMainSettings.analyticsIdRequired'));
          setLoading(false);
          return;
        }
        if (!/^G-[A-Z0-9]+$/.test(gaId)) {
          setMsg(t('webMainSettings.analyticsIdInvalid'));
          setLoading(false);
          return;
        }
      } else if (gaId && !/^G-[A-Z0-9]+$/.test(gaId)) {
        setMsg(t('webMainSettings.analyticsIdInvalid'));
        setLoading(false);
        return;
      }
      await api.updateWebMainSettings({
        ...st,
        show_contact_form: showContactForm,
        analytics_enabled: analyticsEnabled,
        google_analytics_id: gaId || null,
        hero_background_url: heroImages[0] || st.hero_background_url || null,
        hero_images: heroImages,
        localized_settings: st.localized_settings,
        contact_channels: (st.contact_channels || []).map((c, i) => ({ ...c, sort: i, enabled: true })),
        contact_form_fields: formFieldsPayload,
      });
      const sitePatch: Parameters<typeof sitesAPI.update>[1] = {};
      if (isOpen !== (site?.is_open !== false)) sitePatch.is_open = isOpen;
      if (effectiveDomain && effectiveDomain !== (site?.primary_host || '')) {
        sitePatch.primary_host = effectiveDomain;
      }
      if (isTemplateSite) {
        sitePatch.site_settings = {
          ...(site?.site_settings || {}),
          block_visibility: blockVisibility,
          i18n: {
            enabled_locales: englishSiteEnabled ? ['en'] : ['zh'],
            default_locale: englishSiteEnabled ? 'en' : 'zh',
          },
        };
      }
      if (Object.keys(sitePatch).length > 0) {
        await sitesAPI.update(siteId, sitePatch);
        onSiteUpdated?.();
      }
      setMsg(t('webMainSettings.saved'));
    } catch (err: unknown) {
      setMsg((err as Error).message || t('webMainSettings.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (assetType: api.SiteAssetGenerateType, field: keyof api.WebMainSettings) => {
    setAssetBusy(`gen-${assetType}`);
    try {
      const url = await api.generateWebMainSiteAsset(assetType);
      setSt((prev) => ({ ...prev, [field]: url }));
    } catch (err) {
      alert((err as Error).message || t('webMainSettings.aiGenerateFailed'));
    } finally {
      setAssetBusy(null);
    }
  };

  const handleGenerateBanner = async () => {
    setAssetBusy('gen-banner');
    try {
      const url = await api.generateWebMainSiteAsset('banner');
      const prev = st.hero_images || [];
      const next = [...prev, url].slice(0, 4);
      setSt((s) => ({
        ...s,
        hero_images: next,
        hero_background_url: next[0] || '',
      }));
    } catch (err) {
      alert((err as Error).message || t('webMainSettings.aiGenerateFailed'));
    } finally {
      setAssetBusy(null);
    }
  };

  const heroImages = st.hero_images || [];

  return (
    <div className={siteWorkbenchShell}>
      <div className={siteWorkbenchScroll}>
        <div className={siteWorkbenchInner}>
          <div className="space-y-3">
            <h2 className={siteWorkbenchTitle}>{t('webMainSettings.pageTitle')}</h2>
            <p className={siteWorkbenchSubtitle}>
              {t('webMainSettings.subtitle')}
            </p>
          </div>

          {msg && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">{msg}</div>
          )}

          {site?.site_kind === 'template' && templates.length > 0 && (
            <section className={`${siteFormCard} space-y-4`}>
              <div>
                <h3 className="text-base font-semibold text-slate-900">{t('webMainSettings.templateTitle')}</h3>
                <p className="text-xs text-slate-500 mt-1">{t('webMainSettings.templateHint')}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    disabled={templateSaving}
                    onClick={() => void saveTemplate(tpl.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all disabled:opacity-60 ${
                      tpl.id === templateId ? siteAccentBorderSelected : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-semibold text-slate-900 text-sm">{tpl.name}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tpl.description}</p>
                  </button>
                ))}
              </div>
              {templateSaving && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> {t('webMainSettings.saving')}
                </p>
              )}
              {templateMsg && (
                <p className="text-xs text-slate-600">{templateMsg}</p>
              )}
            </section>
          )}

          {isTemplateSite && (
            <section className={`${siteFormCard} space-y-4`}>
              <div>
                <h3 className="text-base font-semibold text-slate-900">{t('webMainSettings.blockVisibilityTitle')}</h3>
                <p className="text-xs text-slate-500 mt-1">{t('webMainSettings.blockVisibilityHint')}</p>
              </div>
              <div className="divide-y divide-slate-100">
                {visibleBlockKeys.map((key) => (
                  <div key={key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <label className="text-sm font-medium text-slate-700">
                      {t(`webMainSettings.blockVisibility.${key}`)}
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleBlockVisibility(key)}
                      aria-label={t(`webMainSettings.blockVisibility.${key}`)}
                      className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${
                        blockVisibility[key] ? 'bg-gradient-coral' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${
                          blockVisibility[key] ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {isTemplateSite && (
            <section className={`${siteFormCard} space-y-4`}>
              <div>
                <h3 className="text-base font-semibold text-slate-900">{t('webMainSettings.i18nEnglishSiteTitle')}</h3>
                <p className="text-xs text-slate-500 mt-1">{t('webMainSettings.i18nEnglishSiteHint')}</p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-slate-700">{t('webMainSettings.i18nEnglishSiteLabel')}</span>
                <button
                  type="button"
                  onClick={() => setEnglishSiteEnabled(!englishSiteEnabled)}
                  aria-label={t('webMainSettings.i18nEnglishSiteLabel')}
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${englishSiteEnabled ? 'bg-gradient-coral' : 'bg-slate-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${englishSiteEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </section>
          )}

          <section className={`${siteFormCard} space-y-5`}>
            <div>
              <h3 className="text-base font-semibold text-slate-900">{t('webMainSettings.accessTitle')}</h3>
              <p className="text-xs text-slate-500 mt-1">{t('webMainSettings.accessHint')}</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t('aieoWebsite.accessUrl')}</label>
              <div className="flex gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => setDomainMode('subdomain')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    domainMode === 'subdomain' ? siteAccentSelected : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t('aieoWebsite.subdomainMode')}
                </button>
                <button
                  type="button"
                  onClick={() => setDomainMode('custom')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    domainMode === 'custom' ? siteAccentSelected : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t('aieoWebsite.customDomainMode')}
                </button>
              </div>

              {domainMode === 'subdomain' ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">{t('aieoWebsite.subdomainHint')}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={t('aieoWebsite.subdomainPlaceholder')}
                      value={subdomainSlug}
                      onChange={(e) => setSubdomainSlug(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())}
                      className={`${inputCls} flex-1`}
                    />
                    <span className="text-sm text-slate-500 whitespace-nowrap">.{SUBDOMAIN_BASE}</span>
                  </div>
                  {isDevEnv && effectiveDomain && (
                    <p className="text-xs text-slate-500">{t('aieoWebsite.hostsHint', { domain: effectiveDomain })}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">{t('aieoWebsite.customDomainHint')}</p>
                  <input
                    type="text"
                    placeholder={t('aieoWebsite.customDomainPlaceholder')}
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    className={inputCls}
                  />
                  <div className="p-4 rounded-xl text-sm space-y-3 bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-800">{t('aieoWebsite.cnameTitle')}</div>
                    <p className="text-slate-500">{t('aieoWebsite.cnameHint')}</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">{t('aieoWebsite.cnameType')}</span>
                        <span className="font-mono text-xs text-slate-800">CNAME</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">{t('aieoWebsite.cnameHost')}</span>
                        <span className="font-mono text-xs text-slate-800">{t('aieoWebsite.cnameHostValue')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">{t('aieoWebsite.cnameValue')}</span>
                        <span className="font-mono text-xs text-slate-800">{CNAME_TARGET}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(CNAME_TARGET)}
                          className="p-1 rounded hover:bg-slate-200"
                          title={t('aieoWebsite.copy')}
                        >
                          <Copy className="w-4 h-4 text-slate-500 inline" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">{t('aieoWebsite.cnamePropagation')}</p>
                  </div>
                </div>
              )}

              {effectiveDomain && (
                <div className="flex items-center gap-2 p-3 mt-3 rounded-xl bg-slate-50 flex-wrap">
                  <span className="text-sm font-medium text-slate-700">{t('aieoWebsite.willVisit')}</span>
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-[#E8553F] font-bold text-sm hover:underline truncate">
                    {previewUrl}
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(previewUrl)}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-slate-200"
                    title={t('aieoWebsite.copy')}
                  >
                    <Copy className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-sm font-medium text-slate-700">{t('webMainSettings.siteOpenLabel')}</label>
                <p className="text-xs text-slate-500 mt-0.5">{t('webMainSettings.siteOpenHint')}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-label={t('webMainSettings.siteOpenLabel')}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${isOpen ? 'bg-gradient-coral' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${isOpen ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </section>

          <form onSubmit={saveSettings} className={siteFormCard}>
            {TEXT_FIELD_KEYS.map(({ key, labelKey, hintKey }) => (
              <div key={key}>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t(labelKey)}</label>
                {hintKey && <p className="mb-1.5 text-xs text-slate-500">{t(hintKey)}</p>}
                <input
                  className={inputCls}
                  value={(st[key] as string) || ''}
                  onChange={(e) => setSt({ ...st, [key]: e.target.value })}
                />
              </div>
            ))}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('webMainSettings.fields.baidu_push_token')}</label>
              <p className="mb-1.5 text-xs text-slate-500">{t('webMainSettings.fieldHints.baidu_push_token')}</p>
              <input
                className={inputCls}
                type="password"
                autoComplete="off"
                value={st.baidu_push_token || ''}
                onChange={(e) => setSt({ ...st, baidu_push_token: e.target.value })}
                placeholder={t('webMainSettings.baiduPushTokenPlaceholder')}
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">{t('webMainSettings.analyticsTitle')}</p>
                  <p className="mt-1 text-xs text-slate-500">{t('webMainSettings.analyticsHint')}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!st.analytics_enabled}
                  onClick={() => setSt({ ...st, analytics_enabled: !st.analytics_enabled })}
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${st.analytics_enabled ? 'bg-gradient-coral' : 'bg-slate-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${st.analytics_enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
              {(st.analytics_enabled || (st.google_analytics_id || '').trim()) && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('webMainSettings.fields.google_analytics_id')}</label>
                  <p className="mb-1.5 text-xs text-slate-500">{t('webMainSettings.fieldHints.google_analytics_id')}</p>
                  <input
                    className={inputCls}
                    value={st.google_analytics_id || ''}
                    onChange={(e) => setSt({ ...st, google_analytics_id: e.target.value })}
                    placeholder={t('webMainSettings.analyticsIdPlaceholder')}
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>
              )}
            </div>

            {isTemplateSite && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('webMainSettings.fields.llms_txt')}</label>
              <p className="mb-1.5 text-xs text-slate-500">{t('webMainSettings.fieldHints.llms_txt')}</p>
              <textarea
                className={`${inputCls} min-h-[280px] font-mono text-xs leading-relaxed`}
                value={st.llms_txt || ''}
                onChange={(e) => setSt({ ...st, llms_txt: e.target.value })}
                placeholder={t('webMainSettings.llmsTxtPlaceholder')}
                spellCheck={false}
              />
              {effectiveDomain && (
                <p className="mt-2 text-xs text-slate-500">
                  {t('webMainSettings.llmsTxtPreview')}{' '}
                  <a
                    href={`https://${effectiveDomain}/llms.txt`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#E8553F] hover:underline"
                  >
                    https://{effectiveDomain}/llms.txt
                  </a>
                </p>
              )}
            </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{t('webMainSettings.indexingTitle')}</p>
                <p className="text-xs text-slate-500 mt-1">{t('webMainSettings.indexingHint')}</p>
              </div>
              {effectiveDomain && (
                <div className="text-xs text-slate-600 space-y-1">
                  <p>
                    Sitemap XML:{' '}
                    <a href={`https://${effectiveDomain}/sitemap.xml`} target="_blank" rel="noopener noreferrer" className="text-[#E8553F] hover:underline">
                      https://{effectiveDomain}/sitemap.xml
                    </a>
                  </p>
                  <p>
                    Sitemap TXT:{' '}
                    <a href={`https://${effectiveDomain}/sitemap.txt`} target="_blank" rel="noopener noreferrer" className="text-[#E8553F] hover:underline">
                      https://{effectiveDomain}/sitemap.txt
                    </a>
                  </p>
                  <p>
                    llms.txt:{' '}
                    <a href={`https://${effectiveDomain}/llms.txt`} target="_blank" rel="noopener noreferrer" className="text-[#E8553F] hover:underline">
                      https://{effectiveDomain}/llms.txt
                    </a>
                  </p>
                </div>
              )}
              <button
                type="button"
                className={`${sitePrimaryBtn} text-xs`}
                onClick={() => {
                  void api.downloadSiteUrlsTxt().catch((e: unknown) => alert((e as Error).message || t('webMainSettings.exportUrlsFailed')));
                }}
              >
                {t('webMainSettings.exportSiteUrls')}
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('webMainSettings.sloganLabel')}</label>
              <p className="mb-1.5 text-xs text-slate-500">
                {t('webMainSettings.sloganHint')}
              </p>
              <SloganRichEditor
                value={st.slogan || ''}
                onChange={(html) => setSt({ ...st, slogan: html })}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('webMainSettings.companyIntroLabel')}</label>
              <p className="mb-1.5 text-xs text-slate-500">{t('webMainSettings.companyIntroHint')}</p>
              <textarea
                className={`${inputCls} min-h-[120px] leading-relaxed resize-none`}
                value={st.company_intro || ''}
                onChange={(e) => setSt({ ...st, company_intro: e.target.value })}
                placeholder={t('webMainSettings.companyIntroPlaceholder')}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('webMainSettings.keywordsLabel')}</label>
              <p className="mb-2 text-xs text-slate-500">{t('webMainSettings.keywordsHint')}</p>
              <div className="flex gap-3 mb-3">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addKeyword();
                    }
                  }}
                  placeholder={t('webMainSettings.keywordsPlaceholder')}
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={addKeyword}
                  disabled={keywords.length >= 20 || !keywordInput.trim()}
                  className={`${sitePrimaryBtn} px-4 py-2 text-xs whitespace-nowrap`}
                >
                  <Plus className="w-4 h-4" /> {t('webMainSettings.keywordsAdd')}
                </button>
              </div>
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw) => (
                    <span key={kw} className={`${siteTagChip} group`}>
                      {kw}
                      <button type="button" onClick={() => removeKeyword(kw)} className="opacity-70 hover:opacity-100">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {!isTemplateSite && (
            <div className="flex items-center justify-between gap-4 py-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">{t('webMainSettings.contactFormLabel')}</label>
                <p className="text-xs text-slate-500 mt-0.5">{t('webMainSettings.contactFormHint')}</p>
              </div>
              <button
                type="button"
                onClick={() => setSt({ ...st, show_contact_form: !(st.show_contact_form ?? true) })}
                aria-label={t('webMainSettings.contactFormLabel')}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${(st.show_contact_form ?? true) ? 'bg-gradient-coral' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${(st.show_contact_form ?? true) ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
            )}

            <SiteImageAssetField
              label="Logo"
              hint={t('webMainSettings.assets.logoHint')}
              value={st.logo_url || ''}
              onChange={(url) => setSt({ ...st, logo_url: url })}
              uploadType="logo"
              uploading={assetBusy === 'upload-logo'}
              generating={assetBusy === 'gen-logo'}
              onUploadStart={() => setAssetBusy('upload-logo')}
              onUploadEnd={() => setAssetBusy(null)}
              onGenerate={() => handleGenerate('logo', 'logo_url')}
            />

            <SiteImageAssetField
              label="Favicon"
              hint={t('webMainSettings.assets.faviconHint')}
              value={st.favicon_url || ''}
              onChange={(url) => setSt({ ...st, favicon_url: url })}
              uploadType="favicon"
              accept="image/*,.ico"
              maxSizeMb={1}
              uploading={assetBusy === 'upload-favicon'}
              generating={assetBusy === 'gen-favicon'}
              onUploadStart={() => setAssetBusy('upload-favicon')}
              onUploadEnd={() => setAssetBusy(null)}
              onGenerate={() => handleGenerate('favicon', 'favicon_url')}
            />

            <SiteBannerImagesField
              label={t('webMainSettings.assets.bannerLabel')}
              hint={t('webMainSettings.assets.bannerHint')}
              images={heroImages}
              onChange={(images, primaryUrl) =>
                setSt({ ...st, hero_images: images, hero_background_url: primaryUrl })
              }
              uploading={assetBusy === 'upload-banner'}
              generating={assetBusy === 'gen-banner'}
              onUploadStart={() => setAssetBusy('upload-banner')}
              onUploadEnd={() => setAssetBusy(null)}
              onGenerate={handleGenerateBanner}
            />

            <div className="flex flex-wrap gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">{t('webMainSettings.heroMaskLabel')}</label>
                <button
                  type="button"
                  onClick={() => setSt({ ...st, hero_show_mask: !st.hero_show_mask })}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    st.hero_show_mask ? 'border-[#E8553F] bg-orange-50 text-[#E8553F]' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {st.hero_show_mask ? t('webMainSettings.heroMaskOn') : t('webMainSettings.heroMaskOff')}
                </button>
                <p className="text-xs text-slate-500">{t('webMainSettings.heroMaskHint')}</p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">{t('webMainSettings.heroTextColorLabel')}</label>
                <select
                  value={st.hero_text_color || 'white'}
                  onChange={(e) => setSt({ ...st, hero_text_color: e.target.value })}
                  className={inputCls}
                >
                  <option value="white">{t('webMainSettings.heroTextWhite')}</option>
                  <option value="black">{t('webMainSettings.heroTextBlack')}</option>
                </select>
              </div>
            </div>

            <SiteImageAssetField
              label={t('webMainSettings.assets.shareLabel')}
              hint={t('webMainSettings.assets.shareHint')}
              value={st.default_og_image || ''}
              onChange={(url) => setSt({ ...st, default_og_image: url })}
              uploadType="og_image"
              uploading={assetBusy === 'upload-og_image'}
              generating={assetBusy === 'gen-og_image'}
              onUploadStart={() => setAssetBusy('upload-og_image')}
              onUploadEnd={() => setAssetBusy(null)}
              onGenerate={() => handleGenerate('og_image', 'default_og_image')}
            />

            <SiteImageAssetField
              label={t('webMainSettings.contactQrLabel')}
              hint={t('webMainSettings.contactQrHintLegacy')}
              value={st.contact_qr_code_url || ''}
              onChange={(url) => setSt({ ...st, contact_qr_code_url: url })}
              uploadType="background"
              uploading={assetBusy === 'upload-contact_qr'}
              onUploadStart={() => setAssetBusy('upload-contact_qr')}
              onUploadEnd={() => setAssetBusy(null)}
            />

            {isTemplateSite && (
              <ContactChannelsSettings
                channels={contactChannels}
                formFields={contactFormFields}
                englishSite={englishSiteEnabled}
                onChannelsChange={(rows) => setSt({ ...st, contact_channels: rows })}
                onFormFieldsChange={(rows) => setSt({ ...st, contact_form_fields: rows })}
                assetBusy={assetBusy}
                onAssetBusy={setAssetBusy}
                inputCls={inputCls}
              />
            )}

            <button type="submit" disabled={loading} className={sitePrimaryBtn}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('webMainSettings.save')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WebMainSettings;
