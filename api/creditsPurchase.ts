import apiClient from './client';
import { PaymentOrder, mapOrder } from './orders';

export interface CreditsPreset {
  credits: number;
  amountFen: number;
  priceDisplay: string;
}

export interface CreditsPurchaseOptions {
  enabled: boolean;
  unitPriceFen: number;
  unitPriceYuan: number;
  presets: CreditsPreset[];
  stepCredits: number;
  minCredits: number;
  customStartCredits: number;
  hint: string;
}

export const creditsPurchaseAPI = {
  getOptions: async (): Promise<CreditsPurchaseOptions> => {
    return apiClient.get<CreditsPurchaseOptions>('/api/credits-purchase/options');
  },

  createOrder: async (credits: number, channel = 'wechat_native'): Promise<PaymentOrder> => {
    const data = await apiClient.post<any>('/api/credits-purchase/orders', { credits, channel });
    return mapOrder(data);
  },
};
