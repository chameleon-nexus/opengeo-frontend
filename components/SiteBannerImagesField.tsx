import React, { useRef } from 'react';
import { Loader2, Sparkles, Upload, X } from 'lucide-react';
import { uploadSiteAsset } from '../lib/siteAssetUpload';
import { IMAGE_PREVIEW_BOX } from './SiteImageAssetField';

const MAX_BANNERS = 4;

interface Props {
  label: string;
  hint?: string;
  images: string[];
  onChange: (images: string[], primaryUrl: string) => void;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
  onGenerate?: () => Promise<void>;
  uploading?: boolean;
  generating?: boolean;
}

const SiteBannerImagesField: React.FC<Props> = ({
  label,
  hint,
  images,
  onChange,
  onUploadStart,
  onUploadEnd,
  onGenerate,
  uploading = false,
  generating = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = uploading || generating;
  const atLimit = images.length >= MAX_BANNERS;

  const appendImage = (url: string) => {
    const next = [...images, url].slice(0, MAX_BANNERS);
    onChange(next, next[0] || '');
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (atLimit) {
      alert(`最多 ${MAX_BANNERS} 张 Banner 图`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Banner 图不超过 5M');
      return;
    }
    onUploadStart?.();
    try {
      const url = await uploadSiteAsset(file, 'background');
      appendImage(url);
    } catch (err) {
      alert((err as Error).message || '上传失败');
    } finally {
      onUploadEnd?.();
      e.target.value = '';
    }
  };

  const removeAt = (idx: number) => {
    const next = images.filter((_, i) => i !== idx);
    onChange(next, next[0] || '');
  };

  const handleGenerate = async () => {
    if (atLimit) {
      alert(`最多 ${MAX_BANNERS} 张 Banner 图`);
      return;
    }
    if (!onGenerate) return;
    await onGenerate();
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {hint && <p className="mb-2 text-xs text-slate-500">{hint}</p>}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        <button
          type="button"
          disabled={busy || atLimit}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          上传图片 ({images.length}/{MAX_BANNERS})
        </button>
        {onGenerate && (
          <button
            type="button"
            disabled={busy || atLimit}
            onClick={() => void handleGenerate()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI 生成
          </button>
        )}
        {images.length > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onChange([], '')}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            全部清除
          </button>
        )}
      </div>

      {images.length === 0 ? (
        <div className={`rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden ${IMAGE_PREVIEW_BOX}`}>
          <span className="text-xs text-slate-400 px-2 text-center">上传或 AI 生成后预览</span>
        </div>
      ) : (
        <div className="space-y-3">
          {images.map((img, idx) => (
            <div key={`${img}-${idx}`} className="relative">
              <div className={`rounded-xl border border-slate-200 bg-slate-50 overflow-hidden ${IMAGE_PREVIEW_BOX}`}>
                <img src={img} alt={`Banner ${idx + 1}`} className="w-full h-full object-cover" />
              </div>
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500"
                aria-label="删除"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/50 text-white text-xs">
                {idx === 0 ? '主图' : `轮播 ${idx + 1}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SiteBannerImagesField;
