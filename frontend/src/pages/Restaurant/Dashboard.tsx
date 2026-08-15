import React, { useEffect, useState } from 'react';
import { restaurantDashboardService, type DashboardResponse } from '../../features/restaurant/services/restaurantDashboardService';
import Button from '../../components/Button';
import { DashboardTools } from '../../features/restaurant/components/DashboardTools';
import type { Restaurant } from '../../types';


interface DashboardProps {
  onNavigateBilling?: () => void;
}

const STORE_STATUS = {
  OPEN: { label: 'STORE OPEN', background: '#ECFDF5', color: '#047857', border: '#A7F3D0', dot: '#10B981' },
  CLOSED: { label: 'STORE CLOSED', background: '#FEF2F2', color: '#B91C1C', border: '#FECACA', dot: '#EF4444' },
  BUSY: { label: 'STORE BUSY', background: '#FFF7ED', color: '#C2410C', border: '#FED7AA', dot: '#F97316' },
  TEMPORARILY_UNAVAILABLE: { label: 'TEMPORARILY UNAVAILABLE', background: '#F8FAFC', color: '#475569', border: '#CBD5E1', dot: '#64748B' },
} as const;

export const RestaurantDashboard: React.FC<DashboardProps> = ({ onNavigateBilling }) => {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const res = await restaurantDashboardService.getDashboardData();
      if (res.success) {
        setData(res);
      } else {
        setError(res.message || 'Failed to load restaurant dashboard data.');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to dashboard server.');
    } finally {
      setLoading(false);
    }
  };

  const applyRestaurantUpdate = (restaurant: Restaurant) => {
    setData((current) => current ? { ...current, restaurant } : current);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1E293B' }}>Loading Restaurant Dashboard...</h3>
        <p style={{ fontSize: '14px', color: '#64748B' }}>Fetching your store and subscription details</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '24px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '16px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#991B1B', marginBottom: '8px' }}>Dashboard Unavailable</h3>
        <p style={{ fontSize: '14px', color: '#7F1D1D', marginBottom: '16px' }}>{error || 'No restaurant data found.'}</p>
        <Button onClick={() => void fetchDashboard()} variant="secondary">Try Again</Button>
      </div>
    );
  }

  const { restaurant, subscription, plan, trialDaysRemaining, menuItems } = data;
  const storeStatus = STORE_STATUS[restaurant.operationalStatus] || STORE_STATUS.CLOSED;

  const isTrial = subscription?.status === 'trial';
  const isActive = subscription?.status === 'active';
  const isPastDue = subscription?.status === 'past_due';
  const isFree = subscription?.status === 'free' || !subscription;

  return (
    <div style={{ maxWidth: '1100px', margin: '32px auto', padding: '0 24px', fontFamily: 'var(--font-sans)' }}>
      {/* ─── Top Header: Restaurant Profile & Status ─────────────────────────── */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '28px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {restaurant.logoUrl ? (
            <img
              src={restaurant.logoUrl}
              alt={restaurant.name}
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '20px',
                objectFit: 'cover',
                border: '2px solid #E2E8F0',
              }}
            />
          ) : (
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '20px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                fontWeight: 800,
              }}
            >
              {restaurant.name?.charAt(0) || 'R'}
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {restaurant.name}
              </h2>
              {restaurant.franchiseName && (
                <span
                  style={{
                    fontSize: '12px',
                    padding: '3px 10px',
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    borderRadius: '9999px',
                    fontWeight: 600,
                  }}
                >
                  {restaurant.franchiseName}
                </span>
              )}
            </div>

            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 6px 0' }}>
              {restaurant.formattedAddress || restaurant.address || 'Address registered'}
            </p>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {Array.isArray(restaurant.cuisine) ? (
                restaurant.cuisine.map((c: string) => (
                  <span
                    key={c}
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      backgroundColor: '#FEF3C7',
                      color: '#92400E',
                      borderRadius: '6px',
                      fontWeight: 600,
                    }}
                  >
                    {c}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '12px', color: '#64748B' }}>{restaurant.cuisine}</span>
              )}
            </div>
          </div>
        </div>

        {/* Operational Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '9999px',
              backgroundColor: storeStatus.background,
              color: storeStatus.color,
              fontWeight: 700,
              fontSize: '13px',
              border: `1px solid ${storeStatus.border}`,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: storeStatus.dot,
              }}
            />
            {storeStatus.label}
          </div>
        </div>
      </div>

      {/* ─── Subscription & Plan Status Banner ───────────────────────────────── */}
      <div
        style={{
          borderRadius: '20px',
          padding: '24px 28px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          backgroundColor: isTrial
            ? '#FFFBEB'
            : isActive
            ? '#ECFDF5'
            : isPastDue
            ? '#FEF2F2'
            : '#F8FAFC',
          border: isTrial
            ? '1.5px solid #FCD34D'
            : isActive
            ? '1.5px solid #6EE7B7'
            : isPastDue
            ? '1.5px solid #F87171'
            : '1.5px solid #E2E8F0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: isTrial ? '#92400E' : isActive ? '#065F46' : isPastDue ? '#991B1B' : '#1E293B',
                }}
              >
                {plan?.displayName || 'Free'} Plan ({subscription?.status?.toUpperCase() || 'ACTIVE'})
              </span>
              {isTrial && trialDaysRemaining !== null && (
                <span
                  style={{
                    fontSize: '12px',
                    padding: '2px 10px',
                    backgroundColor: '#F59E0B',
                    color: '#FFFFFF',
                    borderRadius: '9999px',
                    fontWeight: 700,
                  }}
                >
                  {trialDaysRemaining} days remaining
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: '13px',
                color: isTrial ? '#B45309' : isActive ? '#047857' : isPastDue ? '#B91C1C' : '#64748B',
                margin: 0,
              }}
            >
              {isTrial
                ? `You have ${plan?.displayName || 'Growth'} plan access during your trial.`
                : isActive
                ? `Recurring subscription is active (₹${(plan?.price || 0) / 100}/month).`
                : isPastDue
                ? 'Payment failed. Please update your payment method to maintain full access.'
                : 'You are on the Free tier. Upgrade to unlock staff management and unlimited menu items.'}
            </p>
          </div>
        </div>

        <button
          onClick={onNavigateBilling}
          style={{
            padding: '10px 22px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '13px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          {isTrial || isFree ? 'Upgrade Plan' : 'Manage Billing'}
        </button>
      </div>

      {/* ─── Entitlements & Limits Grid ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {/* Menu Items Card */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '18px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Menu Items</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
            {menuItems?.length || 0}
            <span style={{ fontSize: '14px', color: '#94A3B8', fontWeight: 500 }}>
              {' '}/ {plan?.limits?.menuItems === -1 ? '∞ Unlimited' : `${plan?.limits?.menuItems || 20} max`}
            </span>
          </div>
          <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>
            {plan?.limits?.menuItems === -1 ? 'Unlimited items enabled' : 'Standard menu allowance'}
          </span>
        </div>

        {/* Staff Accounts Card */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '18px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Staff Accounts</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
            0
            <span style={{ fontSize: '14px', color: '#94A3B8', fontWeight: 500 }}>
              {' '}/ {plan?.limits?.staffAccounts === -1 ? '∞ Unlimited' : `${plan?.limits?.staffAccounts || 0} allowed`}
            </span>
          </div>
          <span style={{ fontSize: '12px', color: plan?.limits?.staffAccounts ? '#10B981' : '#64748B', fontWeight: 600 }}>
            {plan?.limits?.staffAccounts === -1 ? 'Unlimited staff accounts' : plan?.limits?.staffAccounts ? `${plan.limits.staffAccounts} Manager/Kitchen accounts` : 'Upgrade to Growth for staff accounts'}
          </span>
        </div>

        {/* Analytics Card */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '18px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Analytics & Reports</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: plan?.limits?.analyticsAccess ? '#059669' : '#94A3B8', marginBottom: '4px' }}>
            {plan?.limits?.analyticsAccess ? 'Active' : 'Locked'}
          </div>
          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
            {plan?.limits?.analyticsAccess ? 'Real-time sales & order analytics' : 'Available on a paid plan'}
          </span>
        </div>
      </div>

      {/* ─── Seeded Menu Items List ─────────────────────────────────────────── */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '28px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
              Live Menu Catalog ({menuItems?.length || 0})
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
              Imported from your onboarding application and ready for customer orders.
            </p>
          </div>
        </div>

        {menuItems && menuItems.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
            {menuItems.map((item) => (
              <div
                key={item._id}
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1px solid #F1F5F9',
                  backgroundColor: '#F8FAFC',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>{item.title}</span>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '3px 7px',
                        border: `1px solid ${item.type === 'veg' ? '#16A34A' : '#DC2626'}`,
                        color: item.type === 'veg' ? '#15803D' : '#B91C1C',
                        borderRadius: '4px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.type === 'veg' ? 'Veg' : 'Non-veg'}
                    </span>
                  </div>
                  {item.description && (
                    <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                      {item.description}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>₹{item.price}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      backgroundColor: item.isAvailable !== false ? '#ECFDF5' : '#FEE2E2',
                      color: item.isAvailable !== false ? '#065F46' : '#991B1B',
                      borderRadius: '6px',
                      fontWeight: 700,
                    }}
                  >
                    {item.isAvailable !== false ? 'IN STOCK' : 'OUT OF STOCK'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
            <p>No menu items found. Add items to start receiving orders!</p>
          </div>
        )}
      </div>
      <DashboardTools data={data} onRefresh={() => fetchDashboard(true)} onRestaurantUpdated={applyRestaurantUpdate} />
    </div>
  );
};

export default RestaurantDashboard;
