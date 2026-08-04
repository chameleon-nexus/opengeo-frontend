
import React, { useState } from 'react';
import { SaasFeatures as SaasFeaturesType } from '../../types/landing';
import { Theme } from '../../types';

interface SaasFeaturesProps {
  section: SaasFeaturesType;
  theme: Theme;
}

const SaasFeatures: React.FC<SaasFeaturesProps> = ({ section, theme }) => {
  const isDark = theme === 'dark';
  const [activeCategory, setActiveCategory] = useState(0);

  if (!section.categories || section.categories.length === 0) {
    return null;
  }

  const title = section.title || "您需要的功能，您想要的简单性";
  const tryButtonText = section.try_button || "试试看";

  return (
    <section className={`py-8 sm:py-10 lg:py-[6vh] ${
      isDark ? 'bg-geo-bg text-white' : 'bg-white text-slate-900'
    }`}>
      <div className="mx-auto w-full max-w-screen-2xl px-5 sm:px-10 lg:px-20">
        <div className="flex flex-col-reverse gap-7 lg:flex-row lg:items-center lg:justify-between">
          <h3 className={`mb-12 text-2xl lg:text-4xl font-normal leading-normal ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            {title}
          </h3>
        </div>

        <div className="flex flex-col gap-8 xl:flex-row">
          {/* 左侧分类导航 */}
          <div className="xl:w-1/4">
            <div className="top-8 xl:sticky">
              {/* 移动端横向滚动，PC端纵向堆叠 */}
              <div className="relative -mx-5 px-5 lg:mx-0 lg:px-0">
                <div className="flex items-start gap-4 overflow-x-auto overflow-y-hidden pb-2 scrollbar-hide xl:flex-col xl:overflow-visible xl:pb-0">
                  {section.categories.map((category, index) => (
                    <button
                      key={category.id || index}
                      className={`font-normal text-xl rounded-full py-3 px-6 lg:px-8 text-left transition-colors whitespace-nowrap focus:outline-none ${
                        activeCategory === index
                          ? (isDark 
                              ? 'bg-zinc-800 text-white' 
                              : 'bg-blue-500 text-white')
                          : (isDark 
                              ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' 
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')
                      }`}
                      onClick={() => setActiveCategory(index)}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 右侧功能卡片 */}
          <div className="w-full">
            <div className="transition-opacity duration-[300ms] ease-in-out block opacity-100">
              <div className="relative">
                {/* 移动端使用flex横向滚动，PC端使用grid */}
                <div className="flex gap-5 overflow-x-auto overflow-y-hidden pb-4 scrollbar-hide -mx-5 px-5 lg:mx-0 lg:px-0 sm:grid sm:grid-cols-2 sm:overflow-visible xl:grid-cols-3 xl:gap-8">
                  {section.categories[activeCategory]?.cards.map((card, cardIndex) => (
                    <div key={cardIndex} className="group relative min-w-[280px] flex-shrink-0 sm:min-w-0">
                      <a
                        className="group transition-opacity focus:opacity-80 focus:outline-none"
                        href={card.link || '#'}
                      >
                        <div className="relative w-full h-[300px] overflow-hidden rounded-xl lg:aspect-[5/6] lg:h-auto">
                          {card.image ? (
                            <img
                              alt={card.title}
                              src={card.image}
                              className="absolute left-0 top-0 w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = `https://via.placeholder.com/400x500/3B82F6/FFFFFF?text=${encodeURIComponent(card.title)}`;
                              }}
                            />
                          ) : (
                            <div className={`absolute left-0 top-0 w-full h-full ${
                              isDark ? 'bg-zinc-800' : 'bg-slate-200'
                            }`} />
                          )}
                          <p className="relative p-6 text-xl text-white z-[1]">
                            {card.title}
                          </p>
                          <span className={`absolute bottom-6 left-6 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-opacity duration-300 group-hover:opacity-100 group-focus:opacity-100 2xl:opacity-0 ${
                            isDark 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-blue-500 text-white'
                          }`}>
                            {tryButtonText}
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="-49 141 512 512" width="16" height="16" aria-hidden="true" className="w-4 h-4 fill-current">
                              <path d="M-24 422h401.645l-72.822 72.822c-9.763 9.763-9.763 25.592 0 35.355 9.763 9.764 25.593 9.762 35.355 0l115.5-115.5a25 25 0 0 0 0-35.355l-115.5-115.5c-9.763-9.762-25.593-9.763-35.355 0-9.763 9.763-9.763 25.592 0 35.355l72.822 72.822H-24c-13.808 0-25 11.193-25 25S-37.808 422-24 422"></path>
                            </svg>
                          </span>
                        </div>
                      </a>
                      <a
                        className={`absolute bottom-6 right-6 flex w-10 h-10 items-center justify-center rounded-full transition-opacity duration-300 group-hover:opacity-100 group-focus:opacity-100 2xl:opacity-0 ${
                          isDark 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-blue-500 text-white'
                        }`}
                        aria-label={`了解更多，${card.title}`}
                        href={card.link || '#'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="-49 141 512 512" width="16" height="16" aria-hidden="true" className="w-4 h-4 fill-current">
                          <path d="M207 653c-68.38 0-132.667-26.629-181.02-74.98C-22.371 529.667-49 465.38-49 397s26.629-132.667 74.98-181.02C74.333 167.629 138.62 141 207 141s132.667 26.629 181.02 74.98C436.371 264.333 463 328.62 463 397s-26.629 132.667-74.98 181.02C339.667 626.371 275.38 653 207 653m0-462C93.411 191 1 283.411 1 397s92.411 206 206 206 206-92.411 206-206-92.411-206-206-206"></path>
                          <path d="M217 543c-13.807 0-25-11.193-25-25V391h-25c-13.807 0-25-11.193-25-25s11.193-25 25-25h50c13.807 0 25 11.193 25 25v152c0 13.807-11.193 25-25 25m-10-232c-16.542 0-30-13.458-30-30s13.458-30 30-30 30 13.458 30 30-13.458 30-30 30"></path>
                        </svg>
                      </a>
                    </div>
                  ))}
                </div>
                {/* 移动端添加占位符，PC端不显示 */}
                <div className="min-w-px sm:hidden" aria-hidden="true"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SaasFeatures;
