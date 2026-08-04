/**
 * Admin：GEO 工作台字段级表单 FAQ
 */

import apiClient from './client';

export type WorkbenchExecutePhase =
  | 'brand_parse'
  | 'report_generation'
  | 'intelligent_optimization';

export interface GeoStageFieldGuideDTO {
  id: number | null;
  phase: WorkbenchExecutePhase;
  formId: string;
  formTitle: string;
  formSortOrder: number;
  fieldKey: string;
  fieldLabel: string;
  required: boolean;
  dataType: string;
  uiComponent: string;
  apiField: string | null;
  question: string;
  answer: string;
  example: string | null;
  agentHint: string | null;
  relatedTools: string[];
  sortOrder: number;
  version?: number;
  isActive: boolean;
  updatedAt?: string | null;
}

export type GeoStageFieldGuidePayload = Omit<
  GeoStageFieldGuideDTO,
  'id' | 'version' | 'updatedAt'
>;

function mapRow(r: Record<string, unknown>): GeoStageFieldGuideDTO {
  return {
    id: (r.id as number) ?? null,
    phase: r.phase as WorkbenchExecutePhase,
    formId: String(r.formId ?? r.form_id ?? ''),
    formTitle: String(r.formTitle ?? r.form_title ?? ''),
    formSortOrder: Number(r.formSortOrder ?? r.form_sort_order ?? 0),
    fieldKey: String(r.fieldKey ?? r.field_key ?? ''),
    fieldLabel: String(r.fieldLabel ?? r.field_label ?? ''),
    required: Boolean(r.required),
    dataType: String(r.dataType ?? r.data_type ?? 'string'),
    uiComponent: String(r.uiComponent ?? r.ui_component ?? 'text'),
    apiField: (r.apiField ?? r.api_field ?? null) as string | null,
    question: String(r.question ?? ''),
    answer: String(r.answer ?? ''),
    example: (r.example ?? null) as string | null,
    agentHint: (r.agentHint ?? r.agent_hint ?? null) as string | null,
    relatedTools: (r.relatedTools ?? r.related_tools ?? []) as string[],
    sortOrder: Number(r.sortOrder ?? r.sort_order ?? 0),
    version: r.version != null ? Number(r.version) : undefined,
    isActive: r.isActive !== false && r.is_active !== false,
    updatedAt: (r.updatedAt ?? r.updated_at ?? null) as string | null,
  };
}

export const geoStageFieldGuidesAPI = {
  list: async (
    phase: WorkbenchExecutePhase,
    opts?: { formId?: string; q?: string; includeInactive?: boolean }
  ): Promise<GeoStageFieldGuideDTO[]> => {
    const params = new URLSearchParams({ phase });
    if (opts?.formId) params.set('formId', opts.formId);
    if (opts?.q) params.set('q', opts.q);
    if (opts?.includeInactive === false) params.set('includeInactive', 'false');
    const data = await apiClient.get<any>(`/api/admin/geo-stage-field-guides?${params}`);
    const items = data?.items ?? [];
    return items.map((r: Record<string, unknown>) => mapRow(r));
  },

  get: async (id: number): Promise<GeoStageFieldGuideDTO> => {
    const data = await apiClient.get<any>(`/api/admin/geo-stage-field-guides/${id}`);
    return mapRow(data ?? {});
  },

  create: async (payload: GeoStageFieldGuidePayload): Promise<GeoStageFieldGuideDTO> => {
    const data = await apiClient.post<any>('/api/admin/geo-stage-field-guides', {
      phase: payload.phase,
      formId: payload.formId,
      formTitle: payload.formTitle,
      formSortOrder: payload.formSortOrder,
      fieldKey: payload.fieldKey,
      fieldLabel: payload.fieldLabel,
      required: payload.required,
      dataType: payload.dataType,
      uiComponent: payload.uiComponent,
      apiField: payload.apiField,
      question: payload.question,
      answer: payload.answer,
      example: payload.example,
      agentHint: payload.agentHint,
      relatedTools: payload.relatedTools?.length ? payload.relatedTools : null,
      sortOrder: payload.sortOrder,
      isActive: payload.isActive,
    });
    return mapRow(data ?? {});
  },

  update: async (
    id: number,
    patch: Partial<GeoStageFieldGuidePayload>
  ): Promise<GeoStageFieldGuideDTO> => {
    const data = await apiClient.put<any>(`/api/admin/geo-stage-field-guides/${id}`, patch);
    return mapRow(data ?? {});
  },

  toggle: async (id: number): Promise<GeoStageFieldGuideDTO> => {
    const data = await apiClient.patch<any>(`/api/admin/geo-stage-field-guides/${id}/toggle`, {});
    return mapRow(data ?? {});
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/admin/geo-stage-field-guides/${id}`);
  },
};

export const WORKBENCH_EXECUTE_PHASES: { id: WorkbenchExecutePhase; label: string }[] = [
  { id: 'brand_parse', label: '解析品牌' },
  { id: 'report_generation', label: '现状分析' },
  { id: 'intelligent_optimization', label: '智能优化' },
];
