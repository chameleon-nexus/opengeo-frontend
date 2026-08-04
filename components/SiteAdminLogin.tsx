import React, { useState } from 'react';
import { ArrowRight, Lock, User, AlertCircle, Globe } from 'lucide-react';
import { authAPI } from '../api/auth';
import { UserRole } from '../types';
import { clearAuthSession } from '../lib/authSession';

interface SiteAdminLoginProps {
  onLoginSuccess: (username: string) => void;
}

const FEATURES = [
  '管理本商户下的全部站点',
  '维护站点内容与资讯',
];

const SiteAdminLogin: React.FC<SiteAdminLoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.login(username, password);
      const user = await authAPI.getCurrentUser();
      if (user.role !== UserRole.SITE_ADMIN) {
        clearAuthSession();
        authAPI.logout();
        setError('请使用站点管理员账号登录');
        setLoading(false);
        return;
      }
      onLoginSuccess(user.username);
    } catch (err: unknown) {
      setError((err as Error).message || '登录失败，请检查账号和密码');
      setLoading(false);
    }
  };

  const inputCls =
    'w-full h-[50px] rounded-lg pl-11 pr-4 text-base font-normal bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder:text-slate-400';

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center">
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: 'url(/login_bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.2) 100%)' }}
      />

      <div
        className="relative z-10 w-full max-w-[1100px] px-8 md:px-16 grid md:grid-cols-2 gap-16 items-center min-h-[560px]"
      >
        <div className="flex flex-col items-start gap-8">
          <img src="/logo.png" alt="站点管理" className="h-16 max-w-[280px] object-contain" />
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold mb-4">
              <Globe className="w-3.5 h-3.5" />
              站点管理后台
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-800 leading-tight">
              专注站点运营
              <br />
              简洁高效
            </h1>
            <p className="mt-3 text-slate-600 text-base">登录后查看与管理本商户站点列表。</p>
          </div>
          <div className="flex flex-col gap-3">
            {FEATURES.map((text) => (
              <div key={text} className="flex items-center gap-3 text-slate-700 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-[#E8553F] shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-[420px] bg-white/98 rounded-3xl p-10 shadow-xl border border-white/60">
            <div className="text-center mb-7">
              <h3 className="text-xl font-semibold text-slate-900">站点管理员登录</h3>
              <p className="text-sm text-slate-500 mt-1">仅限站点管理员账号</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">账号</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={inputCls}
                    placeholder="请输入用户名"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">密码</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls}
                    placeholder="请输入密码"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-red-50 text-red-600 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[50px] rounded-lg bg-gradient-coral text-white shadow-coral text-base font-medium hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    正在验证...
                  </>
                ) : (
                  <>
                    登 录
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteAdminLogin;
