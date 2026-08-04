
import React from 'react';
import { ProductShowcase as ProductShowcaseType } from '../../types/landing';
import { Theme } from '../../types';

interface ProductShowcaseProps {
  title?: string;
  features?: Array<{
    title: string;
    description: string;
    icon?: string;
    image?: string;
  }>;
  theme: Theme;
}

const ProductShowcase: React.FC<ProductShowcaseProps> = ({ title, features, theme }) => {
  const isDark = theme === 'dark';

  if (!features || features.length === 0) {
    return null;
  }

  return (
    <section className={`py-8 sm:py-10 lg:py-16 ${
      isDark ? 'bg-geo-bg text-white' : 'bg-white text-slate-900'
    }`}>
      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-20">
        {title && (
          <div className="mb-8 sm:mb-12 px-2">
            <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-normal leading-normal ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {title}
            </h1>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`rounded-xl p-6 border ${
                isDark 
                  ? 'bg-zinc-900 border-zinc-700' 
                  : 'bg-white border-slate-200'
              }`}
            >
              {feature.image && (
                <div className="w-full h-48 rounded-lg mb-4 overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20">
                  <img 
                    src={feature.image} 
                    alt={(feature as any).imageAlt || feature.title}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://via.placeholder.com/600x300/3B82F6/FFFFFF?text=${encodeURIComponent(feature.title)}`;
                    }}
                  />
                </div>
              )}
              {feature.icon && !feature.image && (
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                  isDark ? 'bg-zinc-800' : 'bg-slate-100'
                }`}>
                  <span className="text-2xl">{feature.icon}</span>
                </div>
              )}
              <h3 className={`text-lg font-semibold mb-2 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {feature.title}
              </h3>
              <p className={`text-sm ${
                isDark ? 'text-zinc-400' : 'text-slate-600'
              }`}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductShowcase;
