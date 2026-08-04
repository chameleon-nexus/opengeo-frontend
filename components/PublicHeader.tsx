
import React from 'react';
import { Home, DollarSign, LogIn, BookOpen, LayoutDashboard, LayoutGrid } from 'lucide-react';
import { Theme } from '../types';
import GeoMenuLayer from './GeoMenuLayer';
import { useGeoMenu } from '../hooks/useGeoMenu';
import { useModuleI18n } from '../i18n/hooks';
import { LanguageSwitcher } from '../i18n/LanguageSwitcher';

interface PublicHeaderProps {
  theme: Theme;
  currentPage: 'home' | 'pricing' | 'blog' | 'privacy' | 'terms';
  onNavigate: (page: 'home' | 'pricing' | 'blog' | 'privacy' | 'terms') => void;
  onNavigateToLogin: () => void;
  isLoggedIn?: boolean;
  onNavigateToBackend?: () => void;
  /**
   * marketing：参考行业营销站顶栏（64px、浅蓝半透明、居中导航、紫 pill、渐变登录）
   * 默认：原珊瑚 GEO 顶栏样式
   */
  variant?: 'default' | 'marketing';
  /**
   * marketing 专用：为 true 时顶栏高亮「GEO」按钮，不将「首页」视为当前页（如信源分析子页）
   */
  marketingHighlightGeo?: boolean;
}

