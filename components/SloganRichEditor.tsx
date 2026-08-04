import React, { useCallback, useEffect, useRef } from 'react';
import { normalizeSloganHtml, isSloganHtml, GRADIENT_CLASS } from '../utils/sloganHtml';

const FONT_SIZES = [
  { label: '特大 56px', px: '56px' },
  { label: '大 40px', px: '40px' },
  { label: '中 32px', px: '32px' },
  { label: '小 24px', px: '24px' },
] as const;

const COLORS = [
  { label: '黑色', style: 'color:#1a1a1a' },
  { label: '灰色', style: 'color:#64748b' },
  { label: '珊瑚渐变', gradient: true as const },
] as const;

function wrapSelection(tag: string, attrs: Record<string, string>) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  try {
    range.surroundContents(el);
  } catch {
    const text = sel.toString();
    if (!text) return;
    const attrStr = Object.entries(attrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    document.execCommand(
      'insertHTML',
      false,
      `<${tag}${attrStr ? ` ${attrStr}` : ''}>${text}</${tag}>`,
    );
  }
  sel.removeAllRanges();
}

interface Props {
  value: string;
  onChange: (html: string) => void;
}

const SloganRichEditor: React.FC<Props> = ({ value, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef('');

  const emitChange = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? '';
    lastValueRef.current = html;
    onChange(html);
  }, [onChange]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const display = value ? (isSloganHtml(value) ? value : normalizeSloganHtml(value)) : '';
    if (display !== lastValueRef.current && display !== el.innerHTML) {
      el.innerHTML = display;
      lastValueRef.current = display;
    }
  }, [value]);

  const applyFontSize = (px: string) => {
    wrapSelection('span', { style: `font-size:${px}` });
    emitChange();
  };

  const applyColor = (style: string) => {
    wrapSelection('span', { style });
    emitChange();
  };

  const applyGradient = () => {
    wrapSelection('span', { class: GRADIENT_CLASS });
    emitChange();
  };

  const insertLineBreak = () => {
    document.execCommand('insertLineBreak');
    emitChange();
  };

  const btnCls =
    'px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnCls} onClick={insertLineBreak}>
          换行
        </button>
        <select
          className={`${btnCls} cursor-pointer`}
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) applyFontSize(e.target.value);
            e.target.value = '';
          }}
        >
          <option value="" disabled>
            字号
          </option>
          {FONT_SIZES.map((s) => (
            <option key={s.px} value={s.px}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          className={`${btnCls} cursor-pointer`}
          defaultValue=""
          onChange={(e) => {
            const idx = Number(e.target.value);
            if (Number.isNaN(idx)) return;
            const c = COLORS[idx];
            if ('gradient' in c && c.gradient) applyGradient();
            else if ('style' in c) applyColor(c.style);
            e.target.value = '';
          }}
        >
          <option value="" disabled>
            文字颜色
          </option>
          {COLORS.map((c, i) => (
            <option key={c.label} value={i}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        className="slogan-rich-editor min-h-[120px] w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left font-black leading-tight text-[#1a1a1a] outline-none focus:border-blue-500"
        data-placeholder="选中文字后设置字号或颜色；换行请点「换行」"
      />

      <p className="text-xs text-slate-500">
        示例：第一行选「AI 全域优化」设为黑色 → 换行 → 第二行选「用珊瑚 GEO」设为珊瑚渐变。
      </p>

      <style>{`
        .slogan-rich-editor:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          font-weight: 500;
          font-size: 14px;
        }
        .slogan-rich-editor .${GRADIENT_CLASS} {
          background: linear-gradient(to right, #E8553F, #FF8A65);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
      `}</style>
    </div>
  );
};

export default SloganRichEditor;
