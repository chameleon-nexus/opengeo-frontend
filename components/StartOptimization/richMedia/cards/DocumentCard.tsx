import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { ModuleType } from '../../../../types';

export interface DocumentDeepLink {
  module: string;
  reportId?: number;
  taskId?: string;
  workflowId?: string;
}

interface Props {
  title: string;
  docKind: string;
  refId: string | number;
  downloadUrl?: string;
  deepLink?: DocumentDeepLink;
  onOpen?: (m: ModuleType, opts: { reportId?: number; taskId?: string; workflowId?: string }) => void;
}

const DocumentCard: React.FC<Props> = ({ title, docKind, downloadUrl, deepLink, onOpen }) => {
  const open = () => {
    if (!onOpen || !deepLink) return;
    const mod = deepLink.module;
    if (mod === 'DIAGNOSIS_REPORT') {
      onOpen(ModuleType.DIAGNOSIS_REPORT, {
        reportId: deepLink.reportId,
        workflowId: deepLink.workflowId,
      });
    } else if (mod === 'OPTIMIZATION_BOT') {
      onOpen(ModuleType.OPTIMIZATION_BOT, { taskId: deepLink.taskId, workflowId: deepLink.workflowId });
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 flex gap-2 shadow-sm">
      <div className="w-10 h-10 rounded-lg bg-[#FFF6F2] flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5 text-[#E8553F]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-gray-900 truncate">{title}</div>
        <div className="text-[10px] text-gray-400 mt-0.5">{docKind}</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {onOpen && deepLink && (
            <button
              type="button"
              onClick={open}
              className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 inline-flex items-center gap-0.5 hover:bg-gray-200"
            >
              <ExternalLink className="w-3 h-3" />
              查看
            </button>
          )}
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] px-2 py-0.5 rounded-md bg-[#E8553F] text-white"
            >
              下载
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentCard;
