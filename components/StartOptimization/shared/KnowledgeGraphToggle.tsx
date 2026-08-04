/**
 * 「开启知识图谱增强」复选框 + 通过弹窗选择知识库材料
 * 与「快速开始」第一步的 enableKnowledgeGraph + files 完全一致
 */
import React, { useMemo, useState } from 'react';
import KnowledgeBaseMaterialsUploadModal from './KnowledgeBaseMaterialsUploadModal';
import { brandParseAllowedFormatsLabel } from '../../../utils/brandParseUpload';

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
  enabled: boolean;
  onChangeEnabled: (next: boolean) => void;
  files: File[];
  onChangeFiles: (next: File[]) => void;
  /** 用于关联文件 input 的 id（多个组件并存时需手动避免冲突） */
  inputId?: string;
  /** AI 分析行业等场景：须上传材料 */
  materialsRequired?: boolean;
  materialsRequiredHint?: string;
  /** 新工作流表单等场景：隐藏「开启知识图谱增强」复选框，仅保留材料上传 */
  hideKnowledgeGraphToggle?: boolean;
}

const KnowledgeGraphToggle: React.FC<Props> = ({
  enabled,
  onChangeEnabled,
  files,
  onChangeFiles,
  inputId = 'start-opt-files',
  materialsRequired = false,
  materialsRequiredHint,
  hideKnowledgeGraphToggle = false,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const allowedLabel = brandParseAllowedFormatsLabel();

  const summary = useMemo(() => {
    if (files.length === 0) return '未选择文件';
    const total = files.reduce((s, f) => s + (f.size || 0), 0);
    return `已选 ${files.length} 个文件 · 合计 ${formatTotalBytes(total)}`;
  }, [files]);

  return (
    <div className="space-y-4">
      {!hideKnowledgeGraphToggle ? (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-[#f8f9fb] px-4 py-3 hover:border-orange-200">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onChangeEnabled(e.target.checked)}
            className="h-4 w-4 shrink-0 rounded border-slate-400 text-[#E8553F] focus:ring-[#E8553F]"
          />
          <span className="text-sm font-semibold text-[#374151]">开启知识图谱增强</span>
        </label>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-[#f8f9fb] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#374151]">
              知识库材料
              {materialsRequired && <span className="text-[#E8553F] ml-0.5">*</span>}
            </p>
            <p className="mt-1 text-xs text-[#64748b]">{summary}</p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-[#111827] shadow-sm transition hover:border-orange-200/90 hover:bg-orange-50/50"
            onClick={() => setModalOpen(true)}
          >
            上传材料
          </button>
        </div>
        <p className="mt-2 text-xs text-[#64748b]">
          {materialsRequired
            ? materialsRequiredHint ||
              'AI 分析行业须先创建知识库：请上传材料。'
            : `可选；仅支持 ${allowedLabel}。在开始生成词包时一并上传。`}
        </p>
      </div>

      <KnowledgeBaseMaterialsUploadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        files={files}
        onChangeFiles={onChangeFiles}
        inputId={inputId}
      />
    </div>
  );
};

export default KnowledgeGraphToggle;
