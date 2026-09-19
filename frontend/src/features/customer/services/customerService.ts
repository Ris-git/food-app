import { apiRequest } from '../../../services/api';

export type DeliveryAddress = { _id?: string; type: 'Home' | 'Work' | 'Other'; addressLine: string; city: string };
export type CustomerOrderItem = {
  menuItem: string | { _id: string; title: string; type: string };
  quantity: number;
  priceAtPurchase: number;
};
export type CustomerOrder = {
  id: string;
  orderNumber: string;
  items: CustomerOrderItem[];
  subtotal: number;
  deliveryFee: number;
  taxes: number;
  totalPrice: number;
  paymentMethod: 'COD';
  status: 'Pending' | 'Preparing' | 'OutForDelivery' | 'Delivered' | 'Cancelled';
  deliveryAddress: string;
  deliveryAddressLabel: string;
  deliveryInstructions: string;
  restaurant: string | { _id: string; name: string; logoUrl?: string; address?: string };
  createdAt: string;
  updatedAt: string;
};

export const customerService = {
  addresses: () => apiRequest('/customer/addresses', { method: 'GET' }) as Promise<{ success: boolean; addresses: DeliveryAddress[] }>,
  saveAddresses: (addresses: DeliveryAddress[]) => apiRequest('/customer/addresses', { method: 'PUT', body: JSON.stringify({ addresses }) }) as Promise<{ success: boolean; addresses: DeliveryAddress[] }>,
  placeOrder: (payload: { restaurantId: string; items: { menuItemId: string; quantity: number }[]; deliveryAddress: DeliveryAddress; deliveryInstructions: string; clientRequestId: string }) => apiRequest('/customer/orders', { method: 'POST', body: JSON.stringify(payload) }) as Promise<{ success: boolean; order: CustomerOrder }>,
  orders: () => apiRequest('/customer/orders', { method: 'GET' }) as Promise<{ success: boolean; orders: CustomerOrder[] }>,
  order: (id: string) => apiRequest(`/customer/orders/${id}`, { method: 'GET' }) as Promise<{ success: boolean; order: CustomerOrder }>,
  cancelOrder: (id: string) => apiRequest(`/customer/orders/${id}/cancel`, { method: 'PATCH' }) as Promise<{ success: boolean; order: CustomerOrder }>,
};
