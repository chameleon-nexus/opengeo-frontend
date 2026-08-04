import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, X, Image as ImageIcon, Save, Briefcase } from 'lucide-react';
import { Theme } from '../types';
import {
  CATEGORY_OPTIONS,
  DELIVERY_OPTIONS,
  createService,
  deleteService,
  emptyServiceDraft,
  listServices,
  updateService,
  type CatalogLocale,
  type ServicePackageRow,
  type ServicePayload,
  type ServiceRow,
  type ServiceTranslation,
} from '../api/siteServices';
import {
  sitePrimaryBtn,
  siteWorkbenchInner,
  siteWorkbenchScroll,
  siteWorkbenchShell,
  siteWorkbenchSubtitle,
  siteWorkbenchTitle,
} from '../lib/siteWorkbenchUi';

interface Props {
  theme: Theme;
}

type FormTab = 'basic' | 'service' | 'content' | 'packages' | 'booking';

const LOCALES: CatalogLocale[] = ['zh', 'en', 'es'];
const LOCALE_LABELS: Record<CatalogLocale, string> = { zh: '中文', en: 'English', es: 'Español' };

function getTr(translations: ServiceTranslation[], locale: CatalogLocale): ServiceTranslation {
  return translations.find((t) => t.locale === locale) || { locale, title: '' };
}

function setTr(translations: ServiceTranslation[], locale: CatalogLocale, patch: Partial<ServiceTranslation>): ServiceTranslation[] {
  const exists = translations.some((t) => t.locale === locale);
  if (!exists) return [...translations, { locale, title: '', ...patch }];
  return translations.map((t) => (t.locale === locale ? { ...t, ...patch } : t));
}

