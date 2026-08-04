import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import type { FormField, FormFieldOption } from '../types';
import AiPlatformPicker from '../../shared/AiPlatformPicker';

interface Props {
  formId: string;
  title: string;
  fields: FormField[];
  submitTarget?: string;
  onSubmit: (message: string, payload: Record<string, unknown>) => Promise<unknown>;
}

const FormCard: React.FC<Props> = ({
  formId,
  title,
  fields,
  submitTarget,
  onSubmit,
}) => {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [multi, setMulti] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const v: Record<string, string> = {};
    const m: Record<string, string[]> = {};
    for (const f of fields) {
      if (f.type === 'multiselect' || f.type === 'ai_platform_picker') {
        if (f.defaultValues?.length) m[f.name] = [...f.defaultValues];
      } else if (f.defaultValue) {
        v[f.name] = f.defaultValue;
      }
    }
    setValues(v);
    setMulti(m);
  }, [formId, fields]);

  const getVal = (n: string) => values[n] ?? '';
  const setVal = (n: string, t: string) => setValues((p) => ({ ...p, [n]: t }));

  const toggleMulti = (name: string, value: string) => {
    setMulti((prev) => {
      const cur = new Set(prev[name] ?? []);
      if (cur.has(value)) cur.delete(value);
      else cur.add(value);
      return { ...prev, [name]: Array.from(cur) };
    });
  };

  const handleSubmit = useCallback(async () => {
    for (const f of fields) {
      if (f.required) {
        if (f.type === 'multiselect' || f.type === 'ai_platform_picker') {
          if (!(multi[f.name] || []).length) {
            setErr(`请填写：${f.label}`);
            return;
          }
        } else {
          if (!getVal(f.name).trim()) {
            setErr(`请填写：${f.label}`);
            return;
          }
        }
      }
    }
    setErr(null);
    setSending(true);
    try {
      const msg = (submitTarget && submitTarget.trim()) || `form_submit:${formId}`;
      const payload: Record<string, unknown> = {};
      for (const f of fields) {
        if (f.type === 'multiselect' || f.type === 'ai_platform_picker') {
          payload[f.name] = multi[f.name] ?? [];
        } else if (f.type === 'number') {
          const s = getVal(f.name).trim();
          payload[f.name] = s ? Number(s) : undefined;
        } else {
          payload[f.name] = getVal(f.name);
        }
      }
      await onSubmit(msg, payload);
      setDone(true);
    } catch (e: unknown) {
      setErr((e as Error)?.message || String(e));
    } finally {
      setSending(false);
    }
  }, [fields, formId, onSubmit, submitTarget, values, multi]);

  const renderField = (f: FormField) => {
    const opts: FormFieldOption[] = f.options || [];
    switch (f.type) {
      case 'textarea':
        return (
          <textarea
            className="w-full text-xs rounded-md border border-gray-200 px-2 py-1.5"
            rows={3}
            value={getVal(f.name)}
            onChange={(e) => setVal(f.name, e.target.value)}
            disabled={done}
          />
        );
      case 'select':
        return (
          <select
            className="w-full text-xs rounded-md border border-gray-200 px-2 py-1.5"
            value={getVal(f.name)}
            onChange={(e) => setVal(f.name, e.target.value)}
            disabled={done}
          >
            <option value="">请选择</option>
            {opts.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      case 'ai_platform_picker':
        return (
          <AiPlatformPicker
            selected={new Set(multi[f.name] || [])}
            onChange={(next) => {
              if (done) return;
              setMulti((prev) => ({ ...prev, [f.name]: Array.from(next) }));
            }}
            label={f.label}
          />
        );
      case 'multiselect':
        return (
          <div className="flex flex-wrap gap-1.5">
            {opts.map((o) => {
              const on = (multi[f.name] || []).includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  disabled={done}
                  onClick={() => toggleMulti(f.name, o.value)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors
                    ${on ? 'bg-[#E8553F] text-white border-[#E8553F]' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        );
      case 'number':
        return (
          <input
            type="number"
            className="w-full text-xs rounded-md border border-gray-200 px-2 py-1.5"
            value={getVal(f.name)}
            onChange={(e) => setVal(f.name, e.target.value)}
            disabled={done}
          />
        );
      default:
        return (
          <input
            type="text"
            className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/20 focus:border-[#E8553F]/50"
            value={getVal(f.name)}
            onChange={(e) => setVal(f.name, e.target.value)}
            placeholder={f.placeholder}
            disabled={done}
          />
        );
    }
  };

  return (
    <div className="rounded-xl border border-[#E8553F]/20 bg-gradient-to-b from-[#FFF6F2] to-white px-3 py-2.5 text-left shadow-sm">
      <div className="text-xs font-semibold text-gray-900 mb-2">{title}</div>
      <div className="space-y-2.5">
        {fields.map((f) => (
          <div key={f.name}>
            {f.type !== 'ai_platform_picker' ? (
              <div className="text-sm font-medium text-gray-700 mb-1.5">
                {f.label}
                {f.required ? <span className="text-[#E8553F] ml-0.5">*</span> : null}
              </div>
            ) : null}
            {renderField(f)}
          </div>
        ))}
      </div>
      {err && <div className="mt-2 text-[10px] text-red-500">{err}</div>}
      {done ? (
        <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-600">
          <Check className="w-3.5 h-3.5" />
          已提交
        </div>
      ) : (
        <button
          type="button"
          disabled={sending}
          onClick={() => void handleSubmit()}
          className="mt-3 w-full rounded-lg bg-[#E8553F] text-white text-xs py-1.5 flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {sending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          提交
        </button>
      )}
    </div>
  );
};

export default FormCard;
