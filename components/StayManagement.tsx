import React, { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  Loader2,
  X,
  ChevronRight,
  Image as ImageIcon,
  Save,
  Home,
} from 'lucide-react';
import { Theme } from '../types';
import {
  createStay,
  deleteStay,
  emptyStayDraft,
  listStays,
  updateStay,
  type StayPayload,
  type StayRow,
  type StayLocale,
  type StayRoom,
  type StayTranslation,
} from '../api/siteListings';
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

const LOCALES: StayLocale[] = ['zh', 'en', 'es'];
const LOCALE_LABELS: Record<StayLocale, string> = { zh: '中文', en: 'English', es: 'Español' };
const SECTION_KEYS = [
  { value: 'osaka', label: '大阪 (osaka)' },
  { value: 'paris', label: '巴黎 (paris)' },
  { value: 'kyoto', label: '京都 (kyoto)' },
  { value: 'default', label: '默认 (default)' },
];

type FormTab = 'basic' | 'content' | 'location' | 'rooms' | 'booking';

function getTr(translations: StayTranslation[], locale: StayLocale): StayTranslation {
  return translations.find((t) => t.locale === locale) || { locale, title: '' };
}

function setTr(translations: StayTranslation[], locale: StayLocale, patch: Partial<StayTranslation>): StayTranslation[] {
  const exists = translations.some((t) => t.locale === locale);
  if (!exists) return [...translations, { locale, title: '', ...patch }];
  return translations.map((t) => (t.locale === locale ? { ...t, ...patch } : t));
}

