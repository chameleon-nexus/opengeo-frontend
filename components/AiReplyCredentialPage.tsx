import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link as LinkIcon, Sparkles } from 'lucide-react';
import {
  AI_CREDENTIAL_STORAGE_PREFIX,
  credentialPlatformIconUrl,
  type AiCredentialStored,
} from '../utils/aiCredentialView';

/** 兼容旧格式：历史上曾包一层 `{ expiresAt, payload }`（不再校验时间）。 */
function parseStoredCredential(raw: string): AiCredentialStored | null {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object') return null;
  const o = parsed as Record<string, unknown>;
  if (o.payload && typeof o.payload === 'object') {
    return o.payload as AiCredentialStored;
  }
  if ('question' in o || 'aiAnswer' in o) {
    return parsed as AiCredentialStored;
  }
  return null;
}

/** 卡片大标题（豆包线程风格：单行概括，过长则标点处截断） */
function cardTitleFromQuestion(question: string): string {
  const t = question.trim().replace(/\s+/g, ' ');
  if (!t || t === '—') return '问询凭证';
  if (t.length <= 44) return t;
  const cut = t.slice(0, 44);
  const lastBreak = Math.max(cut.lastIndexOf('，'), cut.lastIndexOf('。'), cut.lastIndexOf('？'), cut.lastIndexOf('、'));
  const head = lastBreak > 18 ? cut.slice(0, lastBreak) : cut;
  return `${head}…`;
}

/** 公开路由 /credential ：展示单条问询与模型回复（读 localStorage，跨新标签可读）。豆包线程式版式参考。 */
export default function AiReplyCredentialPage({ queryKey }: { queryKey: string | null }) {
  const [data, setData] = useState<AiCredentialStored | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const k = (queryKey || '').trim();
    if (!k) {
      setError('链接未携带凭证编号，请从分析明细点击「凭证」打开本页。');
      return;
    }
    const raw =
      typeof localStorage !== 'undefined' ? localStorage.getItem(AI_CREDENTIAL_STORAGE_PREFIX + k) : null;
    if (!raw) {
      setError(
        '本机暂无该编号对应的内容。请先在分析明细中点击「凭证」打开，或确认未清除本站数据且使用同一浏览器。',
      );
      return;
    }
    try {
      const payload = parseStoredCredential(raw);
      if (!payload) {
        setError('凭证数据格式无法识别，请从分析明细重新打开。');
        return;
      }
      if (!payload.question?.trim() && !payload.aiAnswer?.trim()) {
        setError('凭证数据不完整。');
        return;
      }
      setData(payload);
    } catch {
      setError('无法解析凭证数据，请从分析明细重新打开。');
    }
  }, [queryKey]);

  const headline = useMemo(() => cardTitleFromQuestion((data?.question || '').trim()), [data?.question]);

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{
          background:
            'linear-gradient(180deg, #e8f0ff 0%, #eef2fb 42%, #f3ecfa 72%, #f5f7fc 100%)',
        }}
      >
        <p className="text-sm text-slate-600 text-center max-w-md">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background:
            'linear-gradient(180deg, #e8f0ff 0%, #eef2fb 42%, #f3ecfa 72%, #f5f7fc 100%)',
        }}
      >
        <div className="w-10 h-10 border-[3px] border-slate-300 border-t-slate-600 rounded-full animate-spin" />
      </div>
    );
  }

  const q = (data.question || '').trim() || '—';
  const answer = (data.aiAnswer || '').trim();
  const platform = (data.platform || '').trim();
  const platformIcon = credentialPlatformIconUrl(platform);

  const proseCn =
    [
      'prose prose-slate max-w-none',
      'text-[15px] leading-[1.8] text-slate-800',
      'prose-headings:font-semibold prose-headings:text-slate-900 prose-headings:tracking-tight',
      'prose-h1:text-xl prose-h2:text-lg prose-h3:text-[1.05rem]',
      'prose-p:my-[0.65em]',
      'prose-li:marker:text-slate-400 prose-li:my-1',
      'prose-strong:text-slate-900 prose-strong:font-semibold',
      'prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline',
    ].join(' ');

  return (
    <div
      className="min-h-screen font-sans antialiased pb-14"
      style={{
        background:
          'linear-gradient(180deg, #e8f0ff 0%, #eef2fb 42%, #f3ecfa 72%, #f5f7fc 100%)',
      }}
    >
      <div className="mx-auto max-w-[936px] px-5 pt-8 sm:pt-12 pb-10 sm:px-8">
        <div
          className="rounded-[20px] bg-white px-7 py-10 sm:px-12 sm:py-14 shadow-[0_8px_40px_-12px_rgba(30,58,138,0.12),0_2px_12px_-4px_rgba(15,23,42,0.06)]"
          style={{
            border: '1px solid rgba(226,232,240,0.85)',
          }}
        >
          <header className="text-center sm:text-left">
            <div className="flex items-start gap-4 sm:gap-5">
              {platformIcon ? (
                <div
                  className="mx-auto sm:mx-0 shrink-0 w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-sm overflow-hidden flex items-center justify-center p-1.5"
                  aria-hidden={false}
                  title={platform || 'AI 平台'}
                >
                  <img src={platformIcon} alt="" className="max-w-full max-h-full w-auto h-auto object-contain" />
                </div>
              ) : (
                <div
                  className="mx-auto sm:mx-0 shrink-0 w-11 h-11 rounded-2xl bg-slate-100 border border-dashed border-slate-300/90 flex items-center justify-center"
                  aria-label="未知平台"
                >
                  <Sparkles className="w-5 h-5 text-slate-400" aria-hidden />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-[1.375rem] sm:text-[1.625rem] font-bold tracking-tight text-slate-900 leading-snug">
                  {headline}
                </h1>
              </div>
            </div>
            <hr className="mt-8 border-0 border-t border-slate-200/90" />
          </header>

          <div className="mt-8 flex justify-end">
            <div className="max-w-[92%] sm:max-w-[85%] rounded-2xl rounded-tr-md bg-[#f4f4f5] px-4 py-3.5 text-left text-[15px] leading-7 text-slate-900">
              {q}
            </div>
          </div>

          <section className="mt-10">
            {answer ? (
              <article className={proseCn}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, children, ...props }) => {
                      const external = /^https?:\/\//i.test((href || '').trim());
                      return (
                        <a {...props} href={href} target="_blank" rel="noopener noreferrer">
                          {external ? (
                            <span className="inline-flex items-center gap-0.5 align-middle">
                              {children}
                              <LinkIcon className="inline shrink-0 w-3 h-3 text-slate-400 opacity-70" aria-hidden />
                            </span>
                          ) : (
                            children
                          )}
                        </a>
                      );
                    },
                  }}
                >
                  {answer}
                </ReactMarkdown>
              </article>
            ) : (
              <p className="text-[15px] leading-7 text-slate-500">
                暂无采集到的全文回复。若为演示数据或未接入采集链路，可先使用下方在原平台打开的链接核验。
              </p>
            )}
          </section>

          {(data.externalLink || '').trim() ? (
            <div className="mt-12 flex justify-center sm:justify-start">
              <a
                href={data.externalLink!.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                在原分享页查看
                <span aria-hidden>→</span>
              </a>
            </div>
          ) : null}
        </div>

        <p className="text-center text-[11px] text-slate-400/90 mt-8 px-2">
          本页排版参考对话式阅读体验；搜索结果可能因人与时间而异。
        </p>
      </div>
    </div>
  );
}
