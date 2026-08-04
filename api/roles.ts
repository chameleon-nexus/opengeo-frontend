/**
 * 角色管理 API
 */

import apiClient from './client';
import { RoleGroup, SiteCapabilities } from '../types';

export interface RoleGroupCreate {
  name: string;
  menu_ids: string[];
  site_capabilities?: SiteCapabilities;
}

export interface RoleGroupUpdate {
  name?: string;
  menu_ids?: string[];
  site_capabilities?: SiteCapabilities;
}

export const rolesAPI = {
  listRoles: async (): Promise<RoleGroup[]> => {
    return apiClient.get<RoleGroup[]>('/api/roles');
  },

  createRole: async (data: RoleGroupCreate): Promise<RoleGroup> => {
    return apiClient.post<RoleGroup>('/api/roles', data);
  },

  updateRole: async (id: number, data: RoleGroupUpdate): Promise<RoleGroup> => {
    return apiClient.put<RoleGroup>(`/api/roles/${id}`, data);
  },

  deleteRole: async (id: number): Promise<void> => {
    return apiClient.delete(`/api/roles/${id}`);
  },
};
