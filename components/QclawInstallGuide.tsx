import React from 'react';
import {
  ArrowLeft,
  Download,
  Terminal,
  Key,
  CheckCircle2,
  ExternalLink,
  Shell,
} from 'lucide-react';
import { Theme } from '../types';
import { CopyBlock, StepCard } from './InstallGuideShared';

interface QclawInstallGuideProps {
  theme: Theme;
  onBack?: () => void;
  onOpenLobsterKeys?: () => void;
  onOpenAutomationGuide?: () => void;
}

const QCLAW_DOWNLOAD_URL = 'https://qclaw.qq.com/';
const CLAWHUB_URL = 'https://clawhub.ai';

const INSTALL_IMITATE_SKILLS_CMD = `clawhub install geo-opt-coordinator
clawhub install geo-deep-imitate`;

const INSTALL_IMITATE_SKILLS_FORCE_CMD = `clawhub install geo-opt-coordinator --force
clawhub install geo-deep-imitate --force`;

const QCLAW_KEY_MESSAGE = `这是geo的api key：你的密钥`;

const USER_START_PHRASE = '开始优化任务';
const USER_LIST_PHRASE = '有哪些优化任务';
const USER_BRAND_PRODUCT_PHRASE = '跑 [品牌名] [产品名] 的仿写';

const QclawInstallGuide: React.FC<QclawInstallGuideProps> = ({
  theme,
  onBack,
  onOpenLobsterKeys,
  onOpenAutomationGuide,
}) => {
  const isDark = theme === 'dark';
  const muted = isDark ? 'text-zinc-400' : 'text-slate-500';

  return (
    <div className="flex-1 p-6 lg:p-10 overflow-y-auto h-full no-scrollbar">
      <div className="max-w-3xl mx-auto space-y-8">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className={`inline-flex items-center gap-2 text-sm font-medium ${
              isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            返回优化任务
          </button>
        ) : null}

        <div>
          <h2 className={`text-3xl font-medium mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            仿写龙虾安装指南
          </h2>
          <p className={`font-medium leading-relaxed ${muted}`}>
            用于<strong>深度仿写</strong>：诊断完成后，由仿写龙虾通过 QClaw 内置{' '}
            <code className="text-[11px]">web_fetch</code> 抓取信源全文并成稿。须在 SaaS 优化任务中勾选「启用深度仿写」。
          </p>
          {onOpenAutomationGuide ? (
            <p className={`mt-2 text-sm ${muted}`}>
              周期自动导出范文/仿写、待群发提醒请查看{' '}
              <button type="button" onClick={onOpenAutomationGuide} className="underline font-semibold text-geo-coral">
                自动化龙虾安装指南
              </button>
              。
            </p>
          ) : null}
        </div>

        <StepCard step={1} title="下载并安装 QClaw" icon={<Download className="w-5 h-5" />} isDark={isDark}>
          <p>前往官网下载安装包，按向导完成安装并启动 QClaw。</p>
          <a
            href={QCLAW_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            打开 QClaw 官网下载
          </a>
        </StepCard>

        <StepCard step={2} title="安装仿写技能" icon={<Terminal className="w-5 h-5" />} isDark={isDark}>
          <p>
            在 QClaw 内置终端执行，通过{' '}
            <a href={CLAWHUB_URL} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">
              ClawHub
            </a>{' '}
            安装仿写相关技能（勿手动拷贝文件夹）：
          </p>
          <CopyBlock code={INSTALL_IMITATE_SKILLS_CMD} isDark={isDark} />
          <p className={`text-xs ${muted}`}>
            <code className="text-[11px]">geo-deep-imitate</code> 负责 web_fetch + 深度仿写成稿；{' '}
            <code className="text-[11px]">geo-opt-coordinator</code> 为对话入口（兼容口语「开始优化任务」）。勿安装已废弃的{' '}
            <code className="text-[11px]">geo-social-publish</code>。
          </p>
          <p className={`text-xs ${muted}`}>
            若安全扫描提示可疑，可在每条命令末尾加 <code className="text-[11px]">--force</code>：
          </p>
          <CopyBlock code={INSTALL_IMITATE_SKILLS_FORCE_CMD} isDark={isDark} />
        </StepCard>

        <StepCard step={3} title="准备龙虾密钥" icon={<Key className="w-5 h-5" />} isDark={isDark}>
          <p>
            在 SaaS <strong>账户设置 → 龙虾密钥</strong> 创建密钥后，在 QClaw 对话中发送下面消息（将「你的密钥」替换为实际 key）。
          </p>
          {onOpenLobsterKeys ? (
            <button
              type="button"
              onClick={onOpenLobsterKeys}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold border transition-colors ${
                isDark
                  ? 'border-zinc-700 text-zinc-200 hover:bg-zinc-800'
                  : 'border-slate-300 text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Key className="w-4 h-4" />
              去创建龙虾密钥
            </button>
          ) : null}
          <CopyBlock label="在 QClaw 中发送" code={QCLAW_KEY_MESSAGE} isDark={isDark} />
        </StepCard>

        <StepCard step={4} title="深度仿写说明" icon={<Shell className="w-5 h-5" />} isDark={isDark}>
          <p>
            由仿写龙虾通过 QClaw 内置 <code className="text-xs">web_fetch</code> 抓取信源全文，无需 Firecrawl。成稿后由{' '}
            <strong>自动化龙虾</strong>（若已配置）导出 <code className="text-[11px]">fangxie.zip</code> 并上报待群发状态。
          </p>
        </StepCard>

        <StepCard step={5} title="口语指令（可选）" icon={<Shell className="w-5 h-5" />} optional isDark={isDark}>
          <p>不依赖定时时，仍可在对话中说：</p>
          <CopyBlock label="自动处理" code={USER_START_PHRASE} isDark={isDark} />
          <CopyBlock label="任务列表" code={USER_LIST_PHRASE} isDark={isDark} />
          <CopyBlock label="指定品牌产品仿写" code={USER_BRAND_PRODUCT_PHRASE} isDark={isDark} />
        </StepCard>

        <div
          className={`rounded-2xl px-5 py-4 border ${
            isDark ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <p className="text-sm font-medium flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <span>
              验证：SaaS 勾选「启用深度仿写」后，周期诊断完成时仿写龙虾可抓信源成稿；SaaS 龙虾区「深度仿写」步骤显示成功。
            </span>
          </p>
        </div>

        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className={`w-full py-3.5 rounded-xl font-bold transition-colors ${
              isDark ? 'bg-red-600 hover:bg-geo-coral text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            已完成安装，返回优化任务
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default QclawInstallGuide;
