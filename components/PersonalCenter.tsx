
import React, { useState, useEffect } from 'react';
import { UserCircle, Lock, Save, CheckCircle2, AlertCircle, Users, Plus, Shield, UserCheck, Coins } from 'lucide-react';
import { Theme, SubAccount } from '../types';
import { authAPI } from '../api/auth';
import { useModuleI18n } from '../i18n/hooks';
import {
  ADMIN_PAGE_SHELL_CLS,
  adminCardCls,
  adminPageOuterCls,
  adminRowHoverCls,
  adminSubtitleCls,
  adminTitleCls,
  adminToolbarBorder,
} from '../utils/adminPageStyles';

interface PersonalCenterProps {
  theme: Theme;
}

const PersonalCenter: React.FC<PersonalCenterProps> = ({ theme }) => {
  const { t } = useModuleI18n('admin');
  const isDark = theme === 'dark';
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // 新增：用户信息和账户管理
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'accounts'>('info');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({
    username: '',
    email: '',
    phone: '',
    password: ''
  });
  
  // 加载当前用户信息和子账户列表
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const user = await authAPI.getCurrentUser();
        setCurrentUser(user);
        
        // 如果是管理员或代理商，加载子账户列表
        if (user.role === 'admin' || user.role === 'agent') {
          const accounts = await authAPI.getMyAccounts();
          setSubAccounts(accounts);
        }
      } catch (error) {
        console.error('加载用户信息失败:', error);
      }
    };
    
    loadUserInfo();
  }, []);
  
  const getRoleName = (role: string) => {
    return t(`pages.personalCenter.roles.${role}`, { defaultValue: role });
  };
  
  const handleCreateAccount = async () => {
    if (!newAccountForm.username || !newAccountForm.password) {
      setSaveMessage({ type: 'error', text: '请填写用户名和密码' });
      return;
    }
    
    try {
      if (currentUser.role === 'admin') {
        await authAPI.createAgent(newAccountForm);
        setSaveMessage({ type: 'success', text: '代理商账户创建成功' });
      } else if (currentUser.role === 'agent') {
        await authAPI.createCustomer(newAccountForm);
        setSaveMessage({ type: 'success', text: '客户账户创建成功' });
      }
      
      // 刷新子账户列表
      const accounts = await authAPI.getMyAccounts();
      setSubAccounts(accounts);
      
      // 重置表单
      setNewAccountForm({ username: '', email: '', phone: '', password: '' });
      setIsCreatingAccount(false);
      
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      setSaveMessage({ type: 'error', text: error.message || '创建账户失败' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setSaveMessage({ type: 'error', text: t('pages.personalCenter.errors.requireComplete') });
      return;
    }
    if (newPassword !== confirmPassword) {
      setSaveMessage({ type: 'error', text: t('pages.personalCenter.errors.passwordMismatch') });
      return;
    }
    if (newPassword.length < 6) {
      setSaveMessage({ type: 'error', text: t('pages.personalCenter.errors.passwordMinLength') });
      return;
    }

    setIsChangingPassword(true);
    try {
      await authAPI.changeMyPassword(oldPassword, newPassword);
      setSaveMessage({ type: 'success', text: t('pages.personalCenter.password.success') });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('pages.personalCenter.errors.passwordChangeFailed');
      setSaveMessage({ type: 'error', text: msg });
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const cardCls = adminCardCls(isDark);
  const toolbarBorder = adminToolbarBorder(isDark);
  const rowHoverCls = adminRowHoverCls(isDark);
  const inputCls = `w-full px-4 py-3 rounded-xl border text-sm ${
    isDark
      ? 'bg-zinc-800 border-zinc-700 text-white focus:border-[#E8553F]/50 focus:ring-2 focus:ring-[#E8553F]/20'
      : 'bg-white border-gray-200 text-slate-900 focus:border-[#E8553F]/50 focus:ring-2 focus:ring-[#E8553F]/20'
  }`;

  return (
    <div className={adminPageOuterCls(isDark)}>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className={ADMIN_PAGE_SHELL_CLS}>
          <div>
            <h1 className={adminTitleCls(isDark)}>{t('pages.personalCenter.pageTitle')}</h1>
            <p className={adminSubtitleCls(isDark)}>
              {t('pages.personalCenter.subtitle')}
              {currentUser?.role === 'admin' && t('pages.personalCenter.unlimitedPoints')}
              {currentUser?.role !== 'admin' && currentUser?.points != null && (
                <> · <Coins className="inline w-3.5 h-3.5" /> {t('pages.personalCenter.points', { count: currentUser.points })}</>
              )}
            </p>
          </div>

        {saveMessage && (
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium ${
              saveMessage.type === 'success'
                ? isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700'
                : isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-700'
            }`}
          >
            {saveMessage.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            {saveMessage.text}
          </div>
        )}

        {currentUser && (currentUser.role === 'admin' || currentUser.role === 'agent') && (
          <div className={`inline-flex rounded-lg border p-1 ${isDark ? 'border-zinc-700 bg-zinc-900/40' : 'border-gray-200 bg-white'}`}>
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors inline-flex items-center gap-1.5 ${
                activeTab === 'info'
                  ? 'bg-[#E8553F] text-white shadow-sm'
                  : isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserCircle className="w-4 h-4" />
              个人信息
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('accounts')}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors inline-flex items-center gap-1.5 ${
                activeTab === 'accounts'
                  ? 'bg-[#E8553F] text-white shadow-sm'
                  : isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              账户管理 ({subAccounts.length})
            </button>
          </div>
        )}

        {activeTab === 'accounts' && currentUser && currentUser.role === 'admin' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>管理您创建的代理商账户</p>
              <button
                type="button"
                onClick={() => setIsCreatingAccount(!isCreatingAccount)}
                className="btn-geo-primary shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                创建{currentUser.role === 'admin' ? '代理商' : '客户'}账户
              </button>
            </div>

            {isCreatingAccount && (
              <div className={`${cardCls} p-6`}>
                <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                  创建新{currentUser.role === 'admin' ? '代理商' : '客户'}账户
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                      用户名 *
                    </label>
                    <input
                      type="text"
                      value={newAccountForm.username}
                      onChange={(e) => setNewAccountForm({ ...newAccountForm, username: e.target.value })}
                      className={inputCls}
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
                      onChange={(e) => setNewAccountForm({ ...newAccountForm, email: e.target.value })}
                      className={inputCls}
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
                      onChange={(e) => setNewAccountForm({ ...newAccountForm, phone: e.target.value })}
                      className={inputCls}
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
                      onChange={(e) => setNewAccountForm({ ...newAccountForm, password: e.target.value })}
                      className={inputCls}
                      placeholder="请输入密码（至少6位）"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={handleCreateAccount} className="btn-geo-primary flex-1 px-4 py-2 text-sm font-semibold">
                      确认创建
                    </button>
                    <button type="button" onClick={() => setIsCreatingAccount(false)} className="btn-geo-secondary px-4 py-2 text-sm font-semibold">
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className={cardCls}>
              <div className={`px-5 py-4 border-b ${toolbarBorder}`}>
                <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                  已创建的账户 ({subAccounts.length})
                </h3>
              </div>
              <div className="p-5">
              {subAccounts.length === 0 ? (
                <p className={`text-sm text-center py-8 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  暂无创建的账户
                </p>
              ) : (
                <div className="space-y-3">
                  {subAccounts.map((account) => (
                    <div
                      key={account.id}
                      className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${rowHoverCls} ${
                        isDark ? 'border-zinc-700/80' : 'border-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                          {account.role === 'agent' ? (
                            <Shield className="w-5 h-5" />
                          ) : (
                            <UserCheck className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {account.username}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                            {getRoleName(account.role)} · {new Date(account.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          account.is_active
                            ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-50 text-green-600'
                            : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {account.is_active ? '活跃' : '已禁用'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'info' && (
          <div className={`${cardCls} p-6`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 rounded-xl ${isDark ? 'bg-zinc-800' : 'bg-[#FFF6F2]'}`}>
                <Lock className={`w-5 h-5 ${isDark ? 'text-[#E8553F]' : 'text-[#E8553F]'}`} />
              </div>
              <div>
                <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t('pages.personalCenter.password.title')}
                </h2>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                  {t('pages.personalCenter.password.subtitle')}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  {t('pages.personalCenter.password.old')}
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  disabled={isChangingPassword}
                  className={inputCls}
                  placeholder={t('pages.personalCenter.password.oldPlaceholder')}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  {t('pages.personalCenter.password.new')}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isChangingPassword}
                  className={inputCls}
                  placeholder={t('pages.personalCenter.password.newPlaceholder')}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  {t('pages.personalCenter.password.confirm')}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isChangingPassword}
                  className={inputCls}
                  placeholder={t('pages.personalCenter.password.confirmPlaceholder')}
                />
              </div>
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="btn-geo-primary w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {t('pages.personalCenter.password.submit')}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default PersonalCenter;
