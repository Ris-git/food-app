import React, { useState } from 'react';
import StepProgressBar from '../../features/partner/components/StepProgressBar';
import StepBrandProfile from '../../features/partner/components/StepBrandProfile';
import StepLocationMap from '../../features/partner/components/StepLocationMap';
import StepScheduleConfig from '../../features/partner/components/StepScheduleConfig';
import StepMenuImport from '../../features/partner/components/StepMenuImport';
import StepReviewSubmission from '../../features/partner/components/StepReviewSubmission';
import { partnerService } from '../../features/partner/services/partnerService';
import type { OperatingHours, MealSlots, StagedMenuItem } from '../../types';

const DEFAULT_SCHEDULE = { isOpen: true, openTime: '09:00', closeTime: '22:00' };

interface WizardContainerProps {
  onSuccess?: () => void;
}

export const WizardContainer: React.FC<WizardContainerProps> = ({ onSuccess }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    restaurantName: '',
    franchiseName: '',
    logoUrl: '',
    phone: '',
    cuisine: '',
    address: '',
    formattedAddress: '',
    location: {
      type: 'Point' as const,
      coordinates: [77.6412, 12.9719] as [number, number],
    },
    description: '',
    operatingHours: {
      monday: { ...DEFAULT_SCHEDULE },
      tuesday: { ...DEFAULT_SCHEDULE },
      wednesday: { ...DEFAULT_SCHEDULE },
      thursday: { ...DEFAULT_SCHEDULE },
      friday: { ...DEFAULT_SCHEDULE },
      saturday: { ...DEFAULT_SCHEDULE },
      sunday: { ...DEFAULT_SCHEDULE },
    } as OperatingHours,
    mealSlots: {
      breakfast: { active: true, start: '08:00', end: '11:00' },
      lunch: { active: true, start: '12:00', end: '16:00' },
      dinner: { active: true, start: '19:00', end: '23:00' },
    } as MealSlots,
    stagedMenuItems: [] as StagedMenuItem[],
  });

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleStepClick = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  const handleFinalSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        restaurantName: formData.restaurantName,
        franchiseName: formData.franchiseName,
        logoUrl: formData.logoUrl,
        phone: formData.phone,
        cuisine: formData.cuisine,
        address: formData.formattedAddress || formData.address,
        formattedAddress: formData.formattedAddress || formData.address,
        location: formData.location,
        description: formData.description,
        operatingHours: formData.operatingHours,
        mealSlots: formData.mealSlots,
        stagedMenuItems: formData.stagedMenuItems,
      };

      const res = await partnerService.applyForPartner(payload);
      if (res.success || res.application) {
        setIsSubmittedSuccess(true);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit partner application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isSubmittedSuccess) {
    return (
      <div
        style={{
          maxWidth: '600px',
          margin: '40px auto',
          padding: '40px',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          color: '#0F172A',
          boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
          textAlign: 'center',
        }}
      >
        <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px', fontFamily: 'var(--font-display)', color: '#059669' }}>
          Application Submitted Successfully!
        </h3>
        <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px' }}>
          Your partner onboarding application with <strong>{formData.stagedMenuItems.length} staged menu items</strong> is now under Admin review.
        </p>
        <button className="btn-ghost" onClick={() => window.location.reload()}>
          View Application Status
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: '680px',
        margin: '40px auto',
        padding: '36px',
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        color: '#0F172A',
        boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
      }}
    >
      <StepProgressBar currentStep={currentStep} onStepClick={handleStepClick} />

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '12px', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {currentStep === 1 && (
        <StepBrandProfile
          formData={{
            restaurantName: formData.restaurantName,
            franchiseName: formData.franchiseName,
            phone: formData.phone,
            cuisine: formData.cuisine,
            logoUrl: formData.logoUrl,
          }}
          onChange={handleFieldChange}
          onNext={handleNextStep}
        />
      )}

      {currentStep === 2 && (
        <StepLocationMap
          formData={{
            address: formData.address,
            formattedAddress: formData.formattedAddress,
            location: formData.location,
          }}
          onChange={handleFieldChange}
          onNext={handleNextStep}
          onBack={handlePrevStep}
        />
      )}

      {currentStep === 3 && (
        <StepScheduleConfig
          operatingHours={formData.operatingHours}
          mealSlots={formData.mealSlots}
          onChangeOperatingHours={(hours) => handleFieldChange('operatingHours', hours)}
          onChangeMealSlots={(slots) => handleFieldChange('mealSlots', slots)}
          onNext={handleNextStep}
          onBack={handlePrevStep}
        />
      )}

      {currentStep === 4 && (
        <StepMenuImport
          stagedMenuItems={formData.stagedMenuItems}
          onChangeMenuItems={(items) => handleFieldChange('stagedMenuItems', items)}
          onNext={handleNextStep}
          onBack={handlePrevStep}
        />
      )}

      {currentStep === 5 && (
        <StepReviewSubmission
          formData={formData}
          onSubmit={handleFinalSubmit}
          onBack={handlePrevStep}
          submitting={submitting}
        />
      )}
    </div>
  );
};

export default WizardContainer;
