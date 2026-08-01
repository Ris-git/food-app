import React from 'react';
import type { RestaurantApplication } from '../../types';
import Badge from '../../components/Badge';
import Button from '../../components/Button';

interface StatusProps {
  application: RestaurantApplication;
  onEditResubmit?: () => void;
}

export const Status: React.FC<StatusProps> = ({ application, onEditResubmit }) => {
  return (
    <div
      style={{
        maxWidth: '520px',
        margin: '50px auto',
        padding: '32px',
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        color: '#0F172A',
        boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px' }}>Partner Application Status</h2>
        <Badge status={application.status as any} />
      </div>

      <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
        <p style={{ margin: '4px 0', fontSize: '15px' }}>
          <strong>Restaurant Name:</strong> {application.restaurantName}
        </p>
        <p style={{ margin: '4px 0', fontSize: '15px' }}>
          <strong>Cuisine:</strong> {application.cuisine}
        </p>
        <p style={{ margin: '4px 0', fontSize: '15px' }}>
          <strong>Contact Phone:</strong> {application.phone}
        </p>
        <p style={{ margin: '4px 0', fontSize: '15px' }}>
          <strong>Address:</strong> {application.address}
        </p>
        <p style={{ margin: '4px 0', fontSize: '13px', color: '#64748B' }}>
          Submitted on: {new Date(application.createdAt).toLocaleDateString()}
        </p>
      </div>

      {application.status === 'pending' && (
        <div style={{ padding: '14px', backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: '12px', fontSize: '14px' }}>
          ⏳ Your application is currently under review by the Foody Admin team. You will be notified once approved!
        </div>
      )}

      {application.status === 'approved' && (
        <div style={{ padding: '14px', backgroundColor: '#D1FAE5', color: '#065F46', borderRadius: '12px', fontSize: '14px' }}>
          🎉 Congratulations! Your partner application has been approved. You now have restaurant partner access!
        </div>
      )}

      {application.status === 'rejected' && (
        <div style={{ padding: '14px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '12px', fontSize: '14px' }}>
          <p style={{ fontWeight: 600, marginBottom: '4px' }}>❌ Application Rejected</p>
          <p style={{ fontSize: '13px' }}>
            <strong>Reason / Remarks:</strong> {application.adminRemarks || 'No remarks provided.'}
          </p>
          {onEditResubmit && (
            <Button
              variant="primary"
              onClick={onEditResubmit}
              style={{ marginTop: '12px', width: '100%' }}
            >
              Edit & Resubmit Application
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default Status;
