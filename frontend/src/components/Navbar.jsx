import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Heart, Menu, X, ChevronDown, LogOut, LayoutDashboard, Map } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../services/authService';
import toast from 'react-hot-toast';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { isLoggedIn, profile, user, role } = useAuth();
  const navigate = useNavigate();

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/find-blood', label: 'Find Blood' },
    { to: '/become-donor', label: 'Become a Donor' },
    { to: '/blood-banks', label: 'Blood Banks' },
    { to: '/map', label: 'Map' },
    { to: '/about', label: 'About Us' },
  ];

  const dashboardPath = {
    patient: '/dashboard/patient',
    donor: '/dashboard/donor',
    facility: '/dashboard/facility',
    admin: '/dashboard/admin',
  }[role] ?? '/dashboard/patient';

  async function handleLogout() {
    try {
      await signOut();
      toast.success('Logged out successfully');
      navigate('/');
    } catch {
      toast.error('Logout failed');
    }
    setUserMenuOpen(false);
  }

  const displayName = profile?.full_name ?? user?.user_metadata?.full_name ?? 'User';

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-grey-200">
      <nav className="container-lg flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-blood-700 hover:text-blood-600 transition-colors">
          <div className="w-8 h-8 bg-blood-600 rounded-lg flex items-center justify-center shadow-sm">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <span>LifeLink</span>
        </Link>

        {/* Desktop Nav */}
        <ul className="hidden lg:flex items-center gap-1">
          {navLinks.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    isActive ? 'text-blood-600 bg-blood-50' : 'text-grey-600 hover:text-blood-600 hover:bg-blood-50'
                  }`
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Desktop Right Side */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            to="/emergency"
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blood-50 text-blood-700 text-sm font-semibold border border-blood-200 hover:bg-blood-100 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-blood-500 animate-ping absolute left-2 inline-flex" />
            <span className="relative ml-3 w-2 h-2 rounded-full bg-blood-500" />
            Emergency
          </Link>

          {isLoggedIn ? (
            <div className="relative">
              <button
                id="user-menu-btn"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-grey-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blood-600 flex items-center justify-center text-white text-sm font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-grey-700 max-w-24 truncate">{displayName}</span>
                <ChevronDown className="w-4 h-4 text-grey-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-grey-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-grey-100">
                    <p className="text-xs text-grey-500">Signed in as</p>
                    <p className="text-sm font-semibold text-grey-800 truncate">{displayName}</p>
                    <span className="badge-normal capitalize">{role}</span>
                  </div>
                  <Link
                    to={dashboardPath}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-grey-700 hover:bg-grey-50 transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blood-600 hover:bg-blood-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-outline btn-sm">Login</Link>
              <Link to="/register" className="btn-primary btn-sm">Register</Link>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          id="mobile-menu-btn"
          className="lg:hidden p-2 rounded-lg text-grey-600 hover:bg-grey-100 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-grey-200 bg-white px-4 py-4 space-y-1">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'text-blood-600 bg-blood-50' : 'text-grey-700 hover:bg-grey-50'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          <Link
            to="/emergency"
            onClick={() => setMenuOpen(false)}
            className="block px-4 py-2.5 rounded-xl text-sm font-semibold text-blood-700 bg-blood-50 hover:bg-blood-100"
          >
            🚨 Emergency Request
          </Link>
          <div className="pt-2 border-t border-grey-100 flex gap-2">
            {isLoggedIn ? (
              <>
                <Link to={dashboardPath} onClick={() => setMenuOpen(false)} className="btn-outline btn-sm flex-1 justify-center">
                  Dashboard
                </Link>
                <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="btn-danger btn-sm flex-1 justify-center">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-outline btn-sm flex-1 justify-center">Login</Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary btn-sm flex-1 justify-center">Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
