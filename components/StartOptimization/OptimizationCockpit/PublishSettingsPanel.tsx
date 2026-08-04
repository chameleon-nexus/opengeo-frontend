import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import type { Theme } from '../../../types';
import {
  optimizationTaskAPI,
  type OptimizationTaskDTO,
  OPTIMIZATION_TASK_DEFAULT_MAX_ARTICLES_PER_CYCLE,
} from '../../../api/optimizationTask';
import { getMediaPublishTierOptions } from '../../../api/mediaPublishTier';
import type { MediaTier, MediaTierOption } from '../../../constants/mediaPublishTier';
import {
  CONTENT_TEMPLATE_POINTS_ESTIMATE,
  DEFAULT_PUBLISH_SETTINGS_MAX_ARTICLES,
} from '../../../constants/optimizationMode';
import MediaTierSaveField from '../../shared/MediaTierSaveField';
import { resolveCockpitPublishMarket, type OptimizationMarket } from './types';
import { useModuleI18n } from '../../../i18n/hooks';

const MIN_ARTICLES = 1;
const MAX_ARTICLES = 20;

interface Props {
  theme?: Theme;
  optimizationTaskId?: string | null;
  optimizationMarket?: OptimizationMarket | string | null;
  onTaskUpdated?: (task: OptimizationTaskDTO) => void;
}

const PublishSettingsPanel: React.FC<Props> = ({
  theme = 'light',
  optimizationTaskId,
  optimizationMarket,
  onTaskUpdated,
}) => {
  const { t } = useModuleI18n('optimization');
  const market = resolveCockpitPublishMarket(optimizationMarket);
  const [loading, setLoading] = useState(true);
  const [savingArticles, setSavingArticles] = useState(false);
  const [savingTier, setSavingTier] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<OptimizationTaskDTO | null>(null);
  const [articlesDraft, setArticlesDraft] = useState(
    DEFAULT_PUBLISH_SETTINGS_MAX_ARTICLES || OPTIMIZATION_TASK_DEFAULT_MAX_ARTICLES_PER_CYCLE,
  );
  const [articlesSaved, setArticlesSaved] = useState(
    DEFAULT_PUBLISH_SETTINGS_MAX_ARTICLES || OPTIMIZATION_TASK_DEFAULT_MAX_ARTICLES_PER_CYCLE,
  );
  const [tierDraft, setTierDraft] = useState<MediaTier>('standard');
  const [tierSaved, setTierSaved] = useState<MediaTier>('standard');
  const [tierOptions, setTierOptions] = useState<MediaTierOption[]>([]);

  const tid = (optimizationTaskId || '').trim();

  const load = useCallback(async () => {
    if (!tid) {
      setLoading(false);
      setTask(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [taskRes, tiers] = await Promise.all([
        optimizationTaskAPI.get(tid),
        getMediaPublishTierOptions(market),
      ]);
      setTask(taskRes);
      setTierOptions(tiers);
      const n = Math.max(
        MIN_ARTICLES,
        Math.min(MAX_ARTICLES, taskRes.maxArticlesPerCycle || DEFAULT_PUBLISH_SETTINGS_MAX_ARTICLES),
      );
      setArticlesDraft(n);
      setArticlesSaved(n);
      const tier = (taskRes.thirdPartyPublishMediaTier as MediaTier) || 'standard';
      setTierDraft(tier);
      setTierSaved(tier);
    } catch (e: unknown) {
      setError((e as Error)?.message || t('publishSettings.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [tid, market, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const tierPoints = useMemo(() => {
    return tierOptions.find((o) => o.tier === tierDraft)?.points ?? 0;
  }, [tierOptions, tierDraft]);

  const estimatePerCycle = useMemo(() => {
    return articlesDraft * (CONTENT_TEMPLATE_POINTS_ESTIMATE + tierPoints);
  }, [articlesDraft, tierPoints]);

  const handleSaveArticles = async () => {
    if (!tid || savingArticles || articlesDraft === articlesSaved) return;
    setSavingArticles(true);
    setError(null);
    try {
      const updated = await optimizationTaskAPI.patch(tid, {
        max_articles_per_cycle: articlesDraft,
      });
      setTask(updated);
      setArticlesSaved(articlesDraft);
      onTaskUpdated?.(updated);
    } catch (e: unknown) {
      setError((e as Error)?.message || t('publishSettings.saveFailed'));
    } finally {
      setSavingArticles(false);
    }
  };

  const handleSaveTier = async () => {
    if (!tid || savingTier || tierDraft === tierSaved) return;
    setSavingTier(true);
    setError(null);
    try {
      const updated = await optimizationTaskAPI.patch(tid, {
        third_party_publish_media_tier: tierDraft,
      });
      setTask(updated);
      setTierSaved(tierDraft);
      onTaskUpdated?.(updated);
    } catch (e: unknown) {
      setError((e as Error)?.message || t('publishSettings.saveFailed'));
    } finally {
      setSavingTier(false);
    }
  };

  if (!tid) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-sm text-slate-500">
        {t('publishSettings.noTask')}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t('publishSettings.loading')}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6 md:px-8">
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t('publishSettings.title')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('publishSettings.description')}</p>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-800">
              {t('publishSettings.articlesPerCycle')}
            </label>
            <p className="mt-0.5 text-xs text-slate-500">{t('publishSettings.articlesHint')}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={MIN_ARTICLES}
                max={MAX_ARTICLES}
                value={articlesDraft}
                onChange={(e) => {
                  const v = Number.parseInt(e.target.value, 10);
                  if (Number.isNaN(v)) return;
                  setArticlesDraft(Math.max(MIN_ARTICLES, Math.min(MAX_ARTICLES, v)));
                }}
                className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={savingArticles || articlesDraft === articlesSaved}
                onClick={() => void handleSaveArticles()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#E8553F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {savingArticles ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {savingArticles ? t('publishSettings.saving') : t('publishSettings.save')}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className="text-sm font-semibold text-slate-800">
              {t('publishSettings.mediaTier')}
            </label>
            <p className="mt-0.5 text-xs text-slate-500">{t('publishSettings.mediaTierHint')}</p>
            <div className="mt-3">
              <MediaTierSaveField
                theme={theme}
                market={market}
                options={tierOptions}
                value={tierDraft}
                onChange={(nextTier) => {
                  if (nextTier) setTierDraft(nextTier);
                }}
                onSave={handleSaveTier}
                saving={savingTier}
                dirty={tierDraft !== tierSaved}
                loading={tierOptions.length === 0}
                saveLabel={t('publishSettings.save')}
                hint={t('publishSettings.mediaTierSaveHint')}
              />
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p className="font-medium text-slate-900">{t('publishSettings.estimateTitle')}</p>
            <p className="mt-1 text-xs text-slate-500">{t('publishSettings.estimateFormula')}</p>
            <p className="mt-2 text-base font-semibold text-[#E8553F]">
              {t('publishSettings.estimateValue', {
                points: estimatePerCycle,
                articles: articlesDraft,
                content: CONTENT_TEMPLATE_POINTS_ESTIMATE,
                tier: tierPoints,
              })}
            </p>
          </div>
        </div>

        {task ? (
          <p className="text-xs text-slate-400">
            {t('publishSettings.taskId', { id: task.taskId })}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default PublishSettingsPanel;
