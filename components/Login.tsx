
import React, { useState } from 'react';
import { ArrowRight, Lock, User, AlertCircle } from 'lucide-react';
import { Theme } from '../types';
import { authAPI } from '../api/auth';
import { useModuleI18n } from '../i18n/hooks';
import { LanguageSwitcher } from '../i18n/LanguageSwitcher';

interface LoginProps {
  onLogin: (username: string) => void;
  onNavigateToPrivacy?: () => void;
  onNavigateToTerms?: () => void;
  theme?: Theme;
}

const Login: React.FC<LoginProps> = ({ onLogin, onNavigateToPrivacy, onNavigateToTerms, theme = 'dark' }) => {
  const { t } = useModuleI18n('login');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const backgroundUrl = '/login_bg.jpg';

  const featureKeys = ['features.analysis', 'features.content', 'features.monitoring'] as const;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!agreed) {
      setError(t('errors.agreementRequired'));
      return;
    }
    setLoading(true);
    try {
      await authAPI.login(username, password);
      onLogin(username);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('errors.loginFailed');
      setError(message || t('errors.loginFailed'));
      setLoading(false);
    }
  };

  const inputCls = `w-full h-[50px] rounded-lg pl-11 pr-4 text-base font-normal
    bg-slate-50 border border-slate-200 text-slate-900
    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all
    placeholder:text-slate-400`;

  const labelCls = 'text-sm font-medium text-slate-700 mb-1.5 block';

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center">
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: `url(${backgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.15) 100%)' }}
      />

      <div
        className="relative z-10 w-full max-w-[1200px] px-8 md:px-16"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '100px', alignItems: 'center', minHeight: '600px' }}
      >
        <div className="flex flex-col items-start gap-10">
          <img
            src="/logo.png"
            alt="Coral GEO"
            className="h-20 max-w-[320px] object-contain"
          />

          <div>
            <h1
              style={{ fontSize: '46px', fontWeight: 300, lineHeight: 1.2, letterSpacing: '-0.02em', color: '#1f2937', margin: 0, marginBottom: '14px' }}
            >
              {t('heroTitle')}
              <br />
              {t('heroTitleLine2')}
            </h1>
            <h2
              style={{ fontSize: '22px', fontWeight: 300, lineHeight: 1.4, letterSpacing: '-0.01em', color: '#4b5563', margin: 0 }}
            >
              {t('heroSubtitle')}
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            {featureKeys.map((key) => (
              <div key={key} className="flex items-center gap-3" style={{ color: '#374151', fontSize: '15px' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                {t(key)}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center items-center">
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: 'rgba(255,255,255,0.98)',
              borderRadius: '24px',
              padding: '44px 36px',
              boxShadow: '0 32px 64px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="text-center mb-7">
              <h3 style={{ fontSize: '22px', fontWeight: 600, color: '#1f2937', margin: 0, marginBottom: '6px' }}>
                {t('welcome')}
              </h3>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                {t('welcomeHint')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={labelCls}>{t('form.username')}</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={inputCls}
                    placeholder={t('form.usernamePlaceholder')}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>{t('form.password')}</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls}
                    placeholder={t('form.passwordPlaceholder')}
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

              <div className="flex items-center gap-2.5 min-w-0">
                <input
                  type="checkbox"
                  id="agree-terms"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-4 h-4 shrink-0 rounded accent-blue-500 cursor-pointer"
                />
                <label
                  htmlFor="agree-terms"
                  className="text-xs text-slate-500 cursor-pointer whitespace-nowrap select-none"
                >
                  {t('agreement.prefix')}{' '}
                  <a
                    href="#"
                    className="text-blue-500 hover:text-blue-600"
                    onClick={(e) => { e.preventDefault(); onNavigateToPrivacy?.(); }}
                  >
                    {t('agreement.privacy')}
                  </a>
                  {' '}{t('agreement.and')}{' '}
                  <a
                    href="#"
                    className="text-blue-500 hover:text-blue-600"
                    onClick={(e) => { e.preventDefault(); onNavigateToTerms?.(); }}
                  >
                    {t('agreement.terms')}
                  </a>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !agreed}
                className="w-full h-[50px] rounded-lg bg-gradient-coral text-white shadow-coral text-base font-medium
                  hover:opacity-95 active:scale-[0.98] transition-all
                  flex items-center justify-center gap-2
                  disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('form.submitting')}
                  </>
                ) : (
                  <>
                    {t('form.submit')}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 z-10"
        style={{ height: '2px', background: 'linear-gradient(90deg, transparent 0%, #3B82F6 50%, transparent 100%)' }}
      />
    </div>
  );
};

export default Login;
