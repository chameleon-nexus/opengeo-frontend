
import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { Theme } from '../types';
import PublicHeader from './PublicHeader';

interface PrivacyPolicyProps {
  theme: Theme;
  onNavigate: (page: 'home' | 'pricing' | 'blog' | 'privacy' | 'terms') => void;
  onNavigateToLogin: () => void;
  onNavigateBack?: () => void;
  headerVariant?: 'default' | 'marketing';
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ 
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
          currentPage="privacy" 
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
              <Shield className={`w-8 h-8 ${isDark ? 'text-geo-blue' : 'text-blue-500'}`} />
            </div>
            <h1 className={`text-4xl font-semibold tracking-tight mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              平台隐私政策
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
                  1. 引言
                </h2>
                <p className="leading-relaxed">
                  珊瑚GEO（以下简称"我们"）非常重视您的隐私保护。本隐私政策说明了我们如何收集、使用、存储和保护您的个人信息。在使用我们的服务前，请仔细阅读本隐私政策。
                </p>
              </section>

              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  2. 信息收集
                </h2>
                <p className="leading-relaxed mb-4">我们可能收集以下类型的信息：</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>账户信息：</strong>用户名、密码、手机号码等注册信息</li>
                  <li><strong>使用信息：</strong>您使用我们服务时的操作记录、访问时间、IP地址等</li>
                  <li><strong>设备信息：</strong>设备类型、操作系统、浏览器类型等</li>
                  <li><strong>内容信息：</strong>您上传、创建或分享的内容数据</li>
                </ul>
              </section>

              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  3. 信息使用
                </h2>
                <p className="leading-relaxed mb-4">我们使用收集的信息用于以下目的：</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>提供、维护和改进我们的服务</li>
                  <li>处理您的请求和交易</li>
                  <li>发送服务通知和更新</li>
                  <li>进行数据分析和研究，以改善用户体验</li>
                  <li>检测、预防和解决技术问题</li>
                  <li>遵守法律法规要求</li>
                </ul>
              </section>

              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  4. 信息共享
                </h2>
                <p className="leading-relaxed">
                  我们不会向第三方出售、交易或转让您的个人信息，除非：
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>获得您的明确同意</li>
                  <li>法律法规要求或司法机关依法要求</li>
                  <li>为提供服务所必需，且相关方已签署保密协议</li>
                  <li>在紧急情况下，为保护用户或公众的生命、财产或安全</li>
                </ul>
              </section>

              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  5. 数据安全
                </h2>
                <p className="leading-relaxed">
                  我们采用行业标准的安全措施来保护您的个人信息，包括加密传输、访问控制、安全审计等。但请注意，任何互联网传输或电子存储方法都不是100%安全的，我们无法保证绝对安全。
                </p>
              </section>

              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  6. 您的权利
                </h2>
                <p className="leading-relaxed mb-4">您对自己的个人信息享有以下权利：</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>访问权：查看我们持有的您的个人信息</li>
                  <li>更正权：更正不准确或不完整的信息</li>
                  <li>删除权：要求删除您的个人信息</li>
                  <li>撤回同意：撤回您之前给予的同意</li>
                  <li>数据可携权：获取您的个人信息副本</li>
                </ul>
              </section>

              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  7. Cookie和追踪技术
                </h2>
                <p className="leading-relaxed">
                  我们使用Cookie和类似技术来改善用户体验、分析服务使用情况。您可以通过浏览器设置管理Cookie，但这可能影响某些功能的正常使用。
                </p>
              </section>

              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  8. 儿童隐私
                </h2>
                <p className="leading-relaxed">
                  我们的服务面向18岁以上的用户。如果您是18岁以下的未成年人，请在监护人同意和指导下使用我们的服务。
                </p>
              </section>

              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  9. 隐私政策更新
                </h2>
                <p className="leading-relaxed">
                  我们可能会不时更新本隐私政策。重大变更时，我们会在网站上发布通知。继续使用我们的服务即表示您接受更新后的隐私政策。
                </p>
              </section>

            </div>
          </div>
        </div>
    </div>
  );
};

export default PrivacyPolicy;
