import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Briefcase } from 'lucide-react';
import { Theme, Brand } from '../types';

interface BrandSelectorProps {
  brands: Brand[];
  currentBrand: Brand | null;
  onSelect: (brand: Brand) => void;
  theme: Theme;
  onNavigateToBrandManagement?: () => void;
}

const categoryOrder = [
  '家电', '洗护用品', '中药', '美妆护肤', '手机数码', '电脑办公',
  '家居家装', '服饰内衣', '运动户外', '母婴亲子', '食品饮料',
  '生鲜水果', '酒类茶饮', '医药保健', '汽车用品', '图书文娱',
  '宠物生活', '钟表珠宝', '玩具乐器', '金融服务', '房产服务',
  '本地生活', '奢侈品', '工业制造', '企业服务', '其他', '鞋靴箱包'
];

const BrandSelector: React.FC<BrandSelectorProps> = ({
  brands,
  currentBrand,
  onSelect,
  theme,
  onNavigateToBrandManagement,
}) => {
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const groupedBrands = brands.reduce((acc, brand) => {
    if (!acc[brand.category]) acc[brand.category] = [];
    acc[brand.category].push(brand);
    return acc;
  }, {} as Record<string, Brand[]>);

  const sortedCategories = Object.keys(groupedBrands).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (brands.length === 0) {
    return (
      <div className={`text-sm ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
        暂无品牌
        {onNavigateToBrandManagement && (
          <button
            onClick={onNavigateToBrandManagement}
            className="ml-2 underline hover:text-blue-600 cursor-pointer font-bold"
          >
            去品牌管理添加
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 pl-3 pr-3 py-2 rounded-xl border transition-all text-left
          ${isDark
            ? 'bg-zinc-800 border-zinc-700 text-white hover:border-zinc-600'
            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }
        `}
      >
        {currentBrand ? (
          <>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${currentBrand.logoColor}`}>
              {currentBrand.name.substring(0, 1)}
            </div>
            <span className="text-sm font-bold truncate max-w-[120px]">{currentBrand.name}</span>
          </>
        ) : (
          <span className="text-sm text-slate-500">请选择品牌</span>
        )}
        <ChevronDown className={`w-4 h-4 shrink-0 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 mt-2 w-64 max-h-[320px] overflow-y-auto rounded-xl border shadow-xl z-50
          ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}
        `}>
          <div className="p-3 space-y-4">
            {sortedCategories.map((category) => {
              const categoryBrands = groupedBrands[category];
              if (!categoryBrands || categoryBrands.length === 0) return null;
              return (
                <div key={category}>
                  <div className={`text-xs font-bold  mb-2 px-2
                    ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}
                  >
                    {category}
                  </div>
                  <div className="space-y-1">
                    {categoryBrands.map((brand) => (
                      <button
                        key={brand.id}
                        onClick={() => {
                          onSelect(brand);
                          setIsOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left
                          ${currentBrand?.id === brand.id
                            ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-700')
                            : (isDark ? 'hover:bg-zinc-800 text-white' : 'hover:bg-slate-50 text-slate-900')
                          }
                        `}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${brand.logoColor}`}>
                          {brand.name.substring(0, 1)}
                        </div>
                        <span className="flex-1 font-medium truncate">{brand.name}</span>
                        {currentBrand?.id === brand.id && (
                          <Check className="w-4 h-4 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {onNavigateToBrandManagement && (
            <div className={`p-3 border-t ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
              <button
                onClick={() => {
                  onNavigateToBrandManagement();
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs text-slate-500 hover:text-blue-600"
              >
                <Briefcase className="w-3.5 h-3.5" />
                去品牌管理添加
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BrandSelector;
