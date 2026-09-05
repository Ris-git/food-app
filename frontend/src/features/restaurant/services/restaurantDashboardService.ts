import { apiRequest } from '../../../services/api';
import type { Restaurant, Subscription, Plan, OperatingHours } from '../../../types';

export type MenuItemInput = {
  title: string;
  type: 'veg' | 'non-veg' | 'beverage' | 'dessert' | 'other';
  price: number;
  description?: string;
  isAvailable?: boolean;
};

export type Analytics = {
  orderCount: number;
  deliveredOrders: number;
  cancelledOrders: number;
  grossOrderValue: number;
  revenue: number;
  collectedRevenue: number;
  refundedAmount: number;
  averageOrderValue: number;
  cancellationRate: number;
  dailyOrders: Array<{ date: string; orders: number; revenue: number }>;
  popularItems: Array<{ menuItemId: string; title: string; quantity: number; revenue: number }>;
  from: string;
  to: string;
};

type SettingsResponse = { success: boolean; message: string; restaurant: Restaurant };

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
    type: 'veg' | 'non-veg' | 'beverage' | 'dessert' | 'other';
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
  async addMenuItem(restaurantId: string, item: MenuItemInput) {
    return apiRequest('/menu', { method: 'POST', body: JSON.stringify({ ...item, restaurantId }) });
  },
  async updateMenuItem(id: string, item: Partial<MenuItemInput>) {
    return apiRequest(`/menu/${id}`, { method: 'PUT', body: JSON.stringify(item) });
  },
  async deleteMenuItem(id: string) {
    return apiRequest(`/menu/${id}`, { method: 'DELETE' });
  },
  async importMenuItems(items: MenuItemInput[]) {
    return apiRequest('/menu/import', { method: 'POST', body: JSON.stringify({ items }) });
  },
  async getAnalytics(from: string, to: string): Promise<{ success: boolean; analytics: Analytics }> {
    return (await apiRequest(`/restaurant/my-analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { method: 'GET' })) as unknown as { success: boolean; analytics: Analytics };
  },
  async updateSettings(settings: {
    name: string;
    phone: string;
    address: string;
    formattedAddress: string;
    cuisine: string[];
    operationalStatus: Restaurant['operationalStatus'];
    operatingHours: OperatingHours;
  }): Promise<SettingsResponse> {
    return (await apiRequest<SettingsResponse>('/restaurant/my-settings', { method: 'PATCH', body: JSON.stringify(settings) })) as unknown as SettingsResponse;
  },
};
