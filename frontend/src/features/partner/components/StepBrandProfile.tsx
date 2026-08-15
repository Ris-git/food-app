import React, { useState } from 'react';
import Input from '../../../components/Input';
import Button from '../../../components/Button';
import { partnerService } from '../services/partnerService';

interface StepBrandProfileProps {
  formData: {
    restaurantName: string;
    franchiseName: string;
    phone: string;
    cuisine: string;
    logoUrl: string;
  };
  onChange: (field: string, value: string) => void;
  onNext: () => void;
}

export const StepBrandProfile: React.FC<StepBrandProfileProps> = ({ formData, onChange, onNext }) => {
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    try {
      const res = await partnerService.uploadLogoToImageKit(file);
      onChange('logoUrl', res.url);
    } catch (err: any) {
      setUploadError(err.message || 'Image upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.restaurantName.trim()) {
      setUploadError('Restaurant name is required.');
      return;
    }
    if (!formData.phone.trim()) {
      setUploadError('Contact phone number is required.');
      return;
    }
    if (!formData.cuisine.trim()) {
      setUploadError('Cuisine type is required.');
      return;
    }
    setUploadError(null);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px', fontFamily: 'var(--font-display)' }}>
        Step 1: Brand & Franchise Profile
      </h3>
      <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px' }}>
        Provide your restaurant brand details and upload your business logo.
      </p>

      {uploadError && (
        <div style={{ padding: '12px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '12px', marginBottom: '16px', fontSize: '14px' }}>
          {uploadError}
        </div>
      )}

      {/* Logo Upload Box */}
      <div style={{ marginBottom: '24px' }}>
        <label className="input-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1E293B' }}>
          Restaurant Logo (Optional)
        </label>

        <div
          style={{
            border: '2px dashed #CBD5E1',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            backgroundColor: '#F8FAFC',
            position: 'relative',
            cursor: 'pointer',
          }}
        >
          {formData.logoUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <img
                src={formData.logoUrl}
                alt="Restaurant Logo Preview"
                style={{ width: '96px', height: '96px', borderRadius: '16px', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <span style={{ fontSize: '13px', color: '#10B981', fontWeight: 600 }}>✓ Logo Uploaded Successfully</span>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => onChange('logoUrl', '')}
                style={{ fontSize: '12px', color: '#EF4444' }}
              >
                Remove Logo
              </button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                {uploading ? 'Uploading to ImageKit CDN...' : 'Click to select or drag logo image'}
              </p>
              <p style={{ fontSize: '12px', color: '#94A3B8' }}>Supports PNG, JPEG, WebP (Max 5MB)</p>
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
                disabled={uploading}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                }}
              />
            </div>
          )}
        </div>
      </div>

      <Input
        label="Restaurant Name"
        name="restaurantName"
        placeholder="e.g. The Emerald Bistro"
        value={formData.restaurantName}
        onChange={(e) => onChange('restaurantName', e.target.value)}
        required
      />

      <Input
        label="Franchise / Parent Company Name (Optional)"
        name="franchiseName"
        placeholder="e.g. Emerald Hospitality Group"
        value={formData.franchiseName}
        onChange={(e) => onChange('franchiseName', e.target.value)}
      />

      <Input
        label="Cuisine Type"
        name="cuisine"
        placeholder="e.g. Italian, Continental, Fast Food"
        value={formData.cuisine}
        onChange={(e) => onChange('cuisine', e.target.value)}
        required
      />

      <Input
        label="Contact Phone Number"
        name="phone"
        placeholder="e.g. 9876543210"
        value={formData.phone}
        onChange={(e) => onChange('phone', e.target.value)}
        required
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
        <Button type="submit" variant="primary">
          Next: Location & Address
        </Button>
      </div>
    </form>
  );
};

export default StepBrandProfile;
