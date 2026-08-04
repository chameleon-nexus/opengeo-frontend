
import React from 'react';
import { Building2, Users, Target, Award, LogIn } from 'lucide-react';
import { Theme } from '../types';

interface HomePageProps {
  theme: Theme;
  onNavigateToLogin: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ theme, onNavigateToLogin }) => {
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen w-full ${isDark ? 'bg-geo-bg text-white' : 'bg-white text-slate-900'}`}>
      {/* Header with Login Button */}
      <header className={`border-b ${isDark ? 'border-white/10 bg-zinc-900' : 'border-slate-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className={`text-2xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            珊瑚GEO
          </h1>
          <button
            onClick={onNavigateToLogin}
            className={`px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
              isDark 
                ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' 
                : 'bg-gradient-coral text-white shadow-coral hover:opacity-95'
            }`}
          >
            <LogIn className="w-4 h-4" />
            登录
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className={`text-5xl font-semibold tracking-tight mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            珊瑚GEO
          </h1>
          <p className={`text-xl ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            企业信息展示页面
          </p>
          <p className={`text-sm mt-2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
            （此页面待完善）
          </p>
        </div>

        {/* Placeholder Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Building2, title: '企业信息', desc: '公司介绍' },
            { icon: Users, title: '团队介绍', desc: '核心团队' },
            { icon: Target, title: '产品服务', desc: '产品展示' },
            { icon: Award, title: '荣誉资质', desc: '企业荣誉' },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className={`p-8 rounded-2xl border ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-slate-200'}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  isDark ? 'bg-zinc-800' : 'bg-slate-100'
                }`}>
                  <Icon className={`w-6 h-6 ${isDark ? 'text-geo-blue' : 'text-blue-500'}`} />
                </div>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {item.title}
                </h3>
                <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
