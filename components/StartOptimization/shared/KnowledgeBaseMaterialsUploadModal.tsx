/**
 * 知识库材料上传弹窗（与优化工作流 BrandInput / KnowledgeGraphToggle 同一套格式校验）
 */
import React, { useState } from 'react';
import { FileText, FileUp, X } from 'lucide-react';
import {
  BRAND_PARSE_ACCEPT_ATTR,
  brandParseAllowedFormatsLabel,
  filterBrandParseUploadFiles,
} from '../../../utils/brandParseUpload';

function formatTotalBytes(total: number): string {
  if (total <= 0) return '0 B';
  const kb = total / 1024;
  if (kb < 1024) return `${kb >= 100 ? Math.round(kb) : kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb >= 100 ? Math.round(mb) : mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb >= 10 ? gb.toFixed(1) : gb.toFixed(2)} GB`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  files: File[];
  onChangeFiles: (next: File[]) => void;
  inputId?: string;
}

const KnowledgeBaseMaterialsUploadModal: React.FC<Props> = ({
  open,
  onClose,
  files,
  onChangeFiles,
  inputId = 'kb-materials-upload',
}) => {
  const [formatHint, setFormatHint] = useState<string | null>(null);
  const allowedLabel = brandParseAllowedFormatsLabel();

  if (!open) return null;

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    const { accepted, rejected } = filterBrandParseUploadFiles(Array.from(list));
    if (rejected.length > 0) {
      setFormatHint(
        `以下文件格式不支持（仅支持 ${allowedLabel}），未加入列表：${rejected.join('、')}`
      );
    } else {
      setFormatHint(null);
    }
    if (accepted.length > 0) {
      onChangeFiles([...files, ...accepted]);
    }
    e.target.value = '';
  };

  const removeFile = (i: number) => {
    onChangeFiles(files.filter((_, idx) => idx !== i));
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <div
        role="presentation"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${inputId}-kb-title`}
          className="relative flex max-h-[min(90vh,32rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="min-w-0">
              <h3 id={`${inputId}-kb-title`} className="text-lg font-semibold tracking-tight text-[#111827]">
                上传知识库材料
              </h3>
              <p className="mt-1 text-xs text-[#64748b]">支持多文件；仅支持 {allowedLabel}</p>
            </div>
            <button
              type="button"
              aria-label="关闭"
              className="shrink-0 rounded-full p-2 text-[#64748b] hover:bg-slate-100"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto overscroll-y-contain px-5 py-4">
            {formatHint ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {formatHint}
              </div>
            ) : null}
            <input
              id={inputId}
              type="file"
              multiple
              accept={BRAND_PARSE_ACCEPT_ATTR}
              className="sr-only"
              onChange={onPickFiles}
            />
            <label
              htmlFor={inputId}
              className="inline-flex max-w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-100 bg-[#f8f9fb] px-3 py-2.5 transition hover:border-orange-200/90 hover:bg-orange-50/40 sm:max-w-md"
            >
              <FileUp className="h-10 w-10 shrink-0 rounded-lg bg-orange-500/15 p-2 text-orange-600" />
              <span className="min-w-0 text-sm font-medium text-[#111827]">选择文件</span>
            </label>
            <ul className="max-h-[min(40vh,14rem)] space-y-2 overflow-y-auto overscroll-y-contain pr-0.5">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}-${f.size}`}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-slate-100 bg-[#f8f9fb] px-3 py-2.5"
                >
                  <FileText className="h-10 w-10 shrink-0 rounded-lg bg-white p-2 text-slate-500 ring-1 ring-slate-100" />
                  <span className="min-w-0 break-words text-sm font-medium leading-snug text-[#111827]">
                    {f.name || `未命名文件 ${i + 1}`}{' '}
                    <span className="font-normal text-[#64748b]">
                      （{formatTotalBytes(f.size || 0)}）
                    </span>
                  </span>
                  <button
                    type="button"
                    className="shrink-0 rounded px-2 text-sm text-red-500 hover:underline"
                    onClick={() => removeFile(i)}
                  >
                    移除
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <footer className="shrink-0 border-t border-slate-100 px-5 py-3">
            <button
              type="button"
              className="w-full rounded-xl bg-[#E8553F] py-2.5 text-sm font-semibold text-white transition hover:bg-[#d94a36]"
              onClick={onClose}
            >
              完成
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseMaterialsUploadModal;
