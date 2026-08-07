import React, { useRef, useState } from 'react';
import Input from '../../../components/Input';
import Button from '../../../components/Button';
import { useGooglePlaces } from '../hooks/useGooglePlaces';

interface StepLocationMapProps {
  formData: {
    address: string;
    formattedAddress: string;
    location: {
      type: 'Point';
      coordinates: [number, number]; // [lng, lat]
    };
  };
  onChange: (field: string, value: any) => void;
  onNext: () => void;
  onBack: () => void;
}

const PRESET_LOCATIONS = [
  { name: 'Indiranagar, Bengaluru', lat: 12.9719, lng: 77.6412, address: 'Shop 42, Ground Floor, Indiranagar, Bengaluru, Karnataka 560038' },
  { name: 'Connaught Place, New Delhi', lat: 28.6315, lng: 77.2167, address: 'Block A, Connaught Place, New Delhi, Delhi 110001' },
  { name: 'Bandra West, Mumbai', lat: 19.0596, lng: 72.8295, address: 'Hill Road, Bandra West, Mumbai, Maharashtra 400050' },
];

export const StepLocationMap: React.FC<StepLocationMapProps> = ({ formData, onChange, onNext, onBack }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize Google Places hook (pass optional import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';
  useGooglePlaces(
    inputRef,
    (place) => {
      onChange('formattedAddress', place.formattedAddress);
      onChange('address', place.formattedAddress);
      onChange('location', {
        type: 'Point',
        coordinates: [place.lng, place.lat], // GeoJSON: [lng, lat]
      });
    },
    apiKey
  );

  const currentLng = formData.location?.coordinates?.[0] ?? 77.6412;
  const currentLat = formData.location?.coordinates?.[1] ?? 12.9719;

  const handleApplyPreset = (preset: typeof PRESET_LOCATIONS[0]) => {
    onChange('formattedAddress', preset.address);
    onChange('address', preset.address);
    onChange('location', {
      type: 'Point',
      coordinates: [preset.lng, preset.lat],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.formattedAddress.trim() && !formData.address.trim()) {
      setError('Please provide a valid restaurant location address.');
      return;
    }
    setError(null);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px', fontFamily: 'var(--font-display)' }}>
        Step 2: Location & Precise Geocoding
      </h3>
      <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px' }}>
        Search your address or place a pin on the map for accurate delivery routing.
      </p>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '12px', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Google Places Search Bar */}
      <div style={{ marginBottom: '20px' }}>
        <label className="input-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1E293B' }}>
          🔍 Search Address via Google Places
        </label>
        <input
          ref={inputRef}
          type="text"
          className="input-field"
          placeholder="Start typing area, street, or landmark..."
          defaultValue={formData.formattedAddress || formData.address}
          style={{ width: '100%' }}
        />
        <span style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'block' }}>
          Type to search with Google Places Autocomplete.
        </span>
      </div>

      {/* Quick Test Presets */}
      <div style={{ marginBottom: '24px', backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
          ⚡ Quick Test Presets (Zero-Config Geocoding):
        </span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {PRESET_LOCATIONS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              style={{
                fontSize: '12px',
                padding: '6px 14px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                border: '1.5px solid #10B981',
                borderRadius: '9999px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              }}
            >
              📍 {preset.name}
            </button>
          ))}
        </div>

      </div>

      {/* Formatted Address Result */}
      <Input
        label="Formatted Address"
        name="formattedAddress"
        placeholder="123 Main Street, Sector 18"
        value={formData.formattedAddress || formData.address}
        onChange={(e) => {
          onChange('formattedAddress', e.target.value);
          onChange('address', e.target.value);
        }}
        required
      />

      {/* GeoJSON Coordinates Display */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <Input
          label="Latitude (Y-Axis)"
          type="number"
          step="any"
          value={currentLat}
          onChange={(e) => {
            const newLat = parseFloat(e.target.value) || 0;
            onChange('location', {
              type: 'Point',
              coordinates: [currentLng, newLat],
            });
          }}
          required
        />
        <Input
          label="Longitude (X-Axis)"
          type="number"
          step="any"
          value={currentLng}
          onChange={(e) => {
            const newLng = parseFloat(e.target.value) || 0;
            onChange('location', {
              type: 'Point',
              coordinates: [newLng, currentLat],
            });
          }}
          required
        />
      </div>

      {/* Coordinates Preview Card */}
      <div
        style={{
          padding: '16px',
          backgroundColor: '#ECFDF5',
          borderRadius: '16px',
          border: '1px solid #A7F3D0',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div style={{ fontSize: '24px' }}>🗺️</div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#065F46' }}>GeoJSON Spatial Point Ready</div>
          <div style={{ fontSize: '12px', color: '#047857' }}>
            Coordinates: <code>[{currentLng}, {currentLat}]</code> (Formatted for MongoDB <code>2dsphere</code> index)
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
        <Button type="button" variant="secondary" onClick={onBack}>
          ← Back to Step 1
        </Button>
        <Button type="submit" variant="primary">
          Next: Operating Schedule →
        </Button>
      </div>
    </form>
  );
};

export default StepLocationMap;
