import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, X, Image as ImageIcon, Save, Sparkles } from 'lucide-react';
import { Theme } from '../types';
import {
  createExperience,
  deleteExperience,
  emptyExperienceDraft,
  listExperiences,
  updateExperience,
  type CatalogLocale,
  type ExperiencePayload,
  type ExperienceRow,
  type ExperienceTranslation,
} from '../api/siteExperiences';
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

const LOCALES: CatalogLocale[] = ['zh', 'en', 'es'];
const LOCALE_LABELS: Record<CatalogLocale, string> = { zh: '中文', en: 'English', es: 'Español' };

function getTr(translations: ExperienceTranslation[], locale: CatalogLocale): ExperienceTranslation {
  return translations.find((t) => t.locale === locale) || { locale, title: '' };
}

function setTr(
  translations: ExperienceTranslation[],
  locale: CatalogLocale,
  patch: Partial<ExperienceTranslation>,
): ExperienceTranslation[] {
  const exists = translations.some((t) => t.locale === locale);
  if (!exists) return [...translations, { locale, title: '', ...patch }];
  return translations.map((t) => (t.locale === locale ? { ...t, ...patch } : t));
}

const ExperienceManagement: React.FC<Props> = ({ theme: _theme }) => {
  void _theme;
  const [rows, setRows] = useState<ExperienceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExperiencePayload>(emptyExperienceDraft());
  const [activeLocale, setActiveLocale] = useState<CatalogLocale>('zh');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listExperiences());
    } catch (e: unknown) {
      setError((e as Error)?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId('new');
    setForm(emptyExperienceDraft());
    setActiveLocale('zh');
  };

  const openEdit = (row: ExperienceRow) => {
    const { experience_id: _id, ...rest } = row;
    void _id;
    setEditingId(row.experience_id);
    setForm({ ...rest, translations: rest.translations?.length ? rest.translations : emptyExperienceDraft().translations });
    setActiveLocale('zh');
  };

  const handleSave = async () => {
    if (!form.slug.trim() || !getTr(form.translations, 'zh').title.trim()) {
      setError('请填写 slug 和中文标题');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId === 'new') await createExperience(form);
      else if (editingId) await updateExperience(editingId, form);
      setEditingId(null);
      await load();
    } catch (e: unknown) {
      setError((e as Error)?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const addStep = () => {
    setForm((f) => ({
      ...f,
      activity_steps: [
        ...(f.activity_steps || []),
        { sort: f.activity_steps?.length || 0, titles: { zh: '', en: '', es: '' }, bodies: { zh: '', en: '', es: '' } },
      ],
    }));
  };

  const tr = getTr(form.translations, activeLocale);

  return (
    <div className={siteWorkbenchShell}>
      <div className={siteWorkbenchScroll}>
        <div className={siteWorkbenchInner}>
          <div className="flex justify-between items-end">
            <div className="space-y-3">
              <h2 className={`${siteWorkbenchTitle} flex items-center gap-3`}>
                <Sparkles className="w-8 h-8 text-[#E8553F]" /> 体验 / 活动
              </h2>
              <p className={siteWorkbenchSubtitle}>独立表 site_experiences；首页一卡一体验，进群预定。</p>
            </div>
            <button type="button" onClick={openCreate} className={sitePrimaryBtn}>
              <Plus className="w-4 h-4" /> 新增体验
            </button>
          </div>

          {error && <div className="px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#E8553F]" /></div>
          ) : rows.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-20">暂无体验</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <div key={row.experience_id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="aspect-[5/3] bg-slate-100">
                  {row.cover_image_url ? <img src={row.cover_image_url} alt="" className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center"><ImageIcon className="w-10 h-10 text-slate-300" /></div>}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold truncate">{getTr(row.translations, 'zh').title || row.slug}</h3>
                  <p className="text-xs text-slate-500 mt-1">{row.city || '—'} · {row.status === 'published' ? '已发布' : '草稿'}</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => openEdit(row)} className="flex-1 py-2 rounded-lg bg-slate-100 text-sm">编辑</button>
                    <button type="button" onClick={() => void deleteExperience(row.experience_id).then(load)} className="px-3 text-red-500"><Trash2 className="w-4 h-4" /></button>
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
              <h3 className="font-semibold">{editingId === 'new' ? '新增体验' : '编辑体验'}</h3>
              <button type="button" onClick={() => setEditingId(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-2 flex gap-2 border-b">
              {LOCALES.map((loc) => (
                <button key={loc} type="button" onClick={() => setActiveLocale(loc)} className={`px-3 py-1 rounded-full text-xs ${activeLocale === loc ? 'bg-orange-50 text-[#E8553F]' : 'bg-slate-100'}`}>{LOCALE_LABELS[loc]}</button>
              ))}
            </div>
            <div className="flex-1 overflow-auto px-6 py-4 space-y-3 text-sm">
              <input className="w-full border rounded-lg px-3 py-2" placeholder="slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
              <input className="w-full border rounded-lg px-3 py-2" placeholder={`标题 (${LOCALE_LABELS[activeLocale]})`} value={tr.title} onChange={(e) => setForm((f) => ({ ...f, translations: setTr(f.translations, activeLocale, { title: e.target.value }) }))} />
              <input className="w-full border rounded-lg px-3 py-2" placeholder="展示评分" value={form.display_rating || ''} onChange={(e) => setForm((f) => ({ ...f, display_rating: e.target.value }))} />
              <input className="w-full border rounded-lg px-3 py-2" placeholder="封面图 URL" value={form.cover_image_url || ''} onChange={(e) => setForm((f) => ({ ...f, cover_image_url: e.target.value }))} />
              <textarea className="w-full border rounded-lg px-3 py-2" rows={4} placeholder={`描述 (${LOCALE_LABELS[activeLocale]})`} value={tr.description || ''} onChange={(e) => setForm((f) => ({ ...f, translations: setTr(f.translations, activeLocale, { description: e.target.value }) }))} />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" className="border rounded-lg px-3 py-2" placeholder="参考价" value={form.reference_price ?? ''} onChange={(e) => setForm((f) => ({ ...f, reference_price: e.target.value ? Number(e.target.value) : null }))} />
                <input className="border rounded-lg px-3 py-2" placeholder="参考价文案" value={tr.reference_price_label || ''} onChange={(e) => setForm((f) => ({ ...f, translations: setTr(f.translations, activeLocale, { reference_price_label: e.target.value }) }))} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" className="border rounded-lg px-3 py-2" placeholder="时长(分)" value={form.duration_minutes ?? ''} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value ? Number(e.target.value) : null }))} />
                <input type="number" className="border rounded-lg px-3 py-2" placeholder="最多人数" value={form.max_participants ?? ''} onChange={(e) => setForm((f) => ({ ...f, max_participants: e.target.value ? Number(e.target.value) : null }))} />
                <select className="border rounded-lg px-3 py-2" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="draft">草稿</option>
                  <option value="published">已发布</option>
                </select>
              </div>
              <input className="w-full border rounded-lg px-3 py-2" placeholder="集合点名称" value={form.venue_name || ''} onChange={(e) => setForm((f) => ({ ...f, venue_name: e.target.value }))} />
              <input className="w-full border rounded-lg px-3 py-2" placeholder="城市" value={form.city || ''} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              <input className="w-full border rounded-lg px-3 py-2" placeholder="展示地址" value={form.display_address || ''} onChange={(e) => setForm((f) => ({ ...f, display_address: e.target.value }))} />
              <div>
                <div className="flex justify-between mb-2"><span className="font-medium">你会做什么</span><button type="button" className="text-[#E8553F] text-xs font-semibold" onClick={addStep}>+ 步骤</button></div>
                {(form.activity_steps || []).map((step, idx) => (
                  <div key={idx} className="mb-2 p-3 border rounded-lg bg-slate-50 space-y-1">
                    <input className="w-full border rounded px-2 py-1" placeholder="步骤标题" value={step.titles?.[activeLocale] || ''} onChange={(e) => setForm((f) => ({
                      ...f,
                      activity_steps: (f.activity_steps || []).map((s, i) => i === idx ? { ...s, titles: { ...s.titles, [activeLocale]: e.target.value } } : s),
                    }))} />
                    <input className="w-full border rounded px-2 py-1" placeholder="步骤说明" value={step.bodies?.[activeLocale] || ''} onChange={(e) => setForm((f) => ({
                      ...f,
                      activity_steps: (f.activity_steps || []).map((s, i) => i === idx ? { ...s, bodies: { ...s.bodies, [activeLocale]: e.target.value } } : s),
                    }))} />
                  </div>
                ))}
              </div>
              <input className="w-full border rounded-lg px-3 py-2" placeholder="进群二维码图 URL" value={form.booking_cta_qr_url || ''} onChange={(e) => setForm((f) => ({ ...f, booking_cta_qr_url: e.target.value }))} />
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 rounded-xl text-slate-600">取消</button>
              <button type="button" onClick={handleSave} disabled={saving} className={sitePrimaryBtn}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExperienceManagement;
