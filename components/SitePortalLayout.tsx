import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Building2, LogOut } from 'lucide-react';
import { Theme, UserRole } from '../types';
import { getMyMerchant } from '../api/merchants';

const SiteList = lazy(() => import('./SiteList'));
const SiteWorkbench = lazy(() => import('./SiteWorkbench'));

const PageFallback = () => (
  <div className="flex-1 flex items-center justify-center text-slate-500">加载中...</div>
);

interface SitePortalLayoutProps {
  theme: Theme;
  username: string;
  userRole: UserRole;
  onLogout: () => void;
}

const SitePortalLayout: React.FC<SitePortalLayoutProps> = ({
  theme,
  username,
  userRole,
  onLogout,
}) => {
  const [siteWorkbenchId, setSiteWorkbenchId] = useState<number | null>(null);
  const [merchantName, setMerchantName] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    getMyMerchant()
      .then((m) => {
        if (!cancelled) setMerchantName(m.company_name || '');
      })
      .catch(() => {
        if (!cancelled) setMerchantName('');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openWorkbench = useCallback((siteId: number) => {
    setSiteWorkbenchId(siteId);
  }, []);

  const backToList = useCallback(() => {
    setSiteWorkbenchId(null);
  }, []);

  return (
    <div className="flex h-screen w-full flex-col bg-[#F5F5F7] text-slate-900 overflow-hidden">
      <header className="shrink-0 border-b border-slate-200/80 bg-white/90 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logo.png" alt="站点管理" className="h-8 w-8 object-contain shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">站点列表</p>
              {merchantName ? (
                <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                  <Building2 className="w-3 h-3 shrink-0" />
                  {merchantName}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline text-xs text-slate-500">{username}</span>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              <LogOut className="w-3.5 h-3.5" />
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden">
        <Suspense fallback={<PageFallback />}>
          {siteWorkbenchId == null ? (
            <SiteList
              theme={theme}
              userRole={userRole}
              onOpenWorkbench={openWorkbench}
              onOpenContentTasks={() => {}}
            />
          ) : (
            <SiteWorkbench
              theme={theme}
              siteId={siteWorkbenchId}
              currentBrand={null}
              onBack={backToList}
              onOpenContentTasks={() => {}}
              showContentTasksEntry={false}
            />
          )}
        </Suspense>
      </main>
    </div>
  );
};

export default SitePortalLayout;
