import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Theme } from '../types';
import { creditPackagesAPI, CreditPackageAdmin, PackageChannel } from '../api/creditPackages';
import {
  ADMIN_PAGE_SHELL_CLS,
  adminCardCls,
  adminLoadingCls,
  adminPageOuterCls,
  adminSubtitleCls,
  adminTitleCls,
} from '../utils/adminPageStyles';

const SAAS_BILLING_GROUP_OPTIONS: { value: string; label: string }[] = [
  { value: 'one-time', label: '一次性付费' },
  { value: 'monthly', label: '月付' },
  { value: 'yearly', label: '年付' },
];

const KIND_OPTIONS: { value: string; label: string }[] = [
  { value: 'paid', label: '付费套餐' },
  { value: 'trial', label: '免费体验' },
];

const CHANNEL_TABS: { value: PackageChannel; label: string }[] = [
  { value: 'saas', label: 'SaaS 套餐' },
  { value: 'mini', label: '小程序套餐' },
];

function kindLabel(value: string): string {
  return KIND_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** ¥2999 / 2999 → 2999（元，用于表单回填） */
function parseYuanFromDisplay(s?: string | null): number | '' {
  if (!s) return '';
  const n = parseFloat(String(s).replace(/[¥,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : '';
}

function formatYuanLabel(yuan: number): string {
  return `¥${yuan.toFixed(2).replace(/\.?0+$/, '')}`;
}

interface Props {
  theme: Theme;
}

const emptyForm = (channel: PackageChannel): Partial<CreditPackageAdmin> & { productId: string; title: string } => ({
  productId: '',
  title: '',
  description: '',
  features: [],
  amount: 0,
  currency: 'CNY',
  priceDisplay: '',
  originalPriceDisplay: '',
  credits: channel === 'mini' ? 1 : 0,
  validMonths: channel === 'mini' ? 0 : 1,
  billingGroup: channel === 'mini' ? 'mini-report' : 'one-time',
  kind: 'paid',
  enabled: true,
  isFeatured: false,
  sortOrder: 0,
});

const CreditPackageSettings: React.FC<Props> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [channel, setChannel] = useState<PackageChannel>('saas');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CreditPackageAdmin[]>([]);
  const [editing, setEditing] = useState<(Partial<CreditPackageAdmin> & { productId: string; title: string }) | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await creditPackagesAPI.adminList(channel));
    } finally {
      setLoading(false);
    }
  }, [channel]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setEditing(null);
    setEditId(null);
  }, [channel]);

  const inputCls = `w-full rounded-lg border px-2 py-1.5 text-sm ${
    isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-200'
  }`;

  const startEdit = (row?: CreditPackageAdmin) => {
    if (row) {
      setEditId(row.id);
      setEditing({ ...row, features: row.features ?? [] });
    } else {
      setEditId(null);
      setEditing(emptyForm(channel));
    }
  };

  const handleSave = async () => {
    if (!editing?.productId || !editing.title) {
      window.alert('请填写 productId 与标题');
      return;
    }
    const payload = {
      ...editing,
      billingGroup: channel === 'mini' ? 'mini-report' : (editing.billingGroup ?? 'one-time'),
      validMonths: channel === 'mini' ? 0 : (editing.validMonths ?? 1),
      kind: channel === 'mini' ? 'paid' : (editing.kind ?? 'paid'),
    };
    setSaving(true);
    try {
      if (editId) {
        await creditPackagesAPI.adminUpdate(editId, payload as any, channel);
      } else {
        await creditPackagesAPI.adminCreate(payload as any, channel);
      }
      setEditing(null);
      setEditId(null);
      await load();
    } catch (e) {
      window.alert((e as Error).message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除该套餐？')) return;
    try {
      await creditPackagesAPI.adminDelete(id, channel);
      await load();
    } catch (e) {
      window.alert((e as Error).message || '删除失败');
    }
  };

  if (loading) {
    return (
      <div className={adminLoadingCls(isDark)}>
        <Loader2 className="w-6 h-6 animate-spin opacity-60" />
      </div>
    );
  }

  const isMini = channel === 'mini';
  const cardCls = adminCardCls(isDark);

  return (
    <div className={adminPageOuterCls(isDark)}>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className={ADMIN_PAGE_SHELL_CLS}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className={adminTitleCls(isDark)}>套餐管理</h1>
              <p className={adminSubtitleCls(isDark)}>
                {isMini
                  ? '仅小程序购买页展示；计费分组固定为 mini-report，积分字段表示报告次数。'
                  : 'SaaS 官网、用户套餐页与扫码购买使用；不含小程序按次报告包。'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => startEdit()}
              className="btn-geo-primary shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> 新建
            </button>
          </div>

        <div className={`inline-flex rounded-lg border p-1 ${isDark ? 'border-zinc-700 bg-zinc-900' : 'border-slate-200 bg-white'}`}>
          {CHANNEL_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setChannel(tab.value)}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                channel === tab.value
                  ? 'bg-gradient-coral text-white'
                  : isDark
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={cardCls}>
          <table className="w-full text-sm">
            <thead className={isDark ? 'bg-zinc-900' : 'bg-slate-100'}>
              <tr>
                <th className="text-left p-3">productId</th>
                <th className="text-left p-3">标题</th>
                <th className="text-left p-3">实际支付</th>
                <th className="text-left p-3">展示价</th>
                <th className="text-left p-3">原价</th>
                <th className="text-left p-3">{isMini ? '报告次数' : '周期月'}</th>
                <th className="text-left p-3">类型</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className={`p-6 text-center ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                    暂无{isMini ? '小程序' : 'SaaS'}套餐
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className={isDark ? 'border-t border-zinc-800' : 'border-t border-slate-100'}>
                    <td className="p-3 font-mono text-xs">{row.productId}</td>
                    <td className="p-3">{row.title}</td>
                    <td className="p-3 font-medium">¥{(row.amount / 100).toFixed(2).replace(/\.?0+$/, '')}</td>
                    <td className="p-3 text-slate-500">{row.priceDisplay || '—'}</td>
                    <td className="p-3 text-slate-500 line-through">{row.originalPriceDisplay || '—'}</td>
                    <td className="p-3">{isMini ? row.credits : row.validMonths}</td>
                    <td className="p-3">{kindLabel(row.kind)}</td>
                    <td className="p-3 text-right space-x-2">
                      <button type="button" className="text-[#E8553F]" onClick={() => startEdit(row)}>编辑</button>
                      {row.kind !== 'trial' && (
                        <button type="button" className="text-red-500" onClick={() => handleDelete(row.id)}>
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {editing && (
          <div className={`${cardCls} p-6 space-y-3`}>
            <h3 className="font-semibold">
              {editId ? '编辑' : '新建'}
              {isMini ? '小程序' : 'SaaS'}
              套餐
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs">productId</label>
                <input className={inputCls} value={editing.productId} onChange={(e) => setEditing({ ...editing, productId: e.target.value })} />
              </div>
              <div>
                <label className="text-xs">标题</label>
                <input className={inputCls} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <label className="text-xs">实际支付金额（分）</label>
                <input
                  className={inputCls}
                  type="number"
                  value={editing.amount ?? 0}
                  onChange={(e) => setEditing({ ...editing, amount: Number(e.target.value) })}
                />
                <p className="text-xs text-slate-400 mt-0.5">
                  {editing.amount
                    ? `= ¥${((editing.amount ?? 0) / 100).toFixed(2)}（微信实收）`
                    : '199900 分 = ¥1999'}
                </p>
              </div>
              <div>
                <label className="text-xs">展示价（可选，官网/营销用）</label>
                <input className={inputCls} value={editing.priceDisplay ?? ''} onChange={(e) => setEditing({ ...editing, priceDisplay: e.target.value })} />
                <p className="text-xs text-slate-400 mt-0.5">与实付独立；留空时前台展示回退为实付价，微信仍以实付为准</p>
              </div>
              <div>
                <label className="text-xs">原价（元，划线展示）</label>
                <input
                  className={inputCls}
                  type="number"
                  min={0}
                  step={1}
                  placeholder="如 2999"
                  value={parseYuanFromDisplay(editing.originalPriceDisplay)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (!raw) {
                      setEditing({ ...editing, originalPriceDisplay: '' });
                      return;
                    }
                    const yuan = Number(raw);
                    setEditing({
                      ...editing,
                      originalPriceDisplay: yuan > 0 ? formatYuanLabel(yuan) : '',
                    });
                  }}
                />
                <p className="text-xs text-slate-400 mt-0.5">
                  用户套餐页划线价；填 2999 即显示 ¥2999（与「展示价」不同）
                </p>
              </div>
              <div>
                <label className="text-xs">{isMini ? '报告次数' : '积分'}</label>
                <input className={inputCls} type="number" value={editing.credits ?? 0} onChange={(e) => setEditing({ ...editing, credits: Number(e.target.value) })} />
              </div>
              {!isMini && (
                <div>
                  <label className="text-xs">有效月数 validMonths</label>
                  <input className={inputCls} type="number" value={editing.validMonths ?? 1} onChange={(e) => setEditing({ ...editing, validMonths: Number(e.target.value) })} />
                </div>
              )}
              {!isMini && (
                <div>
                  <label className="text-xs">计费分组</label>
                  <select className={inputCls} value={editing.billingGroup ?? 'one-time'} onChange={(e) => setEditing({ ...editing, billingGroup: e.target.value })}>
                    {SAAS_BILLING_GROUP_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {!isMini && (
                <div>
                  <label className="text-xs">套餐类型</label>
                  <select className={inputCls} value={editing.kind ?? 'paid'} onChange={(e) => setEditing({ ...editing, kind: e.target.value })}>
                    {KIND_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {!isMini && editing.kind === 'trial' && (
                <div>
                  <label className="text-xs">试用天数</label>
                  <input className={inputCls} type="number" value={editing.trialDays ?? 7} onChange={(e) => setEditing({ ...editing, trialDays: Number(e.target.value) })} />
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={handleSave} disabled={saving} className="btn-geo-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold">
                <Save className="w-4 h-4" /> 保存
              </button>
              <button type="button" onClick={() => { setEditing(null); setEditId(null); }} className="btn-geo-secondary px-4 py-2 text-sm">取消</button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default CreditPackageSettings;
