import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { discoveryService, type PublicRestaurant } from '../../features/discovery/services/discoveryService';

const fallbackCuisines = ['Indian', 'Chinese', 'Pizza', 'Biryani', 'Dessert', 'Beverage'];

export default function Discovery({ landing = false }: { landing?: boolean }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [location, setLocation] = useState(params.get('location') || localStorage.getItem('deliveryLocation') || '');
  const [search, setSearch] = useState(params.get('search') || '');
  const [selectedCuisine, setSelectedCuisine] = useState(params.get('cuisine') || '');
  const [restaurants, setRestaurants] = useState<PublicRestaurant[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    discoveryService.cuisines().then((response) => setCuisines(response.cuisines)).catch(() => setCuisines([]));
  }, []);
  useEffect(() => {
    discoveryService.restaurants({ location, search, cuisine: selectedCuisine })
      .then((response) => { setRestaurants(response.restaurants); setError(''); })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [location, search, selectedCuisine]);

  const availableCuisines = useMemo(() => cuisines.length ? cuisines : fallbackCuisines, [cuisines]);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    localStorage.setItem('deliveryLocation', location);
    const next = new URLSearchParams();
    if (location) next.set('location', location);
    if (search) next.set('search', search);
    if (selectedCuisine) next.set('cuisine', selectedCuisine);
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
    </section>}

    <section className="discovery-section">
      <div className="section-heading"><div><p className="eyebrow">EXPLORE</p><h2>What are you craving?</h2></div>{!landing && <form onSubmit={submit} className="compact-search"><input placeholder="Area or city" value={location} onChange={(event) => setLocation(event.target.value)} /><input placeholder="Search" value={search} onChange={(event) => setSearch(event.target.value)} /><button>Search</button></form>}</div>
      <div className="cuisine-row">
        <button className={!selectedCuisine ? 'active' : ''} onClick={() => setSelectedCuisine('')}>All</button>
        {availableCuisines.map((cuisine) => <button key={cuisine} className={selectedCuisine === cuisine ? 'active' : ''} onClick={() => setSelectedCuisine(cuisine)}>{cuisine}</button>)}
      </div>
    </section>

    <section className="discovery-section">
      <div className="section-heading"><div><p className="eyebrow">NEAR YOU</p><h2>{location ? `Restaurants around ${location}` : 'Approved restaurants on Foody'}</h2></div>{landing && <Link to="/restaurants">View all</Link>}</div>
      {error && <div className="state-card error">{error}</div>}
      {loading ? <div className="state-card">Finding restaurants…</div> : restaurants.length ? <div className="restaurant-grid">{restaurants.map((restaurant) => <Link className="restaurant-card" to={`/restaurants/${restaurant.id}`} key={restaurant.id}>
        <div className="restaurant-image">{restaurant.logoUrl ? <img src={restaurant.logoUrl} alt="" /> : <span>{restaurant.name.charAt(0)}</span>}<b className={`status ${restaurant.operationalStatus === 'OPEN' ? 'open' : ''}`}>{restaurant.operationalStatus.replaceAll('_', ' ')}</b></div>
        <div className="restaurant-card-body"><h3>{restaurant.name}</h3><p>{restaurant.cuisines.join(' · ') || 'Multi-cuisine'}</p><p className="address">{restaurant.address}</p><div className="restaurant-meta"><span>{restaurant.rating ? `★ ${restaurant.rating} (${restaurant.reviewCount})` : 'New on Foody'}</span><span>View menu →</span></div></div>
      </Link>)}</div> : <div className="state-card">No approved restaurants match this search yet.</div>}
    </section>

    {landing && <section className="collections"><article><span>01</span><h3>Popular near you</h3><p>Browse restaurants customers are discovering in your area.</p></article><article><span>02</span><h3>Open right now</h3><p>See restaurants currently accepting orders.</p></article><article><span>03</span><h3>New on Foody</h3><p>Meet recently approved local kitchens.</p></article></section>}
  </main>;
}
