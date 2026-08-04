import { useState, useEffect } from 'react';
import { Brand } from '../types';
import { brandsAPI, BrandWithCatalog } from '../api/brands';

// ProductCatalog type definition (moved from mockData)
export interface ProductCatalog {
  categoryName: string;
  products: string[];
}

// 转换API数据格式为前端使用的格式
const convertBrandWithCatalogToCatalog = (brandCatalog: BrandWithCatalog): ProductCatalog[] => {
  return brandCatalog.categories
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map(cat => ({
      categoryName: cat.category_name,
      products: cat.products
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map(prod => prod.product_name)
    }));
};

/**
 * 用于加载品牌目录的Hook
 */
export const useBrandCatalog = (brand: Brand | null) => {
  const [catalog, setCatalog] = useState<ProductCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCatalog = async () => {
      if (!brand) {
        setCatalog([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const brandData = await brandsAPI.getBrand(brand.id);
        const catalogData = convertBrandWithCatalogToCatalog(brandData);
        setCatalog(catalogData);
      } catch (err) {
        console.error('加载品牌目录失败:', err);
        setError('加载品牌目录失败');
        setCatalog([]);
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();
  }, [brand?.id]);

  return { catalog, loading, error };
};





