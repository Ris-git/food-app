import React, { useState } from 'react';
import StepProgressBar from '../../features/partner/components/StepProgressBar';
import StepBrandProfile from '../../features/partner/components/StepBrandProfile';

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
  });

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 5));
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

      {currentStep > 1 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
            Step {currentStep} Configured Cleanly
          </h4>
          <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '20px' }}>
            Brand Profile data collected: <strong>{formData.restaurantName}</strong> ({formData.cuisine})
          </p>
          <button className="btn-ghost" onClick={() => setCurrentStep(1)}>
            ← Back to Step 1: Brand Profile
          </button>
        </div>
      )}
    </div>
  );
};

export default WizardContainer;
