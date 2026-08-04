import React from 'react';
import {
  ArrowLeft,
  Download,
  Terminal,
  Key,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { Theme } from '../types';
import { CopyBlock, StepCard } from './InstallGuideShared';

interface AutomationLobsterInstallGuideProps {
  theme: Theme;
  onBack?: () => void;
  onOpenLobsterKeys?: () => void;
  onOpenImitateGuide?: () => void;
  onOpenMassPublishGuide?: () => void;
}

const QCLAW_DOWNLOAD_URL = 'https://qclaw.qq.com/';
const CLAWHUB_URL = 'https://clawhub.ai';

const INSTALL_AUTOMATION_SKILLS_CMD = `clawhub install geo-cycle-autopilot
clawhub install geo-mass-publish-check`;

const INSTALL_AUTOMATION_SKILLS_FORCE_CMD = `clawhub install geo-cycle-autopilot --force
clawhub install geo-mass-publish-check --force`;

const QCLAW_SCHEDULE_AUTOMATION = `每天在 QClaw 配置定时任务（示例 8:00）：
1. 执行 geo-cycle-autopilot
2. 执行 geo-mass-publish-check`;

const QCLAW_KEY_MESSAGE = `这是geo的api key：你的密钥`;

const AutomationLobsterInstallGuide: React.FC<AutomationLobsterInstallGuideProps> = ({
  theme,
  onBack,
  onOpenLobsterKeys,
  onOpenImitateGuide,
  onOpenMassPublishGuide,
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
            自动化龙虾安装指南
          </h2>
          <p className={`font-medium leading-relaxed ${muted}`}>
            按<strong>优化周期</strong>自动判断范文、仿写是否写完，导出 Word/ZIP 到本机，并通过 QClaw
            <strong>每日定时</strong>查询待群发状态。无需输入任务 ID，也无需每天手动说「开始优化任务」。
          </p>
          <p className={`mt-2 text-sm ${muted}`}>
            深度仿写成稿请查看{' '}
            {onOpenImitateGuide ? (
              <button type="button" onClick={onOpenImitateGuide} className="underline font-semibold text-geo-coral">
                仿写龙虾安装指南
              </button>
            ) : (
              '仿写龙虾安装指南'
            )}
            ；群发发布请查看{' '}
            {onOpenMassPublishGuide ? (
              <button type="button" onClick={onOpenMassPublishGuide} className="underline font-semibold text-geo-coral">
                群发助手（融媒宝）安装指南
              </button>
            ) : (
              '群发助手（融媒宝）安装指南'
            )}
            。
          </p>
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

        <StepCard step={2} title="安装自动化技能" icon={<Terminal className="w-5 h-5" />} isDark={isDark}>
          <p>
            在 QClaw 内置终端执行，通过{' '}
            <a href={CLAWHUB_URL} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">
              ClawHub
            </a>{' '}
            安装周期自动化相关技能：
          </p>
          <CopyBlock code={INSTALL_AUTOMATION_SKILLS_CMD} isDark={isDark} />
          <p className={`text-xs ${muted}`}>
            <code className="text-[11px]">geo-cycle-autopilot</code>：按周期判断范文/仿写进度，自动导出并上报；{' '}
            <code className="text-[11px]">geo-mass-publish-check</code>：查询待群发双状态并提醒融媒宝发布。
          </p>
          <p className={`text-xs ${muted}`}>
            若安全扫描提示可疑，可在每条命令末尾加 <code className="text-[11px]">--force</code>：
          </p>
          <CopyBlock code={INSTALL_AUTOMATION_SKILLS_FORCE_CMD} isDark={isDark} />
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

        <StepCard step={4} title="SaaS 配置国内写作" icon={<CheckCircle2 className="w-5 h-5" />} isDark={isDark}>
          <p>
            创建或编辑优化任务时，在「国内」启用<strong>范文</strong>和/或<strong>仿写</strong>即可（OpenClaw 协同 API 默认开启，无需勾选）。
            服务端周期跑完后，龙虾会读取 <code className="text-[11px]">openclawActions</code> 判断下一步：
          </p>
          <ul className={`list-disc pl-5 space-y-1 text-sm ${muted}`}>
            <li>
              <strong className={isDark ? 'text-zinc-200' : 'text-slate-800'}>范文</strong>：生成中 → 待导出 → 已完成（导出{' '}
              <code className="text-[11px]">fanwen.zip</code> 并上报）
            </li>
            <li>
              <strong className={isDark ? 'text-zinc-200' : 'text-slate-800'}>仿写</strong>（若启用深度仿写）：同上，导出{' '}
              <code className="text-[11px]">fangxie.zip</code>
            </li>
          </ul>
        </StepCard>

        <StepCard step={5} title="配置 QClaw 每日定时" icon={<RefreshCw className="w-5 h-5" />} isDark={isDark}>
          <p>在 QClaw 中配置定时（具体入口以 QClaw 为准），推荐顺序：</p>
          <CopyBlock label="推荐定时流程" code={QCLAW_SCHEDULE_AUTOMATION} isDark={isDark} />
          <p className={`text-xs ${muted}`}>
            导出目录：<code className="text-[11px]">%USERPROFILE%\.qclaw\geo-exports\{'{品牌}_{产品}_C{周期}'}\fanwen|fangxie\</code>
          </p>
        </StepCard>

        <StepCard step={6} title="待群发提醒" icon={<Clock className="w-5 h-5" />} optional isDark={isDark}>
          <p>
            <code className="text-[11px]">geo-mass-publish-check</code> 调用{' '}
            <code className="text-[11px]">/api/geo/optimization/mass-publish/pending</code>
            ，回报品牌、周期、范文/仿写双状态及本机路径，提示用融媒宝批量导入发布。
          </p>
        </StepCard>

        <div
          className={`rounded-2xl px-5 py-4 border ${
            isDark ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <p className="text-sm font-medium flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <span>
              验证：<code className="text-xs">clawhub list</code> 可见 autopilot 与 mass-publish-check；定时跑完后本机{' '}
              <code className="text-xs">.qclaw\geo-exports</code> 有 fanwen/fangxie；SaaS 显示范文/仿写群发状态。
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

export default AutomationLobsterInstallGuide;
