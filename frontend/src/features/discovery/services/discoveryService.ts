import { apiRequest } from '../../../services/api';

export type PublicRestaurant = {
  id: string;
  name: string;
  logoUrl: string;
  description: string;
  address: string;
  cuisines: string[];
  operationalStatus: 'OPEN' | 'CLOSED' | 'BUSY' | 'TEMPORARILY_UNAVAILABLE';
  isOpenNow: boolean;
  rating: number | null;
  reviewCount: number;
  distanceKm: number | null;
  estimatedDeliveryMinutes: number;
  priceLevel: number | null;
  priceRange: string | null;
  menuTypes: string[];
  operatingHours: Record<string, { isOpen: boolean; openTime: string; closeTime: string }>;
  location: { type: 'Point'; coordinates: [number, number] };
};

export type PublicMenuItem = {
  _id: string;
  title: string;
  type: 'veg' | 'non-veg' | 'beverage' | 'dessert' | 'other';
  description?: string;
  price: number;
  isAvailable: boolean;
};

export type DiscoveryCategory = {
  slug: string;
  name: string;
};

export const discoveryService = {
  async restaurants(filters: { location?: string; cuisine?: string; category?: string; search?: string; dietary?: string; minimumRating?: number; priceLevel?: number; openNow?: boolean; sort?: string; latitude?: number; longitude?: number; radiusKm?: number } = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== false) params.set(key, String(value));
    });
    return apiRequest(`/public/restaurants${params.size ? `?${params}` : ''}`, { method: 'GET' }) as Promise<{ success: boolean; restaurants: PublicRestaurant[] }>;
  },
  restaurant: (id: string, coordinates?: { latitude: number; longitude: number } | null) => {
    const params = new URLSearchParams();
    if (coordinates) {
      params.set('latitude', String(coordinates.latitude));
      params.set('longitude', String(coordinates.longitude));
    }
    return apiRequest(`/public/restaurants/${id}${params.size ? `?${params}` : ''}`, { method: 'GET' }) as Promise<{ success: boolean; restaurant: PublicRestaurant }>;
  },
  menu: (id: string) => apiRequest(`/public/restaurants/${id}/menu`, { method: 'GET' }) as Promise<{ success: boolean; menuItems: PublicMenuItem[] }>,
  cuisines: () => apiRequest('/public/cuisines', { method: 'GET' }) as Promise<{ success: boolean; cuisines: string[] }>,
  categories: () => apiRequest('/public/categories', { method: 'GET' }) as Promise<{ success: boolean; categories: DiscoveryCategory[] }>,
};
