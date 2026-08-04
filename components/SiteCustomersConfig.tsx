import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Theme } from '../types';
import { sitesAPI } from '../api/sites';
import { useSiteContext } from '../context/SiteContext';
import { uploadSiteAsset } from '../lib/siteAssetUpload';
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

export interface CustomerRow {
  name: string;
  logo_url: string;
}

const emptyCustomer = (): CustomerRow => ({ name: '', logo_url: '' });

interface Props {
  theme: Theme;
  onSiteUpdated?: () => void;
}

const SiteCustomersConfig: React.FC<Props> = ({ theme: _theme, onSiteUpdated }) => {
  const { t } = useModuleI18n('site');
  void _theme;
  const { siteId, site } = useSiteContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  const inputClass = siteInputCls;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const row = site?.id === siteId ? site : await sitesAPI.get(siteId);
      const raw = row.site_settings?.customers;
      if (Array.isArray(raw) && raw.length > 0) {
        setCustomers(
          raw.map((c) => ({
            name: (c as CustomerRow).name || '',
            logo_url: (c as CustomerRow).logo_url || '',
          })),
        );
      } else {
        setCustomers([]);
      }
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [siteId, site?.id, site?.updated_at]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleLogoUpload = async (idx: number, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert(t('siteCustomers.logoMax'));
      return;
    }
    setUploading(`customer-${idx}`);
    try {
      const url = await uploadSiteAsset(file, 'customer_logo');
      setCustomers((prev) => {
        const arr = [...prev];
        if (arr[idx]) arr[idx] = { ...arr[idx], logo_url: url };
        return arr;
      });
    } catch (err) {
      alert((err as Error).message || t('siteCustomers.uploadFailed'));
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const payload = customers.filter((c) => c.name.trim() || c.logo_url.trim());
      await sitesAPI.update(siteId, {
        site_settings: {
          customers: payload.length > 0 ? payload : [],
        },
      });
      setOk(true);
      onSiteUpdated?.();
    } catch (err) {
      setError((err as Error).message || t('siteCustomers.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={siteWorkbenchShell}>
        <div className={`${siteWorkbenchScroll} flex items-center justify-center`}>
          <p className="text-slate-500">{t('siteCustomers.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={siteWorkbenchShell}>
      <div className={siteWorkbenchScroll}>
        <div className={siteWorkbenchInner}>
          <div className="space-y-3">
            <h2 className={siteWorkbenchTitle}>{t('siteCustomers.pageTitle')}</h2>
            <p className={siteWorkbenchSubtitle}>{t('siteCustomers.subtitle')}</p>
          </div>
          <form onSubmit={handleSave} className={siteFormCard}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t('siteCustomers.brandList')}</span>
              <button
                type="button"
                onClick={() => setCustomers([...customers, emptyCustomer()])}
                className={siteLinkAction}
              >
                <Plus className="w-4 h-4" /> {t('siteCustomers.addBrand')}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {customers.map((cust, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold opacity-60">{t('siteCustomers.brandIndex', { index: idx + 1 })}</span>
                    <button
                      type="button"
                      onClick={() => setCustomers(customers.filter((_, i) => i !== idx))}
                      className="text-xs text-red-500 hover:underline"
                    >
                      {t('siteCustomers.delete')}
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder={t('siteCustomers.namePlaceholder')}
                    value={cust.name}
                    onChange={(e) => {
                      const arr = [...customers];
                      arr[idx] = { ...arr[idx], name: e.target.value };
                      setCustomers(arr);
                    }}
                    className={inputClass}
                  />
                  <div className="space-y-2">
                    <span className="text-xs opacity-80">{t('siteCustomers.logoHint')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id={`customer-logo-${idx}`}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleLogoUpload(idx, f);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById(`customer-logo-${idx}`)?.click()}
                      disabled={uploading === `customer-${idx}`}
                      className="px-4 py-2 rounded-lg text-xs font-bold border disabled:opacity-50"
                    >
                      {uploading === `customer-${idx}` ? t('siteCustomers.uploading') : t('siteCustomers.uploadLogo')}
                    </button>
                    <div className="w-full aspect-[3/2] max-h-24 rounded-xl border flex items-center justify-center overflow-hidden bg-slate-100 border-slate-200">
                      {cust.logo_url ? (
                        <img src={cust.logo_url} alt="" className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="text-xs opacity-60">{t('siteCustomers.previewPlaceholder')}</span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder={t('siteCustomers.urlPlaceholder')}
                      value={cust.logo_url}
                      onChange={(e) => {
                        const arr = [...customers];
                        arr[idx] = { ...arr[idx], logo_url: e.target.value };
                        setCustomers(arr);
                      }}
                      className={inputClass}
                    />
                  </div>
                </div>
              ))}
            </div>
            {customers.length === 0 && (
              <p className="text-xs opacity-50">{t('siteCustomers.empty')}</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            {ok && <p className="text-sm text-green-600">{t('siteCustomers.saved')}</p>}
            <button type="submit" disabled={saving} className={sitePrimaryBtn}>
              {saving ? t('siteCustomers.saving') : t('siteCustomers.save')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SiteCustomersConfig;
