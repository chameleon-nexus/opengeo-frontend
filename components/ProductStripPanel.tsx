import React from 'react';
import { FileSearch, Lightbulb, Stethoscope } from 'lucide-react';

export const PRODUCT_STRIP_CARDS = [
  {
    href: '/brand-diagnosis' as const,
    title: '品牌诊断',
    lines: ['AI 平台品牌可见性与引用机会自检', '多平台勾选，一键发起诊断'],
    Icon: Stethoscope,
  },
  {
    href: '/source-analysis' as const,
    title: '信源分析',
    lines: ['梳理 AI 回答中的信源与引用结构', '对比竞品与行业基准'],
    Icon: FileSearch,
  },
  {
    href: '/optimization-advice' as const,
    title: '优化建议',
    lines: ['可执行的 GEO 与内容优化清单', '从诊断到落地的优先级建议'],
    Icon: Lightbulb,
  },
];

interface ProductStripPanelProps {
  className?: string;
}

/**
 * 首页三栏 / 顶栏浮层：品牌诊断、信源分析、优化建议
 */
const ProductStripPanel: React.FC<ProductStripPanelProps> = ({ className = '' }) => {
  return (
    <div className={`bg-white ${className}`.trim()}>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 py-10 sm:px-8 md:grid-cols-3 md:gap-8 md:py-12 lg:gap-12 lg:px-10">
        {PRODUCT_STRIP_CARDS.map((card) => {
          const Icon = card.Icon;
          return (
            <a
              key={card.href}
              href={card.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center text-center md:items-start md:text-left"
            >
              <div className="relative mb-4 flex h-[72px] w-[72px] shrink-0 items-center justify-center transition group-hover:scale-[1.02]">
                <Icon
                  className="h-[52px] w-[52px] text-[#1a1a1a] group-hover:text-[#E8553F]"
                  strokeWidth={1.35}
                  aria-hidden
                />
              </div>

              <h2 className="mb-3 text-[17px] font-bold tracking-tight text-[#1a1a1a] group-hover:text-[#5b21b6] sm:text-lg">
                {card.title}
              </h2>
              <div className="flex max-w-sm flex-col gap-1.5 text-[13px] leading-relaxed text-[#6b7280] sm:text-sm">
                {card.lines.map((line) => (
                  <p key={line} className="line-clamp-3">
                    {line}
                  </p>
                ))}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default ProductStripPanel;
