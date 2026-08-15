import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import type { OperatingHours, Restaurant } from '../../../types';
import {
  restaurantDashboardService,
  type Analytics,
  type DashboardResponse,
  type MenuItemInput,
} from '../services/restaurantDashboardService';

type Props = {
  data: DashboardResponse;
  onRefresh: () => Promise<void>;
  onRestaurantUpdated: (restaurant: Restaurant) => void;
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const inputStyle: React.CSSProperties = { padding: '9px 10px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', width: '100%', boxSizing: 'border-box' };
const actionStyle: React.CSSProperties = { border: 0, borderRadius: '8px', background: '#0F172A', color: '#FFF', padding: '9px 14px', fontWeight: 700, cursor: 'pointer' };
const sectionStyle: React.CSSProperties = { background: '#FFF', color: '#0F172A', border: '1px solid #E2E8F0', borderRadius: '20px', padding: '24px', marginTop: '24px' };
const smallButtonStyle: React.CSSProperties = { border: '1px solid #CBD5E1', borderRadius: '6px', background: '#FFF', color: '#334155', padding: '5px 9px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' };
const defaultHours = (): OperatingHours => Object.fromEntries(DAYS.map((day) => [day, { isOpen: true, openTime: '09:00', closeTime: '22:00' }])) as OperatingHours;
const today = new Date().toISOString().slice(0, 10);
const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

export const DashboardTools: React.FC<Props> = ({ data, onRefresh, onRestaurantUpdated }) => {
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuItemInput>({ title: '', type: 'veg', price: 0, description: '', isAvailable: true });
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState('');
  const [settings, setSettings] = useState({
    name: data.restaurant.name,
    phone: data.restaurant.phone || '',
    address: data.restaurant.address || '',
    formattedAddress: data.restaurant.formattedAddress || '',
    cuisine: data.restaurant.cuisine.join(', '),
    operationalStatus: data.restaurant.operationalStatus,
    operatingHours: data.restaurant.operatingHours || defaultHours(),
  });

  const restaurantId = data.restaurant._id || data.restaurant.id;
  const analyticsEnabled = Boolean(data.plan?.limits?.analyticsAccess);

  useEffect(() => {
    if (!analyticsEnabled) return;
    restaurantDashboardService.getAnalytics(from, to)
      .then((response) => { setAnalytics(response.analytics); setAnalyticsError(''); })
      .catch((error: unknown) => setAnalyticsError(error instanceof Error ? error.message : 'Analytics unavailable.'));
  }, [analyticsEnabled, from, to]);

  const resetMenu = () => {
    setEditingId(null);
    setMenu({ title: '', type: 'veg', price: 0, description: '', isAvailable: true });
  };

  const saveMenu = async () => {
    try {
      if (!menu.title.trim()) throw new Error('Enter an item name.');
      if (editingId) await restaurantDashboardService.updateMenuItem(editingId, menu);
      else await restaurantDashboardService.addMenuItem(restaurantId, menu);
      setMessage(editingId ? 'Menu item updated.' : 'Menu item added.');
      resetMenu();
      await onRefresh();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Unable to save menu item.');
    }
  };

  const startEdit = (item: DashboardResponse['menuItems'][number]) => {
    setEditingId(item._id);
    setMenu({ title: item.title, type: item.type, price: item.price, description: item.description || '', isAvailable: item.isAvailable !== false });
  };

  const removeMenu = async (id: string) => {
    if (!window.confirm('Delete this menu item?')) return;
    try {
      await restaurantDashboardService.deleteMenuItem(id);
      setMessage('Menu item deleted.');
      await onRefresh();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete menu item.');
    }
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
      const items: MenuItemInput[] = rows.map((row) => ({
        title: String(row.title || row.name || '').trim(),
        type: String(row.type || 'other').toLowerCase() as MenuItemInput['type'],
        price: Number(row.price),
        description: String(row.description || ''),
        isAvailable: !['false', 'no', '0'].includes(String(row.isAvailable ?? 'true').toLowerCase()),
      }));
      await restaurantDashboardService.importMenuItems(items);
      setMessage(`${items.length} items imported from ${file.name}.`);
      await onRefresh();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Unable to import this file.');
    }
  };

  const saveSettings = async () => {
    try {
      const response = await restaurantDashboardService.updateSettings({
        ...settings,
        cuisine: settings.cuisine.split(',').map((value) => value.trim()).filter(Boolean),
      });
      onRestaurantUpdated(response.restaurant);
      setMessage('Restaurant settings saved.');
      await onRefresh();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Unable to save settings.');
    }
  };

  const changeOperationalStatus = async (operationalStatus: Restaurant['operationalStatus']) => {
    const nextSettings = { ...settings, operationalStatus };
    setSettings(nextSettings);
    // Reflect the selection immediately, then replace it with the canonical
    // restaurant returned by the server when persistence completes.
    onRestaurantUpdated({ ...data.restaurant, operationalStatus });
    try {
      const response = await restaurantDashboardService.updateSettings({
        ...nextSettings,
        cuisine: nextSettings.cuisine.split(',').map((value) => value.trim()).filter(Boolean),
      });
      onRestaurantUpdated(response.restaurant);
      setMessage(`Store status changed to ${operationalStatus.toLowerCase().replace(/_/g, ' ')}.`);
    } catch (error: unknown) {
      setSettings(settings);
      onRestaurantUpdated(data.restaurant);
      setMessage(error instanceof Error ? error.message : 'Unable to change store status.');
    }
  };

  return (
    <>
      {message && <div style={{ margin: '20px 0', padding: '12px 14px', background: '#FFF', border: '1px solid #CBD5E1', borderRadius: '10px', color: '#334155' }}>{message}</div>}

      <section style={sectionStyle}>
        <h3 style={{ margin: '0 0 16px' }}>Menu management</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
          <input style={inputStyle} placeholder="Item name" value={menu.title} onChange={(event) => setMenu({ ...menu, title: event.target.value })} />
          <select style={inputStyle} value={menu.type} onChange={(event) => setMenu({ ...menu, type: event.target.value as MenuItemInput['type'] })}>
            <option value="veg">Veg</option><option value="non-veg">Non-veg</option><option value="beverage">Beverage</option><option value="dessert">Dessert</option><option value="other">Other</option>
          </select>
          <input style={inputStyle} type="number" min="0" placeholder="Price" value={menu.price} onChange={(event) => setMenu({ ...menu, price: Number(event.target.value) })} />
          <input style={{ ...inputStyle, gridColumn: 'span 2' }} placeholder="Description" value={menu.description} onChange={(event) => setMenu({ ...menu, description: event.target.value })} />
          <label style={{ fontSize: '13px', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={menu.isAvailable} onChange={(event) => setMenu({ ...menu, isAvailable: event.target.checked })} /> Available</label>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
          <button style={actionStyle} onClick={saveMenu}>{editingId ? 'Save item' : 'Add item'}</button>
          {editingId && <button style={{ ...actionStyle, background: '#E2E8F0', color: '#334155' }} onClick={resetMenu}>Cancel edit</button>}
          <label style={{ ...actionStyle, background: '#047857' }}>Import CSV/XLSX<input hidden type="file" accept=".csv,.xlsx,.xls" onChange={(event) => void importFile(event.target.files?.[0])} /></label>
          <a href="/menu-import-template.csv" download style={{ ...actionStyle, background: '#E2E8F0', color: '#334155', textDecoration: 'none' }}>Download template</a>
          <span style={{ fontSize: '12px', color: '#64748B', alignSelf: 'center' }}>Columns: title, type, price, description, isAvailable</span>
        </div>
        <div style={{ marginTop: '18px', display: 'grid', gap: '8px' }}>
          {data.menuItems.map((item) => (
            <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '11px', background: '#F8FAFC', color: '#334155', borderRadius: '9px' }}>
              <span><strong style={{ color: '#0F172A' }}>{item.title}</strong> · ₹{item.price} · {item.isAvailable === false ? 'Unavailable' : 'Available'}</span>
              <span style={{ display: 'flex', gap: '6px' }}><button style={smallButtonStyle} onClick={() => startEdit(item)}>Edit</button><button style={{ ...smallButtonStyle, color: '#B91C1C', borderColor: '#FCA5A5' }} onClick={() => void removeMenu(item._id)}>Delete</button></span>
            </div>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>Basic analytics</h3>
          <div style={{ display: 'flex', gap: '8px' }}><input type="date" style={inputStyle} value={from} max={to} onChange={(event) => setFrom(event.target.value)} /><input type="date" style={inputStyle} value={to} min={from} max={today} onChange={(event) => setTo(event.target.value)} /></div>
        </div>
        {!analyticsEnabled ? <p style={{ color: '#64748B' }}>Analytics requires Growth or Pro.</p> : analyticsError ? <p style={{ color: '#B91C1C' }}>{analyticsError}</p> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '18px' }}>
              <Metric label="Orders" value={analytics?.orderCount || 0} /><Metric label="Delivered" value={analytics?.deliveredOrders || 0} /><Metric label="Revenue" value={`₹${analytics?.revenue || 0}`} />
            </div>
            <h4>Popular items</h4>
            {analytics?.popularItems.length ? analytics.popularItems.map((item) => <p key={item.menuItemId} style={{ margin: '7px 0' }}>{item.title} — {item.quantity} sold</p>) : <p style={{ color: '#64748B' }}>No delivered orders in this date range.</p>}
          </>
        )}
      </section>

      <section style={sectionStyle}>
        <h3 style={{ margin: '0 0 16px' }}>Restaurant settings</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <input style={inputStyle} value={settings.name} placeholder="Restaurant name" onChange={(event) => setSettings({ ...settings, name: event.target.value })} />
          <input style={inputStyle} value={settings.phone} placeholder="Phone" onChange={(event) => setSettings({ ...settings, phone: event.target.value })} />
          <input style={{ ...inputStyle, gridColumn: 'span 2' }} value={settings.formattedAddress} placeholder="Address" onChange={(event) => setSettings({ ...settings, address: event.target.value, formattedAddress: event.target.value })} />
          <input style={{ ...inputStyle, gridColumn: 'span 2' }} value={settings.cuisine} placeholder="Cuisines, separated by commas" onChange={(event) => setSettings({ ...settings, cuisine: event.target.value })} />
          <select style={inputStyle} value={settings.operationalStatus} onChange={(event) => void changeOperationalStatus(event.target.value as Restaurant['operationalStatus'])}><option value="OPEN">Open</option><option value="CLOSED">Closed</option><option value="BUSY">Busy</option><option value="TEMPORARILY_UNAVAILABLE">Temporarily unavailable</option></select>
        </div>
        <h4>Operating hours</h4>
        <div style={{ display: 'grid', gap: '8px' }}>{DAYS.map((day) => { const schedule = settings.operatingHours[day]; return <div key={day} style={{ display: 'grid', gridTemplateColumns: '120px 90px 130px 130px', alignItems: 'center', gap: '8px', color: '#334155' }}><strong style={{ color: '#0F172A', textTransform: 'capitalize' }}>{day}</strong><label style={{ color: '#334155' }}><input type="checkbox" checked={schedule.isOpen} onChange={(event) => setSettings({ ...settings, operatingHours: { ...settings.operatingHours, [day]: { ...schedule, isOpen: event.target.checked } } })} /> Open</label><input style={inputStyle} type="time" disabled={!schedule.isOpen} value={schedule.openTime} onChange={(event) => setSettings({ ...settings, operatingHours: { ...settings.operatingHours, [day]: { ...schedule, openTime: event.target.value } } })} /><input style={inputStyle} type="time" disabled={!schedule.isOpen} value={schedule.closeTime} onChange={(event) => setSettings({ ...settings, operatingHours: { ...settings.operatingHours, [day]: { ...schedule, closeTime: event.target.value } } })} /></div>; })}</div>
        <button style={{ ...actionStyle, marginTop: '16px' }} onClick={saveSettings}>Save settings</button>
      </section>
    </>
  );
};

const Metric = ({ label, value }: { label: string; value: string | number }) => <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px' }}><div style={{ color: '#64748B', fontSize: '12px' }}>{label}</div><strong style={{ fontSize: '24px' }}>{value}</strong></div>;
