import { useMemo } from 'react';
import type { GeoWorkflowDTO } from '../../../api/geoWorkflow';
import type { SelectedBrand } from '../types';

export function resolveWorkflowKnowledgeBaseId(
  workflow: GeoWorkflowDTO | null | undefined,
  brand: SelectedBrand | null | undefined
): number | null {
  const w = workflow?.knowledgeBaseId ?? brand?.knowledge_base_id;
  if (w == null || (typeof w === 'string' && w.trim() === '')) return null;
  const n = typeof w === 'number' ? w : Number(w);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function resolveWorkflowSemanticSeoTaskId(
  workflow: GeoWorkflowDTO | null | undefined
): string | null {
  const tid = (workflow?.semanticSeoTaskId ?? '').trim();
  return tid || null;
}

export function useWorkflowKnowledgeAssets(
  workflow: GeoWorkflowDTO | null | undefined,
  brand: SelectedBrand | null | undefined
) {
  const knowledgeBaseId = useMemo(
    () => resolveWorkflowKnowledgeBaseId(workflow, brand),
    [workflow?.knowledgeBaseId, brand?.knowledge_base_id]
  );
  const semanticSeoTaskId = useMemo(
    () => resolveWorkflowSemanticSeoTaskId(workflow),
    [workflow?.semanticSeoTaskId]
  );
  return { knowledgeBaseId, semanticSeoTaskId };
}
