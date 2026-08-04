import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import { HelpCircle, Loader2, Trash2, RefreshCcw, ArrowLeft, Plus, ExternalLink } from 'lucide-react';
import { Theme, Brand } from '../types';
import {
  SOCIAL_ACCOUNTS_OAUTH_PLATFORM_KEY,
  SOCIAL_ACCOUNTS_FROM_OPTIMIZATION_WORKBENCH_KEY,
} from '../constants/socialAccountsNavigation';
import {
  connectPostizForm,
  deletePostizAccount,
  getPostizAccounts,
  getPostizOAuthUrl,
  getPostizProviders,
  syncPostizAccounts,
  type PostizCustomField,
  type PostizProvider,
  type PostizAccount,
} from '../api/postizPublish';
import { scrubInternalPublishTerms } from '../lib/userFacingMessage';
import { useModuleI18n } from '../i18n/hooks';

export interface SocialMediaAccountsHandle {
  /** App 顶栏「返回」：若消费则不再跳转信源库 Hub */
  handleGridHubBack: () => boolean;
}

interface SocialMediaAccountsProps {
  theme: Theme;
  currentBrand: Brand | null;
  /** 从优化工作台跳转来时顶栏返回的目标 */
  onReturnToOptimizationWorkbench?: () => void;
}

interface Platform {
  name: string;
  postizIdentifier: string;
  logo: string | React.ReactNode;
  color: string;
  isOther?: boolean;
}

const ICON_BASE = 'https://www.yixiaoer.cn/web/assets/';

/** 出海自媒体平台（logo 墙展示） */
const OVERSEAS_PLATFORMS: Platform[] = [
  { name: 'X', postizIdentifier: 'x', logo: `${ICON_BASE}twitter-CYILOEO8.png`, color: 'bg-black' },
  { name: 'LinkedIn', postizIdentifier: 'linkedin', logo: 'in', color: 'bg-[#0A66C2]' },
  { name: 'Facebook', postizIdentifier: 'facebook', logo: `${ICON_BASE}facebook-CuQHgEA4.png`, color: 'bg-[#1877F2]' },
  { name: 'Instagram', postizIdentifier: 'instagram', logo: `${ICON_BASE}instagram-x-rLlY7j.png`, color: 'bg-gradient-to-tr from-[#FFDC80] via-[#E1306C] to-[#833AB4]' },
  { name: 'Threads', postizIdentifier: 'threads', logo: '@', color: 'bg-black' },
  { name: 'TikTok', postizIdentifier: 'tiktok', logo: `${ICON_BASE}tiktok-CwwHhN8w.png`, color: 'bg-black' },
  { name: 'YouTube', postizIdentifier: 'youtube', logo: `${ICON_BASE}youtube-Bjll7K2X.png`, color: 'bg-[#FF0000]' },
  { name: 'Reddit', postizIdentifier: 'reddit', logo: 'R', color: 'bg-[#FF4500]' },
  { name: 'Pinterest', postizIdentifier: 'pinterest', logo: 'P', color: 'bg-[#E60023]' },
  { name: 'Mastodon', postizIdentifier: 'mastodon', logo: 'M', color: 'bg-[#6364FF]' },
  { name: 'Bluesky', postizIdentifier: 'bluesky', logo: 'B', color: 'bg-[#0085FF]' },
  { name: 'Medium', postizIdentifier: 'medium', logo: 'Me', color: 'bg-black' },
  { name: 'Dev.to', postizIdentifier: 'devto', logo: 'Dev', color: 'bg-black' },
  { name: 'Hashnode', postizIdentifier: 'hashnode', logo: 'H', color: 'bg-[#2962FF]' },
  { name: 'WordPress', postizIdentifier: 'wordpress', logo: 'WP', color: 'bg-[#21759B]' },
  { name: '其他账号', postizIdentifier: '', logo: `${ICON_BASE}other-CdowNtdX.png`, color: 'bg-transparent', isOther: true },
];

