
export interface Button {
  title: string;
  url?: string;
  target?: string;
  variant?: "default" | "outline" | "link";
  icon?: string;
}

export interface PricingGroup {
  name?: string;
  title?: string;
  description?: string;
  label?: string;
  is_featured?: boolean;
}

export interface PricingItem {
  title?: string;
  description?: string;
  label?: string;
  price?: string;
  original_price?: string;
  currency?: string;
  unit?: string;
  features_title?: string;
  features?: string[];
  button?: Button;
  tip?: string;
  is_featured?: boolean;
  interval: "month" | "year" | "one-time";
  product_id: string;
  product_name?: string;
  amount: number;
  cn_amount?: number;
  currency: string;
  credits?: number;
  valid_months?: number;
  group?: string;
  stripe_price_id?: string;
}

export interface Pricing {
  disabled?: boolean;
  name?: string;
  title?: string;
  description?: string;
  items?: PricingItem[];
  groups?: PricingGroup[];
}

export interface Hero {
  disabled?: boolean;
  title?: string;
  highlight_text?: string;
  description?: string;
  subtitle?: string;
  announcement?: {
    label?: string;
    title?: string;
    url?: string;
  };
  tip?: string;
  input_placeholder?: string;
  input_button_text?: string;
  buttons?: Button[];
  show_happy_users?: boolean;
  show_badge?: boolean;
}

export interface FeatureItem {
  title: string;
  description: string;
  icon?: string;
  image?: {
    src: string;
    alt?: string;
  };
}

export interface FeatureModern {
  name?: string;
  title?: string;
  description?: string;
  items?: FeatureItem[];
}

export interface CreativeSuiteCategory {
  id: string;
  name: string;
  cards: Array<{
    title: string;
    description: string;
    image: string;
    link?: string;
  }>;
}

export interface CreativeSuite {
  name?: string;
  title?: string;
  categories?: CreativeSuiteCategory[];
}

export interface SaasFeatureCategory {
  id: string;
  name: string;
  cards: Array<{
    title: string;
    description: string;
    image: string;
    link?: string;
  }>;
}

export interface SaasFeatures {
  name?: string;
  title?: string;
  try_button?: string;
  categories?: SaasFeatureCategory[];
}

export interface ProductShowcase {
  title?: string;
  features?: Array<{
    title: string;
    description: string;
    icon?: string;
  }>;
}

export interface ProfessionalShowcase {
  title?: string;
  professionals?: Array<{
    id: string;
    title: string;
    description: string;
    detailTitle?: string;
    detailDescription?: string;
    backgroundImage?: string;
    detailImage?: string;
    gradient?: string;
    buttonText?: string;
    buttonUrl?: string;
  }>;
}

export interface Showcase {
  name?: string;
  title?: string;
  description?: string;
  items?: Array<{
    title: string;
    description: string;
    image?: string;
    link?: string;
  }>;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQ {
  name?: string;
  title?: string;
  description?: string;
  items?: FAQItem[];
}

export interface CTA {
  name?: string;
  title?: string;
  description?: string;
  buttons?: Button[];
}

export interface LandingPageData {
  hero?: Hero;
  product_showcase?: ProductShowcase;
  professional_showcase?: ProfessionalShowcase;
  "feature-modern"?: FeatureModern;
  "creative-suite"?: CreativeSuite;
  "saas-features"?: SaasFeatures;
  showcase?: Showcase;
  faq?: FAQ;
  cta?: CTA;
  pricing?: Pricing;
}
