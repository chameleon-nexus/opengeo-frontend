import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import zhLanding from '../data/zh/landing.json';
import enLanding from '../data/en/landing.json';
import zhPricing from '../data/zh/pricing.json';
import enPricing from '../data/en/pricing.json';
import type { LandingPageData } from '../types/landing';
import { resolveSupportedLanguage } from '../i18n/languages';

export function getLandingData(language?: string): LandingPageData {
  const lang = resolveSupportedLanguage(language);
  return (lang === 'en' ? enLanding : zhLanding) as LandingPageData;
}

export function getPricingData(language?: string) {
  const lang = resolveSupportedLanguage(language);
  return lang === 'en' ? enPricing : zhPricing;
}

export function useLandingData(): LandingPageData {
  const { i18n } = useTranslation();
  return useMemo(() => getLandingData(i18n.language), [i18n.language]);
}

export function usePricingData() {
  const { i18n } = useTranslation();
  return useMemo(() => getPricingData(i18n.language), [i18n.language]);
}
