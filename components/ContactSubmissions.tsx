import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Eye, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Theme } from '../types';
import {
  getContactSubmissions,
  markSubmissionRead,
  deleteSubmission,
  type ContactSubmissionItem,
} from '../api/merchants';
import { siteContactSubmissionsAPI } from '../api/sites';
import { useModuleI18n } from '../i18n/hooks';

interface ContactSubmissionsProps {
  theme: Theme;
  /** 站点工作台内按站查看 */
  siteId?: number;
  /** 嵌入站点工作台时紧凑布局 */
  embedded?: boolean;
}

const PAGE_SIZE = 20;

const CONTACT_LABELS: Record<string, string> = {
  phone: '电话',
  email: '邮箱',
  wechat: '微信',
  whatsapp: 'WhatsApp',
  discord: 'Discord',
  telegram: 'Telegram',
  line: 'LINE',
};

function formatPrimaryContact(item: ContactSubmissionItem): string {
  const extra = item.contact_extra || {};
  if (item.contact_method && item.contact_value) {
    const label = CONTACT_LABELS[item.contact_method] || item.contact_method;
    return `${label}: ${item.contact_value}`;
  }
  if (item.phone) return item.phone;
  const firstKey = Object.keys(extra)[0];
  if (firstKey && extra[firstKey]) {
    const label = CONTACT_LABELS[firstKey] || firstKey;
    return `${label}: ${extra[firstKey]}`;
  }
  return '—';
}

function formatAllContacts(item: ContactSubmissionItem): string {
  const extra = item.contact_extra || {};
  const keys = Object.keys(extra);
  if (!keys.length) return item.phone || '—';
  return keys
    .map((k) => {
      const label = CONTACT_LABELS[k] || k;
      return `${label}: ${extra[k]}`;
    })
    .join('\n');
}

