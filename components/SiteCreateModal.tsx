import React, { useEffect, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Theme, UserRole } from '../types';
import { sitesAPI, type SiteCapabilities, type SiteCreatePayload, type SiteKind, type SiteRow, type SiteTemplateOption } from '../api/sites';
import { buildCustomSiteSettings } from '../lib/siteComponents';
import { listMerchants } from '../api/merchants';

const metaEnv = ((import.meta as any).env || {}) as Record<string, unknown>;
const SUBDOMAIN_BASE = (metaEnv.VITE_SUBDOMAIN_BASE || 'gaobobo.cn')
  .toString()
  .replace(/^https?:\/\//, '')
  .split('/')[0]
  .toLowerCase();

interface Props {
  theme: Theme;
  userRole: UserRole | null;
  capabilities: SiteCapabilities;
  onCreated: (site: SiteRow) => void;
  onClose: () => void;
}

type DomainMode = 'subdomain' | 'custom';

const SiteCreateModal: React.FC<Props> = ({ theme: _theme, userRole: _userRole, capabilities, onCreated, onClose }) => {
  void _userRole;
  void _theme;
  const [step, setStep] = useState<1 | 2>(1);
  const [siteKind, setSiteKind] = useState<SiteKind>('template');
  const [displayName, setDisplayName] = useState('');
  const [templateId, setTemplateId] = useState('default');
  const [templates, setTemplates] = useState<SiteTemplateOption[]>([]);
  const [domainMode, setDomainMode] = useState<DomainMode>('subdomain');
  const [subdomainSlug, setSubdomainSlug] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [merchantId, setMerchantId] = useState<number | ''>('');
  const [merchants, setMerchants] = useState<Array<{ id: number; name: string }>>([]);
  const [travelComponent, setTravelComponent] = useState(false);
  const [contactLegalComponent, setContactLegalComponent] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const allowedKinds = capabilities.allowed_site_kinds ?? [];
  const canAssignMerchant = !!capabilities.can_assign_to_other_merchant;

  useEffect(() => {
    if (allowedKinds.length > 0 && !allowedKinds.includes(siteKind)) {
      setSiteKind(allowedKinds[0]);
    }
  }, [allowedKinds, siteKind]);

  useEffect(() => {
    if (canAssignMerchant) {
      listMerchants().then((list) => {
        setMerchants(Array.isArray(list) ? list.map((m: { id: number; name: string }) => ({ id: m.id, name: m.name })) : []);
      }).catch(() => setMerchants([]));
    }
  }, [canAssignMerchant]);

  useEffect(() => {
    if (siteKind === 'template') {
      setTravelComponent(false);
      sitesAPI.listTemplates().then(setTemplates).catch(() => setTemplates([]));
    }
  }, [siteKind]);

  const effectiveHost = (() => {
    if (domainMode === 'subdomain') {
      const slug = subdomainSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      return slug ? `${slug}.${SUBDOMAIN_BASE}` : '';
    }
    return customDomain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0] || '';
  })();

  const handleCreate = async () => {
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
      const body: SiteCreatePayload = {
        site_kind: siteKind,
        display_name: displayName.trim(),
        hosts: [{ host: effectiveHost, is_primary: true }],
      };
      if (siteKind === 'template') {
        body.template_id = templateId;
      }
      if (canAssignMerchant && merchantId) {
        body.merchant_id = Number(merchantId);
      }
      if (siteKind === 'custom') {
        body.site_settings = buildCustomSiteSettings({
          news: true,
          travel: travelComponent,
          contact_legal: contactLegalComponent ? 'build' : 'off',
        });
      }
      const site = await sitesAPI.create(body);
      onCreated(site);
      onClose();
    } catch (e: unknown) {
      setErr((e as Error).message || '创建失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">新建站点</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {step === 1 && (
            <>
              <p className="text-sm text-slate-500">选择站点类型</p>
              <div className="grid gap-2">
                {allowedKinds.includes('template') && (
                  <button
                    type="button"
                    onClick={() => setSiteKind('template')}
                    className={`p-4 rounded-xl border text-left ${siteKind === 'template' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
                  >
                    <p className="font-semibold text-slate-900">模板站</p>
                    <p className="text-xs text-slate-500 mt-1">选模板即可上线，适合商户自助建站</p>
                  </button>
                )}
                {allowedKinds.includes('custom') && (
                  <button
                    type="button"
                    onClick={() => setSiteKind('custom')}
                    className={`p-4 rounded-xl border text-left ${siteKind === 'custom' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
                  >
                    <p className="font-semibold text-slate-900">自定义站</p>
                    <p className="text-xs text-slate-500 mt-1">需联系平台进行 Astro 项目开发与部署</p>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-2.5 rounded-xl bg-gradient-coral text-white font-semibold text-sm"
              >
                下一步
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">站点名称 *</label>
                <input
                  className="w-full p-3 rounded-xl border border-slate-200"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="如：品牌官网"
                />
              </div>
              {canAssignMerchant && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">归属商户</label>
                  <select
                    className="w-full p-3 rounded-xl border border-slate-200"
                    value={merchantId}
                    onChange={(e) => setMerchantId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">当前管理员默认</option>
                    {merchants.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {siteKind === 'template' && templates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">前台模板</label>
                  <div className="grid grid-cols-1 gap-2">
                    {templates.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setTemplateId(tpl.id)}
                        className={`p-3 rounded-xl border text-left text-sm ${
                          templateId === tpl.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                        }`}
                      >
                        <span className="font-medium text-slate-900">{tpl.name}</span>
                        <span className="block text-xs text-slate-500 mt-0.5">{tpl.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {siteKind === 'custom' && (
                <>
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    自定义站默认启用资讯 CMS；营销页由 Astro 本地构建部署。可选组件在创建后仍可在「编辑站点」中调整。
                  </p>
                  <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                    <p className="text-sm font-medium text-slate-900">站点组件</p>
                    <p className="text-xs text-slate-500">
                      资讯 CMS 为底座，已默认启用（文章 / 分类 / 栏目 / FAQ）。
                    </p>
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
                          工作台显示民宿、体验、服务维护；前台通过 API 拉取数据。
                        </span>
                      </span>
                    </label>
                  </div>
                </>
              )}
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
              {err && <p className="text-sm text-red-600">{err}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium">
                  上一步
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleCreate}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-coral text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  创建
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SiteCreateModal;
