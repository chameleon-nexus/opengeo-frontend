import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Theme } from '../types';
import { ordersAPI, PaymentOrder } from '../api/orders';
import Pagination from './Pagination';
import {
  ADMIN_PAGE_SHELL_CLS,
  adminCardCls,
  adminPageOuterCls,
  adminSubtitleCls,
  adminTitleCls,
} from '../utils/adminPageStyles';

interface Props {
  theme: Theme;
}

const STATUS_LABEL: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  closed: '已关闭',
  failed: '失败',
};

const PaymentOrderList: React.FC<Props> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PaymentOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [outTradeNo, setOutTradeNo] = useState('');
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items: rows, total: t } = await ordersAPI.adminList({
        status: status || undefined,
        outTradeNo: outTradeNo || undefined,
        skip: (page - 1) * pageSize,
        limit: pageSize,
      });
      setItems(rows);
      setTotal(t);
    } finally {
      setLoading(false);
    }
  }, [page, status, outTradeNo]);

  useEffect(() => {
    load();
  }, [load]);

  const inputCls = `rounded-lg border px-3 py-1.5 text-sm ${
    isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-200'
  }`;

  const cardCls = adminCardCls(isDark);

  return (
    <div className={adminPageOuterCls(isDark)}>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className={ADMIN_PAGE_SHELL_CLS}>
          <div>
            <h1 className={adminTitleCls(isDark)}>支付订单</h1>
            <p className={adminSubtitleCls(isDark)}>查询微信支付订单记录与支付状态</p>
          </div>
        <div className="flex flex-wrap gap-2">
          <select className={inputCls} value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">全部状态</option>
            <option value="pending">待支付</option>
            <option value="paid">已支付</option>
          </select>
          <input
            className={inputCls}
            placeholder="订单号"
            value={outTradeNo}
            onChange={(e) => setOutTradeNo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <button type="button" className="btn-geo-primary shrink-0 px-3 py-1.5 text-sm font-semibold" onClick={() => { setPage(1); load(); }}>
            查询
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin opacity-60" /></div>
        ) : (
          <>
            <div className={`${cardCls} overflow-x-auto`}>
              <table className="w-full text-sm min-w-[720px]">
                <thead className={isDark ? 'bg-zinc-900' : 'bg-slate-100'}>
                  <tr>
                    <th className="text-left p-3">订单号</th>
                    <th className="text-left p-3">套餐</th>
                    <th className="text-left p-3">金额</th>
                    <th className="text-left p-3">状态</th>
                    <th className="text-left p-3">创建时间</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((o) => (
                    <tr key={o.id} className={isDark ? 'border-t border-zinc-800' : 'border-t border-slate-100'}>
                      <td className="p-3 font-mono text-xs">{o.outTradeNo}</td>
                      <td className="p-3">{o.packageTitle || o.productId}</td>
                      <td className="p-3">¥{(o.amount / 100).toFixed(2)}</td>
                      <td className="p-3">{STATUS_LABEL[o.status] || o.status}</td>
                      <td className="p-3 text-xs">{o.createdAt?.slice(0, 19).replace('T', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </>
        )}
        </div>
      </div>
    </div>
  );
};

export default PaymentOrderList;
