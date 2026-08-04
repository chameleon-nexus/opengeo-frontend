
import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Hero as HeroType } from '../../types/landing';
import { Theme } from '../../types';
import { TypewriterHTML } from '../ui/Typewriter';
import SunoInput from '../ui/SunoInput';
import LogoCarousel from '../ui/LogoCarousel';

interface HeroProps {
  hero: HeroType;
  theme: Theme;
  onNavigate?: (page: 'home' | 'pricing') => void;
  onNavigateToLogin?: () => void;
  /** 仅展示标题与描述（子站公司介绍用） */
  minimal?: boolean;
  /** 背景图文字颜色（minimal 时优先使用，覆盖 theme） */
  heroTextColor?: 'white' | 'black';
}

const Hero: React.FC<HeroProps> = ({ hero, theme, onNavigate, onNavigateToLogin, minimal, heroTextColor }) => {
  const isLightText = heroTextColor ? (heroTextColor === 'white') : (theme === 'dark');
  const isDark = heroTextColor ? isLightText : (theme === 'dark');
  
  if (hero.disabled) {
    return null;
  }

  return (
    <section className={`py-12 sm:py-16 lg:py-24 relative ${isDark ? 'text-white' : 'text-slate-900'}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {!minimal && hero.announcement && (
            <div className={`mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full ${
              isDark 
                ? 'bg-geo-blue/20 text-blue-400 border border-geo-blue/30' 
                : 'bg-blue-50 text-blue-600 border border-blue-200'
            }`}>
              <span className="text-xs font-semibold">{hero.announcement.label}</span>
              <span className="text-xs">{hero.announcement.title}</span>
            </div>
          )}

          <h1 className={`mx-auto mb-8 sm:mb-12 lg:mb-16 mt-4 max-w-4xl text-balance text-3xl sm:text-4xl lg:text-5xl xl:text-7xl font-semibold leading-tight ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            {minimal ? (
              <span dangerouslySetInnerHTML={{ __html: hero.title || '' }} />
            ) : (
              <TypewriterHTML 
                html={hero.title || ""} 
                speed={80} 
                delay={500}
                className="inline"
              />
            )}
          </h1>

          {hero.description && (
            <p 
              className={`mx-auto mb-8 sm:mb-12 max-w-3xl text-base sm:text-lg lg:text-xl px-4 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
              dangerouslySetInnerHTML={{ __html: hero.description }}
            />
          )}
          
          {!minimal && (
            <>
              <div className="mx-auto mb-8 sm:mb-12 max-w-2xl px-4">
                <SunoInput 
                  placeholder={hero.input_placeholder || "输入您的关键词..."}
                  buttonText={hero.input_button_text || "开始优化"}
                  theme={theme}
                  onSubmit={() => {
                    if (onNavigateToLogin) {
                      onNavigateToLogin();
                    }
                  }}
                />
              </div>
              <LogoCarousel theme={theme} />
            </>
          )}

          {!minimal && hero.buttons && (
            <div className="mt-8 sm:mt-12 flex flex-col justify-center gap-3 sm:gap-4 sm:flex-row px-4">
              {hero.buttons.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    // 所有按钮都跳转到登录页
                    if (onNavigateToLogin) {
                      onNavigateToLogin();
                    } else if (item.url === '/pricing' && onNavigate) {
                      onNavigate('pricing');
                    }
                  }}
                  className={`flex items-center justify-center gap-2 w-full sm:w-auto min-h-[48px] sm:min-h-[44px] px-6 sm:px-8 text-base rounded-xl font-bold transition-all ${
                    item.variant === 'default'
                      ? (isDark 
                          ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' 
                          : 'bg-gradient-coral text-white shadow-coral hover:opacity-95')
                      : (isDark 
                          ? 'bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700' 
                          : 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50')
                  }`}
                >
                  {item.title}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ))}
            </div>
          )}

          {!minimal && hero.tip && (
            <p className={`mt-8 text-sm ${
              isDark ? 'text-zinc-400' : 'text-slate-500'
            }`}>
              {hero.tip}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default Hero;
