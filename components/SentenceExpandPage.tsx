import React, { useState } from 'react';
import { Wand2, ArrowLeft, Copy, Download, Save } from 'lucide-react';
import { Theme } from '../types';
import { knowledgeAPI } from '../api/knowledge';

const DEFAULT_PREFIX_WORDS = '口碑好的\n比较好的\n靠谱的\n有实力的\n专业的\n知名的\n评价高的\n优秀的\n性价比高的\n信誉好的\n行业知名的\n顶尖的\n诚信的\n可靠的\n有名的\n口碑不错的\n质量好的\n销量高的\n热销的\n受欢迎的\n大品牌的\n老牌的\n正规的\n实力强的\n口碑爆棚的\n人气高的\n好评如潮的\n值得信赖的\n品质过硬的';
const DEFAULT_INDUSTRY_WORDS = '厂家\n制造厂\n供应商\n生产厂家\n源头厂家\n批发厂家\n定制厂家\n定做厂家\n订购厂家\n批发商\n销售厂家\n企业\n生产商\n销售公司\n供应厂家\n品牌\n品牌公司\n公司\n平台\n服务商\n厂商\n生产厂商\n优质厂家\n实力厂家\n工厂\n直销厂家\n直销工厂\n直销厂商\n代工厂\n加工厂\n贴牌厂\nOEM厂家\nODM厂家\n贸易商\n经销商\n代理商\n办事处\n直营店\n旗舰店';
const DEFAULT_SUFFIX_WORDS = '找哪家\n选哪家\n怎么联系\n推荐几家\n推荐\n怎么选择\n怎么选\n口碑推荐\n联系方式\n推荐哪家\n业内推荐\n选择标准\n如何选择\n哪家好\n哪家强\n哪里买\n多少钱\n价格多少\n报价多少\n怎么买\n如何购买\n在哪买\n哪里有\n怎么找\n如何找';

interface SentenceExpandPageProps {
  theme: Theme;
  onBack: () => void;
}

