import React, { useMemo, useState } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import { sitesAPI, type SiteCapabilities, type SiteRow } from '../api/sites';
import { buildCustomSiteSettings, getSiteComponents, siteHasTravelComponent } from '../lib/siteComponents';

const metaEnv = ((import.meta as any).env || {}) as Record<string, unknown>;
const SUBDOMAIN_BASE = (metaEnv.VITE_SUBDOMAIN_BASE || 'gaobobo.cn')
  .toString()
  .replace(/^https?:\/\//, '')
  .split('/')[0]
  .toLowerCase();

type DomainMode = 'subdomain' | 'custom';

interface Props {
  site: SiteRow;
  capabilities: SiteCapabilities;
  onSaved: () => void;
  onClose: () => void;
}

function parsePrimaryHost(primaryHost: string): { mode: DomainMode; subdomainSlug: string; customDomain: string } {
  const host = (primaryHost || '').trim().toLowerCase();
  const suffix = `.${SUBDOMAIN_BASE}`;
  if (host.endsWith(suffix) && host !== SUBDOMAIN_BASE) {
    return { mode: 'subdomain', subdomainSlug: host.slice(0, -suffix.length), customDomain: '' };
  }
  return { mode: 'custom', subdomainSlug: '', customDomain: host };
}

const SiteEditModal: React.FC<Props> = ({ site, capabilities, onSaved, onClose }) => {
  const initial = useMemo(() => parsePrimaryHost(site.primary_host), [site.primary_host]);
  const [displayName, setDisplayName] = useState(site.display_name);
  const [domainMode, setDomainMode] = useState<DomainMode>(initial.mode);
  const [subdomainSlug, setSubdomainSlug] = useState(initial.subdomainSlug);
  const [customDomain, setCustomDomain] = useState(initial.customDomain);
  const [travelComponent, setTravelComponent] = useState(() => siteHasTravelComponent(site));
  const [contactLegalComponent, setContactLegalComponent] = useState(
    () => getSiteComponents(site).contact_legal !== 'off',
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const effectiveHost = (() => {
    if (domainMode === 'subdomain') {
      const slug = subdomainSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      return slug ? `${slug}.${SUBDOMAIN_BASE}` : '';
    }
    return customDomain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0] || '';
  })();

  const handleSave = async () => {
    if (!displayName.trim()) {
      setErr('请填写站点名称');
      return;
    }
    if (!effectiveHost) {
      setErr('请填写有效域名');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const payload: Parameters<typeof sitesAPI.update>[1] = {
        display_name: displayName.trim(),
        primary_host: effectiveHost,
      };
      if (site.site_kind === 'custom') {
        payload.site_settings = buildCustomSiteSettings({
          news: true,
          travel: travelComponent,
          contact_legal: contactLegalComponent ? 'build' : 'off',
        });
      }
      await sitesAPI.update(site.id, payload);
      onSaved();
      onClose();
    } catch (e: unknown) {
      setErr((e as Error).message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">编辑站点</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">站点名称 *</label>
            <input
              className="w-full p-3 rounded-xl border border-slate-200"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">访问域名 *</label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setDomainMode('subdomain')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${domainMode === 'subdomain' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100'}`}
              >
                平台二级域
              </button>
              {capabilities.can_bind_custom_domain && (
                <button
                  type="button"
                  onClick={() => setDomainMode('custom')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${domainMode === 'custom' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100'}`}
                >
                  独立域名
                </button>
              )}
            </div>
            {domainMode === 'subdomain' ? (
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 p-3 rounded-xl border border-slate-200"
                  value={subdomainSlug}
                  onChange={(e) => setSubdomainSlug(e.target.value)}
                  placeholder="子域前缀"
                />
                <span className="text-sm text-slate-500">.{SUBDOMAIN_BASE}</span>
              </div>
            ) : (
              <input
                className="w-full p-3 rounded-xl border border-slate-200"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="www.example.com"
              />
            )}
            {effectiveHost && (
              <p className="text-xs text-slate-400 mt-1">完整域名：{effectiveHost}</p>
            )}
          </div>

          {site.site_kind === 'custom' && (
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <p className="text-sm font-medium text-slate-900">站点组件</p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={contactLegalComponent}
                  onChange={(e) => setContactLegalComponent(e.target.checked)}
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">基础信息组件</span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    工作台维护联系、备案与 SEO；改后前台需本地打包部署。
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer pt-1 border-t border-slate-100">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={travelComponent}
                  onChange={(e) => setTravelComponent(e.target.checked)}
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">旅游组件</span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    控制工作台是否显示民宿、体验、服务维护。
                  </span>
                </span>
              </label>
            </div>
          )}

          {err && <p className="text-sm text-red-600">{err}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium">
              取消
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-gradient-coral text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteEditModal;
