import React, { useState } from 'react';
import { Theme } from '../../types';
import type { ArticlesByCategoryGroup } from '../../api/siteConfig';

interface SubSiteArticleShowcaseProps {
  categories: ArticlesByCategoryGroup[];
  theme: Theme;
  navigate: (path: string) => void;
}

const SubSiteArticleShowcase: React.FC<SubSiteArticleShowcaseProps> = ({ categories, theme, navigate }) => {
  const isDark = theme === 'dark';
  const [activeCategory, setActiveCategory] = useState(0);

  if (!categories || categories.length === 0) return null;

  const current = categories[activeCategory];
  const articles = current?.articles ?? [];

  return (
    <section
      className={`py-8 sm:py-10 lg:py-16 ${
        isDark ? 'bg-geo-bg text-white' : 'bg-white text-slate-900'
      }`}
    >
      <div className="mx-auto w-full max-w-screen-2xl px-5 sm:px-10 lg:px-20">
        <h2
          className={`mb-8 sm:mb-12 text-2xl lg:text-4xl font-normal leading-normal ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          资讯
        </h2>
        <div className="flex flex-col gap-8 xl:flex-row">
          <div className="xl:w-1/4">
            <div className="top-8 xl:sticky">
              <div className="relative -mx-5 px-5 lg:mx-0 lg:px-0">
                <div className="flex items-start gap-4 overflow-x-auto overflow-y-hidden pb-2 scrollbar-hide xl:flex-col xl:overflow-visible xl:pb-0">
                  {categories.map((cat, index) => (
                    <button
                      key={cat.name}
                      type="button"
                      className={`font-normal text-xl rounded-full py-3 px-6 lg:px-8 text-left transition-colors whitespace-nowrap focus:outline-none ${
                        activeCategory === index
                          ? isDark
                            ? 'bg-zinc-800 text-white'
                            : 'bg-blue-500 text-white'
                          : isDark
                            ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                      onClick={() => setActiveCategory(index)}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="w-full">
            <div className="flex gap-5 overflow-x-auto overflow-y-hidden pb-4 scrollbar-hide -mx-5 px-5 lg:mx-0 lg:px-0 sm:grid sm:grid-cols-2 sm:overflow-visible xl:grid-cols-3 xl:gap-8">
              {articles.map((article) => (
                <button
                  key={article.id}
                  type="button"
                  className="group relative min-w-[280px] flex-shrink-0 sm:min-w-0 text-left flex flex-col"
                  onClick={() => navigate(`/articles/${article.id}`)}
                >
                  <div className="relative w-full h-[200px] overflow-hidden rounded-xl mb-3 shrink-0">
                    {article.coverImage ? (
                      <img
                        alt={article.title}
                        src={article.coverImage}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className={`absolute inset-0 ${
                          isDark ? 'bg-zinc-800' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </div>
                  <div className="min-h-[4rem] flex flex-col justify-center">
                    <h3
                      className={`font-semibold line-clamp-1 mb-1 ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {article.title}
                    </h3>
                    <p
                      className={`text-sm line-clamp-2 min-h-[2.5rem] ${
                        isDark ? 'text-zinc-400' : 'text-slate-600'
                      }`}
                    >
                      {article.excerpt || '\u00A0'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SubSiteArticleShowcase;
