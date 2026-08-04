import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRightLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { Theme } from '../types';
import { useModuleI18n } from '../i18n/hooks';
import { authAPI } from '../api/auth';
import { listMerchants, type MerchantListItem } from '../api/merchants';
import {
  listAdminGeoWorkflows,
  listTransferTargetUsers,
  transferGeoWorkflow,
  type WorkflowTransferListItem,
  type WorkflowTransferTargetUser,
} from '../api/geoWorkflowAdmin';

interface WorkflowTransferManagementProps {
  theme: Theme;
}

const WorkflowTransferManagement: React.FC<WorkflowTransferManagementProps> = ({ theme }) => {
  const { t } = useModuleI18n('admin');
  const isDark = theme === 'dark';

  const [currentUser, setCurrentUser] = useState<{ role?: string; merchant_id?: number | null } | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowTransferListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [merchants, setMerchants] = useState<MerchantListItem[]>([]);
  const [filterMerchantId, setFilterMerchantId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [transferModal, setTransferModal] = useState<{
    open: boolean;
    workflow: WorkflowTransferListItem | null;
    targetMerchantId: number | null;
    targetUserId: number | null;
    targetUsers: WorkflowTransferTargetUser[];
    loadingUsers: boolean;
  }>({
    open: false,
    workflow: null,
    targetMerchantId: null,
    targetUserId: null,
    targetUsers: [],
    loadingUsers: false,
  });

  const isAdmin = currentUser?.role === 'admin';
  const isAgent = currentUser?.role === 'agent';

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const loadWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listAdminGeoWorkflows({
        merchant_id: filterMerchantId ?? undefined,
        skip: 0,
        limit: 100,
      });
      setWorkflows(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (e) {
      console.error('加载工作流失败:', e);
      showMessage('error', (e as Error).message || t('pages.workflowTransfer.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [filterMerchantId, t]);

  useEffect(() => {
    const init = async () => {
      try {
        const user = await authAPI.getCurrentUser();
        setCurrentUser(user);
        const merchantList = await listMerchants();
        setMerchants(merchantList);
        if (user.role === 'agent' && user.merchant_id) {
          setFilterMerchantId(user.merchant_id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    void init();
  }, []);

  useEffect(() => {
    if (currentUser) {
      void loadWorkflows();
    }
  }, [currentUser, loadWorkflows]);

  const transferTargetMerchants = isAdmin
    ? merchants
    : merchants.filter((m) => m.id !== currentUser?.merchant_id);

  const loadUsersForMerchant = async (merchantId: number) => {
    setTransferModal((prev) => ({ ...prev, loadingUsers: true, targetUsers: [], targetUserId: null }));
    try {
      const accounts = await listTransferTargetUsers(merchantId);
      setTransferModal((prev) => ({
        ...prev,
        targetUsers: accounts,
        loadingUsers: false,
      }));
    } catch {
      setTransferModal((prev) => ({ ...prev, loadingUsers: false }));
    }
  };

  const formatTargetUserLabel = (user: WorkflowTransferTargetUser) => {
    const name = user.username || `#${user.id}`;
    const role = user.role || 'unknown';
    if (user.isPlatformAdmin) {
      const merchantHint =
        user.merchantId != null && user.merchantId !== transferModal.targetMerchantId
          ? ` · ${user.merchantName || `商户#${user.merchantId}`}`
          : '';
      return `${name} (${t('pages.workflowTransfer.modal.platformAdmin')}${merchantHint})`;
    }
    return `${name} (${role})`;
  };

  const openTransfer = (workflow: WorkflowTransferListItem) => {
    setTransferModal({
      open: true,
      workflow,
      targetMerchantId: null,
      targetUserId: null,
      targetUsers: [],
      loadingUsers: false,
    });
  };

  const handleTransfer = async () => {
    const { workflow, targetMerchantId, targetUserId } = transferModal;
    if (!workflow || !targetMerchantId) {
      showMessage('error', t('pages.workflowTransfer.errors.requireTargetMerchant'));
      return;
    }
    try {
      await transferGeoWorkflow(workflow.workflowId, {
        target_merchant_id: targetMerchantId,
        target_user_id: targetUserId ?? undefined,
      });
      showMessage('success', t('pages.workflowTransfer.errors.transferSuccess'));
      setTransferModal({
        open: false,
        workflow: null,
        targetMerchantId: null,
        targetUserId: null,
        targetUsers: [],
        loadingUsers: false,
      });
      void loadWorkflows();
    } catch (e) {
      showMessage('error', (e as Error).message || t('pages.workflowTransfer.errors.transferFailed'));
    }
  };

  const phaseLabel = (phase: string) => {
    const key = `pages.workflowTransfer.phases.${phase}`;
    const translated = t(key);
    return translated === key ? phase : translated;
  };

  return (
    <div className={`flex-1 overflow-y-auto p-6 lg:p-10 ${isDark ? 'text-white' : 'text-slate-900'}`}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('pages.workflowTransfer.pageTitle')}</h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            {isAgent
              ? t('pages.workflowTransfer.subtitleAgent')
              : t('pages.workflowTransfer.subtitleAdmin')}
          </p>
        </div>

        {message && (
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
              message.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-red-500/10 text-red-600'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {message.text}
          </div>
        )}

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-3">
            <label className={`text-sm font-medium ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              {t('pages.workflowTransfer.filterMerchant')}
            </label>
            <select
              value={filterMerchantId ?? ''}
              onChange={(e) => setFilterMerchantId(e.target.value ? Number(e.target.value) : null)}
              className={`rounded-lg border px-3 py-2 text-sm ${
                isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-slate-200'
              }`}
            >
              <option value="">{t('pages.workflowTransfer.allMerchants')}</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.company_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div
          className={`rounded-2xl border overflow-hidden ${
            isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-slate-200 bg-white'
          }`}
        >
          <div className={`px-5 py-4 border-b ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
            <h2 className="font-semibold">
              {t('pages.workflowTransfer.listTitle', { count: total })}
            </h2>
          </div>

          {loading ? (
            <p className={`p-8 text-center text-sm ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
              {t('pages.workflowTransfer.loading')}
            </p>
          ) : workflows.length === 0 ? (
            <p className={`p-8 text-center text-sm ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
              {t('pages.workflowTransfer.empty')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={isDark ? 'bg-zinc-800/50 text-zinc-400' : 'bg-slate-50 text-slate-500'}>
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">{t('pages.workflowTransfer.table.brand')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('pages.workflowTransfer.table.merchant')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('pages.workflowTransfer.table.user')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('pages.workflowTransfer.table.phase')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('pages.workflowTransfer.table.updatedAt')}</th>
                    <th className="text-right px-4 py-3 font-medium">{t('pages.workflowTransfer.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {workflows.map((wf) => (
                    <tr
                      key={wf.workflowId}
                      className={isDark ? 'border-t border-zinc-800' : 'border-t border-slate-100'}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{wf.brandName || '—'}</div>
                        {wf.productName && (
                          <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                            {wf.productName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">{wf.merchantName || `#${wf.merchantId}`}</td>
                      <td className="px-4 py-3">{wf.username || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs ${
                            isDark ? 'bg-zinc-800' : 'bg-slate-100'
                          }`}
                        >
                          {phaseLabel(wf.phase)}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                        {wf.updatedAt ? new Date(wf.updatedAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openTransfer(wf)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-coral text-white hover:opacity-90"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          {t('pages.workflowTransfer.transfer')}
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

      {transferModal.open && transferModal.workflow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div
            className={`w-full max-w-md rounded-2xl p-6 shadow-xl ${
              isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white'
            }`}
          >
            <h3 className="text-lg font-bold mb-1">{t('pages.workflowTransfer.modal.title')}</h3>
            <p className={`text-sm mb-4 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              {transferModal.workflow.brandName} · {transferModal.workflow.workflowId}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('pages.workflowTransfer.modal.targetMerchant')}
                </label>
                <select
                  value={transferModal.targetMerchantId ?? ''}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null;
                    setTransferModal((prev) => ({
                      ...prev,
                      targetMerchantId: id,
                      targetUserId: null,
                      targetUsers: [],
                    }));
                    if (id) void loadUsersForMerchant(id);
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${
                    isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-slate-200'
                  }`}
                >
                  <option value="">{t('pages.workflowTransfer.modal.selectMerchant')}</option>
                  {transferTargetMerchants.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('pages.workflowTransfer.modal.targetUser')}
                </label>
                <select
                  value={transferModal.targetUserId ?? ''}
                  disabled={!transferModal.targetMerchantId || transferModal.loadingUsers}
                  onChange={(e) =>
                    setTransferModal((prev) => ({
                      ...prev,
                      targetUserId: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${
                    isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-slate-200'
                  }`}
                >
                  <option value="">{t('pages.workflowTransfer.modal.keepUser')}</option>
                  {transferModal.targetUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {formatTargetUserLabel(u)}
                    </option>
                  ))}
                </select>
                <p className={`mt-1 text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                  {t('pages.workflowTransfer.modal.userHint')}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() =>
                  setTransferModal({
                    open: false,
                    workflow: null,
                    targetMerchantId: null,
                    targetUserId: null,
                    targetUsers: [],
                    loadingUsers: false,
                  })
                }
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t('pages.workflowTransfer.modal.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void handleTransfer()}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-coral text-white hover:opacity-90"
              >
                {t('pages.workflowTransfer.modal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowTransferManagement;
