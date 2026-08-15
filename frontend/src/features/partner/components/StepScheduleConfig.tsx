import React, { useState } from 'react';
import Button from '../../../components/Button';
import type { DaySchedule, OperatingHours, MealSlots } from '../../../types';

interface StepScheduleConfigProps {
  operatingHours: OperatingHours;
  mealSlots: MealSlots;
  onChangeOperatingHours: (hours: OperatingHours) => void;
  onChangeMealSlots: (slots: MealSlots) => void;
  onNext: () => void;
  onBack: () => void;
}

const DAYS: Array<{ key: keyof OperatingHours; label: string }> = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export const StepScheduleConfig: React.FC<StepScheduleConfigProps> = ({
  operatingHours,
  mealSlots,
  onChangeOperatingHours,
  onChangeMealSlots,
  onNext,
  onBack,
}) => {
  const [error, setError] = useState<string | null>(null);

  // Day Schedule Field Updater (Immutable Spreading)
  const handleDayChange = (dayKey: keyof OperatingHours, field: keyof DaySchedule, value: any) => {
    const updated = {
      ...operatingHours,
      [dayKey]: {
        ...operatingHours[dayKey],
        [field]: value,
      },
    };
    onChangeOperatingHours(updated);
  };

  // Copy Monday to All Days Batch Action
  const handleCopyMondayToAll = () => {
    const mondaySchedule = operatingHours.monday;
    const updated: OperatingHours = {
      monday: { ...mondaySchedule },
      tuesday: { ...mondaySchedule },
      wednesday: { ...mondaySchedule },
      thursday: { ...mondaySchedule },
      friday: { ...mondaySchedule },
      saturday: { ...mondaySchedule },
      sunday: { ...mondaySchedule },
    };
    onChangeOperatingHours(updated);
  };

  // Meal Slot Field Updater
  const handleMealSlotChange = (slotKey: keyof MealSlots, field: 'active' | 'start' | 'end', value: any) => {
    const updated = {
      ...mealSlots,
      [slotKey]: {
        ...mealSlots[slotKey],
        [field]: value,
      },
    };
    onChangeMealSlots(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate that at least one day is open
    const hasOpenDay = DAYS.some((day) => operatingHours[day.key]?.isOpen);
    if (!hasOpenDay) {
      setError('Please configure at least one operating open day for your restaurant.');
      return;
    }
    setError(null);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px', fontFamily: 'var(--font-display)' }}>
        Step 3: Operating Hours & Meal Slots
      </h3>
      <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px' }}>
        Configure day-wise opening schedules and shift meal slots (Breakfast, Lunch, Dinner).
      </p>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '12px', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Header Bar with Batch Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>Day-Wise Schedule</span>
        <button
          type="button"
          onClick={handleCopyMondayToAll}
          style={{
            fontSize: '12px',
            padding: '6px 14px',
            backgroundColor: '#EFF6FF',
            color: '#1D4ED8',
            border: '1px solid #BFDBFE',
            borderRadius: '9999px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Copy Monday Schedule to All Days
        </button>
      </div>

      {/* Day-Wise Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
        {DAYS.map((day) => {
          const schedule = operatingHours[day.key] || { isOpen: true, openTime: '09:00', closeTime: '22:00' };

          return (
            <div
              key={day.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: schedule.isOpen ? '#F8FAFC' : '#F1F5F9',
                border: '1px solid #E2E8F0',
                opacity: schedule.isOpen ? 1 : 0.65,
              }}
            >
              {/* Day Label & Open Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '140px' }}>
                <input
                  type="checkbox"
                  checked={schedule.isOpen}
                  onChange={(e) => handleDayChange(day.key, 'isOpen', e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#10B981', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{day.label}</span>
              </div>

              {/* Time Controls */}
              {schedule.isOpen ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="time"
                    value={schedule.openTime}
                    onChange={(e) => handleDayChange(day.key, 'openTime', e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 600 }}
                  />
                  <span style={{ fontSize: '12px', color: '#64748B' }}>to</span>
                  <input
                    type="time"
                    value={schedule.closeTime}
                    onChange={(e) => handleDayChange(day.key, 'closeTime', e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 600 }}
                  />
                </div>
              ) : (
                <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>Closed</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Meal Slots Section */}
      <div style={{ marginBottom: '32px' }}>
        <span style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', display: 'block', marginBottom: '12px' }}>
          Shift Meal Slots (Automated Menu Availability)
        </span>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          {(['breakfast', 'lunch', 'dinner'] as const).map((slotKey) => {
            const slot = mealSlots[slotKey] || { active: true, start: '08:00', end: '11:00' };

            return (
              <div
                key={slotKey}
                style={{
                  padding: '14px',
                  borderRadius: '16px',
                  backgroundColor: slot.active ? '#ECFDF5' : '#F8FAFC',
                  border: slot.active ? '1.5px solid #A7F3D0' : '1px solid #E2E8F0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'capitalize', color: '#065F46' }}>
                    {slotKey}
                  </span>
                  <input
                    type="checkbox"
                    checked={slot.active}
                    onChange={(e) => handleMealSlotChange(slotKey, 'active', e.target.checked)}
                    style={{ accentColor: '#10B981', cursor: 'pointer' }}
                  />
                </div>

                {slot.active && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#047857' }}>Start:</span>
                      <input
                        type="time"
                        value={slot.start}
                        onChange={(e) => handleMealSlotChange(slotKey, 'start', e.target.value)}
                        style={{ padding: '2px 6px', borderRadius: '6px', border: '1px solid #6EE7B7', fontSize: '11px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#047857' }}>End:</span>
                      <input
                        type="time"
                        value={slot.end}
                        onChange={(e) => handleMealSlotChange(slotKey, 'end', e.target.value)}
                        style={{ padding: '2px 6px', borderRadius: '6px', border: '1px solid #6EE7B7', fontSize: '11px' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
        <Button type="button" variant="secondary" onClick={onBack}>
          Back to Step 2
        </Button>
        <Button type="submit" variant="primary">
          Next: Bulk Menu Import
        </Button>
      </div>
    </form>
  );
};

export default StepScheduleConfig;
