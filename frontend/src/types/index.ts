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

// GeoJSON Location Point [Longitude, Latitude]
export type LocationPoint = {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
};

export type DaySchedule = {
  isOpen: boolean;
  openTime: string;  // e.g. "09:00"
  closeTime: string; // e.g. "22:00"
};

export type OperatingHours = {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
};

export type MealSlot = {
  active: boolean;
  start: string; // e.g. "08:00"
  end: string;   // e.g. "11:00"
};

export type MealSlots = {
  breakfast: MealSlot;
  lunch: MealSlot;
  dinner: MealSlot;
};

export type StagedMenuItem = {
  category: string;
  name: string;
  description?: string;
  price: number;
  isVeg: boolean;
};

export type RestaurantApplication = {
  id: string;
  userId: string;
  restaurantName: string;
  franchiseName?: string;
  logoUrl?: string;
  description?: string;
  address: string;
  formattedAddress?: string;
  location?: LocationPoint;
  phone: string;
  cuisine: string;
  operatingHours?: OperatingHours;
  mealSlots?: MealSlots;
  stagedMenuItems?: StagedMenuItem[];
  status: ApplicationStatus;
  adminRemarks?: string;
  createdAt: string;
  updatedAt: string;
};

export type Restaurant = {
  id: string;
  _id?: string;
  userId: string;
  name: string;
  franchiseName?: string;
  logoUrl?: string;
  phone: string;
  cuisine: string[];
  address?: string;
  formattedAddress: string;
  location: LocationPoint;
  operatingHours?: OperatingHours;
  mealSlots?: MealSlots;
  operationalStatus: 'OPEN' | 'CLOSED' | 'BUSY';
  createdAt?: string;
  updatedAt?: string;
};

// ─── Billing & Subscription Types ─────────────────────────────────────────────

export type PlanLimits = {
  staffAccounts: number;  // -1 = unlimited
  menuItems: number;      // -1 = unlimited
  analyticsAccess: boolean;
  [key: string]: number | boolean;
};

export type Plan = {
  _id: string;
  name: string;
  displayName: string;
  price: number;          // in paise (divide by 100 for rupees display)
  currency: string;
  billingInterval: 'monthly' | 'yearly' | 'none';
  trialDays: number;
  isActive: boolean;
  isDefaultTrialPlan: boolean;
  isDefaultFreePlan: boolean;
  limits: PlanLimits;
};

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'free';

export type Subscription = {
  _id: string;
  restaurant: string;
  plan: Plan;             // populated from DB
  status: SubscriptionStatus;
  provider: 'razorpay' | 'none';
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RestaurantDashboardData = {
  restaurant: Restaurant;
  subscription: Subscription;
  plan: Plan;
  trialDaysRemaining: number | null;
};
