import React, { useState } from 'react';
import {
  ArrowLeft,
  Download,
  Terminal,
  Key,
  RefreshCw,
  ExternalLink,
  Monitor,
  Loader2,
} from 'lucide-react';
import { Theme } from '../types';
import { CopyBlock, StepCard } from './InstallGuideShared';
import {
  MASS_PUBLISH_DOWNLOAD_PATH,
  MASS_PUBLISH_PACKAGE_FILENAME,
} from './MassPublishAssistantGuide';
import { createMyExternalKey } from '../api/merchantExternalKeys';
import { useModuleI18n } from '../i18n/hooks';

interface IntelligentOptimizationDeployGuideProps {
  theme: Theme;
  onBack?: () => void;
}

const QCLAW_DOWNLOAD_URL = 'https://qclaw.qq.com/';
const INSTALL_SKILL_CMD = 'clawhub install geo-mass-publish-check';
const CRON_CMD = `请帮我创建定时任务，每 6 小时执行一次：运行 geo-mass-publish-check，验证密钥后拉取优化任务状态，needsFanwenExport/needsFangxieExport 为 true 时下载对应 ZIP 到 ~/.qclaw/geo-exports/ 并上报，再查待群发列表，有可导出 ZIP 时提醒我用融媒宝批量导入发布。`;

function buildQclawKeyMessage(apiKey: string): string {
  return `这是geo的api key：${apiKey}`;
}

const pageShellCls = 'flex-1 overflow-y-auto h-full no-scrollbar';
const pageInnerCls = 'mx-auto w-full max-w-7xl px-6 py-8 space-y-6';

const IntelligentOptimizationDeployGuide: React.FC<IntelligentOptimizationDeployGuideProps> = ({
  theme,
  onBack,
}) => {
  const { t } = useModuleI18n('guides');
  const isDark = theme === 'dark';
  const muted = isDark ? 'text-zinc-400' : 'text-slate-500';
  const [creatingKey, setCreatingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);

  const handleCreateKey = async () => {
    setKeyError(null);
    setCreatingKey(true);
    try {
      const res = await createMyExternalKey({ name: t('deployGuide.keyName') });
      setCreatedApiKey(res.api_key);
    } catch (e: unknown) {
      setKeyError(e instanceof Error ? e.message : t('errors.createKeyFailed'));
    } finally {
      setCreatingKey(false);
    }
  };

  return (
    <div className={pageShellCls}>
      <div className={pageInnerCls}>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className={`inline-flex items-center gap-2 text-sm font-medium ${
              isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            {t('deployGuide.backToOptimization')}
          </button>
        ) : null}

        <div>
          <h2 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t('deployGuide.pageTitle')}
          </h2>
          <p className={`mt-2 text-sm leading-relaxed ${muted}`}>
            {t('deployGuide.subtitle')}<strong className={isDark ? 'text-zinc-200' : 'text-slate-700'}>{t('deployGuide.subtitleMassPublish')}</strong>
            {t('deployGuide.subtitleRest')}
          </p>
        </div>

        <StepCard step={1} title={t('sections.step1.title')} icon={<Download className="w-5 h-5" />} isDark={isDark}>
          <p>
            {t('deployGuide.downloadPackageHint')} <code className="text-xs">{MASS_PUBLISH_PACKAGE_FILENAME}</code>（Windows），保存到本机。
          </p>
          <a
            href={MASS_PUBLISH_DOWNLOAD_PATH}
            download={MASS_PUBLISH_PACKAGE_FILENAME}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 font-bold text-white transition-colors hover:bg-rose-700"
          >
            <Download className="w-4 h-4" />
            {t('deployGuide.downloadMassPublish')}
          </a>
        </StepCard>

        <StepCard step={2} title={t('sections.step2.title')} icon={<Monitor className="w-5 h-5" />} isDark={isDark}>
          <ol className={`list-decimal space-y-1.5 pl-5 text-sm ${muted}`}>
            <li>{t('deployGuide.installSteps1')}</li>
            <li>{t('deployGuide.installSteps2')}</li>
            <li>{t('deployGuide.installSteps3')}</li>
          </ol>
          <p className={`text-sm ${muted}`}>
            {t('deployGuide.installNote')}
          </p>
        </StepCard>

        <div
          className={`rounded-2xl border px-5 py-4 ${
            isDark ? 'border-zinc-700 bg-zinc-900/50' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <p className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
            {t('deployGuide.qclawOptional')}
          </p>
          <p className={`mt-1 text-xs ${muted}`}>
            {t('deployGuide.qclawOptionalHint')}
          </p>
        </div>

        <StepCard step={3} title={t('sections.step3.title')} icon={<Download className="w-5 h-5" />} isDark={isDark}>
          <p className={`text-sm ${muted}`}>
            {t('deployGuide.qclawInstallHint')}<strong>{t('deployGuide.qclawKeepRunning')}</strong>
            {t('deployGuide.qclawInstallRest')}
          </p>
          <a
            href={QCLAW_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-bold text-white transition-colors ${
              isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            {t('deployGuide.openQclawDownload')}
          </a>
        </StepCard>

        <StepCard step={4} title={t('sections.step4.title')} icon={<Terminal className="w-5 h-5" />} isDark={isDark}>
          <p className={`text-sm ${muted}`}>{t('deployGuide.installSkillHint')}</p>
          <CopyBlock code={INSTALL_SKILL_CMD} isDark={isDark} />
          <p className={`text-xs ${muted}`}>
            {t('deployGuide.installSkillForce')} <code className="text-[11px]">--force</code>。
          </p>
        </StepCard>

        <StepCard step={5} title={t('sections.step5.title')} icon={<Key className="w-5 h-5" />} isDark={isDark}>
          <p className={`text-sm ${muted}`}>
            {t('deployGuide.createKeyHint')}
          </p>
          <button
            type="button"
            onClick={() => void handleCreateKey()}
            disabled={creatingKey}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isDark ? 'bg-red-600 hover:bg-geo-coral' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {creatingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            {creatingKey ? t('actions.creatingKey') : createdApiKey ? t('actions.recreateKey') : t('actions.createKey')}
          </button>
          {keyError ? (
            <p className={`text-xs ${isDark ? 'text-red-300' : 'text-red-600'}`}>{keyError}</p>
          ) : null}
          {createdApiKey ? (
            <>
              <p className={`text-xs font-semibold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                {t('deployGuide.keyPlaintextOnce')}
              </p>
              <CopyBlock
                label={t('actions.copyToQClaw')}
                code={buildQclawKeyMessage(createdApiKey)}
                isDark={isDark}
              />
            </>
          ) : null}
        </StepCard>

        <StepCard step={6} title={t('sections.step6.title')} icon={<RefreshCw className="w-5 h-5" />} isDark={isDark}>
          <p className={`text-sm ${muted}`}>
            {t('deployGuide.cronHint')}
          </p>
          <CopyBlock label={t('form.cronCommandLabel')} code={CRON_CMD} isDark={isDark} />
        </StepCard>

        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className={`w-full max-w-md rounded-xl py-3 font-bold text-white transition-colors ${
              isDark ? 'bg-red-600 hover:bg-geo-coral' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {t('deployGuide.doneBack')}
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default IntelligentOptimizationDeployGuide;
