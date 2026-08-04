import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Theme } from '../../types';
import type { MediaTier } from '../../constants/mediaPublishTier';
import type { MediaShowcaseLogo } from '../../constants/domesticMediaShowcaseLogos';
import { mediaTierShowcaseLogosForMarket, type PublishMarket } from '../../constants/overseasMediaShowcaseLogos';
import { useModuleI18n } from '../../i18n/hooks';

interface Props {
  theme?: Theme;
  tier: MediaTier;
  market?: PublishMarket;
  disabled?: boolean;
}

const ShowcaseLogo: React.FC<{ logo: MediaShowcaseLogo; isDark: boolean }> = ({ logo, isDark }) => (
  <div className="flex flex-col items-center gap-1">
    <div
      className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg shadow-sm ${logo.bgClass}`}
      title={logo.name}
    >
      {logo.src ? (
        <img
          src={logo.src}
          alt={logo.name}
          className={`h-full w-full object-contain ${logo.imagePad ?? 'p-1'}`}
          loading="lazy"
          draggable={false}
        />
      ) : (
        <span className="px-0.5 text-center text-[8px] font-bold leading-tight text-white">
          {logo.name.slice(0, 2)}
        </span>
      )}
    </div>
    <span
      className={`max-w-[3.25rem] truncate text-center text-[9px] font-medium ${
        isDark ? 'text-zinc-400' : 'text-slate-600'
      }`}
    >
      {logo.name}
    </span>
  </div>
);

const TIER_POPOVER_LAYOUT: Record<MediaTier, { widthClass: string; gridClass: string }> = {
  standard: { widthClass: 'w-[23rem]', gridClass: 'grid-cols-6' },
  premium: { widthClass: 'w-[15.5rem]', gridClass: 'grid-cols-4' },
  authority: { widthClass: 'w-[17.5rem]', gridClass: 'grid-cols-4' },
};

const MediaTierLogoHint: React.FC<Props> = ({
  theme = 'light',
  tier,
  market = 'domestic',
  disabled = false,
}) => {
  const { t } = useModuleI18n('publish');
  const isDark = theme === 'dark';
  const logos = mediaTierShowcaseLogosForMarket(market, tier);
  const summaryKey =
    market === 'overseas'
      ? (`mediaTier.overseasTiers.${tier}.summary` as const)
      : (`mediaTier.tiers.${tier}.summary` as const);
  const summary = t(summaryKey, { defaultValue: t(`mediaTier.tiers.${tier}.summary`) });
  const layout = TIER_POPOVER_LAYOUT[tier];

  return (
    <span
      className={`group/hint relative ml-1 inline-flex shrink-0 align-middle ${
        disabled ? 'pointer-events-none opacity-40' : ''
      }`}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={`${t('mediaTier.hint.viewSummary')}: ${summary}`}
        className={`inline-flex rounded-full p-0.5 transition-colors ${
          isDark
            ? 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
        }`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      <div
        role="tooltip"
        className={`pointer-events-none absolute left-full top-1/2 z-[200] ml-2 -translate-y-1/2 rounded-xl border p-3 opacity-0 shadow-lg transition-opacity duration-150 invisible group-hover/hint:visible group-hover/hint:opacity-100 ${layout.widthClass} ${
          isDark ? 'border-zinc-700 bg-zinc-900' : 'border-slate-200 bg-white'
        }`}
      >
        <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
          {summary}
        </p>
        <div className={`mt-2.5 grid gap-x-1.5 gap-y-2 ${layout.gridClass}`}>
          {logos.map((logo) => (
            <ShowcaseLogo key={logo.name} logo={logo} isDark={isDark} />
          ))}
        </div>
      </div>
    </span>
  );
};

export default MediaTierLogoHint;
