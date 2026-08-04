import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isValidIsoRange, parseIsoDate, toIsoDate } from '../utils/dateRange';

interface AitripDateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  placeholder?: string;
  className?: string;
  /** 弹层右边缘与触发按钮右边缘对齐（筛选条靠右时使用） */
  alignRight?: boolean;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}

const dayFmt = new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' });
const monthFmt = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' });
const weekdayFmt = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' });

const WEEKDAYS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(2024, 0, 7 + i);
  return weekdayFmt.format(d);
});

const PANEL_WIDTH = 680;
const PANEL_GAP = 8;

const AitripDateRangePicker: React.FC<AitripDateRangePickerProps> = ({
  from,
  to,
  onChange,
  placeholder = '选择日期',
  className = '',
  alignRight = true,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  const [checkIn, setCheckIn] = useState<Date | null>(() => parseIsoDate(from));
  const [checkOut, setCheckOut] = useState<Date | null>(() => parseIsoDate(to));

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const updatePanelPos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const maxW = Math.min(PANEL_WIDTH, vw - 16);
    let left = alignRight ? rect.right - maxW : rect.left;
    left = Math.max(8, Math.min(left, vw - maxW - 8));
    setPanelPos({ top: rect.bottom + PANEL_GAP, left });
  }, [alignRight]);

  useEffect(() => {
    setCheckIn(parseIsoDate(from));
    setCheckOut(parseIsoDate(to));
  }, [from, to]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPos();
    const onLayout = () => updatePanelPos();
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);
    return () => {
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
    };
  }, [open, updatePanelPos]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label = useMemo(() => {
    if (checkIn && checkOut) return `${dayFmt.format(checkIn)} – ${dayFmt.format(checkOut)}`;
    if (checkIn) return dayFmt.format(checkIn);
    return placeholder;
  }, [checkIn, checkOut, placeholder]);

  const emitIfComplete = useCallback(
    (start: Date | null, end: Date | null) => {
      if (!start || !end) return;
      const f = toIsoDate(start);
      const t = toIsoDate(end);
      if (isValidIsoRange(f, t)) onChange(f, t);
    },
    [onChange],
  );

  const pickDate = (picked: Date) => {
    if (!checkIn || checkOut || picked <= checkIn) {
      setCheckIn(picked);
      setCheckOut(null);
      return;
    }
    setCheckOut(picked);
    emitIfComplete(checkIn, picked);
    setOpen(false);
  };

  const renderMonth = (year: number, month: number) => {
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: React.ReactNode[] = [];
    for (let i = 0; i < firstDow; i++) {
      cells.push(<span key={`pad-${i}`} />);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const isPast = d < today;
      const isStart = checkIn && sameDay(d, checkIn);
      const isEnd = checkOut && sameDay(d, checkOut);
      const inRange = checkIn && checkOut && d > checkIn && d < checkOut;
      let cls =
        'mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm transition';
      if (isPast) {
        cls += ' pointer-events-none text-slate-300';
      } else if (isStart || isEnd) {
        cls += ' bg-[#1a1a1a] font-semibold text-white';
      } else if (inRange) {
        cls += ' bg-slate-100 text-[#1a1a1a]';
      } else {
        cls += ' text-[#1a1a1a] hover:bg-slate-100';
      }
      cells.push(
        <button
          key={day}
          type="button"
          disabled={isPast}
          onClick={() => pickDate(d)}
          className={cls}
        >
          {day}
        </button>,
      );
    }
    return (
      <div className="min-w-0">
        <p className="mb-4 text-center text-[15px] font-semibold text-[#1a1a1a]">
          {monthFmt.format(new Date(year, month, 1))}
        </p>
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {WEEKDAYS.map((w) => (
            <span key={w} className="text-xs font-medium text-slate-400">
              {w}
            </span>
          ))}
          {cells}
        </div>
      </div>
    );
  };

  const base = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const next = new Date(base.getFullYear(), base.getMonth() + 1, 1);

  const panel = open ? (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="选择日期范围"
      style={{
        position: 'fixed',
        top: panelPos.top,
        left: panelPos.left,
        width: Math.min(PANEL_WIDTH, window.innerWidth - 16),
        zIndex: 9999,
      }}
      className="max-h-[min(72vh,calc(100vh-5rem))] overflow-y-auto rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_8px_40px_rgba(0,0,0,0.18)] sm:p-8"
    >
      <div className="relative">
        <button
          type="button"
          disabled={monthOffset <= 0}
          onClick={() => monthOffset > 0 && setMonthOffset((m) => m - 1)}
          className="absolute left-0 top-0 z-10 flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 disabled:cursor-default disabled:opacity-25"
          aria-label="上一月"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setMonthOffset((m) => m + 1)}
          className="absolute right-0 top-0 z-10 flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
          aria-label="下一月"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="grid grid-cols-2 gap-6 sm:gap-8">
          {renderMonth(base.getFullYear(), base.getMonth())}
          {renderMonth(next.getFullYear(), next.getMonth())}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((v) => !v);
        }}
        className={`rounded-lg border px-3 py-2 text-left text-sm outline-none transition-colors ${
          label === placeholder
            ? 'border-slate-300 bg-white text-slate-400'
            : 'border-slate-300 bg-white font-medium text-[#1a1a1a]'
        } hover:border-slate-400 focus:border-blue-500 min-w-[10rem]`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {label}
      </button>
      {panel && typeof document !== 'undefined' ? createPortal(panel, document.body) : null}
    </div>
  );
};

export default AitripDateRangePicker;
