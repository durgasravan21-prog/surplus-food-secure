import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { VERIFICATION_STATUS } from '../config/constants';

export default function ProtectedRoute({ children, allowedRoles, requireVerified = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user.role) {
    return <Navigate to="/select-role" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requireVerified && user.verification_status !== VERIFICATION_STATUS.APPROVED) {
    return <Navigate to="/verification-pending" replace />;
  }

  return children;
}
