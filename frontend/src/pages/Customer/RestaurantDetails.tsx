import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePersistentCart } from '../../features/cart/usePersistentCart';
import { discoveryService, type PublicMenuItem, type PublicRestaurant } from '../../features/discovery/services/discoveryService';

const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const menuLabels: Record<string, string> = { veg: 'Vegetarian', 'non-veg': 'Non-vegetarian', beverage: 'Beverages', dessert: 'Desserts', other: 'Other dishes' };

const formatTime = (value: string) => {
  const [hour, minute] = value.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
};

export default function RestaurantDetails() {
  const { restaurantId = '' } = useParams();
  const [restaurant, setRestaurant] = useState<PublicRestaurant | null>(null);
  const [menu, setMenu] = useState<PublicMenuItem[]>([]);
  const [error, setError] = useState('');
  const cart = usePersistentCart(restaurantId, restaurant?.name || 'Restaurant');

  useEffect(() => {
    let coordinates: { latitude: number; longitude: number } | null = null;
    try {
      const stored = sessionStorage.getItem('foodyCoordinates');
      coordinates = stored ? JSON.parse(stored) : null;
    } catch {
      coordinates = null;
    }
    const load = () => Promise.all([discoveryService.restaurant(restaurantId, coordinates), discoveryService.menu(restaurantId)])
      .then(([restaurantResponse, menuResponse]) => { setRestaurant(restaurantResponse.restaurant); setMenu(menuResponse.menuItems); setError(''); })
      .catch((reason: Error) => setError(reason.message));
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, [restaurantId]);

  const groups = useMemo(() => menu.reduce<Record<string, PublicMenuItem[]>>((result, item) => {
    (result[item.type] ||= []).push(item);
    return result;
  }, {}), [menu]);
  const today = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' }).format(new Date()).toLowerCase();
  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  if (error) return <main className="customer-page"><div className="state-card error">{error}</div></main>;
  if (!restaurant) return <main className="customer-page"><div className="state-card">Loading restaurant…</div></main>;

  return <main className="customer-page detail-page">
    <Link to="/restaurants" className="back-link">← Back to restaurants</Link>
    <section className="restaurant-banner">
      <div className="restaurant-monogram">{restaurant.logoUrl ? <img src={restaurant.logoUrl} alt={`${restaurant.name} logo`} /> : restaurant.name.charAt(0)}</div>
      <div className="restaurant-banner-content"><p className="eyebrow">APPROVED FOODY PARTNER</p><h1>{restaurant.name}</h1><p>{restaurant.cuisines.join(' · ') || 'Multi-cuisine'}</p><p>{restaurant.address}</p><div className="detail-facts"><span>{restaurant.rating ? `★ ${restaurant.rating} from ${restaurant.reviewCount} review${restaurant.reviewCount === 1 ? '' : 's'}` : 'New · No reviews yet'}</span><span>About {restaurant.estimatedDeliveryMinutes} min</span>{restaurant.priceRange && <span>{restaurant.priceRange} price range</span>}</div><span className={`detail-status ${restaurant.isOpenNow ? 'open' : ''}`}>{restaurant.isOpenNow ? 'OPEN NOW' : 'CLOSED NOW'}</span></div>
    </section>

    <div className="restaurant-information-grid">
      <section className="info-card"><p className="eyebrow">DELIVERY</p><h2>Delivery information</h2><dl><div><dt>Estimated time</dt><dd>{restaurant.estimatedDeliveryMinutes} minutes</dd></div><div><dt>Distance</dt><dd>{restaurant.distanceKm !== null ? `${restaurant.distanceKm} km` : 'Choose your location to calculate'}</dd></div><div><dt>Availability</dt><dd>{restaurant.isOpenNow ? 'Accepting orders' : 'Not accepting orders'}</dd></div></dl></section>
      <section className="info-card"><p className="eyebrow">LOCATION</p><h2>Restaurant address</h2><p>{restaurant.address}</p></section>
      <section className="info-card hours-card"><p className="eyebrow">HOURS</p><h2>Opening hours</h2><dl>{dayOrder.map((day) => { const schedule = restaurant.operatingHours?.[day]; return <div className={today === day ? 'today' : ''} key={day}><dt>{day.charAt(0).toUpperCase() + day.slice(1)}{today === day ? ' · Today' : ''}</dt><dd>{schedule?.isOpen ? `${formatTime(schedule.openTime)}–${formatTime(schedule.closeTime)}` : 'Closed'}</dd></div>; })}</dl></section>
    </div>

    <div className="menu-cart-layout">
      <section className="menu-shell"><div className="section-heading"><div><p className="eyebrow">MENU</p><h2>Choose something delicious</h2></div></div>
        <nav className="menu-category-nav" aria-label="Menu categories">{Object.keys(groups).map((type) => <a href={`#menu-${type}`} key={type}>{menuLabels[type] || type}</a>)}</nav>
        {Object.entries(groups).map(([type, items]) => <div key={type} id={`menu-${type}`} className="menu-group"><h3>{menuLabels[type] || type.replace('-', ' ')}</h3><div className="menu-grid">{items.map((item) => {
          const unavailable = !item.isAvailable || !restaurant.isOpenNow;
          const quantity = cart.items.find((cartItem) => cartItem._id === item._id)?.quantity || 0;
          return <article className={`menu-item ${!item.isAvailable ? 'unavailable' : ''}`} key={item._id}><div><span className={`food-dot ${item.type === 'non-veg' ? 'nonveg' : ''}`}></span><h4>{item.title}</h4><strong>₹{item.price}</strong><p>{item.description || 'Freshly prepared by the restaurant.'}</p>{!item.isAvailable && <small>Currently unavailable</small>}</div>{quantity ? <div className="inline-quantity"><button onClick={() => cart.changeQuantity(item._id, -1)} aria-label={`Remove one ${item.title}`}>−</button><b>{quantity}</b><button disabled={unavailable} onClick={() => cart.changeQuantity(item._id, 1)} aria-label={`Add one ${item.title}`}>+</button></div> : <button disabled={unavailable} onClick={() => cart.addItem(item)}>{!item.isAvailable ? 'Unavailable' : restaurant.isOpenNow ? 'Add' : 'Closed'}</button>}</article>;
        })}</div></div>)}
        {!Object.keys(groups).length && <div className="state-card">No menu items yet.</div>}
      </section>

      <aside className="cart-panel"><p className="eyebrow">YOUR CART</p><h2>{cartCount ? `${cartCount} item${cartCount === 1 ? '' : 's'}` : 'Your cart is empty'}</h2>
        {cart.items.length ? <><div className="cart-items">{cart.items.map((item) => <div className="cart-row" key={item._id}><div><strong>{item.title}</strong><small>₹{item.price * item.quantity}</small></div><div className="cart-controls"><button onClick={() => cart.changeQuantity(item._id, -1)}>−</button><b>{item.quantity}</b><button onClick={() => cart.changeQuantity(item._id, 1)}>+</button><button className="remove-cart-item" onClick={() => cart.removeItem(item._id)}>Remove</button></div></div>)}</div><div className="cart-subtotal"><span>Subtotal</span><strong>₹{cart.subtotal}</strong></div><p className="cart-note">Taxes and delivery charges are calculated at checkout.</p></> : <p>Add a menu item to begin your order.</p>}
      </aside>
    </div>
  </main>;
}