const PublicHeader: React.FC<PublicHeaderProps> = ({ 
  theme, 
  currentPage, 
  onNavigate, 
  onNavigateToLogin,
  isLoggedIn,
  onNavigateToBackend,
  variant = 'default',
  marketingHighlightGeo = false,
}) => {
  const { t } = useModuleI18n('login');
  const isDark = theme === 'dark';
  const marketing = variant === 'marketing' && !isDark;

  const { geoMenuOpen, openGeoMenu, scheduleCloseGeoMenu } = useGeoMenu();

  if (marketing) {
    const noopNav = (e: React.MouseEvent) => {
      e.preventDefault();
    };

    return (
      <header
        className="sticky top-0 z-50 overflow-visible border-b border-slate-200/70 bg-[#f8f9fb]/96"
        style={{ height: '64px' }}
      >
        <div className="mx-auto grid h-full max-w-[1200px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:px-6 lg:px-8">
          <div
            onClick={() => onNavigate('home')}
            className="flex min-w-0 cursor-pointer items-center gap-1.5 sm:gap-2"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onNavigate('home')}
          >
            <img src="/logo.png" alt="" className="h-11 w-11 shrink-0 object-contain sm:h-12 sm:w-12" />
            <span className="truncate text-base font-bold tracking-tight text-[#1a1a1a] sm:text-lg">
              珊瑚
              <span
                className="text-[#1a1a1a]"
                onMouseEnter={openGeoMenu}
                onMouseLeave={scheduleCloseGeoMenu}
              >
                GEO
              </span>
            </span>
            <LayoutGrid className="hidden h-4 w-4 shrink-0 text-[#9ca3af] md:block" aria-hidden />
          </div>

          <nav className="hidden max-w-[min(100%,52rem)] items-center justify-center gap-0.5 overflow-x-auto md:flex lg:gap-1">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors lg:px-4 ${
                currentPage === 'home' && !marketingHighlightGeo
                  ? 'bg-[#E8553F] text-white shadow-sm'
                  : 'text-[#4b5563] hover:text-[#1a1a1a]'
              }`}
            >
              {t('header.home')}
            </button>
            <div
              className="relative shrink-0"
              onMouseEnter={openGeoMenu}
              onMouseLeave={scheduleCloseGeoMenu}
            >
              <div className="flex items-center gap-0.5 lg:gap-1">
                <button
                  type="button"
                  onClick={noopNav}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors lg:px-4 ${
                    marketingHighlightGeo
                      ? 'bg-[#E8553F] text-white shadow-sm'
                      : 'text-[#4b5563] hover:text-[#1a1a1a]'
                  }`}
                  aria-expanded={geoMenuOpen}
                  aria-haspopup="dialog"
                >
                  GEO
                </button>
                <a
                  href="/brand-diagnosis"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 rounded-full px-2 py-1.5 text-xs font-semibold tracking-tight text-[#4b5563] hover:text-[#1a1a1a] lg:px-3 lg:text-sm"
                  aria-expanded={geoMenuOpen}
                  aria-haspopup="dialog"
                >
                  OPENGEO
                </a>
              </div>
              <GeoMenuLayer
                open={geoMenuOpen}
                onMouseEnter={openGeoMenu}
                onMouseLeave={scheduleCloseGeoMenu}
              />
            </div>
            <a
              href="/blog"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-full px-2 py-1.5 text-xs font-semibold tracking-tight text-[#4b5563] hover:text-[#1a1a1a] lg:px-3 lg:text-sm"
            >
              OPENCLAW
            </a>
            <a
              href="/geo-lab"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-full px-2 py-1.5 text-sm font-medium text-[#4b5563] hover:text-[#1a1a1a] lg:px-3"
            >
              GEO实验室
            </a>
          </nav>

          <div className="flex justify-end">
            {isLoggedIn && onNavigateToBackend ? (
              <button
                type="button"
                onClick={onNavigateToBackend}
                className="rounded-full bg-gradient-to-r from-[#E8553F] to-[#FF9B85] px-3 py-2 text-xs font-semibold text-white shadow-md shadow-[#E8553F]/25 hover:opacity-95 sm:px-4 sm:text-sm"
              >
                {t('header.dashboard')}
              </button>
            ) : (
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="rounded-full bg-gradient-to-r from-[#E8553F] to-[#FF9B85] px-3 py-2 text-xs font-semibold text-white shadow-md shadow-[#E8553F]/25 hover:opacity-95 sm:px-4 sm:text-sm"
              >
                {t('header.login')}
              </button>
            )}
          </div>
          <LanguageSwitcher variant="compact" className="ml-2" />
        </div>
      </header>
    );
  }

  return (
    <header className={`sticky top-0 z-50 border-b backdrop-blur-md ${
      isDark 
        ? 'bg-zinc-900/60 border-white/10' 
        : 'bg-white/60 border-slate-200'
    }`}>
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div 
            onClick={() => onNavigate('home')}
            className="cursor-pointer flex items-center"
          >
            <img src="/logo.png" alt="珊瑚GEO" className="h-10 w-auto object-contain shrink-0" />
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            <button
              onClick={() => onNavigate('home')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                currentPage === 'home'
                  ? (isDark 
                      ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' 
                      : 'bg-gradient-coral text-white shadow-coral hover:opacity-95')
                  : (isDark 
                      ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
              }`}
            >
              <Home className="w-4 h-4" />
              {t('header.home')}
            </button>
            
            <button
              onClick={() => onNavigate('pricing')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                currentPage === 'pricing'
                  ? (isDark 
                      ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' 
                      : 'bg-gradient-coral text-white shadow-coral hover:opacity-95')
                  : (isDark 
                      ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
              }`}
            >
              <DollarSign className="w-4 h-4" />
              {t('header.pricing')}
            </button>

            <button
              onClick={() => onNavigate('blog')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                currentPage === 'blog'
                  ? (isDark 
                      ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' 
                      : 'bg-gradient-coral text-white shadow-coral hover:opacity-95')
                  : (isDark 
                      ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
              }`}
            >
              <BookOpen className="w-4 h-4" />
              {t('header.blog')}
            </button>

            {isLoggedIn && onNavigateToBackend ? (
              <button
                onClick={onNavigateToBackend}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  isDark 
                    ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                {t('header.dashboard')}
              </button>
            ) : (
              <button
                onClick={onNavigateToLogin}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  isDark 
                    ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LogIn className="w-4 h-4" />
                {t('header.login')}
              </button>
            )}
            <LanguageSwitcher variant="compact" />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default PublicHeader;
