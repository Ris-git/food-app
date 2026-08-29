import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Organization, Restaurant } from '../../../types';
import { useAuth } from '../../auth/context/AuthContext';
import { organizationService } from '../services/organizationService';

type OrganizationContextValue = {
  organizations: Organization[];
  activeOrganization: Organization | null;
  activeRestaurant: Restaurant | null;
  loading: boolean;
  error: string | null;
  selectOrganization: (id: string) => void;
  selectRestaurant: (id: string) => void;
  reload: () => Promise<void>;
};

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState(localStorage.getItem('activeOrganizationId') || '');
  const [restaurantId, setRestaurantId] = useState(localStorage.getItem('activeRestaurantId') || '');

  const reload = async () => {
    if (!user) { setOrganizations([]); return; }
    setLoading(true);
    try {
      const result = await organizationService.getContext();
      const next = result.organizations || [];
      setOrganizations(next);
      setError(null);
      const selectedOrganization = next.find((item) => item._id === organizationId) || next[0];
      if (selectedOrganization) {
        setOrganizationId(selectedOrganization._id);
        localStorage.setItem('activeOrganizationId', selectedOrganization._id);
        const selectedRestaurant = selectedOrganization.restaurants.find((item) => (item._id || item.id) === restaurantId) || selectedOrganization.restaurants[0];
        if (selectedRestaurant) {
          const id = selectedRestaurant._id || selectedRestaurant.id;
          setRestaurantId(id);
          localStorage.setItem('activeRestaurantId', id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load restaurant accounts.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void reload(); }, [user?.id, user?.role]);

  const activeOrganization = useMemo(() => organizations.find((item) => item._id === organizationId) || organizations[0] || null, [organizations, organizationId]);
  const activeRestaurant = useMemo(() => activeOrganization?.restaurants.find((item) => (item._id || item.id) === restaurantId) || activeOrganization?.restaurants[0] || null, [activeOrganization, restaurantId]);

  const selectOrganization = (id: string) => {
    const organization = organizations.find((item) => item._id === id);
    if (!organization) return;
    setOrganizationId(id);
    localStorage.setItem('activeOrganizationId', id);
    const restaurant = organization.restaurants[0];
    if (restaurant) {
      const nextRestaurantId = restaurant._id || restaurant.id;
      setRestaurantId(nextRestaurantId);
      localStorage.setItem('activeRestaurantId', nextRestaurantId);
    }
  };
  const selectRestaurant = (id: string) => {
    if (!activeOrganization?.restaurants.some((item) => (item._id || item.id) === id)) return;
    setRestaurantId(id);
    localStorage.setItem('activeRestaurantId', id);
  };

  return <OrganizationContext.Provider value={{ organizations, activeOrganization, activeRestaurant, loading, error, selectOrganization, selectRestaurant, reload }}>{children}</OrganizationContext.Provider>;
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) throw new Error('useOrganization must be used inside OrganizationProvider');
  return context;
};
