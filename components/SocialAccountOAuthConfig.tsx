import React, { useState, useEffect } from 'react';
import { ExternalLink, Save, Loader2 } from 'lucide-react';
import { Theme } from '../types';
import { getOAuthConfig, saveOAuthConfig, getOAuthAuthUrl, type OAuth2ConfigForm } from '../api/publish';
import { getApiBaseUrl } from '../api/client';

const defaultForm: OAuth2ConfigForm = {
  clientId: '',
  clientSecret: '',
  authorizationUrl: '',
  tokenUrl: '',
  redirectUri: '',
  scope: '',
};

/** 各平台 OAuth 可自动填充的默认值 */
function getPlatformDefaults(platformName: string): Partial<OAuth2ConfigForm> {
  const apiBase = getApiBaseUrl();
  const redirectUri = apiBase ? `${apiBase}/api/publish/oauth/callback` : '';

  const map: Record<string, Partial<OAuth2ConfigForm>> = {
    '网易号': {
      authorizationUrl: 'https://mp.163.com/oauth2/authorize',
      tokenUrl: 'https://mp.163.com/oauth2/access_token',
      redirectUri,
    },
    '百家号': {
      authorizationUrl: 'https://oauth.baidu.com/authorize',
      tokenUrl: 'https://oauth.baidu.com/token',
      redirectUri,
    },
    '头条号': {
      authorizationUrl: 'https://mp.toutiao.com/oauth2/authorize',
      tokenUrl: 'https://mp.toutiao.com/oauth2/access_token',
      redirectUri,
    },
    '知乎': {
      authorizationUrl: 'https://www.zhihu.com/oauth/authorize',
      tokenUrl: 'https://www.zhihu.com/oauth/token',
      redirectUri,
    },
    '新浪微博': {
      authorizationUrl: 'https://api.weibo.com/oauth2/authorize',
      tokenUrl: 'https://api.weibo.com/oauth2/access_token',
      redirectUri,
    },
    '哔哩哔哩': {
      authorizationUrl: 'https://passport.bilibili.com/oauth2/authorize',
      tokenUrl: 'https://passport.bilibili.com/oauth2/access_token',
      redirectUri,
    },
    '小红书': {
      authorizationUrl: 'https://open.xiaohongshu.com/oauth',
      tokenUrl: 'https://api.xiaohongshu.com/oauth/access_token',
      redirectUri,
    },
    '微信公众号': {
      authorizationUrl: 'https://open.weixin.qq.com/connect/oauth2/authorize',
      tokenUrl: 'https://api.weixin.qq.com/sns/oauth2/access_token',
      redirectUri,
    },
  };
  return map[platformName] ?? { redirectUri: redirectUri || undefined };
}

interface SocialAccountOAuthConfigProps {
  theme: Theme;
  platformName: string;
}

