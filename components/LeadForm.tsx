import React, { useState } from 'react';

export interface LeadFormProps {
  merchantName: string;
  theme?: 'light' | 'dark';
  onSubmit?: (data: { name?: string; phone?: string; email?: string; agreed: boolean }) => void;
}

const LeadForm: React.FC<LeadFormProps> = ({ merchantName, theme = 'light', onSubmit }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isDark = theme === 'dark';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    onSubmit?.({ name, phone, email, agreed });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className={`p-6 rounded-xl text-center ${isDark ? 'bg-zinc-800/50 text-zinc-300' : 'bg-slate-100 text-slate-700'}`}>
        感谢提交，我们会尽快与您联系。
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="姓名"
        value={name}
        onChange={e => setName(e.target.value)}
        className={`w-full px-4 py-3 rounded-xl border outline-none ${isDark ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
      />
      <input
        type="tel"
        placeholder="手机号"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        className={`w-full px-4 py-3 rounded-xl border outline-none ${isDark ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
      />
      <input
        type="email"
        placeholder="邮箱"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className={`w-full px-4 py-3 rounded-xl border outline-none ${isDark ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
      />
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          className="mt-1 rounded border-slate-300"
        />
        <span className={`text-sm ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
          我同意 <strong>{merchantName}</strong> 的《隐私政策》，并授权其通过电话/邮件联系我。
        </span>
      </label>
      <button
        type="submit"
        disabled={!agreed}
        className="w-full py-3 rounded-xl font-bold bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
      >
        提交
      </button>
    </form>
  );
};

export default LeadForm;
