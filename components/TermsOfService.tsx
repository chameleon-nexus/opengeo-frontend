
import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { Theme } from '../types';
import PublicHeader from './PublicHeader';

interface TermsOfServiceProps {
  theme: Theme;
  onNavigate: (page: 'home' | 'pricing' | 'blog' | 'privacy' | 'terms') => void;
  onNavigateToLogin: () => void;
  onNavigateBack?: () => void;
  headerVariant?: 'default' | 'marketing';
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({ 
  theme, 
  onNavigate,
  onNavigateToLogin,
  onNavigateBack,
  headerVariant = 'default',
}) => {
  const isDark = theme === 'dark';

  return (
    <div className={`w-full min-h-screen ${isDark ? 'bg-geo-bg text-white' : 'bg-white text-slate-900'}`}>
      <PublicHeader
          theme={theme} 
          currentPage="terms" 
          onNavigate={onNavigate}
          onNavigateToLogin={onNavigateToLogin}
          variant={headerVariant === 'marketing' ? 'marketing' : 'default'}
        />

        <div className="max-w-4xl mx-auto px-6 py-16">
          {/* 返回按钮 */}
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className={`flex items-center gap-2 mb-8 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                isDark 
                  ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </button>
          )}

          {/* 标题 */}
          <div className="mb-12 text-center">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 ${
              isDark ? 'bg-geo-blue/20' : 'bg-blue-100'
            }`}>
              <FileText className={`w-8 h-8 ${isDark ? 'text-geo-blue' : 'text-blue-500'}`} />
            </div>
            <h1 className={`text-4xl font-semibold tracking-tight mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              平台用户服务协议
            </h1>
            <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              最后更新日期：2026年7月2日
            </p>
          </div>

          {/* 内容 */}
          <div className={`prose prose-lg max-w-none ${
            isDark 
              ? 'prose-invert prose-headings:text-white prose-p:text-zinc-300 prose-strong:text-white prose-li:text-zinc-300' 
              : 'prose-slate prose-headings:text-slate-900 prose-p:text-slate-700'
          }`}>
            <div className={`space-y-8 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
              
              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  1. 协议的接受
                </h2>
                <p className="leading-relaxed">
                  欢迎使用GEO系统平台（以下简称"本平台"）。本协议是您与我们之间关于使用本平台服务的法律协议。通过注册、登录或使用本平台的任何服务，即表示您已阅读、理解并同意接受本协议的全部条款。
                </p>
              </section>

              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  2. 服务说明
                </h2>
                <p className="leading-relaxed mb-4">本平台提供以下服务：</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>品牌分析与监控服务</li>
                  <li>内容生成与优化服务</li>
                  <li>知识库管理与查询服务</li>
                  <li>AI驱动的智能分析工具</li>
                  <li>其他相关增值服务</li>
                </ul>
                <p className="leading-relaxed mt-4">
                  我们保留随时修改、暂停或终止任何服务的权利，无需提前通知。
                </p>
              </section>

              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  3. 账户注册与使用
                </h2>
                <p className="leading-relaxed mb-4">使用本平台服务，您需要：</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>提供真实、准确、完整的注册信息</li>
                  <li>妥善保管账户信息，对账户下的所有活动负责</li>
                  <li>不得将账户转让、出售或出借给他人</li>
                  <li>如发现账户被盗用，立即通知我们</li>
                  <li>遵守所有适用的法律法规</li>
                </ul>
              </section>

              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  4. 用户行为规范
                </h2>
                <p className="leading-relaxed mb-4">您在使用本平台时，不得：</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>上传、发布、传播违法、有害、威胁、辱骂、骚扰、诽谤、侵权的内容</li>
                  <li>从事任何可能损害平台安全或稳定性的活动</li>
                  <li>使用自动化工具或脚本恶意访问或使用服务</li>
                  <li>尝试未经授权访问其他用户的账户或数据</li>
                  <li>进行任何可能干扰或破坏服务正常运行的行为</li>
                  <li>将服务用于任何非法目的</li>
                </ul>
              </section>

              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  5. 知识产权
                </h2>
                <p className="leading-relaxed mb-4">
                  本平台的所有内容，包括但不限于文字、图片、音频、视频、软件、程序、版面设计等，均受知识产权法保护。未经我们书面许可，您不得复制、传播、展示、镜像、上传、下载或以其他方式使用这些内容。
                </p>
                <p className="leading-relaxed">
                  您上传到本平台的内容，您保留所有权，但授予我们在提供服务所需的范围内使用、存储、处理这些内容的权利。
                </p>
              </section>

              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  6. 服务费用
                </h2>
                <p className="leading-relaxed">
                  部分服务可能需要付费。我们会在您使用付费服务前明确告知费用标准。所有费用一经支付，除法律另有规定外，不予退还。我们保留随时调整价格的权利，但不会影响您已购买的服务。
                </p>
              </section>

              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  7. 免责声明
                </h2>
                <p className="leading-relaxed mb-4">
                  在法律允许的范围内，我们对以下情况不承担责任：
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>因不可抗力导致的服务中断或故障</li>
                  <li>因您的设备、网络或操作不当导致的问题</li>
                  <li>因第三方原因导致的服务中断或数据丢失</li>
                  <li>因您违反本协议导致的一切后果</li>
                  <li>因使用本服务产生的任何间接、偶然、特殊或后果性损失</li>
                </ul>
              </section>

              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  8. 服务变更与终止
                </h2>
                <p className="leading-relaxed">
                  我们有权随时修改、暂停或终止全部或部分服务，无需提前通知。如果我们终止您的账户或服务，您将无法再访问您的账户和数据。我们不对因服务变更或终止给您造成的任何损失承担责任。
                </p>
              </section>

              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  9. 协议修改
                </h2>
                <p className="leading-relaxed">
                  我们有权随时修改本协议。重大变更时，我们会在网站上发布通知。您继续使用服务即表示接受修改后的协议。如果您不同意修改后的协议，请停止使用服务。
                </p>
              </section>

              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  10. 争议解决
                </h2>
                <p className="leading-relaxed">
                  因本协议引起的或与本协议有关的任何争议，双方应友好协商解决。协商不成的，任何一方均可向本平台所在地有管辖权的人民法院提起诉讼。
                </p>
              </section>

              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  11. 其他条款
                </h2>
                <p className="leading-relaxed mb-4">
                  本协议构成您与我们之间关于使用本平台服务的完整协议。如果本协议的任何条款被认定为无效或不可执行，其余条款仍然有效。
                </p>
                <p className="leading-relaxed">
                  本协议的最终解释权归珊瑚GEO所有。
                </p>
              </section>

            </div>
          </div>
        </div>
    </div>
  );
};

export default TermsOfService;
