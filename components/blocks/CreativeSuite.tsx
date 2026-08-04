
import React, { useState } from 'react';
import { CreativeSuite as CreativeSuiteType } from '../../types/landing';
import { Theme } from '../../types';

interface CreativeSuiteProps {
  section: CreativeSuiteType;
  theme: Theme;
}

const CreativeSuite: React.FC<CreativeSuiteProps> = ({ section, theme }) => {
  const isDark = theme === 'dark';
  const [activeCategory, setActiveCategory] = useState(0);

  if (!section.categories || section.categories.length === 0) {
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
          {section.title || '一套框架，承载无限创想'}
        </h3>

        {/* 标签页导航 */}
        <div className="mb-10 relative">
          <div className="flex gap-1 overflow-x-auto overflow-y-hidden pb-2 scrollbar-hide -mx-5 px-5 lg:mx-0 lg:px-0">
            {section.categories.map((category, index) => (
              <button
                key={category.id || index}
                onClick={() => setActiveCategory(index)}
                className={`font-normal text-xl rounded-full py-3 px-6 lg:px-8 text-left transition-colors whitespace-nowrap focus:outline-none ${
                  activeCategory === index
                    ? (isDark 
                        ? 'bg-zinc-800 text-white' 
                        : 'bg-blue-500 text-white')
                    : (isDark 
                        ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* 卡片展示区域 */}
        <div className="transition-opacity duration-[300ms] ease-in-out">
          <div className="relative">
            {/* 移动端使用flex横向滚动，PC端使用grid */}
            <div className="flex gap-5 overflow-x-auto overflow-y-hidden pb-4 scrollbar-hide -mx-5 px-5 lg:mx-0 lg:px-0 xl:grid xl:grid-cols-3 xl:gap-8 xl:overflow-visible">
              {section.categories[activeCategory]?.cards.map((card, index) => (
                <a
                  key={index}
                  href={card.link || '#'}
                  className="group min-w-[180px] sm:min-w-[220px] flex-shrink-0 focus:outline-none xl:min-w-0"
                >
                  <div className="relative w-full overflow-hidden rounded-xl h-[200px] sm:h-[240px] lg:h-auto lg:aspect-[5/6]">
                    {card.image ? (
                      <img
                        alt={card.title || "card image"}
                        src={card.image}
                        className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://via.placeholder.com/400x480/3B82F6/FFFFFF?text=${encodeURIComponent(card.title || 'Card')}`;
                        }}
                      />
                    ) : (
                      <div className={`w-full h-full ${
                        isDark ? 'bg-zinc-800' : 'bg-slate-200'
                      }`} />
                    )}
                    <span className={`absolute bottom-4 left-4 sm:bottom-6 sm:left-6 flex items-center gap-2 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition-opacity duration-300 group-hover:opacity-100 group-focus:opacity-100 2xl:opacity-0 ${
                      isDark 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-blue-500 text-white'
                    }`}>
                      试试看
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="-49 141 512 512"
                        width="16"
                        height="16"
                        aria-hidden="true"
                        className="w-3 h-3 sm:w-4 sm:h-4 fill-current"
                      >
                        <path d="M-24 422h401.645l-72.822 72.822c-9.763 9.763-9.763 25.592 0 35.355 9.763 9.764 25.593 9.762 35.355 0l115.5-115.5a25 25 0 0 0 0-35.355l-115.5-115.5c-9.763-9.762-25.593-9.763-35.355 0-9.763 9.763-9.763 25.592 0 35.355l72.822 72.822H-24c-13.808 0-25 11.193-25 25S-37.808 422-24 422" />
                      </svg>
                    </span>
                  </div>
                  <p className={`mt-3 sm:mt-4 text-sm sm:text-base lg:text-xl lg:mt-8 ${
                    isDark ? 'text-zinc-400' : 'text-slate-600'
                  }`}>
                    <span className={`block lg:inline ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                      {card.title}
                    </span>{' '}
                    {card.description}
                  </p>
                </a>
              ))}
            </div>
            {/* 移动端添加占位符，PC端不显示 */}
            <div className="min-w-px xl:hidden" aria-hidden="true"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CreativeSuite;
