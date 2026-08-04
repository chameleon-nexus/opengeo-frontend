
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Package, Layers, Box, ChevronRight, Loader2, User } from 'lucide-react';
import { Theme, Brand } from '../types';
import { brandsAPI, categoriesAPI, productsAPI, BrandWithCatalog, ProductCategory, Product } from '../api/brands';
import { authAPI } from '../api/auth';
import { useModuleI18n } from '../i18n/hooks';

// ProductCatalog type definition (moved from mockData)
interface ProductCatalog {
  categoryName: string;
  products: string[];
}

interface BrandManagementProps {
  theme: Theme;
  brands: Brand[];
  setBrands: (brands: Brand[]) => void;
}

// 预设全行业分类列表
const BRAND_CATEGORIES = [
    "家电", "洗护用品", "中药", // 保持现有数据的兼容性
    "美妆护肤", "手机数码", "电脑办公", "家居家装", "服饰内衣",
    "鞋靴箱包", "运动户外", "母婴亲子", "食品饮料", "生鲜水果",
    "酒类茶饮", "医药保健", "汽车用品", "图书文娱", "宠物生活",
    "钟表珠宝", "玩具乐器", "金融服务", "房产服务", "本地生活", 
    "奢侈品", "工业制造", "企业服务", "其他"
];

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

