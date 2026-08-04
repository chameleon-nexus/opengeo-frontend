import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Crown, Loader2, Package } from 'lucide-react';
import { creditPackagesAPI } from '../api/creditPackages';
import { ordersAPI, PaymentOrder } from '../api/orders';

interface PackageTier {
  id?: number;
  product_id: string;
  title: string;
  description?: string;
  price?: string;
  pay_price?: string;
  amount?: number;
  original_price?: string;
  unit?: string;
  features?: string[];
  credits?: number;
  valid_months?: number;
  trial_days?: number;
  kind?: string;
  tierType?: string;
  isCurrent?: boolean;
  purchasable?: boolean;
  purchaseBlockedReason?: string;
  actionLabel?: string;
}

interface Props {
  onBack?: () => void;
  initialProductId?: string | null;
  onPaid?: () => void;
}

function formatExpiresAt(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const UserPackageManagement: React.FC<Props> = ({ onBack, initialProductId, onPaid }) => {
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<PackageTier[]>([]);
  const [currentPlanTitle, setCurrentPlanTitle] = useState('');
  const [accessExpiresAt, setAccessExpiresAt] = useState<string | null>(null);
  const [accessExpired, setAccessExpired] = useState(false);
  const [agentPermanentAccess, setAgentPermanentAccess] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [pollError, setPollError] = useState('');
  const [showOrders, setShowOrders] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await creditPackagesAPI.listForMe('zh');
      setTiers(data?.tiers ?? []);
      setCurrentPlanTitle(data?.currentPlanTitle ?? '');
      setAccessExpiresAt(data?.accessExpiresAt ?? data?.access?.access_expires_at ?? null);
      setAccessExpired(Boolean(data?.access?.access_expired));
      setAgentPermanentAccess(Boolean(data?.agentPermanentAccess));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleBuy = async (item: PackageTier) => {
    if (!item.id || item.purchasable === false || item.tierType === 'trial') return;
    setOrdering(true);
    setPollError('');
    setOrder(null);
    try {
      const o = await ordersAPI.create(item.id);
      setOrder(o);
    } catch (e) {
      window.alert((e as Error).message || '下单失败');
    } finally {
      setOrdering(false);
    }
  };

  useEffect(() => {
    if (loading || order || !initialProductId) return;
    const item = tiers.find((i) => i.product_id === initialProductId);
    if (item?.purchasable !== false && item?.id) {
      void handleBuy(item);
    }
  }, [loading, initialProductId, tiers, order]);

  useEffect(() => {
    if (!order || order.status === 'paid') return;
    const t = window.setInterval(async () => {
      try {
        const latest = await ordersAPI.get(order.id);
        setOrder(latest);
        if (latest.status === 'paid') {
          onPaid?.();
          void load();
        }
      } catch {
        setPollError('轮询订单失败');
      }
    }, 2500);
    return () => window.clearInterval(t);
  }, [order, onPaid, load]);

  const qrUrl = order?.codeUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(order.codeUrl)}`
    : '';

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-[#F5F5F7]">
      <div className="shrink-0 px-6 py-4 border-b border-slate-200 bg-white flex items-center gap-3">
        {onBack && (
          <button type="button" onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <Package className="w-5 h-5 text-[#E8553F]" />
        <div>
          <h1 className="text-lg font-semibold">套餐管理</h1>
          <p className="text-xs text-slate-500">购买/升级系统使用权（含赠送积分），与积分充值无关</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin opacity-60" />
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-5 mb-6">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-slate-500">当前套餐：</span>
                  <span className="font-semibold text-[#1a1a1a]">{currentPlanTitle || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500">有效期至：</span>
                  <span className={accessExpired ? 'text-amber-600 font-medium' : 'text-[#1a1a1a]'}>
                    {formatExpiresAt(accessExpiresAt)}
                    {accessExpired ? '（已到期）' : ''}
                  </span>
                </div>
              </div>
            </div>

            {agentPermanentAccess ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 mb-6 text-sm text-emerald-800">
                代理账号享有永久 SaaS 访问权限，无需购买套餐。如需额外积分，请使用积分充值或由 Admin 下发。
              </div>
            ) : null}

            {order ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-4 mb-6">
                {order.status === 'paid' ? (
                  <>
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                    <p className="font-medium text-green-700">支付成功，套餐已生效</p>
                    <button
                      type="button"
                      className="rounded-lg bg-gradient-coral px-6 py-2 text-sm font-semibold text-white"
                      onClick={() => setOrder(null)}
                    >
                      完成
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-600">
                      应付金额：¥{(order.amount / 100).toFixed(2)}
                    </p>
                    <p className="text-sm text-slate-600">请使用微信扫描下方二维码完成支付</p>
                    {qrUrl ? (
                      <img src={qrUrl} alt="支付二维码" className="mx-auto border rounded-lg" width={220} height={220} />
                    ) : (
                      <p className="text-xs break-all text-slate-500">{order.codeUrl}</p>
                    )}
                    <p className="text-xs text-slate-400">订单号：{order.outTradeNo}</p>
                    {pollError && <p className="text-xs text-red-500">{pollError}</p>}
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#E8553F]" />
                    <button
                      type="button"
                      className="text-sm text-slate-500 hover:text-slate-700"
                      onClick={() => setOrder(null)}
                    >
                      取消支付
                    </button>
                  </>
                )}
              </div>
            ) : null}

            {!agentPermanentAccess ? (
            <div className="grid gap-5 md:grid-cols-3">
              {tiers.map((item) => {
                const isTrial = item.tierType === 'trial' || item.kind === 'trial';
                const isCurrent = Boolean(item.isCurrent);
                return (
                  <div
                    key={item.product_id}
                    className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${
                      isCurrent ? 'border-[#E8553F] ring-2 ring-[#E8553F]/20' : 'border-slate-200'
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-[#E8553F] px-3 py-0.5 text-xs font-bold text-white">
                        <Crown className="w-3 h-3" />
                        当前生效
                      </span>
                    )}
                    <h3 className="text-xl font-bold text-[#1a1a1a]">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-500 min-h-[2.5rem]">{item.description}</p>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-3xl font-black text-[#E8553F]">
                        {item.pay_price ||
                          (item.amount != null && item.amount > 0
                            ? `¥${(item.amount / 100).toFixed(2).replace(/\.?0+$/, '')}`
                            : item.price || '免费')}
                      </span>
                      {item.original_price && (
                        <span className="text-sm text-slate-400 line-through">{item.original_price}</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {isTrial
                        ? `${item.trial_days ?? 7} 天体验`
                        : `${item.credits ?? 0} 积分 · ${item.valid_months ?? 0} 个月`}
                    </p>
                    <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
                      {(item.features || []).slice(0, 5).map((f) => (
                        <li key={f} className="flex gap-2">
                          <span className="text-[#E8553F]">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6">
                      {isTrial ? (
                        <div className="w-full rounded-lg border border-slate-200 py-2.5 text-center text-sm text-slate-500">
                          {item.actionLabel || '免费体验'}
                        </div>
                      ) : item.purchasable === false ? (
                        <div className="space-y-1">
                          <div className="w-full rounded-lg border border-amber-200 bg-amber-50 py-2.5 text-center text-sm text-amber-700">
                            {item.actionLabel || '不可购买'}
                          </div>
                          {item.purchaseBlockedReason && (
                            <p className="text-xs text-amber-600 text-center">{item.purchaseBlockedReason}</p>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={ordering}
                          onClick={() => handleBuy(item)}
                          className="w-full rounded-lg bg-gradient-coral py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {ordering ? '处理中…' : item.actionLabel || '立即购买'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            ) : null}

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setShowOrders((v) => !v)}
                className="text-sm text-slate-500 hover:text-[#E8553F]"
              >
                {showOrders ? '收起购买记录' : '查看购买记录'}
              </button>
            </div>

            {showOrders && (
              <div className="mt-4">
                <PurchaseOrdersInline />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

function PurchaseOrdersInline() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PaymentOrder[]>([]);

  useEffect(() => {
    ordersAPI
      .listMine(0, 10)
      .then(({ items: rows }) => setItems(rows))
      .finally(() => setLoading(false));
  }, []);

  const STATUS_LABEL: Record<string, string> = {
    pending: '待支付',
    paid: '已支付',
    closed: '已关闭',
    failed: '失败',
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin opacity-60" />
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="text-center text-slate-500 py-6 text-sm">暂无购买记录</p>;
  }
  return (
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
  );
}

export default UserPackageManagement;