/** 表单绑号平台：providers 未加载时仍应进入填表页，而非误走 OAuth */
const STATIC_FORM_FIELDS: Record<string, PostizCustomField[]> = {
  bluesky: [
    { key: 'service', label: 'Service', type: 'text', defaultValue: 'https://bsky.social' },
    { key: 'identifier', label: 'Identifier / 用户名', type: 'text' },
    { key: 'password', label: 'App Password', type: 'password' },
  ],
  medium: [{ key: 'apiKey', label: 'Integration Token', type: 'password' }],
  devto: [{ key: 'apiKey', label: 'API Key', type: 'password' }],
  hashnode: [{ key: 'apiKey', label: 'Personal Access Token', type: 'password' }],
  wordpress: [
    { key: 'url', label: '站点 URL', type: 'text' },
    { key: 'username', label: '用户名', type: 'text' },
    { key: 'password', label: '应用密码', type: 'password' },
  ],
};

function resolveFormFields(identifier: string, fromApi?: PostizCustomField[]): PostizCustomField[] | undefined {
  if (fromApi?.length) return fromApi;
  return STATIC_FORM_FIELDS[identifier];
}

function isFormConnectPlatform(platform: { postizIdentifier: string; customFields?: PostizCustomField[] }): boolean {
  return Boolean(resolveFormFields(platform.postizIdentifier, platform.customFields)?.length);
}

