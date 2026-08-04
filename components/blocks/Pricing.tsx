
import React, { useState } from 'react';
import { Check, Loader } from 'lucide-react';
import { Pricing as PricingType, PricingItem } from '../../types/landing';
import { Theme } from '../../types';

interface PricingProps {
  pricing: PricingType;
  theme: Theme;
  onCheckout?: (item: PricingItem) => void;
}

const Pricing: React.FC<PricingProps> = ({ pricing, theme, onCheckout }) => {
  const isDark = theme === 'dark';
  
  if (pricing.disabled) {
    return null;
  }

  const [group, setGroup] = useState(() => {
    const featuredGroup = pricing.groups?.find((g) => g.is_featured);
    return featuredGroup?.name || pricing.groups?.[0]?.name;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);

  const handleCheckout = async (item: PricingItem) => {
    if (onCheckout) {
      onCheckout(item);
      return;
    }

    if (item.product_id) {
      const params = new URLSearchParams(window.location.search);
      params.set('buy', item.product_id);
      window.location.href = `${window.location.pathname}?${params.toString()}`;
      return;
    }

    setIsLoading(true);
    setProductId(item.product_id);
    setTimeout(() => {
      setIsLoading(false);
      setProductId(null);
    }, 1000);
  };

  const filteredItems = pricing.items?.filter(
    (item) => !item.group || item.group === group
  ) || [];

  return (
    <section id={pricing.name} className={`py-8 sm:py-10 lg:py-16 ${
      isDark ? 'bg-geo-bg text-white' : 'bg-white text-slate-900'
    }`}>
      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-20">
        <div className="mx-auto mb-8 sm:mb-12 text-center px-4">
          <h2 className={`mb-8 sm:mb-12 text-2xl sm:text-3xl lg:text-4xl font-normal leading-normal ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            {pricing.title}
          </h2>
          <p className={`text-sm sm:text-base lg:text-lg ${
            isDark ? 'text-zinc-400' : 'text-slate-500'
          }`}>
            {pricing.description}
          </p>
        </div>
        
        {/* 价格组切换 */}
        {pricing.groups && pricing.groups.length > 0 && (
          <div className={`flex h-11 sm:h-12 mb-8 sm:mb-12 items-center rounded-md p-1 text-base sm:text-lg w-full sm:max-w-lg mx-auto ${
            isDark ? 'bg-zinc-800' : 'bg-slate-100'
          }`}>
            {pricing.groups.map((item, i) => (
              <button
                key={i}
                onClick={() => setGroup(item.name || '')}
                className={`h-full flex-1 rounded-sm transition-all px-2 sm:px-3 font-semibold text-xs sm:text-sm ${
                  group === item.name
                    ? (isDark 
                        ? 'bg-gradient-coral text-white shadow-coral' 
                        : 'bg-white text-[#E8553F] shadow-sm')
                    : (isDark 
                        ? 'text-zinc-400 hover:text-white' 
                        : 'text-slate-600 hover:text-slate-900')
                }`}
              >
                {item.title}
                {item.label && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
                    isDark 
                      ? 'bg-geo-blue/20 text-blue-400' 
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {item.label}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        
        {/* 价格卡片 */}
        <div className={`w-full grid gap-6 ${
          filteredItems.length === 1 ? 'grid-cols-1 max-w-md mx-auto' :
          filteredItems.length === 2 ? 'md:grid-cols-2 max-w-4xl mx-auto' :
          'md:grid-cols-3'
        }`}>
            {filteredItems.map((item, index) => (
              <div
                key={index}
                className={`rounded-lg p-5 sm:p-6 ${
                  item.is_featured
                    ? (isDark 
                        ? 'border-2 border-geo-blue bg-zinc-900' 
                        : 'border-2 border-blue-500 bg-blue-50')
                    : (isDark 
                        ? 'border border-zinc-700 bg-zinc-900' 
                        : 'border border-slate-200 bg-white')
                }`}
              >
                <div className="flex h-full flex-col justify-between gap-5">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      {item.title && (
                        <h3 className={`text-lg sm:text-xl font-semibold ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}>
                          {item.title}
                        </h3>
                      )}
                      <div className="flex-1"></div>
                      {item.label && (
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          isDark 
                            ? 'bg-gradient-coral text-white shadow-coral' 
                            : 'bg-gradient-coral text-white shadow-coral'
                        }`}>
                          {item.label}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-end gap-2 mb-4">
                      {item.original_price && (
                        <span className={`text-lg sm:text-xl font-semibold line-through ${
                          isDark ? 'text-zinc-500' : 'text-slate-400'
                        }`}>
                          {item.original_price}
                        </span>
                      )}
                      {item.price && (
                        <span className={`text-4xl sm:text-5xl font-semibold ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}>
                          {item.price}
                        </span>
                      )}
                      {item.unit && (
                        <span className={`block font-semibold text-sm sm:text-base ${
                          isDark ? 'text-zinc-400' : 'text-slate-500'
                        }`}>
                          {item.unit}
                        </span>
                      )}
                    </div>
                    
                    {item.description && (
                      <p className={`text-sm sm:text-base mb-4 ${
                        isDark ? 'text-zinc-400' : 'text-slate-500'
                      }`}>
                        {item.description}
                      </p>
                    )}
                    
                    {item.features_title && (
                      <p className={`mb-3 mt-6 font-semibold text-sm sm:text-base ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}>
                        {item.features_title}
                      </p>
                    )}
                    
                    {item.features && (
                      <ul className="flex flex-col gap-2 sm:gap-3">
                        {item.features.map((feature, fi) => (
                          <li className={`flex gap-2 text-sm sm:text-base ${
                            isDark ? 'text-zinc-300' : 'text-slate-700'
                          }`} key={`feature-${fi}`}>
                            <Check className={`mt-0.5 sm:mt-1 size-4 shrink-0 ${
                              isDark ? 'text-geo-blue' : 'text-blue-500'
                            }`} />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {item.button && (
                      <>
                        <button
                          className={`w-full py-3 rounded-xl font-semibold text-sm sm:text-base flex items-center justify-center gap-2 transition-all min-h-[48px] ${
                            item.is_featured
                              ? (isDark 
                                  ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' 
                                  : 'bg-gradient-coral text-white shadow-coral hover:opacity-95')
                              : (isDark 
                                  ? 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700' 
                                  : 'bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200')
                          }`}
                          disabled={isLoading}
                          onClick={() => handleCheckout(item)}
                        >
                          {isLoading && productId === item.product_id ? (
                            <>
                              <Loader className="h-5 w-5 animate-spin text-blue-500" />
                              <span>{item.button.title}</span>
                            </>
                          ) : (
                            <span>{item.button.title}</span>
                          )}
                        </button>
                        {item.tip && (
                          <p className={`text-xs sm:text-sm text-center ${
                            isDark ? 'text-zinc-400' : 'text-slate-500'
                          }`}>
                            {item.tip}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
