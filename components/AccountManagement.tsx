import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Shield, UserCheck, CheckCircle2, AlertCircle, Coins, Pencil, Lock, Trash2, Briefcase, Loader2, Sparkles } from 'lucide-react';
import { Theme, UserRole, SubAccount, RoleGroup } from '../types';
import { authAPI } from '../api/auth';
import { creditPackagesAPI, type CreditPackageAdmin } from '../api/creditPackages';
import { useModuleI18n } from '../i18n/hooks';
import { rolesAPI } from '../api/roles';
import { listMerchants, type MerchantListItem } from '../api/merchants';
import { getRoleDisplayName } from '../config/roleLabels';
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

interface AccountManagementProps {
  theme: Theme;
}

const AccountManagement: React.FC<AccountManagementProps> = ({ theme }) => {
  const { t } = useModuleI18n('admin');
  const isDark = theme === 'dark';
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<RoleGroup[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedMerchantId, setSelectedMerchantId] = useState<number | null>(null);
  /** 列表筛选：null 表示全部商户 */
  const [filterMerchantId, setFilterMerchantId] = useState<number | null>(null);
  const [merchants, setMerchants] = useState<MerchantListItem[]>([]);
  const [newAccountForm, setNewAccountForm] = useState({
    username: '',
    email: '',
    phone: '',
    password: ''
  });
  const [rechargeModal, setRechargeModal] = useState<{ open: boolean; account: SubAccount | null; amount: string }>({
    open: false,
    account: null,
    amount: ''
  });
  const [roleModal, setRoleModal] = useState<{ open: boolean; account: SubAccount | null; roleId: number }>({
    open: false,
    account: null,
    roleId: 0
  });
  const [passwordModal, setPasswordModal] = useState<{
    open: boolean;
    account: SubAccount | null;
    password: string;
    confirmPassword: string;
  }>({
    open: false,
    account: null,
    password: '',
    confirmPassword: '',
  });
  const [brandQuotaModal, setBrandQuotaModal] = useState<{
    open: boolean;
    account: SubAccount | null;
    value: string;
  }>({
    open: false,
    account: null,
    value: '',
  });
  const [saasGrantModal, setSaasGrantModal] = useState<{
    open: boolean;
    account: SubAccount | null;
    packageId: number;
    username: string;
    password: string;
    packages: CreditPackageAdmin[];
    loadingPackages: boolean;
  }>({
    open: false,
    account: null,
    packageId: 0,
    username: '',
    password: '',
    packages: [],
    loadingPackages: false,
  });

  const isAdmin = currentUser?.role === 'admin';
  const isAgent = currentUser?.role === 'agent';
  const canManageAccounts = isAdmin || isAgent;
  
  // 加载当前用户信息、角色列表和子账户列表
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const user = await authAPI.getCurrentUser();
        setCurrentUser(user);
        if (user.role === 'admin') {
          const [roleList, merchantList] = await Promise.all([rolesAPI.listRoles(), listMerchants()]);
          setRoles(roleList);
          setMerchants(merchantList);
          if (roleList.length > 0 && !selectedRoleId) {
            const agentRole = roleList.find(r => r.name === 'agent');
            setSelectedRoleId(agentRole?.id ?? roleList[0].id);
          }
          if (merchantList.length > 0 && !selectedMerchantId) {
            setSelectedMerchantId(merchantList[0].id);
          }
        } else if (user.role === 'agent') {
          const merchantList = await listMerchants();
          setMerchants(merchantList);
          if (merchantList.length > 0 && !selectedMerchantId) {
            setSelectedMerchantId(merchantList[0].id);
          }
        }
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, []);

  const fetchAccountsWithFilter = useCallback(async () => {
    const opts = filterMerchantId != null ? { merchant_id: filterMerchantId } : undefined;
    return authAPI.getMyAccounts(opts);
  }, [filterMerchantId]);

  useEffect(() => {
    if (!currentUser || !canManageAccounts) return;
    let cancelled = false;
    (async () => {
      try {
        const accounts = await fetchAccountsWithFilter();
        if (!cancelled) setSubAccounts(accounts);
      } catch (error) {
        console.error('加载账户列表失败:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser, canManageAccounts, fetchAccountsWithFilter]);
  
  const getRoleName = (role: string) => getRoleDisplayName(role);

  const handleUpdateRole = async () => {
    if (!roleModal.account || !roleModal.roleId) return;
    try {
      await authAPI.updateUserRole(roleModal.account.id, roleModal.roleId);
      setSaveMessage({ type: 'success', text: '角色修改成功' });
      setRoleModal({ open: false, account: null, roleId: 0 });
      const accounts = await fetchAccountsWithFilter();
      setSubAccounts(accounts);
    } catch (error: any) {
      setSaveMessage({ type: 'error', text: error.message || '修改角色失败' });
    }
    setTimeout(() => setSaveMessage(null), 3000);
  };
  
  const handleCreateAccount = async () => {
    if (!newAccountForm.username || !newAccountForm.password) {
      setSaveMessage({ type: 'error', text: '请填写用户名和密码' });
      return;
    }
    if (isAdmin) {
      if (!selectedRoleId) {
        setSaveMessage({ type: 'error', text: '请选择角色' });
        return;
      }
      if (!selectedMerchantId) {
        setSaveMessage({ type: 'error', text: '请选择归属商户' });
        return;
      }
    }
    if (isAgent) {
      if (!selectedMerchantId) {
        setSaveMessage({ type: 'error', text: '请先创建商户或选择归属商户' });
        return;
      }
    }
    try {
      const requestData = {
        username: newAccountForm.username,
        email: newAccountForm.email.trim() || undefined,
        phone: newAccountForm.phone.trim() || undefined,
        password: newAccountForm.password
      };
      if (isAdmin) {
        await authAPI.createUser({ ...requestData, role_id: selectedRoleId!, merchant_id: selectedMerchantId! });
        setSaveMessage({ type: 'success', text: '用户创建成功' });
      } else if (isAgent) {
        await authAPI.createCustomer({ ...requestData, merchant_id: selectedMerchantId! });
        setSaveMessage({ type: 'success', text: '客户账户创建成功' });
      }
      const accounts = await fetchAccountsWithFilter();
      setSubAccounts(accounts);
      
      setNewAccountForm({ username: '', email: '', phone: '', password: '' });
      setIsCreatingAccount(false);
      
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      console.error('❌ [CreateAccount] 创建失败:', error);
      setSaveMessage({ type: 'error', text: error.message || '创建账户失败' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const openPasswordModal = (account: SubAccount) => {
    setPasswordModal({ open: true, account, password: '', confirmPassword: '' });
  };

  const handleResetPassword = async () => {
    if (!passwordModal.account) return;
    const { password, confirmPassword } = passwordModal;
    if (!password || password.length < 6) {
      setSaveMessage({ type: 'error', text: '密码长度至少6位' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }
    if (password !== confirmPassword) {
      setSaveMessage({ type: 'error', text: '两次输入的密码不一致' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }
    try {
      await authAPI.resetUserPassword(passwordModal.account.id, password);
      setSaveMessage({ type: 'success', text: `已为 ${passwordModal.account.username} 修改密码` });
      setPasswordModal({ open: false, account: null, password: '', confirmPassword: '' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      setSaveMessage({ type: 'error', text: error.message || '修改密码失败' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleDeleteAccount = async (account: SubAccount) => {
    if (!window.confirm(`确定要删除账户「${account.username}」吗？删除后该账户将无法登录。`)) return;
    try {
      await authAPI.deleteUser(account.id);
      setSaveMessage({ type: 'success', text: `已删除账户 ${account.username}` });
      const accounts = await fetchAccountsWithFilter();
      setSubAccounts(accounts);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      setSaveMessage({ type: 'error', text: error.message || '删除账户失败' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleRecharge = async () => {
    if (!rechargeModal.account || !rechargeModal.amount) {
      setSaveMessage({ type: 'error', text: '请输入充值金额' });
      return;
    }
    const amount = parseInt(rechargeModal.amount, 10);
    if (isNaN(amount) || amount <= 0) {
      setSaveMessage({ type: 'error', text: '请输入有效的正整数' });
      return;
    }
    try {
      await authAPI.rechargePoints(rechargeModal.account.id, amount);
      setSaveMessage({ type: 'success', text: `已为 ${rechargeModal.account.username} 充值 ${amount} 积分` });
      setRechargeModal({ open: false, account: null, amount: '' });
      const accounts = await fetchAccountsWithFilter();
      setSubAccounts(accounts);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      setSaveMessage({ type: 'error', text: error.message || '充值失败' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const formatBrandQuotaLabel = (account: SubAccount) => {
    const used = account.brand_count ?? 0;
    if (account.max_brands == null) return `品牌 ${used}/不限`;
    return `品牌 ${used}/${account.max_brands}`;
  };

  const openBrandQuotaModal = (account: SubAccount) => {
    setBrandQuotaModal({
      open: true,
      account,
      value: account.max_brands == null ? '' : String(account.max_brands),
    });
  };

  const handleUpdateBrandQuota = async () => {
    if (!brandQuotaModal.account) return;
    const raw = brandQuotaModal.value.trim();
    let maxBrands: number | null;
    if (!raw) {
      maxBrands = null;
    } else {
      maxBrands = parseInt(raw, 10);
      if (Number.isNaN(maxBrands) || maxBrands < 0) {
        setSaveMessage({ type: 'error', text: '请输入有效的非负整数' });
        return;
      }
    }
    try {
      await authAPI.updateBrandQuota(brandQuotaModal.account.id, maxBrands);
      setSaveMessage({ type: 'success', text: `已更新 ${brandQuotaModal.account.username} 的品牌额度` });
      setBrandQuotaModal({ open: false, account: null, value: '' });
      const accounts = await fetchAccountsWithFilter();
      setSubAccounts(accounts);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      setSaveMessage({ type: 'error', text: error.message || '更新品牌额度失败' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const buildAccountMetaLine = (account: SubAccount) => {
    const parts: string[] = [];
    if (isAdmin) {
      parts.push(getRoleName(account.role));
    }
    if (account.merchant_name) {
      parts.push(account.merchant_name);
    }
    if (account.saas_granted_at) {
      parts.push('已开通 SaaS');
    }
    parts.push(new Date(account.created_at).toLocaleDateString());
    if (account.role !== 'admin' && account.points != null) {
      parts.push(`${account.points} 积分`);
    }
    if (account.role !== 'admin') {
      parts.push(formatBrandQuotaLabel(account));
    }
    return parts.join(' · ');
  };

  const openSaasGrantModal = async (account: SubAccount) => {
    setSaasGrantModal({
      open: true,
      account,
      packageId: account.saas_package_id ?? 0,
      username: account.username || '',
      password: '',
      packages: [],
      loadingPackages: true,
    });
    try {
      const packages = await creditPackagesAPI.adminList('saas');
      const paid = packages.filter(pkg => pkg.kind === 'paid' && pkg.enabled !== false);
      setSaasGrantModal(prev => ({
        ...prev,
        packages: paid,
        packageId: prev.packageId || paid[0]?.id || 0,
        loadingPackages: false,
      }));
    } catch {
      setSaasGrantModal(prev => ({ ...prev, loadingPackages: false }));
    }
  };

  const handleGrantSaas = async () => {
    if (!saasGrantModal.account || !saasGrantModal.packageId) {
      setSaveMessage({ type: 'error', text: '请选择 SaaS 套餐' });
      return;
    }
    try {
      await authAPI.grantSaasPackage(saasGrantModal.account.id, {
        package_id: saasGrantModal.packageId,
        username: saasGrantModal.username.trim() || undefined,
        password: saasGrantModal.password.trim() || undefined,
      });
      setSaveMessage({ type: 'success', text: 'SaaS 套餐授予成功' });
      setSaasGrantModal({
        open: false,
        account: null,
        packageId: 0,
        username: '',
        password: '',
        packages: [],
        loadingPackages: false,
      });
      setSubAccounts(await fetchAccountsWithFilter());
    } catch (error: any) {
      setSaveMessage({ type: 'error', text: error.message || '授予失败' });
    }
  };

  const cardCls = adminCardCls(isDark);
  const toolbarBorder = adminToolbarBorder(isDark);
  const rowHoverCls = adminRowHoverCls(isDark);

  if (loading && subAccounts.length === 0) {
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
              <h1 className={adminTitleCls(isDark)}>{t('pages.accountManagement.pageTitle')}</h1>
              <p className={adminSubtitleCls(isDark)}>{t('pages.accountManagement.subtitle')}</p>
            </div>
            {canManageAccounts && (
              <button
                onClick={() => setIsCreatingAccount(!isCreatingAccount)}
                className="btn-geo-primary shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                {isAgent ? '创建客户账户' : '创建账户'}
              </button>
            )}
          </div>

        {saveMessage && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium ${
            saveMessage.type === 'success'
              ? (isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700')
              : (isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-700')
          }`}>
            {saveMessage.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            {saveMessage.text}
          </div>
        )}
        
        {/* 创建账户表单 */}
        {canManageAccounts && isCreatingAccount && (
          <div className={`${cardCls} p-6`}>
            <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isAgent ? '创建客户账户' : '创建新账户'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  归属商户 *
                </label>
                {merchants.length === 0 ? (
                  <p className={`text-sm ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                    请先在「商户管理」中创建商户，再为客户开户。
                  </p>
                ) : (
                  <select
                    value={selectedMerchantId ?? ''}
                    onChange={e => setSelectedMerchantId(parseInt(e.target.value, 10))}
                    className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                  >
                    {merchants.map(m => (
                      <option key={m.id} value={m.id}>{m.company_name}</option>
                    ))}
                  </select>
                )}
              </div>
              {isAdmin && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                    角色 *
                  </label>
                  <select
                    value={selectedRoleId ?? ''}
                    onChange={e => setSelectedRoleId(parseInt(e.target.value, 10))}
                    className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{getRoleDisplayName(r.name)}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  用户名 *
                </label>
                <input
                  type="text"
                  value={newAccountForm.username}
                  onChange={(e) => setNewAccountForm({...newAccountForm, username: e.target.value})}
                  className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-geo-blue' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'}`}
                  placeholder="请输入用户名"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  邮箱
                </label>
                <input
                  type="email"
                  value={newAccountForm.email}
                  onChange={(e) => setNewAccountForm({...newAccountForm, email: e.target.value})}
                  className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-geo-blue' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'}`}
                  placeholder="请输入邮箱（可选）"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  手机号
                </label>
                <input
                  type="tel"
                  value={newAccountForm.phone}
                  onChange={(e) => setNewAccountForm({...newAccountForm, phone: e.target.value})}
                  className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-geo-blue' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'}`}
                  placeholder="请输入手机号（可选）"
                  maxLength={11}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  密码 *
                </label>
                <input
                  type="password"
                  value={newAccountForm.password}
                  onChange={(e) => setNewAccountForm({...newAccountForm, password: e.target.value})}
                  className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-geo-blue' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'}`}
                  placeholder="请输入密码（至少6位）"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateAccount}
                  disabled={merchants.length === 0}
                  className={`flex-1 px-4 py-2 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark 
                      ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' 
                      : 'bg-gradient-coral text-white shadow-coral hover:opacity-95'
                  }`}
                >
                  确认创建
                </button>
                <button
                  onClick={() => setIsCreatingAccount(false)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                    isDark 
                      ? 'bg-zinc-800 text-white hover:bg-zinc-700' 
                      : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
                  }`}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* 当前登录账户（admin 可修改自身密码） */}
        {!loading && currentUser?.role === 'admin' && (
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {currentUser.username}
                </p>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  管理员 · 当前登录账户
                </p>
              </div>
            </div>
            <button
              onClick={() => openPasswordModal({
                id: currentUser.id,
                username: currentUser.username,
                role: currentUser.role,
                role_id: currentUser.role_group?.id ?? null,
                is_active: currentUser.is_active,
                created_at: currentUser.created_at ?? new Date().toISOString(),
              })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                isDark ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <Lock className="w-3.5 h-3.5" /> 修改密码
            </button>
          </div>
        )}

        {/* 子账户列表 */}
        <div className={cardCls}>
          <div className={`px-5 py-4 border-b ${toolbarBorder}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                已创建的账户 ({subAccounts.length})
              </h3>
            {canManageAccounts && merchants.length > 0 && (
              <div className="flex items-center gap-2">
                <label className={`text-sm whitespace-nowrap ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                  按商户筛选
                </label>
                <select
                  value={filterMerchantId === null ? '' : String(filterMerchantId)}
                  onChange={e => {
                    const v = e.target.value;
                    setFilterMerchantId(v === '' ? null : parseInt(v, 10));
                  }}
                  className={`min-w-[200px] px-3 py-2 rounded-xl border text-sm ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                >
                  <option value="">全部商户</option>
                  {merchants.map(m => (
                    <option key={m.id} value={m.id}>{m.company_name}</option>
                  ))}
                </select>
              </div>
            )}
            </div>
          </div>
          <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin opacity-60" />
            </div>
          ) : subAccounts.length === 0 ? (
            <p className={`text-sm text-center py-8 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              暂无创建的账户
            </p>
          ) : (
            <div className="space-y-3">
              {subAccounts.map(account => {
                const metaLine = buildAccountMetaLine(account);

                return (
                <div
                  key={account.id}
                  className={`p-4 rounded-xl border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 min-w-0 transition-colors ${rowHoverCls} ${
                    isDark ? 'border-zinc-700/80' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 w-full sm:w-[252px] sm:min-w-[252px] sm:max-w-[252px] shrink-0">
                    <div className={`shrink-0 p-2 rounded-lg ${isDark ? 'bg-zinc-700' : 'bg-slate-200'}`}>
                      {account.role === 'agent' ? (
                        <Shield className="w-5 h-5" />
                      ) : (
                        <UserCheck className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p
                        className={`font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}
                        title={account.username}
                      >
                        {account.username}
                      </p>
                      <p
                        className={`text-xs truncate ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}
                        title={metaLine}
                      >
                        {metaLine}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0 sm:justify-end sm:ml-auto">
                    {canManageAccounts && account.role !== 'admin' && (
                      <button
                        onClick={() => openPasswordModal(account)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                          isDark ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" /> 修改密码
                      </button>
                    )}
                    {isAdmin && account.role !== 'admin' && (
                      <>
                        <button
                          onClick={() => setRoleModal({ open: true, account, roleId: account.role_id ?? 0 })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                            isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          <Pencil className="w-3.5 h-3.5" /> 修改角色
                        </button>
                        <button
                          onClick={() => setRechargeModal({ open: true, account, amount: '' })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                            isDark
                              ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          <Coins className="w-3.5 h-3.5" />
                          充值
                        </button>
                        <button
                          onClick={() => openBrandQuotaModal(account)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                            isDark
                              ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
                              : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                          }`}
                        >
                          <Briefcase className="w-3.5 h-3.5" />
                          品牌额度
                        </button>
                        {account.role === 'customer' ? (
                          <button
                            onClick={() => void openSaasGrantModal(account)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                              isDark
                                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            {account.saas_granted_at ? '续授 SaaS' : '开通 SaaS'}
                          </button>
                        ) : null}
                        <button
                          onClick={() => handleDeleteAccount(account)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                            isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-50 text-red-600 hover:bg-red-100'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> 删除
                        </button>
                      </>
                    )}
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      account.is_active
                        ? (isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-50 text-green-600')
                        : (isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600')
                    }`}>
                      {account.is_active ? '活跃' : '已禁用'}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
          </div>
        </div>

        {/* 修改角色弹窗 */}
        {roleModal.open && roleModal.account && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setRoleModal({ open: false, account: null, roleId: 0 })}>
            <div
              className={`p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4 ${isDark ? 'bg-zinc-900 border border-zinc-700' : 'bg-white border border-slate-200'}`}
              onClick={e => e.stopPropagation()}
            >
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                修改 {roleModal.account.username} 的角色
              </h3>
              <select
                value={roleModal.roleId || ''}
                onChange={e => setRoleModal({ ...roleModal, roleId: parseInt(e.target.value, 10) })}
                className={`w-full px-4 py-3 rounded-xl border mb-4 ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{getRoleDisplayName(r.name)}</option>
                ))}
              </select>
              <div className="flex gap-3">
                <button
                  onClick={handleUpdateRole}
                  className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm ${isDark ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' : 'bg-gradient-coral text-white shadow-coral hover:opacity-95'}`}
                >
                  确认修改
                </button>
                <button
                  onClick={() => setRoleModal({ open: false, account: null, roleId: 0 })}
                  className={`px-4 py-3 rounded-xl font-bold text-sm ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-700'}`}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 修改密码弹窗 */}
        {passwordModal.open && passwordModal.account && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPasswordModal({ open: false, account: null, password: '', confirmPassword: '' })}>
            <div
              className={`p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4 ${isDark ? 'bg-zinc-900 border border-zinc-700' : 'bg-white border border-slate-200'}`}
              onClick={e => e.stopPropagation()}
            >
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                修改 {passwordModal.account.username} 的密码
              </h3>
              <p className={`text-xs mb-4 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                直接覆盖新密码，无需验证旧密码
              </p>
              <input
                type="password"
                value={passwordModal.password}
                onChange={e => setPasswordModal({ ...passwordModal, password: e.target.value })}
                placeholder="请输入新密码（至少6位）"
                className={`w-full px-4 py-3 rounded-xl border mb-3 ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
              />
              <input
                type="password"
                value={passwordModal.confirmPassword}
                onChange={e => setPasswordModal({ ...passwordModal, confirmPassword: e.target.value })}
                placeholder="请再次输入新密码"
                className={`w-full px-4 py-3 rounded-xl border mb-4 ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleResetPassword}
                  className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm ${isDark ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' : 'bg-gradient-coral text-white shadow-coral hover:opacity-95'}`}
                >
                  确认修改
                </button>
                <button
                  onClick={() => setPasswordModal({ open: false, account: null, password: '', confirmPassword: '' })}
                  className={`px-4 py-3 rounded-xl font-bold text-sm ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-700'}`}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 充值弹窗 */}
        {rechargeModal.open && rechargeModal.account && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setRechargeModal({ open: false, account: null, amount: '' })}>
            <div
              className={`p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4 ${isDark ? 'bg-zinc-900 border border-zinc-700' : 'bg-white border border-slate-200'}`}
              onClick={e => e.stopPropagation()}
            >
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                为 {rechargeModal.account.username} 充值积分
              </h3>
              <input
                type="number"
                min="1"
                value={rechargeModal.amount}
                onChange={e => setRechargeModal({ ...rechargeModal, amount: e.target.value })}
                placeholder="请输入充值金额"
                className={`w-full px-4 py-3 rounded-xl border mb-4 ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleRecharge}
                  className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm ${isDark ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' : 'bg-gradient-coral text-white shadow-coral hover:opacity-95'}`}
                >
                  确认充值
                </button>
                <button
                  onClick={() => setRechargeModal({ open: false, account: null, amount: '' })}
                  className={`px-4 py-3 rounded-xl font-bold text-sm ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-700'}`}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 品牌额度弹窗 */}
        {brandQuotaModal.open && brandQuotaModal.account && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setBrandQuotaModal({ open: false, account: null, value: '' })}>
            <div
              className={`p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4 ${isDark ? 'bg-zinc-900 border border-zinc-700' : 'bg-white border border-slate-200'}`}
              onClick={e => e.stopPropagation()}
            >
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                设置 {brandQuotaModal.account.username} 的品牌额度
              </h3>
              <p className={`text-xs mb-4 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                当前已创建 {brandQuotaModal.account.brand_count ?? 0} 个品牌。留空表示按角色默认值。
              </p>
              <input
                type="number"
                min="0"
                value={brandQuotaModal.value}
                onChange={e => setBrandQuotaModal({ ...brandQuotaModal, value: e.target.value })}
                placeholder="例如 1（普通用户）或 20（代理）"
                className={`w-full px-4 py-3 rounded-xl border mb-4 ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleUpdateBrandQuota}
                  className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm ${isDark ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' : 'bg-gradient-coral text-white shadow-coral hover:opacity-95'}`}
                >
                  确认
                </button>
                <button
                  onClick={() => setBrandQuotaModal({ open: false, account: null, value: '' })}
                  className={`px-4 py-3 rounded-xl font-bold text-sm ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-700'}`}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {saasGrantModal.open && saasGrantModal.account && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() =>
              setSaasGrantModal({
                open: false,
                account: null,
                packageId: 0,
                username: '',
                password: '',
                packages: [],
                loadingPackages: false,
              })
            }
          >
            <div
              className={`p-6 rounded-2xl shadow-xl max-w-md w-full mx-4 ${
                isDark ? 'bg-zinc-900 border border-zinc-700' : 'bg-white border border-slate-200'
              }`}
              onClick={event => event.stopPropagation()}
            >
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                为 {saasGrantModal.account.username} 授予 SaaS 套餐
              </h3>
              <p className={`text-xs mb-4 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                授予套餐有效期和积分；可同时设置该客户的登录用户名与密码。
              </p>
              <div className="space-y-3">
                <select
                  value={saasGrantModal.packageId || ''}
                  onChange={event =>
                    setSaasGrantModal({
                      ...saasGrantModal,
                      packageId: parseInt(event.target.value, 10),
                    })
                  }
                  className={`w-full px-4 py-3 rounded-xl border text-sm ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200'
                  }`}
                >
                  {saasGrantModal.loadingPackages ? (
                    <option value="">加载套餐…</option>
                  ) : (
                    saasGrantModal.packages.map(pkg => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.title} · {pkg.validMonths || 1} 月 · {pkg.credits || 0} 积分
                      </option>
                    ))
                  )}
                </select>
                <input
                  type="text"
                  value={saasGrantModal.username}
                  onChange={event =>
                    setSaasGrantModal({ ...saasGrantModal, username: event.target.value })
                  }
                  placeholder="SaaS 登录用户名"
                  className={`w-full px-4 py-3 rounded-xl border ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200'
                  }`}
                />
                <input
                  type="password"
                  value={saasGrantModal.password}
                  onChange={event =>
                    setSaasGrantModal({ ...saasGrantModal, password: event.target.value })
                  }
                  placeholder="密码（至少 6 位，留空不修改）"
                  className={`w-full px-4 py-3 rounded-xl border ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200'
                  }`}
                />
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => void handleGrantSaas()}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-sm bg-gradient-coral text-white shadow-coral hover:opacity-95"
                >
                  确认授予
                </button>
                <button
                  onClick={() =>
                    setSaasGrantModal({
                      open: false,
                      account: null,
                      packageId: 0,
                      username: '',
                      password: '',
                      packages: [],
                      loadingPackages: false,
                    })
                  }
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

export default AccountManagement;
