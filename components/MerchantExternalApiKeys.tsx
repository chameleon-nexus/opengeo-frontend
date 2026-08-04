import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Key, ShieldCheck, Plus, Trash2, Copy, CheckCircle2 } from 'lucide-react';
import { Theme } from '../types';
import {
  listMyExternalKeys,
  createMyExternalKey,
  revokeMyExternalKey,
  type MerchantExternalKeyItem,
} from '../api/merchantExternalKeys';

interface MerchantExternalApiKeysProps {
  theme: Theme;
  onBack?: () => void;
}

const MerchantExternalApiKeys: React.FC<MerchantExternalApiKeysProps> = ({ theme, onBack }) => {
  const isDark = theme === 'dark';
  const [keys, setKeys] = useState<MerchantExternalKeyItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const list = await listMyExternalKeys();
      setKeys(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '加载密钥列表失败');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  const handleCreate = async () => {
    setError(null);
    setCreating(true);
    try {
      const res = await createMyExternalKey({
        name: newName.trim() || null,
      });
      setJustCreated(res.api_key);
      setNewName('');
      await loadKeys();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: number) => {
    if (!window.confirm('确定吊销该密钥？吊销后无法恢复，本机 QClaw 需更换新 Key。')) return;
    setError(null);
    try {
      await revokeMyExternalKey(keyId);
      await loadKeys();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '吊销失败');
    }
  };

  const copyCreated = () => {
    if (!justCreated) return;
    void navigator.clipboard.writeText(justCreated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qclawKeyMessage = justCreated ? `这是geo的api key：${justCreated}` : null;

  const copyQclawMessage = () => {
    if (!qclawKeyMessage) return;
    void navigator.clipboard.writeText(qclawKeyMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const card = `rounded-[2rem] p-8 border shadow-sm ${
    isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
  }`;
  const label = `block text-sm font-bold mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`;
  const input = `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
    isDark
      ? 'bg-black/20 border-zinc-700 text-white focus:border-geo-coral focus:ring-geo-coral/20'
      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-geo-coral focus:ring-geo-coral/20'
  }`;
  const muted = isDark ? 'text-zinc-400' : 'text-slate-500';

  return (
    <div className="flex-1 p-6 lg:p-10 overflow-y-auto h-full no-scrollbar">
      <div className="max-w-3xl mx-auto space-y-8">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className={`inline-flex items-center gap-2 text-sm font-medium ${
              isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
        ) : null}

        <div>
          <h2 className={`text-3xl font-medium mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            龙虾密钥
          </h2>
          <p className={`font-medium leading-relaxed ${muted}`}>
            供本机 QClaw 调用 GEO 接口。配置步骤见智能优化工作台中的<strong>自动化部署指南</strong>（含 QClaw、群发助手与 skill 安装）。
          </p>
          <p className={`mt-2 text-sm leading-relaxed ${muted}`}>
            创建密钥后，在 QClaw 对话（或小程序连接电脑端后）发送：
            <code className="mx-1 text-xs opacity-90">这是geo的api key：&lt;粘贴上方密钥&gt;</code>
            QClaw 会自动保存，无需手动写文件。
          </p>
        </div>

        {error && (
          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              isDark ? 'bg-red-950/50 text-red-200' : 'bg-red-50 text-red-800'
            }`}
          >
            {error}
          </div>
        )}

        <div className={card}>
          <div className="flex items-start gap-4 mb-6">
            <div
              className={`p-4 rounded-2xl ${isDark ? 'bg-geo-coral/10 text-geo-coral' : 'bg-red-50 text-geo-coral'}`}
            >
              <Key className="w-8 h-8" />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>创建新密钥</h3>
              <p className={`text-sm mt-1 leading-relaxed ${muted}`}>
                每个账号可有多把 Key；明文仅创建时显示一次，请立即复制保存。
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className={label}>备注（可选）</label>
              <input
                type="text"
                className={input}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例如 本机 QClaw"
              />
            </div>

            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={creating || listLoading}
              className={`w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all
                ${isDark ? 'bg-red-600 hover:bg-geo-coral' : 'bg-slate-900 hover:bg-slate-800'}
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Plus className="w-5 h-5" />
              {creating ? '创建中…' : '创建密钥'}
            </button>
          </div>
        </div>

        {justCreated && (
          <div
            className={`rounded-[2rem] p-8 border-2 ${
              isDark ? 'border-amber-700/50 bg-amber-950/20' : 'border-amber-300 bg-amber-50'
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-amber-600" />
              <span className={`font-bold ${isDark ? 'text-amber-200' : 'text-amber-900'}`}>
                请立即复制保存 — 明文仅显示这一次
              </span>
            </div>
            <div className="flex gap-2 items-stretch">
              <code
                className={`flex-1 break-all text-xs p-3 rounded-lg font-mono ${
                  isDark ? 'bg-black/40 text-zinc-200' : 'bg-white text-slate-800 border border-slate-200'
                }`}
              >
                {justCreated}
              </code>
              <button
                type="button"
                onClick={copyCreated}
                className={`px-4 rounded-lg font-bold flex items-center gap-1 ${
                  copied
                    ? 'bg-green-600 text-white'
                    : isDark
                      ? 'bg-zinc-700 text-white hover:bg-zinc-600'
                      : 'bg-slate-200 hover:bg-slate-300'
                }`}
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? '已复制' : '复制'}
              </button>
            </div>
            <p className={`mt-3 text-xs ${muted}`}>
              复制整句到 QClaw 发送（推荐）：
            </p>
            {qclawKeyMessage ? (
              <div className="mt-2 flex gap-2 items-stretch">
                <code
                  className={`flex-1 break-all text-xs p-3 rounded-lg font-mono ${
                    isDark ? 'bg-black/40 text-zinc-200' : 'bg-white text-slate-800 border border-slate-200'
                  }`}
                >
                  {qclawKeyMessage}
                </code>
                <button
                  type="button"
                  onClick={copyQclawMessage}
                  className={`px-4 rounded-lg font-bold flex items-center gap-1 shrink-0 ${
                    copied
                      ? 'bg-green-600 text-white'
                      : isDark
                        ? 'bg-zinc-700 text-white hover:bg-zinc-600'
                        : 'bg-slate-200 hover:bg-slate-300'
                  }`}
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
            ) : null}
            <button
              type="button"
              className={`mt-4 text-sm underline ${muted}`}
              onClick={() => setJustCreated(null)}
            >
              我已保存，关闭提示
            </button>
          </div>
        )}

        <div className={card}>
          <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>我的密钥</h3>
          {listLoading ? (
            <p className={muted}>加载中…</p>
          ) : keys.length === 0 ? (
            <p className={muted}>暂无密钥，请先创建</p>
          ) : (
            <ul className="space-y-3">
              {keys.map((k) => (
                <li
                  key={k.id}
                  className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl ${
                    isDark ? 'bg-black/20 border border-zinc-800' : 'bg-slate-50 border border-slate-200'
                  }`}
                >
                  <div>
                    <div className={`font-mono text-sm ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                      {k.key_prefix}
                      {!k.is_active && (
                        <span className="ml-2 text-xs text-red-500">（已吊销）</span>
                      )}
                    </div>
                    <div className={`text-xs mt-1 ${muted}`}>
                      {k.name || '无备注'} · ID {k.id}
                      {k.last_used_at && ` · 最近使用 ${k.last_used_at}`}
                    </div>
                  </div>
                  {k.is_active && (
                    <button
                      type="button"
                      onClick={() => void handleRevoke(k.id)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      吊销
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className={`text-xs flex items-center gap-1.5 ${muted}`}>
          <ShieldCheck className="w-3 h-3 shrink-0" />
          服务端仅存储密钥哈希；请勿将密钥提交到代码仓库或分享给他人。
        </p>
      </div>
    </div>
  );
};

export default MerchantExternalApiKeys;
