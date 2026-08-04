import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react';
import {
  listThirdPartyMediaOutlets,
  type ThirdPartyMediaOutletDTO,
} from '../../../api/thirdPartyMedia';

const PAGE_SIZE = 8;

interface Props {
  open: boolean;
  onClose: () => void;
  selectedIds: number[];
  onSave: (ids: number[], items: ThirdPartyMediaOutletDTO[]) => void;
}

const ThirdPartyMediaWhitelistModal: React.FC<Props> = ({
  open,
  onClose,
  selectedIds,
  onSave,
}) => {
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<ThirdPartyMediaOutletDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [draftIds, setDraftIds] = useState<Set<number>>(new Set());
  const [draftItems, setDraftItems] = useState<Map<number, ThirdPartyMediaOutletDTO>>(new Map());

  useEffect(() => {
    if (!open) return;
    setDraftIds(new Set(selectedIds));
    setPage(1);
    setSearchInput('');
    setSearchApplied('');
  }, [open, selectedIds]);

  const loadPage = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const res = await listThirdPartyMediaOutlets({
        page,
        page_size: PAGE_SIZE,
        market: 'domestic',
        q: searchApplied || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [open, page, searchApplied]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (!open || selectedIds.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await listThirdPartyMediaOutlets({
          page: 1,
          page_size: 200,
          ids: selectedIds,
        });
        if (cancelled) return;
        setDraftItems((prev) => {
          const next = new Map(prev);
          for (const it of res.items) next.set(it.id, it);
          return next;
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, selectedIds]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggle = (it: ThirdPartyMediaOutletDTO) => {
    setDraftIds((prev) => {
      const next = new Set(prev);
      if (next.has(it.id)) next.delete(it.id);
      else next.add(it.id);
      return next;
    });
    setDraftItems((prev) => {
      const next = new Map(prev);
      if (next.has(it.id)) next.delete(it.id);
      else next.set(it.id, it);
      return next;
    });
  };

  const handleSave = () => {
    const ids = Array.from(draftIds);
    const resolved = ids
      .map((id) => draftItems.get(id))
      .filter((x): x is ThirdPartyMediaOutletDTO => Boolean(x));
    onSave(ids, resolved);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">选择合作媒体</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              可不选（默认全部合作媒体）；选中后仅限定周期自动入队的可发稿范围，终选由运营在发稿待办完成
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-50 px-5 py-3">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearchApplied(searchInput.trim());
                  setPage(1);
                }
              }}
              placeholder="搜索媒体名称"
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
            onClick={() => {
              setSearchApplied(searchInput.trim());
              setPage(1);
            }}
          >
            搜索
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载中…
            </div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">暂无媒体</p>
          ) : (
            <ul className="space-y-2">
              {items.map((it) => (
                <li key={it.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-3 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 rounded border-slate-300"
                      checked={draftIds.has(it.id)}
                      onChange={() => toggle(it)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{it.name}</span>
                        <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                          {it.accountType}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        发稿成功率 {it.successRate}% · {it.pricePoints} 积分/篇
                      </p>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded p-1 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>
              {page} / {totalPages}（共 {total} 家）
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded p-1 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <span className="text-xs text-slate-600">已选 {draftIds.size} 家</span>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-[#E8553F] px-4 py-2 text-sm font-semibold text-white"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThirdPartyMediaWhitelistModal;
