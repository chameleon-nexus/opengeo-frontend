/**
 * 编辑分析明细 - 编辑表单
 * 仅编辑分析明细报告字段，不修改明细来源
 * 平台默认 20 端：豆包、DeepSeek、文心、千问、元宝、Kimi、夸克、纳米、讯飞星火、智谱 各 PC + 移动端
 * 图标使用本地路径，远端 URL 加载时自动替换为本地图
 */

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronLeft, Loader2, Save, LayoutGrid, ChartPie, Copy } from 'lucide-react';
import { Theme } from '../types';
import { dataScreenReportAPI, DataScreenReportData } from '../api/dataScreenReport';

interface EditDataScreenFormProps {
  theme: Theme;
  reportId: number;
  onBack: () => void;
}

const MEDAL_OPTIONS = ['bg-yellow-500', 'bg-blue-400', 'bg-zinc-600'];

/** 默认 12 个 Top 语义词（分析明细展示前 20 个） */
const DEFAULT_12_TOP_KEYWORDS: Array<{ rank: number; word: string; count: number; medal: string }> = [
  { rank: 1, word: '电动剃须刀', count: 923, medal: 'bg-yellow-500' },
  { rank: 2, word: '飞利浦', count: 892, medal: 'bg-blue-400' },
  { rank: 3, word: 'S7000敏感肌专用', count: 845, medal: 'bg-blue-400' },
  { rank: 4, word: '软刀头', count: 734, medal: 'bg-zinc-600' },
  { rank: 5, word: '越野跑鞋', count: 721, medal: 'bg-zinc-600' },
  { rank: 6, word: '飞利浦剃须刀', count: 687, medal: 'bg-zinc-600' },
  { rank: 7, word: 'hoka越野鞋', count: 678, medal: 'bg-zinc-600' },
  { rank: 8, word: 'HOKA越野鞋', count: 634, medal: 'bg-zinc-600' },
  { rank: 9, word: 'HOKA跑鞋', count: 598, medal: 'bg-zinc-600' },
  { rank: 10, word: 'hoka缓震', count: 581, medal: 'bg-zinc-600' },
  { rank: 11, word: '飞利浦S7000', count: 569, medal: 'bg-zinc-600' },
  { rank: 12, word: 'hoka登山鞋', count: 543, medal: 'bg-zinc-600' },
];

/** 20 端默认配置：10 平台（豆包、DeepSeek、文心、千问、元宝、Kimi、夸克、纳米、讯飞星火、智谱）各 PC + 移动端 */
const DEFAULT_20_PLATFORMS: Array<{ name: string; value: number; color: string; icon: string }> = [
  { name: '豆包（PC）', value: 0, color: '#4f72db', icon: '/imgs/ai-icons/doubao.png' },
  { name: '豆包（移动）', value: 0, color: '#4f72db', icon: '/imgs/ai-icons/doubao.png' },
  { name: 'DeepSeek（PC）', value: 0, color: '#97d16d', icon: '/imgs/ai-icons/deepseek.png' },
  { name: 'DeepSeek（移动）', value: 0, color: '#97d16d', icon: '/imgs/ai-icons/deepseek.png' },
  { name: '文心一言（PC）', value: 0, color: '#f7cd66', icon: '/imgs/ai-icons/wenxin.png' },
  { name: '文心一言（移动）', value: 0, color: '#f7cd66', icon: '/imgs/ai-icons/wenxin.png' },
  { name: '千问（PC）', value: 0, color: '#7bc9e8', icon: '/imgs/ai-icons/tongyi.png' },
  { name: '千问（移动）', value: 0, color: '#7bc9e8', icon: '/imgs/ai-icons/tongyi.png' },
  { name: '元宝（PC）', value: 0, color: '#f36d6d', icon: '/imgs/ai-icons/yuanbao.png' },
  { name: '元宝（移动）', value: 0, color: '#f36d6d', icon: '/imgs/ai-icons/yuanbao.png' },
  { name: 'Kimi（PC）', value: 0, color: '#42a875', icon: '/imgs/ai-icons/kimi.png' },
  { name: 'Kimi（移动）', value: 0, color: '#42a875', icon: '/imgs/ai-icons/kimi.png' },
  { name: '夸克（PC）', value: 0, color: '#6b5beb', icon: '/imgs/ai-icons/quark.png' },
  { name: '夸克（移动）', value: 0, color: '#6b5beb', icon: '/imgs/ai-icons/quark.png' },
  { name: '纳米（PC）', value: 0, color: '#2d8a6e', icon: '/imgs/ai-icons/nami.png' },
  { name: '纳米（移动）', value: 0, color: '#2d8a6e', icon: '/imgs/ai-icons/nami.png' },
  { name: '讯飞星火（PC）', value: 0, color: '#e85d04', icon: '/imgs/ai-icons/xunfei.png' },
  { name: '讯飞星火（移动）', value: 0, color: '#e85d04', icon: '/imgs/ai-icons/xunfei.png' },
  { name: '智谱（PC）', value: 0, color: '#0d6efd', icon: '/imgs/ai-icons/zhipu.png' },
  { name: '智谱（移动）', value: 0, color: '#0d6efd', icon: '/imgs/ai-icons/zhipu.png' },
];