const ServiceManagement: React.FC<Props> = ({ theme: _theme }) => {
  void _theme;
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServicePayload>(emptyServiceDraft());
  const [activeLocale, setActiveLocale] = useState<CatalogLocale>('zh');
  const [tab, setTab] = useState<FormTab>('basic');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listServices());
    } catch (e: unknown) {
      setError((e as Error)?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const tr = getTr(form.translations, activeLocale);

  const addPackage = () => {
    setForm((f) => ({
      ...f,
      packages: [
        ...(f.packages || []),
        {
          sort_order: f.packages?.length || 0,
          status: 'published',
          is_featured: false,
          currency: f.currency || 'JPY',
          price_unit: 'per_guest',
          includes: [],
          excludes: [],
          notes: [],
          itinerary_highlights: [],
          translations: LOCALES.map((locale) => ({ locale, title: '' })),
        },
      ],
    }));
  };

  const updatePackage = (index: number, patch: Partial<ServicePackageRow>) => {
    setForm((f) => ({
      ...f,
      packages: (f.packages || []).map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));
  };

  const removePackage = (index: number) => {
    setForm((f) => ({ ...f, packages: (f.packages || []).filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    if (!form.slug.trim() || !getTr(form.translations, 'zh').title.trim()) {
      setError('请填写 slug 和中文标题');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId === 'new') await createService(form);
      else if (editingId) await updateService(editingId, form);
      setEditingId(null);
      await load();
    } catch (e: unknown) {
      setError((e as Error)?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: FormTab; label: string }[] = [
    { id: 'basic', label: '基本' },
    { id: 'service', label: '服务方式' },
    { id: 'content', label: '图文' },
    { id: 'packages', label: '套餐' },
    { id: 'booking', label: '预订' },
  ];

  return (
    <div className={siteWorkbenchShell}>
      <div className={siteWorkbenchScroll}>
        <div className={siteWorkbenchInner}>
          <div className="flex justify-between items-end">
            <div className="space-y-3">
              <h2 className={`${siteWorkbenchTitle} flex items-center gap-3`}>
                <Briefcase className="w-8 h-8 text-[#E8553F]" /> 旅途服务
              </h2>
              <p className={siteWorkbenchSubtitle}>一服务多套餐；支持导游、摄影等业态；参考价展示，进群预定。</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingId('new');
                setForm(emptyServiceDraft());
                setTab('basic');
                setActiveLocale('zh');
              }}
              className={sitePrimaryBtn}
            >
              <Plus className="w-4 h-4" /> 新增服务
            </button>
          </div>

          {error && <div className="px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#E8553F]" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-20">暂无服务</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <div key={row.service_id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="aspect-[5/3] bg-slate-100">
                  {row.cover_image_url ? (
                    <img src={row.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-slate-300 m-auto mt-8" />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold truncate">{getTr(row.translations, 'zh').title || row.slug}</h3>
                  <p className="text-xs text-slate-500">
                    {CATEGORY_OPTIONS.find((c) => c.value === row.category_key)?.label || row.category_key} ·{' '}
                    {row.packages?.length || 0} 个套餐
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(row.service_id);
                        setForm({ ...row, packages: row.packages || [], translations: row.translations });
                        setActiveLocale('zh');
                        setTab('basic');
                      }}
                      className="flex-1 py-2 rounded-lg bg-slate-100 text-sm"
                    >
                      编辑
                    </button>
                    <button type="button" onClick={() => void deleteService(row.service_id).then(load)} className="px-3 text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      </div>

      {editingId && (
        <div className="fixed inset-0 z-50 flex">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setEditingId(null)} aria-label="关闭" />
          <div className="relative ml-auto w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-semibold">{editingId === 'new' ? '新增服务' : '编辑服务'}</h3>
              <button type="button" onClick={() => setEditingId(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-2 flex gap-2 border-b overflow-x-auto">
              {LOCALES.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setActiveLocale(loc)}
                  className={`px-3 py-1 rounded-full text-xs shrink-0 ${activeLocale === loc ? 'bg-orange-50 text-[#E8553F]' : 'bg-slate-100'}`}
                >
                  {LOCALE_LABELS[loc]}
                </button>
              ))}
            </div>
            <div className="px-6 py-2 flex gap-1 border-b overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs shrink-0 ${tab === t.id ? 'bg-gradient-coral text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-auto px-6 py-4 space-y-3 text-sm">
              {tab === 'basic' && (
                <>
                  <input className="w-full border rounded-lg px-3 py-2" placeholder="slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
                  <input className="w-full border rounded-lg px-3 py-2" placeholder="标题" value={tr.title} onChange={(e) => setForm((f) => ({ ...f, translations: setTr(f.translations, activeLocale, { title: e.target.value }) }))} />
                  <input className="w-full border rounded-lg px-3 py-2" placeholder="副标题" value={tr.summary_line || ''} onChange={(e) => setForm((f) => ({ ...f, translations: setTr(f.translations, activeLocale, { summary_line: e.target.value }) }))} />
                  <input className="w-full border rounded-lg px-3 py-2" placeholder="分类展示名（如 东京摄影 / 中文私导）" value={tr.category_label || ''} onChange={(e) => setForm((f) => ({ ...f, translations: setTr(f.translations, activeLocale, { category_label: e.target.value }) }))} />
                  <select className="w-full border rounded-lg px-3 py-2" value={form.category_key} onChange={(e) => setForm((f) => ({ ...f, category_key: e.target.value as ServicePayload['category_key'] }))}>
                    {CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="border rounded-lg px-3 py-2" placeholder="展示评分" value={form.display_rating || ''} onChange={(e) => setForm((f) => ({ ...f, display_rating: e.target.value }))} />
                    <input className="border rounded-lg px-3 py-2" placeholder="角标" value={form.badge || ''} onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))} />
                  </div>
                  <select className="w-full border rounded-lg px-3 py-2" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    <option value="draft">草稿</option>
                    <option value="published">已发布</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.guest_favorite} onChange={(e) => setForm((f) => ({ ...f, guest_favorite: e.target.checked }))} />
                    旅客最爱
                  </label>
                </>
              )}

              {tab === 'service' && (
                <>
                  <select className="w-full border rounded-lg px-3 py-2" value={form.delivery_mode || ''} onChange={(e) => setForm((f) => ({ ...f, delivery_mode: e.target.value as ServicePayload['delivery_mode'] }))}>
                    {DELIVERY_OPTIONS.map((o) => (
                      <option key={o.value || 'none'} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <input className="w-full border rounded-lg px-3 py-2" placeholder="服务范围（内部）" value={form.service_area || ''} onChange={(e) => setForm((f) => ({ ...f, service_area: e.target.value }))} />
                  <input className="w-full border rounded-lg px-3 py-2" placeholder="服务范围展示文案" value={tr.service_area_label || ''} onChange={(e) => setForm((f) => ({ ...f, translations: setTr(f.translations, activeLocale, { service_area_label: e.target.value }) }))} />
                  <input className="w-full border rounded-lg px-3 py-2" placeholder="提供语言（逗号分隔，如 zh,en,ja）" value={(form.offered_languages || []).join(',')} onChange={(e) => setForm((f) => ({ ...f, offered_languages: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" className="border rounded-lg px-3 py-2" placeholder="最低年龄" value={form.min_age ?? ''} onChange={(e) => setForm((f) => ({ ...f, min_age: e.target.value ? Number(e.target.value) : null }))} />
                    <input type="number" className="border rounded-lg px-3 py-2" placeholder="团队人数上限" value={form.max_group_size ?? ''} onChange={(e) => setForm((f) => ({ ...f, max_group_size: e.target.value ? Number(e.target.value) : null }))} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input className="border rounded-lg px-3 py-2" placeholder="国家" value={form.country || ''} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
                    <input className="border rounded-lg px-3 py-2" placeholder="地区" value={form.region || ''} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} />
                    <input className="border rounded-lg px-3 py-2" placeholder="城市" value={form.city || ''} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
                  </div>
                  <input className="w-full border rounded-lg px-3 py-2" placeholder="默认集合/上门地址" value={form.display_address || ''} onChange={(e) => setForm((f) => ({ ...f, display_address: e.target.value }))} />
                  <textarea className="w-full border rounded-lg px-3 py-2" rows={3} placeholder="定制说明" value={tr.customization_hint || form.customization_hint || ''} onChange={(e) => setForm((f) => ({ ...f, customization_hint: e.target.value, translations: setTr(f.translations, activeLocale, { customization_hint: e.target.value }) }))} />
                </>
              )}

              {tab === 'content' && (
                <>
                  <input className="w-full border rounded-lg px-3 py-2" placeholder="封面 URL" value={form.cover_image_url || ''} onChange={(e) => setForm((f) => ({ ...f, cover_image_url: e.target.value }))} />
                  <textarea className="w-full border rounded-lg px-3 py-2" rows={5} placeholder="描述" value={tr.description || ''} onChange={(e) => setForm((f) => ({ ...f, translations: setTr(f.translations, activeLocale, { description: e.target.value }) }))} />
                  <textarea className="w-full border rounded-lg px-3 py-2" rows={3} placeholder="图库 URL（每行一条）" value={(form.photos || []).map((p) => p.url).join('\n')} onChange={(e) => setForm((f) => ({ ...f, photos: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean).map((url) => ({ url })) }))} />
                  <textarea className="w-full border rounded-lg px-3 py-2" rows={3} placeholder="作品集 URL（每行一条）" value={(form.portfolio_photos || []).map((p) => p.url).join('\n')} onChange={(e) => setForm((f) => ({ ...f, portfolio_photos: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean).map((url) => ({ url })) }))} />
                  <textarea className="w-full border rounded-lg px-3 py-2" rows={3} placeholder="服务包含（每行一条）" value={(form.includes || []).join('\n')} onChange={(e) => setForm((f) => ({ ...f, includes: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) }))} />
                  <textarea className="w-full border rounded-lg px-3 py-2" rows={3} placeholder="须知（每行一条）" value={(form.service_notes || []).join('\n')} onChange={(e) => setForm((f) => ({ ...f, service_notes: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) }))} />
                  <textarea className="w-full border rounded-lg px-3 py-2" rows={3} placeholder="取消政策" value={form.cancellation_policy_text || ''} onChange={(e) => setForm((f) => ({ ...f, cancellation_policy_text: e.target.value }))} />
                  <textarea className="w-full border rounded-lg px-3 py-2" rows={2} placeholder="参与条件" value={tr.participant_requirements_text || ''} onChange={(e) => setForm((f) => ({ ...f, translations: setTr(f.translations, activeLocale, { participant_requirements_text: e.target.value }) }))} />
                </>
              )}

              {tab === 'packages' && (
                <>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-slate-500">详情页展示各套餐参考价；首页取最低套餐价作为起价。</p>
                    <button type="button" onClick={addPackage} className="text-sm text-emerald-600 hover:underline">+ 添加套餐</button>
                  </div>
                  {(form.packages || []).length === 0 ? (
                    <p className="text-sm text-slate-400 py-8 text-center">暂无套餐</p>
                  ) : (
                    (form.packages || []).map((pkg, idx) => {
                      const ptr = pkg.translations?.find((t) => t.locale === activeLocale) || { locale: activeLocale, title: '' };
                      return (
                        <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-700">套餐 #{idx + 1}</span>
                            <div className="flex items-center gap-3">
                              <label className="text-xs flex items-center gap-1">
                                <input type="checkbox" checked={pkg.is_featured} onChange={(e) => updatePackage(idx, { is_featured: e.target.checked })} />
                                热卖
                              </label>
                              <button type="button" className="text-red-500 text-xs" onClick={() => removePackage(idx)}>删除</button>
                            </div>
                          </div>
                          <input
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                            placeholder={`套餐名称 (${LOCALE_LABELS[activeLocale]})`}
                            value={ptr.title}
                            onChange={(e) =>
                              updatePackage(idx, {
                                translations: (pkg.translations || []).some((t) => t.locale === activeLocale)
                                  ? (pkg.translations || []).map((t) => (t.locale === activeLocale ? { ...t, title: e.target.value } : t))
                                  : [...(pkg.translations || []), { locale: activeLocale, title: e.target.value }],
                              })
                            }
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input type="number" className="border rounded-lg px-3 py-2 bg-white" placeholder="时长（分钟）" value={pkg.duration_minutes ?? ''} onChange={(e) => updatePackage(idx, { duration_minutes: e.target.value ? Number(e.target.value) : null })} />
                            <input className="border rounded-lg px-3 py-2 bg-white" placeholder="时长文案" value={ptr.duration_label || ''} onChange={(e) => updatePackage(idx, { translations: (pkg.translations || []).some((t) => t.locale === activeLocale) ? (pkg.translations || []).map((t) => (t.locale === activeLocale ? { ...t, duration_label: e.target.value } : t)) : [...(pkg.translations || []), { locale: activeLocale, title: '', duration_label: e.target.value }] })} />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <input type="number" className="border rounded-lg px-3 py-2 bg-white" placeholder="参考价" value={pkg.reference_price ?? ''} onChange={(e) => updatePackage(idx, { reference_price: e.target.value ? Number(e.target.value) : null })} />
                            <input type="number" className="border rounded-lg px-3 py-2 bg-white" placeholder="最低消费" value={pkg.min_booking_amount ?? ''} onChange={(e) => updatePackage(idx, { min_booking_amount: e.target.value ? Number(e.target.value) : null })} />
                            <select className="border rounded-lg px-3 py-2 bg-white" value={pkg.price_unit} onChange={(e) => updatePackage(idx, { price_unit: e.target.value })}>
                              <option value="per_guest">每人</option>
                              <option value="per_group">每团</option>
                              <option value="per_day">每天</option>
                              <option value="per_session">每次</option>
                              <option value="from">起价</option>
                            </select>
                          </div>
                          <input className="w-full border rounded-lg px-3 py-2 bg-white" placeholder="价格展示文案" value={ptr.reference_price_label || ''} onChange={(e) => updatePackage(idx, { translations: (pkg.translations || []).some((t) => t.locale === activeLocale) ? (pkg.translations || []).map((t) => (t.locale === activeLocale ? { ...t, reference_price_label: e.target.value } : t)) : [...(pkg.translations || []), { locale: activeLocale, title: '', reference_price_label: e.target.value }] })} />
                          <textarea className="w-full border rounded-lg px-3 py-2 bg-white" rows={2} placeholder="包含（每行一条）" value={(pkg.includes || []).join('\n')} onChange={(e) => updatePackage(idx, { includes: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} />
                          <textarea className="w-full border rounded-lg px-3 py-2 bg-white" rows={2} placeholder="不含（每行一条）" value={(pkg.excludes || []).join('\n')} onChange={(e) => updatePackage(idx, { excludes: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} />
                          <input className="w-full border rounded-lg px-3 py-2 bg-white" placeholder="集合点" value={ptr.meeting_point_label || pkg.meeting_point_hint || ''} onChange={(e) => updatePackage(idx, { meeting_point_hint: e.target.value, translations: (pkg.translations || []).some((t) => t.locale === activeLocale) ? (pkg.translations || []).map((t) => (t.locale === activeLocale ? { ...t, meeting_point_label: e.target.value } : t)) : [...(pkg.translations || []), { locale: activeLocale, title: '', meeting_point_label: e.target.value }] })} />
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {tab === 'booking' && (
                <>
                  <input className="w-full border rounded-lg px-3 py-2" placeholder="按钮文案" value={tr.booking_cta_label || ''} onChange={(e) => setForm((f) => ({ ...f, translations: setTr(f.translations, activeLocale, { booking_cta_label: e.target.value }) }))} />
                  <input className="w-full border rounded-lg px-3 py-2" placeholder="进群链接" value={form.booking_cta_url || ''} onChange={(e) => setForm((f) => ({ ...f, booking_cta_url: e.target.value }))} />
                  <input className="w-full border rounded-lg px-3 py-2" placeholder="二维码图片 URL" value={form.booking_cta_qr_url || ''} onChange={(e) => setForm((f) => ({ ...f, booking_cta_qr_url: e.target.value }))} />
                  <input className="w-full border rounded-lg px-3 py-2" placeholder="侧栏参考价文案" value={tr.reference_price_label || ''} onChange={(e) => setForm((f) => ({ ...f, translations: setTr(f.translations, activeLocale, { reference_price_label: e.target.value }) }))} />
                  <input type="number" className="w-full border rounded-lg px-3 py-2" placeholder="主体最低起订（展示）" value={form.min_booking_amount ?? ''} onChange={(e) => setForm((f) => ({ ...f, min_booking_amount: e.target.value ? Number(e.target.value) : null }))} />
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setEditingId(null)}>取消</button>
              <button type="button" onClick={handleSave} disabled={saving} className={sitePrimaryBtn}>
                <Save className="w-4 h-4" /> 保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceManagement;

