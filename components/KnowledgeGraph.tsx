import React from 'react';
import { Network, Database, GitBranch, Link2, Search, Filter } from 'lucide-react';
import { Theme, Brand } from '../types';

interface KnowledgeGraphProps {
  theme: Theme;
  currentBrand: Brand;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ theme, currentBrand }) => {
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen p-8 ${isDark ? 'bg-geo-bg' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`mb-8 p-8 rounded-2xl border shadow-sm ${isDark ? 'bg-geo-card border-geo-border' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-4 rounded-2xl ${isDark ? 'bg-gradient-coral shadow-coral hover:opacity-95' : 'bg-blue-500 text-white'}`}>
              <Network className="w-8 h-8" />
            </div>
            <div>
              <h1 className={`text-3xl font-semibold tracking-tight ${isDark ? 'text-geo-text-main' : 'text-slate-900'}`}>
                知识图谱
              </h1>
              <p className={`text-sm mt-1 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>
                可视化品牌知识实体关系网络
              </p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className={`p-8 rounded-2xl border shadow-sm ${isDark ? 'bg-geo-card border-geo-border' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <div className={`p-6 rounded-full mb-6 ${isDark ? 'bg-geo-bg' : 'bg-slate-100'}`}>
              <Network className={`w-16 h-16 ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`} />
            </div>
            <h2 className={`text-2xl font-semibold mb-3 ${isDark ? 'text-geo-text-main' : 'text-slate-900'}`}>
              知识图谱功能开发中
            </h2>
            <p className={`text-sm max-w-md ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>
              该功能将展示品牌知识实体之间的关系网络，包括产品、特性、场景等实体及其关联关系。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraph;

