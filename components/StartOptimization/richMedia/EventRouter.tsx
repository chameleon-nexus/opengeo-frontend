import React from 'react';
import type { BaseRichItem, FormField } from './types';
import { ModuleType } from '../../../types';
import { AssistantAvatarShell } from './AssistantAvatarShell';
import TextBubble from './cards/TextBubble';
import FormCard from './cards/FormCard';
import BrandIntakeFormCard from './cards/BrandIntakeFormCard';
import ChartCard from './cards/ChartCard';
import KPICard from './cards/KPICard';
import TableCard from './cards/TableCard';
import DocumentCard from './cards/DocumentCard';
import GenericEventCard from './cards/GenericEventCard';
import BusinessEventCard from './business/BusinessEventCard';

interface Props {
  item: BaseRichItem;
  onFormSubmit: (message: string, payload: Record<string, unknown>) => Promise<unknown>;
  onOpenModule?: (m: ModuleType, opts: { reportId?: number; taskId?: string; workflowId?: string }) => void;
  workflowId?: string | null;
}

const EventRouter: React.FC<Props> = ({ item, onFormSubmit, onOpenModule, workflowId }) => {
  const r = item.render || 'card';
  const d = (item.data || {}) as Record<string, unknown>;

  if (r === 'text' && typeof (d as { content?: string }).content === 'string') {
    const role = item.kind === 'user_chat' ? 'user' : 'agent';
    return <TextBubble content={(d as { content: string }).content} role={role} />;
  }

  if (r === 'form' || item.kind === 'form_request') {
    const formId = String(d.formId ?? 'form');
    const title = String(d.title ?? '表单');
    const fields = (Array.isArray(d.fields) ? d.fields : []) as FormField[];
    const submitTarget = typeof d.submitTarget === 'string' ? d.submitTarget : undefined;
    if (!fields.length) {
      return (
        <AssistantAvatarShell>
          <GenericEventCard item={item} />
        </AssistantAvatarShell>
      );
    }
    if (formId === 'brand_input_form') {
      return (
        <AssistantAvatarShell>
          <BrandIntakeFormCard
            title={title}
            fields={fields as Array<Record<string, unknown>>}
            submitTarget={submitTarget}
            workflowId={workflowId}
            onSubmit={onFormSubmit}
          />
        </AssistantAvatarShell>
      );
    }
    return (
      <AssistantAvatarShell>
        <FormCard
          formId={formId}
          title={title}
          fields={fields}
          submitTarget={submitTarget}
          onSubmit={onFormSubmit}
        />
      </AssistantAvatarShell>
    );
  }

  if (r === 'chart' || item.kind === 'chart_render') {
    const ct = (d.chartType as 'line' | 'bar' | 'pie') || 'line';
    const title = String(d.title ?? '图表');
    const series = Array.isArray(d.series) ? d.series : [];
    return (
      <AssistantAvatarShell>
        <ChartCard chartType={ct} title={title} series={series as never} />
      </AssistantAvatarShell>
    );
  }

  if (r === 'kpi' || item.kind === 'kpi_render') {
    const title = String(d.title ?? '指标');
    const value = String(d.value ?? '—');
    const description = typeof d.description === 'string' ? d.description : '';
    const trendRaw = String(d.trend ?? '').toLowerCase();
    const trend =
      trendRaw === 'up' || trendRaw === 'down' || trendRaw === 'flat' ? (trendRaw as 'up' | 'down' | 'flat') : '';
    return (
      <AssistantAvatarShell>
        <KPICard title={title} value={value} description={description || undefined} trend={trend} />
      </AssistantAvatarShell>
    );
  }

  if (r === 'table' || item.kind === 'table_render') {
    const title = String(d.title ?? '表格');
    const columns = Array.isArray(d.columns) ? (d.columns as unknown[]).map(String) : [];
    const rows = Array.isArray(d.rows) ? (d.rows as unknown[]) : [];
    return (
      <AssistantAvatarShell>
        <TableCard title={title} columns={columns} rows={rows} />
      </AssistantAvatarShell>
    );
  }

  if (r === 'document' || item.kind === 'document_card') {
    return (
      <AssistantAvatarShell>
        <DocumentCard
          title={String(d.title ?? '文档')}
          docKind={String(d.docKind ?? '')}
          refId={d.refId as string | number}
          downloadUrl={typeof d.downloadUrl === 'string' ? d.downloadUrl : undefined}
          deepLink={d.deepLink as never}
          onOpen={onOpenModule}
        />
      </AssistantAvatarShell>
    );
  }

  return (
    <AssistantAvatarShell>
      <BusinessEventCard item={item} onOpenModule={onOpenModule} />
    </AssistantAvatarShell>
  );
};

export default EventRouter;
