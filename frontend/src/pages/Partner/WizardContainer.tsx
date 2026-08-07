import React, { useState } from 'react';
import StepProgressBar from '../../features/partner/components/StepProgressBar';
import StepBrandProfile from '../../features/partner/components/StepBrandProfile';
import StepLocationMap from '../../features/partner/components/StepLocationMap';
import StepScheduleConfig from '../../features/partner/components/StepScheduleConfig';
import type { OperatingHours, MealSlots } from '../../types';

const DEFAULT_SCHEDULE = { isOpen: true, openTime: '09:00', closeTime: '22:00' };

export const WizardContainer: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);

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

      {currentStep > 3 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
            Step {currentStep} Configured Cleanly
          </h4>
          <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '20px' }}>
            Schedule Configured: <strong>Monday ({formData.operatingHours.monday.openTime} - {formData.operatingHours.monday.closeTime})</strong>
          </p>
          <button className="btn-ghost" onClick={() => setCurrentStep(3)}>
            ← Back to Step 3: Schedule
          </button>
        </div>
      )}
    </div>
  );
};

export default WizardContainer;