const ContactSubmissions: React.FC<ContactSubmissionsProps> = ({ theme, siteId, embedded = false }) => {
  const { t } = useModuleI18n('merchant');
  const isDark = theme === 'dark';
  const [items, setItems] = useState<ContactSubmissionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactSubmissionItem | null>(null);

  const fetchData = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res =
        siteId != null
          ? await siteContactSubmissionsAPI.list(siteId, p * PAGE_SIZE, PAGE_SIZE)
          : await getContactSubmissions(p * PAGE_SIZE, PAGE_SIZE);
      setItems(res.items);
      setTotal(res.total);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    setPage(0);
  }, [siteId]);

  useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  const handleView = async (item: ContactSubmissionItem) => {
    setSelected(item);
    if (!item.is_read) {
      try {
        if (siteId != null) {
          await siteContactSubmissionsAPI.markRead(siteId, item.id);
        } else {
          await markSubmissionRead(item.id);
        }
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_read: true } : i)));
      } catch {
        /* ignore */
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('contactSubmissions.confirm.delete'))) return;
    try {
      if (siteId != null) {
        await siteContactSubmissionsAPI.delete(siteId, id);
      } else {
        await deleteSubmission(id);
      }
      if (selected?.id === id) setSelected(null);
      fetchData(page);
    } catch {
      alert(t('contactSubmissions.errors.deleteFailed'));
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const containerClasses = embedded
    ? 'h-full flex flex-col overflow-hidden bg-white text-slate-900'
    : `
    flex-1 flex flex-col h-full overflow-hidden transition-colors duration-500
    ${isDark ? 'bg-[#1A1A1A] text-white' : 'bg-slate-50 text-slate-900'}
  `;

  const panelBorder = embedded
    ? 'bg-white border-slate-200'
    : isDark
      ? 'bg-zinc-900/50 border-white/5'
      : 'bg-white border-slate-200';

  return (
    <div className={containerClasses}>
      <div className={`flex-1 overflow-y-auto no-scrollbar ${embedded ? 'p-6' : 'p-6 md:p-10'}`}>
        <div className="max-w-[1400px] mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h2 className={`font-medium ${embedded ? 'text-lg text-slate-900' : 'text-xl'}`}>
              {embedded ? t('contactSubmissions.pageTitleSite') : t('contactSubmissions.pageTitleAlt')}
            </h2>
            <button
              onClick={() => fetchData(page)}
              className={`p-2 rounded-lg transition-colors ${embedded ? 'hover:bg-slate-100' : isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-200'}`}
              title={t('contactSubmissions.actions.refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {total === 0 && !loading ? (
            <div className={`text-center py-20 rounded-2xl border ${panelBorder}`}>
              <p className="text-sm opacity-60">{t('contactSubmissions.empty.noMessages')}</p>
              <p className="text-xs opacity-40 mt-2">{t('contactSubmissions.empty.noMessagesHint')}</p>
            </div>
          ) : (
            <>
              <div className={`rounded-2xl border overflow-hidden ${panelBorder}`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className={embedded ? 'border-b border-slate-100' : isDark ? 'border-b border-white/5' : 'border-b border-slate-100'}>
                      <th className="text-left px-4 py-3 font-medium opacity-60">{t('contactSubmissions.table.name')}</th>
                      <th className="text-left px-4 py-3 font-medium opacity-60">{t('contactSubmissions.table.phone')}</th>
                      <th className="text-left px-4 py-3 font-medium opacity-60 hidden md:table-cell">{t('contactSubmissions.table.company')}</th>
                      <th className="text-left px-4 py-3 font-medium opacity-60 hidden lg:table-cell">{t('contactSubmissions.table.time')}</th>
                      <th className="text-left px-4 py-3 font-medium opacity-60">{t('contactSubmissions.table.status')}</th>
                      <th className="text-right px-4 py-3 font-medium opacity-60">{t('contactSubmissions.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className={`${embedded ? 'border-b border-slate-50 hover:bg-slate-50' : isDark ? 'border-b border-white/5 hover:bg-white/3' : 'border-b border-slate-50 hover:bg-slate-50'} transition-colors cursor-pointer`}
                        onClick={() => handleView(item)}
                      >
                        <td className={`px-4 py-3 ${!item.is_read ? 'font-semibold' : ''}`}>{item.name}</td>
                        <td className="px-4 py-3">{formatPrimaryContact(item)}</td>
                        <td className="px-4 py-3 hidden md:table-cell truncate max-w-[200px]">{item.company || '—'}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs opacity-60">
                          {item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : ''}
                        </td>
                        <td className="px-4 py-3">
                          {item.is_read ? (
                            <span className="text-xs text-slate-400">{t('contactSubmissions.status.read')}</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500">
                              {t('contactSubmissions.status.new')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleView(item);
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${embedded ? 'hover:bg-slate-200' : isDark ? 'hover:bg-white/10' : 'hover:bg-slate-200'}`}
                              title={t('contactSubmissions.actions.view')}
                            >
                              <Eye className="w-4 h-4 opacity-60" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item.id);
                              }}
                              className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 text-red-500/60 hover:text-red-500"
                              title={t('contactSubmissions.actions.delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="opacity-60">{t('contactSubmissions.pagination.total', { count: total })}</span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${embedded ? 'hover:bg-slate-200' : isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-200'}`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-medium opacity-60">
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${embedded ? 'hover:bg-slate-200' : isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-200'}`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {selected && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelected(null)}>
              <div
                className={`w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl ${isDark && !embedded ? 'bg-[#1e1e1e] text-white' : 'bg-white text-slate-900'}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{t('contactSubmissions.detail.title')}</h3>
                  <button onClick={() => setSelected(null)} className="text-sm opacity-60 hover:opacity-100">
                    {t('contactSubmissions.detail.close')}
                  </button>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <span className="shrink-0 w-16 font-medium opacity-60">{t('contactSubmissions.detail.name')}</span>
                    <span>{selected.name}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="shrink-0 w-20 font-medium opacity-60">{t('contactSubmissions.detail.phone')}</span>
                    <span className="whitespace-pre-wrap">{formatPrimaryContact(selected)}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="shrink-0 w-20 font-medium opacity-60">{t('contactSubmissions.detail.contacts')}</span>
                    <span className="whitespace-pre-wrap">{formatAllContacts(selected)}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="shrink-0 w-16 font-medium opacity-60">{t('contactSubmissions.detail.company')}</span>
                    <span>{selected.company || '—'}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="shrink-0 w-16 font-medium opacity-60">{t('contactSubmissions.detail.message')}</span>
                    <span className="whitespace-pre-wrap">{selected.message || '—'}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="shrink-0 w-16 font-medium opacity-60">{t('contactSubmissions.detail.source')}</span>
                    <span className="break-all text-xs">{selected.source_page || '—'}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="shrink-0 w-16 font-medium opacity-60">{t('contactSubmissions.detail.ip')}</span>
                    <span>{selected.ip_address || '—'}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="shrink-0 w-16 font-medium opacity-60">{t('contactSubmissions.detail.time')}</span>
                    <span>{selected.created_at ? new Date(selected.created_at).toLocaleString('zh-CN') : '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactSubmissions;
