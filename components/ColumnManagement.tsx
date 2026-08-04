/**
 * 子站栏目管理：父子栏目，页头导航
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ChevronDown, BoxSelect, RefreshCw, X, Pencil } from 'lucide-react';
import { getMyColumns, createColumn, updateColumn, deleteColumn, type ColumnTreeNode } from '../api/merchants';
import * as webMain from '../api/webMainSite';
import { useModuleI18n } from '../i18n/hooks';

/** 营销主站栏目（与官网「栏目管理」同版式，独立接口；扁平列表 + slug） */
const WebMainColumnsPanel: React.FC = () => {
  const { t } = useModuleI18n('site');
  const [rows, setRows] = useState<webMain.WebMainColumnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', parent_id: null as number | null });

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await webMain.listWebMainColumns();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const parentName = (parentId: number | null) => {
    if (parentId == null) return '—';
    const p = rows.find(r => r.id === parentId);
    return p?.name ?? `#${parentId}`;
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', slug: '', parent_id: null });
    setIsModalOpen(true);
  };

  const openEdit = (r: webMain.WebMainColumnRow) => {
    setEditingId(r.id);
    setForm({ name: r.name, slug: r.slug, parent_id: r.parent_id });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm({ name: '', slug: '', parent_id: null });
  };

  const handleSubmit = async () => {
    const name = form.name.trim();
    const slug = (form.slug.trim() || name).toLowerCase().replace(/\s+/g, '-');
    if (!name || !slug) return;
    try {
      if (editingId != null) {
        await webMain.updateWebMainColumn(editingId, {
          name,
          slug,
          parent_id: form.parent_id,
          sort_order: 0,
        });
      } else {
        await webMain.createWebMainColumn({
          name,
          slug,
          parent_id: form.parent_id,
          sort_order: 0,
        });
      }
      closeModal();
      loadRows();
    } catch (e) {
      alert((e as Error).message || t('columnManagement.saveFailed'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('columnManagement.deleteConfirm'))) return;
    try {
      await webMain.deleteWebMainColumn(id);
      loadRows();
    } catch (e) {
      alert((e as Error).message || t('columnManagement.deleteFailed'));
    }
  };

  const inputCls = 'w-full p-3 rounded-xl border outline-none font-medium transition-all bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500';

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 p-8 lg:p-12 overflow-y-auto no-scrollbar">
        <div className="max-w-[1400px] mx-auto space-y-10">
          <div className="flex justify-between items-end">
            <div className="space-y-3">
              <h2 className="text-4xl font-semibold tracking-tight text-slate-900">{t('columnManagement.pageTitle')}</h2>
              <p className="text-sm text-slate-500">
                {t('columnManagement.subtitleWebMain')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center gap-3 px-5 py-2.5 rounded-2xl font-semibold text-sm shadow-sm hover-scale bg-gradient-coral text-white shadow-coral hover:opacity-95"
              >
                <Plus className="w-5 h-5" /> {t('columnManagement.addColumn')}
              </button>
              <button
                type="button"
                onClick={loadRows}
                disabled={loading}
                className="p-2.5 rounded-xl border transition-colors border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border overflow-hidden shadow-sm bg-white border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">{t('columnManagement.tableName')}</th>
                  <th className="px-4 py-3">slug</th>
                  <th className="px-4 py-3">{t('columnManagement.tableParent')}</th>
                  <th className="px-4 py-3 text-right">{t('columnManagement.tableActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center">
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
                      <p className="text-sm font-bold text-slate-500">{t('columnManagement.loading')}</p>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center">
                      <BoxSelect className="w-12 h-12 mb-4 text-slate-400 mx-auto" />
                      <p className="text-sm font-bold text-slate-500">{t('columnManagement.empty')}</p>
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="group transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                      <td className="px-4 py-3">
                        <code className="text-xs text-slate-600">{r.slug}</code>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{parentName(r.parent_id)}</td>
                      <td className="px-4 py-3 text-right flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="p-3.5 rounded-2xl transition-all hover-scale border bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border-slate-200"
                          title={t('columnManagement.edit')}
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          className="p-3.5 rounded-2xl transition-all hover-scale border bg-slate-100 text-red-500/70 hover:text-red-500 hover:bg-red-50 border-slate-200"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={closeModal}>
          <div
            className="w-full max-w-md rounded-2xl shadow-xl overflow-hidden border animate-in zoom-in-95 duration-200 flex flex-col bg-white border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">{editingId != null ? t('columnManagement.modalEdit') : t('columnManagement.modalAdd')}</h3>
              <button type="button" onClick={closeModal} className="p-2 rounded-lg transition-colors hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">{t('columnManagement.formName')}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className={inputCls}
                  placeholder={t('columnManagement.formNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">{t('columnManagement.formSlug')}</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
                  className={inputCls}
                  placeholder="geo-lab"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">{t('columnManagement.formParent')}</label>
                <select
                  value={form.parent_id ?? ''}
                  onChange={(e) =>
                    setForm(f => ({
                      ...f,
                      parent_id: e.target.value === '' ? null : parseInt(e.target.value, 10),
                    }))
                  }
                  className={inputCls}
                >
                  <option value="">{t('columnManagement.topLevel')}</option>
                  {rows
                    .filter((r) => r.id !== editingId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={closeModal} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">
                {t('columnManagement.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!form.name.trim()}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-coral hover:opacity-95 shadow-coral disabled:opacity-50"
              >
                {t('columnManagement.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ColumnManagementProps {
  theme: 'light' | 'dark';
  /** 子站官网栏目（默认）；`web_main` 为营销主站根域栏目 */
  siteScope?: 'aieo' | 'web_main';
}

const ColumnManagement: React.FC<ColumnManagementProps> = ({ theme, siteScope = 'aieo' }) => {
  const { t } = useModuleI18n('site');

  if (siteScope === 'web_main') {
    return <WebMainColumnsPanel />;
  }

  const isDark = theme === 'dark';
  const [columns, setColumns] = useState<ColumnTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newParentId, setNewParentId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<{ id: number; name: string; parent_id: number | null } | null>(null);

  useEffect(() => {
    loadColumns();
  }, []);

  const loadColumns = async () => {
    setLoading(true);
    try {
      const data = await getMyColumns();
      setColumns(data);
    } catch {
      setColumns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createColumn({ name, parent_id: newParentId, sort_order: 0 });
      setNewName('');
      setNewParentId(null);
      setIsModalOpen(false);
      loadColumns();
    } catch (e) {
      alert((e as Error).message || t('columnManagement.createFailed'));
    }
  };

  const handleUpdate = async () => {
    if (!editingColumn) return;
    const name = newName.trim();
    if (!name) return;
    try {
      await updateColumn(editingColumn.id, { name });
      setEditingColumn(null);
      setNewName('');
      setNewParentId(null);
      setIsModalOpen(false);
      loadColumns();
    } catch (e) {
      alert((e as Error).message || t('columnManagement.updateFailed'));
    }
  };

  const openEdit = (col: { id: number; name: string }, parentId: number | null) => {
    setEditingColumn({ id: col.id, name: col.name, parent_id: parentId });
    setNewName(col.name);
    setNewParentId(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingColumn(null);
    setNewName('');
    setNewParentId(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('columnManagement.deleteConfirm'))) return;
    try {
      await deleteColumn(id);
      loadColumns();
    } catch (e) {
      alert((e as Error).message || t('columnManagement.deleteFailed'));
    }
  };

  const inputCls = 'w-full p-3 rounded-xl border outline-none font-medium transition-all bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500';

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 p-8 lg:p-12 overflow-y-auto no-scrollbar">
        <div className="max-w-[1400px] mx-auto space-y-10">
          <div className="flex justify-between items-end">
            <div className="space-y-3">
              <h2 className="text-4xl font-semibold tracking-tight text-slate-900">{t('columnManagement.pageTitle')}</h2>
              <p className="text-sm text-slate-500">
                {t('columnManagement.subtitleSubsite')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setEditingColumn(null); setNewName(''); setNewParentId(null); setIsModalOpen(true); }}
                className="flex items-center gap-3 px-5 py-2.5 rounded-2xl font-semibold text-sm shadow-sm hover-scale bg-gradient-coral text-white shadow-coral hover:opacity-95"
              >
                <Plus className="w-5 h-5" /> {t('columnManagement.addColumn')}
              </button>
              <button
                type="button"
                onClick={loadColumns}
                disabled={loading}
                className="p-2.5 rounded-xl border transition-colors border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border overflow-hidden shadow-sm bg-white border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">{t('columnManagement.tableName')}</th>
                  <th className="px-4 py-3">{t('columnManagement.type')}</th>
                  <th className="px-4 py-3 text-right">{t('columnManagement.tableActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center"><RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-4" /><p className="text-sm font-bold text-slate-500">{t('columnManagement.loading')}</p></div>
                    </td>
                  </tr>
                ) : columns.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center">
                      <BoxSelect className="w-12 h-12 mb-4 text-slate-400 mx-auto" />
                      <p className="text-sm font-bold text-slate-500">{t('columnManagement.empty')}</p>
                      <p className="text-xs mt-2 text-slate-400">{t('columnManagement.emptyHintAdd')}</p>
                    </td>
                  </tr>
                ) : (
                  columns.flatMap((col) => [
                    <tr key={col.id} className="group transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setExpandedIds((s) => (s.has(col.id) ? new Set([...s].filter((x) => x !== col.id)) : new Set([...s, col.id])))}
                          className="flex items-center gap-2 p-0.5 -ml-1"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${expandedIds.has(col.id) ? 'rotate-0' : '-rotate-90'}`} />
                          <span className="font-medium text-slate-800">{col.name}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 font-medium">{t('columnManagement.parentColumnTag')}</span></td>
                      <td className="px-4 py-3 text-right flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(col, null)}
                          className="p-3.5 rounded-2xl transition-all hover-scale border bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border-slate-200"
                          title={t('columnManagement.edit')}
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(col.id)}
                          className="p-3.5 rounded-2xl transition-all hover-scale border bg-slate-100 text-red-500/70 hover:text-red-500 hover:bg-red-50 border-slate-200"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>,
                    ...(expandedIds.has(col.id) && col.children?.length ? col.children.map((ch) => (
                      <tr key={ch.id} className="bg-slate-50/50 hover:bg-slate-50">
                        <td className="px-4 py-2 pl-14">
                          <span className="text-sm text-slate-600">{ch.name}</span>
                        </td>
                        <td className="px-4 py-2"><span className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-600 font-medium">{t('columnManagement.childColumnTag')}</span></td>
                        <td className="px-4 py-2 text-right flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(ch, col.id)}
                            className="p-3.5 rounded-2xl transition-all hover-scale border bg-white text-slate-500 hover:text-blue-600 hover:bg-blue-50 border-slate-200"
                            title={t('columnManagement.edit')}
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ch.id)}
                            className="p-3.5 rounded-2xl transition-all hover-scale border bg-white text-red-500/70 hover:text-red-500 hover:bg-red-50 border-slate-200"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    )) : [])
                  ])
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={closeModal}>
          <div
            className="w-full max-w-md rounded-2xl shadow-xl overflow-hidden border animate-in zoom-in-95 duration-200 flex flex-col bg-white border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">{editingColumn ? t('columnManagement.modalEdit') : t('columnManagement.modalAdd')}</h3>
              <button onClick={closeModal} className="p-2 rounded-lg transition-colors hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">{t('columnManagement.formName')}</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t('columnManagement.formNamePlaceholderSubsite')}
                  className={inputCls}
                  onKeyDown={(e) => e.key === 'Enter' && (editingColumn ? handleUpdate() : handleCreate())}
                  autoFocus
                />
              </div>
              {!editingColumn && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">{t('columnManagement.formParent')}</label>
                  <select
                    value={newParentId ?? ''}
                    onChange={(e) => setNewParentId(e.target.value ? parseInt(e.target.value, 10) : null)}
                    className={inputCls}
                  >
                    <option value="">{t('columnManagement.topLevel')}</option>
                    {columns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                {t('columnManagement.cancel')}
              </button>
              <button
                onClick={editingColumn ? handleUpdate : handleCreate}
                disabled={!newName.trim()}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-coral hover:opacity-95 shadow-coral disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {editingColumn ? <><Pencil className="w-4 h-4" /> {t('columnManagement.save')}</> : <><Plus className="w-4 h-4" /> {t('columnManagement.save')}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnManagement;
