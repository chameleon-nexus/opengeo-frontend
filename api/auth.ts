/**
 * 认证相关API
 */

import apiClient from './client';
import { UserInfo, SubAccount } from '../types';
import { saveAuthSessionFromResponse, syncAuthSession } from '../lib/authSession';
import { getApiOrigin } from '../lib/apiOrigin';

const API_BASE_URL = getApiOrigin();

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

export interface PhoneLoginRequest {
  phone: string;
  code: string;
}

export interface SendCodeRequest {
  phone: string;
}

export interface PhoneLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  user: {
    id: number;
    username: string | null;
    phone: string | null;
    role: string;
  };
}

export interface CreateUserRequest {
  username: string;
  email?: string;
  phone?: string;
  password: string;
  role_id?: number;  // 角色组ID（create-user 使用）
  merchant_id?: number;  // 归属商户（create-user 使用）
  max_brands?: number | null;
}

export interface PointTransactionRow {
  id: number;
  amount: number;
  reason: string;
  related_type: string | null;
  related_id: string | null;
  created_at: string | null;
  username?: string | null;
}

export const authAPI = {
  /**
   * 用户登录（账号密码）
   * 注意：后端使用 OAuth2PasswordRequestForm，需要发送 form-data
   */
  login: async (username: string, password: string): Promise<LoginResponse> => {
    // OAuth2PasswordRequestForm 需要 form-data 格式
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    // Use relative path to avoid CORS issues (Nginx will proxy to backend)
    const baseURL = API_BASE_URL.startsWith('/') ? '' : API_BASE_URL;
    const url = `${baseURL}/api/auth/login`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });
    } catch (e) {
      if (e instanceof TypeError && /fetch|network|failed/i.test(e.message)) {
        throw new Error(`无法连接后端 ${baseURL || API_BASE_URL}，请先启动 openbackend（默认端口 8002）`);
      }
      throw e;
    }

    let data: { code?: number; message?: string; data?: LoginResponse; detail?: unknown } = {};
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch {
      if (!response.ok) {
        throw new Error(
          response.status
            ? `登录失败（HTTP ${response.status}），请确认 openbackend 已启动且 DATABASE_URL 可连库`
            : '无法连接后端，请先启动 openbackend（默认 http://localhost:8002）'
        );
      }
    }

    if (!response.ok) {
      const detail =
        typeof data.detail === 'string'
          ? data.detail
          : Array.isArray(data.detail)
            ? data.detail.map((d) => (typeof d === 'object' && d && 'msg' in d ? String((d as { msg: string }).msg) : String(d))).join('；')
            : data.message;
      throw new Error(detail || `登录失败（HTTP ${response.status}）`);
    }
    
    // Backend返回格式：{code: 0, message: "success", data: {...}}
    if (data.code === 0) {
      const loginData = data.data as LoginResponse;
      saveAuthSessionFromResponse(loginData);
      apiClient.setToken(loginData.access_token, loginData.expires_at);
      return loginData;
    } else {
      throw new Error(data.message || '登录失败');
    }
  },

  /**
   * 发送手机验证码
   */
  sendCode: async (phone: string): Promise<void> => {
    await apiClient.post('/api/auth/send-code', { phone });
  },

  /**
   * 手机号验证码登录/注册
   */
  loginWithPhone: async (phone: string, code: string): Promise<PhoneLoginResponse> => {
    const loginData = await apiClient.post<PhoneLoginResponse>('/api/auth/login/phone', {
      phone,
      code,
    });
    saveAuthSessionFromResponse(loginData);
    apiClient.setToken(loginData.access_token, loginData.expires_at);
    return loginData;
  },

  /**
   * 用户注册
   */
  register: async (username: string, email: string, password: string): Promise<any> => {
    return apiClient.post('/api/auth/register', {
      username,
      email,
      password,
    });
  },

  /**
   * 用户登出
   */
  logout: async (): Promise<void> => {
    apiClient.clearToken();
  },

  /**
   * 同步会话：校验 token 并续期，返回用户信息
   */
  syncAuthSession,

  /**
   * 获取当前用户信息
   */
  getCurrentUser: async (): Promise<UserInfo> => {
    console.log('🔍 [getCurrentUser] 开始获取用户信息');
    const token = localStorage.getItem('auth_token');
    console.log('🔑 [getCurrentUser] Token:', token ? `${token.substring(0, 20)}...` : 'null');
    
    try {
      // apiClient.get 已经处理了 code 检查，直接返回 data
      const userData = await apiClient.get<UserInfo>('/api/auth/me');
      console.log('✅ [getCurrentUser] 获取成功:', userData);
      return userData;
    } catch (error: any) {
      console.error('❌ [getCurrentUser] 获取失败:', error);
      console.error('❌ [getCurrentUser] 错误详情:', {
        status: error.status,
        statusCode: error.statusCode,
        response: error.response,
        responseData: error.responseData
      });
      throw new Error(error.message || '获取用户信息失败');
    }
  },

  /**
   * 管理员创建代理商账户
   */
  createAgent: async (userData: CreateUserRequest): Promise<void> => {
    console.log('📤 [createAgent] 发送请求:', userData);
    // apiClient.post 已经处理了 code 检查，直接调用即可
    await apiClient.post('/api/auth/create-agent', userData);
    console.log('✅ [createAgent] 创建成功');
  },

  /**
   * 代理商创建客户账户
   */
  createCustomer: async (userData: CreateUserRequest & { merchant_id?: number }): Promise<void> => {
    console.log('📤 [createCustomer] 发送请求:', userData);
    await apiClient.post('/api/auth/create-customer', userData);
    console.log('✅ [createCustomer] 创建成功');
  },

  /**
   * 获取我创建的账户列表；可选按归属商户过滤
   */
  getMyAccounts: async (params?: { merchant_id?: number }): Promise<SubAccount[]> => {
    const accounts = await apiClient.get<SubAccount[]>('/api/auth/my-accounts', {
      params: params?.merchant_id != null ? { merchant_id: params.merchant_id } : undefined,
    });
    console.log('✅ [getMyAccounts] 获取成功:', accounts);
    return accounts;
  },

  /**
   * [Admin] 获取所有用户列表（用于指派等）
   */
  getAdminUsers: async (): Promise<Array<{ id: number; username: string; role: string; merchant_id: number | null }>> => {
    return apiClient.get('/api/auth/admin/users');
  },

  /**
   * 获取所有客户列表（Admin可以看到所有客户，Agent只能看到自己创建的）
   */
  getAllCustomers: async (): Promise<SubAccount[]> => {
    const customers = await apiClient.get<SubAccount[]>('/api/auth/all-customers');
    console.log('✅ [getAllCustomers] 获取成功:', customers);
    return customers;
  },

  /**
   * 管理员为指定用户充值积分
   */
  rechargePoints: async (userId: number, amount: number): Promise<{ user_id: number; points: number }> => {
    return apiClient.post<{ user_id: number; points: number }>('/api/auth/recharge-points', {
      user_id: userId,
      amount,
    });
  },

  /**
   * 当前用户积分明细分页
   */
  listPointTransactions: async (
    skip = 0,
    limit = 20,
  ): Promise<{ items: PointTransactionRow[]; total: number; balance: number | null; unlimited?: boolean }> => {
    return apiClient.get<{ items: PointTransactionRow[]; total: number; balance: number | null; unlimited?: boolean }>(
      `/api/auth/point-transactions?skip=${skip}&limit=${limit}`,
    );
  },

  /**
   * 管理员统一创建用户（指定角色组）
   */
  createUser: async (userData: CreateUserRequest & { role_id: number }): Promise<{ user_id: number; username: string; role: string; role_id: number }> => {
    return apiClient.post('/api/auth/create-user', userData);
  },

  /**
   * 管理员修改用户角色
   */
  updateUserRole: async (userId: number, roleId: number): Promise<{ user_id: number; role: string; role_id: number }> => {
    return apiClient.put(`/api/auth/users/${userId}/role`, { role_id: roleId });
  },

  /**
   * 管理员重置用户密码（无需旧密码，含 admin 自身）
   */
  resetUserPassword: async (userId: number, password: string): Promise<{ user_id: number; username: string }> => {
    return apiClient.put(`/api/auth/users/${userId}/password`, { password });
  },

  grantSaasPackage: async (
    userId: number,
    body: {
      package_id: number;
      username?: string;
      password?: string;
      idempotency_key?: string;
    },
  ): Promise<Record<string, unknown>> => {
    return apiClient.post(`/api/auth/users/${userId}/grant-saas-package`, body);
  },

  /**
   * 当前用户修改密码（需验证旧密码）
   */
  changeMyPassword: async (
    oldPassword: string,
    newPassword: string,
  ): Promise<{ user_id: number; username: string }> => {
    return apiClient.put('/api/auth/me/password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },

  /**
   * 管理员设置用户品牌创建额度
   */
  updateBrandQuota: async (
    userId: number,
    maxBrands: number | null,
  ): Promise<{ user_id: number; max_brands: number | null; brand_count: number }> => {
    return apiClient.put(`/api/auth/users/${userId}/brand-quota`, { max_brands: maxBrands });
  },

  /**
   * 管理员删除子账户（软删除）
   */
  deleteUser: async (userId: number): Promise<void> => {
    await apiClient.delete(`/api/auth/users/${userId}`);
  },
};

