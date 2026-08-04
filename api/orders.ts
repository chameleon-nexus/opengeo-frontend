import apiClient from './client';

export interface PaymentOrder {
  id: number;
  outTradeNo: string;
  orderType?: string;
  status: string;
  amount: number;
  currency: string;
  channel: string;
  codeUrl?: string;
  jsapiParams?: Record<string, string>;
  packageTitle?: string;
  productId?: string;
  credits?: number;
  validMonths?: number;
  paidAt?: string;
  createdAt?: string;
  expiresAt?: string;
}

export function mapOrder(r: any): PaymentOrder {
  return {
    id: r.id,
    outTradeNo: r.outTradeNo ?? r.out_trade_no ?? '',
    orderType: r.orderType ?? r.order_type,
    status: r.status,
    amount: Number(r.amount ?? 0),
    currency: r.currency ?? 'CNY',
    channel: r.channel,
    codeUrl: r.codeUrl ?? r.code_url,
    jsapiParams: r.jsapiParams ?? r.jsapi_params,
    packageTitle: r.packageTitle ?? r.package_title,
    productId: r.productId ?? r.product_id,
    credits: r.credits,
    validMonths: r.validMonths ?? r.valid_months,
    paidAt: r.paidAt ?? r.paid_at,
    createdAt: r.createdAt ?? r.created_at,
    expiresAt: r.expiresAt ?? r.expires_at,
  };
}

export const ordersAPI = {
  create: async (packageId: number, channel = 'wechat_native'): Promise<PaymentOrder> => {
    const data = await apiClient.post<any>('/api/orders', { packageId, channel });
    return mapOrder(data);
  },

  get: async (orderId: number): Promise<PaymentOrder> => {
    const data = await apiClient.get<any>(`/api/orders/${orderId}`);
    return mapOrder(data);
  },

  listMine: async (skip = 0, limit = 20): Promise<{ items: PaymentOrder[]; total: number }> => {
    const data = await apiClient.get<any>(`/api/orders/me?skip=${skip}&limit=${limit}`);
    return {
      items: (data?.items ?? []).map(mapOrder),
      total: Number(data?.total ?? 0),
    };
  },

  adminList: async (params: {
    status?: string;
    userId?: number;
    outTradeNo?: string;
    skip?: number;
    limit?: number;
  }): Promise<{ items: PaymentOrder[]; total: number }> => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.userId) q.set('userId', String(params.userId));
    if (params.outTradeNo) q.set('outTradeNo', params.outTradeNo);
    q.set('skip', String(params.skip ?? 0));
    q.set('limit', String(params.limit ?? 50));
    const data = await apiClient.get<any>(`/api/admin/payment-orders?${q.toString()}`);
    return {
      items: (data?.items ?? []).map(mapOrder),
      total: Number(data?.total ?? 0),
    };
  },
};
