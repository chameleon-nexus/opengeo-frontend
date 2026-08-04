
import React, { type ReactNode } from 'react';
import PublicHeader from './PublicHeader';
import Hero from './blocks/Hero';
import FeatureModern from './blocks/FeatureModern';
import CreativeSuite from './blocks/CreativeSuite';
import SaasFeatures from './blocks/SaasFeatures';
import ProductShowcase from './blocks/ProductShowcase';
import ProfessionalShowcase from './blocks/ProfessionalShowcase';
import Showcase from './blocks/Showcase';
import FaqBlock from './blocks/FAQ';
import CTA from './blocks/CTA';
import { Theme } from '../types';
import type { LandingPageData, FAQ } from '../types/landing';
import { useLandingData } from '../lib/marketingData';

interface LandingPageProps {
  theme: Theme;
  onNavigate: (page: 'home' | 'pricing' | 'blog' | 'privacy' | 'terms') => void;
  onNavigateToLogin: () => void;
  isLoggedIn?: boolean;
  onNavigateToBackend?: () => void;
  /** 不展示 JSON 中的 Hero（例如 web 首页使用自定义视频横幅） */
  hideHero?: boolean;
  /** 不展示全屏 login_bg 背景图（与视频横幅等组合时使用） */
  hidePageBackground?: boolean;
  /** 插在 Header 与 Hero 之间，例如视频首屏 */
  bannerSlot?: ReactNode;
  /** 插在首页中部区块之后、FAQ 之前（例如 web 搜索知识库） */
  middleSlot?: ReactNode;
  /** 顶栏样式：marketing 为营销站参考样式（仅建议 web 使用） */
  headerVariant?: 'default' | 'marketing';
  /** 仅保留：FAQ + 底部 CTA（web 首页精简；不含双引擎 ProductShowcase） */
  minimalLanding?: boolean;
  /** web 营销首页：浅色底与正文对比度（与 AiDSO 风格一致） */
  landingSurface?: 'default' | 'aidso';
  /** 工具页等：不展示 FAQ + 底部 CTA（仍保留顶栏与 bannerSlot） */
  hideFaqAndCta?: boolean;
  /** marketing 顶栏：高亮 GEO 区块（如信源分析页），默认按 currentPage 高亮首页 */
  marketingHighlightGeo?: boolean;
  /** 来自营销主站 CMS 的 FAQ；传入时覆盖 landing.json 中的 faq */
  faqFromCms?: FAQ | null;
}

const LandingPage: React.FC<LandingPageProps> = ({ 
  theme, 
  onNavigate,
  onNavigateToLogin,
  isLoggedIn,
  onNavigateToBackend,
  hideHero,
  hidePageBackground,
  bannerSlot,
  middleSlot,
  headerVariant = 'default',
  minimalLanding = false,
  landingSurface = 'default',
  hideFaqAndCta = false,
  marketingHighlightGeo = false,
  faqFromCms,
}) => {
  const page: LandingPageData = useLandingData();
  const faqSection = faqFromCms !== undefined && faqFromCms !== null ? faqFromCms : page.faq;
  const backgroundUrl = '/login_bg.jpg';
  const isDark = theme === 'dark';
  const aidsoSurface = landingSurface === 'aidso' && !isDark;

  return (
    <div
      className={`w-full min-h-screen relative ${
        isDark
          ? 'bg-geo-bg text-white'
          : aidsoSurface
            ? 'bg-[#f8f9fb] text-[#1a1a1a]'
            : 'bg-white text-slate-900'
      }`}
    >
      {!hidePageBackground && (
        <>
          {/* 背景图 - 保持原始比例，不拉伸 */}
          <div 
            className="absolute inset-0 w-full h-full"
            style={{
              backgroundImage: `url(${backgroundUrl})`,
              backgroundSize: '100% auto',
              backgroundPosition: 'center top',
              backgroundRepeat: 'no-repeat',
              minHeight: '100vh',
            }}
          />
          {/* 渐变遮罩层（确保文字可读性） */}
          <div className={`absolute inset-0 w-full h-full ${
            isDark ? 'bg-geo-bg/40' : 'bg-white/30'
          }`} />
        </>
      )}
      
      {/* 内容区域 */}
      <div className="relative z-10">
        <PublicHeader 
          theme={theme} 
          currentPage="home" 
          onNavigate={onNavigate}
          onNavigateToLogin={onNavigateToLogin}
          isLoggedIn={isLoggedIn}
          onNavigateToBackend={onNavigateToBackend}
          variant={headerVariant === 'marketing' ? 'marketing' : 'default'}
          marketingHighlightGeo={marketingHighlightGeo}
        />
      
      {bannerSlot}

      {/* Hero Section */}
      {page.hero && !hideHero && (
        <Hero hero={page.hero} theme={theme} onNavigate={onNavigate} onNavigateToLogin={onNavigateToLogin} />
      )}

      {/* Product Showcase（双引擎增长：GEO × 全域搜索）— web 精简首页不展示 */}
      {page.product_showcase && !minimalLanding && (
        <div id={headerVariant === 'marketing' ? 'landing-features' : undefined}>
          <ProductShowcase 
            title={page.product_showcase.title}
            features={page.product_showcase.features}
            theme={theme}
          />
        </div>
      )}

      {/* Professional Showcase */}
      {!minimalLanding && page.professional_showcase && (
        <div id={headerVariant === 'marketing' ? 'landing-services' : undefined}>
          <ProfessionalShowcase 
            title={page.professional_showcase.title}
            professionals={page.professional_showcase.professionals}
            theme={theme}
          />
        </div>
      )}

      {/* Feature Modern */}
      {!minimalLanding && (page as any)["feature-modern"] && (
        <FeatureModern 
          section={(page as any)["feature-modern"]} 
          theme={theme}
        />
      )}

      {/* Creative Suite */}
      {!minimalLanding && (page as any)["creative-suite"] && (
        <CreativeSuite 
          section={(page as any)["creative-suite"]} 
          theme={theme}
        />
      )}

      {/* SaaS Features */}
      {!minimalLanding && (page as any)["saas-features"] && (
        <SaasFeatures 
          section={(page as any)["saas-features"]} 
          theme={theme}
        />
      )}

      {/* Showcase */}
      {!minimalLanding && page.showcase && (
        <Showcase section={page.showcase} theme={theme} />
      )}

      {middleSlot}

      {/* FAQ */}
      {!hideFaqAndCta && faqSection && (
        <FaqBlock section={faqSection} theme={theme} landingSurface={landingSurface} />
      )}

      {/* CTA */}
      {!hideFaqAndCta && page.cta && (
        <CTA
          section={page.cta}
          theme={theme}
          landingSurface={landingSurface}
          onNavigate={onNavigate}
          onNavigateToLogin={onNavigateToLogin}
        />
      )}
      </div>
    </div>
  );
};

export default LandingPage;
