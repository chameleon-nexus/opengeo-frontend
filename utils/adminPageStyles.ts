export const ADMIN_PAGE_SHELL_CLS = 'max-w-7xl mx-auto px-6 py-8 space-y-6';

export function adminPageOuterCls(isDark: boolean): string {
  return `flex-1 flex flex-col h-full min-h-0 overflow-hidden transition-colors duration-500 ${
    isDark ? 'bg-geo-bg text-white' : 'bg-[#F5F5F7] text-slate-900'
  }`;
}

export function adminLoadingCls(isDark: boolean): string {
  return `flex-1 flex items-center justify-center min-h-[12rem] ${
    isDark ? 'bg-geo-bg text-zinc-400' : 'bg-[#F5F5F7] text-slate-500'
  }`;
}

export function adminCardCls(isDark: boolean): string {
  return `rounded-2xl border overflow-hidden shadow-sm transition-colors ${
    isDark ? 'bg-zinc-900/40 border-zinc-700' : 'bg-white border-gray-200'
  }`;
}

export function adminToolbarBorder(isDark: boolean): string {
  return isDark ? 'border-zinc-700/80' : 'border-gray-100';
}

export function adminRowHoverCls(isDark: boolean): string {
  return isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-[#FFF9F6]/80';
}

export function adminTitleCls(isDark: boolean): string {
  return `text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`;
}

export function adminSubtitleCls(isDark: boolean): string {
  return `mt-1 text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`;
}
