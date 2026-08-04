
import React from 'react';
import { Showcase as ShowcaseType } from '../../types/landing';
import { Theme } from '../../types';

interface ShowcaseProps {
  section: ShowcaseType;
  theme: Theme;
}

const Showcase: React.FC<ShowcaseProps> = ({ section, theme }) => {
  const isDark = theme === 'dark';

  if (section.disabled || !section.items || section.items.length === 0) {
    return null;
  }

  return (
    <section id={section.name} className={`py-8 sm:py-10 lg:py-16 ${
      isDark ? 'bg-geo-bg text-white' : 'bg-white text-slate-900'
    }`}>
      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-20">
        <div className="text-center mb-12">
          <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-normal leading-normal mb-4 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            {section.title}
          </h2>
          {section.description && (
            <p className={`text-sm sm:text-base lg:text-lg ${
              isDark ? 'text-zinc-400' : 'text-slate-500'
            }`}>
              {section.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {section.items.map((item, index) => (
            <div
              key={index}
              className={`rounded-xl p-6 border ${
                isDark 
                  ? 'bg-zinc-900 border-zinc-700' 
                  : 'bg-white border-slate-200'
              }`}
            >
              {item.image && (
                <div className="w-full h-48 rounded-lg mb-4 overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20">
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    onError={(e) => {
                      // 如果图片加载失败，使用占位图片服务
                      const target = e.target as HTMLImageElement;
                      target.src = `https://via.placeholder.com/600x300/3B82F6/FFFFFF?text=${encodeURIComponent(item.title)}`;
                    }}
                  />
                </div>
              )}
              <h3 className={`text-lg font-semibold mb-2 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {item.title}
              </h3>
              <p className={`text-sm ${
                isDark ? 'text-zinc-400' : 'text-slate-600'
              }`}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Showcase;
