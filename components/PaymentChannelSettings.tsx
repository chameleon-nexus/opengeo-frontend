import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Save } from 'lucide-react';
import { Theme } from '../types';
import { paymentChannelsAPI } from '../api/paymentChannels';
import {
  ADMIN_PAGE_SHELL_CLS,
  adminCardCls,
  adminLoadingCls,
  adminPageOuterCls,
  adminSubtitleCls,
  adminTitleCls,
} from '../utils/adminPageStyles';

interface Props {
  theme: Theme;
}

const PaymentChannelSettings: React.FC<Props> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifyUrl, setNotifyUrl] = useState('');
  const [publicApiBaseConfigured, setPublicApiBaseConfigured] = useState(true);
  const [publicApiBaseUrl, setPublicApiBaseUrl] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [mchId, setMchId] = useState('');
  const [appId, setAppId] = useState('');
  const [merchantSerialNo, setMerchantSerialNo] = useState('');
  const [wechatPublicKeyId, setWechatPublicKeyId] = useState('');
  const [apiV3Key, setApiV3Key] = useState('');
  const [privateKeyPem, setPrivateKeyPem] = useState('');
  const [wechatPublicKeyPem, setWechatPublicKeyPem] = useState('');
  const [testMsg, setTestMsg] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { channels, notifyUrl: nu, publicApiBaseConfigured: configured, publicApiBaseUrl: baseUrl } =
          await paymentChannelsAPI.get();
        setNotifyUrl(nu);
        setPublicApiBaseConfigured(configured);
        setPublicApiBaseUrl(baseUrl || '');
        const ch = channels[0];
        if (ch) {
          setEnabled(ch.enabled);
          setMchId(ch.mchId);
          setAppId(ch.appId);
          setMerchantSerialNo(ch.merchantSerialNo);
          setWechatPublicKeyId(ch.wechatPublicKeyId);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await paymentChannelsAPI.saveWechatNative({
        enabled,
        mchId,
        appId,
        merchantSerialNo,
        wechatPublicKeyId,
        apiV3Key: apiV3Key || undefined,
        privateKeyPem: privateKeyPem || undefined,
        wechatPublicKeyPem: wechatPublicKeyPem || undefined,
      });
      setApiV3Key('');
      setPrivateKeyPem('');
      setWechatPublicKeyPem('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      window.alert((e as Error).message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestMsg('');
    try {
      const r = await paymentChannelsAPI.testWechatNative();
      setTestMsg(r.ok ? `成功：${r.message}` : `失败：${r.message}`);
    } catch (e) {
      setTestMsg((e as Error).message || '测试失败');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className={adminLoadingCls(isDark)}>
        <Loader2 className="w-6 h-6 animate-spin opacity-60" />
      </div>
    );
  }

  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm ${
    isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-200'
  }`;
  const cardCls = adminCardCls(isDark);

  return (
    <div className={adminPageOuterCls(isDark)}>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className={ADMIN_PAGE_SHELL_CLS}>
          <div>
            <h1 className={adminTitleCls(isDark)}>支付配置（微信公钥模式）</h1>
            <p className={adminSubtitleCls(isDark)}>
              配置商户号、AppID、APIv3 密钥、商户私钥及微信支付公钥。Native 扫码与小程序 JSAPI 共用此配置。密钥留空表示不修改已有值。
            </p>
          </div>

        {publicApiBaseConfigured && notifyUrl ? (
          <div className={`${cardCls} p-4 text-sm`}>
            <div className="font-medium mb-1">回调 URL（填到微信商户平台）</div>
            <p className={`text-xs mb-2 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              域名来自 backend 环境变量 PUBLIC_API_BASE_URL（当前：{publicApiBaseUrl}）
            </p>
            <code className="break-all text-xs">{notifyUrl}</code>
          </div>
        ) : (
          <div className={`${cardCls} p-4 text-sm border-amber-500/50`}>
            <div className="font-medium text-amber-700 mb-1">未配置支付回调域名</div>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-amber-800'}`}>
              请在 backend 的 .env 或部署环境中设置 <code>PUBLIC_API_BASE_URL=https://你的API域名</code>（须为微信可访问的 HTTPS），重启 backend 后刷新本页。
            </p>
          </div>
        )}

        <div className={`${cardCls} p-6 space-y-4`}>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            启用微信支付
          </label>
          {!enabled && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              未勾选「启用微信支付」时，下单会失败或走 mock。参数填完后请务必勾选并保存。
            </p>
          )}
          <div>
            <label className="text-xs font-medium">商户号 mchid</label>
            <input className={inputCls} value={mchId} onChange={(e) => setMchId(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium">AppID</label>
            <input className={inputCls} value={appId} onChange={(e) => setAppId(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium">商户 API 证书序列号</label>
            <input className={inputCls} value={merchantSerialNo} onChange={(e) => setMerchantSerialNo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium">微信支付公钥 ID（Wechatpay-Serial）</label>
            <input className={inputCls} value={wechatPublicKeyId} onChange={(e) => setWechatPublicKeyId(e.target.value)} placeholder="PUB_KEY_ID_..." />
          </div>
          <div>
            <label className="text-xs font-medium">APIv3 密钥（32位，留空不修改）</label>
            <input className={inputCls} type="password" value={apiV3Key} onChange={(e) => setApiV3Key(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium">商户私钥 PEM（留空不修改）</label>
            <textarea
              className={`${inputCls} font-mono text-xs min-h-[120px]`}
              value={privateKeyPem}
              onChange={(e) => setPrivateKeyPem(e.target.value)}
              placeholder="-----BEGIN PRIVATE KEY-----"
            />
          </div>
          <div>
            <label className="text-xs font-medium">微信支付公钥 PEM（留空不修改）</label>
            <textarea
              className={`${inputCls} font-mono text-xs min-h-[120px]`}
              value={wechatPublicKeyPem}
              onChange={(e) => setWechatPublicKeyPem(e.target.value)}
              placeholder="-----BEGIN PUBLIC KEY-----"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-geo-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              保存
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className={`rounded-lg border px-4 py-2 text-sm ${isDark ? 'border-zinc-600' : 'border-slate-300'}`}
            >
              {testing ? '检测中…' : '检测配置'}
            </button>
          </div>
          {testMsg && <p className="text-sm text-[#E8553F]">{testMsg}</p>}
        </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentChannelSettings;
