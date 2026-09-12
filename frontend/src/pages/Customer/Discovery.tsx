import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { discoveryService, type DiscoveryCategory, type PublicRestaurant } from '../../features/discovery/services/discoveryService';

const fallbackCategories: DiscoveryCategory[] = [
  { slug: 'biryani', name: 'Biryani' },
  { slug: 'north-indian', name: 'North Indian' },
  { slug: 'pizza', name: 'Pizza' },
  { slug: 'healthy', name: 'Healthy' },
  { slug: 'desserts', name: 'Desserts' },
];

export default function Discovery({ landing = false }: { landing?: boolean }) {
  const navigate = useNavigate();
  const route = useLocation();
  const [params] = useSearchParams();
  const [location, setLocation] = useState(params.get('location') || localStorage.getItem('deliveryLocation') || '');
  const [search, setSearch] = useState(params.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(params.get('category') || '');
  const [openNow, setOpenNow] = useState(params.get('openNow') === 'true');
  const [dietary, setDietary] = useState(params.get('dietary') || '');
  const [minimumRating, setMinimumRating] = useState(Number(params.get('minimumRating') || 0));
  const [priceLevel, setPriceLevel] = useState(Number(params.get('priceLevel') || 0));
  const [sort, setSort] = useState(params.get('sort') || 'newest');
  const [radiusKm, setRadiusKm] = useState(Number(params.get('radiusKm') || 10));
  const [locating, setLocating] = useState(false);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(() => {
    try {
      const stored = sessionStorage.getItem('foodyCoordinates');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [restaurants, setRestaurants] = useState<PublicRestaurant[]>([]);
  const [categories, setCategories] = useState<DiscoveryCategory[]>(fallbackCategories);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const featuredCategories = fallbackCategories;
  const activeCategoryName = fallbackCategories.find((category) => category.slug === selectedCategory)?.name
    || categories.find((category) => category.slug === selectedCategory)?.name || selectedCategory;
  const advancedCount = Number(priceLevel > 0) + Number(minimumRating > 0) + Number(Boolean(coordinates && radiusKm !== 10));
  const activeFilterCount = Number(Boolean(location)) + Number(Boolean(search)) + Number(Boolean(selectedCategory))
    + Number(openNow) + Number(Boolean(dietary)) + advancedCount + Number(sort !== 'newest');
  const hasRatings = restaurants.some((restaurant) => restaurant.reviewCount > 0);

  useEffect(() => {
    discoveryService.categories().then((response) => setCategories(response.categories)).catch(() => setCategories(fallbackCategories));
  }, []);
  useEffect(() => {
    let active = true;
    const load = () => discoveryService.restaurants({
      location, search,
      category: selectedCategory === 'pizza' || selectedCategory === 'healthy' ? undefined : selectedCategory,
      cuisine: selectedCategory === 'pizza' ? 'Pizza' : selectedCategory === 'healthy' ? 'Healthy' : undefined,
      openNow, dietary, minimumRating, priceLevel, sort,
      latitude: coordinates?.latitude, longitude: coordinates?.longitude, radiusKm: coordinates ? radiusKm : undefined,
    })
      .then((response) => { if (active) { setRestaurants(response.restaurants); setError(''); } })
      .catch((reason: Error) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [location, search, selectedCategory, openNow, dietary, minimumRating, priceLevel, sort, coordinates, radiusKm]);

  useEffect(() => {
    if (route.pathname !== '/restaurants') return;
    const next = new URLSearchParams();
    if (location) next.set('location', location);
    if (search) next.set('search', search);
    if (selectedCategory) next.set('category', selectedCategory);
    if (openNow) next.set('openNow', 'true');
    if (dietary) next.set('dietary', dietary);
    if (minimumRating) next.set('minimumRating', String(minimumRating));
    if (priceLevel) next.set('priceLevel', String(priceLevel));
    if (coordinates) next.set('radiusKm', String(radiusKm));
    if (sort !== 'newest') next.set('sort', sort);
    const searchString = next.toString() ? `?${next}` : '';
    if (route.search !== searchString) navigate(`/restaurants${searchString}`, { replace: true });
  }, [route.pathname, route.search, navigate, location, search, selectedCategory, openNow, dietary, minimumRating, priceLevel, radiusKm, coordinates, sort]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return setError('Location is not supported by this browser.');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nextCoordinates = { latitude: coords.latitude, longitude: coords.longitude };
        setLocation('');
        localStorage.removeItem('deliveryLocation');
        setCoordinates(nextCoordinates);
        sessionStorage.setItem('foodyCoordinates', JSON.stringify(nextCoordinates));
        setSort('distance');
        setLocating(false);
        setError('');
      },
      () => { setLocating(false); setError('Foody could not access your current location.'); },
    );
  };

  const clearCurrentLocation = () => {
    setCoordinates(null);
    sessionStorage.removeItem('foodyCoordinates');
    if (sort === 'distance') setSort('newest');
  };

  const clearArea = () => {
    setLocation('');
    localStorage.removeItem('deliveryLocation');
  };

  const clearFilters = () => {
    setLocation('');
    setSearch('');
    setSelectedCategory('');
    setOpenNow(false);
    setDietary('');
    setMinimumRating(0);
    setPriceLevel(0);
    setRadiusKm(10);
    setSort('newest');
    setCoordinates(null);
    sessionStorage.removeItem('foodyCoordinates');
    localStorage.removeItem('deliveryLocation');
    navigate(landing ? '/' : '/restaurants', { replace: true });
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
    if (coordinates) next.set('radiusKm', String(radiusKm));
    if (sort !== 'newest') next.set('sort', sort);
    navigate(`/restaurants?${next}`);
  };

  return <main className="customer-page">
    {landing && <section className="customer-hero">
      <p className="eyebrow">FOOD FROM RESTAURANTS YOU CAN TRUST</p>
      <h1>Good food is closer than you think.</h1>
      <p>Choose your area and discover approved Foody restaurants near you.</p>
      <form className="discovery-search" onSubmit={submit}>
        <input aria-label="Delivery location" placeholder="Enter area or city" value={location} onChange={(event) => { setLocation(event.target.value); clearCurrentLocation(); }} />
        <input aria-label="Search restaurants or dishes" placeholder="Search restaurant, cuisine or dish" value={search} onChange={(event) => setSearch(event.target.value)} />
        <button>Find food</button>
      </form>
      <div className="location-actions">
        <button type="button" className="location-button" onClick={useCurrentLocation} disabled={locating}>{locating ? 'Finding your location…' : coordinates ? 'Refresh current location' : 'Use my current location'}</button>
        {coordinates && <><span>Showing restaurants within {radiusKm} km</span><button type="button" className="location-button" onClick={clearCurrentLocation}>Clear location</button></>}
      </div>
    </section>}

    <section className="discovery-section">
      <div className="section-heading"><div><p className="eyebrow">EXPLORE</p><h2>What are you craving?</h2></div>{!landing && <form onSubmit={submit} className="compact-search"><input aria-label="Area or city" placeholder="Area or city" value={location} onChange={(event) => { setLocation(event.target.value); clearCurrentLocation(); }} /><input aria-label="Search restaurant, cuisine or dish" placeholder="Restaurant, cuisine or dish" value={search} onChange={(event) => setSearch(event.target.value)} /><button>Search</button></form>}</div>
      {!landing && <div className="location-actions"><button type="button" className="location-button" onClick={useCurrentLocation} disabled={locating}>{locating ? 'Finding your location…' : coordinates ? 'Refresh current location' : 'Use my current location'}</button>{coordinates && <><span>Within {radiusKm} km</span><button type="button" className="location-button" onClick={clearCurrentLocation}>Clear location</button></>}</div>}
      <div className="cuisine-row">
        <button className={!selectedCategory ? 'active' : ''} onClick={() => setSelectedCategory('')}>All</button>
        {featuredCategories.map((category) => <button key={category.slug} className={selectedCategory === category.slug ? 'active' : ''} onClick={() => setSelectedCategory(category.slug)}>{category.name}</button>)}
      </div>
      <div className="discovery-filter-bar" aria-label="Restaurant filters">
        <button type="button" className={`quick-filter ${openNow ? 'active' : ''}`} aria-pressed={openNow} onClick={() => setOpenNow(!openNow)}>Open now</button>
        <button type="button" className={`quick-filter ${dietary === 'veg' ? 'active' : ''}`} aria-pressed={dietary === 'veg'} onClick={() => setDietary(dietary === 'veg' ? '' : 'veg')}>Veg only</button>
        <label className="quick-sort">Sort <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest</option><option value="rating">Top rated</option><option value="deliveryTime">Fastest delivery</option>{coordinates && <option value="distance">Nearest first</option>}</select></label>
        <button type="button" className={`quick-filter more-filters ${advancedOpen || advancedCount ? 'active' : ''}`} aria-expanded={advancedOpen} aria-controls="more-restaurant-filters" onClick={() => setAdvancedOpen(!advancedOpen)}>Filters{advancedCount ? ` (${advancedCount})` : ''} {advancedOpen ? '−' : '+'}</button>
      </div>
      {advancedOpen && <div className="advanced-filters" id="more-restaurant-filters">
        <label>Price<select value={priceLevel} onChange={(event) => setPriceLevel(Number(event.target.value))}><option value={0}>Any price</option><option value={1}>₹ Budget</option><option value={2}>₹₹ Moderate</option><option value={3}>₹₹₹ Premium</option></select></label>
        {(hasRatings || minimumRating > 0) && <label>Rating<select value={minimumRating} onChange={(event) => setMinimumRating(Number(event.target.value))}><option value={0}>Any rating</option><option value={4}>4+ stars</option><option value={3}>3+ stars</option></select></label>}
        {coordinates && <label>Distance<select value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))}><option value={5}>Within 5 km</option><option value={10}>Within 10 km</option><option value={25}>Within 25 km</option><option value={50}>Within 50 km</option></select></label>}
        {!hasRatings && !minimumRating && <p>Rating filters will appear when restaurants receive reviews.</p>}
        {!coordinates && <p>Use your current location to filter by distance.</p>}
      </div>}
    </section>

    <section className="discovery-section">
      <div className="section-heading"><div><p className="eyebrow">NEAR YOU</p><h2>{location ? `Restaurants around ${location}` : 'Approved restaurants on Foody'}</h2></div>{landing && <Link to="/restaurants">View all</Link>}</div>
      <div className="discovery-results-meta"><span>{loading ? 'Finding restaurants…' : `${restaurants.length} ${restaurants.length === 1 ? 'restaurant' : 'restaurants'} found`}</span>{activeFilterCount > 0 && <button type="button" onClick={clearFilters}>Reset all</button>}</div>
      {activeFilterCount > 0 && <div className="active-filter-row" aria-label="Applied filters">
        {location && <button type="button" onClick={clearArea}>Area: {location} ×</button>}
        {search && <button type="button" onClick={() => setSearch('')}>Search: {search} ×</button>}
        {selectedCategory && <button type="button" onClick={() => setSelectedCategory('')}>{activeCategoryName} ×</button>}
        {openNow && <button type="button" onClick={() => setOpenNow(false)}>Open now ×</button>}
        {dietary && <button type="button" onClick={() => setDietary('')}>{dietary === 'veg' ? 'Veg only' : 'Non-vegetarian'} ×</button>}
        {priceLevel > 0 && <button type="button" onClick={() => setPriceLevel(0)}>{'₹'.repeat(priceLevel)} price ×</button>}
        {minimumRating > 0 && <button type="button" onClick={() => setMinimumRating(0)}>{minimumRating}+ stars ×</button>}
        {coordinates && radiusKm !== 10 && <button type="button" onClick={() => setRadiusKm(10)}>Within {radiusKm} km ×</button>}
        {sort !== 'newest' && <button type="button" onClick={() => setSort('newest')}>Sort: {sort === 'rating' ? 'Top rated' : sort === 'distance' ? 'Nearest first' : 'Fastest delivery'} ×</button>}
      </div>}
      {error && <div className="state-card error">{error}</div>}
      {loading ? <div className="state-card">Finding restaurants…</div> : restaurants.length ? <div className="restaurant-grid">{restaurants.map((restaurant) => <Link className={`restaurant-card ${restaurant.isOpenNow ? '' : 'closed'}`} to={`/restaurants/${restaurant.id}`} key={restaurant.id}>
        <div className="restaurant-image">{restaurant.logoUrl ? <img src={restaurant.logoUrl} alt="" /> : <span>{restaurant.name.charAt(0)}</span>}<b className={`status ${restaurant.isOpenNow ? 'open' : ''}`}>{restaurant.operationalStatus.replaceAll('_', ' ')}</b></div>
        <div className="restaurant-card-body"><h3>{restaurant.name} {restaurant.isDemo && <span className="demo-badge">Demo</span>}</h3><p>{restaurant.cuisines.join(' · ') || 'Multi-cuisine'}</p><p className="address">{restaurant.address}</p><div className="restaurant-facts"><span>{restaurant.rating ? `★ ${restaurant.rating} (${restaurant.reviewCount})` : 'New'}</span><span>{restaurant.estimatedDeliveryMinutes} min</span>{restaurant.priceRange && <span>{restaurant.priceRange}</span>}{restaurant.distanceKm !== null && <span>{restaurant.distanceKm} km</span>}</div><div className="restaurant-meta"><span>{restaurant.isOpenNow ? 'Accepting orders' : 'Currently closed'}</span><span>View menu →</span></div></div>
      </Link>)}</div> : <div className="state-card">No approved restaurants match this search yet.</div>}
    </section>

  </main>;
}
