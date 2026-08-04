import React, { useState } from 'react';
import { CheckCircle2, Copy } from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';

export function CopyBlock({
  label,
  code,
  isDark,
}: {
  label?: string;
  code: string;
  isDark: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void copyToClipboard(code).then((ok) => {
      if (!ok) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-2">
      {label ? (
        <p className={`text-xs font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{label}</p>
      ) : null}
      <div className="flex gap-2 items-stretch">
        <pre
          className={`flex-1 overflow-x-auto text-xs p-3 rounded-xl font-mono leading-relaxed whitespace-pre-wrap break-all ${
            isDark ? 'bg-black/40 text-zinc-200 border border-zinc-800' : 'bg-slate-50 text-slate-800 border border-slate-200'
          }`}
        >
          {code}
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          title="复制"
          className={`shrink-0 px-3 rounded-xl font-bold flex items-center gap-1 text-sm ${
            copied
              ? 'bg-green-600 text-white'
              : isDark
                ? 'bg-zinc-700 text-white hover:bg-zinc-600'
                : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
          }`}
        >
          {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export function StepCard({
  step,
  title,
  icon,
  optional,
  children,
  isDark,
}: {
  step: number;
  title: string;
  icon: React.ReactNode;
  optional?: boolean;
  children: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <div
      className={`rounded-[2rem] p-8 border shadow-sm ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-start gap-4 mb-5">
        <div
          className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold ${
            isDark ? 'bg-geo-coral/15 text-geo-coral' : 'bg-red-50 text-geo-coral'
          }`}
        >
          {step}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={isDark ? 'text-geo-coral' : 'text-geo-coral'}>{icon}</span>
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
            {optional ? (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-500'
                }`}
              >
                可选
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className={`space-y-4 text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
        {children}
      </div>
    </div>
  );
}
