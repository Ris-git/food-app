import React from 'react';
import Button from '../../../components/Button';
import type { OperatingHours, MealSlots, StagedMenuItem } from '../../../types';

interface StepReviewSubmissionProps {
  formData: {
    restaurantName: string;
    franchiseName: string;
    logoUrl: string;
    phone: string;
    cuisine: string;
    address: string;
    formattedAddress: string;
    location: {
      type: 'Point';
      coordinates: [number, number];
    };
    operatingHours: OperatingHours;
    mealSlots: MealSlots;
    stagedMenuItems: StagedMenuItem[];
  };
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
}

export const StepReviewSubmission: React.FC<StepReviewSubmissionProps> = ({
  formData,
  onSubmit,
  onBack,
  submitting,
}) => {
  return (
    <div>
      <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px', fontFamily: 'var(--font-display)' }}>
        Step 5: Final Review & Partner Application
      </h3>
      <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px' }}>
        Please review your restaurant details before submitting for Admin approval.
      </p>

      {/* Summary Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        {/* Card 1: Brand Profile */}
        <div style={{ padding: '20px', backgroundColor: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
            🏷️ Brand Profile
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {formData.logoUrl ? (
              <img
                src={formData.logoUrl}
                alt="Logo"
                style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: '64px', height: '64px', borderRadius: '12px', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                🏬
              </div>
            )}
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{formData.restaurantName || 'Unnamed Restaurant'}</h4>
              {formData.franchiseName && (
                <p style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>Franchise: {formData.franchiseName}</p>
              )}
              <p style={{ fontSize: '13px', color: '#64748B' }}>
                Cuisine: {formData.cuisine} | Phone: {formData.phone}
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Location */}
        <div style={{ padding: '20px', backgroundColor: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            📍 Location & Geocoding
          </div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
            {formData.formattedAddress || formData.address || 'Address not specified'}
          </p>
          <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
            GeoJSON Spatial Point: <code>[{formData.location.coordinates[0]}, {formData.location.coordinates[1]}]</code>
          </span>
        </div>

        {/* Card 3: Schedule */}
        <div style={{ padding: '20px', backgroundColor: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            ⏰ Operating Schedule
          </div>
          <p style={{ fontSize: '13px', color: '#334155', marginBottom: '8px' }}>
            Monday Hours: <strong>{formData.operatingHours.monday.isOpen ? `${formData.operatingHours.monday.openTime} - ${formData.operatingHours.monday.closeTime}` : 'Closed'}</strong>
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['breakfast', 'lunch', 'dinner'] as const).map((slotKey) => {
              const active = formData.mealSlots[slotKey]?.active;
              return (
                <span
                  key={slotKey}
                  style={{
                    fontSize: '11px',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    backgroundColor: active ? '#ECFDF5' : '#F1F5F9',
                    color: active ? '#047857' : '#94A3B8',
                    fontWeight: 700,
                  }}
                >
                  {slotKey}: {active ? 'Active' : 'Off'}
                </span>
              );
            })}
          </div>
        </div>

        {/* Card 4: Staged Menu */}
        <div style={{ padding: '20px', backgroundColor: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
            📋 Menu Import Summary
          </div>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
            {formData.stagedMenuItems.length} Menu Items Staged for DB Seeding
          </p>
        </div>
      </div>

      {/* Navigation Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
        <Button type="button" variant="secondary" onClick={onBack} disabled={submitting}>
          ← Back to Step 4
        </Button>
        <Button type="button" variant="primary" onClick={onSubmit} isLoading={submitting}>
          Submit Partner Application ✓
        </Button>
      </div>
    </div>
  );
};

export default StepReviewSubmission;
