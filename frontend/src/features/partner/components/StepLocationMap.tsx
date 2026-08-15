import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [error, setError] = useState<string | null>(null);
  const [detectingGps, setDetectingGps] = useState<boolean>(false);

  // Read Google Maps API Key from Vite env
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

  const currentLng = formData.location?.coordinates?.[0] ?? 77.6412;
  const currentLat = formData.location?.coordinates?.[1] ?? 12.9719;

  // ─── Initialize (or re-center) Map whenever lat/lng or SDK loads ─────────────
  const initOrUpdateMap = useCallback(() => {
    if (!mapDivRef.current || !window.google?.maps) return;

    const center = { lat: currentLat, lng: currentLng };

    if (!mapInstanceRef.current) {
      // First time: create Map instance
      const map = new window.google.maps.Map(mapDivRef.current, {
        center,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      // Draggable red marker
      const marker = new window.google.maps.Marker({
        position: center,
        map,
        draggable: true,
        title: 'Drag to fine-tune your restaurant location',
      });

      // When user finishes dragging the pin → reverse geocode + update state
      marker.addListener('dragend', async (event: any) => {
        const newLat: number = event.latLng.lat();
        const newLng: number = event.latLng.lng();

        let reverseAddress = `${newLat.toFixed(5)}, ${newLng.toFixed(5)}`;

        if (apiKey) {
          try {
            const res = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${newLat},${newLng}&key=${apiKey}`
            );
            const data = await res.json();
            if (data.results?.[0]?.formatted_address) {
              reverseAddress = data.results[0].formatted_address;
            }
          } catch (e) {
            console.warn('Reverse geocode after drag failed', e);
          }
        }

        onChange('location', { type: 'Point', coordinates: [newLng, newLat] });
        onChange('formattedAddress', reverseAddress);
        onChange('address', reverseAddress);
        if (inputRef.current) inputRef.current.value = reverseAddress;
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      // Already created: just re-center map & move marker to new coordinates
      mapInstanceRef.current.setCenter(center);
      markerRef.current?.setPosition(center);
    }
  }, [currentLat, currentLng, apiKey, onChange]);

  // Callback that fires when useGooglePlaces finishes loading the SDK
  const { isLoaded } = useGooglePlaces(
    inputRef,
    (place) => {
      onChange('formattedAddress', place.formattedAddress);
      onChange('address', place.formattedAddress);
      onChange('location', {
        type: 'Point',
        coordinates: [place.lng, place.lat],
      });
      if (inputRef.current) inputRef.current.value = place.formattedAddress;
    },
    apiKey
  );

  // Once SDK is loaded, render the map
  useEffect(() => {
    if (isLoaded) {
      initOrUpdateMap();
    }
  }, [isLoaded, initOrUpdateMap]);

  // Re-center map whenever coordinates change from preset/GPS
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      const center = { lat: currentLat, lng: currentLng };
      mapInstanceRef.current.setCenter(center);
      markerRef.current.setPosition(center);
    }
  }, [currentLat, currentLng]);

  // ─── 1-Click GPS Detect ────────────────────────────────────────────────────
  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingGps(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        let detectedAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        if (apiKey) {
          try {
            const res = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
            );
            const data = await res.json();
            if (data.results?.[0]?.formatted_address) {
              detectedAddress = data.results[0].formatted_address;
            }
          } catch (e) {
            console.warn('Reverse geocode fallback:', e);
          }
        }

        onChange('formattedAddress', detectedAddress);
        onChange('address', detectedAddress);
        onChange('location', { type: 'Point', coordinates: [lng, lat] });
        if (inputRef.current) inputRef.current.value = detectedAddress;
        setDetectingGps(false);
      },
      (err) => {
        console.warn('GPS Error:', err);
        setError('Unable to detect location. Check browser location permissions.');
        setDetectingGps(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // ─── Quick Preset Buttons ─────────────────────────────────────────────────
  const handleApplyPreset = (preset: typeof PRESET_LOCATIONS[0]) => {
    onChange('formattedAddress', preset.address);
    onChange('address', preset.address);
    onChange('location', { type: 'Point', coordinates: [preset.lng, preset.lat] });
    if (inputRef.current) inputRef.current.value = preset.address;
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
        Search your address via Google Places, detect GPS location, or drag the map pin.
      </p>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '12px', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Google Places Search Bar + Detect My Location */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label className="input-label" style={{ fontWeight: 600, color: '#1E293B' }}>
            🔍 Search Address via Google Places
          </label>
          <button
            type="button"
            onClick={handleDetectCurrentLocation}
            disabled={detectingGps}
            style={{
              fontSize: '12px',
              padding: '4px 12px',
              backgroundColor: '#ECFDF5',
              color: '#047857',
              border: '1px solid #A7F3D0',
              borderRadius: '9999px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {detectingGps ? '📡 Locating GPS...' : '🎯 Detect My Location'}
          </button>
        </div>
        <input
          ref={inputRef}
          type="text"
          className="input-field"
          placeholder="Start typing area, street, or landmark..."
          defaultValue={formData.formattedAddress || formData.address}
          style={{ width: '100%' }}
        />
        <span style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'block' }}>
          {isLoaded ? '✅ Google Places live search active.' : '⏳ Loading Google Places SDK...'}
        </span>
      </div>

      {/* ─── Live Interactive Google Map Canvas ─────────────────────────────── */}
      <div
        style={{
          marginBottom: '24px',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          position: 'relative',
        }}
      >
        <div
          ref={mapDivRef}
          id="restaurant-location-map"
          style={{ width: '100%', height: '280px' }}
        />
        {!isLoaded && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#F8FAFC',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '32px' }}>🗺️</div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
              Loading Google Map...
            </div>
          </div>
        )}
      </div>

      <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '16px', marginTop: '-16px' }}>
        💡 Drag the red pin on the map to fine-tune your exact store location. Address updates automatically!
      </p>

      {/* Quick Test Presets */}
      <div style={{ marginBottom: '24px', backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
          ⚡ Quick Location Presets:
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
            onChange('location', { type: 'Point', coordinates: [currentLng, newLat] });
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
            onChange('location', { type: 'Point', coordinates: [newLng, currentLat] });
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
        <div style={{ fontSize: '24px' }}>📍</div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#065F46' }}>Live GeoJSON Location Active</div>
          <div style={{ fontSize: '12px', color: '#047857' }}>
            Coordinates: <code>[{currentLng.toFixed(5)}, {currentLat.toFixed(5)}]</code> — ready for MongoDB <code>2dsphere</code> indexing
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
