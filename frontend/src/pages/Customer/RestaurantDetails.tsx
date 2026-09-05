import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { discoveryService, type PublicMenuItem, type PublicRestaurant } from '../../features/discovery/services/discoveryService';

export default function RestaurantDetails() {
  const { restaurantId = '' } = useParams();
  const [restaurant, setRestaurant] = useState<PublicRestaurant | null>(null);
  const [menu, setMenu] = useState<PublicMenuItem[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([discoveryService.restaurant(restaurantId), discoveryService.menu(restaurantId)])
      .then(([restaurantResponse, menuResponse]) => { setRestaurant(restaurantResponse.restaurant); setMenu(menuResponse.menuItems); })
      .catch((reason: Error) => setError(reason.message));
  }, [restaurantId]);
  const groups = useMemo(() => menu.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())).reduce<Record<string, PublicMenuItem[]>>((result, item) => { (result[item.type] ||= []).push(item); return result; }, {}), [menu, query]);
  if (error) return <main className="customer-page"><div className="state-card error">{error}</div></main>;
  if (!restaurant) return <main className="customer-page"><div className="state-card">Loading restaurant…</div></main>;
  return <main className="customer-page detail-page">
    <Link to="/restaurants" className="back-link">← Back to restaurants</Link>
    <section className="restaurant-banner"><div className="restaurant-monogram">{restaurant.name.charAt(0)}</div><div><p className="eyebrow">APPROVED FOODY PARTNER</p><h1>{restaurant.name}</h1><p>{restaurant.cuisines.join(' · ')}</p><p>{restaurant.address}</p><span className={`detail-status ${restaurant.operationalStatus === 'OPEN' ? 'open' : ''}`}>{restaurant.operationalStatus.replaceAll('_', ' ')}</span></div></section>
    <section className="menu-shell"><div className="section-heading"><div><p className="eyebrow">MENU</p><h2>Choose something delicious</h2></div><input className="menu-search" placeholder="Search this menu" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      {Object.entries(groups).map(([type, items]) => <div key={type} className="menu-group"><h3>{type.replace('-', ' ')}</h3><div className="menu-grid">{items.map((item) => <article className="menu-item" key={item._id}><div><span className={`food-dot ${item.type === 'non-veg' ? 'nonveg' : ''}`}></span><h4>{item.title}</h4><strong>₹{item.price}</strong><p>{item.description || 'Freshly prepared by the restaurant.'}</p></div><button disabled={restaurant.operationalStatus !== 'OPEN'}>{restaurant.operationalStatus === 'OPEN' ? 'Add' : 'Closed'}</button></article>)}</div></div>)}
      {!Object.keys(groups).length && <div className="state-card">No available menu items match your search.</div>}
    </section>
  </main>;
}
