/**
 * 诊断报告「正面提及词」echarts 词云（与 DataScreen / KeywordVisualizationV1 同源能力）
 */

import React, { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import 'echarts-wordcloud';
import { Theme } from '../types';

const WORDCLOUD_NAME_MAX = 14;
const MAX_WORDS = 20;

type WordCloudDatum = {
  name: string;
  value: number;
  fullName: string;
};

function truncateWordCloudLabel(text: string): string {
  const s = String(text || '').trim();
  if (s.length <= WORDCLOUD_NAME_MAX) return s;
  return `${s.slice(0, WORDCLOUD_NAME_MAX)}…`;
}

function buildWordCloudData(keywords: string[]): WordCloudDatum[] {
  const seen = new Set<string>();
  const out: WordCloudDatum[] = [];
  for (const raw of keywords) {
    const fullName = String(raw || '').trim();
    if (!fullName) continue;
    const name = truncateWordCloudLabel(fullName);
    if (seen.has(name)) continue;
    seen.add(name);
    out.push({ name, fullName, value: 0 });
    if (out.length >= MAX_WORDS) break;
  }
  const n = out.length;
  out.forEach((item, i) => {
    // 按 LLM 返回顺序赋权：越靠前越大，拉开 sizeRange 层次
    item.value = Math.max(12, Math.round(100 - (i * 85) / Math.max(1, n - 1)));
  });
  return out;
}

interface PositiveKeywordsWordCloudProps {
  theme: Theme;
  keywords: string[];
  className?: string;
}

const PositiveKeywordsWordCloud: React.FC<PositiveKeywordsWordCloudProps> = ({
  theme,
  keywords,
  className = '',
}) => {
  const isDark = theme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  const seriesData = useMemo(() => buildWordCloudData(keywords), [keywords]);

  useEffect(() => {
    const el = containerRef.current;
    if (!seriesData.length) {
      chartRef.current?.dispose();
      chartRef.current = null;
      return;
    }

    let cancelled = false;
    let ro: ResizeObserver | null = null;

    const mount = () => {
      if (cancelled || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const w = Math.max(280, Math.floor(rect.width));
      const h = Math.max(260, Math.floor(rect.height));
      if (w < 80 || h < 80) {
        requestAnimationFrame(mount);
        return;
      }

      chartRef.current?.dispose();
      chartRef.current = null;
      const chart = echarts.init(containerRef.current);
      chartRef.current = chart;

      const sizeMax = Math.min(56, Math.max(28, Math.floor(Math.min(w, h) / 5.5)));
      const sizeMin = Math.max(14, Math.floor(sizeMax * 0.32));

      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          formatter: (params: { name?: string; data?: WordCloudDatum; value?: number }) => {
            const full = params.data?.fullName ?? params.name ?? '';
            const val = params.value ?? '';
            return `${full}<br/>权重: ${val}`;
          },
          backgroundColor: isDark ? 'rgba(26,26,26,0.92)' : 'rgba(255,255,255,0.95)',
          borderColor: isDark ? 'rgba(139,92,246,0.5)' : 'rgba(124,58,237,0.35)',
          textStyle: { color: isDark ? '#f4f4f5' : '#1e293b' },
        },
        series: [
          {
            type: 'wordCloud',
            gridSize: 6,
            sizeRange: [sizeMin, sizeMax],
            rotationRange: [-45, 45],
            rotationStep: 15,
            shape: 'circle',
            left: 'center',
            top: 'center',
            width: w,
            height: h,
            drawOutOfBound: false,
            textStyle: {
              fontFamily: 'Noto Sans SC, Inter, system-ui, sans-serif',
              fontWeight: 'bold',
              color: () => {
                const colors = isDark
                  ? ['#c4b5fd', '#a78bfa', '#f0abfc', '#818cf8', '#e879f9', '#67e8f9']
                  : ['#6d28d9', '#7c3aed', '#9333ea', '#c026d3', '#4f46e5', '#0891b2'];
                return colors[Math.floor(Math.random() * colors.length)];
              },
            },
            emphasis: {
              focus: 'self',
              textStyle: {
                shadowBlur: 12,
                shadowColor: isDark ? 'rgba(167,139,250,0.65)' : 'rgba(124,58,237,0.45)',
              },
            },
            data: seriesData,
          },
        ],
      });
      chart.resize({ width: w, height: h });
    };

    const timer = window.setTimeout(mount, 120);

    const onResize = () => {
      const box = containerRef.current?.getBoundingClientRect();
      if (!box || !chartRef.current) return;
      chartRef.current.resize({ width: Math.floor(box.width), height: Math.floor(box.height) });
    };
    window.addEventListener('resize', onResize);
    if (typeof ResizeObserver !== 'undefined' && el) {
      ro = new ResizeObserver(onResize);
      ro.observe(el);
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [seriesData, isDark]);

  if (!seriesData.length) {
    return null;
  }

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className={`w-full h-[280px] md:h-[320px] rounded-xl ${
          isDark ? 'bg-zinc-900/40' : 'bg-violet-50/50'
        }`}
        style={{ minHeight: 260 }}
        aria-label="正面提及词词云"
      />
    </div>
  );
};

export default PositiveKeywordsWordCloud;
