import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Heart, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { signIn } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuth();

  // Redirect destination after login
  const from = location.state?.from ?? null;

  const dashboardPaths = {
    patient: '/dashboard/patient',
    donor: '/dashboard/donor',
    facility: '/dashboard/facility',
    admin: '/dashboard/admin',
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.email || !form.password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const { user } = await signIn(form);
      toast.success('Welcome back to LifeLink!');
      // After sign-in the AuthContext will update profile/role.
      // We navigate to from location or default dashboard.
      navigate(from ?? dashboardPaths[user?.user_metadata?.role] ?? '/dashboard/patient', { replace: true });
    } catch (err) {
      setError(err.message ?? 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-grey-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-2xl text-blood-700">
            <div className="w-10 h-10 bg-blood-600 rounded-xl flex items-center justify-center shadow-md">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            LifeLink
          </Link>
          <h1 className="text-2xl font-bold text-grey-900 mt-5 mb-1">Welcome back</h1>
          <p className="text-grey-500 text-sm">Sign in to your LifeLink account</p>
        </div>

        <div className="card shadow-lg border-grey-200">
          {error && (
            <div className="alert-error flex items-center gap-2 mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form id="login-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="form-label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                <input
                  id="login-email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="form-input pl-9"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="form-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 8 characters"
                  className="form-input pl-9 pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-400 hover:text-grey-600"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <><LoadingSpinner size="sm" /> Signing in…</> : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-grey-100 text-center">
            <p className="text-sm text-grey-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-blood-600 font-semibold hover:underline">
                Register here
              </Link>
            </p>
          </div>
        </div>

        <p className="text-xs text-grey-400 text-center mt-6 max-w-xs mx-auto">
          LifeLink is an academic platform. Do not use real patient or donor data for testing.
        </p>
      </div>
    </div>
  );
}
