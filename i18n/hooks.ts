import { useTranslation } from 'react-i18next';
import type { TFunction, i18n as I18nInstance } from 'i18next';
import { I18nNamespace } from './types';

export type RegisteredNamespace =
  | 'common'
  | 'menu'
  | 'login'
  | 'dashboard'
  | 'optimization'
  | 'settings'
  | 'admin'
  | 'knowledge'
  | 'semanticSeo'
  | 'extract'
  | 'generate'
  | 'publish'
  | 'report'
  | 'dataScreen'
  | 'merchant'
  | 'site'
  | 'conversation'
  | 'agent'
  | 'guides';

export function useModuleI18n<N extends RegisteredNamespace>(
  namespace: N,
): {
  t: TFunction<N>;
  i18n: I18nInstance;
} {
  const { t, i18n } = useTranslation<N>(namespace);
  return { t: t as TFunction<N>, i18n };
}

export { I18nNamespace };
