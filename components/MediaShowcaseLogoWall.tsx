import React from 'react';
import { Theme } from '../types';
import { DOMESTIC_MEDIA_SHOWCASE_LOGOS } from '../constants/domesticMediaShowcaseLogos';
import { OVERSEAS_MEDIA_SHOWCASE_LOGOS } from '../constants/overseasMediaShowcaseLogos';
import { useModuleI18n } from '../i18n/hooks';

interface Props {
  theme: Theme;
  market?: 'domestic' | 'overseas';
  className?: string;
}

const MediaShowcaseLogoWall: React.FC<Props> = ({ theme, market = 'domestic', className = '' }) => {
  const { t } = useModuleI18n('publish');
  const isDark = theme === 'dark';
  const logos = market === 'overseas' ? OVERSEAS_MEDIA_SHOWCASE_LOGOS : DOMESTIC_MEDIA_SHOWCASE_LOGOS;
  const titleKey = market === 'overseas' ? 'mediaTier.showcase.overseasTitle' : 'mediaTier.showcase.title';
  const subtitleKey =
    market === 'overseas' ? 'mediaTier.showcase.overseasSubtitle' : 'mediaTier.showcase.subtitle';

  return (
    <section
      className={`rounded-2xl border px-4 py-4 md:px-5 md:py-5 shadow-sm transition-colors ${
        isDark ? 'border-zinc-700 bg-zinc-900/40' : 'border-gray-200 bg-white'
      } ${className}`}
    >
      <div className="mb-4">
        <h2 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>
          {t(titleKey, { defaultValue: t('mediaTier.showcase.title') })}
        </h2>
        <p className={`mt-0.5 text-xs ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
          {t(subtitleKey, { defaultValue: t('mediaTier.showcase.subtitle') })}
        </p>
      </div>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-8">
        {logos.map((item) => (
          <div key={item.name} className="flex flex-col items-center gap-1.5">
            <div
              className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl shadow-sm md:h-12 md:w-12 ${item.bgClass}`}
              title={item.name}
            >
              {item.src ? (
                <img
                  src={item.src}
                  alt={item.name}
                  className={`h-full w-full object-contain ${item.imagePad ?? 'p-1.5'}`}
                  loading="lazy"
                  draggable={false}
                />
              ) : (
                <span className="px-1 text-center text-[9px] font-bold leading-tight text-white">
                  {item.name.slice(0, 2)}
                </span>
              )}
            </div>
            <span
              className={`max-w-[4.5rem] truncate text-center text-[10px] font-medium md:text-[11px] ${
                isDark ? 'text-zinc-400' : 'text-slate-600'
              }`}
            >
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default MediaShowcaseLogoWall;
