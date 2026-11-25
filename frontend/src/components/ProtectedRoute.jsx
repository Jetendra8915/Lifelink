import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from './LoadingSpinner';

/**
 * Wraps a route that requires authentication.
 * Optionally restricts to specific role(s).
 */
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isLoggedIn, role, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // User is logged in but wrong role – redirect to their own dashboard
    const paths = {
      patient: '/dashboard/patient',
      donor: '/dashboard/donor',
      facility: '/dashboard/facility',
      admin: '/dashboard/admin',
    };
    return <Navigate to={paths[role] ?? '/'} replace />;
  }

  return children;
}
