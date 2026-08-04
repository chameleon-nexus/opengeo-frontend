import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Coins, Loader2, Minus, Plus, X } from 'lucide-react';
import { creditsPurchaseAPI, type CreditsPurchaseOptions } from '../api/creditsPurchase';
import { ordersAPI, PaymentOrder } from '../api/orders';

interface Props {
  open: boolean;
  onClose: () => void;
  onPaid?: () => void;
}

const CreditsRechargeDrawer: React.FC<Props> = ({ open, onClose, onPaid }) => {
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<CreditsPurchaseOptions | null>(null);
  const [customCredits, setCustomCredits] = useState(1000);
  const [ordering, setOrdering] = useState(false);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [pollError, setPollError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const opts = await creditsPurchaseAPI.getOptions();
      setOptions(opts);
      setCustomCredits(opts.customStartCredits ?? 1000);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setOrder(null);
      setPollError('');
      load();
    }
  }, [open, load]);

  const handleBuy = async (credits: number) => {
    setOrdering(true);
    setPollError('');
    try {
      const o = await creditsPurchaseAPI.createOrder(credits);
      setOrder(o);
    } catch (e) {
      window.alert((e as Error).message || '下单失败');
    } finally {
      setOrdering(false);
    }
  };

  useEffect(() => {
    if (!order || order.status === 'paid') return;
    const t = window.setInterval(async () => {
      try {
        const latest = await ordersAPI.get(order.id);
        setOrder(latest);
        if (latest.status === 'paid') {
          onPaid?.();
        }
      } catch {
        setPollError('轮询订单失败');
      }
    }, 2500);
    return () => window.clearInterval(t);
  }, [order, onPaid]);

  if (!open) return null;

  const qrUrl = order?.codeUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(order.codeUrl)}`
    : '';

  const step = options?.stepCredits ?? 500;
  const customMin = options?.customStartCredits ?? 1000;
  const unitFen = options?.unitPriceFen ?? 10;
  const customPriceYuan = ((customCredits * unitFen) / 100).toFixed(2);

  const decreaseCustom = () => {
    setCustomCredits((v) => Math.max(customMin, v - step));
  };

  const increaseCustom = () => {
    setCustomCredits((v) => v + step);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="关闭" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#E8553F]" />
            积分充值
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          直接购买积分，与套餐（系统使用权）无关。支付成功后积分立即到账。
        </p>

        {order ? (
          <div className="text-center space-y-4 py-4">
            {order.status === 'paid' ? (
              <>
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <p className="font-medium text-green-700">
                  充值成功，已到账 {order.credits ?? ''} 积分
                </p>
                <button type="button" className="btn-primary px-6 py-2 rounded-lg" onClick={onClose}>
                  完成
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-600">
                  充值 {order.credits} 积分 · ¥{(order.amount / 100).toFixed(2)}
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
              </>
            )}
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin opacity-60" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(options?.presets ?? [
                { credits: 500, priceDisplay: '—', amountFen: 0 },
                { credits: 1000, priceDisplay: '—', amountFen: 0 },
              ]).map((p) => (
                <button
                  key={p.credits}
                  type="button"
                  disabled={ordering || !options?.enabled}
                  onClick={() => handleBuy(p.credits)}
                  className="rounded-xl border border-slate-200 p-4 text-left hover:border-[#E8553F] hover:bg-[#E8553F]/5 transition-colors disabled:opacity-60"
                >
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#E8553F]">{p.credits}</span>
                    <span className="text-sm font-medium text-[#D4AF37]">积分</span>
                  </div>
                  <div className="text-sm font-semibold mt-2">{p.priceDisplay}</div>
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="text-sm font-medium text-slate-800">自定义购买</div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={ordering || !options?.enabled || customCredits <= customMin}
                  onClick={decreaseCustom}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  aria-label="减少500积分"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <div className="flex-1 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-2xl font-bold text-[#E8553F] tabular-nums">{customCredits}</span>
                    <span className="text-sm font-medium text-[#D4AF37]">积分</span>
                  </div>
                  <div className="text-sm font-semibold mt-2">¥{customPriceYuan}</div>
                </div>
                <button
                  type="button"
                  disabled={ordering || !options?.enabled}
                  onClick={increaseCustom}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  aria-label="增加500积分"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <button
                type="button"
                disabled={ordering || !options?.enabled}
                onClick={() => handleBuy(customCredits)}
                className="w-full rounded-lg bg-gradient-coral py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {ordering ? '处理中…' : `充值 ${customCredits} 积分`}
              </button>
            </div>

            {options?.hint ? (
              <p className="text-xs text-slate-400 text-center">{options.hint}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditsRechargeDrawer;
