/**

 * 自定义站 — 基础信息（联系/备案 + SEO）

 */

import React, { useCallback, useEffect, useState } from 'react';

import { Loader2, Plus, X } from 'lucide-react';

import { Theme } from '../types';

import * as api from '../api/webMainSite';

import { useModuleI18n } from '../i18n/hooks';

import {

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



interface Props {

  theme: Theme;

}



type LegalFieldKey = 'phone' | 'contact_email' | 'address' | 'icp_number' | 'police_number';



const FIELD_KEYS: LegalFieldKey[] = [

  'phone',

  'contact_email',

  'address',

  'icp_number',

  'police_number',

];



const CustomSiteLegalSettings: React.FC<Props> = ({ theme: _theme }) => {

  void _theme;

  const { t } = useModuleI18n('site');

  const [loading, setLoading] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);

  const [fields, setFields] = useState<Record<LegalFieldKey, string>>({

    phone: '',

    contact_email: '',

    address: '',

    icp_number: '',

    police_number: '',

  });

  const [siteDescription, setSiteDescription] = useState('');

  const [llmsTxt, setLlmsTxt] = useState('');

  const [baiduPushToken, setBaiduPushToken] = useState('');

  const [keywords, setKeywords] = useState<string[]>([]);

  const [keywordInput, setKeywordInput] = useState('');



  const loadSettings = useCallback(() => {

    api.getWebMainSettings().then((data) => {

      setFields({

        phone: (data.phone as string) || '',

        contact_email: (data.contact_email as string) || '',

        address: (data.address as string) || '',

        icp_number: (data.icp_number as string) || '',

        police_number: (data.police_number as string) || '',

      });

      setSiteDescription((data.site_description as string) || '');

      setLlmsTxt((data.llms_txt as string) || '');

      setBaiduPushToken((data.baidu_push_token as string) || '');

      setKeywords(Array.isArray(data.keywords) ? data.keywords : []);

    }).catch(() => {});

  }, []);



  useEffect(() => {

    loadSettings();

  }, [loadSettings]);



  const addKeyword = () => {

    const kw = keywordInput.trim();

    if (!kw || keywords.length >= 20 || keywords.includes(kw)) return;

    setKeywords([...keywords, kw]);

    setKeywordInput('');

  };



  const handleSave = async () => {

    setLoading(true);

    setMsg(null);

    try {

      await api.updateWebMainSettings({

        phone: fields.phone.trim() || null,

        contact_email: fields.contact_email.trim() || null,

        address: fields.address.trim() || null,

        icp_number: fields.icp_number.trim() || null,

        police_number: fields.police_number.trim() || null,

        site_description: siteDescription.trim() || null,

        llms_txt: llmsTxt.trim() || null,

        baidu_push_token: baiduPushToken.trim() || null,

        keywords,

      });

      setMsg(t('customSiteLegal.saved'));

    } catch (err: unknown) {

      setMsg((err as Error).message || t('customSiteLegal.saveFailed'));

    } finally {

      setLoading(false);

    }

  };



  return (

    <div className={siteWorkbenchShell}>

      <div className={siteWorkbenchScroll}>

        <div className={siteWorkbenchInner}>

          <div className="space-y-3">

            <h2 className={siteWorkbenchTitle}>{t('customSiteLegal.pageTitle')}</h2>

            <p className={siteWorkbenchSubtitle}>{t('customSiteLegal.subtitle')}</p>

          </div>



          {msg && (

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">{msg}</div>

          )}



          <div className={`${siteFormCard} space-y-4`}>

            <h3 className="text-sm font-semibold text-slate-800">{t('customSiteLegal.contactSection')}</h3>

            {FIELD_KEYS.map((key) => (

              <div key={key}>

                <label className="mb-1.5 block text-sm font-medium text-slate-700">

                  {t(`customSiteLegal.fields.${key}`)}

                </label>

                {key === 'address' ? (

                  <textarea

                    className={`${siteInputCls} min-h-[80px] resize-y`}

                    value={fields[key]}

                    onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}

                    placeholder={t(`customSiteLegal.placeholders.${key}`)}

                  />

                ) : (

                  <input

                    className={siteInputCls}

                    value={fields[key]}

                    onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}

                    placeholder={t(`customSiteLegal.placeholders.${key}`)}

                  />

                )}

              </div>

            ))}

          </div>



          <div className={`${siteFormCard} space-y-4`}>

            <h3 className="text-sm font-semibold text-slate-800">{t('customSiteLegal.seoSection')}</h3>



            <div>

              <label className="mb-1.5 block text-sm font-medium text-slate-700">

                {t('customSiteLegal.fields.site_description')}

              </label>

              <p className="mb-1.5 text-xs text-slate-500">{t('customSiteLegal.hints.site_description')}</p>

              <textarea

                className={`${siteInputCls} min-h-[72px] resize-y`}

                value={siteDescription}

                onChange={(e) => setSiteDescription(e.target.value)}

              />

            </div>



            <div>

              <label className="mb-1.5 block text-sm font-medium text-slate-700">

                {t('customSiteLegal.fields.baidu_push_token')}

              </label>

              <p className="mb-1.5 text-xs text-slate-500">{t('customSiteLegal.hints.baidu_push_token')}</p>

              <input

                className={siteInputCls}

                value={baiduPushToken}

                onChange={(e) => setBaiduPushToken(e.target.value)}

                placeholder={t('customSiteLegal.placeholders.baidu_push_token')}

              />

            </div>



            <div>

              <label className="mb-1.5 block text-sm font-medium text-slate-700">

                {t('customSiteLegal.fields.llms_txt')}

              </label>

              <p className="mb-1.5 text-xs text-slate-500">{t('customSiteLegal.hints.llms_txt')}</p>

              <textarea

                className={`${siteInputCls} min-h-[160px] resize-y font-mono text-xs`}

                value={llmsTxt}

                onChange={(e) => setLlmsTxt(e.target.value)}

                placeholder={t('customSiteLegal.placeholders.llms_txt')}

              />

            </div>



            <div>

              <label className="mb-1.5 block text-sm font-medium text-slate-700">

                {t('customSiteLegal.fields.keywords')}

              </label>

              <p className="mb-2 text-xs text-slate-500">{t('customSiteLegal.hints.keywords')}</p>

              <div className="flex gap-2">

                <input

                  className={siteInputCls}

                  value={keywordInput}

                  onChange={(e) => setKeywordInput(e.target.value)}

                  onKeyDown={(e) => {

                    if (e.key === 'Enter') {

                      e.preventDefault();

                      addKeyword();

                    }

                  }}

                  placeholder={t('customSiteLegal.placeholders.keywords')}

                />

                <button

                  type="button"

                  disabled={keywords.length >= 20 || !keywordInput.trim()}

                  onClick={addKeyword}

                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"

                >

                  <Plus className="h-4 w-4" />

                </button>

              </div>

              {keywords.length > 0 && (

                <div className="mt-2 flex flex-wrap gap-2">

                  {keywords.map((kw) => (

                    <span key={kw} className={siteTagChip}>

                      {kw}

                      <button

                        type="button"

                        className="ml-1 text-slate-500 hover:text-slate-800"

                        onClick={() => setKeywords(keywords.filter((k) => k !== kw))}

                        aria-label="remove"

                      >

                        <X className="h-3 w-3" />

                      </button>

                    </span>

                  ))}

                </div>

              )}

            </div>

          </div>



          <button

            type="button"

            disabled={loading}

            onClick={() => void handleSave()}

            className={`${sitePrimaryBtn} inline-flex items-center gap-2`}

          >

            {loading && <Loader2 className="w-4 h-4 animate-spin" />}

            {t('customSiteLegal.save')}

          </button>

        </div>

      </div>

    </div>

  );

};



export default CustomSiteLegalSettings;