const SocialAccountOAuthConfig: React.FC<SocialAccountOAuthConfigProps> = ({
  theme,
  platformName,
}) => {
  const isDark = theme === 'dark';
  const [form, setForm] = useState<OAuth2ConfigForm>(defaultForm);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const defaults = getPlatformDefaults(platformName);
    (async () => {
      setLoading(true);
      try {
        const config = await getOAuthConfig(platformName);
        if (!cancelled) {
          const merged = { ...defaultForm, ...defaults };
          if (config) {
            Object.assign(merged, config);
          }
          setForm(merged);
        }
      } catch {
        if (!cancelled) {
          setForm({ ...defaultForm, ...defaults });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [platformName]);

  const update = (field: keyof OAuth2ConfigForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaved(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaveError(null);
    try {
      await saveOAuthConfig(platformName, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('保存 OAuth2 配置失败', e);
      setSaveError((e as Error)?.message || '保存失败');
    }
  };

  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [authUrlLoading, setAuthUrlLoading] = useState(false);

  useEffect(() => {
    if (!form.clientId || !form.authorizationUrl || !form.redirectUri) {
      setAuthUrl(null);
      return;
    }
    let cancelled = false;
    setAuthUrlLoading(true);
    getOAuthAuthUrl(platformName)
      .then((url) => {
        if (!cancelled && url) setAuthUrl(url);
        else if (!cancelled) setAuthUrl(null);
      })
      .catch(() => {
        if (!cancelled) setAuthUrl(null);
      })
      .finally(() => {
        if (!cancelled) setAuthUrlLoading(false);
      });
    return () => { cancelled = true; };
  }, [platformName, form.clientId, form.authorizationUrl, form.redirectUri]);

  const labelClass = `block text-xs font-semibold  mb-4 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`;
  const inputClass = `w-full px-4 py-3 rounded-xl border outline-none transition-all font-medium
    ${isDark ? 'bg-black/30 border-geo-border text-white placeholder:text-geo-text-sec/50 focus:border-geo-blue' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500'}`;
  const readOnlyInputClass = `w-full px-4 py-3 rounded-xl border outline-none cursor-default select-text
    ${isDark ? 'bg-zinc-800/50 border-geo-border text-geo-text-sec' : 'bg-slate-100 border-slate-200 text-slate-600'}`;

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500 font-sans">
      <div className={`p-8 lg:p-12 rounded-2xl border shadow-sm flex flex-col transition-colors min-h-fit ${isDark ? 'bg-geo-card border-geo-border' : 'bg-white border-slate-100'}`}>
        {/* 页头：单独一块，整页左对齐 */}
        <div className="w-full space-y-4 text-left animate-in zoom-in-95 duration-700 mb-12">
          <div className="flex items-center gap-4">
            <h3 className={`text-3xl font-semibold tracking-tight ${isDark ? 'text-geo-text-main' : 'text-slate-900'}`}>
              OAuth2 账号授权配置
            </h3>
          </div>
          <p className={`text-sm font-bold opacity-50 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>
            {platformName} · 填写开放平台应用信息后前往授权
          </p>
        </div>

        {/* 下方卡片与按钮：居中 */}
        <div className="w-full flex flex-col items-center">
          <div className="w-full max-w-xl space-y-12 text-left">
          {loading ? (
            <div className={`flex items-center justify-center gap-2 py-12 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>
              <Loader2 className="w-5 h-5 animate-spin" /> 加载配置中…
            </div>
          ) : (
          <>
          {/* 所有输入框包裹在一个卡片背景内 */}
          <div className={`w-full text-left p-6 rounded-2xl border animate-in slide-in-from-top-4 duration-300 ${isDark ? 'bg-geo-bg border-geo-border' : 'bg-slate-50 border-slate-200'}`}>
            <div className="space-y-6">
              <div>
                <label className={labelClass}>应用 ID (Client ID)</label>
                <input
                  type="text"
                  value={form.clientId}
                  onChange={e => update('clientId', e.target.value)}
                  placeholder="从开放平台获取的 Client ID"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>应用密钥 (Client Secret)</label>
                <input
                  type="password"
                  value={form.clientSecret}
                  onChange={e => update('clientSecret', e.target.value)}
                  placeholder="从开放平台获取的 Client Secret"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>授权地址 (Authorization URL)</label>
                <input
                  type="url"
                  value={form.authorizationUrl}
                  readOnly
                  placeholder="系统自动填充"
                  className={readOnlyInputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Token 地址 (Token URL)</label>
                <input
                  type="url"
                  value={form.tokenUrl}
                  readOnly
                  placeholder="系统自动填充"
                  className={readOnlyInputClass}
                />
              </div>
              <div>
                <label className={labelClass}>回调地址 (Redirect URI)</label>
                <input
                  type="url"
                  value={form.redirectUri}
                  readOnly
                  placeholder="系统自动填充"
                  className={readOnlyInputClass}
                />
                <p className={`text-xs font-bold opacity-40 mt-2 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>
                  以上三个地址由系统自动生成，请在网易等开放平台应用配置中填写相同的回调地址
                </p>
              </div>
              <div>
                <label className={labelClass}>授权范围 (Scope，可选)</label>
                <input
                  type="text"
                  value={form.scope}
                  onChange={e => update('scope', e.target.value)}
                  placeholder="如：user_info publish"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* 操作按钮：主按钮与「开始提炼」一致 */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handleSave}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 font-semibold text-sm  transition-all
                ${isDark ? 'border-geo-border bg-geo-bg text-geo-text-main hover:border-geo-text-sec' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}
              `}
            >
              <Save className="w-4 h-4" />
              保存配置
            </button>
            {saved && (
              <span className={`text-sm font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                已保存到服务器
              </span>
            )}
            {saveError && (
              <span className={`text-sm font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                {saveError}
              </span>
            )}
          </div>
          {authUrlLoading ? (
            <div className={`w-full py-5 rounded-2xl border-2 border-dashed text-center font-bold text-sm flex items-center justify-center gap-2 ${isDark ? 'border-geo-border text-geo-text-sec/60' : 'border-slate-200 text-slate-400'}`}>
              <Loader2 className="w-5 h-5 animate-spin" /> 生成授权链接…
            </div>
          ) : authUrl ? (
            <a
              href={authUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full py-5 rounded-2xl font-semibold text-sm  shadow-sm hover-scale transition-all flex items-center justify-center gap-3 ${isDark ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' : 'bg-gradient-coral text-white shadow-coral hover:opacity-95'}`}
            >
              <ExternalLink className="w-4 h-4" />
              前往授权
            </a>
          ) : (
            <div className={`py-5 rounded-2xl border-2 border-dashed text-center font-bold text-sm  ${isDark ? 'border-geo-border text-geo-text-sec/60' : 'border-slate-200 text-slate-400'}`}>
              请先保存配置，填写授权地址、应用 ID 和回调地址后再前往授权
            </div>
          )}

          <p className={`text-xs font-bold opacity-40 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>
            授权完成后将跳转回本系统并自动绑定账号。
          </p>
          </>
          )}
          </div>
          </div>
      </div>
    </div>
  );
};

export default SocialAccountOAuthConfig;
