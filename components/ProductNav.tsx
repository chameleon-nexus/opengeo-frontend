
import React, { useState, useEffect } from 'react';
import { 
    Package, ArrowLeft, Loader2
} from 'lucide-react';
import { Theme, Brand } from '../types';
import { useBrandCatalog } from '../hooks/useBrandCatalog';
import { useModuleI18n } from '../i18n/hooks';
import ExtractModule from './ExtractModule';
import GenerateModule from './GenerateModule';

interface ProductNavProps {
  theme: Theme;
  currentBrand: Brand | null;
  initialTab?: 'extract' | 'analyze' | 'generate';
  initialProduct?: string | null;
  onBack?: (product?: string | null) => void;
  selectedTaskId?: string | null;
}

const ProductNav: React.FC<ProductNavProps> = ({ theme, currentBrand, initialTab = 'extract', initialProduct = null, onBack, selectedTaskId = null }) => {
  const { t } = useModuleI18n('extract');
  const isDark = theme === 'dark';
  const { catalog, loading } = useBrandCatalog(currentBrand);

  const [activeTab, setActiveTab] = useState<'extract' | 'analyze' | 'generate'>(initialTab);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(initialProduct);

  const allProducts = catalog?.flatMap(cat => cat.products) ?? [];

  useEffect(() => {
    setActiveTab(initialTab);
    if (initialProduct !== undefined) {
      setSelectedProduct(initialProduct);
    }
  }, [initialTab, initialProduct, selectedTaskId]);

  const handleProductSelect = (product: string) => {
    setSelectedProduct(product || null);
  };

  return (
    <div className="h-full flex flex-col">
        <div className={`flex-1 flex flex-col rounded-2xl border overflow-hidden relative h-full min-w-0 ${isDark ? 'bg-geo-card border-geo-border' : 'bg-white border-slate-200'}`}>
            {activeTab === 'analyze' && (
            <div className={`h-auto border-b shrink-0 ${isDark ? 'border-geo-border bg-geo-bg/30' : 'border-slate-100 bg-slate-50'}`}>
                <div className="flex items-center justify-between px-6 py-4">
                    {onBack && (
                        <button 
                            onClick={() => onBack(selectedProduct)}
                            className={`p-2 rounded-xl transition-all hover-scale ${isDark ? 'hover:bg-geo-bg text-geo-text-sec hover:text-geo-blue' : 'hover:bg-slate-100 text-slate-600'}`}
                            title={t('productNav.back')}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div className="flex items-center gap-2 flex-1 justify-end">
                        <Package className={`w-4 h-4 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`} />
                        <label className={`text-xs font-medium ${isDark ? 'text-geo-text-sec' : 'text-slate-600'}`}>
                            {t('productNav.product')}
                        </label>
                        <select
                            value={selectedProduct || ''}
                            onChange={(e) => handleProductSelect(e.target.value)}
                            className={`px-3 py-2 rounded-lg text-sm border outline-none transition-colors min-w-[200px]
                                ${isDark 
                                    ? 'bg-zinc-800 border-zinc-700 text-white focus:border-geo-blue' 
                                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                                }
                            `}
                        >
                            <option value="">{t('productNav.allProducts')}</option>
                            {loading ? (
                                <option value="" disabled>{t('productNav.loading')}</option>
                            ) : allProducts.length === 0 ? (
                                <option value="" disabled>{t('productNav.noProducts')}</option>
                            ) : (
                                allProducts.map((product, idx) => (
                                    <option key={idx} value={product}>{product}</option>
                                ))
                            )}
                        </select>
                    </div>
                </div>
            </div>
            )}

            <div className={`flex-1 overflow-y-auto p-10 no-scrollbar bg-transparent`}>
                <div className="max-w-6xl mx-auto h-full">
                    {activeTab === 'extract' && <ExtractModule theme={theme} currentBrand={currentBrand} selectedProduct={null} onNavigateToAnalyze={() => {}} onBack={() => onBack?.(selectedProduct)} initialTaskId={selectedTaskId} />}
                    {activeTab === 'analyze' && (
                      <div className={`p-6 rounded-xl border ${isDark ? 'border-geo-border text-geo-text-sec' : 'border-slate-200 text-slate-600'}`}>
                        <h3 className="text-lg font-medium mb-2">旧版「现状分析」已下线</h3>
                        <p>请使用侧栏「开始优化」工作流中的现状分析环节。</p>
                      </div>
                    )}
                    {activeTab === 'generate' && <GenerateModule theme={theme} currentBrand={currentBrand} selectedProduct={selectedProduct} onBack={() => onBack?.(selectedProduct)} />}
                </div>
            </div>
        </div>
    </div>
  );
};

export default ProductNav;
