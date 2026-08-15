import React, { useEffect, useState } from 'react';
import Button from '../../components/Button';
import PlanCard from '../../features/billing/components/PlanCard';
import {
  billingService,
  type CurrentSubscriptionResponse,
} from '../../features/billing/services/billingService';
import type { Plan } from '../../types';

type RazorpayResult = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (result: RazorpayResult) => void;
  modal: { ondismiss: () => void };
};

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open: () => void };
  }
}

const loadRazorpayCheckout = () => {
  if (window.Razorpay) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-foody-razorpay]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Unable to load Razorpay Checkout.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.foodyRazorpay = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Razorpay Checkout.'));
    document.body.appendChild(script);
  });
};

type BillingProps = {
  onBackToDashboard: () => void;
};

const formatDate = (value: string | null) => {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
};

const formatStatus = (status: string) =>
  status.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase());

export const Billing: React.FC<BillingProps> = ({ onBackToDashboard }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [current, setCurrent] = useState<CurrentSubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);

  const loadBilling = async () => {
    try {
      setLoading(true);
      setError(null);
      const [plansResponse, subscriptionResponse] = await Promise.all([
        billingService.getPlans(),
        billingService.getCurrentSubscription(),
      ]);
      setPlans(plansResponse.plans);
      setCurrent(subscriptionResponse);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load billing information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      billingService.getPlans(),
      billingService.getCurrentSubscription(),
    ])
      .then(([plansResponse, subscriptionResponse]) => {
        if (cancelled) return;
        setPlans(plansResponse.plans);
        setCurrent(subscriptionResponse);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unable to load billing information.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const startCheckout = async (selectedPlan: Plan) => {
    try {
      setCheckoutPlanId(selectedPlan._id);
      setCheckoutMessage(null);
      const response = await billingService.createCheckout(selectedPlan._id);
      await loadRazorpayCheckout();

      const checkout = new window.Razorpay({
        key: response.checkout.keyId,
        subscription_id: response.checkout.subscriptionId,
        name: response.checkout.businessName,
        description: `${response.checkout.plan.displayName} subscription`,
        prefill: response.checkout.prefill,
        theme: { color: '#059669' },
        handler: (result) => {
          void billingService.verifyCheckout(result)
            .then((verification) => {
              setCheckoutMessage(verification.message);
              return loadBilling();
            })
            .catch((err: unknown) => {
              setCheckoutMessage(err instanceof Error ? err.message : 'Unable to verify Checkout.');
            })
            .finally(() => setCheckoutPlanId(null));
        },
        modal: {
          ondismiss: () => setCheckoutPlanId(null),
        },
      });
      checkout.open();
    } catch (err: unknown) {
      setCheckoutMessage(err instanceof Error ? err.message : 'Unable to open checkout.');
      setCheckoutPlanId(null);
    }
  };

  if (loading) {
    return (
      <main style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 24px', color: '#0F172A' }}>
        <h2 style={{ fontSize: '22px' }}>Loading billing information...</h2>
      </main>
    );
  }

  if (error || !current) {
    return (
      <main style={{ maxWidth: '760px', margin: '40px auto', padding: '24px', backgroundColor: '#FFFFFF', border: '1px solid #FCA5A5', borderRadius: '16px' }}>
        <h2 style={{ marginTop: 0, color: '#991B1B' }}>Billing unavailable</h2>
        <p style={{ color: '#7F1D1D' }}>{error || 'No subscription was found for this restaurant.'}</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button onClick={loadBilling}>Try again</Button>
          <Button variant="secondary" onClick={onBackToDashboard}>Back to dashboard</Button>
        </div>
      </main>
    );
  }

  const { subscription, plan, trialDaysRemaining } = current;

  return (
    <main style={{ maxWidth: '1100px', margin: '32px auto 64px', padding: '0 24px', color: '#0F172A' }}>
      <button
        type="button"
        onClick={onBackToDashboard}
        style={{ background: 'none', border: 0, padding: 0, marginBottom: '20px', color: '#E2E8F0', cursor: 'pointer', fontSize: '14px', fontWeight: 650 }}
      >
        Back to dashboard
      </button>

      <section style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '18px', padding: '28px', marginBottom: '28px' }}>
        <p style={{ margin: '0 0 6px', color: '#64748B', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Current subscription
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '30px', color: '#0F172A' }}>{plan.displayName}</h1>
            <p style={{ margin: '8px 0 0', color: '#64748B', fontSize: '14px' }}>
              Status: <strong style={{ color: '#334155' }}>{formatStatus(subscription.status)}</strong>
            </p>
          </div>

          <dl style={{ margin: 0, display: 'grid', gap: '8px', minWidth: '220px', fontSize: '13px' }}>
            {subscription.status === 'trial' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px' }}>
                <dt style={{ color: '#64748B' }}>Trial remaining</dt>
                <dd style={{ margin: 0, fontWeight: 700 }}>{trialDaysRemaining ?? 0} days</dd>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px' }}>
              <dt style={{ color: '#64748B' }}>{subscription.status === 'trial' ? 'Trial ends' : 'Current period ends'}</dt>
              <dd style={{ margin: 0, fontWeight: 700 }}>
                {formatDate(subscription.status === 'trial' ? subscription.trialEndsAt : subscription.currentPeriodEnd)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '24px', color: '#FFFFFF' }}>Available plans</h2>
          <p style={{ margin: 0, color: '#D1FAE5', fontSize: '14px' }}>
            Choose a paid plan to authorize recurring billing. Your trial remains active until its scheduled end.
          </p>
        </div>

        {checkoutMessage && (
          <div style={{ marginBottom: '18px', padding: '13px 16px', borderRadius: '10px', backgroundColor: '#FFFFFF', color: '#334155', border: '1px solid #CBD5E1', fontSize: '13px' }}>
            {checkoutMessage}
          </div>
        )}

        {plans.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
            {plans.map((availablePlan) => (
              <PlanCard
                key={availablePlan._id}
                plan={availablePlan}
                isCurrent={availablePlan._id === plan._id && subscription.status !== 'trial'}
                isTrialEntitlement={availablePlan._id === plan._id && subscription.status === 'trial'}
                isLoading={checkoutPlanId === availablePlan._id}
                onSelect={startCheckout}
              />
            ))}
          </div>
        ) : (
          <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '14px', color: '#64748B' }}>
            No subscription plans are currently available.
          </div>
        )}
      </section>
    </main>
  );
};

export default Billing;
