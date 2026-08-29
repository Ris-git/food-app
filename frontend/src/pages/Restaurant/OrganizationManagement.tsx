import { useEffect, useState } from 'react';
import { useOrganization } from '../../features/organization/context/OrganizationContext';
import { organizationService } from '../../features/organization/services/organizationService';

const card: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '22px' };
const input: React.CSSProperties = { width: '100%', padding: '11px 12px', border: '1px solid #CBD5E1', borderRadius: '10px', boxSizing: 'border-box' };
const button: React.CSSProperties = { padding: '10px 16px', border: 0, borderRadius: '10px', background: '#0F172A', color: '#FFF', fontWeight: 700, cursor: 'pointer' };

export default function OrganizationManagement({ onBack }: { onBack: () => void }) {
  const { activeOrganization, reload } = useOrganization();
  const [staff, setStaff] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [restaurant, setRestaurant] = useState({ name: '', address: '', phone: '' });
  const [invite, setInvite] = useState({ email: '', role: 'STAFF', restaurant: '', restaurantRole: 'MANAGER' });

  const load = async () => {
    if (!activeOrganization) return;
    try {
      const overviewResult = await organizationService.getOverview(activeOrganization._id);
      const staffResult = activeOrganization.membershipRole === 'STAFF'
        ? null
        : await organizationService.getStaff(activeOrganization._id);
      setStaff(staffResult);
      setOverview((overviewResult as any).overview);
      setInvite((current) => ({ ...current, restaurant: current.restaurant || activeOrganization.restaurants[0]?._id || activeOrganization.restaurants[0]?.id || '' }));
    } catch (error: any) { setMessage(error.message); }
  };
  useEffect(() => { void load(); }, [activeOrganization?._id]);
  if (!activeOrganization) return <div style={{ padding: 30 }}>No organization available. Run the organization migration first.</div>;

  const createRestaurant = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage('');
    try {
      await organizationService.createRestaurant(activeOrganization._id, { ...restaurant, cuisine: [] });
      setRestaurant({ name: '', address: '', phone: '' });
      await reload(); await load(); setMessage('Restaurant created.');
    } catch (error: any) { setMessage(error.message); }
  };
  const sendInvite = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage('');
    try {
      const result: any = await organizationService.inviteStaff(activeOrganization._id, {
        email: invite.email, role: invite.role as 'ADMIN' | 'STAFF',
        restaurantAssignments: [{ restaurant: invite.restaurant, role: invite.restaurantRole as any }],
      });
      setInvite((current) => ({ ...current, email: '' })); await load();
      setMessage(result.inviteUrl ? `Invitation created. Development link: ${result.inviteUrl}` : 'Invitation sent.');
    } catch (error: any) { setMessage(error.message); }
  };

  return (
    <main style={{ maxWidth: 1100, margin: '32px auto', padding: '0 24px', color: '#0F172A' }}>
      <button onClick={onBack} style={{ ...button, background: 'transparent', color: '#FFFFFF', paddingLeft: 0 }}>Back to dashboard</button>
      <h1 style={{ color: '#FFFFFF' }}>{activeOrganization.name}</h1>
      {message && <div style={{ ...card, marginBottom: 16, padding: 14 }}>{message}</div>}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14, marginBottom: 18 }}>
        <div style={card}><strong>Restaurants</strong><div style={{ fontSize: 28, marginTop: 8 }}>{overview?.restaurantCount ?? activeOrganization.restaurants.length}</div></div>
        <div style={card}><strong>Staff</strong><div style={{ fontSize: 28, marginTop: 8 }}>{activeOrganization.membershipRole === 'STAFF' ? overview?.staffCount ?? 0 : `${staff?.usage?.staff ?? 0} / ${staff?.usage?.limit === -1 ? 'Unlimited' : staff?.usage?.limit ?? 0}`}</div></div>
        <div style={card}><strong>All-location orders</strong><div style={{ fontSize: 28, marginTop: 8 }}>{overview?.orders ?? 0}</div></div>
        <div style={card}><strong>Delivered revenue</strong><div style={{ fontSize: 28, marginTop: 8 }}>₹{overview?.revenue ?? 0}</div></div>
      </section>

      {activeOrganization.membershipRole !== 'STAFF' && <>
        <section style={{ ...card, marginBottom: 18 }}>
          <h2>Restaurant locations</h2>
          {activeOrganization.restaurants.map((item) => <div key={item._id || item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0', padding: '12px 0' }}>
            <div><strong>{item.name}</strong><div style={{ color: '#64748B' }}>{item.formattedAddress || item.address}</div></div>
            {activeOrganization.restaurants.length > 1 && <button style={{ ...button, background: '#B91C1C' }} onClick={async () => { if (confirm('Archive this restaurant location?')) { await organizationService.archiveRestaurant(activeOrganization._id, item._id || item.id); await reload(); await load(); } }}>Archive</button>}
          </div>)}
        </section>
        <section style={{ ...card, marginBottom: 18 }}>
          <h2>Add restaurant</h2>
          <form onSubmit={createRestaurant} style={{ display: 'grid', gridTemplateColumns: '2fr 3fr 2fr auto', gap: 10 }}>
            <input required placeholder="Restaurant name" value={restaurant.name} onChange={(e) => setRestaurant({ ...restaurant, name: e.target.value })} style={input} />
            <input required placeholder="Address" value={restaurant.address} onChange={(e) => setRestaurant({ ...restaurant, address: e.target.value })} style={input} />
            <input placeholder="Phone" value={restaurant.phone} onChange={(e) => setRestaurant({ ...restaurant, phone: e.target.value })} style={input} />
            <button style={button}>Add</button>
          </form>
        </section>

        <section style={{ ...card, marginBottom: 18 }}>
          <h2>Invite staff</h2>
          <form onSubmit={sendInvite} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr auto', gap: 10 }}>
            <input required type="email" placeholder="Staff email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} style={input} />
            <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })} style={input}><option value="STAFF">Staff</option><option value="ADMIN">Org admin</option></select>
            <select value={invite.restaurant} onChange={(e) => setInvite({ ...invite, restaurant: e.target.value })} style={input}>{activeOrganization.restaurants.map((item) => <option key={item._id || item.id} value={item._id || item.id}>{item.name}</option>)}</select>
            <select value={invite.restaurantRole} onChange={(e) => setInvite({ ...invite, restaurantRole: e.target.value })} style={input}><option>MANAGER</option><option>KITCHEN</option><option>CASHIER</option><option>ANALYST</option></select>
            <button style={button}>Invite</button>
          </form>
        </section>
      </>}

      {activeOrganization.membershipRole !== 'STAFF' && <section style={card}>
        <h2>People and access</h2>
        {staff?.members?.map((member: any) => <div key={member._id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderTop: '1px solid #E2E8F0', padding: '14px 0' }}>
          <div><strong>{member.user?.name}</strong><div style={{ color: '#64748B' }}>{member.user?.email} · {member.role}</div><small>{member.assignments?.map((a: any) => `${a.restaurant?.name}: ${a.role}`).join(', ') || 'Organization-wide owner access'}</small></div>
          {member.role !== 'OWNER' && <button style={{ ...button, background: '#B91C1C' }} onClick={async () => { if (confirm('Remove this staff member?')) { await organizationService.removeStaff(activeOrganization._id, member._id); await load(); } }}>Remove</button>}
        </div>)}
        {staff?.invitations?.map((invitation: any) => <div key={invitation._id} style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', padding: '14px 0' }}><span>{invitation.email} · Pending</span><button style={button} onClick={async () => { await organizationService.revokeInvitation(activeOrganization._id, invitation._id); await load(); }}>Revoke</button></div>)}
      </section>}
    </main>
  );
}
