import { apiRequest } from '../../../services/api';
import type { RestaurantApplication } from '../../../types';

export type PartnerApplicationData = {
  restaurantName: string;
  description?: string;
  address: string;
  phone: string;
  cuisine: string;
};

export interface PartnerApplicationResponse {
  success: boolean;
  hasApplication?: boolean;
  message?: string;
  application?: RestaurantApplication | null;
}

export const partnerService = {
  async applyForPartner(data: PartnerApplicationData): Promise<PartnerApplicationResponse> {
    return await apiRequest<PartnerApplicationResponse>('/partner/apply', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getPartnerApplication(): Promise<PartnerApplicationResponse> {
    return await apiRequest<PartnerApplicationResponse>('/partner/application', {
      method: 'GET',
    });
  },
};
