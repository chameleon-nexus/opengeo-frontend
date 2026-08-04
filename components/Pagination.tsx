import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isDark?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, total, pageSize, onPageChange, isDark = false }) => {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  const pages: number[] = [];
  for (let i = startPage; i <= endPage; i++) pages.push(i);

  const btnBase = `w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors`;
  const btnNormal = isDark
    ? `${btnBase} border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white`
    : `${btnBase} border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900`;
  const btnActive = isDark
    ? `${btnBase} bg-blue-600 text-white border border-blue-600`
    : `${btnBase} bg-blue-500 text-white border border-blue-500`;
  const btnDisabled = isDark
    ? `${btnBase} border border-white/5 text-gray-600 cursor-not-allowed`
    : `${btnBase} border border-gray-100 text-gray-300 cursor-not-allowed`;

  return (
    <div className={`flex items-center justify-between px-6 py-3 border-t ${isDark ? 'border-white/5 bg-zinc-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
      <span className={`text-xs font-medium px-3 py-1 rounded-md border ${isDark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}>
        {startItem}-{endItem} / {total}
      </span>
      <div className={`inline-flex items-center gap-1 p-1 rounded-xl border ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-200'}`}>
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={currentPage === 1 ? btnDisabled : btnNormal}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={currentPage === p ? btnActive : btnNormal}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className={currentPage >= totalPages ? btnDisabled : btnNormal}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
