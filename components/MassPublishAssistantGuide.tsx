import React from 'react';
import { ArrowLeft, Download, Monitor, FileArchive, Send, CheckCircle2, ExternalLink } from 'lucide-react';
import { Theme } from '../types';
import { CopyBlock, StepCard } from './InstallGuideShared';

export const MASS_PUBLISH_PACKAGE_FILENAME = '群发助手.zip';
export const MASS_PUBLISH_DOWNLOAD_PATH = `/downloads/${encodeURIComponent(MASS_PUBLISH_PACKAGE_FILENAME)}`;

interface MassPublishAssistantGuideProps {
  theme: Theme;
  onBack?: () => void;
  onOpenQclawGuide?: () => void;
  onOpenAutomationGuide?: () => void;
}

const MassPublishAssistantGuide: React.FC<MassPublishAssistantGuideProps> = ({
  theme,
  onBack,
  onOpenQclawGuide,
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
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className={`text-3xl font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
              自媒体账号
            </h2>
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800 ring-1 ring-rose-200/80">
              国内
            </span>
          </div>
          <p className={`text-sm font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>群发助手（融媒宝）安装指南</p>
          <p className={`mt-2 font-medium leading-relaxed ${muted}`}>
            在 SaaS 生成文章后，下载 Word 或 ZIP 包，使用本机<strong>融媒宝</strong>批量发布到国内自媒体平台。
            无需安装 QClaw 或 SAU。
          </p>
          {onOpenQclawGuide || onOpenAutomationGuide ? (
            <p className={`mt-2 text-sm ${muted}`}>
              {onOpenAutomationGuide ? (
                <>
                  周期自动导出与待群发提醒请查看{' '}
                  <button type="button" onClick={onOpenAutomationGuide} className="underline font-semibold text-geo-coral">
                    自动化龙虾安装指南
                  </button>
                </>
              ) : null}
              {onOpenQclawGuide && onOpenAutomationGuide ? '；' : null}
              {onOpenQclawGuide ? (
                <>
                  深度仿写请查看{' '}
                  <button type="button" onClick={onOpenQclawGuide} className="underline font-semibold text-geo-coral">
                    仿写龙虾安装指南
                  </button>
                </>
              ) : null}
              。
            </p>
          ) : null}
        </div>

        <StepCard step={1} title="下载融媒宝" icon={<Download className="w-5 h-5" />} isDark={isDark}>
          <p>
            下载并保存压缩包 <code className="text-xs">{MASS_PUBLISH_PACKAGE_FILENAME}</code>（Windows）。
          </p>
          <a
            href={MASS_PUBLISH_DOWNLOAD_PATH}
            download={MASS_PUBLISH_PACKAGE_FILENAME}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            下载群发助手（{MASS_PUBLISH_PACKAGE_FILENAME}）
          </a>
          <p className={`text-xs ${muted}`}>
            下载地址：<code className="text-[11px]">{MASS_PUBLISH_DOWNLOAD_PATH}</code>（与 SaaS 同域{' '}
            <code className="text-[11px]">/downloads/</code> 目录）
          </p>
        </StepCard>

        <StepCard step={2} title="安装融媒宝" icon={<Monitor className="w-5 h-5" />} isDark={isDark}>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>解压 <code className="text-xs">{MASS_PUBLISH_PACKAGE_FILENAME}</code>，双击其中的安装程序，按向导完成安装</li>
            <li>若 Windows SmartScreen 提示，选择「仍要运行」或「更多信息 → 仍要运行」</li>
            <li>建议安装到固定目录，并在桌面创建快捷方式便于后续使用</li>
          </ol>
        </StepCard>

        <StepCard step={3} title="在 SaaS 下载稿件" icon={<FileArchive className="w-5 h-5" />} isDark={isDark}>
          <p>文章生成完成后，在<strong>内容生成 / 优化工作台 → 文章生成</strong>中：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>单篇：打开文章详情，点击「下载 Word（融媒宝）」</li>
            <li>批次：进入批次文章列表，点击「下载本批 ZIP（融媒宝）」</li>
          </ul>
          <p className={`text-xs ${muted}`}>ZIP 内每篇文章一个 .docx，并附 manifest.json 便于核对。</p>
        </StepCard>

        <StepCard step={4} title="在融媒宝中批量发布" icon={<Send className="w-5 h-5" />} isDark={isDark}>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>打开融媒宝，登录需要发布的自媒体平台账号</li>
            <li>使用「批量导入 / 导入 Word / 选文件夹」等功能（以融媒宝界面为准）</li>
            <li>选择下载的 docx 文件或解压后的 ZIP 文件夹，确认标题与正文</li>
            <li>执行批量发布，按平台要求完成扫码或二次确认</li>
          </ol>
        </StepCard>

        <StepCard step={5} title="验证" icon={<CheckCircle2 className="w-5 h-5" />} isDark={isDark}>
          <ul className="list-disc pl-5 space-y-1">
            <li>融媒宝能正常启动并打开一篇测试 docx</li>
            <li>SaaS 中至少一篇 completed 文章能成功下载 Word</li>
            <li>融媒宝内完成一次试发（可选）</li>
          </ul>
        </StepCard>

        <div
          className={`rounded-2xl px-5 py-4 border ${
            isDark ? 'bg-blue-950/20 border-blue-800/40 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <p className="text-sm flex items-start gap-2">
            <ExternalLink className="w-5 h-5 shrink-0 mt-0.5" />
            <span>
              网易号 OAuth 发稿仍在 SaaS「自媒体账号」中配置，与融媒宝并行；融媒宝适用于其他图文/视频平台的本机群发。
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

export default MassPublishAssistantGuide;
