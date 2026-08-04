import React, { useState } from 'react';
import type { ThirdPartyMediaOutletDTO } from '../../../api/thirdPartyMedia';

interface Props {
  items: ThirdPartyMediaOutletDTO[];
  /** 未选任何媒体时为 true */
  useAllCatalog?: boolean;
}

const ThirdPartyMediaWhitelistSummary: React.FC<Props> = ({ items, useAllCatalog }) => {
  const [showAll, setShowAll] = useState(false);
  const top = items.slice(0, 5);
  const rest = items.length > 5 ? items.slice(5) : [];

  if (useAllCatalog && items.length === 0) {
    return (
      <p className="ml-9 text-xs text-slate-500">
        未限定媒体，周期自动入队后可在<strong className="font-medium text-slate-700">全部合作媒体库</strong>
        范围内由运营在发稿待办终选。
      </p>
    );
  }

  if (items.length === 0) {
    return null;
  }

  const list = showAll ? items : top;

  return (
    <div className="ml-9 space-y-2">
      <p className="text-xs font-medium text-slate-600">
        已限定 {items.length} 家媒体为<strong className="font-medium text-slate-800">可发稿范围</strong>
        （具体媒体由运营在 Admin 发稿待办处理时选择）
      </p>
      <ul className="space-y-1.5">
        {list.map((it) => (
          <li
            key={it.id}
            className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg border border-slate-100 bg-white px-2.5 py-1.5 text-xs text-slate-700"
          >
            <span className="font-semibold text-slate-900">{it.name}</span>
            <span className="text-slate-400">·</span>
            <span>{it.accountType}</span>
            <span className="text-slate-400">·</span>
            <span>成功率 {it.successRate}%</span>
            <span className="text-slate-400">·</span>
            <span>{it.pricePoints} 积分</span>
          </li>
        ))}
      </ul>
      {rest.length > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-xs font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700"
        >
          {showAll ? '收起' : `更多（还有 ${rest.length} 家）`}
        </button>
      ) : null}
    </div>
  );
};

export default ThirdPartyMediaWhitelistSummary;
