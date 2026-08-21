import React from 'react';
import type { Plan, PlanLimits } from '../../../types';

type Props = { plans: Plan[] };
type LimitKey = keyof PlanLimits;

const ROWS: Array<{ label: string; key: LimitKey; format?: (value: number | boolean) => string }> = [
  { label: 'Menu items', key: 'menuItems' },
  { label: 'Staff accounts', key: 'staffAccounts' },
  { label: 'Basic analytics', key: 'analyticsAccess' },
  { label: 'Advanced analytics/export', key: 'advancedAnalyticsAccess' },
  { label: 'CSV/XLSX menu import', key: 'menuImportAccess' },
  { label: 'Order history', key: 'orderHistoryDays', format: (value) => value === -1 ? 'Unlimited' : `${value} days` },
  { label: 'Restaurant locations', key: 'restaurantLocations' },
  { label: 'Promotional offers', key: 'promotionalOffers', format: (value) => value === -1 ? 'Unlimited' : value === 0 ? 'No' : `${value} active` },
  { label: 'Priority support', key: 'prioritySupport' },
  { label: 'Custom reports', key: 'customReports' },
];

const formatValue = (value: number | boolean, format?: (value: number | boolean) => string) => {
  if (format) return format(value);
  if (value === -1) return 'Unlimited';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

export const PlanComparison: React.FC<Props> = ({ plans }) => (
  <section style={{ marginTop: '32px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '18px', overflow: 'hidden', color: '#0F172A' }}>
    <div style={{ padding: '24px 24px 8px' }}>
      <h2 style={{ margin: 0, fontSize: '22px' }}>Compare plans</h2>
      <p style={{ margin: '6px 0 12px', color: '#64748B', fontSize: '13px' }}>Choose the access level that fits your restaurant.</p>
    </div>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: '#F8FAFC' }}>
            <th style={headerStyle}>Feature</th>
            {plans.map((plan) => <th key={plan._id} style={headerStyle}>{plan.displayName}</th>)}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={String(row.key)}>
              <td style={{ ...cellStyle, fontWeight: 650 }}>{row.label}</td>
              {plans.map((plan) => {
                const value = plan.limits[row.key];
                return <td key={plan._id} style={cellStyle}>{formatValue(value, row.format)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

const headerStyle: React.CSSProperties = { padding: '16px 22px', borderBottom: '1px solid #E2E8F0', color: '#334155', fontSize: '14px' };
const cellStyle: React.CSSProperties = { padding: '15px 22px', borderBottom: '1px solid #F1F5F9', color: '#475569', fontSize: '14px' };

export default PlanComparison;
