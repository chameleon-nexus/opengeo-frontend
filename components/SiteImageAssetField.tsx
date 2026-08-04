import React, { useRef } from 'react';
import { Loader2, Sparkles, Upload } from 'lucide-react';
import { uploadSiteAsset } from '../lib/siteAssetUpload';

/** 所有站点图片预览框统一尺寸 */
export const IMAGE_PREVIEW_BOX = 'w-full max-w-md h-40';

type UploadAssetType = 'logo' | 'favicon' | 'background' | 'og_image';

interface Props {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  uploadType: UploadAssetType;
  onGenerate?: () => Promise<void>;
  generating?: boolean;
  uploading?: boolean;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
  accept?: string;
  maxSizeMb?: number;
}

const SiteImageAssetField: React.FC<Props> = ({
  label,
  hint,
  value,
  onChange,
  uploadType,
  onGenerate,
  generating = false,
  uploading = false,
  onUploadStart,
  onUploadEnd,
  accept = 'image/*',
  maxSizeMb = 5,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = uploading || generating;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      alert(`图片大小不超过 ${maxSizeMb >= 1 ? `${maxSizeMb}M` : `${Math.round(maxSizeMb * 1024)}KB`}`);
      return;
    }
    onUploadStart?.();
    try {
      const url = await uploadSiteAsset(file, uploadType);
      onChange(url);
    } catch (err) {
      alert((err as Error).message || '上传失败');
    } finally {
      onUploadEnd?.();
      e.target.value = '';
    }
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {hint && <p className="mb-2 text-xs text-slate-500">{hint}</p>}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleUpload} />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          上传图片
        </button>
        {onGenerate && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onGenerate()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI 生成
          </button>
        )}
      </div>
      <div className={`rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden ${IMAGE_PREVIEW_BOX}`}>
        {value ? (
          <img src={value} alt="" className="w-full h-full object-contain" />
        ) : (
          <span className="text-xs text-slate-400 px-2 text-center">上传或 AI 生成后预览</span>
        )}
      </div>
    </div>
  );
};

export default SiteImageAssetField;
