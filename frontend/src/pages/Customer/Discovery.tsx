import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { discoveryService, type DiscoveryCategory, type PublicRestaurant } from '../../features/discovery/services/discoveryService';

const fallbackCategories: DiscoveryCategory[] = [
  { slug: 'vegetarian', name: 'Vegetarian' },
  { slug: 'non-vegetarian', name: 'Non-Vegetarian' },
  { slug: 'biryani', name: 'Biryani' },
  { slug: 'north-indian', name: 'North Indian' },
  { slug: 'desserts', name: 'Desserts' },
  { slug: 'beverages', name: 'Beverages' },
  { slug: 'snacks', name: 'Snacks' },
];

export default function Discovery({ landing = false }: { landing?: boolean }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [location, setLocation] = useState(params.get('location') || localStorage.getItem('deliveryLocation') || '');
  const [search, setSearch] = useState(params.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(params.get('category') || '');
  const [openNow, setOpenNow] = useState(params.get('openNow') === 'true');
  const [dietary, setDietary] = useState(params.get('dietary') || '');
  const [minimumRating, setMinimumRating] = useState(Number(params.get('minimumRating') || 0));
  const [priceLevel, setPriceLevel] = useState(Number(params.get('priceLevel') || 0));
  const [sort, setSort] = useState(params.get('sort') || 'newest');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [restaurants, setRestaurants] = useState<PublicRestaurant[]>([]);
  const [categories, setCategories] = useState<DiscoveryCategory[]>(fallbackCategories);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    discoveryService.categories().then((response) => setCategories(response.categories)).catch(() => setCategories(fallbackCategories));
  }, []);
  useEffect(() => {
    const load = () => discoveryService.restaurants({ location, search, category: selectedCategory, openNow, dietary, minimumRating, priceLevel, sort, latitude: coordinates?.latitude, longitude: coordinates?.longitude })
      .then((response) => { setRestaurants(response.restaurants); setError(''); })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, [location, search, selectedCategory, openNow, dietary, minimumRating, priceLevel, sort, coordinates]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return setError('Location is not supported by this browser.');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setCoordinates({ latitude: coords.latitude, longitude: coords.longitude }); setError(''); },
      () => setError('Foody could not access your current location.'),
    );
  };

  const clearFilters = () => {
    setOpenNow(false);
    setDietary('');
    setMinimumRating(0);
    setPriceLevel(0);
    setSort('newest');
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    localStorage.setItem('deliveryLocation', location);
    const next = new URLSearchParams();
    if (location) next.set('location', location);
    if (search) next.set('search', search);
    if (selectedCategory) next.set('category', selectedCategory);
    if (openNow) next.set('openNow', 'true');
    if (dietary) next.set('dietary', dietary);
    if (minimumRating) next.set('minimumRating', String(minimumRating));
    if (priceLevel) next.set('priceLevel', String(priceLevel));
    if (sort !== 'newest') next.set('sort', sort);
    navigate(`/restaurants?${next}`);
  };

  return <main className="customer-page">
    {landing && <section className="customer-hero">
      <p className="eyebrow">FOOD FROM RESTAURANTS YOU CAN TRUST</p>
      <h1>Good food is closer than you think.</h1>
      <p>Choose your area and discover approved Foody restaurants near you.</p>
      <form className="discovery-search" onSubmit={submit}>
        <input aria-label="Delivery location" placeholder="Enter area or city" value={location} onChange={(event) => setLocation(event.target.value)} />
        <input aria-label="Search restaurants" placeholder="Search restaurant or cuisine" value={search} onChange={(event) => setSearch(event.target.value)} />
        <button>Find food</button>
      </form>
      <button type="button" className="location-button" onClick={useCurrentLocation}>Use my current location</button>
    </section>}

    <section className="discovery-section">
      <div className="section-heading"><div><p className="eyebrow">EXPLORE</p><h2>What are you craving?</h2></div>{!landing && <form onSubmit={submit} className="compact-search"><input placeholder="Area or city" value={location} onChange={(event) => setLocation(event.target.value)} /><input placeholder="Search" value={search} onChange={(event) => setSearch(event.target.value)} /><button>Search</button></form>}</div>
      <div className="cuisine-row">
        <button className={!selectedCategory ? 'active' : ''} onClick={() => setSelectedCategory('')}>All</button>
        {categories.map((category) => <button key={category.slug} className={selectedCategory === category.slug ? 'active' : ''} onClick={() => setSelectedCategory(category.slug)}>{category.name}</button>)}
      </div>
      <div className="discovery-filters" aria-label="Restaurant filters">
        <label className="filter-check"><input type="checkbox" checked={openNow} onChange={(event) => setOpenNow(event.target.checked)} /> Open now</label>
        <label>Food type<select value={dietary} onChange={(event) => setDietary(event.target.value)}><option value="">All</option><option value="veg">Vegetarian</option><option value="non-veg">Non-vegetarian</option></select></label>
        <label>Rating<select value={minimumRating} onChange={(event) => setMinimumRating(Number(event.target.value))}><option value={0}>Any rating</option><option value={4}>4+ stars</option><option value={3}>3+ stars</option></select></label>
        <label>Price<select value={priceLevel} onChange={(event) => setPriceLevel(Number(event.target.value))}><option value={0}>Any price</option><option value={1}>₹ Budget</option><option value={2}>₹₹ Moderate</option><option value={3}>₹₹₹ Premium</option></select></label>
        <label>Sort by<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest</option><option value="rating">Rating</option><option value="deliveryTime">Delivery time</option></select></label>
        <button type="button" className="clear-filters" onClick={clearFilters}>Clear filters</button>
      </div>
    </section>

    <section className="discovery-section">
      <div className="section-heading"><div><p className="eyebrow">NEAR YOU</p><h2>{location ? `Restaurants around ${location}` : 'Approved restaurants on Foody'}</h2></div>{landing && <Link to="/restaurants">View all</Link>}</div>
      {error && <div className="state-card error">{error}</div>}
      {loading ? <div className="state-card">Finding restaurants…</div> : restaurants.length ? <div className="restaurant-grid">{restaurants.map((restaurant) => <Link className={`restaurant-card ${restaurant.isOpenNow ? '' : 'closed'}`} to={`/restaurants/${restaurant.id}`} key={restaurant.id}>
        <div className="restaurant-image">{restaurant.logoUrl ? <img src={restaurant.logoUrl} alt="" /> : <span>{restaurant.name.charAt(0)}</span>}<b className={`status ${restaurant.isOpenNow ? 'open' : ''}`}>{restaurant.operationalStatus.replaceAll('_', ' ')}</b></div>
        <div className="restaurant-card-body"><h3>{restaurant.name}</h3><p>{restaurant.cuisines.join(' · ') || 'Multi-cuisine'}</p><p className="address">{restaurant.address}</p><div className="restaurant-facts"><span>{restaurant.rating ? `★ ${restaurant.rating} (${restaurant.reviewCount})` : 'New'}</span><span>{restaurant.estimatedDeliveryMinutes} min</span>{restaurant.priceRange && <span>{restaurant.priceRange}</span>}{restaurant.distanceKm !== null && <span>{restaurant.distanceKm} km</span>}</div><div className="restaurant-meta"><span>{restaurant.isOpenNow ? 'Accepting orders' : 'Currently closed'}</span><span>View menu →</span></div></div>
      </Link>)}</div> : <div className="state-card">No approved restaurants match this search yet.</div>}
    </section>

  </main>;
}
