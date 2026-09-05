import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import VerifyEmail from './pages/Auth/VerifyEmail';
import PartnerApplication from './pages/Partner/Application';
import AdminApplications from './pages/Admin/Applications';
import RestaurantDashboard from './pages/Restaurant/Dashboard';
import Billing from './pages/Restaurant/Billing';
import OrganizationManagement from './pages/Restaurant/OrganizationManagement';
import Discovery from './pages/Customer/Discovery';
import RestaurantDetails from './pages/Customer/RestaurantDetails';
import OrganizationSwitcher from './features/organization/components/OrganizationSwitcher';
import { organizationService } from './features/organization/services/organizationService';
import { useAuth } from './features/auth/context/AuthContext';
import { useOrganization } from './features/organization/context/OrganizationContext';

const menuStyle: CSSProperties = { display: 'block', width: '100%', padding: '12px 20px', border: 0, background: 'transparent', color: '#1E293B', textAlign: 'left', fontWeight: 700, cursor: 'pointer' };

export default function App() {
  const { user, logout } = useAuth();
  const { reload } = useOrganization();
  const navigate = useNavigate();
  const route = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const profileRef = useRef<HTMLDivElement>(null);
  const handledInviteRef = useRef('');
  const profileName = user?.name || user?.username || 'Account';
  const initials = profileName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');

  useEffect(() => {
    if (!user || route.pathname !== '/login') return;
    const token = new URLSearchParams(route.search).get('staffInvite');
    if (!token) navigate(user.role === 'restaurant' ? '/dashboard' : '/', { replace: true });
    else navigate(`/invitations/accept?staffInvite=${encodeURIComponent(token)}`, { replace: true });
  }, [user, route.pathname, route.search, navigate]);

  useEffect(() => {
    const token = new URLSearchParams(route.search).get('staffInvite');
    if (!token || route.pathname !== '/invitations/accept') return;
    if (!user) { navigate(`/login?staffInvite=${encodeURIComponent(token)}`, { replace: true }); return; }
    if (handledInviteRef.current === token) return;
    handledInviteRef.current = token;
    organizationService.acceptInvitation(token).then(async () => {
      await reload();
      setNotice('Invitation accepted. You can now access the assigned restaurant.');
      navigate('/dashboard', { replace: true });
    }).catch(async (error: Error) => {
      setNotice(error.message);
      if (/sign in using the invited email/i.test(error.message)) { await logout(); navigate(`/login?staffInvite=${encodeURIComponent(token)}`, { replace: true }); }
    });
  }, [route.pathname, route.search, user, navigate, reload, logout]);

  useEffect(() => {
    const close = (event: PointerEvent) => { if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const go = (path: string) => { setProfileOpen(false); navigate(path); };
  return <div className="foody-app">
    <header className="header">
      <Link className="logo-container" to="/"><span className="logo-icon">F</span><span className="logo-text">Foody</span></Link>
      <nav className="nav-actions">
        <Link className="header-link" to="/restaurants">Restaurants</Link>
        {user?.role === 'restaurant' && <OrganizationSwitcher />}
        {user ? <div ref={profileRef} className="profile-wrap"><button className="profile-button" onClick={() => setProfileOpen((open) => !open)}>{initials}</button>{profileOpen && <div className="profile-menu"><div className="profile-name"><strong>{profileName}</strong><small>{user.username}</small></div>
          {user.role === 'restaurant' && <><button style={menuStyle} onClick={() => go('/dashboard')}>Dashboard</button><button style={menuStyle} onClick={() => go('/dashboard/billing')}>Billing</button><button style={menuStyle} onClick={() => go('/dashboard/organization')}>Restaurants & staff</button></>}
          {(user.role === 'admin' || user.role === 'superAdmin') && <button style={menuStyle} onClick={() => go('/admin')}>Admin Console</button>}
          {!['restaurant', 'admin', 'superAdmin'].includes(user.role) && <button style={menuStyle} onClick={() => go('/partner')}>Partner Application</button>}
          <button style={{ ...menuStyle, color: '#B91C1C' }} onClick={async () => { await logout(); go('/'); }}>Log out</button>
        </div>}</div> : <><Link className="btn-ghost" to="/partner">Partner with us</Link><Link className="btn-outline-pill" to="/signup">Sign up</Link><Link className="btn-mint-pill" to="/login">Sign in</Link></>}
      </nav>
    </header>

    {notice && <div className="global-notice">{notice}<button onClick={() => setNotice('')}>×</button></div>}
    <Routes>
      <Route path="/" element={<Discovery landing />} />
      <Route path="/restaurants" element={<Discovery />} />
      <Route path="/restaurants/:restaurantId" element={<RestaurantDetails />} />
      <Route path="/login" element={<AuthPage><Login /></AuthPage>} />
      <Route path="/signup" element={<AuthPage><Signup /></AuthPage>} />
      <Route path="/verify-email" element={<AuthPage><VerifyEmail /></AuthPage>} />
      <Route path="/partner" element={<AuthPage><PartnerApplication /></AuthPage>} />
      <Route path="/admin" element={<AdminApplications />} />
      <Route path="/dashboard" element={<RestaurantDashboard onNavigateBilling={() => navigate('/dashboard/billing')} />} />
      <Route path="/dashboard/billing" element={<Billing onBackToDashboard={() => navigate('/dashboard')} />} />
      <Route path="/dashboard/organization" element={<OrganizationManagement onBack={() => navigate('/dashboard')} />} />
      <Route path="/invitations/accept" element={<main className="customer-page"><div className="state-card">Checking your staff invitation…</div></main>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </div>;
}

function AuthPage({ children }: { children: React.ReactNode }) {
  return <div>{children}<p style={{ textAlign: 'center' }}><Link className="btn-ghost" to="/">Back to Home</Link></p></div>;
}
