
import React, { useState } from 'react';
import { FeatureModern as FeatureModernType } from '../../types/landing';
import { Theme } from '../../types';
import Icon from '../ui/Icon';

interface FeatureModernProps {
  section: FeatureModernType;
  theme: Theme;
}

const FeatureModern: React.FC<FeatureModernProps> = ({ section, theme }) => {
  const isDark = theme === 'dark';
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  if (!section.items || section.items.length === 0) {
    return null;
  }

  return (
    <section className={`py-8 sm:py-10 lg:py-[6vh] ${
      isDark ? 'bg-geo-bg text-white' : 'bg-white text-slate-900'
    }`}>
      <div className="mx-auto w-full max-w-screen-2xl px-5 sm:px-10 lg:px-20">
        <h3 className={`mb-12 text-2xl lg:text-4xl font-normal leading-normal ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}>
          {section.title}
        </h3>
        
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {section.items.map((item, index) => (
            <div 
              key={index}
              className="md:opacity-0 animate-fade-in"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <div 
                className={`relative rounded-xl overflow-hidden h-full transition-all duration-300 hover:scale-105 ${
                  isDark ? 'bg-zinc-900/50' : 'bg-slate-50'
                }`}
                style={{
                  padding: '1px'
                }}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* 旋转边框动画 */}
                <div 
                  className={`absolute inset-0 rounded-xl transition-all duration-500 ${
                    hoveredCard === index 
                      ? 'animate-spin-slow' 
                      : (isDark ? 'bg-zinc-900/50' : 'bg-slate-50')
                  }`}
                  style={{
                    background: hoveredCard === index 
                      ? 'conic-gradient(from 0deg, transparent, transparent, transparent, #ffb003, #fe3c7d, transparent, transparent, transparent)' 
                      : (isDark ? 'rgba(24, 24, 27, 0.5)' : 'rgb(248, 250, 252)')
                  }}
                />
                
                {/* 卡片内容 */}
                <div 
                  className={`relative flex h-full flex-col gap-8 rounded-xl p-8 lg:gap-12 lg:p-12 ${
                    isDark ? 'bg-zinc-900' : 'bg-white'
                  }`}
                  style={{
                    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : undefined
                  }}
                >
                  <div className="flex flex-1 justify-between gap-28">
                    <p className={`text-2xl lg:text-3xl font-bold ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                      {item.title}
                    </p>
                    
                    {/* 图标 */}
                    {item.icon && (
                      <div className={`min-h-12 min-w-12 lg:min-h-16 lg:min-w-16 flex items-center justify-center ${
                        isDark ? 'text-zinc-400' : 'text-slate-500'
                      }`}>
                        <Icon name={item.icon} className="w-8 h-8 lg:w-12 lg:h-12" />
                      </div>
                    )}
                  </div>
                  
                  <p className={`hidden text-base leading-relaxed md:block lg:pr-12 ${
                    isDark ? 'text-zinc-400' : 'text-slate-600'
                  }`}>
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureModern;
