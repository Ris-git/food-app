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

export type CheckoutResponse = {
  success: boolean;
  message?: string;
  checkout: {
    keyId: string;
    subscriptionId: string;
    businessName: string;
    plan: Pick<Plan, '_id' | 'name' | 'displayName' | 'price' | 'currency' | 'billingInterval'> & { id?: string };
    prefill: {
      name: string;
      email: string;
      contact: string;
    };
  };
};

export type VerifyCheckoutResponse = {
  success: boolean;
  message: string;
  activationExpectedAt: string | null;
};

export type CheckoutVerification = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
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

  async createCheckout(planId: string): Promise<CheckoutResponse> {
    return (await apiRequest<CheckoutResponse>('/billing/subscription', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    })) as unknown as CheckoutResponse;
  },

  async verifyCheckout(result: CheckoutVerification): Promise<VerifyCheckoutResponse> {
    return (await apiRequest<VerifyCheckoutResponse>('/billing/subscription/verify', {
      method: 'POST',
      body: JSON.stringify(result),
    })) as unknown as VerifyCheckoutResponse;
  },
};
