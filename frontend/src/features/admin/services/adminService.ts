import { apiRequest } from '../../../services/api';
import type { RestaurantApplication } from '../../../types';

export interface AdminApplicationsResponse {
  success: boolean;
  count?: number;
  message?: string;
  applications?: RestaurantApplication[];
  application?: RestaurantApplication;
}

export const adminService = {
  async getApplications(): Promise<AdminApplicationsResponse> {
    return await apiRequest<AdminApplicationsResponse>('/admin/applications', {
      method: 'GET',
    });
  },

  async approveApplication(id: string, adminRemarks?: string): Promise<AdminApplicationsResponse> {
    return await apiRequest<AdminApplicationsResponse>(`/admin/applications/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ adminRemarks }),
    });
  },

  async rejectApplication(id: string, adminRemarks: string): Promise<AdminApplicationsResponse> {
    return await apiRequest<AdminApplicationsResponse>(`/admin/applications/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ adminRemarks }),
    });
  },
};
