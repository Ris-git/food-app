import { apiRequest } from '../../../services/api';

export type PublicRestaurant = {
  id: string;
  name: string;
  logoUrl: string;
  description: string;
  address: string;
  cuisines: string[];
  operationalStatus: 'OPEN' | 'CLOSED' | 'BUSY' | 'TEMPORARILY_UNAVAILABLE';
  rating: number | null;
  reviewCount: number;
};

export type PublicMenuItem = {
  _id: string;
  title: string;
  type: 'veg' | 'non-veg' | 'beverage' | 'dessert' | 'other';
  description?: string;
  price: number;
  isAvailable: boolean;
};

export const discoveryService = {
  async restaurants(filters: { location?: string; cuisine?: string; search?: string } = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    return apiRequest(`/public/restaurants${params.size ? `?${params}` : ''}`, { method: 'GET' }) as Promise<{ success: boolean; restaurants: PublicRestaurant[] }>;
  },
  restaurant: (id: string) => apiRequest(`/public/restaurants/${id}`, { method: 'GET' }) as Promise<{ success: boolean; restaurant: PublicRestaurant }>,
  menu: (id: string) => apiRequest(`/public/restaurants/${id}/menu`, { method: 'GET' }) as Promise<{ success: boolean; menuItems: PublicMenuItem[] }>,
  cuisines: () => apiRequest('/public/cuisines', { method: 'GET' }) as Promise<{ success: boolean; cuisines: string[] }>,
};
