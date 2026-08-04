import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Receipt } from 'lucide-react';
import { ordersAPI, PaymentOrder } from '../api/orders';
import Pagination from './Pagination';

interface Props {
  onBack?: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  closed: '已关闭',
  failed: '失败',
};

const PurchaseOrderList: React.FC<Props> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PaymentOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items: rows, total: t } = await ordersAPI.listMine((page - 1) * pageSize, pageSize);
      setItems(rows);
      setTotal(t);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-[#F5F5F7]">
      <div className="shrink-0 px-6 py-4 border-b border-slate-200 bg-white flex items-center gap-3">
        {onBack && (
          <button type="button" onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <Receipt className="w-5 h-5 text-[#E8553F]" />
        <h1 className="text-lg font-semibold">购买记录</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin opacity-60" /></div>
        ) : items.length === 0 ? (
          <p className="text-center text-slate-500 py-12">暂无购买记录</p>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3">套餐</th>
                    <th className="text-left p-3">金额</th>
                    <th className="text-left p-3">状态</th>
                    <th className="text-left p-3">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((o) => (
                    <tr key={o.id} className="border-t border-slate-100">
                      <td className="p-3">{o.packageTitle || o.productId}</td>
                      <td className="p-3">¥{(o.amount / 100).toFixed(2)}</td>
                      <td className="p-3">{STATUS_LABEL[o.status] || o.status}</td>
                      <td className="p-3 text-xs">{o.createdAt?.slice(0, 19).replace('T', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrderList;
