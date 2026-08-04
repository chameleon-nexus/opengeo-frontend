/**
 * 子站文章分类管理：子站首页资讯按分类 tab 展示
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, BoxSelect, RefreshCw, X, Sparkles } from 'lucide-react';
import { getMyCategories, createCategory, deleteCategory, initCategories, type CategoryItem } from '../api/merchants';
import * as webMain from '../api/webMainSite';
import { useModuleI18n } from '../i18n/hooks';

type CategoryRow = CategoryItem & { slug?: string };

interface CategoryManagementProps {
  theme: 'light' | 'dark';
  /** 子站官网分类（默认）；`web_main` 为营销主站根域分类，接口独立 */
  siteScope?: 'aieo' | 'web_main';
}

const CategoryManagement: React.FC<CategoryManagementProps> = ({ theme, siteScope = 'aieo' }) => {
  const { t } = useModuleI18n('site');
  const isWebMain = siteScope === 'web_main';
  void theme;
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [initLoading, setInitLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newSlug, setNewSlug] = useState('');

  useEffect(() => {
    loadCategories();
  }, [siteScope]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      if (isWebMain) {
        const data = await webMain.listWebMainCategories();
        setCategories(data.map(c => ({ id: c.id, name: c.name, sort_order: c.sort_order, slug: c.slug } as CategoryRow)));
      } else {
        const data = await getMyCategories();
        setCategories(data);
      }
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      if (isWebMain) {
        const slug = (newSlug.trim() || name).toLowerCase().replace(/\s+/g, '-');
        await webMain.createWebMainCategory({ name, slug, sort_order: 0 });
        setNewSlug('');
      } else {
        await createCategory({ name, sort_order: 0 });
      }
      setNewName('');
      setIsModalOpen(false);
      loadCategories();
    } catch (e) {
      alert((e as Error).message || t('categoryManagement.createFailed'));
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setNewName('');
    setNewSlug('');
  };

  const handleInit = async () => {
    if (isWebMain) return;
    if (!confirm(t('categoryManagement.initConfirm'))) return;
    setInitLoading(true);
    try {
      const res = await initCategories();
      alert(t('categoryManagement.initDone', { count: res.created }));
      loadCategories();
    } catch (e) {
      alert((e as Error).message || t('categoryManagement.initFailed'));
    } finally {
      setInitLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('categoryManagement.deleteConfirm'))) return;
    try {
      if (isWebMain) {
        await webMain.deleteWebMainCategory(id);
      } else {
        await deleteCategory(id);
      }
      loadCategories();
    } catch (e) {
      alert((e as Error).message || t('categoryManagement.deleteFailed'));
    }
  };

  const inputCls = 'w-full p-3 rounded-xl border outline-none font-medium transition-all bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500';

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 p-8 lg:p-12 overflow-y-auto no-scrollbar">
        <div className="max-w-[1400px] mx-auto space-y-10">
          <div className="flex justify-between items-end">
            <div className="space-y-3">
              <h2 className="text-4xl font-semibold tracking-tight text-slate-900">{t('categoryManagement.pageTitle')}</h2>
              <p className="text-sm text-slate-500">
                {isWebMain ? t('categoryManagement.subtitleWebMain') : t('categoryManagement.subtitleSubsite')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isWebMain && (
              <button
                type="button"
                onClick={handleInit}
                disabled={initLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm border transition-colors border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {initLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {t('categoryManagement.init')}
              </button>
              )}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-3 px-5 py-2.5 rounded-2xl font-semibold text-sm shadow-sm hover-scale bg-gradient-coral text-white shadow-coral hover:opacity-95"
              >
                <Plus className="w-5 h-5" /> {t('categoryManagement.addCategory')}
              </button>
              <button
                type="button"
                onClick={loadCategories}
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
                  <th className="px-4 py-3">{t('categoryManagement.tableName')}</th>
                  {isWebMain && <th className="px-4 py-3">slug</th>}
                  <th className="px-4 py-3 text-right">{t('categoryManagement.tableActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={isWebMain ? 3 : 2} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                        <p className="text-sm font-bold text-slate-500">{t('categoryManagement.loading')}</p>
                      </div>
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={isWebMain ? 3 : 2} className="px-4 py-12 text-center">
                      <BoxSelect className="w-12 h-12 mb-4 text-slate-400 mx-auto" />
                      <p className="text-sm font-bold text-slate-500">{t('categoryManagement.empty')}</p>
                      <p className="text-xs mt-2 text-slate-400">{t('categoryManagement.emptyHint')}</p>
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id} className="group transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">{cat.name}</span>
                      </td>
                      {isWebMain && (
                        <td className="px-4 py-3">
                          <code className="text-xs text-slate-600">{cat.slug || '—'}</code>
                        </td>
                      )}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(cat.id)}
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
              <h3 className="text-lg font-semibold text-slate-900">{t('categoryManagement.modalTitle')}</h3>
              <button onClick={closeModal} className="p-2 rounded-lg transition-colors hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">{t('categoryManagement.formName')}</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t('categoryManagement.formNamePlaceholder')}
                  className={inputCls}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
              </div>
              {isWebMain && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">{t('categoryManagement.formSlug')}</label>
                  <input
                    type="text"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    placeholder={t('categoryManagement.formSlugPlaceholder')}
                    className={inputCls}
                  />
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                {t('categoryManagement.cancel')}
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-coral hover:opacity-95 shadow-coral disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> {t('categoryManagement.confirmAdd')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