const SocialMediaAccounts = forwardRef<SocialMediaAccountsHandle, SocialMediaAccountsProps>(
  ({ theme, currentBrand: _currentBrand, onReturnToOptimizationWorkbench }, ref) => {
    const { t } = useModuleI18n('publish');
    const isDark = theme === 'dark';
    const [view, setView] = useState<'add' | 'list' | 'form' | 'oauth'>('add');
    const [initialized, setInitialized] = useState(false);
    const [fromOptimizationWorkbench, setFromOptimizationWorkbench] = useState(false);
    const pendingOAuthPlatformRef = useRef<string | null>(null);
    const [providers, setProviders] = useState<PostizProvider[]>([]);
    const [accounts, setAccounts] = useState<PostizAccount[]>([]);
    const [accountsLoading, setAccountsLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState<(Platform & { customFields?: PostizCustomField[] }) | null>(null);
    const [formValues, setFormValues] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [oauthLoading, setOauthLoading] = useState(false);
    const [pageNotice, setPageNotice] = useState<string | null>(null);

    const loadProviders = useCallback(async () => {
      try {
        const list = await getPostizProviders();
        setProviders(list);
        setPageNotice(null);
      } catch (e) {
        setProviders([]);
        const msg = e instanceof Error ? e.message : '';
        setPageNotice(msg ? scrubInternalPublishTerms(msg) : t('socialMediaAccounts.serviceUnavailable'));
      }
    }, []);

    const loadAccounts = useCallback(async () => {
      setAccountsLoading(true);
      try {
        const list = await getPostizAccounts();
        setAccounts(list);
        return list;
      } catch {
        setAccounts([]);
        return [];
      } finally {
        setAccountsLoading(false);
      }
    }, []);

    useEffect(() => {
      void loadProviders();
    }, [loadProviders]);

    /** 首次进入：无账号 → logo 墙；有账号 → 列表；工作台/指定平台跳转 → logo 墙或绑号 */
    useEffect(() => {
      let cancelled = false;
      (async () => {
        let oauthPlatform: string | null = null;
        let fromWorkbench = false;
        try {
          if (sessionStorage.getItem(SOCIAL_ACCOUNTS_FROM_OPTIMIZATION_WORKBENCH_KEY) === '1') {
            sessionStorage.removeItem(SOCIAL_ACCOUNTS_FROM_OPTIMIZATION_WORKBENCH_KEY);
            fromWorkbench = true;
            if (!cancelled) setFromOptimizationWorkbench(true);
          }
          oauthPlatform = sessionStorage.getItem(SOCIAL_ACCOUNTS_OAUTH_PLATFORM_KEY);
          if (oauthPlatform?.trim()) {
            sessionStorage.removeItem(SOCIAL_ACCOUNTS_OAUTH_PLATFORM_KEY);
            pendingOAuthPlatformRef.current = oauthPlatform.trim();
          }
        } catch {
          /* ignore */
        }

        const list = await loadAccounts();
        if (cancelled) return;

        if (pendingOAuthPlatformRef.current || fromWorkbench) {
          setView('add');
        } else if (list.length > 0) {
          setView('list');
        } else {
          setView('add');
        }
        setInitialized(true);
      })();
      return () => {
        cancelled = true;
      };
    }, [loadAccounts]);

    const displayPlatforms = useMemo(() => {
      const providerMap = new Map(providers.map((p) => [p.identifier, p]));
      return OVERSEAS_PLATFORMS.filter((p) => !p.isOther)
        .map((p) => {
          const prov = providerMap.get(p.postizIdentifier);
          const logo =
            prov?.picture && (prov.picture.startsWith('http://') || prov.picture.startsWith('https://'))
              ? prov.picture
              : p.logo;
          const customFields = resolveFormFields(p.postizIdentifier, prov?.customFields);
          return {
            ...p,
            name: prov?.name?.trim() || p.name,
            logo,
            customFields,
          };
        })
        .filter((p) => providers.length === 0 || providerMap.has(p.postizIdentifier));
    }, [providers]);

    const startPostizOAuth = async (platform: Platform & { customFields?: PostizCustomField[] }) => {
      setOauthLoading(true);
      setPageNotice(null);
      try {
        const url = await getPostizOAuthUrl(platform.postizIdentifier);
        const w = window.open(url, '_blank', 'width=600,height=700');
        if (!w) {
          setPageNotice(t('socialMediaAccounts.allowPopup'));
          setOauthLoading(false);
          return;
        }
        const timer = window.setInterval(async () => {
          if (w.closed) {
            window.clearInterval(timer);
            setOauthLoading(false);
            const list = await loadAccounts();
            setSelectedPlatform(null);
            setView(list.length > 0 ? 'list' : 'add');
          }
        }, 800);
      } catch (e) {
        setOauthLoading(false);
        const msg = e instanceof Error ? e.message : t('socialMediaAccounts.oauthUrlFailed');
        setPageNotice(scrubInternalPublishTerms(msg));
      }
    };

    const openFormConnect = (platform: Platform & { customFields?: PostizCustomField[] }) => {
      const fields = resolveFormFields(platform.postizIdentifier, platform.customFields);
      if (!fields?.length) return;
      setSelectedPlatform({ ...platform, customFields: fields });
      const init: Record<string, string> = {};
      for (const f of fields) {
        init[f.key] = f.defaultValue ?? '';
      }
      setFormValues(init);
      setFormError(null);
      setPageNotice(null);
      setView('form');
    };

    const openOAuthConnect = (platform: Platform & { customFields?: PostizCustomField[] }) => {
      setSelectedPlatform(platform);
      setPageNotice(null);
      setView('oauth');
    };

    const handlePlatformClick = (platform: Platform & { customFields?: PostizCustomField[] }) => {
      if (isFormConnectPlatform(platform)) {
        openFormConnect(platform);
      } else {
        openOAuthConnect(platform);
      }
    };

    /** 工作台带平台参数跳入：providers 就绪后自动打开对应绑号流程 */
    useEffect(() => {
      const key = pendingOAuthPlatformRef.current;
      if (!key || displayPlatforms.length === 0) return;
      pendingOAuthPlatformRef.current = null;
      const platform =
        displayPlatforms.find((p) => p.name === key || p.postizIdentifier === key) ||
        OVERSEAS_PLATFORMS.find((p) => p.name === key || p.postizIdentifier === key);
      if (platform?.postizIdentifier) handlePlatformClick(platform);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- 一次性跳转参数
    }, [displayPlatforms]);

    useImperativeHandle(
      ref,
      () => ({
        handleGridHubBack: () => {
          if (fromOptimizationWorkbench) {
            onReturnToOptimizationWorkbench?.();
            setFromOptimizationWorkbench(false);
            return true;
          }
          if (view === 'form' || view === 'oauth') {
            setView('add');
            setSelectedPlatform(null);
            setPageNotice(null);
            return true;
          }
          if (view === 'add' && accounts.length > 0) {
            setView('list');
            return true;
          }
          return false;
        },
      }),
      [accounts.length, fromOptimizationWorkbench, onReturnToOptimizationWorkbench, view],
    );

    const validateField = (field: PostizCustomField, value: string): boolean => {
      if (!field.validation) return value.trim().length > 0;
      try {
        const re = new RegExp(field.validation.replace(/^\/|\/$/g, ''));
        return re.test(value);
      } catch {
        return value.trim().length > 0;
      }
    };

    const submitFormConnect = async () => {
      if (!selectedPlatform?.postizIdentifier) return;
      for (const f of selectedPlatform.customFields || []) {
        if (!validateField(f, formValues[f.key] ?? '')) {
          setFormError(t('socialMediaAccounts.invalidField', { label: f.label }));
          return;
        }
      }
      setSubmitting(true);
      setFormError(null);
      try {
        await connectPostizForm(selectedPlatform.postizIdentifier, formValues);
        const list = await loadAccounts();
        setView(list.length > 0 ? 'list' : 'add');
        setSelectedPlatform(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : t('socialMediaAccounts.bindFailed');
        setFormError(scrubInternalPublishTerms(msg));
      } finally {
        setSubmitting(false);
      }
    };

    const handleSync = async () => {
      setSyncing(true);
      try {
        const list = await syncPostizAccounts();
        setAccounts(list);
        if (list.length === 0) setView('add');
      } catch (e) {
        alert(scrubInternalPublishTerms(e instanceof Error ? e.message : t('socialMediaAccounts.syncFailed')));
      } finally {
        setSyncing(false);
      }
    };

    const handleDelete = async (id: number) => {
      if (!window.confirm(t('socialMediaAccounts.confirmDelete'))) return;
      try {
        await deletePostizAccount(id);
        const list = await loadAccounts();
        if (list.length === 0) setView('add');
      } catch (e) {
        alert(scrubInternalPublishTerms(e instanceof Error ? e.message : t('socialMediaAccounts.deleteFailed')));
      }
    };

    const renderLogo = (platform: Platform) => {
      if (
        typeof platform.logo === 'string' &&
        (platform.logo.startsWith('http://') || platform.logo.startsWith('https://'))
      ) {
        return <img src={platform.logo} alt={platform.name} className="w-full h-full object-contain p-1.5" />;
      }
      if (typeof platform.logo === 'string') {
        return (
          <span className={`font-semibold tracking-tighter text-white ${platform.logo.length > 2 ? 'text-xs' : 'text-xl'}`}>
            {platform.logo}
          </span>
        );
      }
      return platform.logo;
    };

    if (!initialized) {
      return (
        <div className={`flex-1 flex items-center justify-center h-full ${isDark ? 'bg-geo-bg' : 'bg-[#F5F5F7]'}`}>
          <Loader2 className="w-8 h-8 animate-spin text-[#E8553F]" />
        </div>
      );
    }

    const renderNotice = (text: string, tone: 'amber' | 'red' = 'amber') => {
      const cls =
        tone === 'red'
          ? isDark
            ? 'border-red-500/30 bg-red-500/10 text-red-300'
            : 'border-red-200 bg-red-50 text-red-700'
          : isDark
            ? 'border-amber-900/50 bg-amber-950/40 text-amber-100'
            : 'border-amber-200 bg-amber-50 text-amber-900';
      return <div className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${cls}`}>{text}</div>;
    };

    const connectShellCls = `min-h-0 flex-1 overflow-y-auto no-scrollbar transition-colors duration-500 ${isDark ? 'bg-geo-bg text-white' : 'bg-[#F5F5F7] text-slate-900'}`;
    const connectInnerCls = 'max-w-7xl mx-auto px-6 py-8 space-y-6';
    const connectCardCls = `rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-zinc-900/40 border-zinc-700' : 'bg-white border-gray-200'}`;

    if (view === 'form' && selectedPlatform) {
      return (
        <div className={connectShellCls}>
          <div className={connectInnerCls}>
            <button
              type="button"
              onClick={() => {
                setView(accounts.length > 0 ? 'list' : 'add');
                setSelectedPlatform(null);
              }}
              className={`inline-flex items-center gap-2 text-sm font-medium ${isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-500 hover:text-[#E8553F]'}`}
            >
              <ArrowLeft className="w-4 h-4" /> {t('socialMediaAccounts.back')}
            </button>
            <div>
              <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('socialMediaAccounts.formTitle', { platform: selectedPlatform.name })}
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                {t('socialMediaAccounts.formSubtitle')}
              </p>
            </div>
            {pageNotice ? renderNotice(pageNotice) : null}
            {formError ? renderNotice(formError, 'red') : null}
            <section className={connectCardCls}>
              <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-700/80">
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('socialMediaAccounts.credentials')}</h3>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
                  {(selectedPlatform.customFields || []).map((f) => (
                    <label
                      key={f.key}
                      className={`block text-sm ${f.key === 'password' || f.key === 'url' || f.key === 'service' ? 'md:col-span-2' : ''}`}
                    >
                      <span className={`font-medium ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>{f.label}</span>
                      <input
                        type={f.type === 'password' ? 'password' : 'text'}
                        value={formValues[f.key] ?? ''}
                        onChange={(e) => setFormValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                        className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm ${
                          isDark ? 'border-zinc-700 bg-zinc-900' : 'border-gray-200 bg-white'
                        }`}
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void submitFormConnect()}
                    className="btn-geo-primary text-sm"
                  >
                    {submitting ? t('socialMediaAccounts.binding') : t('socialMediaAccounts.confirmBind')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setView(accounts.length > 0 ? 'list' : 'add');
                      setSelectedPlatform(null);
                    }}
                    className="btn-geo-secondary text-sm"
                  >
                    {t('socialMediaAccounts.cancel')}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      );
    }

    if (view === 'oauth' && selectedPlatform) {
      return (
        <div className={connectShellCls}>
          <div className={connectInnerCls}>
            <button
              type="button"
              onClick={() => {
                setView(accounts.length > 0 ? 'list' : 'add');
                setSelectedPlatform(null);
                setPageNotice(null);
              }}
              className={`inline-flex items-center gap-2 text-sm font-medium ${isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-500 hover:text-[#E8553F]'}`}
            >
              <ArrowLeft className="w-4 h-4" /> {t('socialMediaAccounts.back')}
            </button>
            <div>
              <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('socialMediaAccounts.oauthTitle', { platform: selectedPlatform.name })}
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                {t('socialMediaAccounts.oauthSubtitle')}
              </p>
            </div>
            {pageNotice ? renderNotice(pageNotice, 'red') : null}
            <section className={connectCardCls}>
              <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-700/80">
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('socialMediaAccounts.oauthSteps')}</h3>
              </div>
              <div className="p-5 space-y-6">
                <ol className={`text-sm space-y-2 list-decimal pl-5 max-w-3xl ${isDark ? 'text-zinc-300' : 'text-gray-600'}`}>
                  <li>{t('socialMediaAccounts.oauthStep1')}</li>
                  <li>{t('socialMediaAccounts.oauthStep2')}</li>
                  <li>{t('socialMediaAccounts.oauthStep3')}</li>
                </ol>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={oauthLoading}
                    onClick={() => void startPostizOAuth(selectedPlatform)}
                    className="btn-geo-primary inline-flex items-center gap-2 text-sm"
                  >
                    {oauthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                    {oauthLoading ? t('socialMediaAccounts.waitingOAuth') : t('socialMediaAccounts.goAuthorize')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setView(accounts.length > 0 ? 'list' : 'add');
                      setSelectedPlatform(null);
                    }}
                    className="btn-geo-secondary text-sm"
                  >
                    {t('socialMediaAccounts.cancel')}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      );
    }

    const renderAddView = () => (
      <div className={connectShellCls}>
        <div className={`${connectInnerCls} lg:py-10`}>
          {accounts.length > 0 ? (
            <button
              type="button"
              onClick={() => setView('list')}
              className={`inline-flex items-center gap-2 text-sm font-medium ${isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-500 hover:text-[#E8553F]'}`}
            >
              <ArrowLeft className="w-4 h-4" /> {t('socialMediaAccounts.backToList')}
            </button>
          ) : null}

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">{t('socialMediaAccounts.addTitle')}</h2>
              <HelpCircle className="w-4 h-4 text-zinc-300 cursor-pointer hover:text-zinc-500 transition-colors" />
            </div>
            <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
              {t('socialMediaAccounts.addSubtitle')}
            </p>
          </div>

          {pageNotice ? renderNotice(pageNotice) : null}

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-9 gap-x-4 gap-y-12">
            {displayPlatforms.map((platform) => (
              <div
                key={platform.postizIdentifier}
                role="button"
                tabIndex={0}
                onClick={() => handlePlatformClick(platform)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handlePlatformClick(platform);
                  }
                }}
                className="flex flex-col items-center gap-3 select-none group cursor-pointer"
              >
                <div className="relative">
                  <div
                    className={`w-14 h-14 md:w-16 md:h-16 rounded-[1.2rem] flex items-center justify-center overflow-hidden shadow-md transition-all duration-300
                    group-hover:scale-110 group-hover:-translate-y-1 group-active:scale-95
                    ${platform.isOther ? 'border-2 border-slate-900 border-dashed text-slate-900 bg-white' : platform.color}
                  `}
                  >
                    {renderLogo(platform)}
                  </div>
                  {platform.isOther && (
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full">
                      <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                  )}
                </div>
                <span
                  className={`text-sm font-medium text-center transition-opacity ${isDark ? 'text-zinc-400' : 'text-slate-600'} group-hover:opacity-100`}
                >
                  {platform.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    const renderListView = () => (
      <div className={connectShellCls}>
        <div className={connectInnerCls}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('socialMediaAccounts.pageTitle')}</h2>
                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-800 ring-1 ring-teal-200/80">
                  {t('socialMediaAccounts.overseasBadge')}
                </span>
              </div>
              <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{t('socialMediaAccounts.pageSubtitle')}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSync()}
                disabled={syncing}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  isDark ? 'border-zinc-700 hover:bg-zinc-800' : 'border-gray-200 bg-white hover:bg-[#FFF6F2]'
                }`}
              >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                {t('socialMediaAccounts.sync')}
              </button>
              <button
                type="button"
                onClick={() => setView('add')}
                className="btn-geo-primary inline-flex items-center gap-1.5 text-sm"
              >
                <Plus className="w-4 h-4" /> {t('socialMediaAccounts.addAccount')}
              </button>
            </div>
          </div>

          {accountsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#E8553F]" />
            </div>
          ) : (
            <ul className={`rounded-2xl border overflow-hidden shadow-sm divide-y ${isDark ? 'border-zinc-700 divide-zinc-800 bg-zinc-900/40' : 'border-gray-200 divide-gray-100 bg-white'}`}>
              {accounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {a.avatar_url ? (
                      <img src={a.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-zinc-700' : 'bg-gray-100 text-[#E8553F]'}`}>
                        {(a.displayName || a.platform || '?')[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{a.displayName || a.nickname || a.platform}</p>
                      <p className={`text-xs truncate ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                        {a.postizIdentifier || a.platform}
                        {a.authorized ? t('socialMediaAccounts.authorized') : t('socialMediaAccounts.unauthorized')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(a.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                    title={t('socialMediaAccounts.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );

    if (view === 'list' && accounts.length > 0) return renderListView();
    return renderAddView();
  },
);

SocialMediaAccounts.displayName = 'SocialMediaAccounts';

export default SocialMediaAccounts;
