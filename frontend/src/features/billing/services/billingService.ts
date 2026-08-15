import { apiRequest } from '../../../services/api';
import type { Plan, Subscription } from '../../../types';

export type PlansResponse = {
  success: boolean;
  message?: string;
  plans: Plan[];
};

export type CurrentSubscriptionResponse = {
  success: boolean;
  message?: string;
  subscription: Subscription;
  plan: Plan;
  trialDaysRemaining: number | null;
};

export const billingService = {
  async getPlans(): Promise<PlansResponse> {
    return (await apiRequest<PlansResponse>('/billing/plans', {
      method: 'GET',
    })) as unknown as PlansResponse;
  },

  async getCurrentSubscription(): Promise<CurrentSubscriptionResponse> {
    return (await apiRequest<CurrentSubscriptionResponse>('/billing/my-subscription', {
      method: 'GET',
    })) as unknown as CurrentSubscriptionResponse;
  },
};
