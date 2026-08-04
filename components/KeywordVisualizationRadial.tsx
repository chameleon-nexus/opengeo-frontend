import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import 'echarts-wordcloud';
import { ArrowLeft } from 'lucide-react';
import { Theme } from '../types';

interface KeywordVisualizationRadialProps {
  theme: Theme;
  coreKeywords: Array<{ text: string; score: number }>;
  longtailQuestions: Array<{ text: string; source_keyword: string }>;
  semanticExtensionQuestions: Array<{ text: string; source_keyword: string }>;
  brandName: string;
  productName: string | null;
  onBack: () => void;
}

const KeywordVisualizationRadial: React.FC<KeywordVisualizationRadialProps> = ({
  theme,
  coreKeywords,
  longtailQuestions,
  semanticExtensionQuestions,
  brandName,
  productName,
  onBack,
}) => {
  const isDark = theme === 'dark';
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  // 径向布局图表
  useEffect(() => {
    // 延迟初始化，确保DOM已经渲染
    let timer: NodeJS.Timeout;
    timer = setTimeout(() => {
      if (!chartRef.current) {
        console.warn('[KeywordVisualizationRadial] chartRef.current 为空，无法初始化图表');
        return;
      }

      // 创建节点和边
      const nodes: Array<{
        id: string;
        name: string;
        category: number;
        value: number;
        symbolSize: number;
        x?: number;
        y?: number;
        itemStyle?: { color: string };
        fixed?: boolean;
      }> = [];
      const links: Array<{ source: string; target: string; value: number }> = [];

      const categories = [
        { name: '核心词' },
        { name: '语义扩展词' },
      ];

      // 布局参数：核心(内圈) → 语义扩展(外圈)，两层同心圆
      const centerX = 0;
      const centerY = 0;
      const coreRadius = 0; // 核心词在圆心
      const extensionRadius = 280; // 语义扩展词在外圈

      // 第一层：核心词（内圈 - 圆心附近）
      coreKeywords.forEach((kw, index) => {
        const angle = (index / coreKeywords.length) * Math.PI * 2;
        const radius = coreRadius + Math.random() * 30; // 在圆心附近随机分布
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        nodes.push({
          id: `core-${kw.text}`,
          name: kw.text,
          category: 0,
          value: kw.score,
          symbolSize: Math.max(30, Math.min(70, kw.score * 0.8)),
          x: x,
          y: y,
          fixed: true, // 固定位置
          itemStyle: {
            color: isDark ? '#FF6B35' : '#FF8C42', // 橙色
          },
        });
      });

      // 第二层：语义扩展词（中圈）
      semanticExtensionQuestions.forEach((q, index) => {
        const sourceKeyword = q.source_keyword;
        const coreKeyword = coreKeywords.find(kw => kw.text === sourceKeyword);
        if (!coreKeyword) return;

        const coreIndex = coreKeywords.findIndex(kw => kw.text === sourceKeyword);
        const extensionsForCore = semanticExtensionQuestions.filter(eq => eq.source_keyword === sourceKeyword);
        const extensionIndex = extensionsForCore.findIndex(eq => eq.text === q.text);
        const baseAngle = (coreIndex / coreKeywords.length) * Math.PI * 2;
        const spreadAngle = Math.PI / 2;
        const angle = baseAngle + (extensionIndex / extensionsForCore.length - 0.5) * spreadAngle;
        const radius = extensionRadius + Math.random() * 30;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        const nodeId = `extension-${q.text}`;
        nodes.push({
          id: nodeId,
          name: q.text,
          category: 1,
          value: 5,
          symbolSize: 12,
          x: x,
          y: y,
          fixed: true,
          itemStyle: {
            color: isDark ? '#6BCF7F' : '#70AD47', // 绿色
          },
        });
        links.push({ source: `core-${sourceKeyword}`, target: nodeId, value: 1 });
      });

      // 初始化图表
      if (!chartInstanceRef.current && chartRef.current) {
        chartInstanceRef.current = echarts.init(chartRef.current);
        console.log('[KeywordVisualizationRadial] 径向布局图表初始化完成');
      } else if (chartInstanceRef.current && chartRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = echarts.init(chartRef.current);
        console.log('[KeywordVisualizationRadial] 径向布局图表重新初始化完成');
      }

      const option: echarts.EChartsOption = {
        backgroundColor: 'transparent',
        title: {
          text: '词条两层同心圆结构',
          left: 'center',
          top: 20,
          textStyle: {
            color: isDark ? '#FFFFFF' : '#1A1A1A',
            fontSize: 18,
            fontWeight: 'bold',
          },
        },
        tooltip: {
          trigger: 'item',
          formatter: (params: any) => {
            if (params.dataType === 'node') {
              return `${params.data.name}<br/>类别: ${categories[params.data.category].name}<br/>权重: ${params.data.value}`;
            }
            return '';
          },
          backgroundColor: isDark ? 'rgba(26, 26, 26, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          borderColor: isDark ? '#FF6B35' : '#FF8C42',
          textStyle: {
            color: isDark ? '#FFFFFF' : '#1A1A1A',
          },
        },
        legend: {
          orient: 'horizontal',
          left: 'center',
          bottom: 20,
          data: categories.map((c) => c.name),
          textStyle: {
            color: isDark ? '#FFFFFF' : '#1A1A1A',
          },
        },
        series: [
          {
            name: '词条关系',
            type: 'graph',
            layout: 'none', // 使用自定义坐标
            data: nodes,
            links: links,
            categories: categories,
            roam: true,
            label: {
              show: true,
              position: 'right',
              formatter: '{b}',
              fontSize: 9,
              color: isDark ? '#FFFFFF' : '#1A1A1A',
            },
            labelLayout: {
              hideOverlap: true,
            },
            emphasis: {
              focus: 'adjacency',
              lineStyle: {
                width: 3,
              },
            },
            lineStyle: {
              color: 'source',
              curveness: 0,
              opacity: isDark ? 0.5 : 0.3,
              width: 1,
            },
            // 添加同心圆背景提示（两层：核心 + 语义扩展）
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: {
                color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                width: 1,
                type: 'dashed',
              },
              data: [
                [
                  { x: centerX, y: centerY + extensionRadius },
                  { x: centerX, y: centerY - extensionRadius },
                ],
                [
                  { x: centerX + extensionRadius, y: centerY },
                  { x: centerX - extensionRadius, y: centerY },
                ],
              ],
            },
          },
        ],
      };

      if (chartInstanceRef.current) {
        chartInstanceRef.current.setOption(option);
        console.log('[KeywordVisualizationRadial] 径向布局图表数据已更新，节点数:', nodes.length, '边数:', links.length);
      }
    }, 100);

    // 响应式
    const handleResize = () => {
      chartInstanceRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [coreKeywords, semanticExtensionQuestions, isDark]);

  // 清理
  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
    };
  }, []);

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      {/* 顶部导航栏 */}
      <div className="flex items-center gap-4 mb-6 shrink-0">
        <button
          onClick={onBack}
          className={`p-2 rounded-xl transition-all hover-scale ${
            isDark
              ? 'hover:bg-geo-bg text-geo-text-sec hover:text-geo-blue'
              : 'hover:bg-slate-100 text-slate-600'
          }`}
          title="返回结果页"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2
            className={`text-2xl font-semibold tracking-tight ${
              isDark ? 'text-geo-text-main' : 'text-slate-900'
            }`}
          >
            同心圆两层结构图
          </h2>
          <p
            className={`text-sm font-bold opacity-60 ${
              isDark ? 'text-geo-text-sec' : 'text-slate-500'
            }`}
          >
            {brandName} {productName && `- ${productName}`}
          </p>
        </div>
      </div>

      {/* 图表区域 */}
      <div
        className={`flex-1 rounded-2xl border shadow-sm ${
          isDark ? 'bg-geo-card border-geo-border' : 'bg-white border-slate-100'
        }`}
      >
        <div className="h-full w-full min-h-[800px]" ref={chartRef} style={{ minHeight: '800px' }}></div>
      </div>
    </div>
  );
};

export default KeywordVisualizationRadial;
