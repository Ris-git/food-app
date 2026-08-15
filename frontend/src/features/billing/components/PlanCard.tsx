import React from 'react';
import type { Plan } from '../../../types';

type PlanCardProps = {
  plan: Plan;
  isCurrent: boolean;
  isTrialEntitlement: boolean;
  isLoading: boolean;
  onSelect: (plan: Plan) => void;
};

const LIMIT_LABELS: Record<string, string> = {
  staffAccounts: 'Staff accounts',
  menuItems: 'Menu items',
  analyticsAccess: 'Analytics and reports',
};

const formatLimitName = (key: string) =>
  LIMIT_LABELS[key] || key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase());

const formatLimitValue = (value: number | boolean) => {
  if (value === -1) return 'Unlimited';
  if (typeof value === 'boolean') return value ? 'Included' : 'Not included';
  return String(value);
};

const formatPrice = (plan: Plan) => {
  if (plan.price === 0) return 'Free';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: plan.currency,
    maximumFractionDigits: 0,
  }).format(plan.price / 100);
};

export const PlanCard: React.FC<PlanCardProps> = ({ plan, isCurrent, isTrialEntitlement, isLoading, onSelect }) => {
  const canCheckout = !isCurrent && plan.price > 0 && plan.billingInterval !== 'none';
  return (
    <article
      style={{
        backgroundColor: '#FFFFFF',
        border: isCurrent ? '2px solid #10B981' : '1px solid #CBD5E1',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '320px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#0F172A', fontSize: '20px', fontWeight: 750 }}>
          {plan.displayName}
        </h3>
        {isCurrent && (
          <span style={{ color: '#047857', backgroundColor: '#ECFDF5', padding: '4px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
            Current plan
          </span>
        )}
      </div>

      <div style={{ margin: '22px 0 4px', color: '#0F172A', fontSize: '30px', fontWeight: 800 }}>
        {formatPrice(plan)}
      </div>
      <div style={{ color: '#64748B', fontSize: '13px', minHeight: '20px' }}>
        {plan.billingInterval === 'none' ? 'No recurring charge' : `Billed ${plan.billingInterval}`}
      </div>

      <div style={{ borderTop: '1px solid #E2E8F0', margin: '20px 0 16px' }} />

      <dl style={{ margin: 0, display: 'grid', gap: '12px', flex: 1 }}>
        {Object.entries(plan.limits).map(([key, value]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '13px' }}>
            <dt style={{ color: '#64748B' }}>{formatLimitName(key)}</dt>
            <dd style={{ margin: 0, color: '#1E293B', fontWeight: 650, textAlign: 'right' }}>
              {formatLimitValue(value)}
            </dd>
          </div>
        ))}
      </dl>

      <button
        type="button"
        disabled={!canCheckout || isLoading}
        onClick={() => onSelect(plan)}
        style={{
          width: '100%',
          marginTop: '24px',
          padding: '11px 16px',
          borderRadius: '10px',
          border: '1px solid #CBD5E1',
          backgroundColor: canCheckout ? '#0F172A' : '#F1F5F9',
          color: canCheckout ? '#FFFFFF' : '#64748B',
          fontSize: '13px',
          fontWeight: 700,
          cursor: canCheckout && !isLoading ? 'pointer' : 'not-allowed',
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isCurrent
          ? 'Current plan'
          : plan.price === 0
            ? 'Included automatically'
            : isLoading
              ? 'Opening checkout...'
              : isTrialEntitlement
                ? `Subscribe to ${plan.displayName}`
                : `Choose ${plan.displayName}`}
      </button>
    </article>
  );
};

export default PlanCard;
