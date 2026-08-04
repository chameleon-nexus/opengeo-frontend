
import React from 'react';
import PublicHeader from './PublicHeader';
import Pricing from './blocks/Pricing';
import { Theme } from '../types';
import { Pricing as PricingType } from '../types/landing';
import { usePricingData } from '../lib/marketingData';

interface PricingPageProps {
  theme: Theme;
  onNavigate: (page: 'home' | 'pricing' | 'blog' | 'privacy' | 'terms') => void;
  onNavigateToLogin: () => void;
  headerVariant?: 'default' | 'marketing';
}

const PricingPage: React.FC<PricingPageProps> = ({ 
  theme, 
  onNavigate,
  onNavigateToLogin,
  headerVariant = 'default',
}) => {
  const pricingData = usePricingData();
  const pricing: PricingType = pricingData.pricing;

  return (
    <div className={`w-full min-h-screen ${theme === 'dark' ? 'bg-geo-bg' : 'bg-white'}`}>
      <PublicHeader 
        theme={theme} 
        currentPage="pricing" 
        onNavigate={onNavigate}
        onNavigateToLogin={onNavigateToLogin}
        variant={headerVariant === 'marketing' ? 'marketing' : 'default'}
      />
      <Pricing pricing={pricing} theme={theme} />
    </div>
  );
};

export default PricingPage;
