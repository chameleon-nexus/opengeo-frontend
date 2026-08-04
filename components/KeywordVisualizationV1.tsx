import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import 'echarts-wordcloud';
import { ArrowLeft } from 'lucide-react';
import { Theme } from '../types';

interface KeywordVisualizationV1Props {
  theme: Theme;
  coreKeywords: Array<{ text: string; score: number }>;
  longtailQuestions: Array<{ text: string; source_keyword: string }>;
  semanticExtensionQuestions: Array<{ text: string; source_keyword: string }>;
  brandName: string;
  productName: string | null;
  onBack: () => void;
}

const KeywordVisualizationV1: React.FC<KeywordVisualizationV1Props> = ({
  theme,
  coreKeywords,
  longtailQuestions,
  semanticExtensionQuestions,
  brandName,
  productName,
  onBack,
}) => {
  const isDark = theme === 'dark';
  const wordCloudRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  const wordCloudChartRef = useRef<echarts.ECharts | null>(null);
  const graphChartRef = useRef<echarts.ECharts | null>(null);

  // 词云图数据转换
  const wordCloudData = coreKeywords.map(kw => ({
    name: kw.text,
    value: kw.score,
  }));

  // 关系网络图数据转换
  useEffect(() => {
    // 延迟初始化，确保DOM已经渲染
    const timer = setTimeout(() => {
      if (!graphRef.current) {
        console.warn('[KeywordVisualizationV1] graphRef.current 为空，无法初始化关系网络图');
        return;
      }

      // 创建节点和边
      const nodes: Array<{
        id: string;
        name: string;
        category: number;
        value: number;
        symbolSize: number;
        itemStyle?: { color: string };
      }> = [];
      const links: Array<{ source: string; target: string; value: number }> = [];
      const categories = [
        { name: '核心词' },
        { name: '长尾词' },
      ];

      // 添加核心词节点
      coreKeywords.forEach((kw) => {
        nodes.push({
          id: `core-${kw.text}`,
          name: kw.text,
          category: 0,
          value: kw.score,
          symbolSize: Math.max(20, Math.min(60, kw.score * 0.6)),
          itemStyle: {
            color: isDark ? '#FF6B35' : '#FF8C42', // 橙色
          },
        });
      });

      // 添加长尾词节点
      longtailQuestions.forEach((q) => {
        const nodeId = `longtail-${q.text}`;
        nodes.push({
          id: nodeId,
          name: q.text,
          category: 1,
          value: 10,
          symbolSize: 15,
          itemStyle: {
            color: isDark ? '#4A90E2' : '#5B9BD5', // 蓝色
          },
        });
        // 连接到对应的核心词
        const sourceNodeId = `core-${q.source_keyword}`;
        if (nodes.find((n) => n.id === sourceNodeId)) {
          links.push({
            source: sourceNodeId,
            target: nodeId,
            value: 1,
          });
        }
      });

      // 语义扩展词已移除，不再显示

      // 初始化图表
      if (!graphChartRef.current && graphRef.current) {
        graphChartRef.current = echarts.init(graphRef.current);
        console.log('[KeywordVisualizationV1] 关系网络图初始化完成');
      } else if (graphChartRef.current && graphRef.current) {
        // 如果图表已存在，先销毁再重新初始化（避免重复初始化错误）
        graphChartRef.current.dispose();
        graphChartRef.current = echarts.init(graphRef.current);
        console.log('[KeywordVisualizationV1] 关系网络图重新初始化完成');
      }

      const option: echarts.EChartsOption = {
        backgroundColor: 'transparent',
        title: {
          text: '词条关系网络图',
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
          orient: 'vertical',
          left: 'left',
          top: 'middle',
          data: categories.map((c) => c.name),
          textStyle: {
            color: isDark ? '#FFFFFF' : '#1A1A1A',
          },
        },
        series: [
          {
            name: '词条关系',
            type: 'graph',
            layout: 'force',
            data: nodes,
            links: links,
            categories: categories,
            roam: true,
            label: {
              show: true,
              position: 'right',
              formatter: '{b}',
              fontSize: 10,
              color: isDark ? '#FFFFFF' : '#1A1A1A',
            },
            labelLayout: {
              hideOverlap: true,
            },
            emphasis: {
              focus: 'adjacency',
              lineStyle: {
                width: 4,
              },
            },
            lineStyle: {
              color: 'source',
              curveness: 0.3,
              opacity: isDark ? 0.6 : 0.4,
            },
            force: {
              repulsion: 200,
              gravity: 0.1,
              edgeLength: 100,
              layoutAnimation: true,
            },
          },
        ],
      };

      if (graphChartRef.current) {
        graphChartRef.current.setOption(option);
        console.log('[KeywordVisualizationV1] 关系网络图数据已更新，节点数:', nodes.length, '边数:', links.length);
      }
    }, 100); // 延迟100ms，确保DOM已渲染

    // 响应式
    const handleResize = () => {
      graphChartRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [coreKeywords, longtailQuestions, semanticExtensionQuestions, isDark]);

  // 词云图
  useEffect(() => {
    // 延迟初始化，确保DOM已经渲染
    const timer = setTimeout(() => {
      if (!wordCloudRef.current) {
        console.warn('[KeywordVisualizationV1] wordCloudRef.current 为空，无法初始化词云图');
        return;
      }
      
      if (wordCloudData.length === 0) {
        console.warn('[KeywordVisualizationV1] 词云图数据为空');
        return;
      }

      // 初始化图表
      if (!wordCloudChartRef.current && wordCloudRef.current) {
        wordCloudChartRef.current = echarts.init(wordCloudRef.current);
        console.log('[KeywordVisualizationV1] 词云图初始化完成');
      } else if (wordCloudChartRef.current && wordCloudRef.current) {
        // 如果图表已存在，先销毁再重新初始化（避免重复初始化错误）
        wordCloudChartRef.current.dispose();
        wordCloudChartRef.current = echarts.init(wordCloudRef.current);
        console.log('[KeywordVisualizationV1] 词云图重新初始化完成');
      }

      const option: echarts.EChartsOption = {
        backgroundColor: 'transparent',
        title: {
          text: '核心词词云图',
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
            return `${params.name}<br/>热度: ${params.value}`;
          },
          backgroundColor: isDark ? 'rgba(26, 26, 26, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          borderColor: isDark ? '#FF6B35' : '#FF8C42',
          textStyle: {
            color: isDark ? '#FFFFFF' : '#1A1A1A',
          },
        },
        series: [
          {
            type: 'wordCloud',
            gridSize: 8,
            sizeRange: [12, 60],
            rotationRange: [-45, 45],
            shape: 'circle',
            width: '100%',
            height: '100%',
            drawOutOfBound: false,
            textStyle: {
              fontFamily: 'Arial, sans-serif',
              fontWeight: 'bold',
              color: () => {
                const colors = isDark
                  ? ['#FF6B35', '#FF8C42', '#FFA726', '#FFB74D', '#FFCC80']
                  : ['#FF6B35', '#FF8C42', '#FFA726', '#FFB74D', '#FFCC80'];
                return colors[Math.floor(Math.random() * colors.length)];
              },
            },
            emphasis: {
              textStyle: {
                shadowBlur: 10,
                shadowColor: isDark ? '#FF6B35' : '#FF8C42',
              },
            },
            data: wordCloudData,
          },
        ],
      };

      if (wordCloudChartRef.current) {
        wordCloudChartRef.current.setOption(option);
        console.log('[KeywordVisualizationV1] 词云图数据已更新，词数:', wordCloudData.length);
      }
    }, 100); // 延迟100ms，确保DOM已渲染

    // 响应式
    const handleResize = () => {
      wordCloudChartRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [wordCloudData, isDark]);

  // 清理
  useEffect(() => {
    return () => {
      wordCloudChartRef.current?.dispose();
      graphChartRef.current?.dispose();
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
            方案1：词云图 + 关系网络图
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

      {/* 词云图区域 */}
      <div
        className={`mb-6 rounded-2xl border shadow-sm ${
          isDark ? 'bg-geo-card border-geo-border' : 'bg-white border-slate-100'
        }`}
      >
        <div className="h-[400px] w-full min-h-[400px]" ref={wordCloudRef} style={{ minHeight: '400px' }}></div>
      </div>

      {/* 关系网络图区域 */}
      <div
        className={`rounded-2xl border shadow-sm ${
          isDark ? 'bg-geo-card border-geo-border' : 'bg-white border-slate-100'
        }`}
      >
        <div className="h-[600px] w-full min-h-[600px]" ref={graphRef} style={{ minHeight: '600px' }}></div>
      </div>
    </div>
  );
};

export default KeywordVisualizationV1;