/** 远端 icon URL -> 本地路径映射（下载后替换为本地图） */
const REMOTE_TO_LOCAL_ICON: Record<string, string> = {
  'https://www.xunlingai.com/static/img/doubao_white.0371c387.png': '/imgs/ai-icons/doubao.png',
  'https://www.xunlingai.com/static/img/wenxin_white.c69b9f82.png': '/imgs/ai-icons/wenxin.png',
  'https://www.xunlingai.com/static/img/tongyi_white.706d98dd.png': '/imgs/ai-icons/tongyi.png',
  'https://www.xunlingai.com/static/img/yuanbao_white.d2105ec8.png': '/imgs/ai-icons/yuanbao.png',
  'https://www.xunlingai.com/static/img/deepseek.png': '/imgs/ai-icons/deepseek.png',
  'https://www.xunlingai.com/static/img/kimi.png': '/imgs/ai-icons/kimi.png',
};

function normalizeIconToLocal(icon: string): string {
  if (!icon || icon.startsWith('/')) return icon;
  const exact = REMOTE_TO_LOCAL_ICON[icon];
  if (exact) return exact;
  if (icon.includes('doubao')) return '/imgs/ai-icons/doubao.png';
  if (icon.includes('wenxin')) return '/imgs/ai-icons/wenxin.png';
  if (icon.includes('tongyi')) return '/imgs/ai-icons/tongyi.png';
  if (icon.includes('yuanbao')) return '/imgs/ai-icons/yuanbao.png';
  if (icon.includes('deepseek')) return '/imgs/ai-icons/deepseek.png';
  if (icon.includes('kimi') || icon.includes('moonshot')) return '/imgs/ai-icons/kimi.png';
  if (icon.includes('quark')) return '/imgs/ai-icons/quark.png';
  if (icon.includes('nami') || icon.includes('纳米')) return '/imgs/ai-icons/nami.png';
  if (icon.includes('xunfei') || icon.includes('星火')) return '/imgs/ai-icons/xunfei.png';
  if (icon.includes('zhipu') || icon.includes('智谱')) return '/imgs/ai-icons/zhipu.png';
  return icon;
}

function normalizePlatforms(platforms: Array<{ name: string; value: number; color: string; icon: string }>) {
  return platforms.map((p) => ({ ...p, icon: normalizeIconToLocal(p.icon) }));
}

