import React, { useState, useMemo } from 'react';
import { ArrowLeft, Save, FileText, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Theme } from '../types';
import { knowledgeAPI } from '../api/knowledge';

interface ManualKeywordInputProps {
  theme: Theme;
  onBack: () => void;
}

const ManualKeywordInput: React.FC<ManualKeywordInputProps> = ({ theme, onBack }) => {
  const isDark = theme === 'dark';
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keywords = useMemo(() => {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }, [text]);

  const duplicateCount = useMemo(() => {
    return keywords.length - new Set(keywords).size;
  }, [keywords]);

  const handleSave = async () => {
    if (keywords.length === 0) {
      setError('请输入至少一个关键词');
      return;
    }
    const uniqueKeywords = [...new Set(keywords)];
    try {
      setSaving(true);
      setError(null);
      await knowledgeAPI.saveManualKeywords({
        name: name.trim() || undefined,
        keywords: uniqueKeywords,
      });
      onBack();
    } catch (e: any) {
      setError(e?.message || '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'bg-geo-bg text-geo-text-main' : 'bg-slate-50 text-slate-900'}`}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className={`p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-geo-card text-geo-text-sec hover:text-geo-text-main' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className={`text-2xl font-semibold tracking-tight ${isDark ? 'text-geo-text-main' : 'text-slate-900'}`}>
              手动录入关键词
            </h2>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || keywords.length === 0}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-semibold text-sm shadow-sm transition-all
              ${saving || keywords.length === 0
                ? 'opacity-50 cursor-not-allowed bg-gray-400 text-white'
                : isDark
                  ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95'
                  : 'bg-gradient-coral text-white shadow-coral hover:opacity-95'
              }
            `}
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? '保存中...' : '保存为词包'}
          </button>
        </div>

        {/* Name input */}
        <div className={`rounded-2xl border p-5 space-y-3 ${isDark ? 'bg-geo-card border-geo-border' : 'bg-white border-slate-200 shadow-sm'}`}>
          <label className={`text-sm font-medium ${isDark ? 'text-geo-text-sec' : 'text-slate-600'}`}>
            词包名称
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="可选，不填则自动生成"
            className={`w-full px-4 py-3 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30
              ${isDark ? 'bg-geo-bg border-geo-border text-geo-text-main placeholder:text-geo-text-sec/50' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}
            `}
          />
        </div>

        {/* Textarea */}
        <div className={`rounded-2xl border p-5 space-y-3 ${isDark ? 'bg-geo-card border-geo-border' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <label className={`text-sm font-medium ${isDark ? 'text-geo-text-sec' : 'text-slate-600'}`}>
              关键词列表
            </label>
            <div className="flex items-center gap-3">
              {duplicateCount > 0 && (
                <span className={`text-xs px-2.5 py-1 rounded-full ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                  {duplicateCount} 个重复（保存时自动去重）
                </span>
              )}
              <span className={`text-xs font-mono ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`}>
                {keywords.length} 条
              </span>
            </div>
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={20}
            placeholder={'请粘贴关键词，每行一个，例如：\n\n口才培训哪家好\n演讲培训机构排名\n少儿口才培训推荐\n成人口才培训班价格\n线上口才培训课程'}
            className={`w-full px-4 py-3 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono leading-relaxed resize-none
              ${isDark ? 'bg-geo-bg border-geo-border text-geo-text-main placeholder:text-geo-text-sec/40' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}
            `}
          />
          <div className="flex items-center justify-between">
            <p className={`text-xs ${isDark ? 'text-geo-text-sec/60' : 'text-slate-400'}`}>
              支持复制粘贴，一行一个关键词/问题
            </p>
            {text.trim().length > 0 && (
              <button
                onClick={() => setText('')}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}
              >
                <Trash2 className="w-3 h-3" /> 清空
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${isDark ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-600 border border-red-200'}`}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Preview */}
        {keywords.length > 0 && (
          <div className={`rounded-2xl border p-5 space-y-3 ${isDark ? 'bg-geo-card border-geo-border' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-2">
              <FileText className={`w-4 h-4 ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`} />
              <span className={`text-sm font-medium ${isDark ? 'text-geo-text-sec' : 'text-slate-600'}`}>
                预览（前 20 条）
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[...new Set(keywords)].slice(0, 20).map((kw, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border
                    ${isDark ? 'bg-geo-bg border-geo-border text-geo-text-main' : 'bg-slate-50 border-slate-200 text-slate-700'}
                  `}
                >
                  <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${isDark ? 'bg-geo-blue/20 text-geo-blue' : 'bg-blue-100 text-blue-600'}`}>
                    {i + 1}
                  </span>
                  {kw}
                </span>
              ))}
              {new Set(keywords).size > 20 && (
                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`}>
                  ... 还有 {new Set(keywords).size - 20} 条
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualKeywordInput;
