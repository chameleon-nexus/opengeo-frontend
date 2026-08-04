/**
 * 品牌管理相关API
 */

import apiClient from './client';

// ========== 类型定义 ==========

export interface Brand {
  id: number;
  brand_id: string;
  name: string;
  category: string;
  logo_color: string | null;
  brand_introduction?: string | null;
  knowledge_base_id?: number | null;
  created_by: number;
  customer_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductCategory {
  id: number;
  brand_id: number;
  category_name: string;
  sort_order: number;
  products: Product[];
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  category_id: number;
  product_name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BrandWithCatalog extends Brand {
  categories: ProductCategory[];
}

export interface BrandCreateRequest {
  brand_id: string;
  name: string;
  category: string;
  logo_color?: string;
  brand_introduction?: string | null;
  knowledge_base_id?: number | null;
  customer_id?: number;  // 可选：创建时直接分配给客户
  is_active?: boolean;
}

export interface BrandUpdateRequest {
  name?: string;
  category?: string;
  logo_color?: string;
  brand_introduction?: string | null;
  knowledge_base_id?: number | null;
  customer_id?: number;  // 可以修改客户归属
  is_active?: boolean;
}

export interface ProductCategoryCreateRequest {
  category_name: string;
  sort_order?: number;
}

export interface ProductCategoryUpdateRequest {
  category_name?: string;
  sort_order?: number;
}

export interface ProductCreateRequest {
  product_name: string;
  sort_order?: number;
}

export interface ProductUpdateRequest {
  product_name?: string;
  sort_order?: number;
}

// ========== Brand APIs ==========

export const brandsAPI = {
  /**
   * 获取品牌列表
   */
  listBrands: async (params?: {
    category?: string;
    is_active?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<Brand[]> => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.is_active !== undefined) queryParams.append('is_active', String(params.is_active));
    if (params?.skip) queryParams.append('skip', String(params.skip));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    
    const query = queryParams.toString();
    return apiClient.get<Brand[]>(`/api/brands${query ? `?${query}` : ''}`);
  },

  /**
   * 获取品牌详情（含完整产品目录）
   * @param brandId 品牌 slug（brands.brand_id），非数字主键
   */
  getBrand: async (brandId: string): Promise<BrandWithCatalog> => {
    return apiClient.get<BrandWithCatalog>(`/api/brands/${brandId}`);
  },

  /**
   * 按 brands 表主键查询（workflow.brandId 等场景）。
   * GET /api/brands/{slug} 不接受数字 id，故通过列表匹配 id。
   */
  getBrandByDbId: async (dbId: number): Promise<Brand | null> => {
    if (!Number.isFinite(dbId) || dbId <= 0) return null;
    try {
      const list = await brandsAPI.listBrands({ limit: 500 });
      return list.find((b) => b.id === dbId) ?? null;
    } catch {
      return null;
    }
  },

  /**
   * 创建品牌（需管理员权限）
   */
  createBrand: async (data: BrandCreateRequest): Promise<Brand> => {
    return apiClient.post<Brand>('/api/brands', data);
  },

  /**
   * 更新品牌（需管理员权限）
   */
  updateBrand: async (brandId: string, data: BrandUpdateRequest): Promise<Brand> => {
    return apiClient.put<Brand>(`/api/brands/${brandId}`, data);
  },

  /**
   * 删除品牌（需管理员权限）
   */
  deleteBrand: async (brandId: string): Promise<void> => {
    return apiClient.delete<void>(`/api/brands/${brandId}`);
  },
};

// ========== ProductCategory APIs ==========

export const categoriesAPI = {
  /**
   * 创建产品分类（需管理员权限）
   */
  createCategory: async (brandId: string, data: ProductCategoryCreateRequest): Promise<ProductCategory> => {
    return apiClient.post<ProductCategory>(`/api/brands/${brandId}/categories`, data);
  },

  /**
   * 更新产品分类（需管理员权限）
   */
  updateCategory: async (
    brandId: string,
    categoryId: number,
    data: ProductCategoryUpdateRequest
  ): Promise<ProductCategory> => {
    return apiClient.put<ProductCategory>(`/api/brands/${brandId}/categories/${categoryId}`, data);
  },

  /**
   * 删除产品分类（需管理员权限）
   */
  deleteCategory: async (brandId: string, categoryId: number): Promise<void> => {
    return apiClient.delete<void>(`/api/brands/${brandId}/categories/${categoryId}`);
  },
};

// ========== Product APIs ==========

export const productsAPI = {
  /**
   * 创建产品（需管理员权限）
   */
  createProduct: async (
    brandId: string,
    categoryId: number,
    data: ProductCreateRequest
  ): Promise<Product> => {
    return apiClient.post<Product>(`/api/brands/${brandId}/categories/${categoryId}/products`, data);
  },

  /**
   * 更新产品（需管理员权限）
   */
  updateProduct: async (
    brandId: string,
    categoryId: number,
    productId: number,
    data: ProductUpdateRequest
  ): Promise<Product> => {
    return apiClient.put<Product>(
      `/api/brands/${brandId}/categories/${categoryId}/products/${productId}`,
      data
    );
  },

  /**
   * 删除产品（需管理员权限）
   */
  deleteProduct: async (
    brandId: string,
    categoryId: number,
    productId: number
  ): Promise<void> => {
    return apiClient.delete<void>(
      `/api/brands/${brandId}/categories/${categoryId}/products/${productId}`
    );
  },
};

