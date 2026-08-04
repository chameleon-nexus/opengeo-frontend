import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  DEFAULT_OVERSEAS_WRITING_LANGUAGE,
  OVERSEAS_WRITING_LANGUAGE_OPTIONS,
} from '../../../constants/overseasWritingLanguage';
import { useModuleI18n } from '../../../i18n/hooks';

export interface OptimizationMarketSelection {
  optimizationMarket: 'domestic' | 'overseas';
  overseasWritingLanguage: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (selection: OptimizationMarketSelection) => void | Promise<void>;
  busy?: boolean;
  /** 非 admin 为 false：仅可选国内 */
  canSelectOverseas?: boolean;
}

const OptimizationMarketModal: React.FC<Props> = ({
  open,
  onClose,
  onConfirm,
  busy = false,
  canSelectOverseas = true,
}) => {
  const { t } = useModuleI18n('optimization');
  const [optimizationMarket, setOptimizationMarket] = useState<'domestic' | 'overseas'>('domestic');
  const [overseasWritingLanguage, setOverseasWritingLanguage] = useState(
    DEFAULT_OVERSEAS_WRITING_LANGUAGE,
  );

  useEffect(() => {
    if (!open) return;
    if (!canSelectOverseas) {
      setOptimizationMarket('domestic');
    }
  }, [open, canSelectOverseas]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h3 className="text-lg font-semibold text-slate-900">
          {t('stages.reportGeneration.marketModalTitle')}
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          {t('stages.reportGeneration.marketModalHint')}
        </p>
        <div className="mt-5 space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:border-[#E8553F]/40">
            <input
              type="radio"
              name="optimizationMarket"
              checked={optimizationMarket === 'domestic'}
              onChange={() => setOptimizationMarket('domestic')}
              className="mt-1"
            />
            <span className="text-sm text-slate-800">
              {t('stages.reportGeneration.marketDomestic')}
            </span>
          </label>
          <label
            className={`flex items-start gap-3 rounded-xl border border-slate-200 p-3 ${
              canSelectOverseas
                ? 'cursor-pointer hover:border-[#E8553F]/40'
                : 'cursor-not-allowed bg-slate-50 opacity-70'
            }`}
          >
            <input
              type="radio"
              name="optimizationMarket"
              checked={optimizationMarket === 'overseas'}
              onChange={() => {
                if (canSelectOverseas) setOptimizationMarket('overseas');
              }}
              disabled={!canSelectOverseas}
              className="mt-1"
            />
            <span className="text-sm text-slate-800">
              {t('stages.reportGeneration.marketOverseas')}
              {!canSelectOverseas ? (
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  {t('stages.reportGeneration.marketOverseasAdminOnly')}
                </span>
              ) : null}
            </span>
          </label>
          {optimizationMarket === 'overseas' && canSelectOverseas ? (
            <div className="space-y-2 pl-1">
              <label className="text-xs font-semibold text-slate-500">
                {t('stages.reportGeneration.targetLanguage')}
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={overseasWritingLanguage}
                onChange={(e) => setOverseasWritingLanguage(e.target.value)}
              >
                {OVERSEAS_WRITING_LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="btn-geo-secondary"
            disabled={busy}
            onClick={onClose}
          >
            {t('common.cancel', { defaultValue: '取消' })}
          </button>
          <button
            type="button"
            className="btn-geo-primary disabled:opacity-60"
            disabled={busy}
            onClick={() =>
              void onConfirm({
                optimizationMarket: canSelectOverseas ? optimizationMarket : 'domestic',
                overseasWritingLanguage,
              })
            }
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('stages.reportGeneration.entering')}
              </>
            ) : (
              t('stages.reportGeneration.confirmEnterOptimization')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OptimizationMarketModal;