const BrandManagement: React.FC<BrandManagementProps> = ({ theme, brands, setBrands }) => {
  const { t } = useModuleI18n('merchant');
  const isDark = theme === 'dark';
  
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [currentBrandCatalog, setCurrentBrandCatalog] = useState<ProductCatalog[]>([]);
  const [brandCatalogData, setBrandCatalogData] = useState<BrandWithCatalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Brand CRUD State
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandId, setNewBrandId] = useState('');
  const [newBrandCategory, setNewBrandCategory] = useState(BRAND_CATEGORIES[0]);
  const [newBrandCustomerId, setNewBrandCustomerId] = useState<number | undefined>(undefined);
  
  // Customer list for assignment
  const [customers, setCustomers] = useState<Array<{id: number, username: string}>>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Editing brand state
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editBrandCustomerId, setEditBrandCustomerId] = useState<number | undefined>(undefined);

  // Catalog CRUD State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [addingProductToCategoryId, setAddingProductToCategoryId] = useState<number | null>(null);

  // 加载当前用户信息和客户列表
  useEffect(() => {
    const loadUserAndCustomers = async () => {
      try {
        const user = await authAPI.getCurrentUser();
        setCurrentUser(user);
        
        // 如果是admin或agent，加载客户列表
        if (user.role === 'admin' || user.role === 'agent') {
          // 使用新的API：Admin可以看到所有客户，Agent只能看到自己创建的
          const customerAccounts = await authAPI.getAllCustomers();
          setCustomers(customerAccounts.map(acc => ({ 
            id: acc.id, 
            username: acc.username || `客户${acc.id}` 
          })));
          console.log('✅ [BrandManagement] 加载客户列表:', customerAccounts.length, '个客户');
        }
      } catch (err) {
        console.error('❌ [BrandManagement] 加载用户信息失败:', err);
        // 如果新API失败，尝试使用旧API（向后兼容）
        try {
          const accounts = await authAPI.getMyAccounts();
          const customerAccounts = accounts.filter(acc => acc.role === 'customer');
          setCustomers(customerAccounts.map(acc => ({ 
            id: acc.id, 
            username: acc.username || `客户${acc.id}` 
          })));
        } catch (fallbackErr) {
          console.error('❌ [BrandManagement] 备用方案也失败:', fallbackErr);
        }
      }
    };
    
    loadUserAndCustomers();
  }, []);

  // 加载选中品牌的完整目录
  useEffect(() => {
    const loadBrandCatalog = async () => {
      if (!selectedBrandId) {
        setCurrentBrandCatalog([]);
        setBrandCatalogData(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const brandData = await brandsAPI.getBrand(selectedBrandId);
        setBrandCatalogData(brandData);
        const catalog = convertBrandWithCatalogToCatalog(brandData);
        setCurrentBrandCatalog(catalog);
      } catch (err) {
        console.error('加载品牌目录失败:', err);
        setError(t('brandManagement.errors.loadFailed'));
        setCurrentBrandCatalog([]);
      } finally {
        setLoading(false);
      }
    };

    loadBrandCatalog();
  }, [selectedBrandId]);

  // -- Brand Actions --

  const handleAddBrand = async () => {
    if (!newBrandName.trim() || !newBrandId.trim()) {
      alert(t('brandManagement.errors.requireBrandFields'));
      return;
    }
    
    // 检查是否已登录
    const token = localStorage.getItem('auth_token');
    if (!token) {
      alert(t('brandManagement.errors.requireLogin'));
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Auto-assign a random color for the logo
      const colors = ['bg-blue-600', 'bg-blue-500', 'bg-green-600', 'bg-purple-600', 'bg-red-600', 'bg-indigo-600', 'bg-pink-600', 'bg-cyan-600'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const newBrand = await brandsAPI.createBrand({
        brand_id: newBrandId.toLowerCase().replace(/\s+/g, '-'),
        name: newBrandName,
        category: newBrandCategory,
        logo_color: randomColor,
        customer_id: newBrandCustomerId, // 可选的客户ID
        is_active: true
      });

      // 更新品牌列表
      const formattedBrand: Brand = {
        id: newBrand.brand_id,
        name: newBrand.name,
        category: newBrand.category,
        logoColor: newBrand.logo_color || 'bg-blue-600'
      };
      setBrands([...brands, formattedBrand]);
      
      setNewBrandName('');
      setNewBrandId('');
      setNewBrandCustomerId(undefined);
      setIsAddingBrand(false);
      
      // 刷新品牌列表
      const updatedBrands = await brandsAPI.listBrands({ is_active: true });
      setBrands(updatedBrands.map(b => ({
        id: b.brand_id,
        name: b.name,
        category: b.category,
        logoColor: b.logo_color || 'bg-blue-600'
      })));
    } catch (err: any) {
      console.error('创建品牌失败:', err);
      const errorMessage = err.message || '创建品牌失败';
      let userMessage = errorMessage;
      
      // 根据错误状态码提供更友好的提示
      if (err.status === 401 || errorMessage.includes('Unauthorized') || errorMessage.includes('需要登录')) {
        userMessage = '需要管理员权限。请使用管理员账号登录。';
      } else if (err.status === 403 || errorMessage.includes('Forbidden') || errorMessage.includes('需要管理员权限')) {
        userMessage = '权限不足。此操作需要管理员权限。';
      }
      
      setError(userMessage);
      alert(userMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBrandCustomer = async (brandId: string, customerId: number | undefined) => {
    try {
      setLoading(true);
      setError(null);
      
      await brandsAPI.updateBrand(brandId, {
        customer_id: customerId || null
      });
      
      // 刷新品牌列表
      const updatedBrands = await brandsAPI.listBrands({ is_active: true });
      setBrands(updatedBrands.map(b => ({
        id: b.brand_id,
        name: b.name,
        category: b.category,
        logoColor: b.logo_color || 'bg-blue-600',
        customerId: b.customer_id || null
      })));
      
      setEditingBrand(null);
      setEditBrandCustomerId(undefined);
    } catch (err: any) {
      console.error('更新品牌客户归属失败:', err);
      const errorMessage = err.message || '更新失败';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (!confirm('确定要删除此品牌吗？这将同时删除其所有产品数据。')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await brandsAPI.deleteBrand(brandId);
      
      // 刷新品牌列表
      const updatedBrands = await brandsAPI.listBrands({ is_active: true });
      setBrands(updatedBrands.map(b => ({
        id: b.brand_id,
        name: b.name,
        category: b.category,
        logoColor: b.logo_color || 'bg-blue-600',
        customerId: b.customer_id || null
      })));
      
      if (selectedBrandId === brandId) {
        setSelectedBrandId(null);
      }
    } catch (err: any) {
      console.error('删除品牌失败:', err);
      const errorMessage = err.message || '删除品牌失败';
      let userMessage = errorMessage;
      
      if (err.status === 401 || errorMessage.includes('Unauthorized') || errorMessage.includes('需要登录')) {
        userMessage = '需要管理员权限。请使用管理员账号登录。';
      } else if (err.status === 403 || errorMessage.includes('Forbidden') || errorMessage.includes('需要管理员权限')) {
        userMessage = '权限不足。此操作需要管理员权限。';
      }
      
      setError(userMessage);
      alert(userMessage);
    } finally {
      setLoading(false);
    }
  };

  // -- Category Actions --

  const handleAddCategory = async () => {
    if (!selectedBrandId || !newCategoryName.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      await categoriesAPI.createCategory(selectedBrandId, {
        category_name: newCategoryName,
        sort_order: currentBrandCatalog.length
      });
      
      // 重新加载品牌目录
      const brandData = await brandsAPI.getBrand(selectedBrandId);
      setBrandCatalogData(brandData);
      const catalog = convertBrandWithCatalogToCatalog(brandData);
      setCurrentBrandCatalog(catalog);
      
      setNewCategoryName('');
      setIsAddingCategory(false);
    } catch (err: any) {
      console.error('创建品类失败:', err);
      const errorMessage = err.message || '创建品类失败';
      let userMessage = errorMessage;
      
      if (err.status === 401 || errorMessage.includes('Unauthorized') || errorMessage.includes('需要登录')) {
        userMessage = '需要管理员权限。请使用管理员账号登录。';
      } else if (err.status === 403 || errorMessage.includes('Forbidden') || errorMessage.includes('需要管理员权限')) {
        userMessage = '权限不足。此操作需要管理员权限。';
      }
      
      setError(userMessage);
      alert(userMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!selectedBrandId) return;
    if (!confirm('确定要删除此品类吗？这将同时删除该品类下的所有产品。')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await categoriesAPI.deleteCategory(selectedBrandId, categoryId);
      
      // 重新加载品牌目录
      const brandData = await brandsAPI.getBrand(selectedBrandId);
      setBrandCatalogData(brandData);
      const catalog = convertBrandWithCatalogToCatalog(brandData);
      setCurrentBrandCatalog(catalog);
    } catch (err: any) {
      console.error('删除品类失败:', err);
      const errorMessage = err.message || '删除品类失败';
      let userMessage = errorMessage;
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        userMessage = '需要管理员权限。请使用管理员账号登录。';
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        userMessage = '权限不足。此操作需要管理员权限。';
      }
      
      setError(userMessage);
      alert(userMessage);
    } finally {
      setLoading(false);
    }
  };

  // -- Product Actions --

  const handleAddProduct = async (categoryId: number) => {
    if (!selectedBrandId || !newProductName.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      const category = brandCatalogData?.categories.find(c => c.id === categoryId);
      if (!category) return;
      
      await productsAPI.createProduct(selectedBrandId, categoryId, {
        product_name: newProductName,
        sort_order: category.products.length
      });
      
      // 重新加载品牌目录
      const brandData = await brandsAPI.getBrand(selectedBrandId);
      setBrandCatalogData(brandData);
      const catalog = convertBrandWithCatalogToCatalog(brandData);
      setCurrentBrandCatalog(catalog);
      
      setNewProductName('');
      setAddingProductToCategoryId(null);
    } catch (err: any) {
      console.error('创建产品失败:', err);
      const errorMessage = err.message || '创建产品失败';
      let userMessage = errorMessage;
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        userMessage = '需要管理员权限。请使用管理员账号登录。';
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        userMessage = '权限不足。此操作需要管理员权限。';
      }
      
      setError(userMessage);
      alert(userMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (categoryId: number, productId: number) => {
    if (!selectedBrandId) return;
    if (!confirm('确定要删除此产品吗？')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await productsAPI.deleteProduct(selectedBrandId, categoryId, productId);
      
      // 重新加载品牌目录
      const brandData = await brandsAPI.getBrand(selectedBrandId);
      setBrandCatalogData(brandData);
      const catalog = convertBrandWithCatalogToCatalog(brandData);
      setCurrentBrandCatalog(catalog);
    } catch (err: any) {
      console.error('删除产品失败:', err);
      const errorMessage = err.message || '删除产品失败';
      let userMessage = errorMessage;
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        userMessage = '需要管理员权限。请使用管理员账号登录。';
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        userMessage = '权限不足。此操作需要管理员权限。';
      }
      
      setError(userMessage);
      alert(userMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full p-4 lg:p-6 gap-6">
        
        {/* Left Panel: Brand List */}
        <div className={`w-80 flex flex-col rounded-[2rem] border shadow-sm overflow-hidden 
            ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}
        `}>
            <div className={`p-6 border-b flex justify-between items-center 
                ${isDark ? 'border-zinc-800' : 'border-slate-100'}
            `}>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('brandManagement.pageTitle')}</h3>
                {(currentUser?.role === 'admin' || currentUser?.role === 'agent') && (
                <button 
                    onClick={() => setIsAddingBrand(true)}
                    className={`p-2 rounded-full transition-colors 
                        ${isDark 
                            ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' 
                            : 'hover:bg-slate-100 text-slate-500 hover:text-blue-600'
                        }
                    `}
                >
                    <Plus className="w-5 h-5" />
                </button>
                )}
            </div>
            
            {/* 编辑品牌客户归属的弹窗 */}
            {editingBrand && (
                <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50`} onClick={() => setEditingBrand(null)}>
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className={`w-96 p-6 rounded-2xl border shadow-xl
                            ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-200'}
                        `}
                    >
                        <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            分配品牌给客户
                        </h3>
                        <p className={`text-sm mb-4 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                            品牌：{editingBrand.name}
                        </p>
                        <div className="mb-4">
                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                                选择客户
                            </label>
                            <select 
                                value={editBrandCustomerId || ''}
                                onChange={e => setEditBrandCustomerId(e.target.value ? parseInt(e.target.value) : undefined)}
                                className={`w-full px-4 py-2 rounded-xl border outline-none
                                    ${isDark 
                                        ? 'bg-zinc-800 border-zinc-700 text-white' 
                                        : 'bg-white border-slate-200 text-slate-900'
                                    }
                                `}
                                disabled={customers.length === 0}
                            >
                                <option value="">{customers.length === 0 ? '暂无客户账户' : '不分配（移除客户归属）'}</option>
                                {customers.map(customer => (
                                    <option key={customer.id} value={customer.id}>{customer.username}</option>
                                ))}
                            </select>
                            {customers.length === 0 && (
                                <p className={`text-xs mt-2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                                    提示：请先在"账户管理"中创建客户账户
                                </p>
                            )}
                        </div>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => {
                                    setEditingBrand(null);
                                    setEditBrandCustomerId(undefined);
                                }}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
                                    ${isDark 
                                        ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' 
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }
                                `}
                            >
                                取消
                            </button>
                            <button 
                                onClick={() => handleUpdateBrandCustomer(editingBrand.id, editBrandCustomerId)}
                                disabled={loading}
                                className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-coral text-white shadow-coral hover:opacity-95 disabled:opacity-50 transition-colors"
                            >
                                {loading ? '保存中...' : '保存'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {isAddingBrand && (
                    <div className={`p-3 rounded-xl border mb-2 
                        ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-50 border-slate-200'}
                    `}>
                        <div className="text-xs font-bold mb-1 opacity-50 px-1">新建品牌</div>
                        <input 
                            autoFocus
                            placeholder="输入品牌ID (英文，如: philips)"
                            value={newBrandId}
                            onChange={e => setNewBrandId(e.target.value)}
                            className={`w-full bg-transparent outline-none text-sm mb-3 font-bold px-1 py-1 border-b 
                                ${isDark 
                                    ? 'border-zinc-700 text-white placeholder-zinc-500' 
                                    : 'border-slate-200 text-slate-900 placeholder-slate-400'
                                }
                            `}
                        />
                        <input 
                            placeholder="输入品牌名称..."
                            value={newBrandName}
                            onChange={e => setNewBrandName(e.target.value)}
                            className={`w-full bg-transparent outline-none text-sm mb-3 font-bold px-1 py-1 border-b 
                                ${isDark 
                                    ? 'border-zinc-700 text-white placeholder-zinc-500' 
                                    : 'border-slate-200 text-slate-900 placeholder-slate-400'
                                }
                            `}
                        />
                        <div className="text-xs font-bold mb-1 opacity-50 px-1">所属分类</div>
                        <select 
                            value={newBrandCategory}
                            onChange={e => setNewBrandCategory(e.target.value)}
                            className={`w-full bg-transparent outline-none text-xs mb-3 p-1 rounded cursor-pointer 
                                ${isDark ? 'text-zinc-300 bg-zinc-900' : 'text-slate-600 bg-transparent'}
                            `}
                        >
                            {BRAND_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        
                        {/* 客户分配（仅admin/agent可见） */}
                        {(currentUser?.role === 'admin' || currentUser?.role === 'agent') && (
                            <>
                                <div className="text-xs font-bold mb-1 opacity-50 px-1">分配给客户（可选）</div>
                                <select 
                                    value={newBrandCustomerId || ''}
                                    onChange={e => setNewBrandCustomerId(e.target.value ? parseInt(e.target.value) : undefined)}
                                    className={`w-full bg-transparent outline-none text-xs mb-3 p-1 rounded cursor-pointer 
                                        ${isDark ? 'text-zinc-300 bg-zinc-900' : 'text-slate-600 bg-transparent'}
                                    `}
                                    disabled={customers.length === 0}
                                >
                                    <option value="">{customers.length === 0 ? '暂无客户账户' : '不分配（暂不分配客户）'}</option>
                                    {customers.map(customer => (
                                        <option key={customer.id} value={customer.id}>{customer.username}</option>
                                    ))}
                                </select>
                                {customers.length === 0 && (
                                    <p className={`text-xs mb-3 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                                        提示：请先在"账户管理"中创建客户账户
                                    </p>
                                )}
                            </>
                        )}
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsAddingBrand(false)} disabled={loading} className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"><X className="w-4 h-4 text-slate-400" /></button>
                            <button onClick={handleAddBrand} disabled={loading} className="p-1.5 rounded-lg bg-gradient-coral text-white shadow-coral hover:opacity-95 shadow-sm transition-colors disabled:opacity-50">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                )}

                {brands.map(brand => {
                    // 从品牌数据中获取customer_id
                    const customerId = brand.customerId;
                    const customerName = customerId ? customers.find(c => c.id === customerId)?.username : null;
                    
                    return (
                    <div 
                        key={brand.id}
                        onClick={() => setSelectedBrandId(brand.id)}
                        className={`group p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between
                            ${selectedBrandId === brand.id 
                                ? (isDark 
                                    ? 'bg-zinc-800 border-zinc-700 ring-1 ring-zinc-600' 
                                    : 'bg-slate-50 border-slate-200 ring-1 ring-slate-200'
                                  ) 
                                : (isDark 
                                    ? 'bg-transparent border-transparent hover:bg-zinc-800/50' 
                                    : 'bg-transparent border-transparent hover:bg-slate-50'
                                  )
                            }
                        `}
                    >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${brand.logoColor}`}>
                                {brand.name.substring(0, 1)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={`text-sm font-bold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>{brand.name}</div>
                                <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                                    {brand.category}
                                    {customerName && (
                                        <span className="ml-2 flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            {customerName}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {(currentUser?.role === 'admin' || currentUser?.role === 'agent') && (
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setEditingBrand(brand);
                                        setEditBrandCustomerId(customerId || undefined);
                                    }}
                                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-blue-500/10 text-slate-400 hover:text-blue-500 transition-all"
                                    title="分配客户"
                                >
                                    <User className="w-4 h-4" />
                                </button>
                            )}
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteBrand(brand.id); }}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    </div>
                    );
                })}
            </div>
        </div>

        {/* Right Panel: Catalog Management */}
        <div className={`flex-1 flex flex-col rounded-[2rem] border shadow-sm overflow-hidden 
            ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}
        `}>
            {!selectedBrandId ? (
                <div className="flex-1 flex flex-col items-center justify-center opacity-40">
                    <Package className="w-16 h-16 mb-4 text-slate-400" />
                    <p>请选择左侧品牌以管理产品目录</p>
                </div>
            ) : (
                <>
                    <div className={`p-6 border-b flex justify-between items-center 
                        ${isDark ? 'border-zinc-800' : 'border-slate-100'}
                    `}>
                        <div>
                            <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                产品目录管理
                            </h3>
                            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                                当前管理: {brands.find(b => b.id === selectedBrandId)?.name}
                            </p>
                        </div>
                        <button 
                            onClick={() => setIsAddingCategory(true)}
                            disabled={loading || !selectedBrandId}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50
                                ${isDark 
                                    ? 'bg-white text-black hover:bg-zinc-200' 
                                    : 'bg-gradient-coral text-white shadow-coral hover:opacity-95'
                                }
                            `}
                        >
                            <Plus className="w-4 h-4" /> 新增品类
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {isAddingCategory && (
                            <div className={`p-4 rounded-xl border-2 border-dashed flex items-center gap-4 
                                ${isDark 
                                    ? 'border-zinc-700 bg-zinc-800/30' 
                                    : 'border-slate-300 bg-slate-50'
                                }
                            `}>
                                <Layers className="w-5 h-5 text-slate-400" />
                                <input 
                                    autoFocus
                                    placeholder="输入新品类名称..."
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    className={`flex-1 bg-transparent outline-none font-bold 
                                        ${isDark ? 'text-white placeholder-zinc-600' : 'text-slate-900 placeholder-slate-400'}
                                    `}
                                    onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                                />
                                <div className="flex gap-2">
                                    <button onClick={() => setIsAddingCategory(false)} disabled={loading} className="px-3 py-1.5 text-xs font-bold rounded-lg hover:bg-black/5 text-slate-500 disabled:opacity-50">取消</button>
                                    <button onClick={handleAddCategory} disabled={loading} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-coral text-white shadow-coral hover:opacity-95 disabled:opacity-50 flex items-center gap-2">
                                        {loading ? <Loader2 className="w-3 h-3 animate-spin text-blue-500" /> : null}
                                        确认添加
                                    </button>
                                </div>
                            </div>
                        )}

                        {loading && (
                            <div className="text-center py-20">
                                <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin opacity-40" />
                                <p className="opacity-40">加载中...</p>
                            </div>
                        )}

                        {error && (
                            <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-red-900/20 border border-red-800 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                                {error}
                            </div>
                        )}

                        {!loading && currentBrandCatalog.length === 0 && !isAddingCategory && (
                            <div className="text-center py-20 opacity-40">
                                <Box className="w-12 h-12 mx-auto mb-3" />
                                <p>暂无品类数据，请点击右上角添加</p>
                            </div>
                        )}

                        {!loading && currentBrandCatalog.map((cat, catIdx) => {
                            const categoryId = brandCatalogData?.categories.find(c => c.category_name === cat.categoryName)?.id;
                            if (!categoryId) return null;
                            
                            return (
                            <div key={catIdx} className={`rounded-xl border overflow-hidden 
                                ${isDark 
                                    ? 'bg-zinc-800/30 border-zinc-700' 
                                    : 'bg-white border-slate-200 shadow-sm'
                                }
                            `}>
                                <div className={`p-4 flex items-center justify-between 
                                    ${isDark ? 'bg-zinc-800' : 'bg-slate-50'}
                                `}>
                                    <div className="flex items-center gap-3">
                                        <Layers className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`} />
                                        <span className={`font-bold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>{cat.categoryName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setAddingProductToCategoryId(categoryId)}
                                            disabled={loading}
                                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50
                                                ${isDark 
                                                    ? 'hover:bg-zinc-700 text-zinc-400' 
                                                    : 'hover:bg-slate-200 text-slate-500'
                                                }
                                            `}
                                            title="添加产品"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteCategory(categoryId)}
                                            disabled={loading}
                                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50
                                                ${isDark 
                                                    ? 'hover:bg-red-900/30 text-zinc-400 hover:text-red-400' 
                                                    : 'hover:bg-red-50 text-slate-500 hover:text-red-500'
                                                }
                                            `}
                                            title="删除品类"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="p-2 space-y-1">
                                    {cat.products.map((prod, prodIdx) => {
                                        const product = brandCatalogData?.categories
                                            .find(c => c.id === categoryId)
                                            ?.products.find(p => p.product_name === prod);
                                        const productId = product?.id;
                                        if (productId === undefined) return null;
                                        
                                        return (
                                            <div key={productId} className={`group flex items-center justify-between px-4 py-3 rounded-lg 
                                                ${isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-slate-50'}
                                            `}>
                                                <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>{prod}</span>
                                                <button 
                                                    onClick={() => handleDeleteProduct(categoryId, productId)}
                                                    disabled={loading}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all disabled:opacity-50"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                    
                                    {addingProductToCategoryId === categoryId && (
                                        <div className="px-4 py-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                            <ChevronRight className="w-4 h-4 text-blue-500" />
                                            <input 
                                                autoFocus
                                                placeholder="输入产品型号..."
                                                value={newProductName}
                                                onChange={e => setNewProductName(e.target.value)}
                                                className={`flex-1 bg-transparent outline-none text-sm 
                                                    ${isDark ? 'text-white placeholder-zinc-600' : 'text-slate-900 placeholder-slate-400'}
                                                `}
                                                onKeyDown={e => e.key === 'Enter' && handleAddProduct(categoryId)}
                                                disabled={loading}
                                            />
                                            <button onClick={() => setAddingProductToCategoryId(null)} disabled={loading} className="p-1 hover:bg-black/10 rounded disabled:opacity-50"><X className="w-3 h-3" /></button>
                                            <button onClick={() => handleAddProduct(categoryId)} disabled={loading} className="p-1 hover:bg-blue-100 rounded text-blue-600 disabled:opacity-50">
                                                {loading ? <Loader2 className="w-3 h-3 animate-spin text-blue-500" /> : <Check className="w-3 h-3" />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>

    </div>
  );
};

export default BrandManagement;

