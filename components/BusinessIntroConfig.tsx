import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Theme } from '../types';
import {
  getMyBusinessIntro,
  updateMyBusinessIntro,
  type MerchantBusinessIntroCreateBody,
} from '../api/merchants';
import { sitesAPI } from '../api/sites';
import { useOptionalSiteContext } from '../context/SiteContext';
import { uploadSiteAsset } from '../lib/siteAssetUpload';
import { useModuleI18n } from '../i18n/hooks';
import { ensureNamespaces } from '../i18n/loader';
import { I18nNamespace } from '../i18n/types';
import {
  siteFormCard,
  siteInputCls,
  siteLinkAction,
  sitePrimaryBtn,
  siteWorkbenchInner,
  siteWorkbenchScroll,
  siteWorkbenchShell,
  siteWorkbenchSubtitle,
  siteWorkbenchTitle,
} from '../lib/siteWorkbenchUi';

interface StepRow {
  id: string;
  title: string;
  description: string;
  detailTitle?: string;
  detailDescription?: string;
  backgroundImage?: string;
  buttonText?: string;
  buttonUrl?: string;
}

const defaultStep = (): StepRow => ({
  id: `step-${Date.now()}`,
  title: '',
  description: '',
  detailTitle: '',
  detailDescription: '',
  backgroundImage: '',
  buttonText: '',
  buttonUrl: '',
});

const mapStepsFromRecords = (raw: Array<Record<string, unknown>>): StepRow[] =>
  raw.map((s, i) => ({
    id: (s.id as string) || `step-${i}`,
    title: (s.title as string) || '',
    description: (s.description as string) || '',
    detailTitle: (s.detailTitle as string) || '',
    detailDescription: (s.detailDescription as string) || '',
    backgroundImage: (s.backgroundImage as string) || '',
    buttonText: (s.buttonText as string) || '',
    buttonUrl: (s.buttonUrl as string) || '',
  }));

