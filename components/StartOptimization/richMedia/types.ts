/**
 * 与 backend geo_workflow_memory_state.rich_media_log 对齐
 */

export type RichRender = 'text' | 'card' | 'form' | 'document' | 'chart';

export interface BaseRichItem {
  seq?: number;
  kind: string;
  render?: RichRender;
  phase?: string | null;
  at?: string;
  data?: Record<string, unknown>;
}

export interface TextRichItem extends BaseRichItem {
  render: 'text';
  data: { content: string };
}

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'ai_platform_picker';
  required?: boolean;
  defaultValue?: string;
  /** multiselect / ai_platform_picker 预填（平台 id 列表） */
  defaultValues?: string[];
  placeholder?: string;
  options?: FormFieldOption[];
}

export type RichMediaItem = BaseRichItem;
