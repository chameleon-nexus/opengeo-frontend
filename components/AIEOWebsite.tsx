import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ChevronDown, X, HelpCircle, Copy } from 'lucide-react';
import { Theme, Brand } from '../types';
import { getMySiteConfig, updateMySiteConfig } from '../api/merchants';
import { sitesAPI, type SiteRow } from '../api/sites';
import { useOptionalSiteContext } from '../context/SiteContext';
import { uploadSiteAsset } from '../lib/siteAssetUpload';
import { useModuleI18n } from '../i18n/hooks';
import {
  SUBDOMAIN_BASE,
  buildEffectiveDomain,
  parseHostToDomainFields,
  type DomainMode,
} from '../lib/parseSiteHost';
import {
  siteAccentBorderSelected,
  siteAccentSelected,
  siteBadge,
  siteLinkAction,
  sitePrimaryBtn,
  siteTagChip,
  siteWorkbenchInner,
  siteWorkbenchScroll,
  siteWorkbenchShell,
  siteWorkbenchTitle,
} from '../lib/siteWorkbenchUi';

const metaEnv = ((import.meta as any).env || {}) as Record<string, unknown>;
const isDevEnv = Boolean(metaEnv.DEV);
const CNAME_TARGET = (metaEnv.VITE_CNAME_TARGET || `sub.${SUBDOMAIN_BASE}`).toString().replace(/^https?:\/\//, '').split('/')[0].toLowerCase();

interface AIEOWebsiteProps {
  theme: Theme;
  currentBrand?: Brand | null;
  siteId?: number;
  site?: SiteRow | null;
  onSiteUpdated?: () => void;
}

const AIEOWebsite: React.FC<AIEOWebsiteProps> = ({ theme, siteId: siteIdProp, site: siteProp, onSiteUpdated }) => {
  const { t } = useModuleI18n('site');
  const siteCtx = useOptionalSiteContext();
  const effectiveSiteId = siteIdProp ?? siteCtx?.siteId ?? null;
  const isSiteMode = effectiveSiteId != null;
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [domainMode, setDomainMode] = useState<DomainMode>('subdomain');
  const [subdomainSlug, setSubdomainSlug] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [siteTitle, setSiteTitle] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [slogan, setSlogan] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [icpNumber, setIcpNumber] = useState('');
  const [policeNumber, setPoliceNumber] = useState('');
  const [address, setAddress] = useState('');
  const [companyIntro, setCompanyIntro] = useState('');
  const [contactQrCodeUrl, setContactQrCodeUrl] = useState('');
  const [heroBackgroundUrl, setHeroBackgroundUrl] = useState('');
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [heroShowMask, setHeroShowMask] = useState(false);
  const [heroTextColor, setHeroTextColor] = useState<'white' | 'black'>('white');
  const [keywordInput, setKeywordInput] = useState('');
  const [templateId, setTemplateId] = useState('default');
  const [uploading, setUploading] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');
  const [saveErrMsg, setSaveErrMsg] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const effectiveDomain = useMemo(
    () => buildEffectiveDomain(domainMode, subdomainSlug, customDomain),
    [domainMode, subdomainSlug, customDomain],
  );

  const applySettingsRecord = useCallback((s: Record<string, unknown>) => {
    setSiteTitle((s.site_title as string) || '');
    setSiteDescription((s.site_description as string) || '');
    setSlogan((s.slogan as string) || '');
    setLogoUrl((s.logo_url as string) || '');
    setFaviconUrl((s.favicon_url as string) || '');
    setPhone((s.phone as string) || '');
    setIcpNumber((s.icp_number as string) || '');
    setPoliceNumber((s.police_number as string) || '');
    setAddress((s.address as string) || '');
    setCompanyIntro((s.company_intro as string) || '');
    setContactQrCodeUrl((s.contact_qr_code_url as string) || '');
    setHeroBackgroundUrl((s.hero_background_url as string) || '');
    setHeroImages((s.hero_images as string[]) || []);
    setHeroShowMask((s.hero_show_mask as boolean) ?? false);
    setHeroTextColor(((s.hero_text_color as string) === 'black' ? 'black' : 'white') as 'white' | 'black');
    setSelectedAgent((s.selected_agent as string) || '');
    if (Array.isArray(s.keywords)) setTags((s.keywords as string[]).slice(0, 20));
  }, []);

  const applySiteRow = useCallback(
    (row: SiteRow) => {
      const hostFields = parseHostToDomainFields(row.primary_host || '');
      setDomainMode(hostFields.domainMode);
      setSubdomainSlug(hostFields.subdomainSlug);
      setCustomDomain(hostFields.customDomain);
      setIsOpen(row.is_open !== false);
      setTemplateId(row.template_id || 'default');
      applySettingsRecord((row.site_settings || {}) as Record<string, unknown>);
    },
    [applySettingsRecord],
  );

  useEffect(() => {
    if (!isSiteMode) {
      getMySiteConfig()
        .then((config) => {
          if (!config) return;
          const hostFields = parseHostToDomainFields(config.domain || '');
          setDomainMode(hostFields.domainMode);
          setSubdomainSlug(hostFields.subdomainSlug);
          setCustomDomain(hostFields.customDomain);
          const s = (config.site_settings || {}) as Record<string, unknown>;
          applySettingsRecord(s);
          setIsOpen((s.is_open as boolean) !== false);
          setTemplateId((s.template_id as string) || 'default');
        })
        .catch(() => {});
      return;
    }

    const load = async () => {
      try {
        const row = siteProp?.id === effectiveSiteId ? siteProp : await sitesAPI.get(effectiveSiteId!);
        applySiteRow(row);
        const s = (row.site_settings || {}) as Record<string, unknown>;
        const sparse = Object.keys(s).length < 2 && !s.company_intro && !s.site_title;
        if (sparse && row.primary_host) {
          const legacy = await getMySiteConfig().catch(() => null);
          if (
            legacy?.site_settings &&
            (legacy.domain || '').toLowerCase() === (row.primary_host || '').toLowerCase()
          ) {
            applySettingsRecord(legacy.site_settings as Record<string, unknown>);
          }
        }
      } catch {
        /* ignore */
      }
    };
    void load();
  }, [isSiteMode, effectiveSiteId, siteProp?.id, siteProp?.updated_at, applySiteRow, applySettingsRecord]);

  const buildSiteSettingsPayload = (): Record<string, unknown> => ({
    site_title: siteTitle,
    site_description: siteDescription,
    slogan,
    keywords: tags,
    logo_url: logoUrl || undefined,
    favicon_url: faviconUrl || undefined,
    phone: phone || undefined,
    icp_number: icpNumber || undefined,
    police_number: policeNumber || undefined,
    address: address || undefined,
    company_intro: companyIntro || undefined,
    contact_qr_code_url: contactQrCodeUrl || undefined,
    hero_background_url: heroBackgroundUrl || undefined,
    hero_images: heroImages.length > 0 ? heroImages : undefined,
    hero_show_mask: heroShowMask,
    hero_text_color: heroTextColor,
    selected_agent: selectedAgent || undefined,
    template_id: templateId,
  });

  const handleSave = async () => {
    if (!effectiveDomain) {
      setSaveErrMsg(t('aieoWebsite.urlRequired'));
      setSaveStatus('err');
      return;
    }
    setSaveErrMsg('');
    setSaveStatus('saving');
    try {
      if (isSiteMode && effectiveSiteId != null) {
        await sitesAPI.update(effectiveSiteId, {
          is_open: isOpen,
          template_id: templateId,
          primary_host: effectiveDomain,
          site_settings: buildSiteSettingsPayload(),
        });
        onSiteUpdated?.();
      } else {
        const current = await getMySiteConfig().catch(() => null);
        const prev = (current?.site_settings || {}) as Record<string, unknown>;
        await updateMySiteConfig({
          domain: effectiveDomain,
          site_settings: {
            ...buildSiteSettingsPayload(),
            is_open: isOpen,
            company_sections: prev.company_sections,
            customers: prev.customers,
          },
        });
      }
      setSaveStatus('ok');
    } catch (e) {
      setSaveErrMsg(e instanceof Error ? e.message : t('aieoWebsite.saveFailed'));
      setSaveStatus('err');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(t('aieoWebsite.logoMax'));
      return;
    }
    setUploading('logo');
    try {
      const url = await uploadSiteAsset(file, 'logo');
      setLogoUrl(url);
    } catch (err) {
      alert((err as Error).message || t('aieoWebsite.uploadFailed'));
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) {
      alert(t('aieoWebsite.icoMax'));
      return;
    }
    setUploading('favicon');
    try {
      const url = await uploadSiteAsset(file, 'favicon');
      setFaviconUrl(url);
    } catch (err) {
      alert((err as Error).message || t('aieoWebsite.uploadFailed'));
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(t('aieoWebsite.bannerMax'));
      return;
    }
    if (heroImages.length >= 4) {
      alert(t('aieoWebsite.bannerLimit'));
      return;
    }
    setUploading('background');
    try {
      const url = await uploadSiteAsset(file, 'background');
      const updated = [...heroImages, url];
      setHeroImages(updated);
      if (!heroBackgroundUrl) setHeroBackgroundUrl(url);
    } catch (err) {
      alert((err as Error).message || t('aieoWebsite.uploadFailed'));
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(t('aieoWebsite.qrMax'));
      return;
    }
    setUploading('qr');
    try {
      // 复用站点资源上传接口，后端按图片资源处理
      const url = await uploadSiteAsset(file, 'background');
      setContactQrCodeUrl(url);
    } catch (err) {
      alert((err as Error).message || t('aieoWebsite.uploadFailed'));
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const handleAddKeyword = () => {
    const kw = keywordInput.trim();
    if (!kw) return;
    if (tags.length >= 20) return;
    if (tags.includes(kw)) return;
    setTags([...tags, kw]);
    setKeywordInput('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
  };

  const containerClasses = isSiteMode
    ? siteWorkbenchShell
    : `flex-1 flex flex-col h-full overflow-hidden transition-colors duration-500 ${isDark ? 'bg-[#1A1A1A] text-white' : 'bg-slate-50 text-slate-900'}`;

  const scrollClasses = isSiteMode
    ? siteWorkbenchScroll
    : 'flex-1 p-6 md:p-10 overflow-y-auto no-scrollbar';

  const titleClasses = isSiteMode ? siteWorkbenchTitle : 'text-xl font-medium';

  const primaryBtnClasses = isSiteMode
    ? sitePrimaryBtn
    : 'bg-blue-500 text-white px-10 py-3 rounded-xl font-bold text-sm hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50';

  const selectedOptionClasses = isSiteMode
    ? siteAccentSelected
    : 'bg-blue-500 text-white';

  const linkClasses = isSiteMode
    ? `${siteLinkAction} text-sm`
    : 'text-blue-600 font-bold text-sm hover:underline transition-all';

  const toggleOnClasses = isSiteMode ? 'bg-gradient-coral' : 'bg-blue-500';

  const addKeywordBtnClasses = isSiteMode
    ? `${sitePrimaryBtn} px-4 py-2 text-xs whitespace-nowrap`
    : 'bg-blue-500 text-white px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap hover:bg-blue-600 transition-all shadow-md active:scale-95 disabled:opacity-50';

  const inputClasses = isSiteMode
    ? 'w-full p-3 rounded-xl border outline-none transition-all font-medium text-sm bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
    : `w-full p-3 rounded-xl border outline-none transition-all font-medium text-sm ${isDark ? 'bg-[#262626] border-white/5 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'}`;

  return (
    <div className={containerClasses}>
      <div className={scrollClasses}>
        <div className={isSiteMode ? siteWorkbenchInner : 'max-w-[1400px] mx-auto space-y-10'}>
          <div className="flex items-center gap-4 flex-wrap">
            <h2 className={titleClasses}>{t('aieoWebsite.pageTitle')}</h2>
            {isSiteMode ? (
              <span className={siteBadge}>
                {t('aieoWebsite.perSiteHint', { id: effectiveSiteId })}
              </span>
            ) : (
              <span className={`text-xs px-3 py-1 rounded-full ${isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-50 text-amber-800'}`}>
                {t('aieoWebsite.legacyHint')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="space-y-10">
                <div className="space-y-4">
                    <label className="text-sm font-medium flex items-baseline gap-1">
                        <span className="text-red-500 font-semibold">*</span>
                        <span className="opacity-80">{t('aieoWebsite.uploadLogoHint')}</span>
                    </label>
                    <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                    />
                    <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploading === 'logo'}
                        className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors
                            ${isDark ? 'bg-[#262626] border-white/5 text-zinc-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}
                            disabled:opacity-50
                        `}
                    >
                        {uploading === 'logo' ? t('aieoWebsite.uploading') : t('aieoWebsite.uploadImage')}
                    </button>
                    <div className={`w-32 h-20 rounded-xl border flex items-center justify-center overflow-hidden ${isDark ? 'bg-black/20 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                        {logoUrl ? (
                            <img src={logoUrl} alt="logo" className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-xs opacity-60">{t('aieoWebsite.previewPlaceholder')}</span>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-sm font-medium flex items-baseline gap-1 opacity-80">{t('aieoWebsite.uploadIcoHint')}</label>
                    <input
                        ref={faviconInputRef}
                        type="file"
                        accept="image/*,.ico"
                        className="hidden"
                        onChange={handleFaviconUpload}
                    />
                    <button
                        type="button"
                        onClick={() => faviconInputRef.current?.click()}
                        disabled={uploading === 'favicon'}
                        className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors
                            ${isDark ? 'bg-[#262626] border-white/5 text-zinc-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}
                            disabled:opacity-50
                        `}
                    >
                        {uploading === 'favicon' ? t('aieoWebsite.uploading') : t('aieoWebsite.uploadImage')}
                    </button>
                    {faviconUrl && (
                        <div className={`w-16 h-16 rounded-xl border overflow-hidden flex items-center justify-center ${isDark ? 'bg-black/20 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                            <img src={faviconUrl} alt="favicon" className="w-full h-full object-contain" />
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <label className="text-sm font-medium flex items-baseline gap-1 opacity-80">{t('aieoWebsite.bannerLabel')}</label>
                    <input
                        ref={backgroundInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleBackgroundUpload}
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => backgroundInputRef.current?.click()}
                            disabled={uploading === 'background' || heroImages.length >= 4}
                            className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors
                                ${isDark ? 'bg-[#262626] border-white/5 text-zinc-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}
                                disabled:opacity-50
                            `}
                        >
                            {uploading === 'background'
                              ? t('aieoWebsite.uploading')
                              : t('aieoWebsite.bannerUpload', { count: heroImages.length })}
                        </button>
                        {heroImages.length > 0 && (
                            <button
                                type="button"
                                onClick={() => { setHeroImages([]); setHeroBackgroundUrl(''); }}
                                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${isDark ? 'border-white/5 text-zinc-400 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                {t('aieoWebsite.clearAll')}
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {heroImages.map((img, idx) => (
                            <div key={idx} className={`relative aspect-video rounded-xl border overflow-hidden ${isDark ? 'bg-black/20 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                                <img src={img} alt={`Banner ${idx + 1}`} className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const updated = heroImages.filter((_, i) => i !== idx);
                                        setHeroImages(updated);
                                        setHeroBackgroundUrl(updated[0] || '');
                                    }}
                                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-red-500 transition-colors"
                                >
                                    ×
                                </button>
                                <span className="absolute bottom-1 left-1 px-2 py-0.5 rounded bg-black/50 text-white text-xs">{idx + 1}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium opacity-80 block">{t('aieoWebsite.heroMask')}</label>
                        <button
                            type="button"
                            onClick={() => setHeroShowMask(!heroShowMask)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                                heroShowMask
                                  ? isSiteMode
                                    ? `${siteAccentBorderSelected} text-[#E8553F]`
                                    : isDark
                                      ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                      : 'bg-blue-50 border-blue-500 text-blue-600'
                                  : isDark
                                    ? 'border-white/20 text-zinc-400'
                                    : 'border-slate-200 text-slate-600'
                            }`}
                        >
                            {heroShowMask ? t('aieoWebsite.maskOn') : t('aieoWebsite.maskOff')}
                        </button>
                        <p className="text-xs opacity-60">{t('aieoWebsite.maskHint')}</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium opacity-80 block">{t('aieoWebsite.heroTextColor')}</label>
                        <select
                            value={heroTextColor}
                            onChange={e => setHeroTextColor(e.target.value as 'white' | 'black')}
                            className={inputClasses}
                        >
                            <option value="white">{t('aieoWebsite.textWhite')}</option>
                            <option value="black">{t('aieoWebsite.textBlack')}</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-medium flex items-baseline gap-1">
                        <span className="text-red-500 font-semibold">*</span>
                        <span className="opacity-80">{t('aieoWebsite.phone')}</span>
                    </label>
                    <input
                        type="text"
                        placeholder={t('aieoWebsite.phonePlaceholder')}
                        value={phone ?? ''}
                        onChange={e => setPhone(e.target.value)}
                        className={inputClasses}
                        maxLength={20}
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-medium flex items-baseline gap-1">
                        <span className="text-red-500 font-semibold">*</span>
                        <span className="opacity-80">{t('aieoWebsite.icp')}</span>
                    </label>
                    <input
                        type="text"
                        placeholder={t('aieoWebsite.icpPlaceholder')}
                        value={icpNumber ?? ''}
                        onChange={e => setIcpNumber(e.target.value)}
                        className={inputClasses}
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-medium flex items-baseline gap-1 opacity-80">{t('aieoWebsite.police')}</label>
                    <input
                        type="text"
                        placeholder={t('aieoWebsite.policePlaceholder')}
                        value={policeNumber ?? ''}
                        onChange={e => setPoliceNumber(e.target.value)}
                        className={inputClasses}
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-medium flex items-baseline gap-1">
                        <span className="text-red-500 font-semibold">*</span>
                        <span className="opacity-80">{t('aieoWebsite.address')}</span>
                    </label>
                    <input
                        type="text"
                        placeholder={t('aieoWebsite.addressPlaceholder')}
                        value={address ?? ''}
                        onChange={e => setAddress(e.target.value)}
                        className={inputClasses}
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-medium opacity-80">{t('aieoWebsite.intro')}</label>
                    <textarea
                        placeholder={t('aieoWebsite.introPlaceholder')}
                        value={companyIntro ?? ''}
                        onChange={e => setCompanyIntro(e.target.value)}
                        rows={4}
                        className={inputClasses}
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-medium opacity-80">{t('aieoWebsite.contactQr')}</label>
                    <input
                        ref={qrInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleQrUpload}
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => qrInputRef.current?.click()}
                            disabled={uploading === 'qr'}
                            className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors
                                ${isDark ? 'bg-[#262626] border-white/5 text-zinc-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}
                                disabled:opacity-50
                            `}
                        >
                            {uploading === 'qr' ? t('aieoWebsite.uploading') : t('aieoWebsite.qrUploadLocal')}
                        </button>
                        {contactQrCodeUrl && (
                            <button
                                type="button"
                                onClick={() => setContactQrCodeUrl('')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${isDark ? 'border-white/5 text-zinc-400 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                {t('aieoWebsite.clear')}
                            </button>
                        )}
                    </div>
                    <input
                        type="text"
                        placeholder={t('aieoWebsite.contactQrPlaceholder')}
                        value={contactQrCodeUrl ?? ''}
                        onChange={e => setContactQrCodeUrl(e.target.value)}
                        className={inputClasses}
                    />
                    {contactQrCodeUrl && (
                        <div className={`w-28 h-28 rounded-xl border overflow-hidden flex items-center justify-center ${isDark ? 'bg-black/20 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                            <img src={contactQrCodeUrl} alt={t('aieoWebsite.contactQrAlt')} className="w-full h-full object-contain" />
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium opacity-80">{t('aieoWebsite.agent')}</label>
                        <a href="#" onClick={e => { e.preventDefault(); /* 可后续跳转到智能体设置页 */ }} className={isSiteMode ? siteLinkAction : 'text-xs text-blue-600 font-bold hover:underline'}>{t('aieoWebsite.agentGoSettings')}</a>
                    </div>
                    <div className="relative">
                        <select value={selectedAgent ?? ''} onChange={(e) => setSelectedAgent(e.target.value)} className={`${inputClasses} appearance-none pr-10`}>
                            <option value="">{t('aieoWebsite.agentSelectPlaceholder')}</option>
                            <option value="官网接待">{t('aieoWebsite.agentReception')}</option>
                            <option value="技术支持">{t('aieoWebsite.agentSupport')}</option>
                            <option value="销售咨询">{t('aieoWebsite.agentSales')}</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-3.5 w-4 h-4 opacity-50 pointer-events-none" />
                    </div>
                </div>

                <div className="flex items-center gap-6 pt-6">
                    <button type="button" onClick={handleSave} disabled={saveStatus === 'saving'} className={primaryBtnClasses}>
                        {saveStatus === 'saving' ? t('aieoWebsite.saving') : t('aieoWebsite.save')}
                    </button>
                    {saveStatus === 'ok' && <span className="text-green-600 text-sm">{t('aieoWebsite.saved')}</span>}
                    {saveStatus === 'err' && <span className="text-red-500 text-sm">{saveErrMsg || t('aieoWebsite.saveFailed')}</span>}
                    <a href={effectiveDomain ? (isDevEnv ? `http://${effectiveDomain}:${typeof window !== 'undefined' ? window.location.port || '3000' : '3000'}` : `https://${effectiveDomain}`) : '#'} target="_blank" rel="noopener noreferrer" className={linkClasses}>
                        {t('aieoWebsite.previewSite')}
                    </a>
                </div>
            </div>

            <div className="space-y-10">
                <div className="space-y-4">
                    <label className="text-sm font-medium flex items-baseline gap-1">
                        <span className="text-red-500 font-semibold">*</span>
                        <span className="opacity-80">{t('aieoWebsite.accessUrl')}</span>
                    </label>
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setDomainMode('subdomain')}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                domainMode === 'subdomain'
                                  ? selectedOptionClasses
                                  : isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                        >
                            {t('aieoWebsite.subdomainMode')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setDomainMode('custom')}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                domainMode === 'custom'
                                  ? selectedOptionClasses
                                  : isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                        >
                            {t('aieoWebsite.customDomainMode')}
                        </button>
                    </div>

                    {domainMode === 'subdomain' ? (
                      <div className="space-y-3">
                        <p className="text-xs opacity-70">{t('aieoWebsite.subdomainHint')}</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder={t('aieoWebsite.subdomainPlaceholder')}
                            value={subdomainSlug ?? ''}
                            onChange={e => setSubdomainSlug(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())}
                            className={`${inputClasses} flex-1`}
                          />
                          <span className="text-sm opacity-60 whitespace-nowrap">.{SUBDOMAIN_BASE}</span>
                        </div>
                        {effectiveDomain && (
                          <div className={`flex items-center gap-2 p-3 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-slate-100'} flex-wrap`}>
                            <span className="text-sm font-medium">{t('aieoWebsite.accessUrlLabel')}</span>
                            <a href={isDevEnv ? `http://${effectiveDomain}:${typeof window !== 'undefined' ? window.location.port || '3000' : '3000'}` : `https://${effectiveDomain}`} target="_blank" rel="noopener noreferrer" className={`${isSiteMode ? siteLinkAction : 'text-blue-600 font-bold text-sm hover:underline'} truncate`}>
                              {isDevEnv ? `http://${effectiveDomain}:${typeof window !== 'undefined' ? window.location.port || '3000' : '3000'}` : `https://${effectiveDomain}`}
                            </a>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(isDevEnv ? `http://${effectiveDomain}:${typeof window !== 'undefined' ? window.location.port || '3000' : '3000'}` : `https://${effectiveDomain}`)}
                              className="shrink-0 p-1.5 rounded-lg hover:bg-white/10"
                              title={t('aieoWebsite.copy')}
                            >
                              <Copy className="w-4 h-4 opacity-60" />
                            </button>
                          </div>
                        )}
                        {isDevEnv && effectiveDomain && (
                          <p className="text-xs opacity-70">
                            {t('aieoWebsite.hostsHint', { domain: effectiveDomain })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs opacity-70">{t('aieoWebsite.customDomainHint')}</p>
                        <input
                          type="text"
                          placeholder={t('aieoWebsite.customDomainPlaceholder')}
                          value={customDomain ?? ''}
                          onChange={e => setCustomDomain(e.target.value)}
                          className={inputClasses}
                        />
                        <div className={`p-4 rounded-xl text-sm space-y-3 ${isDark ? 'bg-zinc-800/50 border border-white/5' : 'bg-slate-100 border border-slate-200'}`}>
                          <div className="font-bold">{t('aieoWebsite.cnameTitle')}</div>
                          <p className="opacity-80">{t('aieoWebsite.cnameHint')}</p>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs opacity-70">{t('aieoWebsite.cnameType')}</span>
                              <span className="font-mono text-xs">CNAME</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs opacity-70">{t('aieoWebsite.cnameHost')}</span>
                              <span className="font-mono text-xs">{t('aieoWebsite.cnameHostValue')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs opacity-70">{t('aieoWebsite.cnameValue')}</span>
                              <span className="font-mono text-xs">{CNAME_TARGET}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(CNAME_TARGET)}
                                className="p-1 rounded hover:bg-white/10"
                                title={t('aieoWebsite.copy')}
                              >
                                <Copy className="w-4 h-4 opacity-60 inline" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs opacity-60">{t('aieoWebsite.cnamePropagation')}</p>
                        </div>
                        {effectiveDomain && (
                          <div className={`flex items-center gap-2 p-3 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-slate-100'}`}>
                            <span className="text-sm font-medium">{t('aieoWebsite.willVisit')}</span>
                            <a href={`https://${effectiveDomain}`} target="_blank" rel="noopener noreferrer" className={isSiteMode ? siteLinkAction : 'text-blue-600 font-bold text-sm hover:underline'}>
                              https://{effectiveDomain}
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3 shrink-0 pt-2">
                        <span className="text-sm font-medium opacity-60">{t('aieoWebsite.isOpenLabel')}</span>
                        <div
                            onClick={() => setIsOpen(!isOpen)}
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 relative ${isOpen ? toggleOnClasses : 'bg-zinc-700'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${isOpen ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-medium flex items-baseline gap-1">
                        <span className="text-red-500 font-semibold">*</span>
                        <span className="opacity-80">{t('aieoWebsite.siteTitle')}</span>
                    </label>
                    <textarea 
                        className={`${inputClasses} min-h-[80px] py-4 leading-relaxed resize-none`}
                        placeholder={t('aieoWebsite.siteTitlePlaceholder')}
                        value={siteTitle ?? ''}
                        onChange={e => setSiteTitle(e.target.value)}
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-medium flex items-baseline gap-1">
                        <span className="text-red-500 font-semibold">*</span>
                        <span className="opacity-80">{t('aieoWebsite.siteDescription')}</span>
                    </label>
                    <textarea 
                        className={`${inputClasses} min-h-[120px] py-4 leading-relaxed resize-none`}
                        placeholder={t('aieoWebsite.siteDescriptionPlaceholder')}
                        value={siteDescription ?? ''}
                        onChange={e => setSiteDescription(e.target.value)}
                    />
                </div>

                <div className="space-y-6">
                    <label className="text-sm font-medium flex items-baseline gap-1">
                        <span className="text-red-500 font-semibold">*</span>
                        <span className="opacity-80">{t('aieoWebsite.siteKeywords')}</span>
                    </label>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            placeholder={t('aieoWebsite.keywordPlaceholder')}
                            value={keywordInput ?? ''}
                            onChange={e => setKeywordInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddKeyword(); } }}
                            className={`${inputClasses} flex-1`}
                        />
                        <button
                            type="button"
                            onClick={handleAddKeyword}
                            disabled={tags.length >= 20 || !keywordInput.trim()}
                            className={addKeywordBtnClasses}
                        >
                            {t('aieoWebsite.addKeywordManual')}
                        </button>
                    </div>

                    <div className={`p-6 rounded-[2rem] space-y-6 border transition-colors ${isDark ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div className="flex justify-between items-center">
                            <div className="text-xs font-bold opacity-60">{t('aieoWebsite.selectedKeywords', { count: tags.length })}</div>
                            <button type="button" className={isSiteMode ? siteLinkAction : 'text-xs text-blue-600 font-bold hover:underline'} onClick={() => setTags([])}>{t('aieoWebsite.clearKeywords')}</button>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {tags.map((tag, idx) => (
                                <div key={idx} className={`${isSiteMode ? siteTagChip : 'flex items-center gap-2 px-4 py-2 bg-blue-500/90 text-white rounded-lg text-xs font-semibold'} group transition-all ${isSiteMode ? '' : 'hover:bg-blue-500 hover:scale-105'}`}>
                                    {tag}
                                    <button onClick={() => setTags(tags.filter(t => t !== tag))} className="opacity-60 hover:opacity-100 transition-opacity">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIEOWebsite;