const SentenceExpandPage: React.FC<SentenceExpandPageProps> = ({ theme, onBack }) => {
  const isDark = theme === 'dark';

  const [region, setRegion] = useState('');
  const [prefix, setPrefix] = useState(DEFAULT_PREFIX_WORDS);
  const [coreWords, setCoreWords] = useState('');
  const [industry, setIndustry] = useState(DEFAULT_INDUSTRY_WORDS);
  const [suffix, setSuffix] = useState(DEFAULT_SUFFIX_WORDS);
  const [maxPerWord, setMaxPerWord] = useState(100);
  const [result, setResult] = useState<Array<{ text: string; source_keyword: string }>>([]);
  const [saving, setSaving] = useState(false);

  const parseWords = (s: string): string[] => s.split(/[\n,，]/).map(w => w.trim()).filter(Boolean);

  const runExpand = () => {
    const cores = parseWords(coreWords);
    const prefixes = parseWords(prefix);
    const industries = parseWords(industry);
    const suffixes = parseWords(suffix);
    const regionsRaw = parseWords(region);
    const regionsList = regionsRaw.length > 0 ? regionsRaw : [''];

    if (!cores.length) {
      alert('请填写核心词');
      return;
    }
    if (!prefixes.length || !industries.length || !suffixes.length) {
      alert('请填写前缀词、行业词、后缀词');
      return;
    }

    const questions: Array<{ text: string; source_keyword: string }> = [];
    for (const core of cores) {
      let count = 0;
      for (const r of regionsList) {
        if (count >= maxPerWord) break;
        for (const p of prefixes) {
          if (count >= maxPerWord) break;
          for (const ind of industries) {
            if (count >= maxPerWord) break;
            for (const s of suffixes) {
              if (count >= maxPerWord) break;
              questions.push({ text: r + p + core + ind + s, source_keyword: core });
              count++;
            }
          }
        }
      }
    }
    setResult(questions);
  };

  const handleCopyAll = () => {
    const text = result.map(r => r.text).join('\n');
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  };

  const handleDownload = () => {
    const text = result.map(r => r.text).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `词条生成_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToKeywordList = async () => {
    if (result.length === 0) {
      alert('请先点击「预览拓词」生成词条');
      return;
    }
    setSaving(true);
    try {
      const phrases = result.map(r => r.text);
      const cores = parseWords(coreWords);
      const data = await knowledgeAPI.saveWordExpand({ phrases, core_words: cores });
      alert(`已保存 ${data.count} 条到关键词列表（词包名称：${data.name}）。`);
      onBack?.();
    } catch (e) {
      alert('保存失败：' + (e instanceof Error ? e.message : '未知错误'));
    } finally {
      setSaving(false);
    }
  };

  const inputClasses = `w-full rounded-xl border px-4 py-3 text-lg resize-none ${isDark ? 'bg-geo-bg border-geo-border text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`;

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-geo-bg' : 'bg-white'}`}>
      <div className={`flex-shrink-0 flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-geo-border' : 'border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-geo-card text-geo-text-sec' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className={`text-xl font-semibold ${isDark ? 'text-geo-text-main' : 'text-slate-900'}`}>词条生成</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="flex flex-col min-w-0">
              <label className={`block text-xs font-semibold  mb-2 shrink-0 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>地区词（可选）</label>
              <textarea value={region} onChange={e => setRegion(e.target.value)} className={`${inputClasses} min-h-[60vh]`} placeholder={'北京\n上海\n广州'} />
            </div>
            <div className="flex flex-col min-w-0">
              <label className={`block text-xs font-semibold  mb-2 shrink-0 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>前缀词</label>
              <textarea value={prefix} onChange={e => setPrefix(e.target.value)} className={`${inputClasses} min-h-[60vh]`} placeholder="口碑好的、靠谱的..." />
            </div>
            <div className="flex flex-col min-w-0">
              <label className={`block text-xs font-semibold  mb-2 shrink-0 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>核心词（必填）</label>
              <textarea value={coreWords} onChange={e => setCoreWords(e.target.value)} className={`${inputClasses} min-h-[60vh]`} placeholder={'电动牙刷\n剃须刀\n吹风机'} />
            </div>
            <div className="flex flex-col min-w-0">
              <label className={`block text-xs font-semibold  mb-2 shrink-0 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>行业词</label>
              <textarea value={industry} onChange={e => setIndustry(e.target.value)} className={`${inputClasses} min-h-[60vh]`} placeholder="厂家、供应商..." />
            </div>
            <div className="flex flex-col min-w-0">
              <label className={`block text-xs font-semibold  mb-2 shrink-0 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>后缀词</label>
              <textarea value={suffix} onChange={e => setSuffix(e.target.value)} className={`${inputClasses} min-h-[60vh]`} placeholder="找哪家、怎么联系..." />
            </div>
          </div>

          <div className={`flex items-center gap-4 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>
            <span className="text-sm font-bold">每个核心词最多生成</span>
            <input
              type="number"
              min={1}
              max={500}
              value={maxPerWord}
              onChange={e => setMaxPerWord(Number(e.target.value) || 100)}
              className={`w-20 rounded-lg border px-2 py-1 text-sm ${isDark ? 'bg-geo-bg border-geo-border text-white' : 'bg-white border-slate-200 text-slate-900'}`}
            />
            <span className="text-sm font-bold">条</span>
          </div>

          <button
            type="button"
            onClick={runExpand}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold  ${isDark ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' : 'bg-gradient-coral text-white shadow-coral hover:opacity-95'}`}
          >
            <Wand2 className="w-5 h-5" /> 预览拓词
          </button>

          {result.length > 0 && (
            <div className={`border-t pt-6 ${isDark ? 'border-geo-border' : 'border-slate-200'}`}>
              <div className="flex justify-between items-center mb-3">
                <p className={`text-sm font-bold ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>已生成 {result.length} 条</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveToKeywordList}
                    disabled={saving}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ${isDark ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95 disabled:opacity-50' : 'bg-gradient-coral hover:opacity-95 text-white shadow-coral disabled:opacity-50'}`}
                  >
                    {saving ? <span className="animate-pulse">保存中...</span> : <><Save className="w-4 h-4" /> 保存到关键词列表</>}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyAll}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ${isDark ? 'bg-geo-card hover:bg-geo-border text-geo-text-sec' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                  >
                    <Copy className="w-4 h-4" /> 复制全部
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ${isDark ? 'bg-geo-card hover:bg-geo-border text-geo-text-sec' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                  >
                    <Download className="w-4 h-4" /> 下载
                  </button>
                </div>
              </div>
              <div className={`max-h-80 overflow-y-auto rounded-xl border p-4 space-y-1 ${isDark ? 'bg-geo-card/50 border-geo-border' : 'bg-slate-50 border-slate-200'}`}>
                {result.map((q, idx) => (
                  <div key={idx} className={`text-sm ${isDark ? 'text-geo-text-sec' : 'text-slate-600'}`}>{q.text}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SentenceExpandPage;