const StayManagement: React.FC<Props> = ({ theme: _theme }) => {
  void _theme;
  const [rows, setRows] = useState<StayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StayPayload>(emptyStayDraft());
  const [tab, setTab] = useState<FormTab>('basic');
  const [activeLocale, setActiveLocale] = useState<StayLocale>('zh');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listStays();
      setRows(data);
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
    setForm(emptyStayDraft());
    setTab('basic');
    setActiveLocale('zh');
  };

  const openEdit = (row: StayRow) => {
    setEditingId(row.listing_id);
    const { listing_id: _lid, created_at: _c, updated_at: _u, reference_price_start: _r, ...rest } = row;
    void _lid;
    void _c;
    void _u;
    void _r;
    setForm({
      ...rest,
      translations: rest.translations?.length ? rest.translations : emptyStayDraft().translations,
      rooms: rest.rooms || [],
      photos: rest.photos || [],
      amenities: (rest.amenities as string[]) || [],
      house_rules: (rest.house_rules as string[]) || [],
      safety_devices: (rest.safety_devices as string[]) || [],
      property_restrictions: (rest.property_restrictions as string[]) || [],
    });
    setTab('basic');
    setActiveLocale('zh');
  };

  const closeEditor = () => {
    setEditingId(null);
    setForm(emptyStayDraft());
  };

  const handleSave = async () => {
    if (!form.slug.trim()) {
      setError('请填写 slug');
      return;
    }
    const zhTitle = getTr(form.translations, 'zh').title.trim();
    if (!zhTitle) {
      setError('请至少填写中文标题');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId === 'new') {
        await createStay(form);
      } else if (editingId) {
        await updateStay(editingId, form);
      }
      closeEditor();
      await load();
    } catch (e: unknown) {
      setError((e as Error)?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (listingId: string) => {
    if (!window.confirm('确定删除该民宿？')) return;
    try {
      await deleteStay(listingId);
      await load();
    } catch (e: unknown) {
      setError((e as Error)?.message || '删除失败');
    }
  };

  const addPhoto = () => {
    const url = window.prompt('图片 URL');
    if (!url?.trim()) return;
    setForm((f) => ({
      ...f,
      photos: [...(f.photos || []), { url: url.trim(), sort: (f.photos?.length || 0) }],
      cover_image_url: f.cover_image_url || url.trim(),
    }));
  };

  const addRoom = () => {
    setForm((f) => ({
      ...f,
      rooms: [
        ...(f.rooms || []),
        {
          sort_order: f.rooms?.length || 0,
          status: 'published',
          currency: f.currency || 'JPY',
          translations: LOCALES.map((locale) => ({ locale, title: '' })),
        },
      ],
    }));
  };

  const updateRoom = (index: number, patch: Partial<StayRoom>) => {
    setForm((f) => ({
      ...f,
      rooms: (f.rooms || []).map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));
  };

  const removeRoom = (index: number) => {
    setForm((f) => ({ ...f, rooms: (f.rooms || []).filter((_, i) => i !== index) }));
  };

  const tr = getTr(form.translations, activeLocale);

  const tabs: Array<{ id: FormTab; label: string }> = [
    { id: 'basic', label: '基本信息' },
    { id: 'content', label: '描述与图文' },
    { id: 'location', label: '位置与设施' },
    { id: 'rooms', label: '房型' },
    { id: 'booking', label: '预订引导' },
  ];

  return (
    <div className={siteWorkbenchShell}>
      <div className={siteWorkbenchScroll}>
        <div className={siteWorkbenchInner}>
          <div className="flex justify-between items-end">
            <div className="space-y-3">
              <h2 className={`${siteWorkbenchTitle} flex items-center gap-3`}>
                <Home className="w-8 h-8 text-[#E8553F]" /> 民宿管理
              </h2>
              <p className={siteWorkbenchSubtitle}>首页一卡一民宿；详情页展示房型与参考价，预订引导进群完成。</p>
            </div>
            <button type="button" onClick={openCreate} className={sitePrimaryBtn}>
              <Plus className="w-4 h-4" /> 新增民宿
            </button>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#E8553F]" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-20 text-slate-500 text-sm">暂无民宿，点击「新增民宿」开始维护。</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => {
              const title = getTr(row.translations, 'zh').title || row.slug;
              return (
                <div key={row.listing_id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="aspect-[5/3] bg-slate-100 relative">
                    {row.cover_image_url ? (
                      <img src={row.cover_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ImageIcon className="w-10 h-10" />
                      </div>
                    )}
                    <span
                      className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {row.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900 truncate">{title}</h3>
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {row.city || '—'} · {row.rooms?.length || 0} 个房型
                      {row.display_rating ? ` · ★${row.display_rating}` : ''}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-sm text-slate-700 hover:bg-slate-200"
                      >
                        编辑 <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row.listing_id)}
                        className="px-3 py-2 rounded-lg text-red-600 hover:bg-red-50"
                        aria-label="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      </div>

      {editingId && (
        <div className="fixed inset-0 z-50 flex">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={closeEditor} aria-label="关闭" />
          <div className="relative ml-auto w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col">
            <div className="shrink-0 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editingId === 'new' ? '新增民宿' : '编辑民宿'}</h3>
              <button type="button" onClick={closeEditor} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="shrink-0 flex gap-1 px-6 border-b border-slate-100 overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-2.5 text-sm whitespace-nowrap border-b-2 ${
                    tab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="shrink-0 px-6 py-2 flex gap-2 border-b border-slate-50">
              {LOCALES.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setActiveLocale(loc)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    activeLocale === loc ? 'bg-orange-50 text-[#E8553F]' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {LOCALE_LABELS[loc]}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
              {tab === 'basic' && (
                <>
                  <label className="block text-sm">
                    <span className="text-slate-600">Slug（URL 路径）</span>
                    <input
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={form.slug}
                      onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                      placeholder="kawahouse-osaka"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-slate-600">标题 ({LOCALE_LABELS[activeLocale]})</span>
                    <input
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={tr.title}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, translations: setTr(f.translations, activeLocale, { title: e.target.value }) }))
                      }
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm">
                      <span className="text-slate-600">展示评分（首页星级）</span>
                      <input
                        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        value={form.display_rating || ''}
                        onChange={(e) => setForm((f) => ({ ...f, display_rating: e.target.value }))}
                        placeholder="4.91"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-slate-600">角标 Badge</span>
                      <input
                        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        value={form.badge || ''}
                        onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
                        placeholder="房客推荐"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm">
                      <span className="text-slate-600">首页分组</span>
                      <select
                        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        value={form.home_section_key || 'default'}
                        onChange={(e) => setForm((f) => ({ ...f, home_section_key: e.target.value }))}
                      >
                        {SECTION_KEYS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm">
                      <span className="text-slate-600">状态</span>
                      <select
                        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        value={form.status}
                        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                      >
                        <option value="draft">草稿</option>
                        <option value="published">已发布</option>
                      </select>
                    </label>
                  </div>
                  <label className="block text-sm">
                    <span className="text-slate-600">物业类型 ({LOCALE_LABELS[activeLocale]})</span>
                    <input
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={tr.property_type || ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          translations: setTr(f.translations, activeLocale, { property_type: e.target.value }),
                        }))
                      }
                      placeholder="整套公寓"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-slate-600">摘要一行 ({LOCALE_LABELS[activeLocale]})</span>
                    <input
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={tr.summary_line || ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          translations: setTr(f.translations, activeLocale, { summary_line: e.target.value }),
                        }))
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-slate-600">首页参考价文案 ({LOCALE_LABELS[activeLocale]})</span>
                    <input
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={tr.reference_price_label || ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          translations: setTr(f.translations, activeLocale, { reference_price_label: e.target.value }),
                        }))
                      }
                      placeholder="留空则按房型最低价自动生成，如 ¥486 /2晚"
                    />
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {(['max_guests', 'bedrooms', 'beds'] as const).map((k) => (
                      <label key={k} className="block text-sm">
                        <span className="text-slate-600">{k === 'max_guests' ? '人数' : k === 'bedrooms' ? '卧室' : '床位'}</span>
                        <input
                          type="number"
                          className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          value={form[k] ?? ''}
                          onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value ? Number(e.target.value) : null }))}
                        />
                      </label>
                    ))}
                    <label className="block text-sm">
                      <span className="text-slate-600">卫生间</span>
                      <input
                        type="number"
                        step="0.5"
                        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        value={form.bathrooms ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, bathrooms: e.target.value ? Number(e.target.value) : null }))}
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {(
                      [
                        ['guest_favorite', '旅客最爱'],
                        ['self_check_in', '自助入住'],
                        ['luggage_storage', '行李寄存'],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!form[key]}
                          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </>
              )}

              {tab === 'content' && (
                <>
                  <label className="block text-sm">
                    <span className="text-slate-600">封面图 URL</span>
                    <input
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={form.cover_image_url || ''}
                      onChange={(e) => setForm((f) => ({ ...f, cover_image_url: e.target.value }))}
                    />
                  </label>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">图库</span>
                      <button type="button" onClick={addPhoto} className="text-xs text-blue-600 hover:underline">
                        + 添加图片
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(form.photos || []).map((p, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                            value={p.url}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                photos: (f.photos || []).map((x, j) => (j === i ? { ...x, url: e.target.value } : x)),
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="text-red-500 text-xs px-2"
                            onClick={() => setForm((f) => ({ ...f, photos: (f.photos || []).filter((_, j) => j !== i) }))}
                          >
                            删
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <label className="block text-sm">
                    <span className="text-slate-600">描述 ({LOCALE_LABELS[activeLocale]})</span>
                    <textarea
                      rows={8}
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                      value={tr.description || ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          translations: setTr(f.translations, activeLocale, { description: e.target.value }),
                        }))
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-slate-600">备案/许可信息</span>
                    <input
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={form.registration_info || ''}
                      onChange={(e) => setForm((f) => ({ ...f, registration_info: e.target.value }))}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-slate-600">取消政策说明</span>
                    <textarea
                      rows={3}
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={form.cancellation_policy_text || ''}
                      onChange={(e) => setForm((f) => ({ ...f, cancellation_policy_text: e.target.value }))}
                    />
                  </label>
                </>
              )}

              {tab === 'location' && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="block text-sm">
                      <span className="text-slate-600">国家</span>
                      <input
                        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        value={form.country || ''}
                        onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-slate-600">都道府县/省</span>
                      <input
                        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        value={form.region || ''}
                        onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-slate-600">城市</span>
                      <input
                        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        value={form.city || ''}
                        onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      />
                    </label>
                  </div>
                  <label className="block text-sm">
                    <span className="text-slate-600">展示地址</span>
                    <input
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={form.display_address || ''}
                      onChange={(e) => setForm((f) => ({ ...f, display_address: e.target.value }))}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-slate-600">设施（逗号分隔 key，如 wifi,kitchen,washer）</span>
                    <input
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={(form.amenities || []).join(', ')}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          amenities: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }))
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-slate-600">房屋守则（每行一条）</span>
                    <textarea
                      rows={4}
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={(form.house_rules || []).join('\n')}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          house_rules: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                        }))
                      }
                    />
                  </label>
                </>
              )}

              {tab === 'rooms' && (
                <>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-slate-500">详情页展示各房型参考价；首页取最低房型价作为「起价」。</p>
                    <button type="button" onClick={addRoom} className="text-sm text-blue-600 hover:underline">
                      + 添加房型
                    </button>
                  </div>
                  {(form.rooms || []).length === 0 ? (
                    <p className="text-sm text-slate-400 py-8 text-center">暂无房型</p>
                  ) : (
                    (form.rooms || []).map((room, idx) => {
                      const rtr = room.translations?.find((t) => t.locale === activeLocale) || {
                        locale: activeLocale,
                        title: '',
                      };
                      return (
                        <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-slate-700">房型 #{idx + 1}</span>
                            <button type="button" className="text-red-500 text-xs" onClick={() => removeRoom(idx)}>
                              删除
                            </button>
                          </div>
                          <input
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                            placeholder={`房型名称 (${LOCALE_LABELS[activeLocale]})`}
                            value={rtr.title}
                            onChange={(e) =>
                              updateRoom(idx, {
                                translations: (room.translations || []).some((t) => t.locale === activeLocale)
                                  ? (room.translations || []).map((t) =>
                                      t.locale === activeLocale ? { ...t, title: e.target.value } : t,
                                    )
                                  : [...(room.translations || []), { locale: activeLocale, title: e.target.value }],
                              })
                            }
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="number"
                              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                              placeholder="参考价（整数）"
                              value={room.reference_price ?? ''}
                              onChange={(e) =>
                                updateRoom(idx, { reference_price: e.target.value ? Number(e.target.value) : null })
                              }
                            />
                            <input
                              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                              placeholder="参考价展示文案（可选）"
                              value={rtr.reference_price_label || ''}
                              onChange={(e) =>
                                updateRoom(idx, {
                                  translations: (room.translations || []).some((t) => t.locale === activeLocale)
                                    ? (room.translations || []).map((t) =>
                                        t.locale === activeLocale ? { ...t, reference_price_label: e.target.value } : t,
                                      )
                                    : [
                                        ...(room.translations || []),
                                        { locale: activeLocale, title: '', reference_price_label: e.target.value },
                                      ],
                                })
                              }
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {tab === 'booking' && (
                <>
                  <label className="block text-sm">
                    <span className="text-slate-600">按钮文案 ({LOCALE_LABELS[activeLocale]})</span>
                    <input
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={tr.booking_cta_label || ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          translations: setTr(f.translations, activeLocale, { booking_cta_label: e.target.value }),
                        }))
                      }
                      placeholder="进群预定"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-slate-600">进群链接（可选）</span>
                    <input
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={form.booking_cta_url || ''}
                      onChange={(e) => setForm((f) => ({ ...f, booking_cta_url: e.target.value }))}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-slate-600">微信群二维码图片 URL</span>
                    <input
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={form.booking_cta_qr_url || ''}
                      onChange={(e) => setForm((f) => ({ ...f, booking_cta_qr_url: e.target.value }))}
                    />
                  </label>
                </>
              )}
            </div>

            <div className="shrink-0 px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-white">
              <button type="button" onClick={closeEditor} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={sitePrimaryBtn}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StayManagement;
