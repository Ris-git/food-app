export type Role = 'customer' | 'admin' | 'superAdmin' | 'restaurant' | 'driver';

export type ApplicationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export type User = {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  role: Role;
  emailVerified?: boolean;
};

export type RestaurantApplication = {
  id: string;
  userId: string;
  restaurantName: string;
  description: string;
  address: string;
  phone: string;
  cuisine: string;
  status: ApplicationStatus;
  adminRemarks?: string;
  createdAt: string;
  updatedAt: string;
};
