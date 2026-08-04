import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BoxSelect,
  Clock,
  Database,
  FileText,
  Loader2,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  StopCircle,
  Trash2,
  Upload,
} from 'lucide-react';
import { Theme } from '../types';
import {
  webMainContentTaskAPI,
  type ContentTaskGenerationMode,
  type ContentTaskAnswerTemplate,
  type ContentTaskTitleStyle,
  type CreateWebMainContentTaskPayload,
  type PatchWebMainContentTaskPayload,
  type WebMainContentTaskDTO,
} from '../api/webMainContentTask';
import { knowledgeAPI, type Document as KbDocument } from '../api/knowledge';
import { writingLanguagesAPI, type WritingLanguageOption } from '../api/writingLanguages';
import { sitesAPI, type SiteRow } from '../api/sites';
import { listWebMainColumnsForSite, type WebMainColumnRow } from '../api/webMainSite';
import { useModuleI18n } from '../i18n/hooks';
import KnowledgeBaseMaterialsUploadModal from './StartOptimization/shared/KnowledgeBaseMaterialsUploadModal';

interface Props {
  theme: Theme;
  initialDetailTaskId?: string | null;
  initialSiteIdFilter?: number;
  onOpenArticles?: (siteId?: number, contentTaskId?: string) => void;
  onInitialRouteConsumed?: () => void;
}

type Phase = 'list' | 'create' | 'edit' | 'detail';
type DetailTab = 'cycles' | 'knowledge';

const defaultFormState = () => ({
  name: '',
  generationMode: 'rewrite' as ContentTaskGenerationMode,
  topicPrompt: '',
  keywordsText: '',
  maxKeywords: 3,
  maxArticles: 5,
  titlePoolSize: 100,
  iqsNumResultsPerKeyword: 10,
  scheduleMode: 'recurring' as 'recurring' | 'once_only',
  recurringCycle: 'daily' as 'daily' | 'weekly' | 'monthly',
  runImmediatelyOnCreate: false,
  scheduleHour: 9,
  scheduleDayOfWeek: 0,
  scheduleDayOfMonth: 1,
  authorName: '编辑',
  customPrompt: '',
  writingLanguage: 'zh-Hans',
  baiduPushToken: '',
  titleStyle: 'question' as ContentTaskTitleStyle,
  answerTemplate: 'qa' as ContentTaskAnswerTemplate,
  topicClusterId: '',
  enableCycleRoundup: true,
  roundupMaxItems: 5,
  defaultColumnId: '' as number | '',
});

function scheduleFieldsFromForm(form: ReturnType<typeof defaultFormState>) {
  if (form.scheduleMode === 'once_only') {
    return {
      schedule_cycle: 'once',
      run_immediately: true,
    };
  }
  return {
    schedule_cycle: form.recurringCycle,
    run_immediately: form.runImmediatelyOnCreate,
    schedule_hour: form.scheduleHour,
    schedule_day_of_week: form.recurringCycle === 'weekly' ? form.scheduleDayOfWeek : undefined,
    schedule_day_of_month: form.recurringCycle === 'monthly' ? form.scheduleDayOfMonth : undefined,
  };
}

function seoFieldsFromForm(
  form: ReturnType<typeof defaultFormState>,
  mode: ContentTaskGenerationMode,
) {
  const base: Pick<
    CreateWebMainContentTaskPayload,
    'answer_template' | 'topic_cluster_id' | 'title_style' | 'enable_cycle_roundup' | 'roundup_max_items'
  > = {
    answer_template: form.answerTemplate,
    topic_cluster_id: form.topicClusterId.trim() || undefined,
  };
  if (mode === 'associate') {
    base.title_style = form.titleStyle;
  }
  if (mode === 'rewrite' || mode === 'iqs_feed') {
    base.enable_cycle_roundup = form.enableCycleRoundup;
    base.roundup_max_items = form.roundupMaxItems;
  }
  return base;
}

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const geoBlue = '#3B82F6';

const inputCls =
  'w-full px-5 py-3 rounded-xl border-2 outline-none font-bold transition-all bg-slate-50 border-slate-100 text-slate-900 focus:border-blue-500';

const primaryBtnCls =
  'flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm shadow-sm hover-scale bg-gradient-coral text-white shadow-coral hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed';

function formatDtr(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
}

function scheduleLabel(t: WebMainContentTaskDTO): string {
  const c = t.scheduleCycle || 'daily';
  const h = t.scheduleHour ?? 9;
  if (c === 'once') return '仅执行一次';
  if (c === 'weekly') {
    const dow = t.scheduleDayOfWeek ?? 0;
    return `每周${WEEKDAY_LABELS[dow] ?? '一'} · ${h}点`;
  }
  if (c === 'monthly') {
    return `每月${t.scheduleDayOfMonth ?? 1}日 · ${h}点`;
  }
  return `每天 · ${h}点`;
}

