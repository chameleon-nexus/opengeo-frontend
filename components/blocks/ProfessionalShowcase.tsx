
import React, { useState, useRef, useEffect } from 'react';
import { ProfessionalShowcase as ProfessionalShowcaseType } from '../../types/landing';
import { Theme } from '../../types';

interface ProfessionalShowcaseProps {
  title?: string;
  professionals?: Array<{
    id: string;
    title: string;
    description: string;
    detailTitle?: string;
    detailDescription?: string;
    backgroundImage?: string;
    detailImage?: string;
    gradient?: string;
    buttonText?: string;
    buttonUrl?: string;
  }>;
  theme: Theme;
}

const ProfessionalShowcase: React.FC<ProfessionalShowcaseProps> = ({ title, professionals, theme }) => {
  const isDark = theme === 'dark';
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!professionals || professionals.length === 0) {
    return null;
  }

  const handleMouseEnter = (index: number) => {
    setActiveIndex(index);
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  return (
    <section className={`py-8 sm:py-10 lg:py-16 ${
      isDark ? 'bg-geo-bg text-white' : 'bg-white text-slate-900'
    }`}>
      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-20">
        {title && (
          <div className="mb-8 sm:mb-12">
            <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-normal leading-normal ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {title}
            </h2>
          </div>
        )}

        {/* 桌面端悬停展开视图 */}
        <div ref={containerRef} className="hidden lg:flex gap-2 overflow-hidden">
          {professionals.map((professional, index) => {
            const isActive = activeIndex === index;
            const isExpanded = isHovering && isActive;
            
            return (
              <div
                key={professional.id}
                className={`relative flex h-[500px] flex-col overflow-hidden rounded-xl transition-all duration-300 ease-in-out ${
                  isExpanded ? 'flex-[2]' : 'flex-1'
                }`}
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseLeave={handleMouseLeave}
                style={{ minWidth: isExpanded ? '600px' : '124px' }}
              >
                {/* 背景图片 - 未展开时显示；展开时由预设背景遮罩，右侧大图复用此图 */}
                {professional.backgroundImage && (
                  <img
                    alt={professional.title}
                    src={professional.backgroundImage}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://via.placeholder.com/600x500/3B82F6/FFFFFF?text=${encodeURIComponent(professional.title)}`;
                    }}
                  />
                )}
                {/* 展开时预设渐变遮罩（与 SaaS 首页效果一致） */}
                {isExpanded && (
                  <div
                    className="absolute inset-0 z-[1]"
                    style={{
                      background: professional.gradient || 'linear-gradient(rgba(38, 72, 148, 0.88) 0%, rgba(58, 109, 247, 0.88) 100%)',
                    }}
                  />
                )}
                
                {/* 标题（展开与未展开同一标题） */}
                <p className="absolute left-0 top-0 z-[2] p-6 text-xl text-white whitespace-nowrap">
                  {professional.title}
                </p>
                
                {/* 详细信息（悬停展开：预设背景 + 右侧用非展开时的图 + 展开详情描述） */}
                <div
                  className={`relative z-[2] p-6 flex-1 w-full mt-16 transition-opacity duration-150 ${
                    isExpanded ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <div className="flex h-full flex-col gap-8">
                    {/* 悬停大图：优先 detailImage，否则用非展开时的背景图 */}
                    {(professional.detailImage || professional.backgroundImage) && (
                      <div className="absolute right-6 top-6 w-1/2 h-[280px]">
                        <img
                          alt={professional.title + ' detail'}
                          src={professional.detailImage || professional.backgroundImage}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://via.placeholder.com/400x280/3B82F6/FFFFFF?text=${encodeURIComponent(professional.title)}`;
                          }}
                        />
                      </div>
                    )}
                    {/* 内容区域：展开详情描述 */}
                    <div className={`flex-1 pr-16 ${professional.detailImage || professional.backgroundImage ? 'w-1/2' : 'w-full'}`}>
                      <div className="transition-opacity duration-[300ms] ease-in-out">
                        <p className="text-base text-white/90">
                          {professional.detailDescription || professional.description || ''}
                        </p>
                      </div>
                    </div>
                    
                    {/* 按钮区域 */}
                    {professional.buttonText && professional.buttonUrl && (
                      <div className="flex items-end gap-4 justify-end">
                        <div className="flex items-center gap-4">
                          <a
                            href={professional.buttonUrl}
                            className="group flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black focus:outline-none focus:bg-white/90 hover:bg-white/90 transition-colors"
                          >
                            {professional.buttonText}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 移动端网格视图 */}
        <div className="lg:hidden grid grid-cols-2 gap-4">
          {professionals.map((professional) => (
            <div
              key={professional.id}
              className="group w-full text-left transition-opacity focus:opacity-80 focus:outline-none"
            >
              <div className="relative w-full overflow-hidden rounded-xl h-[150px] sm:h-[200px]">
                {professional.backgroundImage ? (
                  <img
                    alt={professional.title}
                    src={professional.backgroundImage}
                    className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://via.placeholder.com/600x400/3B82F6/FFFFFF?text=${encodeURIComponent(professional.title)}`;
                    }}
                  />
                ) : (
                  <div className={`w-full h-full ${
                    isDark ? 'bg-zinc-800' : 'bg-slate-200'
                  }`} />
                )}
                <p className="relative p-4 sm:p-6 text-base sm:text-xl text-white z-[1]">
                  {professional.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProfessionalShowcase;
