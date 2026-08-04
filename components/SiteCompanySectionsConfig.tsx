import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Theme } from '../types';
import { sitesAPI } from '../api/sites';
import { useSiteContext } from '../context/SiteContext';
import { uploadSiteAsset } from '../lib/siteAssetUpload';
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

export interface CompanySectionRow {
  title: string;
  subtitle: string;
  description: string;
  image: string;
}

const emptySection = (): CompanySectionRow => ({
  title: '',
  subtitle: '',
  description: '',
  image: '',
});

interface Props {
  theme: Theme;
  onSiteUpdated?: () => void;
}

const SiteCompanySectionsConfig: React.FC<Props> = ({ theme: _theme, onSiteUpdated }) => {
  void _theme;
  const { siteId, site } = useSiteContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [sections, setSections] = useState<CompanySectionRow[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  const inputClass = siteInputCls;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const row = site?.id === siteId ? site : await sitesAPI.get(siteId);
      const raw = row.site_settings?.company_sections;
      if (Array.isArray(raw) && raw.length > 0) {
        setSections(
          raw.map((s) => ({
            title: (s as CompanySectionRow).title || '',
            subtitle: (s as CompanySectionRow).subtitle || '',
            description: (s as CompanySectionRow).description || '',
            image: (s as CompanySectionRow).image || '',
          })),
        );
      } else {
        setSections([]);
      }
    } catch {
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [siteId, site?.id, site?.updated_at]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleImageUpload = async (idx: number, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('配图不超过 5M');
      return;
    }
    setUploading(`section-${idx}`);
    try {
      const url = await uploadSiteAsset(file, 'company_section');
      setSections((prev) => {
        const arr = [...prev];
        if (arr[idx]) arr[idx] = { ...arr[idx], image: url };
        return arr;
      });
    } catch (err) {
      alert((err as Error).message || '上传失败');
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
      const payload = sections.filter(
        (s) => s.title.trim() || s.subtitle.trim() || s.description.trim() || s.image.trim(),
      );
      await sitesAPI.update(siteId, {
        site_settings: {
          company_sections: payload.length > 0 ? payload : [],
        },
      });
      setOk(true);
      onSiteUpdated?.();
    } catch (err) {
      setError((err as Error).message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (site?.template_id !== 'corporate') {
    return (
      <div className={siteWorkbenchShell}>
        <div className={siteWorkbenchScroll}>
          <div className={siteWorkbenchInner}>
            <p className="text-sm text-slate-500">
              集团介绍仅用于「企业集团」前台模板。请先在「基础信息」中将前台模板切换为企业集团。
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={siteWorkbenchShell}>
        <div className={`${siteWorkbenchScroll} flex items-center justify-center`}>
          <p className="text-slate-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={siteWorkbenchShell}>
      <div className={siteWorkbenchScroll}>
        <div className={siteWorkbenchInner}>
          <div className="space-y-3">
            <h2 className={siteWorkbenchTitle}>集团介绍</h2>
            <p className={siteWorkbenchSubtitle}>
              企业集团模板首页「企业介绍」网格（最多 4 块：标题、英文副标题、描述、配图）。
            </p>
          </div>
          <form onSubmit={handleSave} className={siteFormCard}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">子板块列表</span>
              <button
                type="button"
                onClick={() => setSections([...sections, emptySection()])}
                className={siteLinkAction}
              >
                <Plus className="w-4 h-4" /> 添加板块
              </button>
            </div>
            {sections.map((sec, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">板块 {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setSections(sections.filter((_, i) => i !== idx))}
                    className="text-xs text-red-500 hover:underline"
                  >
                    删除
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="标题（如：子公司介绍）"
                  value={sec.title}
                  onChange={(e) => {
                    const arr = [...sections];
                    arr[idx] = { ...arr[idx], title: e.target.value };
                    setSections(arr);
                  }}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="英文副标题（如：SUBSIDIARY INTRODUCTION）"
                  value={sec.subtitle}
                  onChange={(e) => {
                    const arr = [...sections];
                    arr[idx] = { ...arr[idx], subtitle: e.target.value };
                    setSections(arr);
                  }}
                  className={inputClass}
                />
                <textarea
                  placeholder="简要描述"
                  rows={2}
                  value={sec.description}
                  onChange={(e) => {
                    const arr = [...sections];
                    arr[idx] = { ...arr[idx], description: e.target.value };
                    setSections(arr);
                  }}
                  className={inputClass}
                />
                <div className="space-y-2">
                  <span className="text-xs text-slate-500">配图（上传至 OSS，不超过 5M）</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id={`company-section-img-${idx}`}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleImageUpload(idx, f);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById(`company-section-img-${idx}`)?.click()}
                    disabled={uploading === `section-${idx}`}
                    className="px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {uploading === `section-${idx}` ? '上传中...' : '上传图片'}
                  </button>
                  <div className="w-full max-w-xs aspect-video rounded-xl border flex items-center justify-center overflow-hidden bg-slate-100 border-slate-200">
                    {sec.image ? (
                      <img src={sec.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-slate-400 px-2 text-center">上传后显示预览</span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="或粘贴图片 URL"
                    value={sec.image}
                    onChange={(e) => {
                      const arr = [...sections];
                      arr[idx] = { ...arr[idx], image: e.target.value };
                      setSections(arr);
                    }}
                    className={inputClass}
                  />
                </div>
              </div>
            ))}
            {sections.length === 0 && (
              <p className="text-xs text-slate-400">暂未配置，点击「添加板块」开始</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            {ok && <p className="text-sm text-green-600">已保存，前台缓存将刷新</p>}
            <button type="submit" disabled={saving} className={sitePrimaryBtn}>
              {saving ? '保存中...' : '保存'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SiteCompanySectionsConfig;