function statusBadge(status: string, tr: (key: string) => string) {
  const label = tr(`webMainContentTasks.status.${status}`);
  const map: Record<string, { cls: string }> = {
    running: { cls: 'bg-blue-100 text-blue-700' },
    paused: { cls: 'bg-amber-100 text-amber-800' },
    stopped: { cls: 'bg-slate-200 text-slate-800' },
    completed: { cls: 'bg-emerald-100 text-emerald-800' },
    expired: { cls: 'bg-orange-100 text-orange-800' },
    pending: { cls: 'bg-slate-100 text-slate-600' },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-1.5 ${s.cls}`}>
      {status === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {label}
    </span>
  );
}

const WebMainContentTasks: React.FC<Props> = ({
  theme: _theme,
  initialDetailTaskId,
  initialSiteIdFilter,
  onOpenArticles,
  onInitialRouteConsumed,
}) => {
  const { t: tr } = useModuleI18n('site');
  void _theme;
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [siteFilter, setSiteFilter] = useState<number | 'all'>(initialSiteIdFilter ?? 'all');
  const [createSiteId, setCreateSiteId] = useState<number | ''>(initialSiteIdFilter ?? '');
  const [phase, setPhase] = useState<Phase>('list');
  const [tasks, setTasks] = useState<WebMainContentTaskDTO[]>([]);
  const [detail, setDetail] = useState<WebMainContentTaskDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [languageOptions, setLanguageOptions] = useState<WritingLanguageOption[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editReturnPhase, setEditReturnPhase] = useState<'list' | 'detail'>('list');
  const [form, setForm] = useState(defaultFormState);
  const [createKbFiles, setCreateKbFiles] = useState<File[]>([]);
  const [detailKbFiles, setDetailKbFiles] = useState<File[]>([]);
  const [kbModalOpen, setKbModalOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('cycles');
  const [kbDocuments, setKbDocuments] = useState<KbDocument[]>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbUploading, setKbUploading] = useState(false);
  const [siteColumns, setSiteColumns] = useState<WebMainColumnRow[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const params = siteFilter === 'all' ? undefined : { site_id: siteFilter };
      setTasks(await webMainContentTaskAPI.list(params));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : tr('webMainContentTasks.errors.loadFailed'));
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [siteFilter]);

  useEffect(() => {
    sitesAPI.listMine().then((data) => {
      const rows = data.sites || [];
      setSites(rows);
      if (!createSiteId && rows.length === 1) setCreateSiteId(rows[0].id);
    }).catch(() => setSites([]));
  }, []);

  useEffect(() => {
    void writingLanguagesAPI.list({ scope: 'all' }).then(setLanguageOptions).catch(() => {
      setLanguageOptions([
        { code: 'zh-Hans', label: '简体中文' },
        { code: 'en', label: '英文' },
      ]);
    });
  }, []);

  useEffect(() => {
    if (initialSiteIdFilter != null) setSiteFilter(initialSiteIdFilter);
  }, [initialSiteIdFilter]);

  useEffect(() => {
    if (!createSiteId) {
      setSiteColumns([]);
      return;
    }
    let cancelled = false;
    setColumnsLoading(true);
    void listWebMainColumnsForSite(Number(createSiteId))
      .then((cols) => {
        if (!cancelled) setSiteColumns(cols);
      })
      .catch(() => {
        if (!cancelled) setSiteColumns([]);
      })
      .finally(() => {
        if (!cancelled) setColumnsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [createSiteId]);

  useEffect(() => {
    if (phase !== 'create' && phase !== 'edit') return;
    setForm((f) => {
      if (!f.defaultColumnId) return f;
      if (siteColumns.some((c) => c.id === f.defaultColumnId)) return f;
      return { ...f, defaultColumnId: '' };
    });
  }, [siteColumns, phase]);

  const loadDetail = useCallback(async (taskId: string) => {
    setLoading(true);
    setErr(null);
    try {
      const data = await webMainContentTaskAPI.get(taskId);
      setDetail(data);
      setDetailTab('cycles');
      setPhase('detail');
      if (data.siteId != null && (data.generationMode === 'associate' || data.generationMode === 'iqs_feed')) {
        void listWebMainColumnsForSite(data.siteId)
          .then(setSiteColumns)
          .catch(() => setSiteColumns([]));
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '加载详情失败');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadKbDocuments = useCallback(async (kbId?: number | null) => {
    if (!kbId) {
      setKbDocuments([]);
      return;
    }
    setKbLoading(true);
    try {
      setKbDocuments(await knowledgeAPI.list(kbId));
    } catch {
      setKbDocuments([]);
    } finally {
      setKbLoading(false);
    }
  }, []);

  useEffect(() => {
    if (phase === 'detail' && detail?.generationMode === 'original' && detailTab === 'knowledge') {
      void loadKbDocuments(detail.knowledgeBaseId);
    }
  }, [phase, detail, detailTab, loadKbDocuments]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const modeLabel = (mode?: ContentTaskGenerationMode) => {
    if (mode === 'original') return '原创（RAG）';
    if (mode === 'associate') return '联想（标题池）';
    if (mode === 'iqs_feed') return 'IQS 资讯译编';
    return '二创（联网）';
  };

  const taskTopicOrKeywords = (t: WebMainContentTaskDTO) =>
    t.generationMode === 'original' || t.generationMode === 'associate'
      ? (t.topicPrompt || '—')
      : (t.seedKeywords || []).join('、') || '—';

  const columnNameById = useCallback(
    (columnId?: number | null) => {
      if (!columnId) return null;
      const col = siteColumns.find((c) => c.id === columnId);
      return col?.name || `栏目 #${columnId}`;
    },
    [siteColumns],
  );

  useEffect(() => {
    if (!initialDetailTaskId) return;
    void loadDetail(initialDetailTaskId);
    onInitialRouteConsumed?.();
  }, [initialDetailTaskId, loadDetail, onInitialRouteConsumed]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      t =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.taskId || '').toLowerCase().includes(q) ||
        (t.seedKeywords || []).some(k => String(k).toLowerCase().includes(q)),
    );
  }, [tasks, searchQuery]);

  const handleSearch = () => setSearchQuery(searchInput.trim());
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const populateFormFromTask = (task: WebMainContentTaskDTO) => {
    setForm({
      name: task.name || '',
      generationMode: task.generationMode || 'rewrite',
      topicPrompt: task.topicPrompt || '',
      keywordsText: (task.seedKeywords || []).join('\n'),
      maxKeywords: task.maxKeywordsPerCycle ?? 3,
      maxArticles: task.maxArticlesPerCycle ?? 5,
      titlePoolSize: task.titlePoolSize ?? 100,
      iqsNumResultsPerKeyword: task.iqsNumResultsPerKeyword ?? 10,
      scheduleMode: task.scheduleCycle === 'once' ? 'once_only' : 'recurring',
      recurringCycle:
        task.scheduleCycle === 'weekly'
          ? 'weekly'
          : task.scheduleCycle === 'monthly'
            ? 'monthly'
            : 'daily',
      runImmediatelyOnCreate: false,
      scheduleHour: task.scheduleHour ?? 9,
      scheduleDayOfWeek: task.scheduleDayOfWeek ?? 0,
      scheduleDayOfMonth: task.scheduleDayOfMonth ?? 1,
      authorName: task.authorName || '编辑',
      customPrompt: task.customPrompt || '',
      writingLanguage: task.writingLanguage || 'zh-Hans',
      baiduPushToken: task.baiduPushToken || '',
      titleStyle: (task.titleStyle as ContentTaskTitleStyle) || 'question',
      answerTemplate: (task.answerTemplate as ContentTaskAnswerTemplate) || 'qa',
      topicClusterId: task.topicClusterId || '',
      enableCycleRoundup: task.enableCycleRoundup !== false,
      roundupMaxItems: task.roundupMaxItems ?? 5,
      defaultColumnId: task.defaultColumnId ?? '',
    });
    if (task.siteId != null) setCreateSiteId(task.siteId);
    setEditingTaskId(task.taskId);
  };

  const openEditForTask = (task: WebMainContentTaskDTO) => {
    if (task.status === 'stopped' || task.status === 'expired' || task.status === 'completed') {
      alert('任务已结束，不可编辑');
      return;
    }
    setEditReturnPhase(phase === 'detail' ? 'detail' : 'list');
    populateFormFromTask(task);
    setPhase('edit');
  };

  const exitEdit = (updated?: WebMainContentTaskDTO) => {
    const returnTo = editReturnPhase;
    setEditingTaskId(null);
    if (returnTo === 'detail') {
      if (updated) setDetail(updated);
      setPhase('detail');
      return;
    }
    void loadList();
    setPhase('list');
  };

  const parseKeywords = () =>
    form.keywordsText
      .split(/[,，\n]/)
      .map(s => s.trim())
      .filter(Boolean);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      alert('请填写任务名称');
      return;
    }
    if (!createSiteId) {
      alert('请选择目标站点');
      return;
    }
    const isOriginal = form.generationMode === 'original';
    const isAssociate = form.generationMode === 'associate';
    const isIqsFeed = form.generationMode === 'iqs_feed';
    const isRewrite = form.generationMode === 'rewrite';
    const kws = parseKeywords();
    if (isOriginal) {
      if (!form.topicPrompt.trim()) {
        alert('请填写主题提示词');
        return;
      }
      if (createKbFiles.length === 0) {
        alert('原创模式请至少上传一个知识库文件');
        return;
      }
    } else if (isAssociate) {
      if (!form.topicPrompt.trim()) {
        alert('请填写主题');
        return;
      }
      if (!form.defaultColumnId) {
        alert('请选择发布栏目');
        return;
      }
    } else if (isIqsFeed) {
      if (kws.length === 0) {
        alert('请填写至少一个关键词');
        return;
      }
      if (!form.defaultColumnId) {
        alert('请选择发布栏目');
        return;
      }
    } else if (kws.length === 0) {
      alert('请填写至少一个关键词');
      return;
    }
    setSaving(true);
    try {
      const sched = scheduleFieldsFromForm(form);
      const body: CreateWebMainContentTaskPayload = {
        site_id: Number(createSiteId),
        name: form.name.trim(),
        generation_mode: form.generationMode,
        topic_prompt: isOriginal || isAssociate ? form.topicPrompt.trim() : undefined,
        title_pool_size: isAssociate ? form.titlePoolSize : undefined,
        iqs_num_results_per_keyword: isIqsFeed ? form.iqsNumResultsPerKeyword : undefined,
        seed_keywords: isOriginal || isAssociate ? [] : kws,
        ...(isRewrite ? { max_keywords_per_cycle: form.maxKeywords } : {}),
        ...(isOriginal
          ? { max_articles_per_cycle: 1 }
          : isIqsFeed
            ? {}
            : { max_articles_per_cycle: form.maxArticles }),
        ...sched,
        author_name: form.authorName,
        custom_prompt: isOriginal ? undefined : form.customPrompt || undefined,
        writing_language: form.writingLanguage,
        baidu_push_token: form.baiduPushToken.trim() || undefined,
        default_column_id: isAssociate || isIqsFeed ? Number(form.defaultColumnId) : undefined,
        ...seoFieldsFromForm(form, form.generationMode),
      };
      const created = await webMainContentTaskAPI.create(body);
      if (isOriginal && createKbFiles.length > 0) {
        const updated = await webMainContentTaskAPI.uploadKnowledge(created.taskId, createKbFiles);
        setCreateKbFiles([]);
        await loadList();
        setPhase('detail');
        setDetailTab('knowledge');
        setDetail(updated);
        return;
      }
      await loadList();
      setPhase('detail');
      setDetail(created);
    } catch (e: unknown) {
      alert((e as Error).message || '创建失败');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingTaskId) return;
    if (!form.name.trim()) {
      alert('请填写任务名称');
      return;
    }
    const isOriginal = form.generationMode === 'original';
    const isAssociate = form.generationMode === 'associate';
    const isIqsFeed = form.generationMode === 'iqs_feed';
    const kws = parseKeywords();
    if (isOriginal) {
      if (!form.topicPrompt.trim()) {
        alert('请填写主题提示词');
        return;
      }
    } else if (isAssociate) {
      if (!form.topicPrompt.trim()) {
        alert('请填写主题');
        return;
      }
      if (!form.defaultColumnId) {
        alert('请选择发布栏目');
        return;
      }
    } else if (isIqsFeed) {
      if (kws.length === 0) {
        alert('请填写至少一个关键词');
        return;
      }
      if (!form.defaultColumnId) {
        alert('请选择发布栏目');
        return;
      }
    } else if (kws.length === 0) {
      alert('请填写至少一个关键词');
      return;
    }
    setSaving(true);
    try {
      const sched = scheduleFieldsFromForm(form);
      const scheduleFields = {
        schedule_cycle: sched.schedule_cycle,
        schedule_hour: sched.schedule_hour,
        schedule_day_of_week: sched.schedule_day_of_week,
        schedule_day_of_month: sched.schedule_day_of_month,
      };
      const body: PatchWebMainContentTaskPayload = isOriginal
        ? {
            name: form.name.trim(),
            topic_prompt: form.topicPrompt.trim(),
            ...scheduleFields,
            author_name: form.authorName,
            writing_language: form.writingLanguage,
            baidu_push_token: form.baiduPushToken.trim() || null,
            ...seoFieldsFromForm(form, 'original'),
          }
        : isAssociate
          ? {
              name: form.name.trim(),
              topic_prompt: form.topicPrompt.trim(),
              max_articles_per_cycle: form.maxArticles,
              ...scheduleFields,
              author_name: form.authorName,
              custom_prompt: form.customPrompt || undefined,
              writing_language: form.writingLanguage,
              baidu_push_token: form.baiduPushToken.trim() || null,
              default_column_id: Number(form.defaultColumnId),
              ...seoFieldsFromForm(form, 'associate'),
            }
          : isIqsFeed
            ? {
                name: form.name.trim(),
                seed_keywords: kws,
                iqs_num_results_per_keyword: form.iqsNumResultsPerKeyword,
                ...scheduleFields,
                author_name: form.authorName,
                custom_prompt: form.customPrompt || undefined,
                writing_language: form.writingLanguage,
                baidu_push_token: form.baiduPushToken.trim() || null,
                default_column_id: Number(form.defaultColumnId),
                ...seoFieldsFromForm(form, 'iqs_feed'),
              }
            : {
              name: form.name.trim(),
              seed_keywords: kws,
              max_keywords_per_cycle: form.maxKeywords,
              max_articles_per_cycle: form.maxArticles,
              ...scheduleFields,
              author_name: form.authorName,
              custom_prompt: form.customPrompt || undefined,
              writing_language: form.writingLanguage,
              baidu_push_token: form.baiduPushToken.trim() || null,
              ...seoFieldsFromForm(form, 'rewrite'),
            };
      const updated = await webMainContentTaskAPI.patch(editingTaskId, body);
      exitEdit(updated);
    } catch (e: unknown) {
      alert((e as Error).message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDetailKbUpload = async (files: File[]) => {
    if (!detail || files.length === 0) return;
    setKbUploading(true);
    try {
      const updated = await webMainContentTaskAPI.uploadKnowledge(detail.taskId, files);
      setDetail(updated);
      await loadKbDocuments(updated.knowledgeBaseId);
    } catch (e: unknown) {
      alert((e as Error).message || '上传失败');
    } finally {
      setKbUploading(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 p-8 lg:p-12 overflow-y-auto no-scrollbar">
        <div className="max-w-[1400px] mx-auto space-y-10">{children}</div>
      </div>
    </div>
  );

  if (phase === 'create' || phase === 'edit') {
    const isEdit = phase === 'edit';
    const isOriginal = form.generationMode === 'original';
    const isAssociate = form.generationMode === 'associate';
    const isIqsFeed = form.generationMode === 'iqs_feed';
    const isRewrite = form.generationMode === 'rewrite';
    const estimatedCycles =
      isAssociate && form.titlePoolSize > 0 && form.maxArticles > 0
        ? Math.ceil(form.titlePoolSize / form.maxArticles)
        : null;
    const iqsKeywordCount =
      isIqsFeed && (phase === 'create' || phase === 'edit')
        ? form.keywordsText
            .split(/[,，\n]/)
            .map(s => s.trim())
            .filter(Boolean).length
        : 0;
    const iqsPlannedArticles =
      iqsKeywordCount > 0 ? iqsKeywordCount * form.iqsNumResultsPerKeyword : 0;
    return shell(
      <>
        <KnowledgeBaseMaterialsUploadModal
          open={kbModalOpen}
          onClose={() => setKbModalOpen(false)}
          files={createKbFiles}
          onChangeFiles={setCreateKbFiles}
          inputId="wm-content-kb-upload"
        />
        <button
          type="button"
          onClick={() => {
            if (isEdit) {
              exitEdit();
            } else {
              setPhase('list');
              setEditingTaskId(null);
            }
          }}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 返回{isEdit ? (editReturnPhase === 'detail' ? '详情' : '列表') : '列表'}
        </button>
        <div className="space-y-3">
          <h2 className="text-4xl font-semibold tracking-tight text-slate-900">
            {tr(isEdit ? 'webMainContentTasks.editTitle' : 'webMainContentTasks.createTitle')}
          </h2>
          <p className="text-sm text-slate-500">
            {isEdit
              ? tr('webMainContentTasks.editHint')
              : isOriginal
                ? '上传知识库材料并填写主题，系统将基于 RAG 检索每周期原创 1 篇文章并发布到主站。'
                : isAssociate
                  ? '填写主题并选择发布栏目，系统将一次性生成多个延展标题；每篇成稿固定发布到所选栏目。'
                  : isIqsFeed
                    ? '每周期按关键词调用 IQS 检索最新资讯，当轮按所选「内容语言」译编润色并发布；已用链接记入去重池，保证内容新鲜。'
                    : '按关键词联网搜资讯（中文检索），自动二创并发布到主站资讯。分类与栏目由 AI 自动匹配。'}
          </p>
        </div>
        <div className="rounded-2xl border p-8 space-y-6 bg-white border-slate-200 shadow-sm">
          {!isEdit && (
            <div className="space-y-2">
              <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">创作模式</label>
              <div className="flex flex-wrap gap-3">
                {(['rewrite', 'associate', 'iqs_feed', 'original'] as ContentTaskGenerationMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, generationMode: m }))}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                      form.generationMode === m
                        ? 'border-[#E8553F] bg-orange-50 text-[#E8553F]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {modeLabel(m)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">目标站点 *</label>
            {isEdit ? (
              <div className={`${inputCls} bg-slate-100 text-slate-600 cursor-not-allowed`}>
                {sites.find(s => s.id === createSiteId)?.display_name || `站点 #${createSiteId}`}
              </div>
            ) : (
              <select
                className={inputCls}
                value={createSiteId}
                onChange={(e) => {
                  const next = e.target.value ? Number(e.target.value) : '';
                  setCreateSiteId(next);
                  setForm((f) => ({ ...f, defaultColumnId: '' }));
                }}
              >
                <option value="">请选择站点</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.display_name} ({s.primary_host})</option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">任务名称</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="例如：GEO 行业资讯周报"
              onFocus={e => {
                e.currentTarget.style.borderColor = geoBlue;
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'rgb(241 245 249)';
              }}
            />
          </div>
          {isOriginal ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">主题提示词 *</label>
                <textarea
                  className={`${inputCls} min-h-[100px] font-medium`}
                  value={form.topicPrompt}
                  onChange={e => setForm(f => ({ ...f, topicPrompt: e.target.value }))}
                  placeholder="例如：介绍公司核心产品与行业解决方案"
                />
              </div>
              {!isEdit && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">知识库材料 *</label>
                  <button
                    type="button"
                    onClick={() => setKbModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Upload className="w-4 h-4" />
                    {createKbFiles.length > 0 ? `已选 ${createKbFiles.length} 个文件` : '上传知识库材料'}
                  </button>
                </div>
              )}
            </>
          ) : isAssociate ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">主题 *</label>
                <input
                  className={inputCls}
                  value={form.topicPrompt}
                  onChange={e => setForm(f => ({ ...f, topicPrompt: e.target.value }))}
                  placeholder="例如：LangGraph"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">发布栏目 *</label>
                <select
                  className={inputCls}
                  value={form.defaultColumnId}
                  disabled={!createSiteId || columnsLoading}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      defaultColumnId: e.target.value ? Number(e.target.value) : '',
                    }))
                  }
                >
                  <option value="">
                    {!createSiteId
                      ? '请先选择目标站点'
                      : columnsLoading
                        ? '加载栏目…'
                        : siteColumns.length === 0
                          ? '该站点暂无栏目'
                          : '请选择栏目'}
                  </option>
                  {siteColumns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 ml-1">
                  本任务生成的全部文章将固定发布到此栏目，不再由 AI 自动匹配。
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">规划标题数</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    className={inputCls}
                    value={form.titlePoolSize}
                    disabled={isEdit}
                    onChange={e => setForm(f => ({ ...f, titlePoolSize: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">每周期发文数</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    className={inputCls}
                    value={form.maxArticles}
                    onChange={e => setForm(f => ({ ...f, maxArticles: Number(e.target.value) }))}
                  />
                </div>
              </div>
              {estimatedCycles != null && !isEdit && (
                <p className="text-xs text-slate-500 ml-1">
                  共 {form.titlePoolSize} 篇选题，每周期 {form.maxArticles} 篇，约 {estimatedCycles} 个排期日发完
                </p>
              )}
              <div className="space-y-2">
                <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">二创风格提示（可选）</label>
                <textarea
                  className={`${inputCls} min-h-[80px] font-medium`}
                  value={form.customPrompt}
                  onChange={e => setForm(f => ({ ...f, customPrompt: e.target.value }))}
                />
              </div>
            </>
          ) : isIqsFeed ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">
                  搜索关键词（逗号或换行分隔） *
                </label>
                <textarea
                  className={`${inputCls} min-h-[100px] font-medium`}
                  value={form.keywordsText}
                  onChange={e => setForm(f => ({ ...f, keywordsText: e.target.value }))}
                  placeholder="千问, Qwen, 通义千问"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">发布栏目 *</label>
                <select
                  className={inputCls}
                  value={form.defaultColumnId}
                  disabled={!createSiteId || columnsLoading}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      defaultColumnId: e.target.value ? Number(e.target.value) : '',
                    }))
                  }
                >
                  <option value="">
                    {!createSiteId
                      ? '请先选择目标站点'
                      : columnsLoading
                        ? '加载栏目…'
                        : siteColumns.length === 0
                          ? '该站点暂无栏目'
                          : '请选择栏目'}
                  </option>
                  {siteColumns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 ml-1">
                  本任务生成的全部文章将固定发布到此栏目；成稿语言为英文。
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">每词 IQS 检索条数</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className={inputCls}
                  value={form.iqsNumResultsPerKeyword}
                  onChange={e => setForm(f => ({ ...f, iqsNumResultsPerKeyword: Number(e.target.value) }))}
                />
              </div>
              {iqsKeywordCount > 0 && (
                <p className="text-xs text-slate-500 ml-1">
                  每周期约发文 {iqsPlannedArticles} 篇（{iqsKeywordCount} 个关键词 × 每词{' '}
                  {form.iqsNumResultsPerKeyword} 条）
                </p>
              )}
              <p className="text-xs text-slate-500 ml-1">
                每周期对全部关键词各请求 1 次 IQS，从检索结果中取未发过的源文当轮译编发布。
              </p>
              <div className="space-y-2">
                <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">译编风格提示（可选）</label>
                <textarea
                  className={`${inputCls} min-h-[80px] font-medium`}
                  value={form.customPrompt}
                  onChange={e => setForm(f => ({ ...f, customPrompt: e.target.value }))}
                />
              </div>
            </>
          ) : isRewrite ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">
                  预设关键词（逗号或换行分隔）
                </label>
                <textarea
                  className={`${inputCls} min-h-[100px] font-medium`}
                  value={form.keywordsText}
                  onChange={e => setForm(f => ({ ...f, keywordsText: e.target.value }))}
                  placeholder="GEO优化, 品牌可见度"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">每周期最多搜词数</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    className={inputCls}
                    value={form.maxKeywords}
                    onChange={e => setForm(f => ({ ...f, maxKeywords: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">每周期最多发文数</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    className={inputCls}
                    value={form.maxArticles}
                    onChange={e => setForm(f => ({ ...f, maxArticles: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">二创风格提示（可选）</label>
                <textarea
                  className={`${inputCls} min-h-[80px] font-medium`}
                  value={form.customPrompt}
                  onChange={e => setForm(f => ({ ...f, customPrompt: e.target.value }))}
                />
              </div>
            </>
          ) : null}
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-5 space-y-4">
            <p className="text-xs font-semibold text-slate-600">SEO / GEO（默认已开启全套，可按需关闭）</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">成稿模板</label>
                <select
                  className={inputCls}
                  value={form.answerTemplate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, answerTemplate: e.target.value as ContentTaskAnswerTemplate }))
                  }
                >
                  <option value="qa">问答（直答 + FAQ，推荐）</option>
                  <option value="news">资讯（无结构化 FAQ）</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">内链聚类 ID（可选）</label>
                <input
                  className={inputCls}
                  value={form.topicClusterId}
                  onChange={(e) => setForm((f) => ({ ...f, topicClusterId: e.target.value }))}
                  placeholder="留空则使用 task_id"
                />
              </div>
            </div>
            {isAssociate && (
              <div className="space-y-2">
                <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">标题风格</label>
                <select
                  className={inputCls}
                  value={form.titleStyle}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, titleStyle: e.target.value as ContentTaskTitleStyle }))
                  }
                >
                  <option value="question">问句式（推荐）</option>
                  <option value="declarative">陈述式</option>
                </select>
              </div>
            )}
            {(isRewrite || isIqsFeed) && (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={form.enableCycleRoundup}
                    onChange={(e) => setForm((f) => ({ ...f, enableCycleRoundup: e.target.checked }))}
                  />
                  周期末生成问答式汇总文
                </label>
                {form.enableCycleRoundup && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">汇总文最多链回篇数</label>
                    <input
                      type="number"
                      min={2}
                      max={20}
                      className={inputCls}
                      value={form.roundupMaxItems}
                      onChange={(e) => setForm((f) => ({ ...f, roundupMaxItems: Number(e.target.value) }))}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-5 space-y-4">
            <p className="text-xs font-semibold text-slate-600">排期</p>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="scheduleMode"
                className="mt-1"
                checked={form.scheduleMode === 'recurring'}
                onChange={() => setForm((f) => ({ ...f, scheduleMode: 'recurring' }))}
              />
              <span className="flex-1 space-y-3">
                <span className="block text-sm font-semibold text-slate-800">按周期执行</span>
                {form.scheduleMode === 'recurring' && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { id: 'daily', label: '按天' },
                          { id: 'weekly', label: '按周' },
                          { id: 'monthly', label: '按月' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, recurringCycle: opt.id }))}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                            form.recurringCycle === opt.id
                              ? 'border-[#E8553F] bg-orange-50 text-[#E8553F]'
                              : 'border-slate-200 text-slate-600 hover:bg-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">执行时刻（点）</label>
                        <input
                          type="number"
                          min={0}
                          max={23}
                          className={inputCls}
                          value={form.scheduleHour}
                          onChange={e => setForm(f => ({ ...f, scheduleHour: Number(e.target.value) }))}
                        />
                      </div>
                      {form.recurringCycle === 'weekly' && (
                        <div className="space-y-2">
                          <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">星期</label>
                          <select
                            className={inputCls}
                            value={form.scheduleDayOfWeek}
                            onChange={e => setForm(f => ({ ...f, scheduleDayOfWeek: Number(e.target.value) }))}
                          >
                            {WEEKDAY_LABELS.map((label, i) => (
                              <option key={label} value={i}>{label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {form.recurringCycle === 'monthly' && (
                        <div className="space-y-2">
                          <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">每月几号</label>
                          <input
                            type="number"
                            min={1}
                            max={28}
                            className={inputCls}
                            value={form.scheduleDayOfMonth}
                            onChange={e => setForm(f => ({ ...f, scheduleDayOfMonth: Number(e.target.value) }))}
                          />
                        </div>
                      )}
                    </div>
                    {!isEdit && (
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300"
                          checked={form.runImmediatelyOnCreate}
                          onChange={e =>
                            setForm((f) => ({ ...f, runImmediatelyOnCreate: e.target.checked }))
                          }
                        />
                        立刻执行
                      </label>
                    )}
                  </>
                )}
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-slate-200">
              <input
                type="radio"
                name="scheduleMode"
                className="mt-1"
                checked={form.scheduleMode === 'once_only'}
                onChange={() => setForm((f) => ({ ...f, scheduleMode: 'once_only' }))}
              />
              <span>
                <span className="block text-sm font-semibold text-slate-800">仅执行一次</span>
                <span className="block text-xs text-slate-500 mt-1">
                  创建后立刻执行一轮，完成后结束，不按周期重复
                </span>
              </span>
            </label>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">内容语言</label>
            <select
              className={inputCls}
              value={form.writingLanguage}
              onChange={(e) => setForm((f) => ({ ...f, writingLanguage: e.target.value }))}
            >
              {languageOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">百度搜索收录 Token</label>
            <input
              className={inputCls}
              type="password"
              autoComplete="off"
              value={form.baiduPushToken}
              onChange={e => setForm(f => ({ ...f, baiduPushToken: e.target.value }))}
              placeholder="百度搜索资源平台 → 普通收录 → 准入密钥（可选）"
            />
            <p className="text-xs text-slate-500 ml-1">
              每周期发布成功后自动推送新文章 URL 到百度；留空则使用站点基础信息中的 Token。
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void (isEdit ? handleUpdate() : handleCreate())}
            className={`w-full py-3 ${primaryBtnCls}`}
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isEdit ? (
              tr('webMainContentTasks.actions.save')
            ) : (
              '创建任务'
            )}
          </button>
        </div>
      </>,
    );
  }

  if (phase === 'detail' && detail) {
    const isOriginal = detail.generationMode === 'original';
    const isAssociate = detail.generationMode === 'associate';
    const isIqsFeed = detail.generationMode === 'iqs_feed';
    return shell(
      <>
        <KnowledgeBaseMaterialsUploadModal
          open={kbModalOpen}
          onClose={() => {
            setKbModalOpen(false);
            if (detailKbFiles.length > 0) {
              void handleDetailKbUpload(detailKbFiles);
              setDetailKbFiles([]);
            }
          }}
          files={detailKbFiles}
          onChangeFiles={setDetailKbFiles}
          inputId="wm-content-detail-kb-upload"
        />
        <button
          type="button"
          onClick={() => {
            setPhase('list');
            setDetail(null);
            void loadList();
          }}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 返回列表
        </button>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3 min-w-0">
            <h2 className="text-4xl font-semibold tracking-tight text-slate-900">{detail.name}</h2>
            <p className="text-sm text-slate-500">
              {modeLabel(detail.generationMode)} · {tr(`webMainContentTasks.status.${detail.status}`, { defaultValue: detail.status })} · 已执行 {detail.totalCyclesRun} 轮
              {detail.nextCycleAt ? ` · 下次 ${formatDtr(detail.nextCycleAt)}` : ''}
            </p>
            <p className="text-sm text-slate-600">
              {isOriginal || isAssociate ? '主题' : '关键词'}：{taskTopicOrKeywords(detail)}
            </p>
            {isAssociate && (
              <p className="text-sm text-slate-600">
                发布栏目：{columnNameById(detail.defaultColumnId) || '—'}
              </p>
            )}
            {isIqsFeed && (
              <p className="text-sm text-slate-600">
                发布栏目：{columnNameById(detail.defaultColumnId) || '—'}
              </p>
            )}
            {isAssociate && detail.titlePoolSummary && (
              <p className="text-sm text-slate-500">
                标题池：已发布 {detail.titlePoolSummary.published} / {detail.titlePoolSummary.total}
                ，待发 {detail.titlePoolSummary.pending}
              </p>
            )}
            {isIqsFeed && detail.consumedSourcesSummary && (
              <p className="text-sm text-slate-500">
                已消费源文：{detail.consumedSourcesSummary.total} 条（URL 去重池）
              </p>
            )}
            {isOriginal && (
              <p className="text-sm text-slate-500">
                知识库：{detail.knowledgeBaseStatus === 'ready' ? '已就绪' : detail.knowledgeBaseStatus || '待上传'}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {isOriginal && (
              <>
                <button
                  type="button"
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold border ${
                    detailTab === 'cycles'
                      ? 'border-[#E8553F] bg-orange-50 text-[#E8553F]'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => setDetailTab('cycles')}
                >
                  执行记录
                </button>
                <button
                  type="button"
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold border ${
                    detailTab === 'knowledge'
                      ? 'border-[#E8553F] bg-orange-50 text-[#E8553F]'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => setDetailTab('knowledge')}
                >
                  <Database className="w-4 h-4" /> 知识库
                </button>
              </>
            )}
            {detail.status !== 'stopped' && detail.status !== 'expired' && detail.status !== 'completed' && (
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
                onClick={() => openEditForTask(detail)}
              >
                <Pencil className="w-4 h-4" /> {tr('webMainContentTasks.actions.edit')}
              </button>
            )}
            <button
              type="button"
              className="p-3.5 rounded-xl border transition-colors border-slate-200 hover:bg-slate-50 text-slate-600"
              onClick={() => void loadDetail(detail.taskId)}
              title="刷新"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {detail.status === 'running' && (
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
                onClick={async () => {
                  await webMainContentTaskAPI.pause(detail.taskId);
                  await loadDetail(detail.taskId);
                }}
              >
                <Pause className="w-4 h-4" /> 暂停
              </button>
            )}
            {detail.status === 'paused' && (
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
                onClick={async () => {
                  await webMainContentTaskAPI.resume(detail.taskId);
                  await loadDetail(detail.taskId);
                }}
              >
                <Play className="w-4 h-4" /> 恢复
              </button>
            )}
            <button
              type="button"
              className={primaryBtnCls}
              onClick={async () => {
                await webMainContentTaskAPI.runNow(detail.taskId);
                await loadDetail(detail.taskId);
              }}
            >
              立即执行
            </button>
            <button
              type="button"
              className="p-3.5 rounded-2xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
              onClick={async () => {
                await webMainContentTaskAPI.stop(detail.taskId);
                await loadDetail(detail.taskId);
              }}
              title="停止"
            >
              <StopCircle className="w-5 h-5" />
            </button>
            {onOpenArticles && (
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
                onClick={() => onOpenArticles?.(detail.siteId, detail.taskId)}
              >
                查看资讯 <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        {detail.errorMessage && (
          <p className="text-sm font-medium text-red-600 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            {detail.errorMessage}
          </p>
        )}

        {isOriginal && detailTab === 'knowledge' ? (
          <div className="rounded-2xl border p-6 space-y-4 bg-white border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">任务专属知识库</h3>
                <p className="text-xs text-slate-500 mt-1">仅展示本任务上传的文档，与工作流/品牌知识库隔离</p>
              </div>
              <button
                type="button"
                disabled={kbUploading}
                onClick={() => {
                  setDetailKbFiles([]);
                  setKbModalOpen(true);
                }}
                className={primaryBtnCls}
              >
                {kbUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                上传材料
              </button>
            </div>
            {kbLoading ? (
              <div className="py-8 text-center text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                加载中…
              </div>
            ) : kbDocuments.length > 0 ? (
              <ul className="space-y-2">
                {kbDocuments.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{doc.original_filename}</p>
                        <p className="text-xs text-slate-500">
                          {doc.chunks_count} 块 · {doc.status}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-red-500 hover:underline shrink-0"
                      onClick={async () => {
                        if (!confirm('确定删除该文档？')) return;
                        await knowledgeAPI.delete(doc.id);
                        await loadKbDocuments(detail.knowledgeBaseId);
                      }}
                    >
                      删除
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 py-6 text-center">暂无文档，请上传知识库材料</p>
            )}
          </div>
        ) : (
        <div className="rounded-2xl border overflow-hidden shadow-sm bg-white border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3">轮次</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">生成文章</th>
                <th className="px-4 py-3">门禁</th>
                <th className="px-4 py-3">收录</th>
                <th className="px-4 py-3">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {(detail.cycles || []).length > 0 ? (
                (detail.cycles || []).map(cycle => (
                  <tr key={cycle.cycleNumber} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">第 {cycle.cycleNumber} 轮</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">
                        {cycle.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {cycle.createdArticleIds?.length ? (
                        <button
                          type="button"
                          className="text-sm font-medium text-slate-700 hover:text-[#E8553F] underline-offset-2 hover:underline"
                          onClick={() => onOpenArticles?.(detail.siteId, detail.taskId)}
                        >
                          {cycle.createdArticleIds.length} 篇
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {(() => {
                        const gated = (
                          cycle.stepResults as { publish?: { gated?: number } } | undefined
                        )?.publish?.gated;
                        return gated ? `${gated} 篇 draft` : '—';
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {cycle.createdArticleIds?.length ? (
                        <button
                          type="button"
                          className="text-xs font-medium text-blue-600 hover:underline"
                          onClick={() => {
                            void webMainContentTaskAPI
                              .downloadCycleUrlsTxt(detail.taskId, cycle.cycleNumber)
                              .catch((e: unknown) => alert((e as Error).message || '导出失败'));
                          }}
                        >
                          导出 URL
                        </button>
                      ) : (
                        '—'
                      )}
                      {(() => {
                        const push = (cycle.stepResults as { baidu_push?: { ok?: boolean; success?: number } } | undefined)?.baidu_push;
                        if (!push) return null;
                        return (
                          <span className="block text-xs text-slate-500 mt-1">
                            百度 {push.ok ? `已推 ${push.success ?? 0} 条` : '推送失败'}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{cycle.errorMessage || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <BoxSelect className="w-12 h-12 mb-4 text-slate-400 mx-auto" />
                    <p className="text-sm font-bold text-slate-500">暂无周期记录</p>
                    <p className="text-xs mt-2 text-slate-400">任务启动后将在此展示各轮执行结果</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </>,
    );
  }

  return shell(
    <>
      <div className="flex justify-between items-end">
        <div className="space-y-3">
          <h2 className="text-4xl font-semibold tracking-tight text-slate-900">{tr('webMainContentTasks.listTitle')}</h2>
          <p className="text-sm text-slate-500">
            按关键词联网搜资讯，自动二创并发布到主站资讯；分类与栏目由 AI 按主站 CMS 配置自动匹配
          </p>
        </div>
        <button type="button" onClick={() => { setForm(defaultFormState()); setCreateKbFiles([]); setEditingTaskId(null); setPhase('create'); }} className={primaryBtnCls}>
          <Plus className="w-5 h-5" /> 新建任务
        </button>
      </div>

      {err ? <p className="text-sm font-medium text-red-600">{err}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-600">站点筛选</label>
        <select
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm"
          value={siteFilter === 'all' ? 'all' : String(siteFilter)}
          onChange={(e) => {
            const v = e.target.value;
            setSiteFilter(v === 'all' ? 'all' : Number(v));
          }}
        >
          <option value="all">全部可见站点</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>{s.display_name}</option>
          ))}
        </select>
      </div>

      <div className="p-4 rounded-2xl border flex items-center gap-4 bg-white border-slate-200 shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="搜索任务名称、ID 或关键词"
            className="w-full pl-12 pr-4 py-3 rounded-xl border outline-none font-bold transition-all bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="p-3.5 rounded-xl border transition-colors border-slate-200 hover:bg-slate-50 text-slate-600"
        >
          <Search className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => void loadList()}
          className="p-3.5 rounded-xl border transition-colors border-slate-200 hover:bg-slate-50 text-slate-600"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="rounded-2xl border overflow-hidden shadow-sm bg-white border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3">任务名称</th>
              <th className="px-4 py-3">任务 ID</th>
              <th className="px-4 py-3">模式</th>
              <th className="px-4 py-3">主题/关键词</th>
              <th className="px-4 py-3">调度</th>
              <th className="px-4 py-3">下次执行</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
                  <p className="text-sm font-bold text-slate-500">加载中...</p>
                </td>
              </tr>
            ) : filtered.length > 0 ? (
              filtered.map(t => (
                <tr key={t.taskId} className="group transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-slate-700">{t.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm px-3 py-1.5 rounded border border-slate-200 bg-slate-50 text-slate-900">
                      {t.taskId}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">
                      {modeLabel(t.generationMode)}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <span className="text-sm text-slate-600 truncate block" title={taskTopicOrKeywords(t)}>
                      {taskTopicOrKeywords(t)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-slate-700">{scheduleLabel(t)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium flex items-center gap-2 text-slate-600">
                      <Clock className="w-4 h-4 shrink-0" />
                      {formatDtr(t.nextCycleAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3">{statusBadge(t.status, (key) => tr(key))}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => void loadDetail(t.taskId)}
                        className="p-3.5 rounded-2xl transition-all hover-scale border bg-slate-100 text-slate-400 hover:text-blue-600 border-slate-200"
                        aria-label="查看详情"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>
                      {t.status !== 'stopped' && t.status !== 'expired' && t.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => openEditForTask(t)}
                          className="p-3.5 rounded-2xl transition-all border bg-slate-100 text-slate-400 hover:text-blue-600 border-slate-200"
                          aria-label={tr('webMainContentTasks.actions.edit')}
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={deleteBusyId === t.taskId}
                        onClick={() => {
                          if (!confirm('确定删除该任务？')) return;
                          setDeleteBusyId(t.taskId);
                          void webMainContentTaskAPI
                            .remove(t.taskId)
                            .then(() => loadList())
                            .finally(() => setDeleteBusyId(null));
                        }}
                        className="p-3.5 rounded-2xl transition-all border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                        aria-label="删除"
                      >
                        {deleteBusyId === t.taskId ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <BoxSelect className="w-12 h-12 mb-4 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-500">
                    {tasks.length > 0 && searchQuery ? '无匹配结果' : '暂无任务'}
                  </p>
                  <p className="text-xs mt-2 text-slate-400">
                    {tasks.length > 0 && searchQuery ? '请调整搜索条件' : '点击右上角新建任务'}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>,
  );
};

export default WebMainContentTasks;
