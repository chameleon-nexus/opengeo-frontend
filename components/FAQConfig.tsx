import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Theme } from '../types';
import { getMyFaq, updateMyFaq, type MerchantFaqCreateBody } from '../api/merchants';
import * as webMain from '../api/webMainSite';
import { useModuleI18n } from '../i18n/hooks';
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

interface FAQConfigProps {
  theme: Theme;
  /** 子站 FAQ（默认）；`web_main` 为营销主站根域 FAQ */
  siteScope?: 'aieo' | 'web_main';
}

const FAQConfig: React.FC<FAQConfigProps> = ({ theme: _theme, siteScope = 'aieo' }) => {
  const { t } = useModuleI18n('site');
  const isWebMain = siteScope === 'web_main';
  void _theme;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<Array<{ question: string; answer: string }>>([{ question: '', answer: '' }]);

  useEffect(() => {
    setLoading(true);
    const defaultTitle = t('faqConfig.defaultTitle');
    const load = isWebMain
      ? webMain.getWebMainFaq().then(config => {
          if (config) {
            setTitle(config.title || defaultTitle);
            setDescription(config.description || '');
            setItems(
              config.items?.length
                ? config.items.map(i => ({ question: i.question || '', answer: i.answer || '' }))
                : [{ question: '', answer: '' }]
            );
          }
        })
      : getMyFaq().then(config => {
          if (config) {
            setTitle(config.title || defaultTitle);
            setDescription(config.description || '');
            setItems(
              config.items?.length
                ? config.items.map(i => ({ question: i.question || '', answer: i.answer || '' }))
                : [{ question: '', answer: '' }]
            );
          }
        });
    load.catch(() => {}).finally(() => setLoading(false));
  }, [isWebMain, t]);

  const addItem = () => setItems(prev => [...prev, { question: '', answer: '' }]);
  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));
  const updateItem = (index: number, field: 'question' | 'answer', value: string) => {
    setItems(prev => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: MerchantFaqCreateBody = {
        title,
        description: description || undefined,
        items: items.filter(it => it.question.trim() || it.answer.trim()),
      };
      if (isWebMain) {
        await webMain.updateWebMainFaq({
          title: body.title,
          description: body.description,
          items: body.items || [],
          sort_order: 0,
        });
      } else {
        await updateMyFaq(body);
      }
    } catch (e: unknown) {
      setError((e as Error)?.message || t('faqConfig.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const inputClass = siteInputCls;

  if (loading) {
    return (
      <div className={siteWorkbenchShell}>
        <div className={`${siteWorkbenchScroll} flex items-center justify-center`}>
          <p className="text-slate-500">{t('faqConfig.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={siteWorkbenchShell}>
      <div className={siteWorkbenchScroll}>
        <div className={siteWorkbenchInner}>
          <div className="space-y-3">
            <h2 className={siteWorkbenchTitle}>{t('faqConfig.pageTitle')}</h2>
            <p className={siteWorkbenchSubtitle}>
              {isWebMain ? t('faqConfig.subtitleWebMain') : t('faqConfig.subtitleSubsite')}
            </p>
          </div>
          <form onSubmit={handleSubmit} className={siteFormCard}>
            <div>
              <label className="block text-sm font-medium mb-2">{t('faqConfig.blockTitle')}</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className={inputClass}
                placeholder={t('faqConfig.blockTitlePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t('faqConfig.description')}</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className={inputClass}
                placeholder={t('faqConfig.descriptionPlaceholder')}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">{t('faqConfig.qaList')}</label>
                <button type="button" onClick={addItem} className={siteLinkAction}>
                  <Plus className="w-4 h-4" /> {t('faqConfig.add')}
                </button>
              </div>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="p-4 rounded-xl border border-slate-200 bg-slate-50/80">
                    <div className="flex justify-end mb-2">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title={t('faqConfig.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={item.question}
                      onChange={e => updateItem(index, 'question', e.target.value)}
                      className={`${inputClass} mb-2`}
                      placeholder={t('faqConfig.questionPlaceholder')}
                    />
                    <textarea
                      value={item.answer}
                      onChange={e => updateItem(index, 'answer', e.target.value)}
                      rows={3}
                      className={`${inputClass} resize-none`}
                      placeholder={t('faqConfig.answerPlaceholder')}
                    />
                  </div>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={saving} className={sitePrimaryBtn}>
              {saving ? t('faqConfig.saving') : t('faqConfig.save')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FAQConfig;
