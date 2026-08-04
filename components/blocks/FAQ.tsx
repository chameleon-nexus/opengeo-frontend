
import React from 'react';
import { FAQ as FAQType } from '../../types/landing';
import { Theme } from '../../types';

interface FAQProps {
  section: FAQType;
  theme: Theme;
  /** 与行业站深色 FAQ 区一致（浅主题下也可启用） */
  landingSurface?: 'default' | 'aidso';
}

const FAQ: React.FC<FAQProps> = ({ section, theme, landingSurface = 'default' }) => {
  const isDark = theme === 'dark';
  const aidso = landingSurface === 'aidso' && !isDark;

  if (section.disabled || !section.items || section.items.length === 0) {
    return null;
  }

  return (
    <section
      id={section.name}
      className={`py-10 sm:py-12 lg:py-16 ${
        aidso
          ? 'border-t border-slate-200/80 bg-white text-slate-900'
          : isDark
            ? 'bg-geo-bg text-white'
            : 'bg-white text-slate-900'
      }`}
    >
      <div className="mx-auto w-full max-w-screen-2xl px-5 sm:px-10 lg:px-20">
        <div className="text-center">
          <h2
            className={`mb-10 text-[26px] font-semibold leading-tight tracking-tight sm:text-3xl md:text-4xl ${
              aidso ? 'text-[#111827]' : isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {section.title}
          </h2>
          {section.description && (
            <p
              className={`mt-2 text-sm sm:text-base ${
                aidso ? 'text-[#4b5563]' : isDark ? 'text-zinc-400' : 'text-slate-600'
              }`}
            >
              {section.description}
            </p>
          )}
        </div>
        <div className="mx-auto mt-12 grid gap-8 md:grid-cols-2 md:gap-12">
          {section.items.map((item, index) => (
            <div key={index} className="flex gap-4">
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-sm border font-mono text-xs ${
                  aidso
                    ? 'border-[#E8553F]/70 text-[#E8553F]'
                    : isDark
                      ? 'border-geo-blue text-geo-blue'
                      : 'border-blue-500 text-blue-500'
                }`}
              >
                {index + 1}
              </span>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3
                    className={`text-[15px] font-semibold leading-snug sm:text-base ${
                      aidso ? 'text-[#111827]' : isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {item.question}
                  </h3>
                </div>
                <p
                  className={`text-sm leading-relaxed sm:text-[15px] ${
                    aidso ? 'text-[#6b7280]' : isDark ? 'text-zinc-400' : 'text-slate-600'
                  }`}
                >
                  {item.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
