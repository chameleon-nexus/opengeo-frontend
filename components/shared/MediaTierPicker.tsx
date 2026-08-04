import React from 'react';
import { Theme } from '../../types';
import type { MediaTier, MediaTierOption } from '../../constants/mediaPublishTier';
import { useModuleI18n } from '../../i18n/hooks';
import { localizeMediaTierLabel } from '../../lib/mediaTierI18n';
import MediaTierLogoHint from './MediaTierLogoHint';
import type { PublishMarket } from '../../constants/overseasMediaShowcaseLogos';

interface Props {
  theme?: Theme;
  options: MediaTierOption[];
  value: MediaTier | null;
  onChange: (tier: MediaTier | null) => void;
  market?: PublishMarket;
  /** 单篇模式：允许选择「跟随批次/工作流」 */
  allowInherit?: boolean;
  inheritHint?: string;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
}

const MediaTierPicker: React.FC<Props> = ({
  theme = 'light',
  options,
  value,
  onChange,
  allowInherit = false,
  inheritHint,
  disabled = false,
  loading = false,
  compact = false,
  market = 'domestic',
}) => {
  const { t } = useModuleI18n('publish');
  const isDark = theme === 'dark';
  const resolvedInheritHint = inheritHint ?? t('mediaTier.picker.inheritDefault');

  if (loading || options.length === 0) {
    return (
      <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
        {loading ? t('mediaTier.picker.loading') : t('mediaTier.picker.empty')}
      </p>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 overflow-visible ${compact ? '' : 'gap-3'}`}>
      {allowInherit ? (
        <label
          className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
            value === null
              ? isDark
                ? 'border-violet-500/50 bg-violet-500/10'
                : 'border-violet-300 bg-violet-50'
              : isDark
                ? 'border-zinc-700 bg-zinc-900/40 hover:border-zinc-600'
                : 'border-slate-200 bg-white hover:border-slate-300'
          } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input
            type="radio"
            className="mt-1 h-4 w-4 shrink-0"
            name="media-tier-pick"
            checked={value === null}
            disabled={disabled}
            onChange={() => onChange(null)}
          />
          <span className="min-w-0">
            <span className={`block text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>
              {resolvedInheritHint}
            </span>
          </span>
        </label>
      ) : null}
      {options.map((opt) => {
        const checked = value === opt.tier;
        const label = localizeMediaTierLabel(opt.tier, t, opt.label);
        return (
          <label
            key={opt.tier}
            className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
              checked
                ? isDark
                  ? 'border-violet-500/50 bg-violet-500/10'
                  : 'border-violet-300 bg-violet-50'
                : isDark
                  ? 'border-zinc-700 bg-zinc-900/40 hover:border-zinc-600'
                  : 'border-slate-200 bg-white hover:border-slate-300'
            } ${disabled ? 'opacity-50 pointer-events-none' : ''} ${compact ? 'min-w-[8.5rem] flex-1' : 'min-w-[10rem] flex-1'}`}
          >
            <input
              type="radio"
              className="mt-1 h-4 w-4 shrink-0"
              name="media-tier-pick"
              checked={checked}
              disabled={disabled}
              onChange={() => onChange(opt.tier)}
            />
            <span className="min-w-0">
              <span className={`flex items-center text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>
                {label}
                <MediaTierLogoHint theme={theme} tier={opt.tier} market={market} disabled={disabled} />
              </span>
              <span className={`mt-0.5 block text-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                {t('batchPanel.pointsPerArticle', { count: opt.points })}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
};

export default MediaTierPicker;
