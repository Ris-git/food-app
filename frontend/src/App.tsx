import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import './App.css';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import VerifyEmail from './pages/Auth/VerifyEmail';
import PartnerApplication from './pages/Partner/Application';
import AdminApplications from './pages/Admin/Applications';
import RestaurantDashboard from './pages/Restaurant/Dashboard';
import Billing from './pages/Restaurant/Billing';
import { useAuth } from './features/auth/context/AuthContext';

const profileMenuItemStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '14px 22px',
  border: 0,
  backgroundColor: 'transparent',
  color: '#1E293B',
  textAlign: 'left',
  fontSize: '15px',
  fontWeight: 650,
  cursor: 'pointer',
};

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'login' | 'signup' | 'verify' | 'partner' | 'admin' | 'dashboard' | 'billing'>('home');
  const [location, setLocation] = useState('');
  const [showLocationToast, setShowLocationToast] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const { user, logout } = useAuth();

  // Auto-route restaurant partners to their dashboard on login
  useEffect(() => {
    if (user?.role === 'restaurant' && (currentView === 'home' || currentView === 'login' || currentView === 'partner')) {
      setCurrentView('dashboard');
    }
  }, [user]);

  useEffect(() => {
    if (!profileOpen) return;

    const handleOutsideClick = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [profileOpen]);

  const handlePartnerWithUs = () => {
    if (user) {
      if (user.role === 'restaurant') {
        setCurrentView('dashboard');
      } else {
        setCurrentView('partner');
      }
    } else {
      setCurrentView('signup');
    }
  };

  const handleSignIn = () => {
    setCurrentView('login');
  };


  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      setActiveModal(`Searching for "${searchQuery}"...`);
    } else {
      setActiveModal('Please enter a dish or restaurant name to search.');
    }
  };

  const locationsList = [
    'Connaught Place, New Delhi',
    'Bandra West, Mumbai',
    'Indiranagar, Bengaluru',
    'Jubilee Hills, Hyderabad',
    'Sector 18, Noida'
  ];

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    setCurrentView('home');
  };

  const navigateFromProfile = (view: 'dashboard' | 'billing' | 'admin' | 'partner') => {
    setProfileOpen(false);
    setCurrentView(view);
  };

  return (
    <div className="foody-landing">
      {/* Top Header Navigation */}
      <header className="header">
        <div className="logo-container" onClick={() => setCurrentView(user?.role === 'restaurant' ? 'dashboard' : 'home')}>
          <div className="logo-icon">F</div>
          <span className="logo-text">Foody</span>
        </div>

        <nav className="nav-actions">
          {user ? (
            <div ref={profileMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
                aria-label="Open account menu"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.9)',
                  backgroundColor: '#334155',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                MJ
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  style={{
                    position: 'absolute',
                    top: '62px',
                    right: 0,
                    width: '250px',
                    padding: '12px 0',
                    backgroundColor: '#FFFFFF',
                    borderTop: '4px solid #10B981',
                    boxShadow: '0 14px 36px rgba(15,23,42,0.24)',
                    zIndex: 200,
                  }}
                >
                  <div style={{ padding: '12px 22px 16px', borderBottom: '1px solid #E2E8F0' }}>
                    <div style={{ color: '#0F172A', fontSize: '16px', fontWeight: 750 }}>Modi Ji</div>
                    <div style={{ color: '#64748B', fontSize: '12px', marginTop: '3px' }}>{user.username}</div>
                  </div>

                  {user.role === 'restaurant' && (
                    <>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => navigateFromProfile('dashboard')}
                        style={profileMenuItemStyle}
                      >
                        Dashboard
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => navigateFromProfile('billing')}
                        style={profileMenuItemStyle}
                      >
                        Billing
                      </button>
                    </>
                  )}

                  {(user.role === 'admin' || user.role === 'superAdmin') && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => navigateFromProfile('admin')}
                      style={profileMenuItemStyle}
                    >
                      Admin Console
                    </button>
                  )}

                  {user.role !== 'restaurant' && user.role !== 'admin' && user.role !== 'superAdmin' && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => navigateFromProfile('partner')}
                      style={profileMenuItemStyle}
                    >
                      Partner Application
                    </button>
                  )}

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    style={{ ...profileMenuItemStyle, color: '#B91C1C' }}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (

            <>
              <button className="btn-ghost" onClick={handlePartnerWithUs}>
                Partner with us
              </button>
              <button className="btn-outline-pill" onClick={() => setCurrentView('signup')}>
                Sign up
              </button>
              <button className="btn-mint-pill" onClick={handleSignIn}>
                Sign in
              </button>
            </>
          )}
        </nav>
      </header>

      {currentView === 'login' && (
        <div>
          <Login />
          <p style={{ textAlign: 'center', marginTop: '12px' }}>
            <button className="btn-ghost" onClick={() => setCurrentView('home')}>Back to Home</button>
          </p>
        </div>
      )}

      {currentView === 'signup' && (
        <div>
          <Signup />
          <p style={{ textAlign: 'center', marginTop: '12px' }}>
            <button className="btn-ghost" onClick={() => setCurrentView('home')}>Back to Home</button>
          </p>
        </div>
      )}

      {currentView === 'verify' && (
        <div>
          <VerifyEmail />
          <p style={{ textAlign: 'center', marginTop: '12px' }}>
            <button className="btn-ghost" onClick={() => setCurrentView('home')}>Back to Home</button>
          </p>
        </div>
      )}

      {currentView === 'partner' && (
        <div>
          <PartnerApplication />
          <p style={{ textAlign: 'center', marginTop: '12px' }}>
            <button className="btn-ghost" onClick={() => setCurrentView('home')}>Back to Home</button>
          </p>
        </div>
      )}

      {currentView === 'admin' && (
        <div>
          <AdminApplications />
          <p style={{ textAlign: 'center', marginTop: '12px' }}>
            <button className="btn-ghost" onClick={() => setCurrentView('home')}>Back to Home</button>
          </p>
        </div>
      )}

      {currentView === 'dashboard' && (
        <div>
          <RestaurantDashboard onNavigateBilling={() => setCurrentView('billing')} />
        </div>
      )}

      {currentView === 'billing' && (
        <div>
          <Billing onBackToDashboard={() => setCurrentView('dashboard')} />
        </div>
      )}

      {currentView === 'home' && (


        <>

      {/* Decorative Flanking Food Artwork (SVG) */}
      <svg className="food-prop-left" viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M40 80 Q10 140 30 200 Q120 220 170 160 Q180 80 120 40 Z" fill="#FFFFFF" opacity="0.08"/>
        {/* Fresh Veggies Bag Illustration */}
        <rect x="50" y="100" width="100" height="110" rx="16" fill="#F8FAFC" />
        <path d="M50 100 L70 60 L130 60 L150 100 Z" fill="#E2E8F0" />
        <circle cx="80" cy="50" r="18" fill="#10B981" />
        <circle cx="120" cy="45" r="22" fill="#F59E0B" />
        <circle cx="100" cy="35" r="16" fill="#3B82F6" />
        <path d="M65 40 Q75 10 90 35" stroke="#047857" strokeWidth="4" strokeLinecap="round" />
      </svg>

      <svg className="food-prop-right" viewBox="0 0 220 240" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Gourmet Dish / Sushi Platter Graphic */}
        <ellipse cx="110" cy="150" rx="90" ry="50" fill="#FFFFFF" opacity="0.95" />
        <ellipse cx="110" cy="150" rx="75" ry="38" fill="#064E3B" />
        <circle cx="80" cy="145" r="16" fill="#10B981" />
        <circle cx="110" cy="148" r="16" fill="#34D399" />
        <circle cx="140" cy="145" r="16" fill="#F59E0B" />
        <circle cx="80" cy="145" r="8" fill="#FFFFFF" />
        <circle cx="110" cy="148" r="8" fill="#FFFFFF" />
        <circle cx="140" cy="145" r="8" fill="#FFFFFF" />
        {/* Chopsticks */}
        <line x1="30" y1="90" x2="160" y2="175" stroke="#F59E0B" strokeWidth="5" strokeLinecap="round" />
        <line x1="45" y1="80" x2="175" y2="165" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />
      </svg>

      {/* Main Hero Content */}
      <main className="hero-section">
        <h1 className="hero-title">
          Order food. Discover best restaurants. Foody it!
        </h1>

        {/* Dual Input Bar */}
        <div className="input-bar-container">
          {/* Location Picker */}
          <div className="location-input-wrapper">
            <div 
              className="input-pill"
              onClick={() => {
                const nextLoc = locationsList[Math.floor(Math.random() * locationsList.length)];
                setLocation(nextLoc);
              }}
            >
              <svg className="icon-location" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span className={`location-text ${location ? 'selected' : ''}`}>
                {location || 'Enter your delivery location'}
              </span>
              <svg className="icon-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>

            {/* Location Toast Alert */}
            {showLocationToast && (
              <div className="location-toast">
                <span>We are unable to fetch your location currently. Click to pick.</span>
                <button className="toast-close" onClick={() => setShowLocationToast(false)}>✕</button>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="search-input-wrapper">
            <form onSubmit={handleSearchSubmit} className="input-pill">
              <input
                type="text"
                className="search-field"
                placeholder="Search for restaurant, item or more"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg 
                className="icon-search" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5"
                onClick={() => handleSearchSubmit()}
              >
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
            </form>
          </div>
        </div>
      </main>

      {/* Interactive Modal Toast for Button Clicks */}
      {activeModal && (
        <div 
          style={{
            position: 'fixed',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0F172A',
            color: '#FFFFFF',
            padding: '16px 28px',
            borderRadius: '9999px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '15px',
            fontWeight: 600,
            animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <span>{activeModal}</span>
          <button 
            onClick={() => setActiveModal(null)}
            style={{
              background: '#10B981',
              border: 'none',
              color: '#022C22',
              borderRadius: '9999px',
              padding: '4px 14px',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '13px'
            }}
          >
            OK
          </button>
        </div>
      )}
      </>
      )}
    </div>
  );
}
