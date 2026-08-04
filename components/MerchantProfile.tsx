import React, { useState, useEffect } from 'react';
import { Theme } from '../types';
import { getMyMerchant, updateMyMerchant, type MerchantProfile as MerchantProfileType, type MerchantUpdateBody } from '../api/merchants';
import { useModuleI18n } from '../i18n/hooks';

interface MerchantProfileProps {
  theme: Theme;
}

const LEGAL_KEYS = ['联系地址', '法人'] as const;
type LegalKey = (typeof LEGAL_KEYS)[number];

function parseLegalInfo(raw: string | null): Record<LegalKey, string> {
  const out: Record<string, string> = { 联系地址: '', 法人: '' };
  if (!raw?.trim()) return out as Record<LegalKey, string>;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    LEGAL_KEYS.forEach(k => { out[k] = (parsed[k] != null ? String(parsed[k]) : '').trim(); });
  } catch {
    out['联系地址'] = raw.trim();
  }
  return out as Record<LegalKey, string>;
}

function stringifyLegalInfo(fields: Record<LegalKey, string>): string {
  const obj: Record<string, string> = {};
  LEGAL_KEYS.forEach(k => { if (fields[k]?.trim()) obj[k] = fields[k].trim(); });
  return Object.keys(obj).length ? JSON.stringify(obj) : '';
}

const MerchantProfile: React.FC<MerchantProfileProps> = ({ theme }) => {
  const { t } = useModuleI18n('merchant');
  const [profile, setProfile] = useState<MerchantProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [legalFields, setLegalFields] = useState<Record<LegalKey, string>>({
    联系地址: '',
    法人: '',
  });

  const isDark = theme === 'dark';

  useEffect(() => {
    getMyMerchant()
      .then(p => {
        setProfile(p);
        setCompanyName(p.company_name || '');
        setContactEmail(p.contact_email || '');
        setLegalFields(parseLegalInfo(p.legal_info || ''));
      })
      .catch(e => setError(e?.message || t('merchantProfile.errors.loadFailed')))
      .finally(() => setLoading(false));
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: MerchantUpdateBody = {
        company_name: companyName,
        contact_email: contactEmail || null,
        legal_info: stringifyLegalInfo(legalFields) || null,
      };
      const updated = await updateMyMerchant(body);
      setProfile(updated);
    } catch (e: unknown) {
      setError((e as Error)?.message || t('merchantProfile.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-slate-500">{t('merchantProfile.loading')}</div>;
  if (error && !profile) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden ${isDark ? 'bg-[#1A1A1A] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-medium mb-2">{t('merchantProfile.pageTitle')}</h2>
          <p className="text-sm opacity-80 mb-6">
            {t('merchantProfile.agreementHint')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">{t('merchantProfile.form.companyName')}</label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                required
                className={`w-full px-4 py-3 rounded-xl border outline-none focus:border-blue-500 ${isDark ? 'bg-[#262626] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                placeholder={t('merchantProfile.form.companyNamePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t('merchantProfile.form.contactEmail')}</label>
              <input
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border outline-none focus:border-blue-500 ${isDark ? 'bg-[#262626] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                placeholder={t('merchantProfile.form.contactEmailPlaceholder')}
              />
            </div>
            <div className="space-y-4">
              <p className="block text-sm font-medium">{t('merchantProfile.legalInfo')}</p>
              <p className="text-xs opacity-70">{t('merchantProfile.legalInfoHint')}</p>
              <div>
                <label className="block text-sm opacity-80 mb-1">{t('merchantProfile.form.address')}</label>
                <input
                  type="text"
                  value={legalFields['联系地址']}
                  onChange={e => setLegalFields(prev => ({ ...prev, '联系地址': e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl border outline-none focus:border-blue-500 ${isDark ? 'bg-[#262626] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                  placeholder={t('merchantProfile.form.addressPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm opacity-80 mb-1">{t('merchantProfile.legalRepresentativeLabel')}</label>
                <input
                  type="text"
                  value={legalFields['法人']}
                  onChange={e => setLegalFields(prev => ({ ...prev, '法人': e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl border outline-none focus:border-blue-500 ${isDark ? 'bg-[#262626] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                  placeholder={t('merchantProfile.form.legalRepresentativePlaceholder')}
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl font-bold bg-gradient-coral text-white shadow-coral hover:opacity-95 disabled:opacity-50 transition-colors"
            >
              {saving ? t('merchantProfile.actions.saving') : t('merchantProfile.actions.save')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MerchantProfile;
