import React from 'react';
import type { BaseRichItem } from '../types';

interface Props {
  item: BaseRichItem;
}

/** 未知 kind 或兜底的卡片 */
const GenericEventCard: React.FC<Props> = ({ item }) => {
  const title = item.kind || 'event';
  const preview = JSON.stringify(item.data ?? {}, null, 0).slice(0, 240);
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-left shadow-sm">
      <div className="text-[10px] font-mono text-gray-400 mb-0.5">{title}</div>
      <div className="text-xs text-gray-600 break-words font-mono">{preview}</div>
      {item.seq != null && (
        <div className="mt-1 text-[10px] text-gray-300">seq {item.seq}</div>
      )}
    </div>
  );
};

export default GenericEventCard;
