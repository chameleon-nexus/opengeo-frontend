import React from 'react';
import { Loader2, Save } from 'lucide-react';
import { Theme } from '../types';
import type { MediaTier, MediaTierOption } from '../constants/mediaPublishTier';
import { useModuleI18n } from '../../i18n/hooks';
import MediaTierPicker from './MediaTierPicker';
import type { PublishMarket } from '../../constants/overseasMediaShowcaseLogos';

interface Props {
  theme?: Theme;
  options: MediaTierOption[];
  value: MediaTier | null;
  onChange: (tier: MediaTier | null) => void;
  onSave: () => void | Promise<void>;
  market?: PublishMarket;
  saving?: boolean;
  dirty?: boolean;
  disabled?: boolean;
  loading?: boolean;
  allowInherit?: boolean;
  inheritHint?: string;
  saveLabel?: string;
  hint?: string;
}

const MediaTierSaveField: React.FC<Props> = ({
  theme = 'light',
  options,
  value,
  onChange,
  onSave,
  saving = false,
  dirty = true,
  disabled = false,
  loading = false,
  allowInherit = false,
  inheritHint,
  saveLabel,
  hint,
  market = 'domestic',
}) => {
  const { t } = useModuleI18n('publish');
  const isDark = theme === 'dark';
  const resolvedSaveLabel = saveLabel ?? t('actions.save');
  const resolvedHint = hint ?? t('mediaTier.picker.saveHint');

  return (
    <div className="space-y-3">
      <MediaTierPicker
        theme={theme}
        options={options}
        value={value}
        onChange={onChange}
        allowInherit={allowInherit}
        inheritHint={inheritHint}
        disabled={disabled || saving}
        loading={loading}
        market={market}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>{resolvedHint}</p>
        <button
          type="button"
          disabled={disabled || saving || loading || !dirty}
          onClick={() => void onSave()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {saving ? t('mediaTier.picker.saving') : resolvedSaveLabel}
        </button>
      </div>
    </div>
  );
};

export default MediaTierSaveField;
