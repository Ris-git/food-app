import { apiRequest } from '../../../services/api';
import type { Restaurant, Subscription, Plan } from '../../../types';

export interface DashboardResponse {
  success: boolean;
  message?: string;
  restaurant: Restaurant;
  subscription: Subscription;
  plan: Plan;
  trialDaysRemaining: number | null;
  menuItems: Array<{
    _id: string;
    title: string;
    type: 'veg' | 'non-veg';
    price: number;
    description?: string;
    isAvailable?: boolean;
  }>;
}

export const restaurantDashboardService = {
  async getDashboardData(): Promise<DashboardResponse> {
    return (await apiRequest<DashboardResponse>('/restaurant/my-dashboard', {
      method: 'GET',
    })) as unknown as DashboardResponse;
  },
};