const EditDataScreenForm: React.FC<EditDataScreenFormProps> = ({ theme, reportId, onBack }) => {
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [report, setReport] = useState<DataScreenReportData | null>(null);

  const [coreWordsTotal, setCoreWordsTotal] = useState(0);
  const [distilledWordsTotal, setDistilledWordsTotal] = useState(0);
  const [topKeywords, setTopKeywords] = useState<Array<{ rank: number; word: string; count: number; medal: string }>>([]);
  const [platformData, setPlatformData] = useState<Array<{ name: string; value: number; color: string; icon: string }>>([]);
  const [reportRows, setReportRows] = useState<Array<{ rank: number; coreWord: string; latestWord: string; platform: string; link: string }>>([]);
  const [reportDetailPlatforms, setReportDetailPlatforms] = useState<string[]>(() => DEFAULT_20_PLATFORMS.map((p) => p.name));
  const [copyFromPlatform, setCopyFromPlatform] = useState('');
  const [copyToPlatform, setCopyToPlatform] = useState('');
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [snapshotDate, setSnapshotDate] = useState('');
  const [summaryMetrics, setSummaryMetrics] = useState<Record<string, string>>({
    totalCollected: '1117506', totalCollectedToday: '今日新增 ↑54214',
    platformCount: '11', totalPlatformCount: '11',
    contactExposure: '60689', contactExposureToday: '今日新增 ↑8',
    officialLinkExposure: '16434', officialLinkExposureToday: '今日新增 ↑8',
    overallExposureRate: '0.62%', overallExposureRateToday: '',
    top3Rate: '72%', top3RateToday: '',
    displayCount: '4',
    displayFlags: '1,1,1,1,0,0',  // 6 项勾选，默认前 4 项
    showQuickCredential: '1', showGotoPlatform: '1',  // 兼容旧数据
    showQuickCredentialByPlatform: '{}', showGotoPlatformByPlatform: '{}',  // 按平台配置，默认都显示
    showLogo: '1',  // 分享页是否显示 Logo，默认显示
  });

  const parsePlatformDisplay = (json?: string): Record<string, boolean> => {
    if (!json) return {};
    try {
      const o = JSON.parse(json);
      if (typeof o !== 'object' || o === null) return {};
      return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === '1' || v === true]));
    } catch { return {}; }
  };
  const getPlatformShowQuick = (platform: string) =>
    (parsePlatformDisplay(summaryMetrics.showQuickCredentialByPlatform)[platform] ?? summaryMetrics.showQuickCredential !== '0');
  const getPlatformShowGoto = (platform: string) =>
    (parsePlatformDisplay(summaryMetrics.showGotoPlatformByPlatform)[platform] ?? summaryMetrics.showGotoPlatform !== '0');
  const setPlatformShowQuick = (platform: string, show: boolean) => {
    const prev = parsePlatformDisplay(summaryMetrics.showQuickCredentialByPlatform);
    const next: Record<string, string> = {};
    Object.entries(prev).forEach(([k, v]) => { next[k] = v ? '1' : '0'; });
    next[platform] = show ? '1' : '0';
    setSummaryMetrics((m) => ({ ...m, showQuickCredentialByPlatform: JSON.stringify(next) }));
  };
  const setPlatformShowGoto = (platform: string, show: boolean) => {
    const prev = parsePlatformDisplay(summaryMetrics.showGotoPlatformByPlatform);
    const next: Record<string, string> = {};
    Object.entries(prev).forEach(([k, v]) => { next[k] = v ? '1' : '0'; });
    next[platform] = show ? '1' : '0';
    setSummaryMetrics((m) => ({ ...m, showGotoPlatformByPlatform: JSON.stringify(next) }));
  };

  const METRIC_DISPLAY_KEYS = ['totalCollected', 'platformCount', 'contactExposure', 'officialLinkExposure', 'overallExposureRate', 'top3Rate'] as const;
  const METRIC_LABELS: Record<string, string> = {
    totalCollected: '收录总量',
    platformCount: '收录平台',
    contactExposure: '联系方式曝光量',
    officialLinkExposure: '官网链接曝光量',
    overallExposureRate: '总体露出率',
    top3Rate: 'top3占比',
  };
  const parseDisplayFlags = (flags?: string, fallbackCount?: string): boolean[] => {
    if (flags) {
      const arr = flags.split(',').map((x) => x.trim() === '1');
      if (arr.length >= 6) return arr.slice(0, 6);
    }
    const n = Math.min(6, Math.max(1, parseInt(fallbackCount || '4', 10) || 4));
    return [true, true, true, true, false, false].map((v, i) => i < n);
  };
  const displayFlags = parseDisplayFlags(summaryMetrics.displayFlags, summaryMetrics.displayCount);
  const setDisplayFlag = (index: number, checked: boolean) => {
    const next = [...displayFlags];
    next[index] = checked;
    setSummaryMetrics((m) => ({ ...m, displayFlags: next.map((b) => (b ? '1' : '0')).join(',') }));
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await dataScreenReportAPI.getById(reportId);
        if (data) {
          setReport(data);
          setCoreWordsTotal(data.coreWordsTotal ?? 0);
          setDistilledWordsTotal(data.distilledWordsTotal ?? 0);
          setTopKeywords(data.topKeywords || []);
          const rawPlatforms = data.platformData || [];
          const platforms = rawPlatforms.length > 0
            ? normalizePlatforms(rawPlatforms)  // 远端 URL 替换为本地路径
            : DEFAULT_20_PLATFORMS;             // 空则使用默认 20 端
          setPlatformData(platforms);
          setReportRows(data.reportRows || []);
          setSnapshotDate(data.snapshotDate || '');
          if (data.summaryMetrics && Object.keys(data.summaryMetrics).length > 0) {
            setSummaryMetrics((prev) => {
              const merged = { ...prev, ...data.summaryMetrics };
              if (!merged.displayFlags && merged.displayCount) {
                const n = Math.min(6, Math.max(1, parseInt(merged.displayCount || '4', 10) || 4));
                merged.displayFlags = [1, 2, 3, 4, 5, 6].map((i) => (i <= n ? '1' : '0')).join(',');
              }
              if (merged.showQuickCredential !== '0' && merged.showQuickCredential !== '1') merged.showQuickCredential = '1';
              if (merged.showGotoPlatform !== '0' && merged.showGotoPlatform !== '1') merged.showGotoPlatform = '1';
              if (merged.showLogo !== '0' && merged.showLogo !== '1') merged.showLogo = '1';
              return merged;
            });
          }
          if (data.summaryMetrics?.reportDetailPlatforms) {
            try {
              const arr = JSON.parse(data.summaryMetrics.reportDetailPlatforms);
              if (Array.isArray(arr) && arr.length > 0) setReportDetailPlatforms(arr.filter((x) => typeof x === 'string'));
            } catch { /* keep default */ }
          } else if ((data.reportRows || []).length > 0) {
            const fromRows = Array.from(new Set((data.reportRows as { platform?: string }[]).map((r) => r.platform).filter(Boolean)));
            setReportDetailPlatforms((prev) => Array.from(new Set([...fromRows, ...prev])));
          }
          let platformsToUse: string[] = [];
          if (data.summaryMetrics?.reportDetailPlatforms) {
            try {
              const arr = JSON.parse(data.summaryMetrics.reportDetailPlatforms);
              if (Array.isArray(arr)) platformsToUse = arr.filter((x) => typeof x === 'string');
            } catch { /* ignore */ }
          }
          if (platformsToUse.length === 0 && (data.reportRows || []).length > 0) {
            platformsToUse = Array.from(new Set([...(data.reportRows as { platform?: string }[]).map((r) => r.platform).filter(Boolean) as string[], ...DEFAULT_20_PLATFORMS.map((p) => p.name)]));
          }
          if (platformsToUse.length === 0) platformsToUse = DEFAULT_20_PLATFORMS.map((p) => p.name);
          const rows = (data.reportRows || []) as { platform?: string }[];
          const firstWithData = platformsToUse.find((p) => rows.some((r) => (r.platform || '').trim() === p)) ?? platformsToUse[0];
          setCopyFromPlatform(firstWithData || '');
          setCopyToPlatform(platformsToUse[0] || '');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reportId]);

  useEffect(() => {
    const valid = reportDetailPlatforms.filter(Boolean);
    if (valid.length > 0) {
      if (!valid.includes(copyFromPlatform)) setCopyFromPlatform(valid[0]);
      if (!valid.includes(copyToPlatform)) setCopyToPlatform(valid[0]);
    }
  }, [reportDetailPlatforms]);

  const handleSave = async () => {
    if (!report) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await dataScreenReportAPI.update(reportId, {
        core_words_total: coreWordsTotal,
        distilled_words_total: distilledWordsTotal,
        top_keywords: topKeywords,
        platform_data: platformData.map((p) => ({ ...p, value: platformValueForChart(p.value) })),
        report_rows: reportRows.length > 0 ? reportRows : undefined,
        snapshot_date: snapshotDate || undefined,
        summary_metrics: { ...summaryMetrics, reportDetailPlatforms: JSON.stringify(reportDetailPlatforms) },
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const addTopKeyword = () => {
    setTopKeywords([...topKeywords, { rank: topKeywords.length + 1, word: '', count: 0, medal: 'bg-zinc-600' }]);
  };
  const fillDefault12TopKeywords = () => {
    setTopKeywords([...DEFAULT_12_TOP_KEYWORDS]);
  };
  const removeTopKeyword = (i: number) => setTopKeywords(topKeywords.filter((_, idx) => idx !== i));
  const updateTopKeyword = (i: number, field: string, val: string | number) => {
    const next = [...topKeywords];
    (next[i] as any)[field] = val;
    if (field === 'rank') next[i].rank = Number(val) || i + 1;
    setTopKeywords(next);
  };

  const addPlatform = () => {
    setPlatformData([...platformData, { name: '', value: 0, color: '#999', icon: '' }]);
  };
  const fillDefault12Platforms = () => {
    setPlatformData([...DEFAULT_20_PLATFORMS]);
  };
  const removePlatform = (i: number) => setPlatformData(platformData.filter((_, idx) => idx !== i));
  const updatePlatform = (i: number, field: string, val: string | number) => {
    const next = [...platformData];
    (next[i] as any)[field] = field === 'value' ? val : val;
    setPlatformData(next);
  };
  const platformValueForChart = (v: string | number) => Number(v) || 0;

  const addReportDetailPlatform = () => setReportDetailPlatforms((prev) => [...prev, '']);
  const removeReportDetailPlatform = (i: number) => setReportDetailPlatforms((prev) => prev.filter((_, idx) => idx !== i));
  const updateReportDetailPlatform = (i: number, name: string) => setReportDetailPlatforms((prev) => { const n = [...prev]; n[i] = name; return n; });

  const addReportRow = () => {
    const defaultPlatform = reportDetailPlatforms[0] || '';
    setReportRows([...reportRows, { rank: reportRows.length + 1, coreWord: '', latestWord: '', platform: defaultPlatform, link: '' }]);
  };
  const removeReportRow = (i: number) => setReportRows(reportRows.filter((_, idx) => idx !== i));
  const updateReportRow = (i: number, field: string, val: string | number) => {
    const next = [...reportRows];
    (next[i] as any)[field] = field === 'rank' ? Number(val) || i + 1 : val;
    setReportRows(next);
  };

  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm ${
    isDark ? 'bg-zinc-800 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
  }`;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
      </div>
    );
  }

  if (!report) {
    return (
      <div className={`p-6 rounded-xl ${isDark ? 'bg-zinc-900/50' : 'bg-white'}`}>
        <p className={isDark ? 'text-red-400' : 'text-red-600'}>加载失败</p>
        <button
          onClick={onBack}
          className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-700'}`}
        >
          <ChevronLeft className="w-4 h-4" /> 返回列表
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            isDark ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ChevronLeft className="w-4 h-4" /> 返回列表
        </button>
        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          编辑分析明细 · {report.brandName || report.brandId} · {report.taskId}
        </h2>
      </div>

      {error && (
        <div className={`p-4 rounded-xl ${isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
          {error}
        </div>
      )}
      {success && (
        <div className={`p-4 rounded-xl ${isDark ? 'bg-green-900/20 text-green-400' : 'bg-green-50 text-green-700'}`}>
          保存成功
        </div>
      )}

      <div className={`rounded-2xl border p-6 space-y-6 ${isDark ? 'bg-zinc-900/50 border-white/10' : 'bg-white border-slate-200'}`}>
        <section>
          <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>分享页设置</h3>
          <label className={`inline-flex items-center gap-2 cursor-pointer ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
            <input
              type="checkbox"
              checked={summaryMetrics.showLogo !== '0'}
              onChange={(e) => setSummaryMetrics((m) => ({ ...m, showLogo: e.target.checked ? '1' : '0' }))}
              className={`rounded border ${isDark ? 'border-white/30 bg-zinc-800' : 'border-slate-300 bg-white'}`}
            />
            <span className="text-xs font-medium">分享页显示 Logo</span>
          </label>
        </section>
        <section>
          <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>数据指标（共 6 项，勾选要显示的项，默认前 4 项）</h3>
          <div className="mb-4 flex flex-wrap gap-4">
            <span className={`text-xs font-semibold shrink-0 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>显示项：</span>
            {METRIC_DISPLAY_KEYS.map((key, i) => (
              <label key={key} className={`inline-flex items-center gap-2 cursor-pointer ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
                <input
                  type="checkbox"
                  checked={displayFlags[i]}
                  onChange={(e) => setDisplayFlag(i, e.target.checked)}
                  className={`rounded border ${isDark ? 'border-white/30 bg-zinc-800' : 'border-slate-300 bg-white'}`}
                />
                <span className="text-xs font-medium">{METRIC_LABELS[key]}</span>
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>收录总量</label>
              <input value={summaryMetrics.totalCollected ?? ''} onChange={(e) => setSummaryMetrics(m => ({ ...m, totalCollected: e.target.value }))} className={inputCls} placeholder="1117506" />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>今日新增（收录总量）</label>
              <input value={summaryMetrics.totalCollectedToday ?? ''} onChange={(e) => setSummaryMetrics(m => ({ ...m, totalCollectedToday: e.target.value }))} className={inputCls} placeholder="今日新增 ↑54214" />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>收录平台</label>
              <input value={summaryMetrics.platformCount ?? ''} onChange={(e) => setSummaryMetrics(m => ({ ...m, platformCount: e.target.value }))} className={inputCls} placeholder="11" />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>总平台数</label>
              <input value={summaryMetrics.totalPlatformCount ?? ''} onChange={(e) => setSummaryMetrics(m => ({ ...m, totalPlatformCount: e.target.value }))} className={inputCls} placeholder="11" />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>联系方式曝光量</label>
              <input value={summaryMetrics.contactExposure ?? ''} onChange={(e) => setSummaryMetrics(m => ({ ...m, contactExposure: e.target.value }))} className={inputCls} placeholder="60689" />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>今日新增（联系方式）</label>
              <input value={summaryMetrics.contactExposureToday ?? ''} onChange={(e) => setSummaryMetrics(m => ({ ...m, contactExposureToday: e.target.value }))} className={inputCls} placeholder="今日新增 ↑8" />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>官网链接曝光量</label>
              <input value={summaryMetrics.officialLinkExposure ?? ''} onChange={(e) => setSummaryMetrics(m => ({ ...m, officialLinkExposure: e.target.value }))} className={inputCls} placeholder="16434" />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>今日新增（官网链接）</label>
              <input value={summaryMetrics.officialLinkExposureToday ?? ''} onChange={(e) => setSummaryMetrics(m => ({ ...m, officialLinkExposureToday: e.target.value }))} className={inputCls} placeholder="今日新增 ↑8" />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>总体露出率</label>
              <input value={summaryMetrics.overallExposureRate ?? ''} onChange={(e) => setSummaryMetrics(m => ({ ...m, overallExposureRate: e.target.value }))} className={inputCls} placeholder="0.62%" />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>今日新增（总体露出率）</label>
              <input value={summaryMetrics.overallExposureRateToday ?? ''} onChange={(e) => setSummaryMetrics(m => ({ ...m, overallExposureRateToday: e.target.value }))} className={inputCls} placeholder="可选" />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>top3占比</label>
              <input value={summaryMetrics.top3Rate ?? ''} onChange={(e) => setSummaryMetrics(m => ({ ...m, top3Rate: e.target.value }))} className={inputCls} placeholder="72%" />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>今日新增（top3占比）</label>
              <input value={summaryMetrics.top3RateToday ?? ''} onChange={(e) => setSummaryMetrics(m => ({ ...m, top3RateToday: e.target.value }))} className={inputCls} placeholder="可选" />
            </div>
          </div>
        </section>

        <section>
          <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
            <h3 className={`text-sm font-bold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>各平台问题占比（占比图，饼图数据）</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={fillDefault12Platforms}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> 填充默认 20 端
              </button>
              <button
                onClick={addPlatform}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}
              >
                + 添加
              </button>
            </div>
          </div>
          {platformData.length > 0 ? (
            <div className={`mb-6 rounded-xl border p-4 ${isDark ? 'bg-zinc-800/50 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <ChartPie className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                <span className={`text-xs font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>占比图预览</span>
              </div>
              <div className="h-[240px] w-full max-w-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={platformData.map((p) => ({ ...p, value: platformValueForChart(p.value) }))}
                      nameKey="name"
                      dataKey="value"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {platformData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#999'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#18181b' : '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        color: isDark ? '#fff' : '#333',
                      }}
                      formatter={(value: number, name: string, props: any) => {
                        const total = platformData.reduce((s, p) => s + platformValueForChart(p.value), 0) || 1;
                        const pct = ((value / total) * 100).toFixed(1);
                        return [`${value} (${pct}%)`, name];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className={`mb-4 text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>暂无数据，点击「填充默认 20 端」或「+ 添加」后占比图将在此预览</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'text-zinc-500' : 'text-slate-400'}>
                  <th className="text-left py-2 pr-2">平台名</th>
                  <th className="text-left py-2 pr-2 w-24">数量</th>
                  <th className="text-left py-2 pr-2 w-24">颜色</th>
                  <th className="text-left py-2 pr-2 w-12">图标</th>
                  <th className="text-left py-2 pr-2">图标 URL</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {platformData.map((p, i) => (
                  <tr key={i} className={isDark ? 'border-t border-white/5' : 'border-t border-slate-100'}>
                    <td className="py-2 pr-2">
                      <input value={p.name} onChange={(e) => updatePlatform(i, 'name', e.target.value)} className={inputCls} />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        value={p.value}
                        onChange={(e) => updatePlatform(i, 'value', e.target.value)}
                        className={`${inputCls} w-20`}
                        placeholder="数量"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input value={p.color} onChange={(e) => updatePlatform(i, 'color', e.target.value)} className={`${inputCls} w-24`} />
                    </td>
                    <td className="py-2 pr-2">
                      {p.icon ? (
                        <div className={`w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                          <img src={p.icon} alt="" className="w-6 h-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                      ) : (
                        <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>—</span>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      <input value={p.icon} onChange={(e) => updatePlatform(i, 'icon', e.target.value)} className={inputCls} placeholder="/imgs/ai-icons/xxx.png" />
                    </td>
                    <td>
                      <button onClick={() => removePlatform(i)} className={`text-xs font-semibold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>核心指标</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>核心词总量</label>
              <input
                type="number"
                value={coreWordsTotal}
                onChange={(e) => setCoreWordsTotal(parseInt(e.target.value, 10) || 0)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>热度值</label>
              <input
                type="number"
                value={distilledWordsTotal}
                onChange={(e) => setDistilledWordsTotal(parseInt(e.target.value, 10) || 0)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>快照日期</label>
              <input
                type="text"
                value={snapshotDate}
                onChange={(e) => setSnapshotDate(e.target.value)}
                placeholder="YYYY-MM-DD"
                className={inputCls}
              />
            </div>
          </div>
        </section>

        <section>
          <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
            <h3 className={`text-sm font-bold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Top 语义词（分析明细展示前 20 个）</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={fillDefault12TopKeywords}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> 填充默认 12 词
              </button>
              <button
                onClick={addTopKeyword}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}
              >
                + 添加
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'text-zinc-500' : 'text-slate-400'}>
                  <th className="text-left py-2 pr-2 w-16">排名</th>
                  <th className="text-left py-2 pr-2">词</th>
                  <th className="text-left py-2 pr-2 w-24">热度值</th>
                  <th className="text-left py-2 pr-2 w-32">样式</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {topKeywords.map((k, i) => (
                  <tr key={i} className={isDark ? 'border-t border-white/5' : 'border-t border-slate-100'}>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        value={k.rank}
                        onChange={(e) => updateTopKeyword(i, 'rank', parseInt(e.target.value, 10) || i + 1)}
                        className={`${inputCls} w-14`}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input value={k.word} onChange={(e) => updateTopKeyword(i, 'word', e.target.value)} className={inputCls} />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        value={k.count}
                        onChange={(e) => updateTopKeyword(i, 'count', parseInt(e.target.value, 10) || 0)}
                        className={`${inputCls} w-20`}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        value={k.medal}
                        onChange={(e) => updateTopKeyword(i, 'medal', e.target.value)}
                        className={inputCls}
                      >
                        {MEDAL_OPTIONS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button onClick={() => removeTopKeyword(i)} className={`text-xs font-semibold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>报表明细 · 平台配置</h3>
          <p className={`text-xs mb-3 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>先配置平台列表，平台名称可灵活填写（如 doubao、豆包、豆包PC 等），再在下方添加各平台内的明细数据。下方「快速凭证 / 转到平台」任一勾选，即会在前端分析明细中显示「凭证」按钮；点击在新页面展示该问题的 AI 回复，并可在有链接时跳转原分享页。</p>
          <div className="space-y-3 mb-4">
            {reportDetailPlatforms.map((name, i) => (
              <div key={i} className={`flex flex-wrap items-center gap-3 py-2 px-3 rounded-lg ${isDark ? 'bg-zinc-800/50' : 'bg-slate-50'}`}>
                <input
                  value={name}
                  onChange={(e) => updateReportDetailPlatform(i, e.target.value)}
                  placeholder="平台名称"
                  className={`${inputCls} w-28`}
                />
                <label className={`inline-flex items-center gap-1.5 cursor-pointer text-xs ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                  <input
                    type="checkbox"
                    checked={getPlatformShowQuick(name)}
                    onChange={(e) => setPlatformShowQuick(name, e.target.checked)}
                    className={`rounded border ${isDark ? 'border-white/30 bg-zinc-800' : 'border-slate-300 bg-white'}`}
                  />
                  快速凭证
                </label>
                <label className={`inline-flex items-center gap-1.5 cursor-pointer text-xs ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                  <input
                    type="checkbox"
                    checked={getPlatformShowGoto(name)}
                    onChange={(e) => setPlatformShowGoto(name, e.target.checked)}
                    className={`rounded border ${isDark ? 'border-white/30 bg-zinc-800' : 'border-slate-300 bg-white'}`}
                  />
                  转到平台
                </label>
                <button type="button" onClick={() => removeReportDetailPlatform(i)} className={`text-xs font-semibold ${isDark ? 'text-red-400' : 'text-red-600'}`}>删除</button>
              </div>
            ))}
            <button
              type="button"
              onClick={addReportDetailPlatform}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}
            >
              + 添加平台
            </button>
            <button
              type="button"
              onClick={() => setReportDetailPlatforms(DEFAULT_20_PLATFORMS.map((p) => p.name))}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${isDark ? 'bg-zinc-600/50 text-zinc-400' : 'bg-slate-100 text-slate-600'}`}
            >
              填充默认 20 端
            </button>
          </div>
        </section>

        <section>
          <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
            <h3 className={`text-sm font-bold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>报表明细 · 数据</h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>复制明细：</span>
              <select
                value={copyFromPlatform}
                onChange={(e) => { setCopyFromPlatform(e.target.value); setCopyMessage(null); }}
                className={`${inputCls} w-28`}
                aria-label="从平台"
              >
                <option value="">请选择源平台</option>
                {reportDetailPlatforms.filter(Boolean).map((p) => (
                  <option key={p} value={p}>{p || '(未命名)'}</option>
                ))}
              </select>
              <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>→</span>
              <select
                value={copyToPlatform}
                onChange={(e) => { setCopyToPlatform(e.target.value); setCopyMessage(null); }}
                className={`${inputCls} w-28`}
                aria-label="到平台"
              >
                <option value="">请选择目标平台</option>
                {reportDetailPlatforms.filter(Boolean).map((p) => (
                  <option key={p} value={p}>{p || '(未命名)'}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setCopyMessage(null);
                  const fromPlat = copyFromPlatform?.trim();
                  const toPlat = copyToPlatform?.trim();
                  if (!fromPlat || !toPlat) {
                    setCopyMessage('请选择源平台和目标平台');
                    return;
                  }
                  if (fromPlat === toPlat) {
                    setCopyMessage('源平台和目标平台不能相同');
                    return;
                  }
                  const toCopy = reportRows.filter((r) => (r.platform || '').trim() === fromPlat);
                  if (toCopy.length === 0) {
                    setCopyMessage(`源平台「${fromPlat}」暂无明细数据，请先添加`);
                    return;
                  }
                  const maxRank = Math.max(0, ...reportRows.map((r) => r.rank));
                  const newRows = toCopy.map((r, i) => ({
                    rank: maxRank + i + 1,
                    coreWord: r.coreWord,
                    latestWord: r.latestWord,
                    platform: toPlat,
                    link: '',  // 凭证无法复制，复制过去的数据默认无链接
                  }));
                  setReportRows((prev) => [...prev, ...newRows]);
                  setCopyMessage(`已复制 ${toCopy.length} 条到「${toPlat}」`);
                }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 ${isDark ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
              >
                <Copy className="w-3.5 h-3.5" /> 复制
              </button>
              {copyMessage && (
                <span className={`text-xs ${copyMessage.includes('已复制') ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-amber-400' : 'text-amber-600')}`}>
                  {copyMessage}
                </span>
              )}
            </div>
            <button
              onClick={addReportRow}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}
            >
              + 添加
            </button>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className={isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-slate-50 text-slate-500'}>
                  <th className="text-left py-2 pr-2 w-16">排名</th>
                  <th className="text-left py-2 pr-2">核心词</th>
                  <th className="text-left py-2 pr-2">最新语义结果</th>
                  <th className="text-left py-2 pr-2 w-28">平台</th>
                  <th className="text-left py-2 pr-2">链接</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {reportRows.map((r, i) => (
                  <tr key={i} className={isDark ? 'border-t border-white/5' : 'border-t border-slate-100'}>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        value={r.rank}
                        onChange={(e) => updateReportRow(i, 'rank', parseInt(e.target.value, 10) || i + 1)}
                        className={`${inputCls} w-14`}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input value={r.coreWord} onChange={(e) => updateReportRow(i, 'coreWord', e.target.value)} className={inputCls} />
                    </td>
                    <td className="py-2 pr-2">
                      <input value={r.latestWord} onChange={(e) => updateReportRow(i, 'latestWord', e.target.value)} className={inputCls} />
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        value={r.platform}
                        onChange={(e) => updateReportRow(i, 'platform', e.target.value)}
                        className={inputCls}
                      >
                        {reportDetailPlatforms.filter(Boolean).map((p) => (
                          <option key={p} value={p}>{p || '(未命名)'}</option>
                        ))}
                        {reportDetailPlatforms.length === 0 && <option value="">请先添加平台</option>}
                        {reportDetailPlatforms.length > 0 && !reportDetailPlatforms.includes(r.platform) && r.platform && (
                          <option value={r.platform}>{r.platform} (已废弃)</option>
                        )}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <input value={r.link} onChange={(e) => updateReportRow(i, 'link', e.target.value)} className={inputCls} placeholder="URL" />
                    </td>
                    <td>
                      <button onClick={() => removeReportRow(i)} className={`text-xs font-semibold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              saving ? 'opacity-60 cursor-not-allowed' : ''
            } ${isDark ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' : 'bg-gradient-coral text-white shadow-coral hover:opacity-95'}`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditDataScreenForm;
