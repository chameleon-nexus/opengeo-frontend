import apiClient from './client';

export interface PaymentChannelInfo {
  channelCode: string;
  displayName: string;
  enabled: boolean;
  mchId: string;
  appId: string;
  merchantSerialNo: string;
  wechatPublicKeyId: string;
  apiV3KeyMasked: string;
  privateKeyConfigured: boolean;
  wechatPublicKeyConfigured: boolean;
  notifyPath: string;
  notifyUrl?: string;
  publicApiBaseUrl?: string;
  publicApiBaseConfigured?: boolean;
}

export const paymentChannelsAPI = {
  get: async (): Promise<{
    channels: PaymentChannelInfo[];
    notifyUrl: string;
    publicApiBaseUrl?: string;
    publicApiBaseConfigured?: boolean;
  }> => {
    const data = await apiClient.get<any>('/api/admin/payment-channels');
    const channels = (data?.channels ?? []).map((c: any) => ({
      channelCode: c.channelCode ?? c.channel_code ?? '',
      displayName: c.displayName ?? c.display_name ?? '',
      enabled: Boolean(c.enabled),
      mchId: c.mchId ?? c.mch_id ?? '',
      appId: c.appId ?? c.app_id ?? '',
      merchantSerialNo: c.merchantSerialNo ?? c.merchant_serial_no ?? '',
      wechatPublicKeyId: c.wechatPublicKeyId ?? c.wechat_public_key_id ?? '',
      apiV3KeyMasked: c.apiV3KeyMasked ?? '',
      privateKeyConfigured: Boolean(c.privateKeyConfigured),
      wechatPublicKeyConfigured: Boolean(c.wechatPublicKeyConfigured),
      notifyPath: c.notifyPath ?? '/api/payments/notify/wechat-native',
      notifyUrl: c.notifyUrl,
    }));
    return {
      channels,
      notifyUrl: data?.notifyUrl ?? '',
      publicApiBaseUrl: data?.publicApiBaseUrl ?? '',
      publicApiBaseConfigured: Boolean(data?.publicApiBaseConfigured),
    };
  },

  saveWechatNative: async (body: {
    enabled: boolean;
    mchId: string;
    appId: string;
    merchantSerialNo: string;
    wechatPublicKeyId?: string;
    apiV3Key?: string;
    privateKeyPem?: string;
    wechatPublicKeyPem?: string;
    displayName?: string;
  }) => {
    return apiClient.put('/api/admin/payment-channels/wechat-native', body);
  },

  testWechatNative: async (): Promise<{ ok: boolean; message: string }> => {
    return apiClient.post('/api/admin/payment-channels/wechat-native/test', {});
  },
};