const BusinessIntroConfig: React.FC<{ theme: Theme }> = ({ theme: _theme }) => {
  const { t, i18n } = useModuleI18n('merchant');
  const [i18nReady, setI18nReady] = useState(() =>
    i18n.hasResourceBundle(i18n.language, I18nNamespace.Merchant),
  );
  void _theme;
  const siteCtx = useOptionalSiteContext();
  const siteId = siteCtx?.siteId ?? null;
  const isSiteMode = siteId != null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockTitle, setBlockTitle] = useState('我们的服务');
  const [steps, setSteps] = useState<StepRow[]>([defaultStep()]);

  useEffect(() => {
    if (i18nReady) return;
    let cancelled = false;
    void ensureNamespaces([I18nNamespace.Merchant]).then(() => {
      if (!cancelled) setI18nReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [i18nReady, i18n.language]);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSiteMode && siteId != null) {
        const row = siteCtx?.site?.id === siteId ? siteCtx.site : await sitesAPI.get(siteId);
        const fromSite = sitesAPI.getBusinessIntroFromSite(row);
        if (fromSite) {
          setBlockTitle(fromSite.title);
          setSteps(fromSite.steps.length ? mapStepsFromRecords(fromSite.steps) : [defaultStep()]);
          return;
        }
        const legacy = await getMyBusinessIntro().catch(() => null);
        if (legacy?.steps?.length) {
          setBlockTitle(legacy.title || '我们的服务');
          setSteps(mapStepsFromRecords(legacy.steps as Array<Record<string, unknown>>));
        }
        return;
      }
      const config = await getMyBusinessIntro();
      if (config?.title) setBlockTitle(config.title);
      if (config?.steps?.length) {
        setSteps(mapStepsFromRecords(config.steps as Array<Record<string, unknown>>));
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [isSiteMode, siteId, siteCtx?.site?.id, siteCtx?.site?.updated_at]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const addStep = () => setSteps((prev) => [...prev, defaultStep()]);
  const removeStep = (index: number) => setSteps((prev) => prev.filter((_, i) => i !== index));
  const updateStep = (index: number, field: keyof StepRow, value: string) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const handleUploadStepImage = async (index: number, file: File) => {
    try {
      const url = await uploadSiteAsset(file, 'background');
      updateStep(index, 'backgroundImage', url);
    } catch {
      alert(t('businessIntro.errors.uploadFailed'));
    }
  };

  const buildStepsPayload = () =>
    steps
      .filter((s) => s.title.trim() || s.description.trim() || (s.detailDescription || '').trim())
      .map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        detailTitle: s.detailTitle || undefined,
        detailDescription: s.detailDescription || undefined,
        backgroundImage: s.backgroundImage || undefined,
        buttonText: s.buttonText || undefined,
        buttonUrl: s.buttonUrl || undefined,
      }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: blockTitle,
        steps: buildStepsPayload(),
      };
      if (isSiteMode && siteId != null) {
        await sitesAPI.update(siteId, {
          site_settings: { business_intro: payload },
        });
      } else {
        const body: MerchantBusinessIntroCreateBody = payload;
        await updateMyBusinessIntro(body);
      }
    } catch (e: unknown) {
      setError((e as Error)?.message || t('businessIntro.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const inputClass = siteInputCls;

  if (!i18nReady || loading) {
    return (
      <div className={siteWorkbenchShell}>
        <div className={`${siteWorkbenchScroll} flex items-center justify-center`}>
          <p className="text-slate-500">{t('businessIntro.loading', { defaultValue: '加载中...' })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={siteWorkbenchShell}>
      <div className={siteWorkbenchScroll}>
        <div className={siteWorkbenchInner}>
          <div className="space-y-3">
            <h2 className={siteWorkbenchTitle}>{t('businessIntro.pageTitle')}</h2>
            <p className={siteWorkbenchSubtitle}>
              {isSiteMode ? t('businessIntro.subtitleSite') : t('businessIntro.subtitleLegacy')}
            </p>
          </div>
          <form onSubmit={handleSubmit} className={siteFormCard}>
            <div>
              <label className="block text-sm font-medium mb-2">{t('businessIntro.form.blockTitle')}</label>
              <input
                type="text"
                value={blockTitle}
                onChange={(e) => setBlockTitle(e.target.value)}
                className={inputClass}
                placeholder={t('businessIntro.form.blockTitlePlaceholder')}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">{t('businessIntro.stepsList')}</label>
                <button type="button" onClick={addStep} className={siteLinkAction}>
                  <Plus className="w-4 h-4" /> {t('businessIntro.addStep')}
                </button>
              </div>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={step.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/80">
                    <div className="flex justify-end mb-2">
                      <button type="button" onClick={() => removeStep(index)} className="text-slate-400 hover:text-red-500 p-1" title={t('businessIntro.actions.removeStep')}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => updateStep(index, 'title', e.target.value)}
                      className={`${inputClass} mb-2`}
                      placeholder={t('businessIntro.form.stepTitle')}
                    />
                    <input
                      type="text"
                      value={step.description}
                      onChange={(e) => updateStep(index, 'description', e.target.value)}
                      className={`${inputClass} mb-2`}
                      placeholder={t('businessIntro.form.stepDescription')}
                    />
                    <textarea
                      value={step.detailDescription || ''}
                      onChange={(e) => updateStep(index, 'detailDescription', e.target.value)}
                      className={`${inputClass} mb-2 min-h-[80px] resize-y`}
                      placeholder={t('businessIntro.form.stepDetail')}
                      rows={3}
                    />
                    <input
                      type="text"
                      value={step.backgroundImage || ''}
                      onChange={(e) => updateStep(index, 'backgroundImage', e.target.value)}
                      className={`${inputClass} mb-2 text-sm`}
                      placeholder={t('businessIntro.form.backgroundUrl')}
                    />
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id={`step-img-${index}`}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleUploadStepImage(index, f);
                          e.target.value = '';
                        }}
                      />
                      <label htmlFor={`step-img-${index}`} className={`${siteLinkAction} cursor-pointer`}>
                        {t('businessIntro.uploadBackground')}
                      </label>
                    </div>
                    <input
                      type="text"
                      value={step.buttonText || ''}
                      onChange={(e) => updateStep(index, 'buttonText', e.target.value)}
                      className={`${inputClass} mb-2`}
                      placeholder={t('businessIntro.form.buttonText')}
                    />
                    <input
                      type="text"
                      value={step.buttonUrl || ''}
                      onChange={(e) => updateStep(index, 'buttonUrl', e.target.value)}
                      className={inputClass}
                      placeholder={t('businessIntro.form.buttonLink')}
                    />
                  </div>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={saving} className={sitePrimaryBtn}>
              {saving ? t('businessIntro.actions.saving') : t('businessIntro.actions.save')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BusinessIntroConfig;
