import React, { useEffect, useMemo, useState } from 'react';
import { Coins, Loader2, Save, CheckCircle2 } from 'lucide-react';
import { Theme } from '../types';
import { pointsPricingAPI, type PointsPricingItem } from '../api/pointsPricing';
import {
  ADMIN_PAGE_SHELL_CLS,
  adminCardCls,
  adminLoadingCls,
  adminPageOuterCls,
  adminSubtitleCls,
  adminTitleCls,
} from '../utils/adminPageStyles';

interface Props {
  theme: Theme;
}

const GROUP_ORDER = ['content', 'publish', 'knowledge', 'dialogue'];

const PointsPricingSettings: React.FC<Props> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [items, setItems] = useState<PointsPricingItem[]>([]);
  const [initial, setInitial] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await pointsPricingAPI.get();
        if (!cancelled) {
          setItems(data.items);
          setInitial(JSON.stringify(data.items));
        }
      } catch (e) {
        console.error('加载积分定价失败', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, PointsPricingItem[]>();
    for (const row of items) {
      const g = row.group || 'other';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(row);
    }
    const keys = [...map.keys()].sort(
      (a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b)
    );
    return keys.map((k) => ({
      key: k,
      label: map.get(k)?.[0]?.groupLabel || k,
      rows: map.get(k) || [],
    }));
  }, [items]);

  const hasChanges = initial !== '' && JSON.stringify(items) !== initial;

  const updateCell = (actionKey: string, field: 'domestic' | 'overseas', value: number) => {
    setItems((prev) =>
      prev.map((r) =>
        r.actionKey === actionKey ? { ...r, [field]: Math.max(1, Math.floor(value) || 1) } : r
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const data = await pointsPricingAPI.update(items);
      setItems(data.items);
      setInitial(JSON.stringify(data.items));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('保存积分定价失败', e);
      window.alert((e as Error)?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={adminLoadingCls(isDark)}>
        <Loader2 className="w-6 h-6 animate-spin opacity-60" />
      </div>
    );
  }

  const cardCls = adminCardCls(isDark);

  return (
    <div className={adminPageOuterCls(isDark)}>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className={ADMIN_PAGE_SHELL_CLS}>
          <div>
            <h1 className={adminTitleCls(isDark)}>积分定价</h1>
            <p className={adminSubtitleCls(isDark)}>
              配置各计费环节的国内 / 出海积分消耗（单位：积分）。保存后全站扣费立即生效。
            </p>
          </div>

        <div className={cardCls}>
          <div
            className={`grid grid-cols-[1fr_5rem_5rem] gap-2 px-4 py-3 text-xs font-semibold border-b ${
              isDark ? 'border-zinc-800 text-zinc-400' : 'border-slate-100 text-slate-500'
            }`}
          >
            <span>计费环节</span>
            <span className="text-center">国内</span>
            <span className="text-center">出海</span>
          </div>

          {grouped.map((g) => (
            <div key={g.key}>
              <div
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wide ${
                  isDark ? 'bg-zinc-800/50 text-zinc-300' : 'bg-slate-50 text-slate-600'
                }`}
              >
                {g.label}
              </div>
              {g.rows.map((row) => (
                <div
                  key={row.actionKey}
                  className={`grid grid-cols-[1fr_5rem_5rem] gap-2 items-center px-4 py-3 border-b last:border-b-0 ${
                    isDark ? 'border-zinc-800' : 'border-slate-50'
                  }`}
                >
                  <div>
                    <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {row.label}
                    </div>
                    <div className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                      {row.actionKey} · 每{row.unit}
                    </div>
                  </div>
                  <input
                    type="number"
                    min={1}
                    className={`w-full rounded-lg border px-2 py-1.5 text-sm text-center ${
                      isDark
                        ? 'bg-zinc-800 border-zinc-700 text-white'
                        : 'bg-white border-slate-200'
                    }`}
                    value={row.domestic}
                    onChange={(e) =>
                      updateCell(row.actionKey, 'domestic', parseInt(e.target.value, 10))
                    }
                  />
                  <input
                    type="number"
                    min={1}
                    className={`w-full rounded-lg border px-2 py-1.5 text-sm text-center ${
                      isDark
                        ? 'bg-zinc-800 border-zinc-700 text-white'
                        : 'bg-white border-slate-200'
                    }`}
                    value={row.overseas}
                    onChange={(e) =>
                      updateCell(row.actionKey, 'overseas', parseInt(e.target.value, 10))
                    }
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={saving || !hasChanges}
            onClick={() => void handleSave()}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition btn-geo-primary disabled:opacity-60 ${
              !hasChanges ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? '保存中…' : saved ? '已保存' : '保存定价'}
          </button>
          <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
            <Coins className="w-3.5 h-3.5" />
            优化任务周期扣费在后续版本按国内/出海预算分别结算
          </span>
        </div>
        </div>
      </div>
    </div>
  );
};

export default PointsPricingSettings;
