import React from 'react';

interface StepProgressBarProps {
  currentStep: number;
  totalSteps?: number;
  onStepClick?: (step: number) => void;
}

const STEPS = [
  { id: 1, label: 'Brand Profile' },
  { id: 2, label: 'Location' },
  { id: 3, label: 'Schedule' },
  { id: 4, label: 'Menu Import' },
  { id: 5, label: 'Final Review' },
];

export const StepProgressBar: React.FC<StepProgressBarProps> = ({ currentStep, onStepClick }) => {
  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
        {/* Background Line */}
        <div
          style={{
            position: 'absolute',
            top: '18px',
            left: 0,
            right: 0,
            height: '3px',
            backgroundColor: '#E2E8F0',
            zIndex: 0,
          }}
        />
        {/* Completed Progress Line */}
        <div
          style={{
            position: 'absolute',
            top: '18px',
            left: 0,
            width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
            height: '3px',
            backgroundColor: '#10B981',
            transition: 'width 0.3s ease',
            zIndex: 0,
          }}
        />

        {STEPS.map((step) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <div
              key={step.id}
              onClick={() => isCompleted && onStepClick && onStepClick(step.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 1,
                cursor: isCompleted ? 'pointer' : 'default',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: isCompleted ? '#10B981' : isCurrent ? '#059669' : '#FFFFFF',
                  border: isCurrent ? '3px solid #10B981' : isCompleted ? 'none' : '2px solid #CBD5E1',
                  color: isCompleted || isCurrent ? '#FFFFFF' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(16, 185, 129, 0.2)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {isCompleted ? '✓' : step.id}
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? '#0F172A' : isCompleted ? '#059669' : '#94A3B8',
                  marginTop: '6px',
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepProgressBar;
