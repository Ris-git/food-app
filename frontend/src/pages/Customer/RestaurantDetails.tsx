import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePersistentCart } from '../../features/cart/usePersistentCart';
import { discoveryService, type PublicMenuItem, type PublicRestaurant, type PublicReview } from '../../features/discovery/services/discoveryService';

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
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [error, setError] = useState('');
  const [menuSearch, setMenuSearch] = useState('');
  const [dietary, setDietary] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [addedMessage, setAddedMessage] = useState('');
  const [replaceItem, setReplaceItem] = useState<PublicMenuItem | null>(null);
  const cart = usePersistentCart(restaurantId, restaurant?.name || 'Restaurant');

  useEffect(() => {
    let coordinates: { latitude: number; longitude: number } | null = null;
    try {
      const stored = sessionStorage.getItem('foodyCoordinates');
      coordinates = stored ? JSON.parse(stored) : null;
    } catch { coordinates = null; }
    const load = () => Promise.all([
      discoveryService.restaurant(restaurantId, coordinates),
      discoveryService.menu(restaurantId),
      discoveryService.reviews(restaurantId).catch(() => ({ success: true, reviews: [] })),
    ]).then(([restaurantResponse, menuResponse, reviewResponse]) => {
      setRestaurant(restaurantResponse.restaurant);
      setMenu(menuResponse.menuItems);
      setReviews(reviewResponse.reviews);
      setError('');
    }).catch((reason: Error) => setError(reason.message));
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, [restaurantId]);

  useEffect(() => {
    if (!addedMessage) return;
    const timer = window.setTimeout(() => setAddedMessage(''), 2500);
    return () => window.clearTimeout(timer);
  }, [addedMessage]);

  const filteredMenu = useMemo(() => menu.filter((item) => {
    const matchesSearch = !menuSearch || `${item.title} ${item.description || ''}`.toLowerCase().includes(menuSearch.toLowerCase());
    return matchesSearch && (dietary === 'all' || item.type === dietary);
  }).sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable)), [menu, menuSearch, dietary]);
  const groups = useMemo(() => filteredMenu.reduce<Record<string, PublicMenuItem[]>>((result, item) => {
    (result[item.type] ||= []).push(item);
    return result;
  }, {}), [filteredMenu]);
  const today = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' }).format(new Date()).toLowerCase();
  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const selectedQuantity = (itemId: string) => selectedQuantities[itemId] || 1;
  const changeSelectedQuantity = (itemId: string, delta: number) => setSelectedQuantities((current) => ({ ...current, [itemId]: Math.max(1, Math.min(20, (current[itemId] || 1) + delta)) }));
  const addConfirmedItem = (item: PublicMenuItem, replace = false) => {
    if (cart.hasDifferentRestaurant && !replace) return setReplaceItem(item);
    const quantity = selectedQuantity(item._id);
    cart.addItem(item, quantity, replace);
    setReplaceItem(null);
    setSelectedQuantities((current) => ({ ...current, [item._id]: 1 }));
    setAddedMessage(`${quantity} × ${item.title} added to your cart.`);
  };

  if (error) return <main className="customer-page"><div className="state-card error">{error}</div></main>;
  if (!restaurant) return <main className="customer-page"><div className="state-card">Loading restaurant…</div></main>;

  return <main className="customer-page detail-page">
    <Link to="/restaurants" className="back-link">← Back to restaurants</Link>
    <section className="restaurant-banner">
      <div className="restaurant-monogram">{restaurant.logoUrl ? <img src={restaurant.logoUrl} alt={`${restaurant.name} logo`} /> : restaurant.name.charAt(0)}</div>
      <div className="restaurant-banner-content"><p className="eyebrow">{restaurant.isDemo ? 'FOODY DEMO RESTAURANT' : 'APPROVED FOODY PARTNER'}</p><h1>{restaurant.name}</h1><p>{restaurant.cuisines.join(' · ') || 'Multi-cuisine'}</p><p>{restaurant.address}</p><div className="detail-facts"><span>{restaurant.rating ? `★ ${restaurant.rating} from ${restaurant.reviewCount} review${restaurant.reviewCount === 1 ? '' : 's'}` : 'New · No reviews yet'}</span><span>About {restaurant.estimatedDeliveryMinutes} min</span>{restaurant.priceRange && <span>{restaurant.priceRange} price range</span>}</div><span className={`detail-status ${restaurant.isOpenNow ? 'open' : ''}`}>{restaurant.isOpenNow ? 'OPEN NOW' : 'CLOSED NOW'}</span></div>
    </section>

    <div className="restaurant-information-grid">
      <section className="info-card"><p className="eyebrow">DELIVERY</p><h2>Delivery information</h2><dl><div><dt>Estimated time</dt><dd>{restaurant.estimatedDeliveryMinutes} minutes</dd></div><div><dt>Distance</dt><dd>{restaurant.distanceKm !== null ? `${restaurant.distanceKm} km` : 'Choose your location to calculate'}</dd></div><div><dt>Availability</dt><dd>{restaurant.isOpenNow ? 'Accepting orders' : 'Not accepting orders'}</dd></div></dl></section>
      <section className="info-card"><p className="eyebrow">LOCATION</p><h2>Restaurant address</h2><p>{restaurant.address}</p></section>
      <section className="info-card hours-card"><p className="eyebrow">HOURS</p><h2>Opening hours</h2><dl>{dayOrder.map((day) => { const schedule = restaurant.operatingHours?.[day]; return <div className={today === day ? 'today' : ''} key={day}><dt>{day.charAt(0).toUpperCase() + day.slice(1)}{today === day ? ' · Today' : ''}</dt><dd>{schedule?.isOpen ? schedule.openTime === '00:00' && schedule.closeTime === '00:00' ? 'Open 24 hours' : `${formatTime(schedule.openTime)}–${formatTime(schedule.closeTime)}` : 'Closed'}</dd></div>; })}</dl></section>
    </div>

    <section className="menu-browse-tools">
      <div><p className="eyebrow">MENU</p><h2>Choose something delicious</h2></div>
      <input aria-label="Search this menu" placeholder="Search this menu" value={menuSearch} onChange={(event) => setMenuSearch(event.target.value)} />
      <div className="menu-dietary-filters"><button className={dietary === 'all' ? 'active' : ''} onClick={() => setDietary('all')}>All</button><button className={dietary === 'veg' ? 'active' : ''} onClick={() => setDietary('veg')}>Veg</button><button className={dietary === 'non-veg' ? 'active' : ''} onClick={() => setDietary('non-veg')}>Non-veg</button></div>
    </section>

    <div className="menu-cart-layout">
      <section className="menu-shell">
        <nav className="menu-category-nav" aria-label="Menu categories">{Object.keys(groups).map((type) => <a href={`#menu-${type}`} key={type}>{menuLabels[type] || type}</a>)}</nav>
        {Object.entries(groups).map(([type, items]) => <div key={type} id={`menu-${type}`} className="menu-group"><h3>{menuLabels[type] || type.replace('-', ' ')}</h3><div className="menu-grid">{items.map((item) => {
          const unavailable = !item.isAvailable || !restaurant.isOpenNow;
          const quantity = selectedQuantity(item._id);
          return <article className={`menu-item ${!item.isAvailable ? 'unavailable' : ''}`} key={item._id}>
            {item.imageUrl && <img className="menu-item-image" src={item.imageUrl} alt="" />}
            <div className="menu-item-copy"><span className={`food-dot ${item.type === 'non-veg' ? 'nonveg' : ''}`}></span><h4>{item.title}</h4><strong>₹{item.price}</strong><p>{item.description || 'Freshly prepared by the restaurant.'}</p>{!item.isAvailable && <small>Currently unavailable</small>}</div>
            <div className="menu-item-action"><div className="selection-quantity"><button disabled={unavailable || quantity === 1} onClick={() => changeSelectedQuantity(item._id, -1)} aria-label={`Decrease selected ${item.title}`}>−</button><b>{quantity}</b><button disabled={unavailable || quantity === 20} onClick={() => changeSelectedQuantity(item._id, 1)} aria-label={`Increase selected ${item.title}`}>+</button></div><button className="add-to-cart" disabled={unavailable} onClick={() => addConfirmedItem(item)}>{!item.isAvailable ? 'Unavailable' : restaurant.isOpenNow ? 'Add to cart' : 'Closed'}</button></div>
          </article>;
        })}</div></div>)}
        {!Object.keys(groups).length && <div className="state-card">No menu items match your search.</div>}
      </section>

      <aside className="cart-panel"><p className="eyebrow">YOUR CART</p><h2>{cartCount ? `${cartCount} item${cartCount === 1 ? '' : 's'}` : 'Your cart is empty'}</h2>
        {cart.items.length ? <><div className="cart-items">{cart.items.map((item) => <div className="cart-row" key={item._id}><div><strong>{item.title}</strong><small>₹{item.price * item.quantity}</small></div><div className="cart-controls"><button onClick={() => cart.changeQuantity(item._id, -1)}>−</button><b>{item.quantity}</b><button onClick={() => cart.changeQuantity(item._id, 1)}>+</button><button className="remove-cart-item" onClick={() => cart.removeItem(item._id)}>Remove</button></div></div>)}</div><div className="cart-subtotal"><span>Subtotal</span><strong>₹{cart.subtotal}</strong></div><Link className="primary-action-link" to="/cart">View cart</Link></> : <p>Choose a quantity, then press Add to cart.</p>}
      </aside>
    </div>

    <section className="reviews-section"><div className="section-heading"><div><p className="eyebrow">REVIEWS</p><h2>What customers say</h2></div></div>{reviews.length ? <div className="review-grid">{reviews.map((review) => <article key={review.id}><strong>{'★'.repeat(review.rating)}</strong><p>{review.comment || 'Rated this restaurant.'}</p><small>{review.customerName} · {new Date(review.createdAt).toLocaleDateString()}</small></article>)}</div> : <div className="state-card">No reviews yet. Be the first customer to order.</div>}</section>

    {cartCount > 0 && <Link className="floating-cart-bar" to="/cart"><span>{cartCount} item{cartCount === 1 ? '' : 's'} · ₹{cart.subtotal}</span><strong>View cart →</strong></Link>}
    {addedMessage && <div className="cart-toast" role="status">{addedMessage}</div>}
    {replaceItem && <div className="dialog-backdrop" role="presentation"><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="replace-cart-title"><h2 id="replace-cart-title">Start a new cart?</h2><p>Your current cart is from {cart.cart?.restaurantName}. Adding this item will clear it.</p><div><button onClick={() => setReplaceItem(null)}>Keep current cart</button><button className="danger-action" onClick={() => addConfirmedItem(replaceItem, true)}>Clear and add</button></div></div></div>}
  </main>;
}
