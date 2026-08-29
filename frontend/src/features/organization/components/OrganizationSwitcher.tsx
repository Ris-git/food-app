import { useOrganization } from '../context/OrganizationContext';

export default function OrganizationSwitcher() {
  const { organizations, activeOrganization, activeRestaurant, selectOrganization, selectRestaurant, loading } = useOrganization();
  if (loading || !activeOrganization) return null;
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {organizations.length > 1 && (
        <select aria-label="Organization" value={activeOrganization._id} onChange={(event) => selectOrganization(event.target.value)} style={selectStyle}>
          {organizations.map((organization) => <option key={organization._id} value={organization._id}>{organization.name}</option>)}
        </select>
      )}
      <select aria-label="Restaurant" value={activeRestaurant?._id || activeRestaurant?.id || ''} onChange={(event) => selectRestaurant(event.target.value)} style={selectStyle}>
        {activeOrganization.restaurants.map((restaurant) => <option key={restaurant._id || restaurant.id} value={restaurant._id || restaurant.id}>{restaurant.name}</option>)}
      </select>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '9px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,.5)',
  background: '#FFFFFF', color: '#0F172A', fontWeight: 650, maxWidth: '190px',
};
