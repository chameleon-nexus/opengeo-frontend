import type { TFunction } from 'i18next';
import { WORKBENCH_STAGES, type WorkbenchStage } from './types';

export const STAGE_I18N_KEY: Record<WorkbenchStage, string> = {
  brand_input: 'brandInput',
  brand_parse: 'brandParse',
  report_generation: 'reportGeneration',
  intelligent_optimization: 'intelligentOptimization',
  completion: 'completion',
};

export function stageLabel(t: TFunction<'optimization'>, stage: WorkbenchStage): string {
  const key = STAGE_I18N_KEY[stage];
  const fallback = WORKBENCH_STAGES.find((s) => s.id === stage)?.label ?? stage;
  return t(`stages.${key}.label`, { defaultValue: fallback });
}

export function stageDescription(t: TFunction<'optimization'>, stage: WorkbenchStage): string {
  const key = STAGE_I18N_KEY[stage];
  const fallback = WORKBENCH_STAGES.find((s) => s.id === stage)?.description ?? '';
  return t(`stages.${key}.description`, { defaultValue: fallback });
}
