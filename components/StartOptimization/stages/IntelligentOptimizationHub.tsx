import React, { useState } from 'react';
import { ArrowRight, Globe, Loader2, MapPin } from 'lucide-react';
import { geoWorkflowAPI, type GeoWorkflowDTO } from '../../../api/geoWorkflow';
import { useModuleI18n } from '../../../i18n/hooks';
import type { SelectedBrand } from '../types';

interface Props {
  brand: SelectedBrand;
  workflow: GeoWorkflowDTO;
  onEnterCockpit: () => void;
  onAdvanced: (wf: GeoWorkflowDTO) => void;
}

const ACTIVE_CARD_CLS =
  'group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-[#E8553F]/40 hover:bg-orange-50/30';

const DISABLED_CARD_CLS =
  'rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-5 text-left opacity-80';

function resolveHubMarket(workflow: GeoWorkflowDTO): 'domestic' | 'overseas' {
  return workflow.optimizationMarket === 'overseas' ? 'overseas' : 'domestic';
}

const IntelligentOptimizationHub: React.FC<Props> = ({
  brand,
  workflow,
  onEnterCockpit,
  onAdvanced,
}) => {
  const { t } = useModuleI18n('optimization');
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const market = resolveHubMarket(workflow);
  const domesticEnabled = market === 'domestic';
  const overseasEnabled = market === 'overseas';

  const finishWorkflow = async () => {
    setCompleting(true);
    setError(null);
    try {
      const wf = await geoWorkflowAPI.advance(workflow.workflowId, {
        completion_reason: 'manual_stop',
      });
      onAdvanced(wf);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('hub.finishFailed'));
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl space-y-4 px-2 py-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-[#111827]">{t('hub.title')}</h2>
        <p className="mt-1 text-sm text-[#64748b]">
          {t('hub.subtitle', { brandName: brand.name })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {domesticEnabled ? (
          <button type="button" onClick={onEnterCockpit} className={ACTIVE_CARD_CLS}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <MapPin className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="mt-4 text-base font-semibold text-[#111827]">{t('hub.domesticTitle')}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#64748b]">{t('hub.domesticDescription')}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#E8553F]">
              {t('hub.enterCockpit')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </button>
        ) : (
          <div className={DISABLED_CARD_CLS} aria-disabled>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <MapPin className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="mt-4 text-base font-semibold text-[#64748b]">{t('hub.domesticTitle')}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#94a3b8]">{t('hub.domesticLocked')}</p>
          </div>
        )}

        {overseasEnabled ? (
          <button type="button" onClick={onEnterCockpit} className={ACTIVE_CARD_CLS}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Globe className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="mt-4 text-base font-semibold text-[#111827]">{t('hub.overseasTitle')}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#64748b]">{t('hub.overseasDescription')}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#E8553F]">
              {t('hub.enterCockpit')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </button>
        ) : (
          <div className={DISABLED_CARD_CLS} aria-disabled>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <Globe className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="mt-4 text-base font-semibold text-[#64748b]">{t('hub.overseasTitle')}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#94a3b8]">{t('hub.overseasNotOpen')}</p>
          </div>
        )}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      ) : null}

      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={() => void finishWorkflow()}
          disabled={completing}
          className="btn-geo-secondary min-w-[140px] disabled:opacity-50"
        >
          {completing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t('hub.finishing')}
            </>
          ) : (
            t('hub.finish')
          )}
        </button>
      </div>
    </div>
  );
};

export default IntelligentOptimizationHub;
