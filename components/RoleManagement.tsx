import React, { useState, useEffect } from 'react';
import { Shield, Plus, Pencil, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Theme, RoleGroup, ModuleType, SiteCapabilities } from '../types';
import { rolesAPI } from '../api/roles';
import { SIDEBAR_MENU_ITEMS, HIDDEN_FROM_SIDEBAR, getOrderedPermissionMenuEntries } from '../config/menuByRole';
import { getRoleDisplayName } from '../config/roleLabels';
import { useModuleI18n } from '../i18n/hooks';
import {
  ADMIN_PAGE_SHELL_CLS,
  adminCardCls,
  adminLoadingCls,
  adminPageOuterCls,
  adminRowHoverCls,
  adminSubtitleCls,
  adminTitleCls,
  adminToolbarBorder,
} from '../utils/adminPageStyles';

interface RoleManagementProps {
  theme: Theme;
}

const RoleManagement: React.FC<RoleManagementProps> = ({ theme }) => {
  const { t } = useModuleI18n('admin');
  const isDark = theme === 'dark';
  const [roles, setRoles] = useState<RoleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleGroup | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<{ name: string; menu_ids: string[]; site_capabilities: SiteCapabilities }>({
    name: '',
    menu_ids: [],
    site_capabilities: {
      allowed_site_kinds: ['template'],
      max_per_kind: { template: 1 },
      can_bind_custom_domain: false,
      can_assign_to_other_merchant: false,
    },
  });

  const loadRoles = async () => {
    try {
      setLoading(true);
      const list = await rolesAPI.listRoles();
      setRoles(list);
    } catch (error) {
      console.error('加载角色列表失败:', error);
      setMessage({ type: 'error', text: '加载角色列表失败' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: '请输入角色名称' });
      return;
    }
    try {
      await rolesAPI.createRole({
        name: formData.name.trim(),
        menu_ids: formData.menu_ids,
        site_capabilities: formData.site_capabilities,
      });
      setMessage({ type: 'success', text: '角色创建成功' });
      setFormData({
        name: '',
        menu_ids: [],
        site_capabilities: {
          allowed_site_kinds: ['template'],
          max_per_kind: { template: 1 },
          can_bind_custom_domain: false,
          can_assign_to_other_merchant: false,
        },
      });
      setIsCreating(false);
      loadRoles();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '创建失败' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUpdate = async () => {
    if (!editingRole) return;
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: '请输入角色名称' });
      return;
    }
    try {
      await rolesAPI.updateRole(editingRole.id, {
        name: formData.name.trim(),
        menu_ids: formData.menu_ids,
        site_capabilities: formData.site_capabilities,
      });
      setMessage({ type: 'success', text: '角色更新成功' });
      setEditingRole(null);
      setIsEditing(false);
      loadRoles();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '更新失败' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDelete = async (role: RoleGroup) => {
    if (role.is_system) {
      setMessage({ type: 'error', text: '系统内置角色不可删除' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (!window.confirm(`确定要删除角色「${getRoleDisplayName(role.name)}」吗？`)) return;
    try {
      await rolesAPI.deleteRole(role.id);
      setMessage({ type: 'success', text: '角色已删除' });
      loadRoles();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '删除失败' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const toggleMenu = (id: string) => {
    const next = formData.menu_ids.includes(id)
      ? formData.menu_ids.filter(m => m !== id)
      : [...formData.menu_ids, id];
    setFormData({ ...formData, menu_ids: next });
  };

  const sidebarItems = SIDEBAR_MENU_ITEMS.filter(item => !HIDDEN_FROM_SIDEBAR.includes(item.id));
  const permissionMenuEntries = getOrderedPermissionMenuEntries(
    new Set(sidebarItems.map(item => item.id))
  );

  const cardCls = adminCardCls(isDark);
  const toolbarBorder = adminToolbarBorder(isDark);
  const rowHoverCls = adminRowHoverCls(isDark);

  if (loading && roles.length === 0) {
    return (
      <div className={adminLoadingCls(isDark)}>
        <Loader2 className="w-6 h-6 animate-spin opacity-60" />
      </div>
    );
  }

  return (
    <div className={adminPageOuterCls(isDark)}>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className={ADMIN_PAGE_SHELL_CLS}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className={adminTitleCls(isDark)}>{t('pages.roleManagement.pageTitle')}</h1>
              <p className={adminSubtitleCls(isDark)}>{t('pages.roleManagement.subtitle')}</p>
            </div>
            <button
              onClick={() => {
                setIsCreating(!isCreating);
                setEditingRole(null);
                setIsEditing(false);
                setFormData({ name: '', menu_ids: [], site_capabilities: { allowed_site_kinds: ['template'], max_per_kind: { template: 1 }, can_bind_custom_domain: false, can_assign_to_other_merchant: false } });
              }}
              className="btn-geo-primary shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> 新建角色
            </button>
          </div>

        {message && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium ${
            message.type === 'success'
              ? (isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700')
              : (isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-700')
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {message.text}
          </div>
        )}

            {/* 新建/编辑表单 */}
            {(isCreating || isEditing) && (
              <div className={cardCls}>
                <div className="p-6 pb-4">
                  <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isCreating ? '新建角色' : '编辑角色'}
                  </h3>
                  <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                      角色名称 *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      disabled={isEditing && editingRole != null && editingRole.is_system}
                      className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'} disabled:opacity-60`}
                      placeholder="如：运营、客户"
                    />
                    {isEditing && editingRole?.is_system && (
                      <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                        系统内置角色不可改名
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                      可访问菜单
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[min(24rem,50vh)] overflow-y-auto pr-1">
                      {permissionMenuEntries.map(({ id, label }) => (
                        <label
                          key={id}
                          className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer ${
                            isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.menu_ids.includes(id)}
                            onChange={() => toggleMenu(id)}
                            className="rounded mt-0.5 shrink-0"
                          />
                          <span className="text-sm min-w-0 break-words leading-snug">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                      建站权限
                    </label>
                    <div className={`rounded-xl border p-4 space-y-4 ${isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-slate-200 bg-slate-50'}`}>
                      <div>
                        <p className="text-xs font-medium mb-2 text-slate-500">可创建站点类型</p>
                        <div className="flex flex-wrap gap-3">
                          {(['template', 'custom'] as const).map((kind) => (
                            <label key={kind} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={(formData.site_capabilities.allowed_site_kinds || []).includes(kind)}
                                onChange={() => {
                                  const cur = formData.site_capabilities.allowed_site_kinds || [];
                                  const next = cur.includes(kind) ? cur.filter((k) => k !== kind) : [...cur, kind];
                                  setFormData({
                                    ...formData,
                                    site_capabilities: { ...formData.site_capabilities, allowed_site_kinds: next },
                                  });
                                }}
                              />
                              {kind === 'template' ? '模板站' : '自定义站'}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-500">模板站配额（空=不限）</label>
                          <input
                            type="number"
                            min={0}
                            className={`w-full mt-1 px-3 py-2 rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-600' : 'bg-white border-slate-200'}`}
                            value={formData.site_capabilities.max_per_kind?.template ?? ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                site_capabilities: {
                                  ...formData.site_capabilities,
                                  max_per_kind: {
                                    ...formData.site_capabilities.max_per_kind,
                                    template: e.target.value === '' ? null : Number(e.target.value),
                                  },
                                },
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">自定义站配额（空=不限）</label>
                          <input
                            type="number"
                            min={0}
                            className={`w-full mt-1 px-3 py-2 rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-600' : 'bg-white border-slate-200'}`}
                            value={formData.site_capabilities.max_per_kind?.custom ?? ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                site_capabilities: {
                                  ...formData.site_capabilities,
                                  max_per_kind: {
                                    ...formData.site_capabilities.max_per_kind,
                                    custom: e.target.value === '' ? null : Number(e.target.value),
                                  },
                                },
                              })
                            }
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!formData.site_capabilities.can_bind_custom_domain}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              site_capabilities: { ...formData.site_capabilities, can_bind_custom_domain: e.target.checked },
                            })
                          }
                        />
                        允许绑定自定义域名
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!formData.site_capabilities.can_assign_to_other_merchant}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              site_capabilities: { ...formData.site_capabilities, can_assign_to_other_merchant: e.target.checked },
                            })
                          }
                        />
                        允许指定其他商户（admin 场景）
                      </label>
                    </div>
                  </div>
                  </div>
                </div>
                <div
                  className={`flex flex-row flex-wrap items-center justify-end gap-3 px-6 py-4 border-t shrink-0 sticky bottom-0 z-10 ${
                    isDark ? 'bg-zinc-900 border-zinc-700/80' : 'bg-white border-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={isCreating ? handleCreate : handleUpdate}
                    className="btn-geo-primary inline-flex shrink-0 items-center justify-center min-h-[44px] px-8 py-2.5 text-sm font-semibold"
                  >
                    {isCreating ? '确认创建' : '保存'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(false);
                      setEditingRole(null);
                    }}
                    className="btn-geo-secondary inline-flex shrink-0 items-center justify-center min-h-[44px] px-8 py-2.5 text-sm font-semibold"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            {/* 角色列表 */}
            <div className={cardCls}>
              <div className={`px-5 py-4 border-b ${toolbarBorder}`}>
                <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                  角色列表 ({roles.length})
                </h3>
              </div>
              <div className="p-5">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin opacity-60" />
                </div>
              ) : (
              <div className="space-y-3">
                {roles.map(role => (
                  <div
                    key={role.id}
                    className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${rowHoverCls} ${
                      isDark ? 'border-zinc-700/80' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-700' : 'bg-slate-200'}`}>
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {getRoleDisplayName(role.name)}
                          {role.is_system && (
                            <span className={`ml-2 text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>(系统)</span>
                          )}
                          {!role.is_system && role.name !== getRoleDisplayName(role.name) && (
                            <span className={`ml-2 text-xs font-normal ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                              ({role.name})
                            </span>
                          )}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                          可访问 {Array.isArray(role.menu_ids) ? role.menu_ids.length : 0} 个菜单
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingRole(role);
                          setIsEditing(true);
                          setIsCreating(false);
                          setFormData({
                            name: role.name,
                            menu_ids: role.menu_ids || [],
                            site_capabilities: {
                              allowed_site_kinds: role.site_capabilities?.allowed_site_kinds ?? [],
                              max_per_kind: role.site_capabilities?.max_per_kind ?? {},
                              can_bind_custom_domain: !!role.site_capabilities?.can_bind_custom_domain,
                              can_assign_to_other_merchant: !!role.site_capabilities?.can_assign_to_other_merchant,
                            },
                          });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                          isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        <Pencil className="w-3.5 h-3.5" /> 编辑
                      </button>
                      {!role.is_system && (
                        <button
                          onClick={() => handleDelete(role)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                            isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-50 text-red-600 hover:bg-red-100'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> 删除
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              )}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;
