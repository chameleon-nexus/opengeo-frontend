import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{js,ts,jsx,tsx}',
    './api/**/*.{js,ts,jsx,tsx}',
    './types.ts',
  ],
  /** 主操作类名强制保留，避免漏扫导致全站珊瑚按钮无样式 */
  safelist: [
    'bg-gradient-coral',
    'shadow-coral',
    'text-white',
    'border-[#E8553F]',
    'hover:opacity-95',
  ],
  theme: {
    extend: {
      colors: {
        'geo-bg': '#1A1A1A',
        'geo-card': '#262626',
        'geo-border': '#404040',
        'geo-text-main': '#F5F5F5',
        'geo-text-sec': '#A3A3A3',
        /** 主色：珊瑚（与「快速开始」一致；原 geo-blue 实为品牌主色） */
        'geo-orange': '#E8553F',
        'geo-blue': '#E8553F',
        coral: {
          500: '#E8553F',
          400: '#FF9B85',
        },
      },
      backgroundImage: {
        'gradient-coral': 'linear-gradient(to right, #E8553F, #FF9B85)',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'apple': '0 4px 24px -1px rgba(0, 0, 0, 0.04)',
        'apple-hover': '0 8px 32px -4px rgba(0, 0, 0, 0.08)',
        'orange-glow': '0 0 15px rgba(232, 85, 63, 0.35)',
        'blue-glow': '0 0 15px rgba(232, 85, 63, 0.35)',
        coral: '0 4px 14px -2px rgba(232, 85, 63, 0.28)',
      },
    },
  },
  plugins: [typography],
};
