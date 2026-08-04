import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { changeAppLanguage } from './module-preload';
import { DEFAULT_LANGUAGE, PLATFORM_LANGUAGES, resolveSupportedLanguage, type SupportedLanguage } from './languages';
import { ModuleType } from '../types';

interface LanguageSwitcherProps {
  style?: React.CSSProperties;
  className?: string;
  activeModule?: ModuleType;
  variant?: 'default' | 'compact' | 'segmented';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  style,
  className = '',
  activeModule,
  variant = 'default',
}) => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentLang = resolveSupportedLanguage(i18n.language || DEFAULT_LANGUAGE);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }
    return undefined;
  }, [isOpen]);

  const handleLanguageChange = async (lang: SupportedLanguage) => {
    if (lang === currentLang) return;
    await changeAppLanguage(lang, activeModule);
    setIsOpen(false);
  };

  if (variant === 'segmented') {
    return (
      <div style={style} className={`flex items-center justify-between gap-3 ${className}`}>
        <span className="text-sm text-gray-600 shrink-0">
          {t('language.settings', { defaultValue: '语言设置' })}
        </span>
        <div className="flex rounded-lg bg-gray-100 p-0.5">
          {PLATFORM_LANGUAGES.map((language) => {
            const selected = currentLang === language.key;
            return (
              <button
                key={language.key}
                type="button"
                onClick={() => void handleLanguageChange(language.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  selected
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t(language.labelKey, { defaultValue: language.englishName })}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const btnClass =
    variant === 'compact'
      ? 'h-8 w-8 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50'
      : 'h-9 min-w-[2.25rem] rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50';

  return (
    <div ref={dropdownRef} style={style} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={btnClass}
        title={t('language.switch', { defaultValue: 'Switch language' })}
      >
        {currentLang.toUpperCase()}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-32 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {PLATFORM_LANGUAGES.map((language) => (
            <button
              key={language.key}
              type="button"
              onClick={() => void handleLanguageChange(language.key)}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-100 ${
                currentLang === language.key ? 'font-semibold text-slate-900' : 'text-slate-700'
              }`}
            >
              {t(language.labelKey, { defaultValue: language.englishName })}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
