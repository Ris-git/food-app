import React, { useState, useEffect } from 'react';
import { partnerService } from '../../features/partner/services/partnerService';
import type { PartnerApplicationData } from '../../features/partner/services/partnerService';
import type { RestaurantApplication } from '../../types';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Status from './Status';

export const Application: React.FC = () => {
  const [application, setApplication] = useState<RestaurantApplication | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [fetching, setFetching] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<PartnerApplicationData>({
    restaurantName: '',
    description: '',
    address: '',
    phone: '',
    cuisine: '',
  });

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setFetching(true);
    try {
      const res = await partnerService.getPartnerApplication();
      if (res.hasApplication && res.application) {
        setApplication(res.application);
        // Pre-fill form data for potential editing
        setFormData({
          restaurantName: res.application.restaurantName || '',
          description: res.application.description || '',
          address: res.application.address || '',
          phone: res.application.phone || '',
          cuisine: res.application.cuisine || '',
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch application status.');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await partnerService.applyForPartner(formData);
      if (res.application) {
        setApplication(res.application);
        setIsEditing(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (fetching) {
    return (
      <div style={{ textAlign: 'center', margin: '60px auto', color: '#FFF' }}>
        <p>Loading application status...</p>
      </div>
    );
  }

  // If application exists and user is not explicitly editing, show Status view
  if (application && !isEditing) {
    return <Status application={application} onEditResubmit={() => setIsEditing(true)} />;
  }

  return (
    <div
      style={{
        maxWidth: '500px',
        margin: '50px auto',
        padding: '32px',
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        color: '#0F172A',
        boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
      }}
    >
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '8px', fontSize: '22px', fontWeight: 800 }}>
        {application && application.status === 'rejected' ? 'Edit & Resubmit Partner Application' : 'Partner With Foody'}
      </h2>
      <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '20px' }}>
        Fill out your restaurant details to register as a restaurant partner.
      </p>

      {error && <div style={{ color: '#EF4444', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <Input
          label="Restaurant Name"
          name="restaurantName"
          placeholder="e.g. Spice Garden"
          value={formData.restaurantName}
          onChange={handleChange}
          required
        />
        <Input
          label="Cuisine Type"
          name="cuisine"
          placeholder="e.g. North Indian, Italian, Fast Food"
          value={formData.cuisine}
          onChange={handleChange}
          required
        />
        <Input
          label="Contact Phone"
          name="phone"
          placeholder="e.g. 9876543210"
          value={formData.phone}
          onChange={handleChange}
          required
        />
        <Input
          label="Restaurant Address"
          name="address"
          placeholder="123 Main Street, Sector 18"
          value={formData.address}
          onChange={handleChange}
          required
        />
        <Input
          label="Description (Optional)"
          name="description"
          placeholder="Brief description of your restaurant"
          value={formData.description}
          onChange={handleChange}
        />
        <Button type="submit" isLoading={submitting} style={{ width: '100%', marginTop: '12px' }}>
          {application && application.status === 'rejected' ? 'Resubmit Application' : 'Submit Partner Application'}
        </Button>
      </form>
    </div>
  );
};

export default Application;
