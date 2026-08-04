import React from 'react';
import ProductStripPanel from './ProductStripPanel';

interface GeoMenuLayerProps {
  open: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/**
 * 必须作为页头（或带 openGeoMenu 的祖先）内的子节点渲染，勿 Portal 到 body：
 * 否则鼠标从「GEO」移到浮层会先触发触发器的 mouseLeave，菜单在进浮层前就关掉。
 */
const GeoMenuLayer: React.FC<GeoMenuLayerProps> = ({ open, onMouseEnter, onMouseLeave }) => {
  if (!open) return null;

  return (
    <div
      className="pointer-events-auto fixed inset-x-0 top-14 z-[9999] flex justify-center px-3 pt-2 sm:px-4"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="presentation"
    >
      <div className="w-full max-w-[min(100vw-2rem,72rem)]" role="dialog" aria-label="GEO 产品说明">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5">
          <div className="max-h-[min(85vh,720px)] overflow-y-auto overscroll-contain">
            <ProductStripPanel />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeoMenuLayer;
