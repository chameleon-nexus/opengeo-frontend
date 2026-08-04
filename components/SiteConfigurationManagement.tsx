import React, { useCallback, useEffect, useState } from 'react';
import { Globe, Pencil, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Theme } from '../types';
import { listMerchants, type MerchantListItem } from '../api/merchants';
import {
  listAdminSites,
  updateSiteMerchant,
  SITE_KIND_LABEL,
  type AdminSiteRow,
} from '../api/adminSites';
import {
  ADMIN_PAGE_SHELL_CLS,
  adminCardCls,
  adminLoadingCls,
  adminPageOuterCls,
  adminRowHoverCls,
  adminSubtitleCls,
  adminTitleCls,
  adminToolbarBorder,
} from '../utils/adminPageStyles';

interface SiteConfigurationManagementProps {
  theme: Theme;
}

const SiteConfigurationManagement: React.FC<SiteConfigurationManagementProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [sites, setSites] = useState<AdminSiteRow[]>([]);
  const [merchants, setMerchants] = useState<MerchantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filterMerchantId, setFilterMerchantId] = useState<number | null>(null);
  const [editModal, setEditModal] = useState<{
    open: boolean;
    site: AdminSiteRow | null;
    merchantId: number;
  }>({ open: false, site: null, merchantId: 0 });

  const loadSites = useCallback(async () => {
    try {
      setLoading(true);
      const list = await listAdminSites(filterMerchantId ?? undefined);
      setSites(list);
    } catch (e) {
      console.error('加载站点列表失败:', e);
      setMessage({ type: 'error', text: (e as Error).message || '加载失败' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  }, [filterMerchantId]);

  useEffect(() => {
    listMerchants()
      .then(setMerchants)
      .catch(() => setMerchants([]));
  }, []);

  useEffect(() => {
    void loadSites();
  }, [loadSites]);

  const handleSaveMerchant = async () => {
    if (!editModal.site || !editModal.merchantId) {
      setMessage({ type: 'error', text: '请选择归属商户' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (editModal.site.merchant_id === editModal.merchantId) {
      setEditModal({ open: false, site: null, merchantId: 0 });
      return;
    }
    const siteName = editModal.site.display_name;
    const merchantName =
      merchants.find((m) => m.id === editModal.merchantId)?.company_name ?? String(editModal.merchantId);
    if (!window.confirm(`确定将站点「${siteName}」归属商户改为「${merchantName}」吗？`)) {
      return;
    }
    try {
      await updateSiteMerchant(editModal.site.id, editModal.merchantId);
      setMessage({ type: 'success', text: '归属商户已更新' });
      setEditModal({ open: false, site: null, merchantId: 0 });
      await loadSites();
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || '保存失败' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const openEdit = (site: AdminSiteRow) => {
    setEditModal({
      open: true,
      site,
      merchantId: site.merchant_id,
    });
  };

  const cardCls = adminCardCls(isDark);
  const toolbarBorder = adminToolbarBorder(isDark);
  const rowHoverCls = adminRowHoverCls(isDark);

  if (loading && sites.length === 0 && merchants.length === 0) {
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
          <div>
            <h1 className={adminTitleCls(isDark)}>站点配置</h1>
            <p className={adminSubtitleCls(isDark)}>设置站点归属商户，站点管理员将按商户查看对应站点</p>
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

        {merchants.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <label className={`text-sm whitespace-nowrap ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              按商户筛选
            </label>
            <select
              value={filterMerchantId === null ? '' : String(filterMerchantId)}
              onChange={(e) => {
                const v = e.target.value;
                setFilterMerchantId(v === '' ? null : parseInt(v, 10));
              }}
              className={`min-w-[200px] px-3 py-2 rounded-xl border text-sm ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <option value="">全部商户</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.company_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={cardCls}>
          <div className={`px-5 py-4 border-b ${toolbarBorder}`}>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
              站点列表 ({sites.length})
            </h3>
          </div>
          <div className="p-5">

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin opacity-60" />
            </div>
          ) : sites.length === 0 ? (
            <p className={`text-sm text-center py-8 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>暂无站点</p>
          ) : (
            <div className="space-y-3">
              {sites.map((site) => (
                <div
                  key={site.id}
                  className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-colors ${rowHoverCls} ${
                    isDark ? 'border-zinc-700/80' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${isDark ? 'bg-zinc-700' : 'bg-slate-200'}`}>
                      <Globe className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className={`font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {site.display_name}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                        {SITE_KIND_LABEL[site.site_kind] ?? site.site_kind}
                        {site.primary_host ? ` · ${site.primary_host}` : ''}
                        {' · '}
                        商户：{site.merchant_name ?? site.merchant_id}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(site)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                      isDark
                        ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    <Pencil className="w-3.5 h-3.5" /> 修改商户
                  </button>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>

        {editModal.open && editModal.site && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setEditModal({ open: false, site: null, merchantId: 0 })}
          >
            <div
              className={`p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4 ${
                isDark ? 'bg-zinc-900 border border-zinc-700' : 'bg-white border border-slate-200'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                修改「{editModal.site.display_name}」归属商户
              </h3>
              <select
                value={editModal.merchantId || ''}
                onChange={(e) =>
                  setEditModal({ ...editModal, merchantId: parseInt(e.target.value, 10) })
                }
                className={`w-full px-4 py-3 rounded-xl border mb-4 ${
                  isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                {merchants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.company_name}
                  </option>
                ))}
              </select>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSaveMerchant}
                  className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm ${
                    isDark
                      ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95'
                      : 'bg-gradient-coral text-white shadow-coral hover:opacity-95'
                  }`}
                >
                  确认保存
                </button>
                <button
                  type="button"
                  onClick={() => setEditModal({ open: false, site: null, merchantId: 0 })}
                  className={`px-4 py-3 rounded-xl font-bold text-sm ${
                    isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default SiteConfigurationManagement;
