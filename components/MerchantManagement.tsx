import React, { useState, useEffect } from 'react';
import { Plus, Pencil, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Theme } from '../types';
import { listMerchants, createMerchant, updateMerchant, type MerchantListItem, type MerchantCreateBody } from '../api/merchants';
import { useModuleI18n } from '../i18n/hooks';
import {
  ADMIN_PAGE_SHELL_CLS,
  adminCardCls,
  adminLoadingCls,
  adminPageOuterCls,
  adminSubtitleCls,
  adminTitleCls,
  adminToolbarBorder,
} from '../utils/adminPageStyles';

interface MerchantManagementProps {
  theme: Theme;
}

const MerchantManagement: React.FC<MerchantManagementProps> = ({ theme }) => {
  const { t } = useModuleI18n('admin');
  const isDark = theme === 'dark';
  const [merchants, setMerchants] = useState<MerchantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<MerchantCreateBody>({ company_name: '', contact_email: '' });
  const [editModal, setEditModal] = useState<{ open: boolean; merchant: MerchantListItem | null; form: MerchantCreateBody }>({
    open: false,
    merchant: null,
    form: { company_name: '', contact_email: '' },
  });

  const loadMerchants = async () => {
    try {
      setLoading(true);
      const list = await listMerchants();
      setMerchants(list);
    } catch (e) {
      console.error('加载商户列表失败:', e);
      setMessage({ type: 'error', text: (e as Error).message || t('pages.merchantManagement.errors.loadFailed') });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMerchants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!createForm.company_name?.trim()) {
      setMessage({ type: 'error', text: t('pages.merchantManagement.errors.requireCompanyName') });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    try {
      await createMerchant({
        company_name: createForm.company_name.trim(),
        contact_email: createForm.contact_email?.trim() || undefined,
      });
      setMessage({ type: 'success', text: t('pages.merchantManagement.errors.createSuccess') });
      setCreateForm({ company_name: '', contact_email: '' });
      setIsCreating(false);
      void loadMerchants();
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || t('pages.merchantManagement.errors.createFailed') });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUpdate = async () => {
    if (!editModal.merchant || !editModal.form.company_name?.trim()) return;
    try {
      await updateMerchant(editModal.merchant.id, {
        company_name: editModal.form.company_name.trim(),
        contact_email: editModal.form.contact_email?.trim() || undefined,
      });
      setMessage({ type: 'success', text: t('pages.merchantManagement.errors.updateSuccess') });
      setEditModal({ open: false, merchant: null, form: { company_name: '', contact_email: '' } });
      void loadMerchants();
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || t('pages.merchantManagement.errors.updateFailed') });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const openEdit = (m: MerchantListItem) => {
    setEditModal({
      open: true,
      merchant: m,
      form: { company_name: m.company_name, contact_email: m.contact_email || '' },
    });
  };

  const cardCls = adminCardCls(isDark);
  const toolbarBorder = adminToolbarBorder(isDark);

  if (loading && merchants.length === 0) {
    return (
      <div className={adminLoadingCls(isDark)}>
        <Loader2 className="w-6 h-6 animate-spin opacity-60" />
      </div>
    );
  }

  return (
    <div className={adminPageOuterCls(isDark)}>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className={ADMIN_PAGE_SHELL_CLS}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className={adminTitleCls(isDark)}>{t('pages.merchantManagement.pageTitle')}</h1>
              <p className={adminSubtitleCls(isDark)}>{t('pages.merchantManagement.subtitle')}</p>
            </div>
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="btn-geo-primary shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('pages.merchantManagement.create')}
            </button>
          </div>

        {message && (
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium ${
              message.type === 'success'
                ? isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700'
                : isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-700'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {message.text}
          </div>
        )}

        {isCreating && (
          <div className={`${cardCls} p-6`}>
            <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('pages.merchantManagement.createTitle')}</h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  {t('pages.merchantManagement.form.companyName')}
                </label>
                <input
                  type="text"
                  value={createForm.company_name}
                  onChange={(e) => setCreateForm({ ...createForm, company_name: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                  placeholder={t('pages.merchantManagement.form.companyNamePlaceholder')}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  {t('pages.merchantManagement.form.contactEmail')}
                </label>
                <input
                  type="email"
                  value={createForm.contact_email || ''}
                  onChange={(e) => setCreateForm({ ...createForm, contact_email: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                  placeholder={t('pages.merchantManagement.form.contactEmailPlaceholder')}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => void handleCreate()}
                  className="btn-geo-primary flex-1 px-4 py-2 text-sm font-semibold"
                >
                  {t('pages.merchantManagement.form.confirmCreate')}
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="btn-geo-secondary px-4 py-2 text-sm font-semibold"
                >
                  {t('pages.merchantManagement.form.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={cardCls}>
          <div className={`px-5 py-4 border-b ${toolbarBorder}`}>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
              {t('pages.merchantManagement.listTitle', { count: merchants.length })}
            </h3>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin opacity-60" />
              </div>
            ) : merchants.length === 0 ? (
              <p className={`text-sm text-center py-8 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                {t('pages.merchantManagement.empty')}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left">{t('pages.merchantManagement.table.companyName')}</th>
                      <th className="px-4 py-3 text-left">{t('pages.merchantManagement.table.contactEmail')}</th>
                      <th className="px-4 py-3 text-left">{t('pages.merchantManagement.table.createdAt')}</th>
                      <th className="px-4 py-3 text-left">{t('pages.merchantManagement.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {merchants.map((m) => (
                      <tr key={m.id}>
                        <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{m.company_name}</td>
                        <td className={`px-4 py-3 text-sm ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                          {m.contact_email || '-'}
                        </td>
                        <td className={`px-4 py-3 text-sm ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                          {m.created_at ? new Date(m.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openEdit(m)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                              isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            }`}
                          >
                            <Pencil className="w-3.5 h-3.5" /> {t('pages.merchantManagement.table.edit')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {editModal.open && editModal.merchant && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setEditModal({ open: false, merchant: null, form: { company_name: '', contact_email: '' } })}
          >
            <div
              className={`p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4 ${isDark ? 'bg-zinc-900 border border-zinc-700' : 'bg-white border border-slate-200'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('pages.merchantManagement.editTitle', { name: editModal.merchant.company_name })}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                    {t('pages.merchantManagement.form.companyName')}
                  </label>
                  <input
                    type="text"
                    value={editModal.form.company_name}
                    onChange={(e) =>
                      setEditModal({ ...editModal, form: { ...editModal.form, company_name: e.target.value } })
                    }
                    className={`w-full px-4 py-3 rounded-xl border ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                    {t('pages.merchantManagement.form.contactEmail')}
                  </label>
                  <input
                    type="email"
                    value={editModal.form.contact_email || ''}
                    onChange={(e) =>
                      setEditModal({ ...editModal, form: { ...editModal.form, contact_email: e.target.value } })
                    }
                    className={`w-full px-4 py-3 rounded-xl border ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => void handleUpdate()}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-sm bg-gradient-coral text-white shadow-coral hover:opacity-95"
                  >
                    {t('pages.merchantManagement.form.save')}
                  </button>
                  <button
                    onClick={() => setEditModal({ open: false, merchant: null, form: { company_name: '', contact_email: '' } })}
                    className={`px-4 py-3 rounded-xl font-bold text-sm ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-700'}`}
                  >
                    {t('pages.merchantManagement.form.cancel')}
                  </button>
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

export default MerchantManagement;
