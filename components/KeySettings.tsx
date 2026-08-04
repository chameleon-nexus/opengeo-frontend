import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, Save, Eye, EyeOff, CheckCircle2, Lock } from 'lucide-react';
import { Theme } from '../types';
import { useModuleI18n } from '../i18n/hooks';

interface KeySettingsProps {
  theme: Theme;
}

const KeySettings: React.FC<KeySettingsProps> = ({ theme }) => {
  const { t } = useModuleI18n('settings');
  const isDark = theme === 'dark';
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('geo_ai_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleSave = () => {
    if (!apiKey.trim()) return;
    localStorage.setItem('geo_ai_key', apiKey);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="flex-1 p-6 lg:p-10 overflow-y-auto h-full no-scrollbar">
      <div className="max-w-2xl mx-auto space-y-8">
        
        <div>
            <h2 className={`text-3xl font-medium mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('keys')}</h2>
            <p className={`font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{t('keysSubtitle', { defaultValue: '配置您的 AI 模型访问凭证' })}</p>
        </div>

        <div className={`rounded-[2rem] p-8 border shadow-sm ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
            
            <div className="flex items-start gap-4 mb-8">
                <div className={`p-4 rounded-2xl ${isDark ? 'bg-blue-500/10 text-blue-500' : 'bg-blue-50 text-blue-600'}`}>
                    <Key className="w-8 h-8" />
                </div>
                <div>
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>API Key 配置</h3>
                    <p className={`text-sm mt-1 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                        GEO OS 需要有效的 API Key 来驱动智能体、生成内容及分析数据。您的密钥仅存储在本地浏览器中，不会上传至我们的服务器。
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                <div>
                    <label className={`block text-sm font-bold mb-3 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                        Gemini / OpenAI API Key
                    </label>
                    <div className="relative group">
                        <div className={`absolute left-4 top-3.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                            <Lock className="w-5 h-5" />
                        </div>
                        <input 
                            type={showKey ? "text" : "password"} 
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-..."
                            className={`w-full pl-12 pr-24 py-3.5 rounded-xl border font-mono text-sm transition-all focus:outline-none focus:ring-2
                                ${isDark 
                                    ? 'bg-black/20 border-zinc-700 text-white focus:border-blue-500 focus:ring-blue-500/20 placeholder-zinc-600' 
                                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-500/20 placeholder-slate-400'
                                }
                            `}
                        />
                        <button 
                            onClick={() => setShowKey(!showKey)}
                            className={`absolute right-3 top-2.5 p-1.5 rounded-lg transition-colors
                                ${isDark ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-slate-200 text-slate-400'}
                            `}
                        >
                            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className={`text-xs mt-3 flex items-center gap-1.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                        <ShieldCheck className="w-3 h-3" /> 数据安全承诺：密钥仅用于向模型发起请求。
                    </p>
                </div>

                <div className="pt-4 border-t border-dashed border-opacity-50 border-slate-300">
                    <button 
                        onClick={handleSave}
                        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95
                            ${isSaved 
                                ? 'bg-green-600 cursor-default' 
                                : (isDark ? 'bg-gradient-coral hover:opacity-95 shadow-coral' : 'bg-slate-900 hover:bg-slate-800')
                            }
                        `}
                    >
                        {isSaved ? (
                            <>
                                <CheckCircle2 className="w-5 h-5" /> 已安全保存
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" /> 保存配置
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default KeySettings;