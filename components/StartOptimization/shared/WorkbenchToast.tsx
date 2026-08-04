import React, { useEffect } from 'react';

export type WorkbenchToastKind = 'info' | 'error';

export type WorkbenchToastState = {
  text: string;
  key: number;
  kind?: WorkbenchToastKind;
} | null;

export function useWorkbenchToast(durationMs = 4000) {
  const [toast, setToast] = React.useState<WorkbenchToastState>(null);

  const showToast = React.useCallback((text: string) => {
    setToast({ text, key: Date.now(), kind: 'info' });
  }, []);

  const showErrorToast = React.useCallback((text: string) => {
    setToast({ text, key: Date.now(), kind: 'error' });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), durationMs);
    return () => window.clearTimeout(t);
  }, [toast, durationMs]);

  return { toast, showToast, showErrorToast, clearToast: () => setToast(null) };
}

const WorkbenchToast: React.FC<{ toast: WorkbenchToastState }> = ({ toast }) => {
  if (!toast) return null;
  const isError = toast.kind === 'error';
  return (
    <div
      key={toast.key}
      role="status"
      className={
        isError
          ? 'fixed left-1/2 top-4 z-[200] max-w-md -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-lg'
          : 'fixed left-1/2 top-4 z-[200] max-w-md -translate-x-1/2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow-lg'
      }
    >
      {toast.text}
    </div>
  );
};

export default WorkbenchToast;
